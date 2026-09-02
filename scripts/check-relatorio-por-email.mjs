#!/usr/bin/env node
// O relatorio por e-mail: composto uma vez, entregue sem partir a fila que ja existe.
//
// POR QUE ESTE GUARDA EXISTE
//
// O e-mail entrou como canal em 02/09/2026 numa tabela VIVA. A
// `whatsapp_outbox` e por onde saem todos os avisos do produto, e uma restricao
// mal escrita nela nao da erro visivel: o gatilho tem `exception when others`, o
// aviso deixa de ser enfileirado e ninguem descobre ate um cliente perguntar
// porque e que nao foi avisado. Foi exactamente esse o defeito encontrado em
// 02/09 na ponte do Telegram, e custou dois dias de invisibilidade.
//
// Por isso este guarda nao le a migracao: APLICA-A num Postgres descartavel e
// tenta inserir as linhas que existem hoje em producao. Se alguma passar a ser
// recusada, ele fica vermelho antes de a migracao chegar ao servidor.
//
// E nao le o compositor: CORRE-O, com retratos reais, incluindo um retrato
// antigo sem historico e um nome de negocio hostil. Procurar `escaparHtml` no
// codigo-fonte prova que a funcao tem esse nome, e nada mais.
//
// O QUE ELE NAO APANHA, e vale a pena estar escrito:
//
//   - Se o e-mail CHEGA. O Resend aceita a mensagem e a entrega acontece
//     depois; sem webhook de entrega, o estado maximo honesto e `accepted`, e
//     este guarda so verifica que o codigo nao afirma mais do que isso.
//   - Como o HTML DESENHA em cada leitor de e-mail. Gmail, Outlook e Apple Mail
//     desenham diferente e nenhum deles corre aqui.
//   - Se o dominio esta verificado no Resend. Isso vive na conta, nao no
//     repositorio, e um remetente por verificar nao falha: e aceite e vai para
//     o spam.
// COMO ESTE GUARDA FOI PROVADO, em 02/09/2026
//
// Vinte e oito mutacoes, uma de cada vez, cada uma a quebrar uma regra
// diferente: tirar o escape do nome no HTML, comparar a semana em curso em vez
// da fechada, devolver zero em vez de nada numa semana sem avaliacoes, deixar o
// telefone obrigatorio, tirar o `provider` do materializador, reservar a fila
// toda em vez do canal, marcar `delivered`, mandar so HTML. Todas ficaram
// vermelhas.
//
// Uma delas ficou VERDE a primeira vez, e vale a pena estar escrita: tirar o
// filtro dos temas desconhecidos nao os faz sair CRUS, faz sair uma etiqueta
// VAZIA — que nao contem o identificador, e passava pela assercao que procurava
// o identificador. O que tem de ser medido e quantos temas atravessam a
// leitura. A assercao certa entrou por causa disso.
//
// Tres ficaram vermelhas por CRASH em vez de por assercao, e isso e aceite de
// propósito: um retrato antigo sem historico rebenta a leitura, um `import`
// impossivel de resolver rebenta o carregamento, e tirar `telegram` da lista de
// canais e recusado pelo proprio Postgres no `alter table`, porque ja existem
// linhas desse canal na tabela. Nos tres casos quem recusa e mais forte do que
// uma assercao escrita a mao.
import { execFileSync } from 'node:child_process';
import { existsSync, globSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import {
  assuntoDoRelatorio, escaparHtml, htmlDoRelatorio, lerRetrato, mediaDaSemana,
  passoDaSemana, relatorioSemanal, semAsterisco, semanasParaComparar, textoDoRelatorio,
} from '../supabase/functions/_shared/relatorioSemanal.ts';

const raiz = process.cwd();
const MIGRACOES = resolve(raiz, 'supabase/migrations');
const MIGRACAO = 'supabase/migrations/20260902230000_email_como_canal.sql';
const DESPACHO = 'supabase/functions/email-dispatch/index.ts';
const MATERIALIZADOR = 'supabase/functions/materialize-whatsapp-notifications/index.ts';
const COMPOSITOR = 'supabase/functions/_shared/relatorioSemanal.ts';
const PORTA = '54401';

const semComentariosSql = (fonte) => fonte.replace(/^\s*--[^\n]*$/gm, '');
const semComentariosTs = (fonte) => fonte
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');

const falhas = [];
let verificadas = 0;
const exigir = (rotulo, condicao) => { verificadas += 1; if (!condicao) falhas.push(rotulo); };

// ---------------------------------------------------------------------------
// PARTE 1: o compositor, CORRIDO.
// ---------------------------------------------------------------------------

const semanaVazia = (inicio) => ({
  start: inicio, reviewCount: 0, ownerReplies: 0,
  ratingBreakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
});
const dozeSemanas = () => Array.from({ length: 12 }, (_, i) => semanaVazia(`2026-06-${String(i + 1).padStart(2, '0')}`));

const retrato = ({ nome = 'Padaria do Bairro', semanas = dozeSemanas(), temas = [], lidas = 20, respondidas = 14, horas = 12 } = {}) => ({
  business: { name: nome, googleRating: 4.6, googleReviewCount: 87 },
  sample: {
    reviewCount: lidas,
    ratingBreakdown: { 1: 1, 2: 0, 3: 2, 4: 5, 5: 12 },
    ownerRepliesFound: respondidas,
    insights: { averageResponseHours: horas, history: { weeks: semanas }, topics: temas },
  },
});

// 1.1 O nome do negocio vem do Google, e o Binno nao o escreveu. No HTML ele nao
// pode abrir etiqueta nenhuma; no texto nao pode emparelhar com o nosso negrito.
const hostil = relatorioSemanal(retrato({ nome: 'Bar <b>Cinco</b> *Estrelas* & Cia' }));
exigir('ha relatorio para um nome hostil, em vez de rebentar', hostil !== null);
exigir('o nome do negocio nao consegue abrir uma etiqueta no e-mail',
  hostil !== null && !hostil.html.includes('<b>Cinco</b>') && hostil.html.includes('&lt;b&gt;Cinco&lt;/b&gt;'));
exigir('o E comercial do nome e escapado no e-mail',
  hostil !== null && hostil.html.includes('&amp; Cia'));
exigir('o asterisco do nome nao emparelha com o negrito do texto',
  hostil !== null && hostil.texto.split('\n')[0] === '🏪 *Bar <b>Cinco</b> Estrelas & Cia*');
exigir('o assunto tambem sai sem os asteriscos do nome',
  hostil !== null && !hostil.assunto.includes('*'));

// 1.2 As duas formas nascem da MESMA leitura. Uma nota no e-mail diferente da
// nota no WhatsApp e o defeito que ter dois compositores produziria.
exigir('a nota do texto e a mesma do e-mail',
  hostil !== null && hostil.texto.includes('4,6') && hostil.html.includes('4,6'));

// 1.3 A comparacao usa a ultima semana FECHADA, e nao a que esta a decorrer.
// Sem isto, o relatorio de segunda de manha diria sempre que o negocio piorou.
const comSemanas = dozeSemanas();
comSemanas[9].reviewCount = 1;
comSemanas[10].reviewCount = 4;
const fechadas = relatorioSemanal(retrato({ semanas: comSemanas }));
exigir('a comparacao le a semana fechada e a anterior a ela',
  fechadas !== null && fechadas.texto.includes('4 avaliações novas na semana passada, contra 1 na anterior'));
const comSemanaCorrente = comSemanas.map((semana, i) => (i === 11 ? { ...semana, reviewCount: 99 } : semana));
const ignoraCorrente = relatorioSemanal(retrato({ semanas: comSemanaCorrente }));
exigir('a semana em curso nao entra na comparacao',
  ignoraCorrente !== null && ignoraCorrente.texto.includes('contra 1 na anterior') && !ignoraCorrente.texto.includes('99'));

// 1.4 Uma semana sem avaliacao nenhuma nao tem media. Escrever "média 0,0" dizia
// ao dono que ele levou zeros numa semana em que ninguem o avaliou.
exigir('uma semana sem avaliacoes nao tem media', mediaDaSemana(semanaVazia('2026-06-01')) === null);
exigir('uma semana com avaliacoes tem a media delas',
  mediaDaSemana({ ...semanaVazia('2026-06-01'), reviewCount: 3, ratingBreakdown: { 1: 0, 2: 0, 3: 1, 4: 0, 5: 2 } }) === 4.3);

// 1.5 Um retrato antigo, gravado antes de o historico existir, continua a dar
// relatorio. Rebentar aqui deixaria o dono sem relatorio nenhum, em silencio.
const antigo = relatorioSemanal({ business: { name: 'Loja Antiga', googleRating: 4.1, googleReviewCount: 12 }, sample: { reviewCount: 5, ratingBreakdown: { 5: 5 } } });
exigir('um retrato sem historico ainda produz relatorio', antigo !== null);
exigir('sem historico, o relatorio nao inventa a frase da semana',
  antigo !== null && !antigo.texto.includes('na anterior') && !antigo.texto.includes('semana passada'));

// 1.6 Um retrato ilegivel devolve nada, e quem chama nao enfileira. Um corpo
// vazio na caixa de entrada e pior do que relatorio nenhum.
exigir('um retrato sem negocio nao produz relatorio', relatorioSemanal({ sample: {} }) === null);
exigir('um retrato nulo nao produz relatorio', relatorioSemanal(null) === null);
exigir('uma lista nao produz relatorio', relatorioSemanal([{ business: { name: 'x' } }]) === null);

// 1.7 Um tema que nao tem rotulo em portugues e descartado. O dono mostra este
// relatorio a um cliente, e `cleanliness` cru nao e uma palavra que ele conheca.
const comTemas = relatorioSemanal(retrato({ temas: [
  { id: 'service', count: 6, sentiment: 'positive' },
  { id: 'quantum_flux', count: 4, sentiment: 'negative' },
] }));
exigir('um tema conhecido sai em portugues', comTemas !== null && comTemas.html.includes('Atendimento'));
exigir('um tema desconhecido nao sai cru', comTemas !== null && !comTemas.html.includes('quantum_flux'));
// A assercao acima nao chega, e so uma mutacao o mostrou: sem o filtro, um tema
// desconhecido nao sai CRU — sai como uma etiqueta VAZIA, que nao contem o
// identificador e passava por aqui verde. O que tem de ser medido e quantos
// temas atravessam a leitura, e nao o que aparece escrito.
const lidosDosTemas = lerRetrato(retrato({ temas: [
  { id: 'service', count: 6, sentiment: 'positive' },
  { id: 'quantum_flux', count: 4, sentiment: 'negative' },
] }));
exigir('um tema desconhecido e descartado, e nao vira uma etiqueta vazia',
  lidosDosTemas !== null && lidosDosTemas.temas.length === 1 && lidosDosTemas.temas[0].rotulo === 'Atendimento');
// Um tema sem contagem nenhuma nao e um tema: seria uma etiqueta a dizer zero.
const temaZero = lerRetrato(retrato({ temas: [{ id: 'wait', count: 0, sentiment: 'mixed' }] }));
exigir('um tema com contagem zero nao entra', temaZero !== null && temaZero.temas.length === 0);

// 1.8 O relatorio acaba sempre num passo. Um relatorio sem passo e um extracto
// bancario, e a prioridade do cliente e vender e aumentar avaliacoes.
const comPendentes = lerRetrato(retrato({ lidas: 20, respondidas: 14 }));
exigir('com avaliacoes por responder, o passo e responder',
  passoDaSemana(comPendentes).titulo === 'Responder 6 avaliações');
const semPendentes = lerRetrato(retrato({ lidas: 20, respondidas: 20 }));
exigir('sem nada por responder, o passo e convidar',
  passoDaSemana(semPendentes).titulo === 'Convidar quem já foi atendido');
exigir('o passo aponta sempre para o painel',
  passoDaSemana(semPendentes).link === 'https://binno.pro/reviews' && passoDaSemana(comPendentes).link === 'https://binno.pro/reviews');
exigir('o e-mail traz o botao do painel',
  hostil !== null && hostil.html.includes('href="https://binno.pro/reviews"'));
exigir('o texto acaba no link do painel',
  hostil !== null && hostil.texto.trimEnd().endsWith('👉 https://binno.pro'));

// 1.9 O assunto tem de trazer um numero. "Relatório semanal" e o que faz o dono
// deixar de abrir a partir da terceira semana.
exigir('o assunto diz quantas avaliacoes chegaram, quando chegaram',
  fechadas !== null && fechadas.assunto.includes('4 avaliações novas'));
exigir('sem avaliacoes novas, o assunto aponta o que esta a espera',
  assuntoDoRelatorio(lerRetrato(retrato({ lidas: 20, respondidas: 14 }))).includes('6 avaliações à espera'));

// 1.10 O corpo em texto tem de caber no `check` de 4096 da fila, mesmo no pior
// caso: um nome longo e todos os temas.
const enorme = relatorioSemanal(retrato({
  nome: 'A'.repeat(300),
  temas: ['service', 'wait', 'food', 'cleanliness', 'price', 'atmosphere', 'delivery'].map((id) => ({ id, count: 9, sentiment: 'mixed' })),
}));
exigir('o corpo em texto cabe no limite da fila', enorme !== null && enorme.texto.length >= 1 && enorme.texto.length <= 4096);

// 1.11 As duas defesas, testadas sozinhas.
exigir('escaparHtml fecha as quatro entradas',
  escaparHtml('<a href="x">&</a>') === '&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;');
exigir('semAsterisco tira todos os asteriscos', semAsterisco('*a*b*') === 'ab');
exigir('sem tres semanas nao ha comparacao possivel', semanasParaComparar([semanaVazia('2026-06-01')]) === null);
exigir('uma lista que nao e lista nao rebenta a comparacao', semanasParaComparar(undefined) === null);

// 1.12 O e-mail diz de onde vem cada numero. As barras sao da AMOSTRA lida, e
// nao do historico todo do negocio; afirmar o contrario seria mentir ao dono na
// pagina que ele mostra a um cliente.
exigir('as barras dizem que sao das avaliacoes lidas',
  hostil !== null && /Nas 20 avaliações mais recentes que o Binno leu/.test(hostil.html));

// ---------------------------------------------------------------------------
// PARTE 2: a migracao, APLICADA num Postgres de verdade.
// ---------------------------------------------------------------------------

function acharBinario(nome) {
  const candidatos = [];
  try { candidatos.push(execFileSync('which', [nome], { encoding: 'utf8' }).trim()); } catch { /* segue */ }
  for (const padrao of ['/opt/homebrew/opt/postgresql@*/bin', '/usr/lib/postgresql/*/bin', '/usr/local/opt/postgresql@*/bin']) {
    for (const dir of globSync(padrao)) candidatos.push(join(dir, nome));
  }
  const achado = candidatos.find((c) => c && existsSync(c));
  if (!achado) {
    console.error(
      `Nao encontrei o binario '${nome}' do Postgres.\n`
      + 'Este guarda aplica a migracao de verdade numa tabela viva, entao precisa de um Postgres local.\n'
      + 'No Mac: brew install postgresql@17. No Ubuntu: apt-get install postgresql.',
    );
    process.exit(1);
  }
  return achado;
}

const INITDB = acharBinario('initdb');
const PG_CTL = acharBinario('pg_ctl');
const PSQL = acharBinario('psql');

function extrairCreateTable(sql, nomeTabela) {
  const marcador = `create table if not exists public.${nomeTabela} (`;
  const inicio = sql.indexOf(marcador);
  if (inicio === -1) throw new Error(`Nao achei a DDL de ${nomeTabela} na migracao de origem.`);
  let i = inicio + marcador.length - 1;
  let profundidade = 0;
  for (; i < sql.length; i++) {
    if (sql[i] === '(') profundidade++;
    else if (sql[i] === ')') { profundidade--; if (profundidade === 0) break; }
  }
  return `${sql.slice(inicio, i + 1)};`;
}

const sqlOutbox = readFileSync(join(MIGRACOES, '20260821193000_whatsapp_delivery_outbox.sql'), 'utf8');
// As migracoes do caminho do aviso reescrevem o gatilho de `internal_feedback`,
// logo a tabela tem de existir. Ela vem do ficheiro de origem, e nao copiada a
// mao, para o teste nao passar a testar uma copia que envelheceu sozinha.
const sqlEsquemaOriginal = readFileSync(join(MIGRACOES, '20260711_relink_appreview_schema.sql'), 'utf8');

// As migracoes que tocam nestas duas tabelas, na ordem em que existem no repo.
// Correr so a nova provaria que ela se aplica sobre a tabela de agosto, e nao
// sobre a que esta em producao hoje.
const ATE_HOJE = [
  '20260829124017_alerta_imediato_comentario_privado.sql',
  '20260829124156_corrigir_validacao_telefone_whatsapp.sql',
  '20260829124220_corrigir_validacao_telefone_outbox.sql',
  '20260829124330_tipo_feedback_na_fila_whatsapp.sql',
  '20260830220000_aviso_de_elogio_com_comentario.sql',
  '20260831030000_telegram_como_ponte.sql',
];

// O Postgres descartavel nao tem as extensoes do Supabase. Os talões abaixo
// existem para a migracao poder CORRER; o que eles substituem e verificado por
// leitura na parte 3, que e onde essas linhas ficam a descoberto.
const TALOES = `
create schema if not exists auth;
create table if not exists auth.users (id uuid primary key);
create schema if not exists cron;
create function cron.schedule(text, text, text) returns bigint language sql as $$ select 1::bigint $$;
create function cron.unschedule(text) returns boolean language sql as $$ select true $$;
create schema if not exists net;
create schema if not exists vault;
create view vault.decrypted_secrets as select ''::text as name, null::text as decrypted_secret where false;
create extension if not exists pgcrypto;
`;

/**
 * A UNICA coisa retirada das migracoes antes de as aplicar.
 *
 * `create extension` precisa dos ficheiros da extensao instalados na maquina, e
 * um Postgres de Homebrew nao tem `pg_cron` nem `pg_net`. Tudo o resto corre
 * verbatim, agendamento incluido, contra os taloes acima — que e mais do que o
 * guarda do gatilho consegue, e de proposito: o `cron.schedule` desta migracao
 * e uma linha que ninguem executa em lado nenhum antes de chegar ao servidor.
 *
 * As duas linhas retiradas ficam cobertas por leitura em
 * `check:telegram-na-receita`, que e onde elas nascem.
 */
const semExtensoes = (sql) => sql.replace(/^create extension if not exists [a-z_]+;\s*$/gim, '');

const dir = mkdtempSync(join(tmpdir(), 'binno-email-'));
const dados = join(dir, 'pg');
let ligado = false;
const psql = (sql, { tolerar = false } = {}) => {
  const ficheiro = join(dir, `q-${Math.random().toString(36).slice(2)}.sql`);
  writeFileSync(ficheiro, sql);
  try {
    // `stderr` capturado, e nao herdado: as recusas abaixo sao ESPERADAS, e
    // deixa-las escorrer para o terminal enche a saida do `npm run verify` de
    // erros que parecem defeitos e nao sao. O que falha de verdade e dito pelo
    // rotulo da assercao.
    return execFileSync(PSQL, ['-v', 'ON_ERROR_STOP=1', '-h', '127.0.0.1', '-p', PORTA, '-U', 'postgres', '-d', 'postgres', '-Atq', '-f', ficheiro], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (erro) {
    if (tolerar) return { erro: String(erro.stderr || erro.message) };
    throw new Error(`SQL falhou:\n${erro.stderr || erro.message}`);
  }
};
// Uma insercao que DEVIA passar e nao passa e um defeito; uma que devia ser
// recusada e passa tambem. As duas direccoes sao medidas.
const inserir = (colunas, valores) => psql(
  `insert into public.whatsapp_outbox (${colunas}) values (${valores});`,
  { tolerar: true },
);

try {
  execFileSync(INITDB, ['-D', dados, '-U', 'postgres', '--auth=trust', '-E', 'UTF8'], { stdio: 'ignore' });
  execFileSync(PG_CTL, ['-D', dados, '-o', `-p ${PORTA} -k ${dir} -h 127.0.0.1`, '-l', join(dir, 'pg.log'), 'start', '-w'], { stdio: 'ignore' });
  ligado = true;

  psql(TALOES);
  psql(extrairCreateTable(sqlEsquemaOriginal, 'internal_feedback'));
  psql(extrairCreateTable(sqlOutbox, 'whatsapp_notification_preferences'));
  psql(extrairCreateTable(sqlOutbox, 'whatsapp_outbox'));
  for (const nome of ATE_HOJE) psql(semExtensoes(readFileSync(join(MIGRACOES, nome), 'utf8')));
  psql("insert into auth.users (id) values ('11111111-1111-1111-1111-111111111111');");

  // 2.1 O ESTADO ANTES. Estas duas linhas sao o que a producao insere hoje.
  const antesOpenwa = inserir(
    'user_id, kind, provider, recipient_e164, body, idempotency_key',
    "'11111111-1111-1111-1111-111111111111', 'weekly', 'openwa', '+5511961234567', 'corpo', 'antes:openwa'",
  );
  const antesTelegram = inserir(
    'user_id, kind, provider, recipient_e164, body, idempotency_key',
    "'11111111-1111-1111-1111-111111111111', 'feedback', 'telegram', '+5511961234567', 'corpo', 'antes:telegram'",
  );
  exigir('antes da migracao, uma linha de OpenWA entra', antesOpenwa.erro === undefined);
  exigir('antes da migracao, uma linha de Telegram entra', antesTelegram.erro === undefined);

  // 2.2 A MIGRACAO NOVA, aplicada sobre a tabela ja com linhas dentro. Se ela
  // apertasse alguma coisa, o `alter table` falhava aqui, no `not valid` que
  // nao existe: e a prova de que nenhuma linha viva deixa de passar.
  psql(semExtensoes(readFileSync(join(MIGRACOES, '20260902230000_email_como_canal.sql'), 'utf8')));

  // 2.3 O QUE JA FUNCIONAVA CONTINUA A FUNCIONAR. Esta e a unica assercao que
  // interessa a Marcelo: nao regredir.
  const depoisOpenwa = inserir(
    'user_id, kind, provider, recipient_e164, body, idempotency_key',
    "'11111111-1111-1111-1111-111111111111', 'weekly', 'openwa', '+5511961234567', 'corpo', 'depois:openwa'",
  );
  const depoisTelegram = inserir(
    'user_id, kind, provider, recipient_e164, body, idempotency_key',
    "'11111111-1111-1111-1111-111111111111', 'feedback', 'telegram', '+5511961234567', 'corpo', 'depois:telegram'",
  );
  exigir('depois da migracao, a linha de OpenWA continua a entrar', depoisOpenwa.erro === undefined);
  exigir('depois da migracao, a linha de Telegram continua a entrar', depoisTelegram.erro === undefined);
  exigir('as linhas que ja estavam na tabela sobreviveram',
    psql("select count(*) from public.whatsapp_outbox where idempotency_key like 'antes:%';").trim() === '2');

  // 2.4 O canal novo entra, sem telefone nenhum.
  const email = inserir(
    'user_id, kind, provider, recipient_email, subject, body, body_html, idempotency_key',
    "'11111111-1111-1111-1111-111111111111', 'weekly', 'email', 'dono@exemplo.com', 'assunto', 'corpo', '<p>corpo</p>', 'novo:email'",
  );
  exigir('uma linha de e-mail entra sem telefone', email.erro === undefined);

  // 2.5 E cada canal EXIGE o seu destino. Sem estas duas, uma linha sem destino
  // ficava na fila para sempre, e ninguem a via.
  const emailSemDestino = inserir(
    'user_id, kind, provider, body, idempotency_key',
    "'11111111-1111-1111-1111-111111111111', 'weekly', 'email', 'corpo', 'mau:email-sem-destino'",
  );
  const emailComDestinoVazio = inserir(
    'user_id, kind, provider, recipient_email, body, idempotency_key',
    "'11111111-1111-1111-1111-111111111111', 'weekly', 'email', '', 'corpo', 'mau:email-vazio'",
  );
  const telegramSemTelefone = inserir(
    'user_id, kind, provider, body, idempotency_key',
    "'11111111-1111-1111-1111-111111111111', 'feedback', 'telegram', 'corpo', 'mau:telegram-sem-telefone'",
  );
  exigir('uma linha de e-mail sem endereco e recusada', emailSemDestino.erro !== undefined);
  exigir('um endereco vazio nao conta como endereco', emailComDestinoVazio.erro !== undefined);
  exigir('tirar o `not null` do telefone nao abriu a porta aos outros canais', telegramSemTelefone.erro !== undefined);

  // 2.6 Um canal inventado continua a ser recusado.
  const inventado = inserir(
    'user_id, kind, provider, recipient_e164, body, idempotency_key',
    "'11111111-1111-1111-1111-111111111111', 'weekly', 'sms', '+5511961234567', 'corpo', 'mau:sms'",
  );
  exigir('um canal que nao existe e recusado', inventado.erro !== undefined);

  // 2.7 A preferencia do resumo: o padrao e o e-mail, e um valor inventado nao entra.
  psql(`insert into public.whatsapp_notification_preferences (user_id, recipient_e164, consented_at)
        values ('11111111-1111-1111-1111-111111111111', '+5511961234567', now());`);
  exigir('o padrao do canal do resumo e o e-mail',
    psql("select weekly_channel from public.whatsapp_notification_preferences limit 1;").trim() === 'email');
  const canalInventado = psql(
    "update public.whatsapp_notification_preferences set weekly_channel = 'pombo-correio';",
    { tolerar: true },
  );
  exigir('um canal de resumo inventado e recusado', canalInventado.erro !== undefined);
  const canalMensagem = psql(
    "update public.whatsapp_notification_preferences set weekly_channel = 'mensagem';",
    { tolerar: true },
  );
  exigir('voltar o resumo para mensagem continua a ser possivel', canalMensagem.erro === undefined);

  // 2.8 O corpo em texto continua com tecto, e o HTML nao precisa dele.
  const corpoEnorme = inserir(
    'user_id, kind, provider, recipient_email, body, idempotency_key',
    `'11111111-1111-1111-1111-111111111111', 'weekly', 'email', 'dono@exemplo.com', '${'x'.repeat(4097)}', 'mau:corpo-enorme'`,
  );
  const htmlEnorme = inserir(
    'user_id, kind, provider, recipient_email, body, body_html, idempotency_key',
    `'11111111-1111-1111-1111-111111111111', 'weekly', 'email', 'dono@exemplo.com', 'corpo', '${'x'.repeat(20000)}', 'novo:html-enorme'`,
  );
  exigir('o corpo em texto continua limitado a 4096', corpoEnorme.erro !== undefined);
  exigir('o HTML nao esta preso ao limite do corpo em texto', htmlEnorme.erro === undefined);

  // 2.9 E o drenador do e-mail so reserva o que e dele. Sem isto, o
  // retransmissor do OpenWA rouba um relatorio, como aconteceu em 31/08 entre o
  // OpenWA e o Telegram.
  psql("update public.whatsapp_outbox set status = 'queued', scheduled_at = now() - interval '1 minute';");
  const reservadas = psql("select provider from public.claim_whatsapp_outbox_por_canal('email', 10) order by provider;")
    .trim().split('\n').filter(Boolean);
  exigir('a reserva do e-mail so traz linhas de e-mail',
    reservadas.length > 0 && reservadas.every((linha) => linha === 'email'));
  exigir('as linhas dos outros canais ficaram por reservar',
    psql("select count(*) from public.whatsapp_outbox where provider <> 'email' and status = 'queued';").trim() !== '0');
} finally {
  if (ligado) { try { execFileSync(PG_CTL, ['-D', dados, '-m', 'immediate', 'stop'], { stdio: 'ignore' }); } catch { /* ja parou */ } }
  rmSync(dir, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------
// PARTE 3: o que o Postgres descartavel nao corre, e o codigo que envia.
// ---------------------------------------------------------------------------

const migracao = readFileSync(MIGRACAO, 'utf8');
const migracaoExecutavel = semComentariosSql(migracao);
const despacho = readFileSync(DESPACHO, 'utf8');
const despachoExecutavel = semComentariosTs(despacho);
const materializador = readFileSync(MATERIALIZADOR, 'utf8');
const materializadorExecutavel = semComentariosTs(materializador);
const compositor = readFileSync(COMPOSITOR, 'utf8');

// 3.1 O agendamento. Sem ele a fila enche e ninguem envia, com todos os outros
// guardas verdes.
exigir('a fila do e-mail e drenada pelo agendador',
  /select cron\.schedule\('binno-email', '\*\/5 \* \* \* \*', 'select public\.drenar_relatorios_por_email\(\);'\);/.test(migracaoExecutavel));
exigir('agendar duas vezes nao cria dois trabalhos',
  /perform cron\.unschedule\('binno-email'\);/.test(migracaoExecutavel));
// `net` e nao `extensions.net`: o esquema errado faz o `exception when others`
// do proprio dreno engolir o erro, com o cron a reportar sucesso e a fila
// congelada. Aconteceu em 31/08 e custou uma tarde.
exigir('o dreno chama net.http_post, e nao extensions.net.http_post',
  /perform net\.http_post\(/.test(migracaoExecutavel) && !/extensions\.net\.http_post/.test(migracaoExecutavel));
exigir('o dreno aponta para a funcao do e-mail',
  /functions\/v1\/email-dispatch/.test(migracaoExecutavel));
exigir('o segredo do dreno vem do Vault, e nao escrito no ficheiro',
  /from vault\.decrypted_secrets where name = 'binno_worker_secret'/.test(migracaoExecutavel));
exigir('o dreno so chama quando ha alguma coisa na fila',
  /if v_pendentes = 0 then\s+return;\s+end if;/.test(migracaoExecutavel));

// 3.1b O RESUMO TEM QUEM O CHAME. Descoberto ao conferir a producao em
// 02/09/2026: `cron.job` tinha um unico trabalho, o do Telegram, e existia uma
// so linha `weekly` enfileirada pelo materializador, de 31/08. O resumo semanal
// nao estava a falhar — nao estava a acontecer. Sem estas duas linhas, todo o
// resto deste ramo fica a espera de um chamador que nao existe.
exigir('o resumo semanal e chamado pelo agendador',
  /select cron\.schedule\('binno-resumo-semanal', '\*\/15 \* \* \* \*', 'select public\.chamar_resumo_semanal\(\);'\);/.test(migracaoExecutavel));
exigir('agendar o resumo duas vezes nao cria dois trabalhos',
  /perform cron\.unschedule\('binno-resumo-semanal'\);/.test(migracaoExecutavel));
exigir('quem chama o resumo aponta para o materializador',
  /functions\/v1\/materialize-whatsapp-notifications/.test(migracaoExecutavel));
// A chave `weekly:<data local>` e o que torna 96 chamadas por dia inofensivas:
// sem ela, o dono recebia o resumo de quinze em quinze minutos.
exigir('a chave por dia local e o que impede o resumo de sair 96 vezes',
  /idempotency_key: `weekly:\$\{local\.date\}`,/.test(materializadorExecutavel)
  && /ignoreDuplicates: true/.test(materializadorExecutavel));

// 3.2 A ORDEM no despachante. Reservar antes de saber que ha chave poria as
// linhas em `sending` sem ninguem para as enviar, e elas ficavam presas nesse
// estado para sempre. A ordem e o comportamento, e nao uma questao de estilo.
const posicaoDaChave = despachoExecutavel.indexOf('RESEND_SEM_CHAVE');
const posicaoDaReserva = despachoExecutavel.indexOf('claim_whatsapp_outbox_por_canal');
exigir('o despachante confere a chave ANTES de reservar linhas',
  posicaoDaChave > 0 && posicaoDaReserva > 0 && posicaoDaChave < posicaoDaReserva);
// Sem chave a fila ESPERA. Marcar `failed` apagaria relatorios por causa de uma
// configuracao que falta, e o dono nunca saberia que existiram.
const antesDaReserva = despachoExecutavel.slice(0, posicaoDaReserva);
exigir('sem chave, nenhuma linha e marcada como falhada', !/status: 'failed'/.test(antesDaReserva));
exigir('o despachante so reserva o canal do e-mail',
  /claim_whatsapp_outbox_por_canal', \{ p_provider: 'email'/.test(despachoExecutavel));
// O Resend aceita; a entrega acontece depois e chega por webhook, que nao
// existe. Afirmar `delivered` seria o produto a dizer o que nao sabe.
exigir('o estado maximo do e-mail e `accepted`, e nao `delivered`',
  /const ESTADO_MAXIMO = 'accepted';/.test(despachoExecutavel) && !/'delivered'/.test(despachoExecutavel));
// As duas versoes viajam juntas: quem bloqueia HTML ve o texto, e nao um
// e-mail vazio.
exigir('o e-mail leva as duas versoes, HTML e texto',
  /html: html \?\? undefined,/.test(despachoExecutavel) && /text: corpo,/.test(despachoExecutavel));
exigir('uma linha de e-mail sem destino falha com nome, em vez de ficar presa',
  /EMAIL_SEM_DESTINO/.test(despachoExecutavel));
exigir('o remetente pode mudar sem mexer no codigo',
  /Deno\.env\.get\('RESEND_FROM'\)/.test(despachoExecutavel));

// 3.3 O MATERIALIZADOR. Este e o defeito que o ramo corrige: ate 02/09/2026 o
// resumo semanal era enfileirado sem `provider`, caia no padrao `openwa`, e ia
// pelo WhatsApp mesmo para quem tinha ligado o Telegram — e mesmo depois de o
// numero do piloto estar bloqueado.
exigir('o resumo diz por que canal sai, em vez de cair no padrao',
  /provider: canal,/.test(materializadorExecutavel));
exigir('o resumo por mensagem segue o canal do dono, e nao assume o OpenWA',
  /rpc\('canal_do_aviso', \{ p_user_id: preference\.user_id \}\)/.test(materializadorExecutavel));
exigir('o materializador deixou de escrever a sua propria mensagem',
  !/const messageFromSummary/.test(materializador)
  && /import \{ relatorioSemanal \} from '\.\.\/_shared\/relatorioSemanal\.ts';/.test(materializador));
exigir('sem retrato legivel, nada e enfileirado',
  /if \(!relatorio\) continue;/.test(materializadorExecutavel));
// O endereco fica escrito na linha da fila. Quem for ver porque e que um
// relatorio nao chegou ve para onde ele foi, sem reconstruir a decisao.
exigir('o endereco do dono e resolvido ao enfileirar, e nao ao enviar',
  /recipient_email: destinoDoEmail,/.test(materializadorExecutavel)
  && /getUserById\(preference\.user_id\)/.test(materializadorExecutavel));
exigir('sem endereco nenhum, o relatorio nao e enfileirado',
  /semDestino\.push\(preference\.user_id\);\s+continue;/.test(materializadorExecutavel));
exigir('uma linha de e-mail nao leva telefone, e uma de mensagem nao leva HTML',
  /recipient_e164: porEmail \? null : preference\.recipient_e164,/.test(materializadorExecutavel)
  && /body_html: porEmail \? relatorio\.html : null,/.test(materializadorExecutavel));

// 3.4 O compositor nao pode importar nada. Sem `import`, o mesmo ficheiro corre
// dentro do Deno e dentro deste guarda — e e isso que deixa a parte 1 executar
// o codigo de verdade em vez de o ler.
exigir('o compositor nao importa nada, e por isso pode ser corrido aqui',
  !/^\s*import\s/m.test(semComentariosTs(compositor)));

if (falhas.length) {
  console.error('Relatorio por e-mail: %d protecao(oes) falharam.\n', falhas.length);
  for (const falha of falhas) console.error(' - %s', falha);
  process.exit(1);
}
console.log(`Relatorio por e-mail: ${verificadas} protecoes verdes.`);
