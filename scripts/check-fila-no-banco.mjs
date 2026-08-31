#!/usr/bin/env node
// A fila de respostas tem de sobreviver a uma coleta sem navegador.
//
// Ate 31/08/2026 ela vivia so no `localStorage`, e a montagem dela vivia no
// chamador manual. O drenador automatico chama o nucleo partilhado e nunca
// passava por la, entao uma coleta feita pelo servidor entregava numeros e
// nenhuma fila. Um cliente pagando pela coleta diaria acordaria com os
// graficos atualizados e a lista de avaliacoes a responder vazia.
//
// Cada assercao aqui le a construcao que ela nomeia. Quinze levas de assercoes
// que nao podiam falhar sairam deste repositorio nesta semana, duas delas
// escritas pelo proprio controlador.
import { readFileSync } from 'node:fs';

const NUCLEO = 'supabase/functions/_shared/experimentalApifyCollection.ts';
const CHAMADOR = 'supabase/functions/sync-experimental-apify/index.ts';
const LEITOR = 'src/hooks/useFilaDeRespostas.ts';
const COMPOSICAO = 'src/lib/reputationSnapshotReading.ts';
const PAINEL = 'src/pages/Dashboard.tsx';
const MIGRACAO = 'supabase/migrations/20260831010000_fila_de_respostas_no_banco.sql';
const CONTRATO = 'docs/contrato-produto-binno.md';

const semComentarios = (fonte) => fonte
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ')
  .replace(/^\s*--[^\n]*/gm, ' ');

const ler = (caminho) => semComentarios(readFileSync(caminho, 'utf8'));

const falhas = [];
const exigir = (rotulo, condicao) => { if (!condicao) falhas.push(rotulo); };

const nucleo = ler(NUCLEO);
const chamador = ler(CHAMADOR);
const leitor = ler(LEITOR);
const composicao = ler(COMPOSICAO);
const painel = ler(PAINEL);
const migracao = ler(MIGRACAO);
const contrato = readFileSync(CONTRATO, 'utf8');

// 1. A montagem da fila vive no nucleo, que e por onde os dois caminhos passam.
// Se voltar para o chamador manual, a coleta do servidor volta a nao ter fila.
exigir(
  'a fila e montada no nucleo partilhado, por onde a coleta do servidor tambem passa',
  /export const montarFilaDeRespostas/.test(nucleo),
);
exigir(
  'o chamador manual consome a fila do nucleo em vez de montar a sua propria',
  /montarFilaDeRespostas/.test(chamador) && !/const montarFilaDeRespostas|observedReviewsForBrowser/.test(chamador),
);

// 2. A gravacao acontece no caminho de sucesso do nucleo, depois do gasto ja
// registado. Sem a chamada, o codigo existe e nada e gravado, que foi o defeito
// exato encontrado na persistencia dos agregados em 30/08.
const caminhoDeSucesso = nucleo.slice(
  nucleo.indexOf("status: 'succeeded'"),
  nucleo.indexOf('return { ok: true'),
);
exigir(
  'a coleta grava a fila no caminho de sucesso, e nao apenas define a funcao',
  /await persistirFilaDeRespostas\(/.test(caminhoDeSucesso),
);

// 3. Uma falha ao gravar nao pode derrubar uma coleta que ja custou dinheiro.
const corpoDaGravacao = nucleo.slice(
  nucleo.indexOf('const persistirFilaDeRespostas'),
  nucleo.indexOf('const persistAggregateSnapshot'),
);
exigir(
  'a gravacao da fila engole a propria falha, porque a coleta ja foi cobrada',
  /try \{/.test(corpoDaGravacao) && /catch/.test(corpoDaGravacao) && !/throw/.test(corpoDaGravacao),
);
exigir(
  'a falha de gravacao da fila fica visivel no log',
  /console\.error/.test(corpoDaGravacao),
);

// 4. A retencao de 14 dias e aplicada nas duas pontas. So o filtro deixaria a
// linha morta no banco; so a limpeza deixaria uma janela entre o vencimento e a
// proxima coleta.
// A comparacao tem de ser contra o instante da coleta. Trocar `now` por uma
// data fixa deixa a chamada no lugar e a limpeza deixa de apagar seja o que
// for, com a assercao verde: foi assim que a primeira versao desta linha
// passou por uma mutacao em 31/08.
exigir(
  'a coleta apaga a fila vencida daquele dono antes de gravar',
  /\.from\('google_reviews_awaiting_reply'\)[\s\S]{0,200}\.delete\(\)[\s\S]{0,200}\.lt\('expires_at', now\.toISOString\(\)\)/.test(corpoDaGravacao),
);
exigir(
  'a limpeza compara contra o instante da coleta, e nao contra uma data fixa',
  !/\.lt\('expires_at',\s*'/.test(corpoDaGravacao),
);
exigir(
  'a leitura do painel ignora o que ja venceu',
  /\.gt\('expires_at'/.test(leitor),
);
exigir(
  'o prazo e obrigatorio na tabela, senao a retencao vira promessa verbal',
  /expires_at timestamptz not null/.test(migracao),
);

// 5. Quem le, le so o proprio. A tabela guarda nome e texto de pessoas reais.
exigir(
  'a tabela liga o controlo de acesso por linha',
  /alter table public\.google_reviews_awaiting_reply enable row level security/.test(migracao),
);
exigir(
  'anonimo nao tem permissao nenhuma sobre a fila',
  /revoke all on table public\.google_reviews_awaiting_reply from anon, authenticated/.test(migracao),
);
exigir(
  'a politica de leitura prende cada linha ao seu dono',
  /for select[\s\S]{0,120}using \(auth\.uid\(\) = user_id\)/.test(migracao),
);
exigir(
  'nao existe politica que deixe o navegador escrever na fila: quem grava e a coleta',
  !/for (insert|update|delete)/.test(migracao),
);

// 6. O banco tem precedencia. Se o navegador voltar a ganhar, uma coleta do
// servidor volta a ser invisivel para quem coletou noutro aparelho.
const escolhaDaFila = composicao.match(/const observedReviews = ([^;]+);/);
exigir('a composicao ainda escolhe a fila', escolhaDaFila !== null);
if (escolhaDaFila) {
  const expressao = escolhaDaFila[1];
  exigir(
    'a fila do banco vem antes da do navegador na escolha',
    expressao.indexOf('filaPersistida') !== -1
      && expressao.indexOf('filaPersistida') < expressao.indexOf('browserSnapshot'),
  );
}
exigir(
  'o painel passa a fila do banco para a composicao',
  /filaPersistida: filaDoBanco\.fila/.test(painel),
);

// 7. O contrato precisa registar a mudanca. Sem isso, quem ler as linhas
// antigas desfaz tudo isto achando que esta a corrigir uma violacao.
exigir(
  'o contrato registou que a fila passou a viver no banco, com a data e a razao',
  /31\/08\/2026/.test(contrato) && /google_reviews_awaiting_reply/.test(contrato),
);
exigir(
  'o contrato mantem os 14 dias e diz que Portugal exige rever a decisao',
  /14 dias/.test(contrato) && /Portugal/.test(contrato),
);

if (falhas.length) {
  console.error('Fila no banco: %d protecao(oes) falharam.\n', falhas.length);
  for (const falha of falhas) console.error(' - %s', falha);
  process.exit(1);
}
console.log('Fila no banco: 16 protecoes verdes.');
