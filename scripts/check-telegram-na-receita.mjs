#!/usr/bin/env node
// O repositorio descreve a ponte do Telegram que esta em producao.
//
// Em 31/08/2026 o WhatsApp bloqueou o numero do piloto e a ponte do Telegram
// foi montada nessa tarde, DIRETO NO SERVIDOR. Nada disso foi escrito no
// repositorio, e o preco ficou invisivel por dois dias porque em producao
// estava tudo a funcionar.
//
// O que se perdeu, peca a peca: a coluna `telegram_chat_id`, o valor
// `telegram` no `check` do canal, e as funcoes `canal_do_aviso`,
// `claim_whatsapp_outbox_por_canal` e `drenar_avisos_do_telegram`. Quem
// montasse o Binno do zero a partir das migracoes ficava com um gatilho a
// chamar uma funcao inexistente; o proprio `exception when others` do gatilho
// engolia o erro, e NENHUM aviso era enfileirado, em silencio.
//
// POR QUE ESTE GUARDA EXISTE ALEM DO `check:gatilho-feedback-sql`
//
// Aquele carrega esta migracao num Postgres de verdade e CORRE o gatilho, o
// que e prova melhor do que qualquer texto. Mas ele nao consegue correr duas
// coisas, porque o Postgres descartavel nao tem as extensoes do Supabase: o
// agendamento e a chamada HTTP. Essas duas ficam aqui, lidas do ficheiro.
//
// Sem isto, alguem apagaria o `cron.schedule` e a fila do Telegram pararia de
// ser drenada, com todos os outros guardas verdes.
import { readFileSync } from 'node:fs';

const MIGRACAO = 'supabase/migrations/20260831030000_telegram_como_ponte.sql';
const GUARDA_DO_GATILHO = 'scripts/check-gatilho-feedback-sql.mjs';

// O cabecalho da migracao CITA o esquema errado para explicar o defeito de
// 31/08. As assercoes sobre o que o codigo faz tem de ler so a parte
// executavel, senao apanham a propria explicacao e ficam vermelhas por dizer a
// verdade. Aconteceu duas vezes em 02/09/2026, neste mesmo padrao.
const semComentariosSql = (fonte) => fonte.replace(/^\s*--[^\n]*$/gm, '');

const migracao = readFileSync(MIGRACAO, 'utf8');
const migracaoExecutavel = semComentariosSql(migracao);
const guardaDoGatilho = readFileSync(GUARDA_DO_GATILHO, 'utf8');

const falhas = [];
let verificadas = 0;
const exigir = (rotulo, condicao) => { verificadas += 1; if (!condicao) falhas.push(rotulo); };

// 1. As pecas que o Postgres descartavel NAO consegue correr.
exigir(
  'a migracao liga o agendamento, que nao vem de origem',
  /create extension if not exists pg_cron;/.test(migracao),
);
exigir(
  'a migracao liga a chamada HTTP, que nao vem de origem',
  /create extension if not exists pg_net;/.test(migracao),
);
exigir(
  'a fila e drenada a cada minuto, senao ela enche e ninguem envia',
  /select cron\.schedule\('binno-telegram', '\* \* \* \* \*', 'select public\.drenar_avisos_do_telegram\(\);'\);/.test(migracao),
);
// Sem o desagendamento antes, correr a migracao duas vezes cria dois trabalhos
// iguais e cada aviso sai a dobrar.
exigir(
  'agendar duas vezes nao cria dois trabalhos',
  /perform cron\.unschedule\('binno-telegram'\);/.test(migracao),
);

// 2. A chamada HTTP usa o esquema certo. `net` e nao `extensions.net`: o pg_net
// instala-se em `net`, e escrever o esquema errado fazia o `exception when
// others` do proprio dreno engolir o erro, com o cron a reportar sucesso a
// cada minuto e a fila congelada. Aconteceu em 31/08 e custou uma tarde.
exigir(
  'o dreno chama net.http_post, e nao extensions.net.http_post',
  /perform net\.http_post\(/.test(migracaoExecutavel) && !/extensions\.net\.http_post/.test(migracaoExecutavel),
);
// O segredo vem do Vault e nao de uma constante, porque o ficheiro e publico.
exigir(
  'o segredo do dreno vem do Vault, e nao escrito no ficheiro',
  /from vault\.decrypted_secrets where name = 'binno_worker_secret'/.test(migracao),
);
// Sem isto seriam 1440 chamadas HTTP por dia para nao fazer nada.
exigir(
  'o dreno so chama quando ha alguma coisa na fila',
  /if v_pendentes = 0 then\s+return;\s+end if;/.test(migracao),
);

// 3. As pecas de esquema, descobertas ao correr contra um banco limpo.
exigir(
  'a coluna do Telegram esta na receita, e aceita nulo porque ter Telegram e opcional',
  /add column if not exists telegram_chat_id text;/.test(migracao)
  && !/telegram_chat_id text not null/.test(migracao),
);
exigir(
  'o canal `telegram` e aceite pela fila, senao o insert do gatilho falha',
  /check \(provider = any \(array\['openwa'::text, 'telegram'::text\]\)\)/.test(migracao),
);

// 4. Cada drenador reserva SO o proprio canal. Sem isto, o retransmissor do
// OpenWA rouba uma mensagem destinada ao Telegram: os dois leem a mesma fila.
// Aconteceu em 31/08.
exigir(
  'a reserva da fila e por canal, e nao a fila toda',
  /where status = 'queued'\s+and provider = p_provider/.test(migracao),
);
exigir(
  'dois drenadores podem correr ao mesmo tempo sem se pisarem',
  /for update skip locked/.test(migracao),
);

// 5. E o guarda que corre o gatilho carrega isto de verdade, sem talao.
exigir(
  'o guarda do gatilho carrega esta migracao',
  /'20260831030000_telegram_como_ponte\.sql'/.test(guardaDoGatilho),
);
exigir(
  'o guarda do gatilho deixou de definir uma canal_do_aviso de mentira',
  !/create or replace function public\.canal_do_aviso[\s\S]{0,200}select 'openwa'::text/.test(guardaDoGatilho),
);

if (falhas.length) {
  console.error('Telegram na receita: %d protecao(oes) falharam.\n', falhas.length);
  for (const falha of falhas) console.error(' - %s', falha);
  process.exit(1);
}
console.log(`Telegram na receita: ${verificadas} protecoes verdes.`);
