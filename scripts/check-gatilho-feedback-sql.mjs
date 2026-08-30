import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { globSync } from 'node:fs';

// O gatilho de aviso no WhatsApp, testado rodando de verdade.
//
// POR QUE ESTE GUARDA EXISTE
//
// O gatilho `notify_internal_feedback_whatsapp` decide, dentro do Postgres,
// quem recebe aviso e com que texto. Conferir isso lendo o SQL com expressao
// regular verifica que certas palavras estao no arquivo, nao que o gatilho se
// comporta como se diz. Este guarda sobe um Postgres descartavel, aplica as
// migracoes de verdade e insere comentarios reais para ver o que cai na fila.
//
// COMO ELE PROVA QUE A NOTA 1 A 3 NAO MUDOU
//
// Por comparacao, e nao por confianca. Ele monta dois bancos:
//
//   `antes`  = migracoes ate `20260830180000`, ou seja o gatilho como estava.
//   `depois` = as mesmas mais as duas novas.
//
// Roda o mesmo roteiro de casos nos dois e exige que as linhas de fila com
// `kind = 'feedback'` (as de reclamacao) saiam byte a byte iguais nos dois
// bancos, texto do colapso incluido. Se qualquer palavra ou regra do caminho da
// reclamacao mudar, os dois lados divergem e este guarda fica vermelho.
//
// O QUE ELE PRECISA PARA RODAR
//
// Um Postgres local: `initdb`, `pg_ctl` e `psql`. O Mac tem via Homebrew
// (`brew install postgresql@17`) e a imagem `ubuntu-latest` do GitHub ja traz o
// PostgreSQL instalado, com os binarios em `/usr/lib/postgresql/*/bin`, que
// `acharBinario` procura. Nada e criado fora de um diretorio temporario, e o
// cluster e destruido no fim.
//
// Ele nunca pula em silencio. Um guarda que passa quando nao consegue verificar
// e pior que guarda nenhum, porque parece verde. Sem Postgres ele falha e diz
// exatamente o que instalar.

const raiz = process.cwd();
const migracoes = resolve(raiz, 'supabase/migrations');
const PORTA = '54399';

// ---------------------------------------------------------------- binarios

function acharBinario(nome) {
  const candidatos = [];
  try {
    candidatos.push(execFileSync('which', [nome], { encoding: 'utf8' }).trim());
  } catch {
    /* segue para os caminhos conhecidos */
  }
  for (const padrao of ['/opt/homebrew/opt/postgresql@*/bin', '/usr/lib/postgresql/*/bin', '/usr/local/opt/postgresql@*/bin']) {
    for (const dir of globSync(padrao)) candidatos.push(join(dir, nome));
  }
  const achado = candidatos.find((c) => c && existsSync(c));
  if (!achado) {
    console.error(
      `Nao encontrei o binario '${nome}' do Postgres.\n` +
        `Este guarda roda o gatilho de verdade, entao precisa de um Postgres local.\n` +
        `No Mac: brew install postgresql@17. No Ubuntu: apt-get install postgresql.`
    );
    process.exit(1);
  }
  return achado;
}

const INITDB = acharBinario('initdb');
const PG_CTL = acharBinario('pg_ctl');
const PSQL = acharBinario('psql');

// ---------------------------------------------------------------- SQL base

/**
 * Recorta um `create table ... ( ... );` de uma migracao real, contando
 * parenteses. As tabelas vem do arquivo de verdade em vez de copiadas a mao
 * para que o teste nao passe a testar uma copia que envelheceu sozinha.
 */
function extrairCreateTable(sql, nomeTabela) {
  const marcador = `create table if not exists public.${nomeTabela} (`;
  const inicio = sql.indexOf(marcador);
  if (inicio === -1) throw new Error(`Nao achei a DDL de ${nomeTabela} na migracao de origem.`);
  let i = inicio + marcador.length - 1;
  let profundidade = 0;
  for (; i < sql.length; i++) {
    if (sql[i] === '(') profundidade++;
    else if (sql[i] === ')') {
      profundidade--;
      if (profundidade === 0) break;
    }
  }
  return `${sql.slice(inicio, i + 1)};`;
}

const sqlEsquemaOriginal = readFileSync(join(migracoes, '20260711_relink_appreview_schema.sql'), 'utf8');
const sqlOutbox = readFileSync(join(migracoes, '20260821193000_whatsapp_delivery_outbox.sql'), 'utf8');

// `auth.users` e do Supabase; aqui basta a chave que as tabelas referenciam.
const BOOTSTRAP = `
create schema if not exists auth;
create table if not exists auth.users (id uuid primary key);

${extrairCreateTable(sqlEsquemaOriginal, 'internal_feedback')}
${extrairCreateTable(sqlOutbox, 'whatsapp_notification_preferences')}
${extrairCreateTable(sqlOutbox, 'whatsapp_outbox')}
`;

// As migracoes que tocam o caminho do aviso, na ordem em que existem no repo.
const ATE_ANTES = [
  '20260829124017_alerta_imediato_comentario_privado.sql',
  '20260829124156_corrigir_validacao_telefone_whatsapp.sql',
  '20260829124220_corrigir_validacao_telefone_outbox.sql',
  '20260829124330_tipo_feedback_na_fila_whatsapp.sql',
  '20260830120000_aviso_aponta_para_onde_o_comentario_esta.sql',
  '20260830180000_limite_de_avisos_de_comentario.sql',
];

const NOVAS = [
  '20260830210000_nota_opcional_no_comentario.sql',
  '20260830220000_aviso_de_elogio_com_comentario.sql',
];

// ------------------------------------------------------------ roteiro comum

// Roda igual nos dois bancos. Um usuario por caso, para que a janela de um caso
// nunca interfira na do outro.
const ROTEIRO = `
create table teste_caso (user_id uuid primary key, rotulo text not null);

create or replace function teste_usuario(p_rotulo text) returns uuid
language plpgsql as $fn$
declare u uuid := gen_random_uuid();
begin
  insert into auth.users (id) values (u);
  insert into teste_caso (user_id, rotulo) values (u, p_rotulo);
  insert into public.whatsapp_notification_preferences (user_id, recipient_e164, consented_at)
    values (u, '+5511961234567', now());
  return u;
end $fn$;

-- Sem preferencia de WhatsApp nenhuma: nada pode ser enfileirado.
create or replace function teste_usuario_sem_preferencia(p_rotulo text) returns uuid
language plpgsql as $fn$
declare u uuid := gen_random_uuid();
begin
  insert into auth.users (id) values (u);
  insert into teste_caso (user_id, rotulo) values (u, p_rotulo);
  return u;
end $fn$;

do $roteiro$
declare u uuid;
begin
  -- 01: reclamacao com nota minima.
  u := teste_usuario('01-nota-1-com-texto');
  insert into public.internal_feedback (user_id, rating, feedback_text)
    values (u, 1, 'Fila enorme e comida fria.');

  -- 02: nota 3, a que o produto considera mais recuperavel.
  u := teste_usuario('02-nota-3-com-texto');
  insert into public.internal_feedback (user_id, rating, feedback_text)
    values (u, 3, 'Demorou demais para servir.');

  -- 03: nota baixa sem uma palavra escrita continua avisando.
  u := teste_usuario('03-nota-3-sem-texto');
  insert into public.internal_feedback (user_id, rating, feedback_text)
    values (u, 3, null);

  -- 04: nota baixa com nome e contato deixados.
  u := teste_usuario('04-nota-2-com-contato');
  insert into public.internal_feedback (user_id, rating, feedback_text, customer_name, customer_email)
    values (u, 2, 'Atendimento ruim.', 'Ana', '+5511999998888');

  -- 05: colapso da reclamacao. O segundo cai dentro da janela e nao avisa; o
  -- terceiro, ja fora dela, avisa somando os que chegaram desde o aviso.
  u := teste_usuario('05-colapso-reclamacao');
  insert into public.internal_feedback (user_id, rating, feedback_text)
    values (u, 2, 'Primeiro.');
  insert into public.internal_feedback (user_id, rating, feedback_text)
    values (u, 3, 'Segundo.');
  update public.whatsapp_outbox set created_at = now() - interval '6 minutes' where user_id = u;
  update public.internal_feedback set created_at = now() - interval '6 minutes'
    where user_id = u and feedback_text = 'Primeiro.';
  insert into public.internal_feedback (user_id, rating, feedback_text)
    values (u, 1, 'Terceiro.');

  -- 06: cinco estrelas com elogio escrito.
  u := teste_usuario('06-nota-5-com-texto');
  insert into public.internal_feedback (user_id, rating, feedback_text)
    values (u, 5, 'Melhor jantar do ano, equipe atenciosa.');

  -- 07: cinco estrelas sem uma palavra. Nao ha o que fazer com isso.
  u := teste_usuario('07-nota-5-sem-texto');
  insert into public.internal_feedback (user_id, rating, feedback_text)
    values (u, 5, null);

  -- 08: quatro estrelas com elogio escrito.
  u := teste_usuario('08-nota-4-com-texto');
  insert into public.internal_feedback (user_id, rating, feedback_text)
    values (u, 4, 'Muito bom, so o cafe que veio frio.');

  -- 09: texto so de espacos nao e texto.
  u := teste_usuario('09-nota-5-texto-em-branco');
  insert into public.internal_feedback (user_id, rating, feedback_text)
    values (u, 5, '   ');

  -- 10: uma enxurrada de elogios nao pode calar a reclamacao que vem depois.
  u := teste_usuario('10-elogio-nao-enterra-reclamacao');
  insert into public.internal_feedback (user_id, rating, feedback_text)
    values (u, 5, 'Elogio um.');
  insert into public.internal_feedback (user_id, rating, feedback_text)
    values (u, 5, 'Elogio dois.');
  insert into public.internal_feedback (user_id, rating, feedback_text)
    values (u, 4, 'Elogio tres.');
  insert into public.internal_feedback (user_id, rating, feedback_text)
    values (u, 1, 'A reclamacao que importa.');

  -- 11: e a reclamacao tambem nao pode calar o elogio.
  u := teste_usuario('11-reclamacao-nao-enterra-elogio');
  insert into public.internal_feedback (user_id, rating, feedback_text)
    values (u, 2, 'Reclamacao primeiro.');
  insert into public.internal_feedback (user_id, rating, feedback_text)
    values (u, 5, 'Elogio depois.');

  -- 12: colapso do elogio, com a janela propria dele.
  u := teste_usuario('12-colapso-elogio');
  insert into public.internal_feedback (user_id, rating, feedback_text)
    values (u, 5, 'Elogio inicial.');
  insert into public.internal_feedback (user_id, rating, feedback_text)
    values (u, 4, 'Elogio dentro da janela.');
  update public.whatsapp_outbox set created_at = now() - interval '16 minutes' where user_id = u;
  update public.internal_feedback set created_at = now() - interval '16 minutes'
    where user_id = u and feedback_text = 'Elogio inicial.';
  insert into public.internal_feedback (user_id, rating, feedback_text)
    values (u, 5, 'Elogio fora da janela.');

  -- 13: sem preferencia de WhatsApp, nada e enfileirado, nem elogio nem queixa.
  u := teste_usuario_sem_preferencia('13-sem-preferencia');
  insert into public.internal_feedback (user_id, rating, feedback_text)
    values (u, 1, 'Reclamacao sem destinatario.');
  insert into public.internal_feedback (user_id, rating, feedback_text)
    values (u, 5, 'Elogio sem destinatario.');
end $roteiro$;
`;

// ---------------------------------------------------------------- execucao

const base = mkdtempSync(join(tmpdir(), 'binno-gatilho-'));
const dados = join(base, 'dados');
const sock = join(base, 'sock');
const log = join(base, 'postgres.log');
mkdirSync(sock, { recursive: true });

let servidorNoAr = false;

function psql(db, sql) {
  const arquivo = join(base, `consulta-${Math.random().toString(36).slice(2)}.sql`);
  writeFileSync(arquivo, sql, 'utf8');
  return execFileSync(
    PSQL,
    ['-h', sock, '-p', PORTA, '-U', 'postgres', '-d', db, '-v', 'ON_ERROR_STOP=1', '-X', '-q', '-f', arquivo],
    // stderr capturado, nao herdado: parte deste guarda e mandar SQL que deve
    // falhar, e esses erros esperados na tela fariam uma execucao verde parecer
    // quebrada. Quem precisa do texto do erro le em `erro.stderr`.
    { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
  );
}

function psqlValor(db, sql) {
  const arquivo = join(base, `consulta-${Math.random().toString(36).slice(2)}.sql`);
  writeFileSync(arquivo, sql, 'utf8');
  return execFileSync(
    PSQL,
    ['-h', sock, '-p', PORTA, '-U', 'postgres', '-d', db, '-v', 'ON_ERROR_STOP=1', '-X', '-A', '-t', '-f', arquivo],
    { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
  );
}

function montarBanco(db, listaDeMigracoes) {
  psql('postgres', `create database ${db};`);
  psql(db, BOOTSTRAP);
  for (const nome of listaDeMigracoes) {
    psql(db, readFileSync(join(migracoes, nome), 'utf8'));
  }
  psql(db, ROTEIRO);
}

/** As linhas de fila de um banco, sem nada que varie entre execucoes. */
function filaDe(db, filtroKind) {
  // A chave de ordenacao fica de fora do objeto comparado: ela carrega o
  // horario real da linha, que muda a cada execucao e faria a comparacao entre
  // os dois bancos falhar sempre, por motivo nenhum.
  const bruto = psqlValor(
    db,
    `select json_agg(
              json_build_object('rotulo', rotulo, 'kind', kind, 'body', body)
              order by rotulo, chave
            )
       from (
         select c.rotulo as rotulo,
                o.kind as kind,
                o.body as body,
                to_char(o.created_at, 'YYYYMMDDHH24MISSUS') || o.body as chave
           from public.whatsapp_outbox o
           join teste_caso c on c.user_id = o.user_id
          ${filtroKind ? `where o.kind = '${filtroKind}'` : ''}
       ) t;`
  ).trim();
  return bruto === '' ? [] : JSON.parse(bruto);
}

const requisitos = [];
function exigir(rotulo, condicao) {
  requisitos.push([rotulo, !!condicao]);
}

try {
  execFileSync(INITDB, ['-D', dados, '-U', 'postgres', '--auth=trust', '--no-locale', '--encoding=UTF8'], {
    stdio: 'pipe',
  });
  execFileSync(PG_CTL, ['-D', dados, '-o', `-p ${PORTA} -k ${sock} -h ''`, '-l', log, '-w', 'start'], {
    stdio: 'pipe',
  });
  servidorNoAr = true;

  montarBanco('antes', ATE_ANTES);
  montarBanco('depois', [...ATE_ANTES, ...NOVAS]);

  // ---- a prova de que a reclamacao nao mudou: comparacao byte a byte
  const reclamacoesAntes = filaDe('antes', 'feedback');
  const reclamacoesDepois = filaDe('depois', 'feedback');

  exigir(
    'o roteiro produziu avisos de reclamacao (senao a comparacao nao provaria nada)',
    reclamacoesAntes.length >= 6
  );
  exigir(
    'as reclamacoes (nota 1 a 3) saem identicas antes e depois, texto do colapso incluido',
    JSON.stringify(reclamacoesAntes) === JSON.stringify(reclamacoesDepois)
  );

  const porRotulo = (fila, rotulo) => fila.filter((l) => l.rotulo === rotulo);
  const corpoUnico = (fila, rotulo) => {
    const achadas = porRotulo(fila, rotulo);
    return achadas.length === 1 ? achadas[0].body : null;
  };

  const elogiosDepois = filaDe('depois', 'feedback-praise');
  const elogiosAntes = filaDe('antes', 'feedback-praise');
  const tudoDepois = filaDe('depois', null);

  // Para ler as mensagens como elas chegam ao celular do dono:
  // BINNO_MOSTRAR_MENSAGENS=1 npm run check:gatilho-feedback-sql
  if (process.env.BINNO_MOSTRAR_MENSAGENS) {
    for (const linha of tudoDepois) {
      console.log(`\n--- ${linha.rotulo} [${linha.kind}] ---\n${linha.body}`);
    }
    console.log('');
  }

  // ---- o elogio antes nao existia
  exigir('antes, cinco estrelas com elogio escrito nao gerava nada', elogiosAntes.length === 0);
  exigir(
    'antes, nenhum aviso saia para os casos de nota 4 ou 5',
    filaDe('antes', null).filter((l) => l.rotulo.startsWith('06-') || l.rotulo.startsWith('08-')).length === 0
  );

  // ---- a regra nova
  exigir('nota 5 com texto passa a avisar', porRotulo(elogiosDepois, '06-nota-5-com-texto').length === 1);
  exigir('nota 4 com texto passa a avisar', porRotulo(elogiosDepois, '08-nota-4-com-texto').length === 1);
  exigir(
    'nota 5 sem texto continua em silencio',
    porRotulo(tudoDepois, '07-nota-5-sem-texto').length === 0
  );
  exigir(
    'nota 5 com texto so de espacos continua em silencio',
    porRotulo(tudoDepois, '09-nota-5-texto-em-branco').length === 0
  );

  // ---- a mensagem do elogio e outra coisa que a da reclamacao
  const msgElogio = corpoUnico(elogiosDepois, '06-nota-5-com-texto');
  const msgQueixa = corpoUnico(reclamacoesDepois, '02-nota-3-com-texto');
  exigir('o elogio gerou exatamente um corpo de mensagem', typeof msgElogio === 'string');
  exigir('a reclamacao gerou exatamente um corpo de mensagem', typeof msgQueixa === 'string');
  exigir(
    'a mensagem de elogio nao repete o texto da mensagem de reclamacao',
    msgElogio && msgQueixa && msgElogio !== msgQueixa
  );
  exigir(
    'a mensagem de elogio nao chama o elogio de "Comentário privado"',
    msgElogio && !msgElogio.includes('Comentário privado')
  );
  exigir(
    'a mensagem de elogio diz para agradecer',
    msgElogio && /agrade/i.test(msgElogio)
  );
  exigir(
    'a mensagem de elogio convida a publicar no Google',
    msgElogio && /Google/.test(msgElogio)
  );
  exigir(
    'a mensagem de elogio mantem o link do painel',
    msgElogio && msgElogio.includes('https://binno.pro/reviews')
  );
  exigir(
    'a mensagem de elogio traz o que o cliente escreveu',
    msgElogio && msgElogio.includes('Melhor jantar do ano, equipe atenciosa.')
  );
  exigir('a mensagem de elogio comeca por Binno, como as outras', msgElogio && msgElogio.startsWith('Binno\n'));
  // Escrito pelo code point de proposito: o repositorio nao quer o travessao
  // nem dentro da regra que proibe o travessao.
  exigir(
    'a mensagem de elogio nao usa travessao',
    msgElogio && !msgElogio.includes('\u2014')
  );

  // ---- as duas janelas nao se atrapalham
  // Contar linhas nao basta aqui: se elogio e reclamacao caissem na mesma fila,
  // haveria uma linha so, que seria o elogio, e a contagem passaria enquanto a
  // reclamacao morria calada. A linha tem de ser a reclamacao.
  const filaDoCaso10 = porRotulo(reclamacoesDepois, '10-elogio-nao-enterra-reclamacao');
  exigir(
    'depois de tres elogios seguidos, a reclamacao ainda avisa',
    filaDoCaso10.length === 1 && filaDoCaso10[0].body.includes('A reclamacao que importa.')
  );
  exigir(
    'a enxurrada de tres elogios virou um unico aviso de elogio',
    porRotulo(elogiosDepois, '10-elogio-nao-enterra-reclamacao').length === 1
  );
  const filaDoCaso11 = porRotulo(elogiosDepois, '11-reclamacao-nao-enterra-elogio');
  exigir(
    'a reclamacao anterior nao impede o elogio de avisar',
    filaDoCaso11.length === 1 && filaDoCaso11[0].body.includes('Elogio depois.')
  );
  exigir(
    'o elogio dentro da janela nao gera segundo aviso',
    porRotulo(elogiosDepois, '12-colapso-elogio').length === 2
  );

  const colapsoElogio = porRotulo(elogiosDepois, '12-colapso-elogio')[1];
  exigir(
    'o aviso de elogio seguinte soma os elogios acumulados, em vez de descarta-los',
    colapsoElogio && /\b2\b/.test(colapsoElogio.body)
  );
  exigir(
    'o colapso do elogio nao usa a frase do colapso da reclamacao',
    colapsoElogio && !colapsoElogio.body.includes('comentarios privados desde o ultimo aviso')
  );

  // ---- o silencio de quem nao pediu aviso continua
  exigir(
    'sem preferencia de WhatsApp, nem elogio nem reclamacao entram na fila',
    porRotulo(tudoDepois, '13-sem-preferencia').length === 0
  );

  // ---- a nota nula: antes era recusada pelo banco, agora e gravada em silencio

  // Um SQL que falha aqui e um resultado, nao um acidente: sem isto, a migracao
  // que esquecesse de afrouxar a coluna derrubava o guarda com um rastro de
  // pilha, em vez de dizer qual regra quebrou.
  function tentaSql(db, sql) {
    try {
      psql(db, sql);
      return { ok: true, erro: '' };
    } catch (erro) {
      return { ok: false, erro: String(erro.stderr || erro) };
    }
  }

  const INSERE_SEM_NOTA = (rotulo) =>
    `insert into public.internal_feedback (user_id, rating, feedback_text)
       select user_id, null, 'Sem nota.' from teste_caso where rotulo = '${rotulo}';`;

  const antesSemNota = tentaSql('antes', INSERE_SEM_NOTA('01-nota-1-com-texto'));
  exigir(
    'antes da migracao, gravar sem nota era recusado pelo banco',
    !antesSemNota.ok && /null value in column "rating"|not-null constraint/i.test(antesSemNota.erro)
  );

  const depoisSemNota = tentaSql('depois', INSERE_SEM_NOTA('13-sem-preferencia'));
  const gravadosSemNota = depoisSemNota.ok
    ? psqlValor('depois', `select count(*) from public.internal_feedback where rating is null;`).trim()
    : '0';
  exigir(
    'depois da migracao, o comentario sem nota e gravado',
    depoisSemNota.ok && gravadosSemNota === '1'
  );

  // Havia aqui uma asserção sobre o caso '13-sem-preferencia'. Foi removida em
  // 30/08/2026 porque nao podia falhar: sem preferencia nao ha destinatario,
  // entao nenhum aviso sai faca o gatilho o que fizer. Provado empiricamente,
  // desligando a porta da preferencia no gatilho: a assercao continuou verde.
  // Quem prova de verdade que nota nula nao alerta e o `caso14`, logo abaixo,
  // que usa um dono COM preferencia configurada.

  // Um usuario que pediu aviso, comentando sem nota, tambem fica em silencio.
  // O `caso14.ok` faz parte da regra de proposito: se o insert falhasse, o bloco
  // inteiro seria desfeito, nao sobraria linha nenhuma para o rotulo e a
  // ausencia de aviso passaria por acerto quando na verdade nada aconteceu.
  const caso14 = tentaSql(
    'depois',
    `do $$
     declare u uuid := teste_usuario('14-sem-nota-com-preferencia');
     begin
       insert into public.internal_feedback (user_id, rating, feedback_text)
         values (u, null, 'Escrevi sem avaliar.');
     end $$;`
  );
  exigir(
    'comentario sem nota, mesmo com WhatsApp ligado, nao gera aviso falso',
    caso14.ok && porRotulo(filaDe('depois', null), '14-sem-nota-com-preferencia').length === 0
  );

  // A escala continua barrando nota fora de 1 a 5, nos dois extremos. Testar so
  // o 0 deixaria passar um afrouxamento que atingisse apenas o topo.
  const foraDaEscala = (nota) => {
    try {
      psql(
        'depois',
        `insert into public.internal_feedback (user_id, rating, feedback_text)
           select user_id, ${nota}, 'Nota invalida.' from teste_caso where rotulo = '13-sem-preferencia';`
      );
      return false;
    } catch (erro) {
      return /internal_feedback_rating_check/i.test(String(erro.stderr || erro));
    }
  };
  exigir('a nota 0 continua barrada: aceitar nulo nao afrouxou a escala por baixo', foraDaEscala(0));
  exigir('a nota 6 continua barrada: aceitar nulo nao afrouxou a escala por cima', foraDaEscala(6));
} finally {
  if (servidorNoAr) {
    try {
      execFileSync(PG_CTL, ['-D', dados, '-m', 'immediate', '-w', 'stop'], { stdio: 'pipe' });
    } catch {
      /* o cluster e descartavel */
    }
  }
  rmSync(base, { recursive: true, force: true });
}

const falhas = requisitos.filter(([, ok]) => !ok).map(([rotulo]) => rotulo);
if (falhas.length) {
  console.error(`Gatilho de aviso com regra quebrada:\n- ${falhas.join('\n- ')}`);
  process.exit(1);
}

console.log(`Gatilho de aviso verificado no Postgres: ${requisitos.length} regras conferidas.`);
