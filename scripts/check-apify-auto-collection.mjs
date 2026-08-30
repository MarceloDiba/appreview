import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Decisão de 30/08/2026: coleta Apify automática, uma vez por negócio, ao
// cadastrar (ver /Users/marcelodiba/binno/docs/decisao-coleta-apify-no-cadastro.md).
// Este guarda protege as quatro promessas que custam dinheiro real se
// quebrarem: o teto mensal, a janela de 24 horas, o cadastro nunca travar por
// causa de uma coleta, e o interruptor de desligamento realmente parar a
// automação sem precisar de `git revert`.

const root = process.cwd();
const read = (path) => readFileSync(resolve(root, path), 'utf8');

const migration = read('supabase/migrations/20260830190000_coleta_apify_automatica_no_cadastro.sql');
const collectorCore = read('supabase/functions/_shared/experimentalApifyCollection.ts');
const manualCollector = read('supabase/functions/sync-experimental-apify/index.ts');
const autoDispatcher = read('supabase/functions/apify-auto-collect-on-signup/index.ts');
const onboarding = read('src/pages/Onboarding.tsx');
const rolloutDocs = read('docs/apify-experimental-rollout.md');

// Extrai o corpo de um bloco `if (condição) { ... }` respeitando chaves
// aninhadas (o objeto passado a `.update({...})` tem as suas próprias `{}`),
// para poder inspecionar a ÚLTIMA instrução do bloco, não só procurar uma
// string solta em qualquer lugar do arquivo.
const extractIfBlock = (source, conditionSnippet) => {
  const conditionIndex = source.indexOf(conditionSnippet);
  if (conditionIndex === -1) return null;
  const braceStart = source.indexOf('{', conditionIndex);
  if (braceStart === -1) return null;
  let depth = 0;
  for (let i = braceStart; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    else if (source[i] === '}') {
      depth -= 1;
      if (depth === 0) {
        return { end: i + 1, body: source.slice(braceStart + 1, i) };
      }
    }
  }
  return null;
};

// Extrai o corpo entre parênteses balanceados a partir do primeiro `(` que
// aparece a partir de `marker` (colunas de `create table`, ou o `(...)` de um
// `with selected as (...)`). Balanceado porque defaults como
// `gen_random_uuid()` têm os seus próprios parênteses.
const extractParenBody = (source, marker) => {
  const markerIndex = source.indexOf(marker);
  if (markerIndex === -1) return null;
  const parenStart = source.indexOf('(', markerIndex);
  if (parenStart === -1) return null;
  let depth = 0;
  for (let i = parenStart; i < source.length; i += 1) {
    if (source[i] === '(') depth += 1;
    else if (source[i] === ')') {
      depth -= 1;
      if (depth === 0) return source.slice(parenStart + 1, i);
    }
  }
  return null;
};

// Extrai o corpo `then ... end if;` de um `if <condição> then` em PL/pgSQL.
// SQL não tem chaves; os `if`s deste arquivo não são aninhados, então o
// próximo `end if;` depois do `then` é o certo.
const extractSqlIfThenBody = (source, conditionSnippet) => {
  const conditionIndex = source.indexOf(conditionSnippet);
  if (conditionIndex === -1) return null;
  const thenIndex = source.indexOf('then', conditionIndex);
  if (thenIndex === -1) return null;
  const bodyStart = thenIndex + 'then'.length;
  const endIfIndex = source.indexOf('end if;', bodyStart);
  if (endIfIndex === -1) return null;
  return source.slice(bodyStart, endIfIndex).trim();
};

// Extrai o trecho entre dois marcadores literais, o segundo procurado a
// partir do fim do primeiro. Isola uma função (ou uma instrução) pelo texto
// que já a delimita, em vez de assumir que uma string só aparece uma vez no
// arquivo inteiro.
const extractBetween = (source, startMarker, endMarker) => {
  const startIndex = source.indexOf(startMarker);
  if (startIndex === -1) return null;
  const endIndex = source.indexOf(endMarker, startIndex + startMarker.length);
  if (endIndex === -1) return null;
  return source.slice(startIndex, endIndex + endMarker.length);
};

const requirements = [
  // "Uma vez por negócio, para sempre": user_id é chave primária da fila, e o
  // gatilho insere com ON CONFLICT DO NOTHING. Reabrir o cadastro, recarregar
  // a página ou editar o link do Google depois nunca gera uma segunda linha.
  //
  // As duas strings existirem em algum lugar do arquivo não prova nada: o
  // ON CONFLICT podia estar num INSERT qualquer, sem relação com esta tabela,
  // e o teste passaria do mesmo jeito. Aqui a chave primária é lida DENTRO da
  // lista de colunas de `create table ... apify_auto_collection_queue`, e o
  // ON CONFLICT é lido DENTRO do INSERT que grava nessa mesma tabela.
  (() => {
    const label = 'user_id é PRIMARY KEY na própria tabela da fila, e é o INSERT que grava nela que usa ON CONFLICT (user_id) DO NOTHING';
    const tableColumns = extractParenBody(migration, 'create table if not exists public.apify_auto_collection_queue');
    const pkOnUserId = Boolean(tableColumns) && /user_id\s+uuid\s+primary key\s+references\s+auth\.users\(id\)/.test(tableColumns);
    const insertStatement = extractBetween(migration, 'insert into public.apify_auto_collection_queue (user_id, google_review_url)', ';');
    const insertHasOnConflict = Boolean(insertStatement) && insertStatement.includes('on conflict (user_id) do nothing');
    return [label, pkOnUserId && insertHasOnConflict];
  })(),

  // O gatilho só reivindica a coleta quando as duas condições que definem "um
  // negócio novo" coexistem: nome do negócio e um link do Google plausível.
  //
  // A condição existir como texto não prova que ela FAZ alguma coisa: alguém
  // podia apagar o `return;` de dentro do `if` e deixar a condição solta,
  // sem efeito, e o teste antigo continuaria vendo as duas strings. Aqui cada
  // `if` tem seu corpo extraído até o `end if;` correspondente, e o corpo
  // precisa ser exatamente `return;`.
  (() => {
    const label = 'gatilho REALMENTE sai (return;) quando falta nome do negócio, e REALMENTE sai quando falta link do Google válido';
    const nameGuardBody = extractSqlIfThenBody(migration, "if v_business_name is null or btrim(v_business_name) = '' then");
    const urlGuardBody = extractSqlIfThenBody(migration, 'if v_google_url is null then');
    return [label, nameGuardBody === 'return;' && urlGuardBody === 'return;'];
  })(),

  // Regra do produto: falha ao avisar/enfileirar nunca pode custar a ação
  // real do usuário. O mesmo padrão já usado em notify_low_rating_feedback.
  //
  // As duas strings existirem em algum lugar não prova que o bloco de exceção
  // engole o erro: um `raise;` (relança) ou `raise exception` bem ali dentro
  // deixaria o INSERT/UPDATE em profiles/platform_links falhar do mesmo jeito
  // e o teste antigo continuaria verde. Aqui o corpo do `exception when
  // others` é isolado até o `$$;` que fecha a função, e precisa conter o
  // aviso E não conter nenhuma forma de relançar.
  (() => {
    const label = 'bloco `exception when others` grava o aviso e NÃO relança o erro (sem `raise exception`, sem `raise;` solto)';
    const exceptionBlock = extractBetween(migration, 'exception when others then', '$$;');
    const hasWarning = Boolean(exceptionBlock) && exceptionBlock.includes('queue_apify_auto_collection_if_ready falhou');
    const reRaises = Boolean(exceptionBlock) && (/raise exception/i.test(exceptionBlock) || /\braise\s*;/i.test(exceptionBlock));
    return [label, hasWarning && !reRaises];
  })(),

  // O cadastro (Onboarding.tsx) não importa, não chama e não sabe que a
  // coleta Apify existe. Isso não é apenas "tratar o erro": é impossível uma
  // falha de coleta bloquear ou atrasar o cadastro, porque não há chamada
  // síncrona nenhuma entre os dois. Quem enfileira é o banco; quem gasta é um
  // drenador que roda depois, desacoplado.
  ['cadastro não referencia a coleta Apify: zero acoplamento possível',
    !onboarding.toLowerCase().includes('apify')],

  // Os dois chamadores (piloto manual e drenador automático) passam pela
  // mesma função central para a janela de 24h e o teto mensal. Nenhum dos
  // dois pode reimplementar ou contornar o limite do outro. Chamar a função
  // partilhada não basta sozinho: nada impedia, textualmente, que o
  // coletor manual TAMBÉM tivesse seu próprio `fetch` direto ao Apify ao
  // lado da chamada partilhada. O teste do drenador automático (mais abaixo,
  // "drenador automático não reimplementa a chamada ao Apify") já cobre o
  // lado dele; esta linha fecha o mesmo buraco do lado do piloto manual.
  ['piloto manual e drenador automático chamam o mesmo núcleo de coleta guardada, e NENHUM dos dois fala com a API do Apify por conta própria',
    collectorCore.includes('export async function runExperimentalApifyCollection')
    && manualCollector.includes('runExperimentalApifyCollection')
    && autoDispatcher.includes('runExperimentalApifyCollection')
    && !manualCollector.includes('api.apify.com')
    && !autoDispatcher.includes('api.apify.com')],

  // Não basta a string existir: o teste original passava mesmo se a checagem
  // rodasse depois do gasto, porque nunca comparava posições. Aqui a rejeição
  // por cooldown precisa aparecer ANTES do insert que abre 'started' e ANTES
  // do fetch que de fato chama o Apify (a cobrança).
  ['núcleo partilhado aplica a janela de 24 horas ANTES de abrir a auditoria e ANTES de chamar o Apify',
    collectorCore.includes("code: 'APIFY_EXPERIMENTAL_COOLDOWN'")
    && collectorCore.indexOf("code: 'APIFY_EXPERIMENTAL_COOLDOWN'") < collectorCore.indexOf("status: 'started',")
    && collectorCore.indexOf("code: 'APIFY_EXPERIMENTAL_COOLDOWN'") < collectorCore.indexOf('await fetch(actorUrl')],

  // Uma linha 'started' sem conclusão pode significar que o Apify já foi
  // chamado e cobrou; só não sabemos o resultado. Ela tem que bloquear a
  // janela de 24h igual a 'succeeded', não só linhas concluídas.
  ['janela de 24 horas trata "started" (coleta talvez já cobrada) igual a "succeeded", não só coletas concluídas',
    collectorCore.includes(".in('status', ['succeeded', 'started'])")],

  // Sem isso, uma linha 'started' órfã bloquearia o negócio para sempre. A
  // reivindicação tem que rodar antes da checagem de 24h usar o resultado, e
  // tem que gravar um código próprio (não apaga, não finge que nunca houve
  // tentativa).
  ['linha "started" órfã (muito além do timeout do Actor) é reivindicada como falha antes da checagem de 24h, com código próprio',
    collectorCore.includes('ORPHANED_STARTED_AFTER_MS')
    && collectorCore.includes("error_code: 'APIFY_EXPERIMENTAL_ORPHANED'")
    && collectorCore.indexOf("error_code: 'APIFY_EXPERIMENTAL_ORPHANED'") < collectorCore.indexOf(".in('status', ['succeeded', 'started'])")],

  // A reivindicação órfã tem que ser escopada só por user_id, a mesma chave
  // do índice único parcial: uma linha 'started' presa sob um link antigo
  // precisa liberar a vaga para uma tentativa com o link atual, senão o
  // índice único trava o negócio para sempre mesmo depois do prazo de órfã.
  ['reivindicação de linha "started" órfã é escopada só por user_id, não também por google_review_url',
    (() => {
      const block = extractIfBlock(collectorCore, "if (reclaimError) {");
      const reclaimCallIndex = collectorCore.lastIndexOf(".update({ status: 'failed', completed_at: now.toISOString(), error_code: 'APIFY_EXPERIMENTAL_ORPHANED' })", collectorCore.indexOf("if (reclaimError) {"));
      if (reclaimCallIndex === -1) return false;
      const chainEnd = collectorCore.indexOf(';', reclaimCallIndex);
      const chain = collectorCore.slice(reclaimCallIndex, chainEnd);
      return chain.includes(".eq('user_id', userId)") && !chain.includes('google_review_url');
    })()],

  // O check-then-act original deixava duas chamadas concorrentes passarem
  // pelo mesmo SELECT de cooldown e as duas gastarem. O índice único parcial
  // faz do INSERT a própria reivindicação atômica: só existe UMA linha
  // 'started' por user_id no banco a qualquer momento. Isso tem que existir
  // na migração (não só ser assumido pelo código) e o INSERT tem que tratar
  // unique_violation como "outra chamada já reivindicou", não como erro.
  ['índice único parcial garante uma única linha "started" por negócio, e o INSERT trata violação de unicidade como reivindicação perdida (não como erro)',
    migration.includes("create unique index if not exists experimental_apify_runs_one_started_idx")
    && migration.includes("on public.experimental_apify_runs (user_id)")
    && migration.includes("where status = 'started';")
    && collectorCore.includes("POSTGRES_UNIQUE_VIOLATION = '23505'")
    && collectorCore.includes("auditError.code === POSTGRES_UNIQUE_VIOLATION")
    && collectorCore.includes("code: 'APIFY_EXPERIMENTAL_CLAIMED_ELSEWHERE'")
    && collectorCore.indexOf("auditError.code === POSTGRES_UNIQUE_VIOLATION") < collectorCore.indexOf('await fetch(actorUrl')],

  // As duas linguagens não se leem: nada IMPEDE alguém de mudar um dos dois
  // prazos de 15 minutos (o de linha 'started' órfã em TypeScript, o de linha
  // 'processing' travada em SQL) sem lembrar do outro. Este teste lê os dois
  // literais de verdade, não confia em comentário nem em nome de variável, e
  // falha se os valores divergirem.
  //
  // As duas regex originais eram presas à FORMA do literal (`N * 60 * 1_000`
  // em TS, `interval 'N minutes'` em SQL). Trocar a unidade sem trocar o
  // valor (por exemplo `interval '900 seconds'`, que é exatamente os mesmos
  // 15 minutos escritos de outro jeito) faz a regex do SQL não casar
  // (`sqlMatch` vira null) e o guarda falhar por um motivo que não é uma
  // divergência real. Um guarda que bloqueia CI por uma concordância é pior
  // que nenhum guarda. Em vez de comparar formas, os dois lados são
  // normalizados para milissegundos antes de comparar.
  (() => {
    const label = 'os dois prazos concordam em DURAÇÃO (normalizados para milissegundos), não na forma literal: mudar a unidade sem mudar o valor não é uma divergência';
    // Lado TypeScript: aceita qualquer expressão de dígitos/underscores com
    // *, + ou - (o formato usado é `15 * 60 * 1_000`, mas o valor é o que
    // importa, não essa forma exata).
    const tsMatch = collectorCore.match(/const ORPHANED_STARTED_AFTER_MS = ([^;]+);/);
    const tsExpr = tsMatch ? tsMatch[1].trim() : '';
    const tsMs = /^[\d_\s*+-]+$/.test(tsExpr)
      ? Number(Function(`"use strict"; return (${tsExpr.replace(/_/g, '')});`)())
      : null;
    // Lado SQL: aceita segundos, minutos ou horas, e converte para ms.
    const sqlMatch = migration.match(/claimed_at < now\(\) - interval '(\d+)\s*(second|seconds|minute|minutes|hour|hours)'/);
    const unitToMs = { second: 1_000, seconds: 1_000, minute: 60_000, minutes: 60_000, hour: 3_600_000, hours: 3_600_000 };
    const sqlMs = sqlMatch ? Number(sqlMatch[1]) * unitToMs[sqlMatch[2]] : null;
    return [label, Number.isFinite(tsMs) && Number.isFinite(sqlMs) && tsMs === sqlMs];
  })(),

  ['núcleo partilhado aplica o teto mensal ANTES de abrir a auditoria e ANTES de chamar o Apify',
    collectorCore.includes("code: 'APIFY_EXPERIMENTAL_MONTHLY_LIMIT'")
    && collectorCore.includes('(monthlyCount || 0) >= monthlyRunLimit')
    && collectorCore.indexOf("code: 'APIFY_EXPERIMENTAL_MONTHLY_LIMIT'") < collectorCore.indexOf("status: 'started',")
    && collectorCore.indexOf("code: 'APIFY_EXPERIMENTAL_MONTHLY_LIMIT'") < collectorCore.indexOf('await fetch(actorUrl')],

  // "Uma vez por negócio" é uma vez no total. Se o piloto manual (ou uma
  // automação anterior) já teve sucesso, em qualquer momento, a automação de
  // cadastro não gasta de novo só porque o cooldown de 24h já passou. Este é
  // o guarda que protege dinheiro real; os dois defeitos abaixo já foram
  // reproduzidos de propósito para provar que o guarda anterior não os pegava
  // antes de escrever este.
  //
  // DEFEITO 1 (apagar o `continue;`): sem ele, a execução cai para
  // `runExperimentalApifyCollection` na mesma iteração e o negócio é cobrado
  // de novo. Corrigido na rodada anterior extraindo o bloco `if
  // (existingSuccess)` e exigindo que a ÚLTIMA instrução seja `continue`/
  // `return`.
  //
  // DEFEITO 2 (estreitar a janela de tempo): checar só que as strings
  // `.eq('status', 'succeeded')` e `status: 'skipped_existing'` existem em
  // algum lugar do arquivo é vazio da MESMA forma que os outros guardas desta
  // rodada eram: adicionar `.gte('completed_at', umaJanelaQualquer)` à
  // consulta faz um negócio já coletado há mais tempo ser cobrado de novo, e
  // as duas strings continuam lá, então o guarda antigo continuava verde.
  // Reproduzido e confirmado antes desta reescrita.
  //
  // Este teste extrai a consulta de verdade (`const { data: existingSuccess`
  // até o `;` que a termina) e exige, na própria consulta: escopo por
  // `row.user_id`, filtro por `status: 'succeeded'`, e AUSÊNCIA de qualquer
  // operador de comparação de tempo (`.gte`, `.gt`, `.lte`, `.lt`); nenhum
  // deles tem uso legítimo aqui, porque "em qualquer momento" significa sem
  // filtro de tempo nenhum.
  (() => {
    const label = 'drenador automático pula negócio com QUALQUER coleta bem-sucedida anterior: a consulta é escopada ao negócio da linha, filtra por sucesso, SEM filtro de tempo algum, e o `continue` realmente impede a chamada à coleta na mesma iteração';
    const statement = extractBetween(autoDispatcher, 'const { data: existingSuccess', ';');
    const scopedToRow = Boolean(statement) && statement.includes(".eq('user_id', row.user_id)");
    const filteredSucceeded = Boolean(statement) && statement.includes(".eq('status', 'succeeded')");
    const hasTimeNarrowing = Boolean(statement) && /\.(gte|gt|lte|lt)\(/.test(statement);
    const marksSkippedExisting = autoDispatcher.includes("status: 'skipped_existing'");
    const block = extractIfBlock(autoDispatcher, 'if (existingSuccess) {');
    const collectionCallIndex = autoDispatcher.indexOf('await runExperimentalApifyCollection(');
    const blockExitsBeforeSpending = Boolean(block)
      && collectionCallIndex !== -1
      && block.end <= collectionCallIndex
      && /(?:^|\s)(continue|return[^;]*);\s*$/.test(block.body.trim());
    return [label, scopedToRow && filteredSucceeded && !hasTimeNarrowing && marksSkippedExisting && blockExitsBeforeSpending];
  })(),

  // O teto não pode ser lido em dois lugares com valores diferentes: os dois
  // chamadores importam a mesma função que lê APIFY_EXPERIMENTAL_MONTHLY_RUN_LIMIT.
  ['nenhum chamador lê o teto mensal por conta própria; os dois usam resolveMonthlyRunLimit do núcleo',
    manualCollector.includes('resolveMonthlyRunLimit')
    && autoDispatcher.includes('resolveMonthlyRunLimit')
    && !manualCollector.includes('APIFY_EXPERIMENTAL_MONTHLY_RUN_LIMIT')
    && !autoDispatcher.includes('APIFY_EXPERIMENTAL_MONTHLY_RUN_LIMIT')],

  // O interruptor de desligamento: só um segredo, verificado antes de
  // reivindicar qualquer linha da fila ou chamar o núcleo de coleta.
  ['interruptor de desligamento existe e é checado antes de reivindicar a fila',
    autoDispatcher.includes('APIFY_AUTO_COLLECT_ON_SIGNUP_ENABLED')
    && autoDispatcher.includes('if (!autoOnSignupEnabled || !experimentalEnabled || !apifyToken)')
    && autoDispatcher.indexOf('if (!autoOnSignupEnabled') < autoDispatcher.indexOf("rpc('claim_apify_auto_collection'")
    && autoDispatcher.indexOf('if (!autoOnSignupEnabled') < autoDispatcher.indexOf('await runExperimentalApifyCollection')],

  // Não basta o JSON de "desligado" existir em algum lugar do arquivo: ele
  // precisa ser o retorno imediato de DENTRO do próprio `if` do interruptor,
  // senão o teste passaria mesmo com o `return` solto em outro branch morto
  // ou com o `if` sem `return` nenhum.
  ['interruptor desligado retorna dentro do próprio bloco `if`, sem seguir adiante para reivindicar a fila',
    /if\s*\(\s*!autoOnSignupEnabled\s*\|\|\s*!experimentalEnabled\s*\|\|\s*!apifyToken\s*\)\s*\{\s*return json\(\{\s*code:\s*'APIFY_AUTO_COLLECT_DISABLED',\s*processed:\s*0,\s*results:\s*\[\]\s*\}\);\s*\}/.test(autoDispatcher)],

  // O drenador nunca fala com a API do Apify diretamente; só o núcleo
  // partilhado fala. Duplicar essa chamada seria reabrir a possibilidade de
  // um caminho que ignora os limites.
  ['drenador automático não reimplementa a chamada ao Apify',
    !autoDispatcher.includes('api.apify.com')],

  // Falhas transitórias (cooldown, teto mensal, perder a corrida do índice
  // único) voltam para "queued" e podem ser tentadas de novo depois; qualquer
  // outro erro é definitivo, uma tentativa automática por negócio, nunca um
  // laço de novas tentativas. A string `transient ? 'queued' : 'failed'`
  // sozinha não prova nada: alguém poderia alargar a própria condição
  // `transient` para incluir um código pós-gasto (ex.: `APIFY_REQUEST_FAILED`)
  // e criar retries pagos sem limite, com essa linha continuando idêntica.
  // Por isso o teste lê a expressão de `transient` e exige exatamente os três
  // códigos que rejeitam ANTES de gastar, nem um a mais.
  ['"transient" deriva só dos três códigos que rejeitam antes de gastar (cooldown, teto mensal, corrida do índice único); nenhum código pós-gasto entra nessa lista',
    (() => {
      const match = autoDispatcher.match(/const transient = ([^;]+);/s);
      const expr = match ? match[1] : '';
      return expr.includes("outcome.code === 'APIFY_EXPERIMENTAL_COOLDOWN'")
        && expr.includes("outcome.code === 'APIFY_EXPERIMENTAL_MONTHLY_LIMIT'")
        && expr.includes("outcome.code === 'APIFY_EXPERIMENTAL_CLAIMED_ELSEWHERE'")
        && (expr.match(/outcome\.code ===/g) || []).length === 3;
    })()
    && autoDispatcher.includes("status: transient ? 'queued' : 'failed'")],

  // Uma linha 'processing' cujo drenador caiu antes de gravar o resultado
  // ficaria travada para sempre e o negócio perderia a coleta em silêncio.
  //
  // As três strings existirem em algum lugar do arquivo não prova que elas
  // fazem parte da MESMA consulta: `skip locked` podia estar numa função sem
  // relação, e o teste antigo continuaria verde. Aqui a função
  // claim_apify_auto_collection é isolada pelo seu próprio texto, e dentro
  // dela o corpo do `with selected as (...)` (a única consulta que existe)
  // precisa conter as três coisas, nesta ordem: a condição 'queued', a
  // condição 'processing' travada, e só depois o bloqueio.
  (() => {
    const label = 'a condição "queued", a reivindicação de "processing" travada e o bloqueio "skip locked" pertencem à MESMA consulta, na mesma função, na mesma ordem';
    const claimFunctionBody = extractBetween(migration, 'create or replace function public.claim_apify_auto_collection(batch_size integer default 5)', '$$;');
    const cteBody = claimFunctionBody && extractParenBody(claimFunctionBody, 'with selected as');
    const hasQueued = Boolean(cteBody) && cteBody.includes("where status = 'queued'");
    // O prazo em si (a duração) é conferido à parte pelo teste que compara
    // os dois literais em ms (mais abaixo). Aqui a exigência é estrutural:
    // que exista mesmo uma condição de reivindicação de 'processing' travado
    // por tempo, sem prender esta asserção a uma unidade específica (min/seg).
    const hasProcessingReclaim = Boolean(cteBody) && /or \(status = 'processing' and claimed_at < now\(\) - interval '\d+\s*(second|seconds|minute|minutes|hour|hours)'\)/.test(cteBody);
    const hasSkipLocked = Boolean(cteBody) && cteBody.includes('for update skip locked');
    const orderedInSameQuery = hasQueued && hasProcessingReclaim && hasSkipLocked
      && cteBody.indexOf("where status = 'queued'") < cteBody.indexOf("or (status = 'processing'")
      && cteBody.indexOf("or (status = 'processing'") < cteBody.indexOf('for update skip locked');
    return [label, orderedInSameQuery];
  })(),

  // Não basta o nome da variável de ambiente aparecer nos docs: o texto
  // precisa afirmar o que o interruptor garante (desliga sozinho, mesmo com
  // o piloto manual ligado) e o que acontece quando ele está desligado.
  ['documentação explica o comportamento do interruptor, não só cita o nome da variável',
    rolloutDocs.includes('APIFY_AUTO_COLLECT_ON_SIGNUP_ENABLED')
    && rolloutDocs.includes('sempre desliga a coleta automática')
    && rolloutDocs.includes('nunca reivindica')],
];

const failed = requirements.filter(([, ok]) => !ok).map(([label]) => label);
if (failed.length) {
  console.error(`Coleta Apify automática no cadastro com regra quebrada:\n- ${failed.join('\n- ')}`);
  process.exit(1);
}

console.log(`Coleta Apify automática no cadastro verificada: ${requirements.length} proteções ativas.`);
