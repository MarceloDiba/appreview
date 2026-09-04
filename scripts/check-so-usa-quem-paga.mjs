#!/usr/bin/env node
// So usa quem paga: a regra corre num Postgres de verdade.
//
// POR QUE ESTE GUARDA EXISTE
//
// Em 04/09/2026 criei uma conta pelo caminho real do produto, sem pagar nada, e
// bati em todas as portas. `fetch-google-reviews` CORREU e devolveu os dados da
// Noa Agencia Digital, gastando a chave paga do Google Places. Toda porta do
// Binno perguntava "esta logado?", e nenhuma perguntava "pagou?".
//
// O RISCO DESTE CONSERTO E TRANCAR POR FORA. Um erro em `tem_acesso` que
// devolva `false` por engano deixa um cliente PAGANTE sem produto e sem
// entender porque — pior do que o problema que se esta a resolver. Por isso
// este guarda mede a PASSAGEM com o mesmo cuidado com que mede a recusa.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, globSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const migracoes = resolve(process.cwd(), 'supabase/migrations');
const PORTA = '54415';
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

// A MIGRACAO ENTRA INTEIRA, tal como esta. Extrair so a funcao deixaria as
// asserções verdes com a tabela das concessoes por criar — e a concessao e
// metade da regra.
const MIGRACAO = ler('20260904220000_so_usa_quem_paga.sql')
  .split('\n').filter((l) => !/^\s*--/.test(l)).join('\n');

const esquema = ler('20260711_relink_appreview_schema.sql');

const BOOTSTRAP = `
create schema if not exists auth;
create table if not exists auth.users (id uuid primary key, email text);
create role service_role; create role anon; create role authenticated;
${extrairCreateTable(esquema, 'subscriptions')}
${MIGRACAO}
`;

const ROTEIRO = `
create or replace function cenario(p_caso text) returns text language plpgsql as $fn$
declare u uuid := gen_random_uuid();
begin
  insert into auth.users (id) values (u);
  if p_caso = 'assinatura-viva' then
    insert into public.subscriptions (user_id, status, current_period_end)
      values (u, 'active', now() + interval '20 days');
  elsif p_caso = 'cartao-falhou' then
    insert into public.subscriptions (user_id, status, current_period_end)
      values (u, 'past_due', now() + interval '20 days');
  elsif p_caso = 'cancelou-mas-pagou' then
    insert into public.subscriptions (user_id, status, current_period_end, cancel_at)
      values (u, 'active', now() + interval '20 days', now() + interval '20 days');
  elsif p_caso = 'periodo-terminou' then
    insert into public.subscriptions (user_id, status, current_period_end)
      values (u, 'canceled', now() - interval '1 day');
  elsif p_caso = 'concessao-sem-prazo' then
    insert into public.acessos_concedidos (user_id, motivo) values (u, 'casa');
  elsif p_caso = 'concessao-expirada' then
    insert into public.acessos_concedidos (user_id, motivo, expira_em)
      values (u, 'temporaria', now() - interval '1 day');
  end if;
  return case when public.tem_acesso(u) then 'passa' else 'recusa' end;
end;
$fn$;
`;

const MEDIR = `select
  cenario('sem-nada') as sem_nada,
  cenario('assinatura-viva') as assinatura_viva,
  cenario('cartao-falhou') as cartao_falhou,
  cenario('cancelou-mas-pagou') as cancelou_mas_pagou,
  cenario('periodo-terminou') as periodo_terminou,
  cenario('concessao-sem-prazo') as concessao_sem_prazo,
  cenario('concessao-expirada') as concessao_expirada;`;

const dir = mkdtempSync(join(tmpdir(), 'binno-paga-')), dados = join(dir, 'pg');
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
  if (campos.length !== 7 || /CREATE|INSERT|ALTER/.test(campos[0])) {
    console.error(`A saida nao tem a forma esperada: ${JSON.stringify(linha).slice(0, 300)}`); process.exit(1);
  }
  const [semNada, assinaturaViva, cartaoFalhou, cancelouMasPagou,
         periodoTerminou, concessaoSemPrazo, concessaoExpirada] = campos;

  const falhas = [];
  const exigir = (r, c) => { if (!c) falhas.push(r); };

  // RECUSAR — o defeito que se esta a fechar.
  exigir(`uma conta sem nada continua a passar: '${semNada}'`, semNada === 'recusa');
  exigir(`uma assinatura terminada continua a passar: '${periodoTerminou}'`, periodoTerminou === 'recusa');
  exigir(`uma concessao expirada continua a passar: '${concessaoExpirada}'`, concessaoExpirada === 'recusa');

  // DEIXAR PASSAR — o defeito OPOSTO, que seria pior. Sem estas tres, uma
  // funcao que devolvesse `false` sempre passaria nas de cima e trancaria
  // todos os clientes pagantes.
  exigir(`quem paga ficou trancado por fora: '${assinaturaViva}'`, assinaturaViva === 'passa');
  exigir(`um cartao que falhou cortou o acesso na hora: '${cartaoFalhou}'`, cartaoFalhou === 'passa');
  exigir(`quem cancelou perdeu o mes que ja pagou: '${cancelouMasPagou}'`, cancelouMasPagou === 'passa');
  exigir(`uma concessao sem prazo nao vale: '${concessaoSemPrazo}'`, concessaoSemPrazo === 'passa');

  // E A CONTA DA CASA TEM DE NASCER CONCEDIDA. A migracao concede-a por email;
  // sem esta assercao, um erro nesse `insert` so apareceria quando o Marcelo
  // perdesse o acesso ao proprio produto.
  psql(`insert into auth.users (id, email) values (gen_random_uuid(), 'diba@noadigital.com.br');`);
  psql(MIGRACAO);
  const casa = psql(
    `select case when public.tem_acesso((select id from auth.users where email = 'diba@noadigital.com.br')) then 'passa' else 'recusa' end;`,
    ['-A', '-t']).trim();
  exigir(`a conta da casa nao ficou concedida: '${casa}'`, casa === 'passa');

  // ------------------------------------------------------------------
  // AS SETE PORTAS PERGUNTAM. A parte de cima mede a REGRA; esta mede quem a
  // usa. Uma regra perfeita que nenhuma porta invoca deixa o produto aberto,
  // e foi exactamente assim que ele esteve ate hoje.
  // ------------------------------------------------------------------
  const AS_SETE = [
    'fetch-google-reviews',
    'sugerir-resposta',
    'temas-das-avaliacoes',
    'sync-experimental-apify',
    'whatsapp-notifications',
    'sync-google-business-profile',
    'start-google-business-oauth',
  ];
  for (const porta of AS_SETE) {
    const fonte = readFileSync(`supabase/functions/${porta}/index.ts`, 'utf8');
    exigir(`'${porta}' nao pergunta se o dono paga`,
      /import \{ temAcesso \} from '\.\.\/_shared\/acesso\.ts'/.test(fonte)
      && /await temAcesso\(/.test(fonte));
    exigir(`'${porta}' nao recusa com 402 quem nao paga`,
      /'SEM_ASSINATURA'[\s\S]{0,160}402/.test(fonte));
  }

  // E `billing-checkout` NUNCA pergunta. Exigir pagamento para poder pagar
  // tranca a porta pelo lado de dentro, e nenhuma assercao acima apanharia
  // isso — todas mediriam o zelo excessivo como se fosse rigor.
  const cobranca = readFileSync('supabase/functions/billing-checkout/index.ts', 'utf8');
  exigir('billing-checkout passou a exigir assinatura; ninguem consegue assinar',
    !/temAcesso/.test(cobranca));

  // O AJUDANTE FALHA ABERTO. Se a pergunta nao chega ao banco, deixa passar:
  // o pior caso deste lado e uma chamada paga a mais; do outro lado e um
  // cliente que PAGOU ficar sem produto por um solucco.
  const ajudante = readFileSync('supabase/functions/_shared/acesso.ts', 'utf8');
  exigir('o ajudante passou a falhar fechado; um solucco de rede tranca quem paga',
    /if \(error\)[\s\S]{0,600}return true;/.test(ajudante));

  if (falhas.length) {
    console.error('So usa quem paga: VERMELHO\n' + falhas.map((f) => `  - ${f}`).join('\n'));
    process.exit(1);
  }
  console.log(`So usa quem paga: ${8 + AS_SETE.length * 2 + 2} asserções, 7 cenarios num Postgres real e 8 portas lidas.`);
} finally {
  if (ligado) { try { execFileSync(PG_CTL, ['-D', dados, '-m', 'immediate', 'stop'], { stdio: 'ignore' }); } catch { /* ja caiu */ } }
  rmSync(dir, { recursive: true, force: true });
}
