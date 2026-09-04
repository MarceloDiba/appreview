#!/usr/bin/env node
// O historico semanal sobrevive ao navegador que coletou.
//
// Marcelo, em 02/09/2026, ao abrir o painel a partir de outro endereco: "Esses
// campos estao vazios: Volume de avaliacoes, Cada nota separada."
//
// A causa: a tabela `google_business_reputation_snapshots` guardava o total, a
// nota media, a divisao por estrelas, os temas e o tempo de resposta, e NAO
// guardava o historico semanal. Ele era calculado durante a coleta, desenhado,
// e morria ali: vivia so no `localStorage` do navegador que coletou.
//
// Quem trocasse de computador, limpasse o navegador, abrisse no telemovel, ou
// recebesse uma coleta feita pelo SERVIDOR — que e o caminho da coleta diaria —
// via numeros e nenhum grafico.
//
// E a frase de vazio mentia: dizia "depois da segunda busca" quando a segunda
// busca ja tinha acontecido. O historico e calculado dentro de UMA coleta, das
// datas das avaliacoes da amostra, e nunca dependeu de haver duas.
//
// E o mesmo defeito, na mesma tabela, que a fila de respostas teve em
// 31/08/2026. Corrigimos a fila e nao olhamos para o historico ao lado dela.
//
// A CADEIA E EXIGIDA ELO A ELO. Qualquer elo partido devolve o defeito inteiro
// com os outros verdes: a coluna existir sem a coleta gravar, a coleta gravar
// sem o `select` pedir, o `select` pedir sem a leitura mapear. Foi assim que a
// persistencia dos agregados falhou em 30/08: o codigo existia e nada gravava.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const MIGRACAO = 'supabase/migrations/20260902220000_historico_semanal_no_banco.sql';
const COLETA = 'supabase/functions/_shared/experimentalApifyCollection.ts';
const LEITURA = 'src/lib/reputationSnapshotReading.ts';
const HOOK = 'src/hooks/useReputationSnapshot.ts';
const TIPOS = 'src/integrations/supabase/types.ts';
const PAINEL = 'src/components/dashboard/ApprovedCockpitDashboard.tsx';

const { readHistory } = await import(pathToFileURL(resolve(process.cwd(), LEITURA)).href);

const migracao = readFileSync(MIGRACAO, 'utf8');
const coleta = readFileSync(COLETA, 'utf8');
const leitura = readFileSync(LEITURA, 'utf8');
const hook = readFileSync(HOOK, 'utf8');
const tipos = readFileSync(TIPOS, 'utf8');
const painel = readFileSync(PAINEL, 'utf8');
// O CARTAO DO VOLUME saiu do painel em 04/09/2026 (tecto de 350 linhas). A
// unica assercao deste guarda que le o codigo do cartao passou a ler onde ele
// mora; o resto continua a olhar para o banco e para o hook.
const cartoesDeLeitura = readFileSync('src/components/dashboard/reputacao/CartoesDeLeitura.tsx', 'utf8');

const falhas = [];
let verificadas = 0;
const exigir = (rotulo, condicao) => { verificadas += 1; if (!condicao) falhas.push(rotulo); };

// ---------------------------------------------------------------------------
// 1. A CADEIA, elo a elo.
// ---------------------------------------------------------------------------
exigir(
  'a coluna existe e aceita nulo, porque as linhas antigas nao tem historico para inventar',
  /add column if not exists weekly_history jsonb;/.test(migracao) && !/weekly_history jsonb not null/.test(migracao),
);
exigir(
  'a coleta GRAVA o historico que ja calculou, e nao apenas o calcula',
  /weekly_history: \(insights\.history as unknown\) \?\? null,/.test(coleta),
);
exigir(
  'o painel PEDE a coluna ao banco, senao ela chega sempre indefinida',
  /\.select\('[^']*weekly_history[^']*'\)/.test(hook),
);
exigir(
  'a linha do banco declara a coluna, senao o compilador recusa a leitura',
  /weekly_history: unknown;/.test(leitura),
);
exigir(
  'os tipos gerados conhecem a coluna nas tres formas (linha, insercao, alteracao)',
  (tipos.match(/weekly_history/g) || []).length >= 3,
);
exigir(
  'a leitura MAPEIA a coluna para o historico do retrato',
  /history: readHistory\(row\.weekly_history\),/.test(leitura),
);

// ---------------------------------------------------------------------------
// 2. A CONFERENCIA, corrida de verdade.
// ---------------------------------------------------------------------------
//
// O que vem do banco e `jsonb`: pode ser nulo, pode ter outra forma, pode ter
// semanas incompletas. O grafico desenha o que receber.
exigir('nulo nao vira historico', readHistory(null) === undefined);
exigir('indefinido nao vira historico', readHistory(undefined) === undefined);
exigir('um objecto sem semanas nao vira historico', readHistory({}) === undefined);
exigir('uma lista vazia de semanas nao vira historico', readHistory({ weeks: [] }) === undefined);
exigir('lixo nao vira historico', readHistory({ weeks: 'nao sou lista' }) === undefined);

const boa = { start: '2026-08-24', reviewCount: 3, ratingBreakdown: { '1': 0, '2': 0, '3': 1, '4': 0, '5': 2 }, ownerReplies: 1 };
const lido = readHistory({ weeks: [boa] });
exigir('uma semana inteira atravessa', lido?.weeks.length === 1 && lido.weeks[0].start === '2026-08-24');
exigir('a contagem atravessa como numero', lido?.weeks[0].reviewCount === 3);
exigir('a divisao por nota atravessa com as cinco chaves', Object.keys(lido?.weeks[0].ratingBreakdown || {}).join(',') === '1,2,3,4,5');
exigir('as respostas do dono atravessam', lido?.weeks[0].ownerReplies === 1);

// A regra que custa dinheiro se for esquecida: uma semana incompleta e
// DESCARTADA e nao vira zero. Zero e uma afirmacao sobre o negocio, e desenhar
// uma queda que ninguem teve e pior do que nao desenhar nada.
exigir(
  'uma semana sem data e descartada, e nao vira zero',
  readHistory({ weeks: [{ reviewCount: 3 }] }) === undefined,
);
exigir(
  'uma semana sem contagem e descartada, e nao vira zero',
  readHistory({ weeks: [{ start: '2026-08-24' }] }) === undefined,
);
exigir(
  'a semana boa sobrevive ao lado de uma incompleta',
  readHistory({ weeks: [{ reviewCount: 9 }, boa] })?.weeks.length === 1,
);
// Numeros negativos ou partidos nao chegam ao grafico.
exigir(
  'uma contagem negativa e trazida para zero em vez de desenhar para baixo',
  readHistory({ weeks: [{ ...boa, reviewCount: -5 }] })?.weeks[0].reviewCount === 0,
);

// ---------------------------------------------------------------------------
// 3. A FRASE deixou de culpar o numero de buscas.
// ---------------------------------------------------------------------------
//
// Ela dizia "depois da segunda busca" e a segunda busca ja tinha acontecido: o
// dono leu isso com duas coletas feitas. A causa nunca foi o numero de buscas.
for (const idioma of ['pt-PT', 'pt-BR', 'en']) {
  const catalogo = JSON.parse(readFileSync(`src/i18n/owner/locales/${idioma}.json`, 'utf8'));
  const frase = catalogo?.dashboard?.cockpit?.approved?.volumeEmpty;
  exigir(`${idioma}: a frase do volume vazio existe`, typeof frase === 'string' && frase.length > 0);
  exigir(
    `${idioma}: a frase deixou de culpar o numero de buscas`,
    typeof frase === 'string' && !/segunda (busca|procura)|second fetch/i.test(frase),
  );
  exigir(`${idioma}: a frase nao usa travessao`, typeof frase === 'string' && !/[—–]/.test(frase));
}

// E o cartao continua a mostrar a frase so quando nao ha semanas nenhumas.
exigir(
  'o cartao do volume decide o vazio pela ausencia de semanas, e nao por outra coisa',
  /const semEvidencia = weeks\.length === 0;/.test(cartoesDeLeitura),
);

if (falhas.length) {
  console.error('Historico que sobrevive: %d protecao(oes) falharam.\n', falhas.length);
  for (const falha of falhas) console.error(' - %s', falha);
  process.exit(1);
}
console.log(`Historico que sobrevive: ${verificadas} protecoes verdes.`);
