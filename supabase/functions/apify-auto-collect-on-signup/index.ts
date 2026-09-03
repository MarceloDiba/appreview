import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, json, resolveMonthlyRunLimit, runExperimentalApifyCollection } from '../_shared/experimentalApifyCollection.ts';

/**
 * Drenador da coleta Apify automática no cadastro (decisão de 30/08/2026).
 *
 * NÃO é chamada pelo navegador do dono. `src/pages/Onboarding.tsx` não sabe
 * que esta função existe: o pedido de coleta é gravado pelo gatilho de banco
 * em `supabase/migrations/20260830190000_coleta_apify_automatica_no_cadastro.sql`
 * assim que um negócio tem, ao mesmo tempo, nome e um link do Google válido.
 * Essa gravação é o cadastro em si (parte da mesma escrita em `profiles` ou
 * `platform_links` que o cadastro já precisa fazer), então uma aba fechada
 * pelo dono não perde o pedido.
 *
 * Esta função só lê essa fila e gasta com o Apify.
 *
 * QUEM A CHAMA, DESDE 02/09/2026: o `pg_cron`, de dois em dois minutos, por
 * `public.drenar_coleta_do_cadastro()`. Até essa data ninguém a chamava, e o
 * cabeçalho dizia porquê — "a primeira execução real é decisão de Marcelo, não
 * deste código". A decisão existia desde 30/08 ("faça a coleta no apify sempre
 * que cadastrar um novo negócio"); o agendamento é que ficou por fazer, e o
 * preço foi um pedido de coleta parado na fila desde 31/08 sem ninguém saber.
 * Um cliente que se cadastrasse abria o painel e não via dado nenhum.
 *
 * `verify_jwt` DESLIGADO, como nos outros três drenadores (02/09/2026). O
 * portão do Supabase recusava a chamada do cron com 401 antes de esta função
 * correr, porque exigia um JWT no cabeçalho. Desligá-lo não baixa a guarda: a
 * chave que esse portão aceita é a `anon`, que viaja dentro do pacote do
 * próprio site e qualquer pessoa lê. Quem gasta dinheiro aqui é a autenticação
 * DESTA função — chave de serviço ou segredo do worker — e ela corre em todos
 * os pedidos, antes de tocar na fila.
 *
 * Dois de dois minutos, e não de cinco: quem acabou de se cadastrar está a
 * OLHAR para o ecrã. O que corre a cada dois minutos é uma contagem na fila; o
 * gasto só acontece quando há linha para processar, e a fila tem `user_id`
 * como chave primária — uma coleta por negócio, no total, para sempre.
 *
 * INTERRUPTOR DE DESLIGAMENTO
 *
 * `APIFY_AUTO_COLLECT_ON_SIGNUP_ENABLED` é o interruptor desta automação:
 * girar só este segredo para `false` (ou removê-lo) sempre desliga a coleta
 * automática, mesmo que `APIFY_EXPERIMENTAL_ENABLED` continue `true` para o
 * piloto manual. O contrário não vale: a automação também exige
 * `APIFY_EXPERIMENTAL_ENABLED=true` como pré-requisito, porque herda o
 * interruptor geral do piloto (linha `if (!autoOnSignupEnabled ||
 * !experimentalEnabled || !apifyToken)` abaixo), então desligar esse outro
 * segredo também a desliga. Quando o acesso Basic ao Google Business Profile
 * for aprovado, a forma correta de desligar é girar
 * `APIFY_AUTO_COLLECT_ON_SIGNUP_ENABLED` para `false`, sem tocar em código e
 * sem afetar o botão manual do piloto assistido, que pode continuar a existir
 * por mais tempo como ferramenta de diagnóstico. Sem esse segredo em `true`,
 * esta função nunca reivindica uma linha da fila nem gasta um centavo: só
 * responde com `processed: 0`.
 *
 * UMA COLETA POR NEGÓCIO, NÃO POR CAMINHO
 *
 * "Uma vez por negócio" na decisão de 30/08/2026 significa uma vez no total,
 * não uma vez pelo caminho manual e outra pelo automático. Se o piloto manual
 * já coletou com sucesso para este negócio, em qualquer momento (não só nas
 * últimas 24h), a automação não tem nada a acrescentar e não gasta: marca a
 * linha da fila como `skipped_existing` e segue para a próxima.
 */

const authorizedServiceCall = (request: Request, serviceRoleKey: string) => {
  const authorization = request.headers.get('Authorization') || '';
  const token = authorization.replace(/^Bearer\s+/i, '').trim();
  return Boolean(serviceRoleKey) && token === serviceRoleKey;
};

/**
 * O SEGUNDO CAMINHO DE ENTRADA: o segredo do worker (02/09/2026).
 *
 * Ate esta data a unica forma de chamar esta funcao era apresentar a CHAVE DE
 * SERVICO no cabecalho. Isso e o que a impedia de ser agendada: o `pg_cron`
 * corre dentro do banco, e para lhe dar a chave de servico era preciso guardar
 * uma copia dela no Vault — a chave que abre a base de dados INTEIRA, sem
 * limite nenhum, ao alcance de qualquer funcao `security definer` que alguem
 * escreva a seguir.
 *
 * O `x-binno-worker-secret` e o que os outros tres drenadores ja usam
 * (`telegram-dispatch`, `email-dispatch`, `materialize-whatsapp-notifications`)
 * e vale exactamente uma coisa: "podes correr este drenador". Se vazar, o que
 * se perde e a capacidade de disparar drenagens — nao a base de dados.
 *
 * O caminho antigo FICA. Quem ja chama com a chave de servico continua a
 * funcionar; isto e uma porta a mais, e nao uma troca de fechadura.
 */
const authorizedWorkerCall = (request: Request) => {
  const expected = Deno.env.get('BINNO_WORKER_SECRET') || '';
  return Boolean(expected) && request.headers.get('x-binno-worker-secret') === expected;
};

serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const apifyToken = Deno.env.get('APIFY_API_TOKEN') || '';
  const experimentalEnabled = Deno.env.get('APIFY_EXPERIMENTAL_ENABLED') === 'true';
  const autoOnSignupEnabled = Deno.env.get('APIFY_AUTO_COLLECT_ON_SIGNUP_ENABLED') === 'true';

  if (!serviceRoleKey || !(authorizedServiceCall(request, serviceRoleKey) || authorizedWorkerCall(request))) {
    return json({ error: 'Authentication required' }, 401);
  }

  // O interruptor de desligamento age aqui, antes de qualquer leitura da
  // fila. Enquanto ele estiver desligado, linhas continuam sendo gravadas
  // pelo gatilho de banco (isso é grátis e não é o que gasta dinheiro), mas
  // nenhuma delas é reivindicada nem processada.
  if (!autoOnSignupEnabled || !experimentalEnabled || !apifyToken) {
    return json({ code: 'APIFY_AUTO_COLLECT_DISABLED', processed: 0, results: [] });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const now = new Date();
  const monthlyRunLimit = resolveMonthlyRunLimit();

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const batchSize = typeof body.batchSize === 'number' && Number.isFinite(body.batchSize)
    ? Math.max(1, Math.min(Math.trunc(body.batchSize), 25))
    : 5;

  const { data: claimed, error: claimError } = await admin.rpc('claim_apify_auto_collection', { batch_size: batchSize });
  if (claimError) return json({ error: 'Não foi possível reivindicar a fila de coleta automática.' }, 500);

  const rows = (claimed || []) as Array<{ user_id: string; google_review_url: string }>;
  const results: Array<{ userId: string; status: string; code?: string }> = [];

  for (const row of rows) {
    // Uma coleta por negócio, não por caminho: se o piloto manual (ou uma
    // automação anterior) já teve sucesso para este user_id, qualquer que
    // tenha sido a janela de tempo, este negócio já tem sua base de dados.
    // Gastar de novo aqui não agrega nada que a decisão de 30/08/2026 pediu.
    const { data: existingSuccess, error: existingError } = await admin.from('experimental_apify_runs')
      .select('id').eq('user_id', row.user_id).eq('status', 'succeeded')
      .order('completed_at', { ascending: false }).limit(1).maybeSingle();
    if (existingError) {
      results.push({ userId: row.user_id, status: 'requeued', code: 'APIFY_EXPERIMENTAL_LIMIT_CHECK_FAILED' });
      await admin.from('apify_auto_collection_queue').update({ status: 'queued', claimed_at: null }).eq('user_id', row.user_id);
      continue;
    }
    if (existingSuccess) {
      await admin.from('apify_auto_collection_queue').update({
        status: 'skipped_existing',
        processed_at: new Date().toISOString(),
        apify_run_id: existingSuccess.id,
        error_code: null,
      }).eq('user_id', row.user_id);
      results.push({ userId: row.user_id, status: 'skipped_existing' });
      continue;
    }

    const outcome = await runExperimentalApifyCollection({
      admin, userId: row.user_id, googleReviewUrl: row.google_review_url, apifyToken, monthlyRunLimit, now,
    });

    if (outcome.ok) {
      await admin.from('apify_auto_collection_queue').update({
        status: 'succeeded',
        processed_at: new Date().toISOString(),
        apify_run_id: outcome.runId,
        error_code: null,
      }).eq('user_id', row.user_id);
      results.push({ userId: row.user_id, status: 'succeeded' });
      continue;
    }

    // O teto mensal, a janela de 24 horas e uma reivindicação perdida para
    // outra chamada concorrente (índice único sobre 'started') são condições
    // transitórias: o negócio continua elegível, só não agora. A linha volta
    // para "queued" (sem marcar processed_at) para a próxima drenagem tentar
    // de novo, em vez de descartar para sempre uma coleta que o próprio
    // produto autoriza. Qualquer outro código de erro (token inválido, Apify
    // fora do ar, link que o Apify recusa) é definitivo: uma tentativa
    // automática por negócio, nunca um laço de novas tentativas gastando
    // repetidamente. Nenhum desses três códigos representa uma chamada ao
    // Apify que já aconteceu; todos rejeitam antes do `fetch` que cobra.
    const transient = outcome.code === 'APIFY_EXPERIMENTAL_COOLDOWN'
      || outcome.code === 'APIFY_EXPERIMENTAL_MONTHLY_LIMIT'
      || outcome.code === 'APIFY_EXPERIMENTAL_CLAIMED_ELSEWHERE';
    await admin.from('apify_auto_collection_queue').update({
      status: transient ? 'queued' : 'failed',
      claimed_at: null,
      processed_at: transient ? null : new Date().toISOString(),
      error_code: outcome.code,
    }).eq('user_id', row.user_id);
    results.push({ userId: row.user_id, status: transient ? 'requeued' : 'failed', code: outcome.code });
  }

  return json({ processed: results.length, results });
});
