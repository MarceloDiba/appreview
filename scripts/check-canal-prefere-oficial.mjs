#!/usr/bin/env node
// A ordem dos canais de aviso, provada correndo a funcao de verdade.
//
// POR QUE ESTE GUARDA EXISTE
//
// `canal_do_aviso` decide, por dono, para onde vai TODO aviso do Binno. E o
// unico ponto por onde passam o Telegram (hoje o unico canal provado) e o
// WhatsApp oficial (onde o dono responde "1" e a resposta chega ao Google).
// Errar aqui nao parte uma tela: cala o produto inteiro, em silencio, porque
// o gatilho que enfileira tem `exception when others` e engole o problema.
//
// POR QUE ELE SOBE UM POSTGRES EM VEZ DE LER O FICHEIRO
//
// Uma expressao regular sobre o SQL prova que certas palavras estao escritas.
// A pergunta aqui nao e essa: e o que a funcao DEVOLVE para cada estado de
// dono. Sao quatro estados, e tres deles nem existem hoje no banco real. So
// correndo se sabe.
//
// O QUE ELE PRECISA
//
// `initdb`, `pg_ctl` e `psql` locais. Sem eles falha e diz o que instalar —
// nunca passa em silencio, porque um guarda que se rende quando nao consegue
// verificar parece verde exactamente quando devia gritar.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, globSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const migracoes = resolve(process.cwd(), 'supabase/migrations');
const PORTA = '54401';

function acharBinario(nome) {
  const candidatos = [];
  try { candidatos.push(execFileSync('which', [nome], { encoding: 'utf8' }).trim()); } catch { /* segue */ }
  for (const padrao of ['/opt/homebrew/opt/postgresql@*/bin', '/usr/lib/postgresql/*/bin', '/usr/local/opt/postgresql@*/bin']) {
    for (const dir of globSync(padrao)) candidatos.push(join(dir, nome));
  }
  const achado = candidatos.find((c) => c && existsSync(c));
  if (!achado) {
    console.error(`Nao encontrei '${nome}'. Este guarda corre a funcao de verdade.\n` +
      `No Mac: brew install postgresql@17. No Ubuntu: apt-get install postgresql.`);
    process.exit(1);
  }
  return achado;
}
const INITDB = acharBinario('initdb');
const PG_CTL = acharBinario('pg_ctl');
const PSQL = acharBinario('psql');

// A DDL da tabela vem do ficheiro real, contando parenteses, para o teste nao
// passar a testar uma copia que envelheceu sozinha.
function extrairCreateTable(sql, nomeTabela) {
  const marcador = `create table if not exists public.${nomeTabela} (`;
  const inicio = sql.indexOf(marcador);
  if (inicio === -1) throw new Error(`Nao achei a DDL de ${nomeTabela}.`);
  let profundidade = 0, i = inicio + marcador.length - 1;
  for (; i < sql.length; i++) {
    if (sql[i] === '(') profundidade++;
    else if (sql[i] === ')' && --profundidade === 0) break;
  }
  return `${sql.slice(inicio, i + 1)};`;
}

const sqlOutbox = readFileSync(join(migracoes, '20260821193000_whatsapp_delivery_outbox.sql'), 'utf8');

// A DDL de 21/08 escreveu o check do telefone como `'^\\+...'`, que em SQL
// exige uma barra invertida LITERAL antes do `+` — nenhum numero real passava.
// A correccao vive em 29/08, noutro ficheiro. Sem ela este guarda nem chega a
// inserir um dono. Recortada de la, e nao reescrita aqui.
const CORRECCAO_TELEFONE = readFileSync(
  join(migracoes, '20260829124156_corrigir_validacao_telefone_whatsapp.sql'), 'utf8');

// A funcao ANTIGA, recortada do ficheiro onde ela vive de verdade — a que
// devolvia `openwa`. Corre primeiro para que a nova a SUBSTITUA, em vez de
// nascer num banco onde nunca existiu nada. Nao se corre a migracao inteira
// porque ela agenda `pg_cron`, que nao existe num Postgres de secretaria.
function extrairFuncao(sql, nome) {
  const marcador = `create or replace function public.${nome}(`;
  const inicio = sql.indexOf(marcador);
  if (inicio === -1) throw new Error(`Nao achei a definicao de ${nome}.`);
  const fim = sql.indexOf('$function$;', sql.indexOf('as $function$', inicio) + 1);
  if (fim === -1) throw new Error(`Nao achei o fim de ${nome}.`);
  return `${sql.slice(inicio, fim)}$function$;`;
}

const sqlPonte = readFileSync(join(migracoes, '20260831030000_telegram_como_ponte.sql'), 'utf8');
const FUNCAO_ANTIGA = extrairFuncao(sqlPonte, 'canal_do_aviso');

// A coluna do Telegram nasce na mesma migracao da funcao antiga. Recortada do
// ficheiro, e nao escrita a mao, para nao envelhecer sozinha.
const COLUNA_TELEGRAM = (() => {
  const linha = sqlPonte.match(/alter table public\.whatsapp_notification_preferences\s+add column if not exists telegram_chat_id text;/);
  if (!linha) throw new Error('Nao achei a coluna telegram_chat_id na migracao da ponte.');
  return linha[0];
})();

// Se o recorte nao trouxer o `openwa`, ele nao e a funcao antiga, e o guarda
// passaria a comparar contra o nada. Falha alto em vez de fingir.
if (!/openwa/.test(FUNCAO_ANTIGA)) {
  console.error('O recorte da funcao antiga nao contem `openwa` — o ficheiro mudou de forma. Este guarda deixaria de provar a substituicao.');
  process.exit(1);
}

// A migracao nova, corrida do ficheiro de verdade.
const MIGRACOES = ['20260903220000_canal_prefere_whatsapp_oficial.sql'];

const BOOTSTRAP = `
create schema if not exists auth;
create table if not exists auth.users (id uuid primary key);
create role service_role;
create role anon;
create role authenticated;
${extrairCreateTable(sqlOutbox, 'whatsapp_notification_preferences')}
${extrairCreateTable(sqlOutbox, 'whatsapp_outbox')}
`;

// Os quatro estados de dono que existem. O nome de cada um diz o que ele e.
// OS ESTADOS QUE EXISTEM DE VERDADE.
//
// `recipient_e164` e NOT NULL na tabela: quem tem linha tem numero. Logo nao
// existe "dono com linha e sem numero", e o unico jeito de nao ter canal e nao
// ter linha nenhuma — que e o estado de quem ligou o Google e nunca configurou
// aviso. Testar um dono com numero nulo seria testar um estado impossivel.
const ROTEIRO = `
create or replace function teste_dono(p_chat text, p_oficial boolean)
returns text language plpgsql as $fn$
declare u uuid := gen_random_uuid();
begin
  insert into auth.users (id) values (u);
  insert into public.whatsapp_notification_preferences (user_id, recipient_e164, consented_at)
    values (u, '+5579991986091', now());
  -- Escreve so o que o caso pede; o resto fica no default da tabela, que e
  -- precisamente o que se quer medir no interruptor.
  if p_chat <> '' then
    update public.whatsapp_notification_preferences set telegram_chat_id = p_chat where user_id = u;
  end if;
  if p_oficial then
    update public.whatsapp_notification_preferences set whatsapp_oficial_ligado = true where user_id = u;
  end if;
  return public.canal_do_aviso(u);
end;
$fn$;

-- Um dono que existe em auth.users e nao tem linha de preferencias. E o estado
-- de quem ligou o Google e nunca configurou aviso nenhum.
create or replace function teste_dono_sem_linha() returns text language plpgsql as $fn$
declare u uuid := gen_random_uuid();
begin
  insert into auth.users (id) values (u);
  return public.canal_do_aviso(u);
end;
$fn$;

select
  teste_dono('', true)        as oficial_ligado_sem_telegram,
  teste_dono('55512', true)   as oficial_ligado_com_telegram,
  teste_dono('55512', false)  as oficial_desligado_com_telegram,
  teste_dono('', false)       as oficial_desligado_sem_telegram,
  teste_dono_sem_linha()      as sem_linha_de_preferencias,
  (select column_default from information_schema.columns
    where table_schema='public' and table_name='whatsapp_notification_preferences'
      and column_name='whatsapp_oficial_ligado')  as default_do_interruptor,
  (select is_nullable from information_schema.columns
    where table_schema='public' and table_name='whatsapp_notification_preferences'
      and column_name='whatsapp_oficial_ligado')  as interruptor_aceita_nulo;
`;

const dir = mkdtempSync(join(tmpdir(), 'binno-canal-'));
const dados = join(dir, 'pg');
let ligado = false;
const psql = (sql, extra = []) =>
  execFileSync(PSQL, ['-h', dir, '-p', PORTA, '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', ...extra, '-c', sql],
    { encoding: 'utf8' });

try {
  execFileSync(INITDB, ['-D', dados, '-U', 'postgres', '--auth=trust', '-E', 'UTF8'], { stdio: 'ignore' });
  execFileSync(PG_CTL, ['-D', dados, '-o', `-p ${PORTA} -k ${dir} -h ''`, '-l', join(dir, 'log'), 'start'], { stdio: 'ignore' });
  ligado = true;

  psql(BOOTSTRAP);
  psql(CORRECCAO_TELEFONE);
  psql(COLUNA_TELEGRAM);
  psql(FUNCAO_ANTIGA);
  for (const m of MIGRACOES) {
    execFileSync(PSQL, ['-h', dir, '-p', PORTA, '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-f', join(migracoes, m)], { stdio: ['ignore', 'ignore', 'inherit'] });
  }
  const saida = psql(ROTEIRO, ['-A', '-t', '-F', '|']).trim().split('\n').pop();
  const [ligadoSoOficial, ligadoComTelegram, desligadoComTelegram, desligadoSemTelegram,
         semLinha, padrao, aceitaNulo] = saida.split('|');

  const falhas = [];
  const exigir = (rotulo, condicao) => { if (!condicao) falhas.push(rotulo); };

  // 1. NUNCA MAIS OPENWA. Era o recuo, e o recuo estava morto desde 31/08.
  //    Um canal morto devolvido enfileira avisos que nao chegam a ninguem, em
  //    `queued`, com ar de estarem a caminho.
  const todos = [ligadoSoOficial, ligadoComTelegram, desligadoComTelegram, desligadoSemTelegram, semLinha];
  exigir(`canal_do_aviso ainda devolve 'openwa' em algum estado (${todos.join(', ')})`,
    !todos.includes('openwa'));

  // 2. O OFICIAL VEM ANTES DO TELEGRAM. Este e o caso que distingue a ordem
  //    nova da antiga: o dono tem os DOIS e o interruptor ligado.
  exigir(`dono com WhatsApp oficial E Telegram devia ir para 'meta-cloud', foi para '${ligadoComTelegram}'`,
    ligadoComTelegram === 'meta-cloud');
  exigir(`dono so com WhatsApp oficial devia ir para 'meta-cloud', foi para '${ligadoSoOficial}'`,
    ligadoSoOficial === 'meta-cloud');

  // 3. O INTERRUPTOR E POR DONO, e comeca desligado. Se fosse ignorado, o caso
  //    desligado iria na mesma para meta-cloud e a fila encheria de linhas sem
  //    quem as enviasse — os segredos da Meta ainda nao estao postos.
  exigir(`o interruptor desligado nao foi respeitado: foi para '${desligadoComTelegram}'`,
    desligadoComTelegram === 'telegram');
  exigir(`o default do interruptor devia ser false, e '${padrao}'`, /false/.test(padrao || ''));
  exigir('o interruptor devia ser not null', aceitaNulo === 'NO');

  // 4. NAO REGREDIR O TELEGRAM. E hoje o unico canal provado; se ele parar, o
  //    produto cala-se por inteiro.
  exigir(`dono com Telegram e oficial desligado devia continuar em 'telegram', foi para '${desligadoComTelegram}'`,
    desligadoComTelegram === 'telegram');
  exigir(`dono sem Telegram e com oficial desligado devia ir para 'telegram', foi para '${desligadoSemTelegram}'`,
    desligadoSemTelegram === 'telegram');
  exigir(`dono sem linha de preferencias devia ir para 'telegram' (falha a vista), foi para '${semLinha}'`,
    semLinha === 'telegram');

  if (falhas.length) {
    console.error('check-canal-prefere-oficial: VERMELHO\n' + falhas.map((f) => `  - ${f}`).join('\n'));
    process.exit(1);
  }
  console.log('check-canal-prefere-oficial: 9 asserções, 5 estados de dono corridos num Postgres real.');
} finally {
  if (ligado) { try { execFileSync(PG_CTL, ['-D', dados, '-m', 'immediate', 'stop'], { stdio: 'ignore' }); } catch { /* ja caiu */ } }
  rmSync(dir, { recursive: true, force: true });
}
