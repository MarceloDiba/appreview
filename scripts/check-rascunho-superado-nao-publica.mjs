#!/usr/bin/env node
// Um rascunho a espera de "1" morre quando a avaliacao ganha resposta.
//
// POR QUE ESTE GUARDA EXISTE
//
// O rascunho ia para o WhatsApp e ficava a espera. Se o dono publicasse a
// resposta pelo painel entretanto, a linha em `respostas_a_confirmar` ficava
// aberta, e duas coisas aconteciam, nenhuma visivel:
//
//   1. A mensagem antiga no celular continuava valida. Um "1" tardio confirmava
//      o rascunho VELHO, publicado por cima da correcao que o dono tinha feito
//      no painel. O trabalho de corrigir desfeito por um toque inofensivo.
//
//   2. A fila parava. "Uma de cada vez" lia "ja ha um a espera" e nao oferecia
//      mais nada durante 24 horas. O produto ficava mudo, sem aviso.
//
// Corrido num Postgres de verdade, com o gatilho, a tabela e a funcao da fila
// carregados das migracoes — nao ha aqui nenhuma copia da regra a medir-se a
// si mesma.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, globSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const migracoes = resolve(process.cwd(), 'supabase/migrations');
const PORTA = '54409';
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
const superado = ler('20260904190000_rascunho_superado_nao_volta_a_publicar.sql');

// O GATILHO E O SUJEITO DA MEDICAO, e por isso entra INTEIRO, tal como esta na
// migracao — o `create trigger` incluido. Extrair so a funcao deixaria as
// asserções verdes com a tabela sem gatilho nenhum, que e exactamente o estado
// que este guarda existe para apanhar.
const MIGRACAO_INTEIRA = superado
  .split('\n')
  .filter((linha) => !/^\s*--/.test(linha))
  .join('\n');

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
${extrairFuncao(fundacao, 'confirmar_resposta_do_dono')}
${extrairFuncao(teto, 'avisos_cobraveis_hoje')}
${extrairFuncao(teto, 'cabe_mais_um_aviso')}
${extrairFuncao(fila, 'proxima_avaliacao_a_oferecer')}
${MIGRACAO_INTEIRA}
`;

// Um dono, uma avaliacao por responder, um rascunho ja no celular a espera de
// "1". `p_acontece` e o que o dono faz a seguir.
const ROTEIRO = `
create or replace function cenario(p_acontece text)
returns text language plpgsql as $fn$
declare u uuid := gen_random_uuid(); l uuid := gen_random_uuid();
        a uuid := gen_random_uuid(); outra uuid := gen_random_uuid();
        confirmado uuid; fila text;
begin
  insert into auth.users values (u);
  insert into public.google_business_locations (id, user_id, account_name, location_name, title, is_selected)
    values (l, u, 'accounts/1', 'accounts/1/locations/2', 'Negocio', true);
  insert into public.whatsapp_notification_preferences (user_id, recipient_e164, consented_at, ultima_mensagem_recebida_em)
    values (u, '+5579991986091', now(), now());
  insert into public.google_business_reviews (id, user_id, location_id, google_review_name, reviewer_name, rating, review_updated_at)
    values (a, u, l, 'r/a', 'Breno', 5, '2020-01-01'),
           (outra, u, l, 'r/b', 'Seguinte', 5, '2021-01-01');
  insert into public.respostas_a_confirmar (user_id, review_id, rascunho)
    values (u, a, 'texto ANTIGO, por corrigir');

  if p_acontece = 'publicou-no-painel' then
    update public.google_business_reviews
       set reply_text = 'texto CORRIGIDO pelo dono' where id = a;
  elsif p_acontece = 'mexeu-noutra-coluna' then
    update public.google_business_reviews set rating = 4 where id = a;
  elsif p_acontece = 'sincronizou' then
    -- A SINCRONIZACAO REESCREVE reply_text EM TODA AVALIACAO, respondida ou
    -- nao (sync-google-business-profile, linha 390: reply_text ... : null).
    -- O gatilho e 'after update of reply_text', entao ISTO DISPARA-O — para
    -- cada avaliacao, em cada sincronizacao. E o unico cenario em que a
    -- proteccao interna do gatilho decide alguma coisa: sem ela, todo rascunho
    -- a espera morria a cada sincronizacao e o produto ficava mudo para sempre.
    update public.google_business_reviews set reply_text = null where id = a;
  elsif p_acontece = 'nada' then
    null;
  end if;

  -- A FILA E MEDIDA ANTES DO "1", e nao depois. O dano silencioso acontece
  -- exactamente na janela entre o dono publicar pelo painel e o "1" que nunca
  -- chega: e nessa janela que o produto fica mudo. Medir depois do "1" leria
  -- sempre uma fila destravada — pelo proprio "1" — e a assercao seria vacua.
  fila := coalesce((select reviewer_name from public.google_business_reviews
                     where id = public.proxima_avaliacao_a_oferecer(u)), '(nenhuma)');

  -- Só entao o dono ve a mensagem antiga na conversa e responde "1".
  confirmado := public.confirmar_resposta_do_dono(u);

  return case when confirmado is null then 'nada-a-publicar'
              else 'vai-publicar:' || (select left(rascunho, 5) from public.respostas_a_confirmar where id = confirmado)
         end
      || ' | fila-oferece:' || fila;
end;
$fn$;
`;

// O caminho do proprio WhatsApp: o dono responde "1", e SO DEPOIS a resposta e
// escrita na avaliacao. O publicador marca `publicado_em` antes de chamar o
// Google (`publicar-respostas-confirmadas`, linhas 63-66) e escreve
// `reply_text` no fim (linha 123) — ou seja, quando o gatilho dispara, esta
// linha ja esta confirmada e publicada. Fecha-la como "recusada" poria o
// registo a mentir sobre uma resposta que foi publicada com sucesso.
const ROTEIRO_CONFIRMADO = `
create or replace function cenario_confirmado()
returns text language plpgsql as $fn$
declare u uuid := gen_random_uuid(); l uuid := gen_random_uuid(); a uuid := gen_random_uuid();
        id_confirmado uuid;
begin
  insert into auth.users values (u);
  insert into public.google_business_locations (id, user_id, account_name, location_name, title, is_selected)
    values (l, u, 'accounts/1', 'accounts/1/locations/2', 'Negocio', true);
  insert into public.whatsapp_notification_preferences (user_id, recipient_e164, consented_at, ultima_mensagem_recebida_em)
    values (u, '+5579991986091', now(), now());
  insert into public.google_business_reviews (id, user_id, location_id, google_review_name, reviewer_name, rating, review_updated_at)
    values (a, u, l, 'r/a', 'Breno', 5, '2020-01-01');
  insert into public.respostas_a_confirmar (user_id, review_id, rascunho) values (u, a, 'o texto');

  id_confirmado := public.confirmar_resposta_do_dono(u);
  update public.respostas_a_confirmar set publicado_em = now() where id = id_confirmado;
  update public.google_business_reviews set reply_text = 'o texto' where id = a;

  return (select case when recusado_em is null then 'registo-honesto' else 'marcada-como-recusada' end
            from public.respostas_a_confirmar where id = id_confirmado);
end;
$fn$;
`;

const MEDIR = `select
  cenario('nada') as sem_nada,
  cenario('publicou-no-painel') as publicou_no_painel,
  cenario('mexeu-noutra-coluna') as mexeu_noutra_coluna,
  cenario('sincronizou') as sincronizou,
  cenario_confirmado() as pelo_proprio_whatsapp;`;

const dir = mkdtempSync(join(tmpdir(), 'binno-superado-')), dados = join(dir, 'pg');
let ligado = false;
const psql = (sql, extra = []) => execFileSync(PSQL,
  ['-h', dir, '-p', PORTA, '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', ...extra, '-c', sql], { encoding: 'utf8' });
try {
  execFileSync(INITDB, ['-D', dados, '-U', 'postgres', '--auth=trust', '-E', 'UTF8'], { stdio: 'ignore' });
  execFileSync(PG_CTL, ['-D', dados, '-o', `-p ${PORTA} -k ${dir} -h ''`, '-l', join(dir, 'log'), 'start'], { stdio: 'ignore' });
  ligado = true;
  psql(BOOTSTRAP); psql(ROTEIRO); psql(ROTEIRO_CONFIRMADO);
  // O separador de campos NAO pode ser '|': os proprios valores levam um, e
  // com ele a linha partia-se em seis pedacos em vez de tres — e a verificacao
  // de forma abaixo rejeitava uma medicao correcta.
  const linha = psql(MEDIR, ['-A', '-t', '-F', '~']).trim().split('\n').pop();
  const campos = linha.split('~');
  if (campos.length !== 5 || /CREATE|INSERT|ALTER/.test(campos[0])) {
    console.error(`A saida nao tem a forma esperada: ${JSON.stringify(linha).slice(0, 300)}`); process.exit(1);
  }
  const [semNada, publicouNoPainel, mexeuNoutraColuna, sincronizou, peloProprioWhatsapp] = campos;

  const falhas = [];
  const exigir = (r, c) => { if (!c) falhas.push(r); };

  // 1. O CENARIO DE CONTROLO. Sem nada acontecer, o "1" publica e a fila
  //    continua travada por "uma de cada vez". Sem esta linha, as asserções
  //    abaixo ficariam verdes num mundo onde nada nunca publica.
  exigir(`sem nada acontecer, o "1" devia publicar o rascunho e travar a fila; deu '${semNada}'`,
    semNada === 'vai-publicar:texto | fila-oferece:(nenhuma)');

  // 2. O DEFEITO. Publicada a resposta pelo painel, o "1" tardio nao pode
  //    publicar por cima da correcao...
  exigir(`o "1" tardio publicou por cima da correcao do painel: '${publicouNoPainel}'`,
    publicouNoPainel.startsWith('nada-a-publicar'));

  // ...E A FILA TEM DE ANDAR. Esta e a metade silenciosa: com a linha presa
  // aberta, o produto ficava mudo 24 horas e ninguem era avisado.
  exigir(`a fila continuou travada depois de a avaliacao ser respondida: '${publicouNoPainel}'`,
    publicouNoPainel.endsWith('fila-oferece:Seguinte'));

  // 3. E NAO FECHA POR QUALQUER MEXIDA. Um update noutra coluna nao pode matar
  //    um rascunho valido. Esta sozinha nao chega — so fica vermelha se o
  //    `of reply_text` do gatilho E a proteccao interna cairem os dois. Quem
  //    apanha cada um deles em separado e a assercao 4.
  exigir(`uma mexida noutra coluna matou um rascunho valido: '${mexeuNoutraColuna}'`,
    mexeuNoutraColuna === 'vai-publicar:texto | fila-oferece:(nenhuma)');

  // 4. A SINCRONIZACAO NAO PODE CALAR O PRODUTO. Ela reescreve `reply_text` em
  //    toda avaliacao, respondida ou nao, e por isso dispara o gatilho para
  //    todas elas. Sem a proteccao interna, cada sincronizacao matava todo
  //    rascunho a espera e a fila nunca mais oferecia nada — mudo, sem aviso,
  //    e com todas as outras asserções deste ficheiro verdes.
  exigir(`a sincronizacao matou um rascunho valido: '${sincronizou}'`,
    sincronizou === 'vai-publicar:texto | fila-oferece:(nenhuma)');

  // 5. O CAMINHO DO PROPRIO WHATSAPP NAO SE MORDE. Quando o "1" publica, o
  //    gatilho dispara sobre a linha que acabou de ser confirmada. Fecha-la
  //    como "recusada" poria o registo a mentir sobre uma resposta publicada
  //    com sucesso.
  exigir(`o proprio caminho do WhatsApp marcou a sua resposta como recusada: '${peloProprioWhatsapp}'`,
    peloProprioWhatsapp === 'registo-honesto');

  if (falhas.length) {
    console.error('Rascunho superado: VERMELHO\n' + falhas.map((f) => `  - ${f}`).join('\n'));
    process.exit(1);
  }
  console.log('Rascunho superado: 6 asserções, 5 cenarios corridos num Postgres real.');
} finally {
  if (ligado) { try { execFileSync(PG_CTL, ['-D', dados, '-m', 'immediate', 'stop'], { stdio: 'ignore' }); } catch { /* ja caiu */ } }
  rmSync(dir, { recursive: true, force: true });
}
