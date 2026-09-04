#!/usr/bin/env node
// As regras da fila de rascunhos, corridas num Postgres de verdade.
//
// POR QUE ESTE GUARDA EXISTE
//
// Ate 04/09/2026 NADA comecava o ciclo do WhatsApp. As avaliacoes chegavam, o
// rascunho sabia ser montado, a mensagem sabia ser enviada, o "1" sabia ser
// confirmado e a resposta sabia ser publicada — e nenhuma linha de codigo
// chamava `oferecer_rascunho`. As duas mensagens que existiram foram disparadas
// a mao, numa consulta.
//
// Agora ha um cron que oferece. E com ele vieram tres regras que se contradizem
// se alguem mexer numa sem olhar para as outras:
//
//   UMA DE CADA VEZ. Nao e economia: e o que torna o "1" possivel. Com dois
//   rascunhos a espera, "1" nao diz qual.
//
//   O TETO DIARIO CONTA SO O QUE CUSTA. A Meta nao cobra texto livre dentro da
//   janela de 24 horas; cobra o modelo, que e o unico que passa fora dela.
//   Travar as gratuitas calaria o produto sem poupar nada.
//
//   A MAIS ANTIGA PRIMEIRO. Uma avaliacao por responder envelhece mal.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, globSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const migracoes = resolve(process.cwd(), 'supabase/migrations');
const PORTA = '54407';
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
function extrairFuncao(sql, nome) {
  const marcador = `create or replace function public.${nome}(`;
  const inicio = sql.indexOf(marcador);
  if (inicio === -1) throw new Error(`Nao achei ${nome}.`);
  const abre = sql.indexOf('$function$', inicio);
  const fim = sql.indexOf('$function$;', abre + 1);
  return `${sql.slice(inicio, fim)}$function$;`;
}
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

const outbox = ler('20260821193000_whatsapp_delivery_outbox.sql');
const google = ler('20260814193000_google_business_profile_connection.sql');
const fundacao = ler('20260903200000_whatsapp_oficial_e_resposta_por_mensagem.sql');
const teto = ler('20260904160000_teto_diario_de_avisos_que_custam.sql');
const fila = ler('20260904161000_proxima_avaliacao_a_oferecer.sql');

const BOOTSTRAP = `
create schema if not exists auth;
create table if not exists auth.users (id uuid primary key);
create role service_role; create role anon; create role authenticated;
${extrairCreateTable(outbox, 'whatsapp_notification_preferences')}
${extrairCreateTable(outbox, 'whatsapp_outbox')}
${ler('20260829124156_corrigir_validacao_telefone_whatsapp.sql').replace(/^\s*--[^\n]*$/gm, ' ')}
${ler('20260829124220_corrigir_validacao_telefone_outbox.sql').replace(/^\s*--[^\n]*$/gm, ' ')}
${extrairCreateTable(google, 'google_business_locations')}
${extrairCreateTable(google, 'google_business_reviews')}
${extrairCreateTable(fundacao, 'respostas_a_confirmar')}
alter table public.whatsapp_outbox add column if not exists cobravel boolean;
alter table public.whatsapp_notification_preferences add column if not exists ultima_mensagem_recebida_em timestamptz;
alter table public.whatsapp_notification_preferences add column if not exists limite_diario_de_avisos integer not null default 5;
${extrairFuncao(fundacao, 'janela_de_texto_livre_aberta')}
${extrairFuncao(teto, 'avisos_cobraveis_hoje')}
${extrairFuncao(teto, 'cabe_mais_um_aviso')}
${extrairFuncao(fila, 'proxima_avaliacao_a_oferecer')}
`;

const ROTEIRO = `
create or replace function montar(p_janela boolean, p_cobraveis integer, p_teto integer, p_pendente boolean,
                                  p_gratuitas integer default 0)
returns text language plpgsql as $fn$
declare u uuid := gen_random_uuid(); l uuid := gen_random_uuid();
        velha uuid := gen_random_uuid(); nova uuid := gen_random_uuid(); i integer;
begin
  insert into auth.users values (u);
  insert into public.google_business_locations (id, user_id, account_name, location_name, title, is_selected)
    values (l, u, 'accounts/1', 'accounts/1/locations/2', 'Negocio', true);
  insert into public.whatsapp_notification_preferences (user_id, recipient_e164, consented_at, limite_diario_de_avisos, ultima_mensagem_recebida_em)
    values (u, '+5579991986091', now(), p_teto, case when p_janela then now() else null end);

  -- Duas avaliacoes por responder: uma de 2017 e uma de hoje.
  insert into public.google_business_reviews (id, user_id, location_id, google_review_name, reviewer_name, rating, review_updated_at)
    values (velha, u, l, 'r/velha', 'Antiga', 5, '2017-01-01'),
           (nova,  u, l, 'r/nova',  'Recente', 5, now());

  for i in 1..p_cobraveis loop
    insert into public.whatsapp_outbox (user_id, kind, provider, recipient_e164, body, idempotency_key, cobravel, status, updated_at)
      values (u, 'alert', 'meta-cloud', '+5579991986091', 'x', 'c' || i, true, 'accepted', now());
  end loop;

  -- AS GRATUITAS, que existem so para provar que NAO contam. Sem elas, mandar o
  -- teto contar tudo nao mudava resultado nenhum no roteiro, e a assercao do
  -- teto ficava vacua.
  for i in 1..p_gratuitas loop
    insert into public.whatsapp_outbox (user_id, kind, provider, recipient_e164, body, idempotency_key, cobravel, status, updated_at)
      values (u, 'alert', 'meta-cloud', '+5579991986091', 'x', 'g' || i, false, 'accepted', now());
  end loop;

  if p_pendente then
    insert into public.respostas_a_confirmar (user_id, review_id, rascunho) values (u, nova, 'ja a espera');
  end if;

  return coalesce((select reviewer_name from public.google_business_reviews
                    where id = public.proxima_avaliacao_a_oferecer(u)), '(nenhuma)');
end;
$fn$;
`;
const MEDIR = `select
  montar(false, 0, 5, false) as normal,
  montar(false, 5, 5, false) as teto_cheio,
  montar(true,  9, 5, false) as teto_cheio_mas_janela_aberta,
  montar(false, 0, 5, true)  as ja_ha_um_a_espera,
  montar(false, 4, 5, false) as um_abaixo_do_teto,
  montar(false, 3, 5, false, 5) as tres_cobraveis_e_cinco_gratuitas;`;

const dir = mkdtempSync(join(tmpdir(), 'binno-fila-')), dados = join(dir, 'pg');
let ligado = false;
const psql = (sql, extra = []) => execFileSync(PSQL,
  ['-h', dir, '-p', PORTA, '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', ...extra, '-c', sql], { encoding: 'utf8' });
try {
  execFileSync(INITDB, ['-D', dados, '-U', 'postgres', '--auth=trust', '-E', 'UTF8'], { stdio: 'ignore' });
  execFileSync(PG_CTL, ['-D', dados, '-o', `-p ${PORTA} -k ${dir} -h ''`, '-l', join(dir, 'log'), 'start'], { stdio: 'ignore' });
  ligado = true;
  psql(BOOTSTRAP); psql(ROTEIRO);
  const linha = psql(MEDIR, ['-A', '-t', '-F', '|']).trim().split('\n').pop();
  const campos = linha.split('|');
  if (campos.length !== 6 || /CREATE|INSERT/.test(campos[0])) {
    console.error(`A saida nao tem a forma esperada: ${JSON.stringify(linha).slice(0, 200)}`); process.exit(1);
  }
  const [normal, tetoCheio, tetoCheioJanela, jaHaUm, umAbaixo, comGratuitas] = campos;

  const falhas = [];
  const exigir = (r, c) => { if (!c) falhas.push(r); };

  // 1. A MAIS ANTIGA PRIMEIRO.
  exigir(`devia oferecer a avaliacao mais antiga, ofereceu '${normal}'`, normal === 'Antiga');
  exigir(`com espaco no teto devia oferecer, ofereceu '${umAbaixo}'`, umAbaixo === 'Antiga');

  // 2. UMA DE CADA VEZ. Com um rascunho a espera, nao se oferece outro — e o
  //    que torna o "1" possivel.
  exigir(`ja havia um rascunho a espera e ofereceu outro: '${jaHaUm}'`, jaHaUm === '(nenhuma)');

  // 3. O TETO TRAVA O QUE CUSTA.
  exigir(`o teto estava cheio e ofereceu na mesma: '${tetoCheio}'`, tetoCheio === '(nenhuma)');

  // 4. E NAO TRAVA O QUE E GRATUITO. Esta e a assercao que impede o teto de ser
  //    um teto que so faz mal: com a janela aberta a mensagem nao custa, e
  //    travar seria travar de graca.
  exigir(`com a janela ABERTA o teto travou uma mensagem gratuita: '${tetoCheioJanela}'`,
    tetoCheioJanela === 'Antiga');

  // 5. AS GRATUITAS NAO CONTAM PARA O TETO. Tres cobraveis e cinco gratuitas,
  //    com tecto de cinco: se as gratuitas contassem, seriam oito e ficava
  //    travado. Contar o que nao custa e travar o produto sem poupar nada.
  exigir(`as mensagens gratuitas estao a contar para o teto: '${comGratuitas}'`,
    comGratuitas === 'Antiga');

  if (falhas.length) {
    console.error('Fila de rascunhos: VERMELHO\n' + falhas.map((f) => `  - ${f}`).join('\n'));
    process.exit(1);
  }
  console.log('Fila de rascunhos: 6 asserções, 6 estados corridos num Postgres real.');
} finally {
  if (ligado) { try { execFileSync(PG_CTL, ['-D', dados, '-m', 'immediate', 'stop'], { stdio: 'ignore' }); } catch { /* ja caiu */ } }
  rmSync(dir, { recursive: true, force: true });
}
