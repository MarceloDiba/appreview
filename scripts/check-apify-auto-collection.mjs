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

  ['núcleo partilhado aplica a janela de 24 horas antes de gastar',
    collectorCore.includes("code: 'APIFY_EXPERIMENTAL_COOLDOWN'")
    && collectorCore.includes(".eq('status', 'succeeded').gte('requested_at', dayAgo)")],

  ['núcleo partilhado aplica o teto mensal antes de gastar',
    collectorCore.includes("code: 'APIFY_EXPERIMENTAL_MONTHLY_LIMIT'")
    && collectorCore.includes('(monthlyCount || 0) >= monthlyRunLimit')],

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

  ['desligado, o drenador não gasta: nenhuma chamada ao Apify por baixo do interruptor',
    autoDispatcher.includes("return json({ code: 'APIFY_AUTO_COLLECT_DISABLED', processed: 0, results: [] });")],

  // O drenador nunca fala com a API do Apify diretamente; só o núcleo
  // partilhado fala. Duplicar essa chamada seria reabrir a possibilidade de
  // um caminho que ignora os limites.
  ['drenador automático não reimplementa a chamada ao Apify',
    !autoDispatcher.includes('api.apify.com')],

  // Falhas transitórias (cooldown, teto mensal) voltam para "queued" e podem
  // ser tentadas de novo depois; qualquer outro erro é definitivo, uma
  // tentativa automática por negócio, nunca um laço de novas tentativas.
  ['falha transitória reenfileira; falha definitiva não tenta de novo automaticamente',
    autoDispatcher.includes("status: transient ? 'queued' : 'failed'")],

  ['drenador reivindica a fila com bloqueio atômico (skip locked), sem duas execuções pegarem a mesma linha',
    migration.includes('for update skip locked')
    && migration.includes("where status = 'queued'")],

  ['documentação de operação registra o novo interruptor',
    rolloutDocs.includes('APIFY_AUTO_COLLECT_ON_SIGNUP_ENABLED')],
];

const failed = requirements.filter(([, ok]) => !ok).map(([label]) => label);
if (failed.length) {
  console.error(`Coleta Apify automática no cadastro com regra quebrada:\n- ${failed.join('\n- ')}`);
  process.exit(1);
}

console.log(`Coleta Apify automática no cadastro verificada: ${requirements.length} proteções ativas.`);
