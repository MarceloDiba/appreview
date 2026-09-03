#!/usr/bin/env node
// A area de administrador: ve quem travou, e nao ve dado de terceiros.
//
// POR QUE ESTE GUARDA CORRE POSTGRES A SERIO
//
// O que esta area faz vive quase todo dentro de uma consulta SQL de duzentas
// linhas. Conferir isso com expressoes regulares provaria que certas palavras
// estao no ficheiro — e o que interessa e se o sinal ACENDE no caso dele e fica
// apagado nos outros. Por isso o guarda sobe um Postgres descartavel, aplica as
// migracoes de verdade, fabrica uma conta para cada defeito e le o resultado.
//
// AS DUAS COISAS QUE ELE PROTEGE, POR ORDEM
//
//   1. A FRONTEIRA DOS DADOS. A area foi aprovada com "so numeros": nunca o
//      texto de uma avaliacao, nem o nome ou telefone de quem escreveu. Isso
//      nao e uma promessa da tela — e a lista de colunas que a funcao devolve,
//      e este guarda compara essa lista com uma lista permitida. Acrescentar
//      `comment` ou `customer_name` um dia fica vermelho aqui.
//
//   2. QUE OS SINAIS DIZEM A VERDADE. Um sinal que nunca acende e um painel
//      tranquilo a mentir; um que acende sempre ensina a ignorar a pagina. As
//      duas direccoes sao medidas: para cada sinal ha uma conta que o deve
//      disparar e sete que nao.
//
// O QUE ELE NAO APANHA
//
//   - Como a pagina desenha. Nenhum navegador corre aqui.
//   - Se o aviso CHEGA ao Telegram. Isso e do drenador, que tem guarda proprio.
//   - Os limiares serem os certos (30 minutos, 72 horas). Isso e juizo de
//     produto, nao facto: o guarda prende os numeros para nao mudarem por
//     acidente, e nao afirma que sao os melhores.
import { execFileSync } from 'node:child_process';
import { existsSync, globSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const MIGRACOES = resolve(process.cwd(), 'supabase/migrations');
const MIGRACAO = 'supabase/migrations/20260903120000_area_de_administrador.sql';
const PORTA = '54405';

const falhas = [];
let verificadas = 0;
const exigir = (rotulo, condicao) => { verificadas += 1; if (!condicao) falhas.push(rotulo); };

const achar = (nome) => {
  const candidatos = [];
  try { candidatos.push(execFileSync('which', [nome], { encoding: 'utf8' }).trim()); } catch { /* segue */ }
  for (const padrao of ['/opt/homebrew/opt/postgresql@*/bin', '/usr/lib/postgresql/*/bin', '/usr/local/opt/postgresql@*/bin']) {
    for (const dir of globSync(padrao)) candidatos.push(join(dir, nome));
  }
  const achado = candidatos.find((c) => c && existsSync(c));
  if (!achado) {
    console.error(`Nao encontrei o binario '${nome}' do Postgres.\nEste guarda corre a consulta de verdade.\nNo Mac: brew install postgresql@17. No Ubuntu: apt-get install postgresql.`);
    process.exit(1);
  }
  return achado;
};
const INITDB = achar('initdb'); const PG_CTL = achar('pg_ctl'); const PSQL = achar('psql');

const cortarTabela = (sql, tabela) => {
  const marcador = `create table if not exists public.${tabela} (`;
  const inicio = sql.indexOf(marcador);
  if (inicio === -1) throw new Error(`Nao achei a DDL de ${tabela}.`);
  let i = inicio + marcador.length - 1; let profundidade = 0;
  for (; i < sql.length; i++) {
    if (sql[i] === '(') profundidade++;
    else if (sql[i] === ')') { profundidade--; if (!profundidade) break; }
  }
  return `${sql.slice(inicio, i + 1)};`;
};
const semExtensoes = (sql) => sql.replace(/^create extension if not exists [a-z_]+;\s*$/gim, '');
const ler = (nome) => readFileSync(join(MIGRACOES, nome), 'utf8');

const dir = mkdtempSync(join(tmpdir(), 'binno-admin-'));
const dados = join(dir, 'pg');
let ligado = false;
const psql = (sql, { tolerar = false } = {}) => {
  const ficheiro = join(dir, `q-${Math.random().toString(36).slice(2)}.sql`);
  writeFileSync(ficheiro, sql);
  try {
    return execFileSync(PSQL, ['-v', 'ON_ERROR_STOP=1', '-h', '127.0.0.1', '-p', PORTA, '-U', 'postgres', '-d', 'postgres', '-Atq', '-f', ficheiro], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (erro) {
    if (tolerar) return { erro: String(erro.stderr || erro.message) };
    throw new Error(`SQL falhou:\n${erro.stderr || erro.message}`);
  }
};

// A LISTA PERMITIDA. E isto que torna "so numeros" uma regra e nao uma
// intencao: qualquer coluna nova tem de ser acrescentada AQUI, a mao, por
// alguem que leia o que esta a fazer.
const COLUNAS_PERMITIDAS = [
  'user_id', 'negocio', 'email_da_conta', 'criada_em', 'nota',
  'total_de_avaliacoes', 'avaliacoes_lidas', 'comentarios_privados',
  'fila_de_respostas', 'ultima_coleta_em', 'dias_desde_a_coleta',
  // Uso do dono, desde 03/09/2026. Sao datas e contagens: a fronteira de "so
  // numeros" aguenta, e cada uma teve de ser escrita AQUI, a mao.
  'ultimo_acesso', 'respostas_publicadas', 'ultima_atividade_do_dono',
  'dias_sem_atividade', 'uso',
  // Valor entregue pelos clientes DELE. Contagens, nunca conteudo.
  'visitas_ao_qr_30d', 'comentarios_30d',
  'sinais', 'gravidade',
];

try {
  execFileSync(INITDB, ['-D', dados, '-U', 'postgres', '--auth=trust', '-E', 'UTF8'], { stdio: 'ignore' });
  execFileSync(PG_CTL, ['-D', dados, '-o', `-p ${PORTA} -k ${dir} -h 127.0.0.1`, '-l', join(dir, 'pg.log'), 'start', '-w'], { stdio: 'ignore' });
  ligado = true;

  psql(`
create role anon; create role authenticated; create role service_role;
create schema if not exists auth;
create table if not exists auth.users (id uuid primary key, email text, created_at timestamptz not null default now(), last_sign_in_at timestamptz);
create schema if not exists cron;
create function cron.schedule(text, text, text) returns bigint language sql as $$ select 1::bigint $$;
create function cron.unschedule(text) returns boolean language sql as $$ select true $$;
create schema if not exists net; create schema if not exists vault;
create view vault.decrypted_secrets as select ''::text as name, null::text as decrypted_secret where false;
create extension if not exists pgcrypto;
-- auth.uid() nao existe fora do Supabase. O talao le uma variavel de sessao,
-- que e o que permite a este guarda trocar de utilizador e medir o porteiro.
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('teste.uid', true), '')::uuid
$$;
`);

  const esquema = ler('20260711_relink_appreview_schema.sql');
  const outbox = ler('20260821193000_whatsapp_delivery_outbox.sql');
  for (const [sql, tabela] of [
    [esquema, 'profiles'], [esquema, 'platform_links'], [esquema, 'internal_feedback'], [esquema, 'admins'],
    [ler('20260815195000_experimental_apify_runs.sql'), 'experimental_apify_runs'],
    [outbox, 'whatsapp_notification_preferences'], [outbox, 'whatsapp_outbox'],
    [ler('20260831010000_fila_de_respostas_no_banco.sql'), 'google_reviews_awaiting_reply'],
    [esquema, 'qr_codes'],
    [ler('20260814190000_google_outcome_metrics.sql'), 'review_funnel_events'],
    [ler('20260830230000_avaliacao_publica_respondida_no_google.sql'), 'google_public_reviews_answered'],
  ]) psql(cortarTabela(sql, tabela));

  for (const nome of [
    '20260829124017_alerta_imediato_comentario_privado.sql',
    '20260829124156_corrigir_validacao_telefone_whatsapp.sql',
    '20260829124220_corrigir_validacao_telefone_outbox.sql',
    '20260829124330_tipo_feedback_na_fila_whatsapp.sql',
    '20260830190000_coleta_apify_automatica_no_cadastro.sql',
    '20260830220000_aviso_de_elogio_com_comentario.sql',
    '20260831030000_telegram_como_ponte.sql',
    '20260902230000_email_como_canal.sql',
    '20260903090000_resumo_por_mensagem_de_novo.sql',
    '20260903120000_area_de_administrador.sql',
    '20260903140000_o_aviso_fala_portugues.sql',
    '20260903160000_painel_de_controle.sql',
  ]) psql(semExtensoes(ler(nome)));

  // ---------------------------------------------------------------- as contas
  //
  // Uma conta por defeito, e uma saudavel. O `id` diz o que ela e, para uma
  // falha apontar o caso sem obrigar a contar linhas.
  const conta = (n) => `0000000${n}-0000-0000-0000-00000000000${n}`;
  const CASOS = [
    ['1', 'saudavel'],
    ['2', 'coleta_parada_na_fila'],
    ['3', 'nunca_coletou'],
    ['4', 'mensagem_falhou'],
    ['5', 'fila_presa_no_envio'],
    ['6', 'fila_parada_na_saida'],
    ['7', 'sem_canal_de_aviso'],
    ['8', 'resumo_nao_saiu'],
  ];
  for (const [n, rotulo] of CASOS) {
    psql(`insert into auth.users (id, email, created_at) values ('${conta(n)}', '${rotulo}@exemplo.com', now() - interval '10 days');`);
    // O NOME DO NEGOCIO NAO PODE CONTER O NOME DO SINAL. Ate aqui era
    // `Negocio ${rotulo}`, e isso envenenava a assercao que exige que o aviso
    // nao mande nomes de coluna para o telemovel: o nome do negocio de teste
    // punha `mensagem_falhou` no corpo, e o guarda acusava a si proprio.
    psql(`insert into public.profiles (id, business_name) values ('${conta(n)}', 'Negocio numero ${n}');`);
    psql(`insert into public.platform_links (user_id, platform, url) values ('${conta(n)}', 'google', 'https://g.page/r/exemplo/review');`);
  }
  // Todas menos a 3 ja coletaram com sucesso.
  for (const [n] of CASOS.filter(([n]) => n !== '3')) {
    psql(`insert into public.experimental_apify_runs (user_id, google_review_url, status, completed_at, result_summary)
          values ('${conta(n)}', 'https://g.page/r/exemplo/review', 'succeeded', now() - interval '2 days',
                  '{"business":{"name":"N","googleRating":4.5,"googleReviewCount":30},"sample":{"reviewCount":25}}'::jsonb);`);
  }
  // Preferencias: todas consentiram e tem Telegram, MENOS a 7.
  for (const [n] of CASOS) {
    const telegram = n === '7' ? 'null' : `'123456'`;
    psql(`insert into public.whatsapp_notification_preferences (user_id, recipient_e164, consented_at, telegram_chat_id, weekly_enabled)
          values ('${conta(n)}', '+5511961234567', now(), ${telegram}, ${n === '8' ? 'true' : 'true'});`);
  }
  // O resumo da semana saiu para todas menos a 8.
  for (const [n] of CASOS.filter(([n]) => n !== '8')) {
    psql(`insert into public.whatsapp_outbox (user_id, kind, provider, recipient_e164, body, idempotency_key)
          values ('${conta(n)}', 'weekly', 'telegram', '+5511961234567', 'resumo', 'weekly:${n}');`);
  }
  // E cada defeito, no seu caso.
  // O GATILHO DA COLETA JA ENFILEIROU AS OITO, sozinho, ao ver nome de negocio e
  // link do Google — que e exactamente o que ele deve fazer, e foi este guarda a
  // rebentar num `insert` duplicado que o mostrou. As oito linhas nascem com
  // `queued_at = now()`, logo estao dentro dos 30 minutos e nenhuma acende o
  // sinal. Envelhecer SO a da conta 2 e o que isola o caso.
  exigir('o gatilho da coleta enfileirou as contas novas sozinho',
    Number(psql(`select count(*) from public.apify_auto_collection_queue;`).trim()) === CASOS.length);
  psql(`update public.apify_auto_collection_queue set queued_at = now() - interval '2 hours' where user_id = '${conta('2')}';`);
  psql(`insert into public.whatsapp_outbox (user_id, kind, provider, recipient_e164, body, idempotency_key, status)
        values ('${conta('4')}', 'feedback', 'telegram', '+5511961234567', 'x', 'falhou:4', 'failed');`);
  psql(`insert into public.whatsapp_outbox (user_id, kind, provider, recipient_e164, body, idempotency_key, status, claimed_at)
        values ('${conta('5')}', 'feedback', 'telegram', '+5511961234567', 'x', 'presa:5', 'sending', now() - interval '1 hour');`);
  psql(`insert into public.whatsapp_outbox (user_id, kind, provider, recipient_e164, body, idempotency_key, status, scheduled_at)
        values ('${conta('6')}', 'feedback', 'telegram', '+5511961234567', 'x', 'parada:6', 'queued', now() - interval '2 hours');`);

  // ------------------------------------------------------- os limiares
  //
  // TRES CONTAS DE FRONTEIRA, e as tres nasceram de mutacoes que ficaram
  // VERDES. O guarda media a PRESENCA de cada sinal — uma conta que o dispara e
  // sete que nao — e isso nao mede o limiar nenhum: alargar "ha mais de 30
  // minutos" para "daqui a 30 minutos" mantinha tudo verde, porque nenhuma
  // outra conta tinha uma linha para acender. Um sinal que dispara sempre e tao
  // mau como um que nunca dispara.
  const CONTA_NOVA = '00000009-0000-0000-0000-000000000009';
  const CONTA_LIMIAR = '00000010-0000-0000-0000-000000000010';

  // A conta acabada de nascer: tem nome e link, ainda nao coletou, e a coleta
  // dela pode estar a correr agora. Sem a carencia de uma hora ela nasce
  // vermelha, e a pagina passa a gritar por causa do funcionamento normal.
  psql(`insert into auth.users (id, email, created_at) values ('${CONTA_NOVA}', 'acabou-de-nascer@exemplo.com', now() - interval '5 minutes');`);
  psql(`insert into public.profiles (id, business_name) values ('${CONTA_NOVA}', 'Negocio Acabado de Nascer');`);
  psql(`insert into public.platform_links (user_id, platform, url) values ('${CONTA_NOVA}', 'google', 'https://g.page/r/exemplo/review');`);
  exigir('uma conta acabada de nascer nao e acusada de nunca ter coletado',
    !psql(`select coalesce(array_to_string(sinais, ','), '') from public.calcular_saude_das_contas() where user_id = '${CONTA_NOVA}';`).trim().split(',').includes('nunca_coletou'));

  // E a conta dos limiares: uma mensagem reservada AGORA (dentro dos 15
  // minutos) e uma falha VELHA (fora das 72 horas). Nenhuma das duas deve
  // acender nada.
  psql(`insert into auth.users (id, email, created_at) values ('${CONTA_LIMIAR}', 'limiar@exemplo.com', now() - interval '10 days');`);
  psql(`insert into public.profiles (id, business_name) values ('${CONTA_LIMIAR}', 'Negocio Limiar');`);
  psql(`insert into public.experimental_apify_runs (user_id, google_review_url, status, completed_at)
        values ('${CONTA_LIMIAR}', 'https://g.page/r/exemplo/review', 'succeeded', now() - interval '2 days');`);
  psql(`insert into public.whatsapp_outbox (user_id, kind, provider, recipient_e164, body, idempotency_key, status, claimed_at)
        values ('${CONTA_LIMIAR}', 'feedback', 'telegram', '+5511961234567', 'x', 'recente:10', 'sending', now() - interval '2 minutes');`);
  psql(`insert into public.whatsapp_outbox (user_id, kind, provider, recipient_e164, body, idempotency_key, status, created_at)
        values ('${CONTA_LIMIAR}', 'feedback', 'telegram', '+5511961234567', 'x', 'velha:10', 'failed', now() - interval '10 days');`);
  const sinaisDoLimiar = psql(`select coalesce(array_to_string(sinais, ','), '') from public.calcular_saude_das_contas() where user_id = '${CONTA_LIMIAR}';`).trim().split(',');
  exigir('uma mensagem reservada ha dois minutos nao conta como presa',
    !sinaisDoLimiar.includes('fila_presa_no_envio'));
  exigir('uma falha de ha dez dias nao conta como recente',
    !sinaisDoLimiar.includes('mensagem_falhou'));

  // ------------------------------------------------------------ o uso
  //
  // USO DO DONO E VALOR ENTREGUE SAO COISAS DIFERENTES, e e a distincao que
  // estrutura o painel: um cliente pode ter o QR a trabalhar sozinho e nunca
  // abrir o painel — e esse e exactamente o que cancela, porque nao ve o que
  // esta a ganhar.
  const usoDe = (id) => psql(`select uso from public.calcular_saude_das_contas() where user_id = '${id}';`).trim();

  // A conta 1 nunca fez login (as contas de teste nascem sem `last_sign_in_at`)
  // e tambem nao tem QR nem resposta: e o caso `nunca_entrou`.
  exigir('quem nunca entrou e marcado como tal', usoDe(conta('1')) === 'nunca_entrou');
  psql(`update auth.users set last_sign_in_at = now() - interval '2 days' where id = '${conta('1')}';`);
  exigir('quem entrou esta semana esta ativo', usoDe(conta('1')) === 'ativo');
  psql(`update auth.users set last_sign_in_at = now() - interval '14 days' where id = '${conta('1')}';`);
  exigir('quem entrou ha duas semanas esta a esfriar', usoDe(conta('1')) === 'esfriando');
  psql(`update auth.users set last_sign_in_at = now() - interval '40 days' where id = '${conta('1')}';`);
  exigir('quem nao aparece ha mais de tres semanas esta sumido', usoDe(conta('1')) === 'sumido');
  exigir('um dono sumido acende o sinal comercial',
    psql(`select coalesce(array_to_string(sinais, ','), '') from public.calcular_saude_das_contas() where user_id = '${conta('1')}';`).trim().split(',').includes('dono_sumido'));
  // E O SINAL COMERCIAL NAO E UM DEFEITO: ninguem tem de o consertar, alguem tem
  // de falar com a pessoa. Se contasse para a gravidade, a pagina passaria a
  // dizer "travado" a um cliente cujo produto esta perfeito.
  exigir('um dono sumido nao torna a conta tecnicamente travada',
    psql(`select gravidade from public.calcular_saude_das_contas() where user_id = '${conta('1')}';`).trim() === 'ok');

  // Publicar uma resposta conta como uso, mesmo sem login novo: entrar e sair
  // nao e usar, e publicar e um acto com intencao.
  psql(`insert into public.google_public_reviews_answered (user_id, review_id, answered_at)
        values ('${conta('1')}', 'r1', now() - interval '1 day');`);
  exigir('publicar uma resposta conta como uso, mesmo sem login novo', usoDe(conta('1')) === 'ativo');
  psql(`delete from public.google_public_reviews_answered where user_id = '${conta('1')}';`);
  psql(`update auth.users set last_sign_in_at = now() - interval '2 days' where id = '${conta('1')}';`);

  // O valor entregue conta-se a parte, e nao entra no uso do dono.
  psql(`insert into public.qr_codes (id, user_id, name, slug, redirect_url) values ('11111111-2222-3333-4444-555555555555', '${conta('1')}', 'QR de teste', 'qr-de-teste', 'https://binno.pro/review/qr-de-teste');`);
  psql(`insert into public.review_funnel_events (event_key, qr_code_id, user_id, event_type, created_at)
        values ('e1', '11111111-2222-3333-4444-555555555555', '${conta('1')}', 'qr_open', now() - interval '3 days');`);
  psql(`insert into public.review_funnel_events (event_key, qr_code_id, user_id, event_type, created_at)
        values ('e2', '11111111-2222-3333-4444-555555555555', '${conta('1')}', 'qr_open', now() - interval '60 days');`);
  exigir('as visitas ao QR contam so os ultimos 30 dias',
    psql(`select visitas_ao_qr_30d from public.calcular_saude_das_contas() where user_id = '${conta('1')}';`).trim() === '1');

  // ------------------------------------------------- 1. a fronteira dos dados
  const colunas = psql(`select string_agg(a.attname, ',' order by a.attnum)
      from pg_type t join pg_class c on c.oid = t.typrelid
      join pg_attribute a on a.attrelid = c.oid and a.attnum > 0
     where t.typname = 'registo_de_saude';`).trim();
  exigir('a area devolve exactamente as colunas permitidas, e nenhuma a mais',
    colunas === COLUNAS_PERMITIDAS.join(','));
  // A assercao acima falha se alguem acrescentar uma coluna. Esta falha se
  // alguem acrescentar uma coluna com nome de dado de terceiros, mesmo que
  // tambem mexa na lista permitida deste ficheiro sem pensar.
  exigir('nenhuma coluna carrega texto ou identidade de terceiros',
    !/(comment|texto|customer|reviewer|telefone|phone|feedback_text)/i.test(colunas));

  // ------------------------------------------------------ 2. cada sinal acende
  const sinaisDe = (n) => psql(`select coalesce(array_to_string(sinais, ','), '') from public.calcular_saude_das_contas() where user_id = '${conta(n)}';`).trim();
  const gravidadeDe = (n) => psql(`select gravidade from public.calcular_saude_das_contas() where user_id = '${conta(n)}';`).trim();

  exigir('a conta saudavel nao acende sinal nenhum', sinaisDe('1') === '');
  exigir('a conta saudavel fica ok', gravidadeDe('1') === 'ok');
  for (const [n, rotulo] of CASOS.filter(([n]) => n !== '1')) {
    exigir(`o sinal ${rotulo} acende na conta dele`, sinaisDe(n).split(',').includes(rotulo));
    // E NAO acende em mais nenhuma. Um sinal que acende sempre ensina a ignorar
    // a pagina, e e tao mau como um que nunca acende.
    const outras = CASOS.filter(([outro]) => outro !== n).map(([outro]) => sinaisDe(outro));
    exigir(`o sinal ${rotulo} nao acende nas outras contas`,
      outras.every((sinais) => !sinais.split(',').includes(rotulo)));
  }
  exigir('resumo_nao_saiu e atencao, e nao travado', gravidadeDe('8') === 'atencao');
  for (const [n] of CASOS.filter(([n]) => !['1', '8'].includes(n))) {
    exigir(`a conta ${n} fica travada`, gravidadeDe(n) === 'travado');
  }
  // `coleta_antiga` e informacao: sozinho nao pinta a conta de amarelo.
  psql(`update public.experimental_apify_runs set completed_at = now() - interval '90 days' where user_id = '${conta('1')}';`);
  exigir('coleta_antiga acende como informacao', sinaisDe('1') === 'coleta_antiga');
  exigir('coleta_antiga sozinho deixa a conta ok, e nao amarela', gravidadeDe('1') === 'ok');
  psql(`update public.experimental_apify_runs set completed_at = now() - interval '2 days' where user_id = '${conta('1')}';`);

  // ------------------------------------------------------------ 3. o porteiro
  const semSessao = psql(`select count(*) from public.saude_das_contas();`, { tolerar: true });
  exigir('sem sessao, a porta recusa em vez de devolver lista vazia', semSessao.erro !== undefined);
  const naoAdmin = psql(`set teste.uid = '${conta('2')}'; select count(*) from public.saude_das_contas();`, { tolerar: true });
  exigir('quem nao e administrador recebe recusa, e nao uma lista tranquila', naoAdmin.erro !== undefined);
  psql(`insert into public.admins (user_id) values ('${conta('1')}');`);
  const admin = psql(`set teste.uid = '${conta('1')}'; select count(*) from public.saude_das_contas();`, { tolerar: true });
  // `CASOS.length + 2` porque as duas contas de fronteira tambem sao contas: a
  // area lista TODAS, e nao so as que tem problema — o Marcelo precisa de saber
  // quantos clientes tem, e nao so quantos estao partidos.
  exigir('o administrador ve a lista inteira, e nao so as contas com problema',
    admin.erro === undefined && Number(String(admin).trim()) === CASOS.length + 2);
  for (const papel of ['anon', 'authenticated']) {
    exigir(`${papel} nao pode chamar o calculo directamente`,
      psql(`select has_function_privilege('${papel}', 'public.calcular_saude_das_contas()', 'execute');`).trim() === 'f');
  }
  exigir('anon nao pode sequer bater a porta',
    psql(`select has_function_privilege('anon', 'public.saude_das_contas()', 'execute');`).trim() === 'f');
  exigir('quem tem sessao pode bater a porta',
    psql(`select has_function_privilege('authenticated', 'public.saude_das_contas()', 'execute');`).trim() === 't');

  // --------------------------------------------------------------- 4. o aviso
  psql(`select public.avisar_administrador();`);
  const primeiro = Number(psql(`select count(*) from public.whatsapp_outbox where kind = 'admin-alerta';`).trim());
  exigir('o primeiro aviso e enviado', primeiro === 1);
  exigir('o aviso sai pelo canal do administrador',
    psql(`select provider from public.whatsapp_outbox where kind = 'admin-alerta' limit 1;`).trim() === 'telegram');
  const corpoDoAviso = psql(`select body from public.whatsapp_outbox where kind = 'admin-alerta' limit 1;`);
  exigir('o aviso nomeia as contas travadas e aponta para a area', /binno\.pro\/admin/.test(corpoDoAviso));
  // O AVISO FALA PORTUGUES. A primeira versao mandava `mensagem_falhou` cru
  // para o telemovel de alguem que nao e tecnico, as oito da manha.
  exigir('o aviso nao manda nomes de coluna para o telemovel',
    !/coleta_parada_na_fila|nunca_coletou|mensagem_falhou|fila_presa_no_envio|fila_parada_na_saida|sem_canal_de_aviso|resumo_nao_saiu/.test(corpoDoAviso));
  exigir('o aviso descreve o sinal por extenso',
    /Mensagem parada na fila há mais de 30 minutos|Cadastrou e nunca coletou|Mensagem falhou nas últimas 72 horas/.test(corpoDoAviso));

  // AS DUAS LISTAS DE ROTULOS TEM DE SER IGUAIS. Uma vive no SQL (porque o aviso
  // e composto no banco) e outra no TypeScript (porque a pagina e desenhada no
  // navegador). Duas listas da mesma coisa divergem, e a divergencia e
  // invisivel: o Marcelo leria uma frase no telemovel e outra na pagina para o
  // mesmo sinal.
  const rotulosDoBanco = Object.fromEntries(
    psql(`select sinal || '=' || public.rotulo_do_sinal(sinal)
            from unnest(array['coleta_parada_na_fila','nunca_coletou','mensagem_falhou',
                              'fila_presa_no_envio','fila_parada_na_saida','sem_canal_de_aviso',
                              'resumo_nao_saiu','coleta_antiga']) as sinal;`)
      .trim().split('\n').map((linha) => {
        const corte = linha.indexOf('=');
        return [linha.slice(0, corte), linha.slice(corte + 1)];
      }),
  );
  const fonteDaTela = readFileSync('src/lib/saudeDasContas.ts', 'utf8');
  const rotulosDaTela = Object.fromEntries(
    [...fonteDaTela.matchAll(/(\w+): \{\s*titulo: '([^']+)'/g)].map((achado) => [achado[1], achado[2]]),
  );
  exigir('a tela tem um rotulo para cada sinal do banco',
    Object.keys(rotulosDoBanco).every((sinal) => rotulosDaTela[sinal] !== undefined));
  exigir('os rotulos do banco e da tela sao os mesmos, palavra por palavra',
    Object.entries(rotulosDoBanco).every(([sinal, texto]) => rotulosDaTela[sinal] === texto));
  // O RECUO: um sinal novo que ninguem tenha traduzido sai com o nome cru, e
  // nao desaparece. Uma linha feia e melhor do que um aviso que esconde um
  // problema. Sem esta assercao o `else` da funcao era decoracao — descoberto a
  // tentar quebra-lo e ver o guarda continuar verde.
  exigir('um sinal ainda sem traducao sai cru, em vez de sumir',
    psql(`select public.rotulo_do_sinal('sinal_que_ainda_nao_existe');`).trim() === 'sinal_que_ainda_nao_existe');
  // SO QUANDO MUDA. Sem isto ele recebe o mesmo aviso todos os dias ate deixar
  // de o ler, e um aviso que se deixa de ler e pior do que nenhum.
  psql(`select public.avisar_administrador();`);
  exigir('a mesma realidade nao gera um segundo aviso',
    Number(psql(`select count(*) from public.whatsapp_outbox where kind = 'admin-alerta';`).trim()) === 1);
  // E a regra nao pode virar "so uma vez na vida": corrigido e partido outra
  // vez, tem de voltar a avisar.
  psql(`delete from public.whatsapp_outbox where idempotency_key = 'parada:6';`);
  psql(`select public.avisar_administrador();`);
  const depoisDeMudar = Number(psql(`select count(*) from public.whatsapp_outbox where kind = 'admin-alerta';`).trim());
  exigir('uma realidade diferente gera aviso novo', depoisDeMudar === 2);
  psql(`insert into public.whatsapp_outbox (user_id, kind, provider, recipient_e164, body, idempotency_key, status, scheduled_at)
        values ('${conta('6')}', 'feedback', 'telegram', '+5511961234567', 'x', 'parada:6', 'queued', now() - interval '2 hours');`);
  psql(`select public.avisar_administrador();`);
  exigir('um problema que volta depois de resolvido volta a avisar',
    Number(psql(`select count(*) from public.whatsapp_outbox where kind = 'admin-alerta';`).trim()) === 3);
  // `coleta_antiga` muda de valor a cada dia que passa; se entrasse na
  // assinatura, faria um aviso novo todos os dias — o ruido que a regra existe
  // para evitar.
  const antesDaColetaAntiga = Number(psql(`select count(*) from public.whatsapp_outbox where kind = 'admin-alerta';`).trim());
  psql(`update public.experimental_apify_runs set completed_at = now() - interval '200 days' where user_id = '${conta('4')}';`);
  psql(`select public.avisar_administrador();`);
  exigir('coleta_antiga nao entra na assinatura, senao avisaria todos os dias',
    Number(psql(`select count(*) from public.whatsapp_outbox where kind = 'admin-alerta';`).trim()) === antesDaColetaAntiga);
  exigir('cada aviso enviado fica no historico',
    Number(psql(`select count(*) from public.admin_health_alerts;`).trim()) === 3);
} finally {
  if (ligado) { try { execFileSync(PG_CTL, ['-D', dados, '-m', 'immediate', 'stop'], { stdio: 'ignore' }); } catch { /* ja parou */ } }
  rmSync(dir, { recursive: true, force: true });
}

// ------------------------------------------------- 5. o que o Postgres nao corre
const migracao = readFileSync(MIGRACAO, 'utf8').replace(/^\s*--[^\n]*$/gm, '');
// O `pg_cron` corre em UTC. `0 8 * * *` entregaria o aviso as cinco da manha.
exigir('o aviso e agendado para as 08:00 de Sao Paulo, escrito em UTC',
  /select cron\.schedule\('binno-saude-das-contas', '0 11 \* \* \*', 'select public\.avisar_administrador\(\);'\);/.test(migracao));
exigir('agendar duas vezes nao cria dois trabalhos',
  /perform cron\.unschedule\('binno-saude-das-contas'\);/.test(migracao));
exigir('a tabela do historico e de operacao interna',
  /alter table public\.admin_health_alerts enable row level security;/.test(migracao)
  && /revoke all on table public\.admin_health_alerts from anon, authenticated;/.test(migracao));

// ------------------------------------------------------------- 6. a tela
const semComentariosTs = (fonte) => fonte
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, ' ')
  .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
const pagina = semComentariosTs(readFileSync('src/pages/Admin.tsx', 'utf8'));
const leitura = semComentariosTs(readFileSync('src/lib/saudeDasContas.ts', 'utf8'));
const rotas = semComentariosTs(readFileSync('src/App.tsx', 'utf8'));

// A recusa devolve "nao encontrado", e nao "acesso negado": uma negacao
// confirma que a rota existe, e uma rota que se sabe existir e uma rota que
// alguem tenta.
exigir('a recusa devolve a pagina de nao encontrado',
  /leitura\.estado === 'sem-permissao'\) return <NotFound \/>;/.test(pagina));
// E uma falha de rede NAO pode virar "sem permissao": isso esconderia o
// problema atras de uma explicacao errada.
exigir('uma falha de verdade e distinguida de uma recusa',
  /error\.code === '42501'/.test(leitura) && /estado: 'falhou'/.test(leitura));
exigir('a rota da area existe', /<Route path="\/admin" element=\{<Admin \/>\} \/>/.test(rotas));
// Sem `ProtectedRoute`, de proposito: um redireccionamento para o login tambem
// confirmaria que a rota existe.
exigir('a rota nao anuncia a sua existencia com um redireccionamento',
  !/<Route path="\/admin"[\s\S]{0,120}ProtectedRoute/.test(rotas));
// A tela nao pode DESENHAR um campo de terceiros. Se alguem acrescentar
// `comentario` ao tipo, o Postgres nao o traz e o guarda de cima ja fica
// vermelho; esta prende a outra ponta.
//
// So ACESSO A PROPRIEDADE conta, e nao a palavra solta. A primeira versao
// procurava `telefone` em qualquer sitio e ficou vermelha por causa da propria
// tela: ela tem, no rodape, a frase que diz que NAO mostra nome nem telefone de
// quem escreveu. Uma assercao que apanha a explicacao da regra em vez da
// violacao ensina a apagar a explicacao — que e a coisa mais util da pagina.
//
// `texto` saiu da lista: e generico de mais para ser prova. Ele apanhou
// `cor.texto`, o rotulo de gravidade da propria tela — uma palavra que nao tem
// nada a ver com conteudo de cliente. Uma assercao que fica vermelha por causa
// de um nome comum ensina a desliga-la. Ficam os nomes que so podem significar
// uma coisa.
// A FAIXA DE TOTAIS. Foi o que Marcelo pediu em 03/09: "quero de fato um painel
// de controle". Sem estas linhas, alguem simplifica a tela um dia e os quatro
// numeros desaparecem sem ninguem dar por isso.
exigir('a faixa conta as travadas, as em risco, as a esfriar e as activas',
  /const travadas = contas\.filter\(\(conta\) => conta\.gravidade === 'travado'\)\.length;/.test(pagina)
  && /const emRisco = contas\.filter\(\(conta\) => conta\.uso === 'sumido' \|\| conta\.uso === 'nunca_entrou'\)\.length;/.test(pagina)
  && /const esfriando = contas\.filter\(\(conta\) => conta\.uso === 'esfriando'\)\.length;/.test(pagina)
  && /const ativas = contas\.filter\(\(conta\) => conta\.uso === 'ativo'\)\.length;/.test(pagina));
exigir('a faixa e desenhada na pagina', /<Faixa contas=\{leitura\.contas\} \/>/.test(pagina));

// A RETENCAO NAO SE ENVIA SOZINHA. Uma mensagem automatica a um cliente que
// paga chega no dia em que o Marcelo acabou de falar com ele ao telefone, ou
// chega com o tom errado. O botao abre o e-mail com o texto escrito.
exigir('o rascunho de retencao abre o e-mail, e nao dispara nada',
  /href=\{`mailto:\$\{encodeURIComponent\(conta\.emailDaConta\)\}/.test(pagina));
exigir('nada na tela envia mensagem por conta propria',
  !/supabase\.functions\.invoke|fetch\(|\.rpc\('enviar/.test(pagina));
// E o rascunho so aparece para quem esta mesmo em risco: oferece-lo a um
// cliente activo convida a incomodar quem esta bem.
exigir('o rascunho so aparece para quem sumiu',
  /\{\(conta\.uso === 'sumido' \|\| conta\.uso === 'nunca_entrou'\) && conta\.emailDaConta && \(/.test(pagina));

// As duas escalas — uso e gravidade — nao podem partilhar cor: uma conta pode
// estar tecnicamente perfeita e a caminho de cancelar, e a pagina diria "verde"
// a um cliente que esta a sair.
exigir('a escala de uso tem cores proprias, separadas da gravidade tecnica',
  /const CORES_DO_USO = \{/.test(pagina));

exigir('a tela nao desenha campo de conteudo de terceiros',
  !/\.\s*(customerName|customer_name|reviewerName|reviewer_name|comentarioTexto|feedbackText|feedback_text|telefone|phone)\b/i.test(pagina));

if (falhas.length) {
  console.error('Area de administrador: %d protecao(oes) falharam.\n', falhas.length);
  for (const falha of falhas) console.error(' - %s', falha);
  process.exit(1);
}
console.log(`Area de administrador: ${verificadas} protecoes verdes.`);
