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
 * Esta função só lê essa fila e gasta com o Apify. Alguém ainda precisa
 * agendar a sua execução (pg_cron, Supabase Scheduled Function ou um cron
 * externo apontando para esta URL); isso não está incluído aqui de propósito,
 * pois a primeira execução real é decisão de Marcelo, não deste código.
 *
 * INTERRUPTOR DE DESLIGAMENTO
 *
 * `APIFY_AUTO_COLLECT_ON_SIGNUP_ENABLED` é o interruptor exclusivo desta
 * automação. Ele é independente de `APIFY_EXPERIMENTAL_ENABLED` (que liga o
 * piloto manual inteiro): quando o acesso Basic ao Google Business Profile
 * for aprovado, a coleta automática se desliga girando só este segredo para
 * `false` (ou removendo-o) nos segredos da Edge Function, sem tocar em código
 * e sem afetar o botão manual do piloto assistido, que pode continuar a
 * existir por mais tempo como ferramenta de diagnóstico. Sem esse segredo em
 * `true`, esta função nunca reivindica uma linha da fila nem gasta um
 * centavo: só responde com `processed: 0`.
 */

const authorizedServiceCall = (request: Request, serviceRoleKey: string) => {
  const authorization = request.headers.get('Authorization') || '';
  const token = authorization.replace(/^Bearer\s+/i, '').trim();
  return Boolean(serviceRoleKey) && token === serviceRoleKey;
};

serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const apifyToken = Deno.env.get('APIFY_API_TOKEN') || '';
  const experimentalEnabled = Deno.env.get('APIFY_EXPERIMENTAL_ENABLED') === 'true';
  const autoOnSignupEnabled = Deno.env.get('APIFY_AUTO_COLLECT_ON_SIGNUP_ENABLED') === 'true';

  if (!serviceRoleKey || !authorizedServiceCall(request, serviceRoleKey)) {
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

    // O teto mensal e a janela de 24 horas são condições transitórias: o
    // negócio continua elegível, só não agora. A linha volta para "queued"
    // (sem marcar processed_at) para a próxima drenagem tentar de novo, em
    // vez de descartar para sempre uma coleta que o próprio produto autoriza.
    // Qualquer outro código de erro (token inválido, Apify fora do ar, link
    // que o Apify recusa) é definitivo: uma tentativa automática por negócio,
    // nunca um laço de novas tentativas gastando repetidamente.
    const transient = outcome.code === 'APIFY_EXPERIMENTAL_COOLDOWN' || outcome.code === 'APIFY_EXPERIMENTAL_MONTHLY_LIMIT';
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
