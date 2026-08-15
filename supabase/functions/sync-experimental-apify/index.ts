import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

const googleHosts = new Set([
  'google.com', 'www.google.com', 'maps.google.com', 'g.page', 'maps.app.goo.gl', 'goo.gl', 'share.google',
  'google.com.br', 'www.google.com.br', 'maps.google.com.br', 'google.pt', 'www.google.pt', 'maps.google.pt',
]);

const parseGoogleUrl = (value: unknown): string | null => {
  if (typeof value !== 'string' || value.length > 2_000) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' && googleHosts.has(url.hostname.toLowerCase()) ? url.toString() : null;
  } catch {
    return null;
  }
};

/**
 * Google share and g.page links need to become a Maps URL before they reach
 * the Actor. Redirects remain constrained to Google-owned hosts so this is
 * never an open proxy for a supplied URL.
 */
const resolveGoogleMapsUrl = async (initialUrl: string): Promise<string> => {
  let currentUrl = initialUrl;
  for (let redirect = 0; redirect < 6; redirect += 1) {
    const response = await fetch(currentUrl, { method: 'HEAD', redirect: 'manual' });
    const location = response.headers.get('location');
    if (!location) return currentUrl;
    const nextUrl = new URL(location, currentUrl).toString();
    if (!parseGoogleUrl(nextUrl)) throw new Error('APIFY_GOOGLE_URL_NOT_RESOLVED');
    currentUrl = nextUrl;
  }
  return currentUrl;
};

const numberInRange = (value: unknown, fallback = 0) =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const ratingBreakdown = (reviews: Array<Record<string, unknown>>) => {
  const counts: Record<'1' | '2' | '3' | '4' | '5', number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
  for (const review of reviews) {
    const stars = numberInRange(review.stars);
    if (stars >= 1 && stars <= 5 && Number.isInteger(stars)) counts[String(stars) as keyof typeof counts] += 1;
  }
  return counts;
};

serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const apifyToken = Deno.env.get('APIFY_API_TOKEN') || '';
  const enabled = Deno.env.get('APIFY_EXPERIMENTAL_ENABLED') === 'true';
  const configuredMonthlyLimit = Number(Deno.env.get('APIFY_EXPERIMENTAL_MONTHLY_RUN_LIMIT') || '10');
  const monthlyRunLimit = Number.isFinite(configuredMonthlyLimit)
    ? Math.max(1, Math.min(configuredMonthlyLimit, 100))
    : 10;
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
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1_000).toISOString();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();

  const [{ data: recentRun, error: recentError }, { count: monthlyCount, error: monthlyError }] = await Promise.all([
    admin.from('experimental_apify_runs').select('id').eq('user_id', user.id).eq('google_review_url', googleReviewUrl).gte('requested_at', dayAgo).limit(1).maybeSingle(),
    admin.from('experimental_apify_runs').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('requested_at', monthStart),
  ]);
  if (recentError || monthlyError) return json({ error: 'Não foi possível aplicar os limites da coleta experimental.' }, 500);
  if (recentRun) return json({ code: 'APIFY_EXPERIMENTAL_COOLDOWN', error: 'Este negócio já teve uma coleta experimental nas últimas 24 horas.' }, 429);
  if ((monthlyCount || 0) >= monthlyRunLimit) return json({ code: 'APIFY_EXPERIMENTAL_MONTHLY_LIMIT', error: 'O limite mensal de coletas experimentais foi alcançado.' }, 429);

  const { data: audit, error: auditError } = await admin.from('experimental_apify_runs').insert({
    user_id: user.id,
    google_review_url: googleReviewUrl,
    status: 'started',
  }).select('id').single();
  if (auditError || !audit) return json({ error: 'Não foi possível iniciar a coleta experimental.' }, 500);

  try {
    const actorInputUrl = await resolveGoogleMapsUrl(googleReviewUrl);
    const actorUrl = new URL('https://api.apify.com/v2/acts/compass~google-maps-reviews-scraper/run-sync-get-dataset-items');
    actorUrl.searchParams.set('timeout', '240');
    actorUrl.searchParams.set('maxItems', '50');
    actorUrl.searchParams.set('clean', 'true');
    const apifyResponse = await fetch(actorUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apifyToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startUrls: [{ url: actorInputUrl }],
        maxReviews: 50,
        reviewsSort: 'newest',
        reviewsOrigin: 'google',
        personalData: false,
      }),
    });
    const actorPayload: unknown = await apifyResponse.json().catch(() => null);
    if (!apifyResponse.ok || !Array.isArray(actorPayload)) {
      throw new Error('APIFY_REQUEST_FAILED');
    }

    const reviews = actorPayload.filter((item): item is Record<string, unknown> => {
      if (!item || typeof item !== 'object') return false;
      const origin = (item as Record<string, unknown>).reviewOrigin;
      return typeof origin === 'string' && origin.toLowerCase() === 'google';
    }).slice(0, 50);
    if (!reviews.length) throw new Error('APIFY_NO_GOOGLE_REVIEWS');

    const first = reviews[0];
    const snapshot = {
      source: 'apify-experimental' as const,
      fetchedAt: now.toISOString(),
      business: {
        name: typeof first.title === 'string' ? first.title : 'Negócio no Google',
        address: typeof first.address === 'string' ? first.address : '',
        placeId: typeof first.placeId === 'string' ? first.placeId : '',
        googleRating: numberInRange(first.totalScore),
        googleReviewCount: Math.max(0, Math.trunc(numberInRange(first.reviewsCount))),
      },
      sample: {
        reviewCount: reviews.length,
        ratingBreakdown: ratingBreakdown(reviews),
        ownerRepliesFound: reviews.filter((review) => typeof review.responseFromOwnerText === 'string' && review.responseFromOwnerText.trim().length > 0).length,
      },
    };
    await admin.from('experimental_apify_runs').update({
      status: 'succeeded',
      completed_at: new Date().toISOString(),
      result_summary: snapshot,
    }).eq('id', audit.id);
    return json({ snapshot });
  } catch (error) {
    const errorCode = error instanceof Error && /^APIFY_[A-Z_]+$/.test(error.message) ? error.message : 'APIFY_REQUEST_FAILED';
    await admin.from('experimental_apify_runs').update({
      status: 'failed',
      completed_at: new Date().toISOString(),
      error_code: errorCode,
    }).eq('id', audit.id);
    return json({ code: errorCode, error: 'Não foi possível concluir a coleta experimental agora.' }, 502);
  }
});
