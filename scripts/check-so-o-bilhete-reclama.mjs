#!/usr/bin/env node
// So o bilhete reclama uma compra paga. O e-mail nao basta.
//
// POR QUE ESTE GUARDA EXISTE
//
// `reclamar_compra` tinha duas vias: o bilhete do Stripe, e o e-mail da conta.
// A segunda nao aguenta: desde 04/09 o projecto confirma contas
// automaticamente, porque o envio de e-mail nunca funcionou. Uma conta nasce
// com o e-mail dado como confirmado sem que ninguem tenha provado ser dono
// dele.
//
// Quem soubesse o e-mail de um comprador criava conta com ele e LEVAVA A
// ASSINATURA. Nao e roubo de dados: e roubo de dinheiro que outra pessoa pagou.
// Achado pela sessao de QA em 05/09/2026.
//
// Corre num Postgres de verdade porque a regra vive em SQL, e ler o texto da
// funcao provaria apenas que alguem escreveu algo com esta aparencia.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, globSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const migracoes = resolve(process.cwd(), 'supabase/migrations');
const PORTA = '54417';
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

const ler = (f) => readFileSync(join(migracoes, f), 'utf8');
function extrairCreateTable(sql, tabela) {
  const marcador = `create table if not exists public.${tabela} (`;
  const inicio = sql.indexOf(marcador);
  if (inicio === -1) throw new Error(`Nao achei a DDL de ${tabela}.`);
  let p = 0, i = inicio + marcador.length - 1;
  for (; i < sql.length; i++) {
    if (sql[i] === '(') p++;
    else if (sql[i] === ')' && --p === 0) break;
  }
  return `${sql.slice(inicio, i + 1)};`;
}

const esquema = ler('20260711_relink_appreview_schema.sql');
const compras = ler('20260904210000_comprar_antes_de_ter_conta.sql');
const semComentarios = (t) => t.split('\n').filter((l) => !/^\s*--/.test(l)).join('\n');

const BOOTSTRAP = `
create schema if not exists auth;
create table if not exists auth.users (id uuid primary key, email text);
create role service_role; create role anon; create role authenticated;
${extrairCreateTable(esquema, 'subscriptions')}
alter table public.subscriptions add column if not exists market text;
alter table public.subscriptions add column if not exists merchant text;
alter table public.subscriptions add column if not exists stripe_price_id text;
alter table public.subscriptions add column if not exists checkout_session_id text;
alter table public.subscriptions add column if not exists billing_country text;
alter table public.subscriptions add column if not exists eligibility_status text;
${extrairCreateTable(compras, 'compras_a_reclamar')}
${semComentarios(ler('20260905090000_so_o_bilhete_reclama_a_compra.sql'))}
`;

const ROTEIRO = `
create or replace function cenario(p_como text) returns text language plpgsql as $fn$
declare comprador uuid := gen_random_uuid(); estranho uuid := gen_random_uuid();
        -- Cada cenario tem o seu bilhete: stripe_session_id e chave primaria,
        -- e reusar o mesmo faz o segundo cenario rebentar antes de medir.
        bilhete text := 'cs_live_' || replace(gen_random_uuid()::text, '-', '');
        email text := replace(gen_random_uuid()::text, '-', '') || '@exemplo.com';
        resultado text;
begin
  -- As DUAS contas com o MESMO e-mail. E o cenario real: a confirmacao
  -- automatica deixa qualquer um registar-se com o endereco de outra pessoa.
  insert into auth.users (id, email) values (comprador, email), (estranho, email);
  insert into public.compras_a_reclamar (stripe_session_id, email, price_per_month)
    values (bilhete, email, 99);

  if p_como = 'com-bilhete' then
    resultado := public.reclamar_compra(comprador, email, bilhete);
  elsif p_como = 'so-email' then
    resultado := public.reclamar_compra(estranho, email, null);
  elsif p_como = 'bilhete-errado' then
    resultado := public.reclamar_compra(estranho, email, 'cs_live_naoexiste');
  end if;

  return case when resultado is null then 'recusa' else 'entregou' end;
end;
$fn$;
`;

const MEDIR = `select
  cenario('com-bilhete') as com_bilhete,
  cenario('so-email') as so_email,
  cenario('bilhete-errado') as bilhete_errado;`;

const dir = mkdtempSync(join(tmpdir(), 'binno-bilhete-')), dados = join(dir, 'pg');
let ligado = false;
const psql = (sql, extra = []) => execFileSync(PSQL,
  ['-h', dir, '-p', PORTA, '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', ...extra, '-c', sql], { encoding: 'utf8' });
try {
  execFileSync(INITDB, ['-D', dados, '-U', 'postgres', '--auth=trust', '-E', 'UTF8'], { stdio: 'ignore' });
  execFileSync(PG_CTL, ['-D', dados, '-o', `-p ${PORTA} -k ${dir} -h ''`, '-l', join(dir, 'log'), 'start'], { stdio: 'ignore' });
  ligado = true;
  psql(BOOTSTRAP); psql(ROTEIRO);
  const linha = psql(MEDIR, ['-A', '-t', '-F', '~']).trim().split('\n').pop();
  const campos = linha.split('~');
  if (campos.length !== 3 || /CREATE|INSERT|ALTER/.test(campos[0])) {
    console.error(`A saida nao tem a forma esperada: ${JSON.stringify(linha).slice(0, 300)}`); process.exit(1);
  }
  const [comBilhete, soEmail, bilheteErrado] = campos;

  const falhas = [];
  const exigir = (r, c) => { if (!c) falhas.push(r); };

  // O BURACO. Um estranho com o mesmo e-mail nao leva a assinatura de ninguem.
  exigir(`so com o e-mail, um estranho levou a assinatura paga por outro: '${soEmail}'`,
    soEmail === 'recusa');
  exigir(`um bilhete que nao existe entregou uma compra: '${bilheteErrado}'`,
    bilheteErrado === 'recusa');

  // E QUEM TEM O BILHETE CONTINUA A RECEBER. Sem isto, uma funcao que recusasse
  // sempre passaria nas duas de cima e deixaria todo comprador sem produto — o
  // defeito oposto, e o pior dos dois.
  exigir(`quem pagou e tem o bilhete ficou sem a assinatura: '${comBilhete}'`,
    comBilhete === 'entregou');

  if (falhas.length) {
    console.error('So o bilhete reclama: VERMELHO\n' + falhas.map((f) => `  - ${f}`).join('\n'));
    process.exit(1);
  }
  console.log('So o bilhete reclama: 3 asserções, 3 cenarios corridos num Postgres real.');
} finally {
  if (ligado) { try { execFileSync(PG_CTL, ['-D', dados, '-m', 'immediate', 'stop'], { stdio: 'ignore' }); } catch { /* ja caiu */ } }
  rmSync(dir, { recursive: true, force: true });
}
