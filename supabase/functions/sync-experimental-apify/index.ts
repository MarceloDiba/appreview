import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  corsHeaders,
  json,
  montarFilaDeRespostas,
  parseGoogleUrl,
  resolveMonthlyRunLimit,
  runExperimentalApifyCollection,
} from '../_shared/experimentalApifyCollection.ts';
import { temAcesso } from '../_shared/acesso.ts';

/**
 * Piloto assistido, manual: o dono aperta o botão, esta função devolve uma
 * amostra pública e uma fila efêmera (nome público + link de avaliação) só
 * para o navegador autenticado responder no Google. As regras de negócio
 * (janela de 24 horas, teto mensal, auditoria) vivem em
 * `../_shared/experimentalApifyCollection.ts`, partilhadas com a coleta
 * automática do cadastro (`apify-auto-collect-on-signup`). Esta função nunca
 * decide o limite sozinha; ela só chama quem decide.
 */

/**
 * This is not an identity. It is a short-lived, deterministic key used only
 * by the browser to preserve the pilot's local action state across a reload.
 * Raw actor payloads, avatars, reviewer IDs and profile URLs never leave the
 * worker. The short-lived browser response may include a public display name
 * and direct public review URL so the owner can respond to the right review.
 */
serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const apifyToken = Deno.env.get('APIFY_API_TOKEN') || '';
  const enabled = Deno.env.get('APIFY_EXPERIMENTAL_ENABLED') === 'true';
  const monthlyRunLimit = resolveMonthlyRunLimit();
  const authorization = request.headers.get('Authorization');

  if (!enabled || !apifyToken || !serviceRoleKey) {
    return json({ code: 'APIFY_EXPERIMENTAL_DISABLED', error: 'A coleta experimental ainda não está ativada.' }, 503);
  }
  if (!authorization) return json({ error: 'Authentication required' }, 401);

  const caller = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } });
  const { data: { user }, error: userError } = await caller.auth.getUser();
  if (userError || !user) return json({ error: 'Invalid session' }, 401);

  const admin = createClient(supabaseUrl, serviceRoleKey);

  /**
   * SO USA QUEM PAGA, e ANTES de olhar para o corpo do pedido.
   *
   * Ficou depois da validacao na primeira tentativa, e o teste em producao
   * apanhou: quem nao paga recebia "informe um link valido" em vez de "sua
   * assinatura nao esta ativa". Nao gastava dinheiro, mas dizia a um estranho
   * o que o produto espera receber — e escondia do dono a razao real da
   * recusa. A porta vem antes da tranca.
   */
  if (!await temAcesso(admin, user.id)) {
    return json({ code: 'SEM_ASSINATURA', error: 'Sua assinatura nao esta ativa.' }, 402);
  }

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const googleReviewUrl = parseGoogleUrl(body.google_review_url);
  if (!googleReviewUrl) return json({ error: 'Informe um link público válido do Google.' }, 422);

  const now = new Date();

  const outcome = await runExperimentalApifyCollection({
    admin, userId: user.id, googleReviewUrl, apifyToken, monthlyRunLimit, now,
  });
  if (!outcome.ok) return json({ code: outcome.code, error: outcome.message }, outcome.status);

  const browserSnapshot = {
    ...outcome.aggregateSnapshot,
    sample: {
      ...outcome.aggregateSnapshot.sample,
      ...(Object.keys(outcome.advisor).length ? { advisor: outcome.advisor } : {}),
      observedReviews: montarFilaDeRespostas(outcome.reviews, now),
    },
  };
  return json({ snapshot: browserSnapshot });
});
