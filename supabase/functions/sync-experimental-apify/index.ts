import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  corsHeaders,
  json,
  nestedPublicString,
  parseGoogleUrl,
  resolveMonthlyRunLimit,
  runExperimentalApifyCollection,
  stringFrom,
} from '../_shared/experimentalApifyCollection.ts';

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
const observedReviewId = (review: Record<string, unknown>, index: number) => {
  const material = [
    typeof review.stars === 'number' ? review.stars : 0,
    stringFrom(review, ['publishedAtDate', 'reviewDate', 'reviewDateTime', 'date']) || '',
    stringFrom(review, ['text', 'reviewText', 'reviewContent', 'comment']) || '',
    index,
  ].join('|');
  let hash = 2_166_136_261;
  for (let position = 0; position < material.length; position += 1) {
    hash ^= material.charCodeAt(position);
    hash = Math.imul(hash, 16_777_619);
  }
  return `apify-${(hash >>> 0).toString(36)}`;
};

const publicReviewerName = (review: Record<string, unknown>) =>
  // Compass returns the reviewer's public display name as `name`. It is safe
  // here because this function is scoped to that review record; the place
  // itself is exposed separately as `title`.
  stringFrom(review, ['reviewerName', 'authorName', 'reviewerDisplayName', 'name'])
  || nestedPublicString(review, ['reviewer', 'author', 'user']);

const publicReviewUrl = (review: Record<string, unknown>) => {
  // `url` can identify the place rather than this individual review. Only
  // accept fields documented as a review permalink so the action never opens
  // the business profile while claiming to open the selected review.
  const candidate = stringFrom(review, ['reviewUrl', 'reviewURL', 'reviewLink', 'reviewUri']);
  return candidate && parseGoogleUrl(candidate) ? candidate : undefined;
};

const observedReviewsForBrowser = (reviews: Array<Record<string, unknown>>, now: Date) => {
  const items = reviews.flatMap((review, index) => {
    const comment = stringFrom(review, ['text', 'reviewText', 'reviewContent', 'comment']);
    const rating = typeof review.stars === 'number' ? review.stars : 0;
    if (!comment || rating < 1 || rating > 5 || !Number.isInteger(rating)) return [];

    const publishedAt = stringFrom(review, ['publishedAtDate', 'reviewDate', 'reviewDateTime', 'date']);
    return [{
      id: observedReviewId(review, index),
      rating,
      comment,
      publishedAt: publishedAt ? new Date(publishedAt).toISOString() : null,
      reviewerName: publicReviewerName(review) || undefined,
      reviewUrl: publicReviewUrl(review),
      responseObserved: Boolean(stringFrom(review, ['responseFromOwnerText', 'ownerReplyText', 'responseText'])),
    }];
  });

  return {
    retentionEndsAt: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1_000).toISOString(),
    items,
  };
};

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

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const googleReviewUrl = parseGoogleUrl(body.google_review_url);
  if (!googleReviewUrl) return json({ error: 'Informe um link público válido do Google.' }, 422);

  const admin = createClient(supabaseUrl, serviceRoleKey);
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
      observedReviews: observedReviewsForBrowser(outcome.reviews, now),
    },
  };
  return json({ snapshot: browserSnapshot });
});
