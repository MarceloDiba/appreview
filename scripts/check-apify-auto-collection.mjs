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

const requirements = [
  // "Uma vez por negócio, para sempre": user_id é chave primária da fila, e o
  // gatilho insere com ON CONFLICT DO NOTHING. Reabrir o cadastro, recarregar
  // a página ou editar o link do Google depois nunca gera uma segunda linha.
  ['fila de coleta automática usa user_id como chave primária e insere com ON CONFLICT DO NOTHING',
    migration.includes('user_id uuid primary key references auth.users(id)')
    && migration.includes('on conflict (user_id) do nothing')],

  // O gatilho só reivindica a coleta quando as duas condições que definem "um
  // negócio novo" coexistem: nome do negócio e um link do Google plausível.
  ['gatilho só enfileira quando nome do negócio e link do Google coexistem',
    migration.includes('if v_business_name is null or btrim(v_business_name) = \'\' then')
    && migration.includes('if v_google_url is null then')],

  // Regra do produto: falha ao avisar/enfileirar nunca pode custar a ação
  // real do usuário. O mesmo padrão já usado em notify_low_rating_feedback.
  ['gatilho nunca derruba o INSERT/UPDATE em profiles ou platform_links: falha vira apenas aviso',
    migration.includes('exception when others then')
    && migration.includes('queue_apify_auto_collection_if_ready falhou')],

  // O cadastro (Onboarding.tsx) não importa, não chama e não sabe que a
  // coleta Apify existe. Isso não é apenas "tratar o erro": é impossível uma
  // falha de coleta bloquear ou atrasar o cadastro, porque não há chamada
  // síncrona nenhuma entre os dois. Quem enfileira é o banco; quem gasta é um
  // drenador que roda depois, desacoplado.
  ['cadastro não referencia a coleta Apify: zero acoplamento possível',
    !onboarding.toLowerCase().includes('apify')],

  // Os dois chamadores (piloto manual e drenador automático) passam pela
  // mesma função central para a janela de 24h e o teto mensal. Nenhum dos
  // dois pode reimplementar ou contornar o limite do outro.
  ['piloto manual e drenador automático chamam o mesmo núcleo de coleta guardada',
    collectorCore.includes('export async function runExperimentalApifyCollection')
    && manualCollector.includes('runExperimentalApifyCollection')
    && autoDispatcher.includes('runExperimentalApifyCollection')],

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
  ['os dois prazos de 15 minutos (linha "started" órfã em TS, linha "processing" travada em SQL) concordam, lidos como literais',
    (() => {
      const tsMatch = collectorCore.match(/const ORPHANED_STARTED_AFTER_MS = (\d+) \* 60 \* 1_000;/);
      const sqlMatch = migration.match(/claimed_at < now\(\) - interval '(\d+) minutes'/);
      if (!tsMatch || !sqlMatch) return false;
      const tsMinutes = Number(tsMatch[1]);
      const sqlMinutes = Number(sqlMatch[1]);
      return Number.isFinite(tsMinutes) && Number.isFinite(sqlMinutes) && tsMinutes === sqlMinutes;
    })()],

  ['núcleo partilhado aplica o teto mensal ANTES de abrir a auditoria e ANTES de chamar o Apify',
    collectorCore.includes("code: 'APIFY_EXPERIMENTAL_MONTHLY_LIMIT'")
    && collectorCore.includes('(monthlyCount || 0) >= monthlyRunLimit')
    && collectorCore.indexOf("code: 'APIFY_EXPERIMENTAL_MONTHLY_LIMIT'") < collectorCore.indexOf("status: 'started',")
    && collectorCore.indexOf("code: 'APIFY_EXPERIMENTAL_MONTHLY_LIMIT'") < collectorCore.indexOf('await fetch(actorUrl')],

  // "Uma vez por negócio" é uma vez no total. Se o piloto manual (ou uma
  // automação anterior) já teve sucesso, em qualquer momento, a automação de
  // cadastro não gasta de novo só porque o cooldown de 24h já passou.
  //
  // Checar só a POSIÇÃO da string `.eq('status', 'succeeded')` no arquivo é
  // vazio: apagar o `continue;` do bloco `if (existingSuccess)` deixa a
  // checagem no lugar, mas a execução cai para `runExperimentalApifyCollection`
  // na mesma iteração e o negócio é cobrado de novo, com o teste passando do
  // mesmo jeito. Em vez disso, este teste extrai o bloco `if (existingSuccess)`
  // respeitando chaves aninhadas e exige que a ÚLTIMA instrução dele seja
  // `continue` (ou `return`), ou seja, que o gate realmente pare a iteração
  // antes de qualquer chamada à coleta.
  (() => {
    const label = 'drenador automático pula negócio com QUALQUER coleta bem-sucedida anterior, e o `continue` realmente impede a chamada à coleta na mesma iteração';
    const gateQuery = autoDispatcher.includes(".eq('status', 'succeeded')") && autoDispatcher.includes("status: 'skipped_existing'");
    const block = extractIfBlock(autoDispatcher, 'if (existingSuccess) {');
    const collectionCallIndex = autoDispatcher.indexOf('await runExperimentalApifyCollection(');
    const blockExitsBeforeSpending = Boolean(block)
      && collectionCallIndex !== -1
      && block.end <= collectionCallIndex
      && /(?:^|\s)(continue|return[^;]*);\s*$/.test(block.body.trim());
    return [label, gateQuery && blockExitsBeforeSpending];
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
  ['drenador reivindica a fila com bloqueio atômico (skip locked) e também recupera linhas "processing" travadas havia mais de 15 minutos',
    migration.includes('for update skip locked')
    && migration.includes("where status = 'queued'")
    && migration.includes("or (status = 'processing' and claimed_at < now() - interval '15 minutes')")],

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
