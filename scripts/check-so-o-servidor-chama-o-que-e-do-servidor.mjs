#!/usr/bin/env node
// Funcoes internas nao podem ser chamaveis de fora.
//
// POR QUE ESTE GUARDA EXISTE
//
// Toda funcao em `public` nasce com `EXECUTE` para `PUBLIC`, e o PostgREST
// serve cada uma em `/rest/v1/rpc/<nome>`. Em 04/09/2026, onze funcoes que
// existem so para gatilhos e para o cron estavam na API publica.
//
// A pior aceitava um `user_id` qualquer SEM ESTAR AUTENTICADO e enfileirava
// uma coleta PAGA da Apify em nome dessa conta. Nao vazava dado; enchia a
// factura de quem descobrisse o endereco.
//
// Este guarda CORRE a migracao num Postgres de verdade e pergunta ao banco
// quem pode executar o que. Uma assercao sobre o texto do ficheiro ficaria
// verde com um `revoke` que nao revoga nada.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, globSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const PORTA = '54413';
function acharBinario(nome) {
  const candidatos = [];
  try { candidatos.push(execFileSync('which', [nome], { encoding: 'utf8' }).trim()); } catch { /* segue */ }
  for (const padrao of ['/opt/homebrew/opt/postgresql@*/bin', '/usr/lib/postgresql/*/bin', '/usr/local/opt/postgresql@*/bin']) {
    for (const dir of globSync(padrao)) candidatos.push(join(dir, nome));
  }
  const achado = candidatos.find((c) => c && existsSync(c));
  if (!achado) { console.error(`Nao encontrei '${nome}'. No Mac: brew install postgresql@17.`); process.exit(1); }
  return achado;
}
const INITDB = acharBinario('initdb'), PG_CTL = acharBinario('pg_ctl'), PSQL = acharBinario('psql');

const MIGRACAO = resolve(process.cwd(), 'supabase/migrations/20260904200000_so_o_servidor_chama_o_que_e_do_servidor.sql');

// AS QUE TEM DE FICAR FECHADAS.
const FECHADAS = [
  'queue_apify_auto_collection_if_ready',
  'trg_apify_auto_collection_from_profile',
  'trg_apify_auto_collection_from_platform_link',
  'dispensar_rascunho_superado',
  'notify_internal_feedback_whatsapp',
  'handle_new_user_profile',
  'chamar_oferta_de_rascunhos',
  'limpar_batidas_antigas',
  'aplicar_fuso_do_pais',
  'attribute_review_funnel_event',
  'calcular_saude_das_contas',
];
// E AS QUE TEM DE CONTINUAR ABERTAS. Sem estas, uma migracao que fechasse
// TUDO passaria em todas as asserções acima e partiria a pagina publica do QR
// code e o painel de administracao — o defeito oposto, igualmente real.
const ABERTA_A_ANON = 'get_public_qr_business';
const ABERTA_A_AUTENTICADO = 'saude_das_contas';

const dir = mkdtempSync(join(tmpdir(), 'binno-portas-')), dados = join(dir, 'pg');
let ligado = false;
const psql = (sql, extra = []) => execFileSync(PSQL,
  ['-h', dir, '-p', PORTA, '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', ...extra, '-c', sql], { encoding: 'utf8' });

try {
  execFileSync(INITDB, ['-D', dados, '-U', 'postgres', '--auth=trust', '-E', 'UTF8'], { stdio: 'ignore' });
  execFileSync(PG_CTL, ['-D', dados, '-o', `-p ${PORTA} -k ${dir} -h ''`, '-l', join(dir, 'log'), 'start'], { stdio: 'ignore' });
  ligado = true;

  psql(`create role anon; create role authenticated; create role service_role;`);
  // Talos com a mesma assinatura das reais. O que a migracao mexe e a
  // permissao, e nao o corpo — um talo mede a permissao tao bem como o
  // original, e nao arrasta meia base de dados para dentro deste guarda.
  psql(`create function public.queue_apify_auto_collection_if_ready(p_user_id uuid) returns void language sql as 'select';`);
  for (const nome of FECHADAS.filter((n) => n !== 'queue_apify_auto_collection_if_ready')) {
    psql(`create function public.${nome}() returns void language sql as 'select';`);
  }
  psql(`create function public.${ABERTA_A_ANON}(p_identifier text) returns void language sql as 'select';`);
  psql(`create function public.${ABERTA_A_AUTENTICADO}() returns void language sql as 'select';`);
  // O estado de partida: tudo aberto, como o PostgreSQL entrega. Sem isto, um
  // banco que ja negasse por outra razao faria as asserções passarem sozinhas.
  const abertaAntes = psql(
    `select has_function_privilege('anon', 'public.queue_apify_auto_collection_if_ready(uuid)', 'execute');`,
    ['-A', '-t']).trim();
  if (abertaAntes !== 't') {
    console.error('A funcao ja nascia fechada neste Postgres; o guarda mediria uma porta que ninguem abriu.');
    process.exit(1);
  }

  execFileSync(PSQL, ['-h', dir, '-p', PORTA, '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-f', MIGRACAO],
    { stdio: 'pipe', encoding: 'utf8' });

  const falhas = [];
  const exigir = (r, c) => { if (!c) falhas.push(r); };
  const podeChamar = (papel, assinatura) =>
    psql(`select has_function_privilege('${papel}', '${assinatura}', 'execute');`, ['-A', '-t']).trim() === 't';

  const assinaturaDe = (n) => n === 'queue_apify_auto_collection_if_ready'
    ? `public.${n}(uuid)` : `public.${n}()`;

  for (const nome of FECHADAS) {
    for (const papel of ['anon', 'authenticated']) {
      exigir(`'${papel}' voltou a poder chamar ${nome} pela API publica`,
        !podeChamar(papel, assinaturaDe(nome)));
    }
  }
  // E O SERVIDOR TEM DE CONTINUAR A CHAMAR. Fechar a toda a gente, incluindo
  // quem precisa, calaria o cron sem ninguem reparar.
  exigir('o service_role deixou de poder chamar as funcoes internas; o cron pararia em silencio',
    podeChamar('service_role', 'public.chamar_oferta_de_rascunhos()'));

  exigir('a pagina publica do QR code deixou de poder ser lida sem sessao',
    podeChamar('anon', `public.${ABERTA_A_ANON}(text)`));
  exigir('o painel de administracao deixou de poder ler a saude das contas',
    podeChamar('authenticated', `public.${ABERTA_A_AUTENTICADO}()`));

  if (falhas.length) {
    console.error('So o servidor chama o que e do servidor: VERMELHO\n' + falhas.map((f) => `  - ${f}`).join('\n'));
    process.exit(1);
  }
  console.log(`So o servidor chama o que e do servidor: ${FECHADAS.length * 2 + 3} permissoes conferidas num Postgres real.`);
} finally {
  if (ligado) { try { execFileSync(PG_CTL, ['-D', dados, '-m', 'immediate', 'stop'], { stdio: 'ignore' }); } catch { /* ja caiu */ } }
  rmSync(dir, { recursive: true, force: true });
}
