#!/usr/bin/env node
// O primeiro aviso de cada cliente novo, corrido de verdade.
//
// POR QUE ESTE GUARDA EXISTE
//
// O enviador escolhe a forma da mensagem assim:
//
//     janelaAberta || !modelo  ->  texto livre
//     senao                    ->  modelo aprovado
//
// A janela de 24 horas so abre quando o DONO escreve. Portanto a primeira
// mensagem que qualquer cliente recebe esta, por definicao, fora da janela. Sem
// `template_name` na linha, o enviador manda texto livre e a Meta RECUSA.
//
// O produto funcionaria so para quem ja tinha falado connosco nas ultimas 24
// horas — que e exactamente quem nao precisava de ser avisado. Uma falha que
// nao aparece em teste nenhum de leitura, porque o SQL esta todo certo: o que
// falta e um campo.
//
// E POR QUE ELE CORRE A FUNCAO EM VEZ DE A LER
//
// A regra da Meta que se quebra aqui e sobre o VALOR: um valor de variavel com
// quebra de linha faz a Meta recusar o envio inteiro. Isso nao se ve lendo o
// `regexp_replace`; ve-se dando-lhe um rascunho com quebras de linha e olhando
// para o que saiu.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, globSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const migracoes = resolve(process.cwd(), 'supabase/migrations');
const PORTA = '54403';

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

// As DDL vem dos ficheiros reais, contando parenteses, para nao envelhecerem
// sozinhas ao lado das migracoes que as criaram.
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
function extrairFuncao(sql, nome) {
  const marcador = `create or replace function public.${nome}(`;
  const inicio = sql.indexOf(marcador);
  if (inicio === -1) throw new Error(`Nao achei a definicao de ${nome}.`);
  const fim = sql.indexOf('$function$;', sql.indexOf('as $function$', inicio) + 1);
  if (fim === -1) throw new Error(`Nao achei o fim de ${nome}.`);
  return `${sql.slice(inicio, fim)}$function$;`;
}

const sqlOutbox = readFileSync(join(migracoes, '20260821193000_whatsapp_delivery_outbox.sql'), 'utf8');
// As DUAS correccoes do check do telefone: a DDL de 21/08 escreveu `'^\\\\+...'`
// nas duas tabelas, o que exige uma barra invertida literal antes do `+` e
// recusa qualquer numero real. Sao dois ficheiros porque sao duas tabelas.
const sqlTelefone = readFileSync(join(migracoes, '20260829124156_corrigir_validacao_telefone_whatsapp.sql'), 'utf8');
const sqlTelefoneFila = readFileSync(join(migracoes, '20260829124220_corrigir_validacao_telefone_outbox.sql'), 'utf8');
const sqlPonte = readFileSync(join(migracoes, '20260831030000_telegram_como_ponte.sql'), 'utf8');
const sqlGoogle = readFileSync(join(migracoes, '20260814193000_google_business_profile_connection.sql'), 'utf8');
const sqlFundacao = readFileSync(join(migracoes, '20260903200000_whatsapp_oficial_e_resposta_por_mensagem.sql'), 'utf8');
const sqlCanal = readFileSync(join(migracoes, '20260903220000_canal_prefere_whatsapp_oficial.sql'), 'utf8');
const sqlModelo = readFileSync(join(migracoes, '20260903230000_rascunho_leva_modelo.sql'), 'utf8');

const BOOTSTRAP = `
create schema if not exists auth;
create table if not exists auth.users (id uuid primary key);
create role service_role; create role anon; create role authenticated;
${extrairCreateTable(sqlOutbox, 'whatsapp_notification_preferences')}
${extrairCreateTable(sqlOutbox, 'whatsapp_outbox')}
${extrairCreateTable(sqlGoogle, 'google_business_locations')}
${extrairCreateTable(sqlGoogle, 'google_business_reviews')}
${extrairCreateTable(sqlFundacao, 'respostas_a_confirmar')}
alter table public.whatsapp_notification_preferences add column if not exists telegram_chat_id text;
alter table public.whatsapp_notification_preferences add column if not exists whatsapp_oficial_ligado boolean not null default false;
alter table public.whatsapp_outbox add column if not exists template_name text;
alter table public.whatsapp_outbox add column if not exists template_variables jsonb;
alter table public.whatsapp_outbox drop constraint if exists whatsapp_outbox_provider_check;
`;

// Um rascunho com QUEBRAS DE LINHA e espacos a mais, que e o que um modelo de
// linguagem devolve de verdade. E o caso que a Meta recusa.
const RASCUNHO = 'Obrigado pela avaliacao!\n\nFicamos    felizes\tque tenha gostado.';

const ROTEIRO = `
create or replace function teste() returns table(
  modelo text, vars jsonb, corpo text, guardado text
) language plpgsql as $fn$
declare u uuid := gen_random_uuid(); r uuid := gen_random_uuid(); l uuid := gen_random_uuid(); v uuid;
begin
  insert into auth.users (id) values (u);
  insert into public.google_business_locations (id, user_id, account_name, location_name, title, is_selected)
    values (l, u, 'accounts/1', 'accounts/1/locations/2', 'Noa Agencia Digital', true);
  insert into public.whatsapp_notification_preferences (user_id, recipient_e164, consented_at)
    values (u, '+5579991986091', now());
  insert into public.google_business_reviews (id, user_id, location_id, google_review_name, reviewer_name, rating)
    values (r, u, l, 'accounts/1/locations/2/reviews/3', 'Ana *Maria*', 5);
  v := public.oferecer_rascunho(u, r, ${JSON.stringify(RASCUNHO).replace(/"/g, "'").replace(/\\n/g, "' || chr(10) || '").replace(/\\t/g, "' || chr(9) || '")});
  return query
    select o.template_name, o.template_variables, o.body, c.rascunho
      from public.whatsapp_outbox o
      join public.respostas_a_confirmar c on c.id = v
     where o.idempotency_key = 'rascunho:' || v::text;
end;
$fn$;
`;

const MEDIR = 'select modelo, vars::text, corpo, guardado from teste();';

const dir = mkdtempSync(join(tmpdir(), 'binno-modelo-'));
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
  psql(sqlTelefone.replace(/^\s*--[^\n]*$/gm, ' '));
  psql(sqlTelefoneFila.replace(/^\s*--[^\n]*$/gm, ' '));
  psql(extrairFuncao(sqlPonte, 'canal_do_aviso'));
  psql(extrairFuncao(sqlCanal, 'canal_do_aviso'));
  psql(extrairFuncao(sqlModelo, 'oferecer_rascunho'));

  // A CRIACAO VAI SEPARADA DA MEDICAO, e a historia disto vale a linha.
  //
  // Enquanto as duas corriam juntas, o `psql` imprimia o `CREATE FUNCTION` na
  // mesma saida, e ele acabava DENTRO do primeiro campo. A assercao mais
  // importante deste guarda — "a linha leva template_name" — media o eco do
  // comando em vez do dado, e ficava VERDE mesmo com o modelo a nulo, que e
  // exactamente o defeito que ela existe para apanhar. Descoberto ao provar as
  // mutacoes: quatro ficaram vermelhas e essa nao.
  psql(ROTEIRO);
  const linha = psql(MEDIR, ['-A', '-t', '-R', '~~', '-F', '|']).split('~~')[0];
  const campos = linha.split('|');

  // A propria leitura tem de ser conferida. Se a saida deixar de ter quatro
  // campos, tudo o que vem abaixo passa a medir outra coisa — e foi assim que
  // este guarda ja mentiu uma vez.
  if (campos.length !== 4 || /CREATE|ALTER|INSERT/.test(campos[0])) {
    console.error(`A saida do Postgres nao tem a forma esperada (${campos.length} campos): ${JSON.stringify(linha).slice(0, 200)}`);
    process.exit(1);
  }
  const [modelo, vars, corpo, guardado] = campos;

  const falhas = [];
  const exigir = (rotulo, condicao) => { if (!condicao) falhas.push(rotulo); };

  // 1. O MODELO VAI NA LINHA. Sem isto, a primeira mensagem de cada cliente e
  //    recusada pela Meta, porque fora da janela nao passa texto livre.
  exigir(`a linha da fila saiu sem template_name (saiu '${modelo}') — fora da janela de 24h a Meta recusa`,
    !!modelo && modelo.trim().length > 0);

  // 2. AS VARIAVEIS EXISTEM E SAO TRES: nota, autor, rascunho.
  let lista = null;
  try { lista = JSON.parse(vars); } catch { /* fica nulo */ }
  exigir(`template_variables nao e uma lista JSON (veio '${vars}')`, Array.isArray(lista));
  exigir(`esperava 3 variaveis (nota, autor, rascunho), vieram ${Array.isArray(lista) ? lista.length : '?'}`,
    Array.isArray(lista) && lista.length === 3);

  // 3. NENHUMA VARIAVEL LEVA QUEBRA DE LINHA, TABULACAO OU 5+ ESPACOS. E a
  //    regra da Meta que recusa o envio inteiro. O rascunho de entrada TEM
  //    quebras de linha de proposito: se elas sobreviverem, o envio morre.
  for (const [i, valor] of (Array.isArray(lista) ? lista : []).entries()) {
    exigir(`a variavel ${i + 1} leva quebra de linha ou tabulacao — a Meta recusa o envio inteiro`,
      !/[\n\r\t]/.test(String(valor)));
    exigir(`a variavel ${i + 1} leva 5 ou mais espacos seguidos — a Meta recusa o envio inteiro`,
      !/ {5,}/.test(String(valor)));
  }

  // 4. O ASTERISCO SAI das variaveis. O nome veio com asteriscos de proposito.
  exigir('o asterisco do nome do autor nao foi retirado da variavel',
    Array.isArray(lista) && !String(lista[1]).includes('*'));

  // 5. O TEXTO QUE VAI PARA O GOOGLE FICA INTACTO. So a copia da mensagem e
  //    limpa; o que se publica no perfil publico e o que o modelo escreveu.
  // O QUE VAI PARA O GOOGLE FICA INTACTO. So a copia que viaja na mensagem e
  // limpa. Comparar por texto exacto seria fragil aqui — o `psql` devolve o
  // campo em varias linhas —, entao mede-se a propriedade que importa: as
  // quebras de linha e a tabulacao do original SOBREVIVERAM na tabela.
  exigir(`o rascunho guardado perdeu as quebras de linha; o que vai para o perfil publico tem de ficar como o modelo escreveu (veio: ${JSON.stringify(guardado).slice(0, 90)})`,
    /\n/.test(guardado) && /\t/.test(guardado));

  // 6. O TEXTO LIVRE CONTINUA A EXISTIR, para dentro da janela.
  exigir('a linha ficou sem corpo de texto livre — dentro da janela nao haveria o que enviar',
    !!corpo && corpo.includes('Responda'));

  if (falhas.length) {
    console.error('check-rascunho-leva-modelo: VERMELHO\n' + falhas.map((f) => `  - ${f}`).join('\n'));
    process.exit(1);
  }
  console.log(`check-rascunho-leva-modelo: ${6 + (Array.isArray(lista) ? lista.length * 2 : 0)} asserções, primeira mensagem de cliente novo corrida num Postgres real.`);
} finally {
  if (ligado) { try { execFileSync(PG_CTL, ['-D', dados, '-m', 'immediate', 'stop'], { stdio: 'ignore' }); } catch { /* ja caiu */ } }
  rmSync(dir, { recursive: true, force: true });
}
