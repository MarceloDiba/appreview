#!/usr/bin/env node
// O link do Google nao e pedido a quem ja ligou a conta.
//
// POR QUE ESTE GUARDA EXISTE
//
// A pagina publica do QR manda o cliente para o Google com um link que o dono
// colou a mao. Desde 03/09/2026 a ligacao oficial devolve o `placeId` do
// proprio Google, e continuar a pedir e pedir o que ja se sabe. Marcelo
// apanhou-o duas vezes.
//
// E A ORDEM E QUE IMPORTA, mais do que a derivacao. O link manual continua a
// mandar quando existe: um dono que colou um `g.page` curto escolheu aquele
// endereco e pode te-lo IMPRESSO numa mesa. Trocar-lho por baixo mudaria o
// destino de um QR que ja esta no mundo. O oficial entra so onde nao ha manual.
//
// ELE CORRE A FUNCAO num Postgres real, com os quatro estados de dono, porque
// a pergunta e o que ela DEVOLVE — e ler o SQL nao responde a isso.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, globSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const migracoes = resolve(process.cwd(), 'supabase/migrations');
const PORTA = '54405';
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

function extrairFuncao(sql, nome) {
  const marcador = `create or replace function public.${nome}(`;
  const inicio = sql.indexOf(marcador);
  if (inicio === -1) throw new Error(`Nao achei ${nome}.`);
  const abre = sql.indexOf('$function$', inicio);
  const fim = sql.indexOf('$function$;', abre + 1);
  if (abre === -1 || fim === -1) throw new Error(`Nao achei o corpo de ${nome}.`);
  return `${sql.slice(inicio, fim)}$function$;`;
}

const sqlNovo = readFileSync(join(migracoes, '20260904120000_link_do_google_vem_da_ligacao.sql'), 'utf8');
const FUNCAO = extrairFuncao(sqlNovo, 'get_public_qr_business');

// Se o recorte nao trouxer o recuo oficial, este guarda mede a funcao errada.
if (!/writereview/.test(FUNCAO)) {
  console.error('O recorte da funcao nao contem o recuo oficial; o guarda mediria outra coisa.');
  process.exit(1);
}

const BOOTSTRAP = `
create schema if not exists auth;
create table if not exists auth.users (id uuid primary key);
create table public.profiles (id uuid primary key, business_name text);
create table public.qr_codes (id uuid primary key default gen_random_uuid(), user_id uuid, name text, slug text, is_active boolean default true);
create table public.platform_links (user_id uuid, platform text, url text, created_at timestamptz default now());
create table public.google_business_locations (user_id uuid, place_id text, is_selected boolean default false);
`;

const ROTEIRO = `
create or replace function caso(p_manual text, p_place text) returns text language plpgsql as $fn$
declare u uuid := gen_random_uuid(); s text := replace(u::text, '-', '');
begin
  insert into auth.users values (u);
  insert into public.profiles values (u, 'Noá');
  insert into public.qr_codes (user_id, name, slug) values (u, 'Mesa 1', s);
  if p_manual <> '' then
    insert into public.platform_links values (u, 'Google Reviews', p_manual);
  end if;
  if p_place <> '' then
    insert into public.google_business_locations values (u, p_place, true);
  end if;
  return coalesce((select google_review_url from public.get_public_qr_business(s)), '(nulo)');
end;
$fn$;

-- DOIS NEGOCIOS NA MESMA CONTA DO GOOGLE, um so escolhido. E o caso que faltava
-- ao roteiro: com um unico local, tirar o filtro is_selected nao mudava nada e
-- a mutacao que o tirava ficava VERDE. Uma conta com varias fichas e comum, e
-- mandar o cliente para a ficha errada e pior do que nao o mandar.
create or replace function caso_dois_negocios() returns text language plpgsql as $fn$
declare u uuid := gen_random_uuid(); s text := replace(u::text, '-', '');
begin
  insert into auth.users values (u);
  insert into public.profiles values (u, 'Noá');
  insert into public.qr_codes (user_id, name, slug) values (u, 'Mesa 1', s);
  insert into public.google_business_locations values (u, 'ChIJoutraFicha', false);
  insert into public.google_business_locations values (u, 'ChIJaEscolhida', true);
  return coalesce((select google_review_url from public.get_public_qr_business(s)), '(nulo)');
end;
$fn$;
`;
const MEDIR = `select
  caso('https://g.page/r/ABC/review', '')            as so_manual,
  caso('', 'ChIJplace123')                           as so_oficial,
  caso('https://g.page/r/ABC/review', 'ChIJplace123') as os_dois,
  caso('', '')                                       as nenhum,
  caso_dois_negocios()                               as dois_negocios;`;

const dir = mkdtempSync(join(tmpdir(), 'binno-qr-')), dados = join(dir, 'pg');
let ligado = false;
const psql = (sql, extra = []) => execFileSync(PSQL,
  ['-h', dir, '-p', PORTA, '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', ...extra, '-c', sql], { encoding: 'utf8' });
try {
  execFileSync(INITDB, ['-D', dados, '-U', 'postgres', '--auth=trust', '-E', 'UTF8'], { stdio: 'ignore' });
  execFileSync(PG_CTL, ['-D', dados, '-o', `-p ${PORTA} -k ${dir} -h ''`, '-l', join(dir, 'log'), 'start'], { stdio: 'ignore' });
  ligado = true;
  psql(BOOTSTRAP); psql(FUNCAO); psql(ROTEIRO);
  const linha = psql(MEDIR, ['-A', '-t', '-F', '|']).trim().split('\n').pop();
  const campos = linha.split('|');
  if (campos.length !== 5 || /CREATE|INSERT/.test(campos[0])) {
    console.error(`A saida nao tem a forma esperada: ${JSON.stringify(linha).slice(0, 200)}`); process.exit(1);
  }
  const [soManual, soOficial, osDois, nenhum, doisNegocios] = campos;

  const falhas = [];
  const exigir = (r, c) => { if (!c) falhas.push(r); };

  // 1. QUEM COLOU CONTINUA A MANDAR. Esta e a assercao que impede a regressao:
  //    um QR ja impresso nao pode mudar de destino por baixo.
  exigir(`o link colado a mao deixou de mandar: devolveu '${soManual}'`,
    soManual === 'https://g.page/r/ABC/review');
  exigir(`com os dois, o oficial passou a frente do colado: devolveu '${osDois}'`,
    osDois === 'https://g.page/r/ABC/review');

  // 2. QUEM SO LIGOU A CONTA NAO PRECISA DE COLAR NADA. E o defeito.
  exigir(`quem so ligou a conta continua sem link: devolveu '${soOficial}'`,
    soOficial === 'https://search.google.com/local/writereview?placeid=ChIJplace123');

  // 3. E QUEM NAO TEM NADA continua sem nada, e nao com um endereco partido.
  exigir(`sem link e sem ligacao devia devolver nulo, devolveu '${nenhum}'`,
    nenhum === '(nulo)');

  // 4. COM VARIAS FICHAS, a escolhida. Mandar o cliente para a ficha errada e
  //    pior do que nao o mandar: ele avalia o negocio errado.
  exigir(`com dois negocios na conta, usou a ficha errada: devolveu '${doisNegocios}'`,
    doisNegocios === 'https://search.google.com/local/writereview?placeid=ChIJaEscolhida');

  if (falhas.length) {
    console.error('Google sem pedir o link: VERMELHO\n' + falhas.map((f) => `  - ${f}`).join('\n'));
    process.exit(1);
  }
  console.log('Google sem pedir o link: 5 asserções, 5 estados de dono corridos num Postgres real.');
} finally {
  if (ligado) { try { execFileSync(PG_CTL, ['-D', dados, '-m', 'immediate', 'stop'], { stdio: 'ignore' }); } catch { /* ja caiu */ } }
  rmSync(dir, { recursive: true, force: true });
}
