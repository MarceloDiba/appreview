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
 * the Actor. `share.google` first lands on a Google Search knowledge card,
 * which the Actor does not accept as a start URL; in that one case we preserve
 * Google's search query and turn it into the equivalent Maps search URL.
 * Redirects remain constrained to Google-owned hosts so this is never an open
 * proxy for a supplied URL.
 */
const resolveGoogleMapsUrl = async (initialUrl: string): Promise<string> => {
  let currentUrl = initialUrl;
  for (let redirect = 0; redirect < 6; redirect += 1) {
    const response = await fetch(currentUrl, {
      method: 'GET',
      redirect: 'manual',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BinnoPilot/1.0)' },
    });
    const location = response.headers.get('location');
    if (!location) {
      const resolved = new URL(currentUrl);
      const searchQuery = resolved.hostname === 'www.google.com' && resolved.pathname === '/search'
        ? resolved.searchParams.get('q')?.trim()
        : null;
      if (searchQuery) {
        return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(searchQuery)}`;
      }
      return currentUrl;
    }
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

/**
 * This is not an identity. It is a short-lived, deterministic key used only
 * by the browser to preserve the pilot's local action state across a reload.
 * Raw actor payloads, avatars, reviewer IDs and profile URLs never leave the
 * worker. The short-lived browser response may include a public display name
 * and direct public review URL so the owner can respond to the right review.
 */
const observedReviewId = (review: Record<string, unknown>, index: number) => {
  const material = [
    numberInRange(review.stars),
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

const observedReviewsForBrowser = (reviews: Array<Record<string, unknown>>, now: Date) => {
  const items = reviews.flatMap((review, index) => {
    const comment = stringFrom(review, ['text', 'reviewText', 'reviewContent', 'comment']);
    const rating = numberInRange(review.stars);
    if (!comment || rating < 1 || rating > 5 || !Number.isInteger(rating)) return [];

    const publishedAt = dateFrom(review, ['publishedAtDate', 'reviewDate', 'reviewDateTime', 'date']);
    return [{
      id: observedReviewId(review, index),
      rating,
      comment,
      publishedAt: publishedAt?.toISOString() || null,
      reviewerName: publicReviewerName(review) || undefined,
      reviewUrl: (() => {
        return publicReviewUrl(review);
      })(),
      responseObserved: Boolean(stringFrom(review, ['responseFromOwnerText', 'ownerReplyText', 'responseText'])),
    }];
  });

  return {
    retentionEndsAt: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1_000).toISOString(),
    items,
  };
};

type TopicId = 'service' | 'wait' | 'food' | 'cleanliness' | 'price' | 'atmosphere' | 'delivery';
type TopicSignal = { id: TopicId; count: number; sentiment: 'positive' | 'negative' | 'mixed' };

const topicMatchers: Array<{ id: TopicId; words: string[] }> = [
  { id: 'service', words: ['atendimento', 'atencao', 'atencion', 'service', 'staff', 'waiter', 'friendly'] },
  { id: 'wait', words: ['espera', 'demora', 'wait', 'waiting', 'slow', 'lento'] },
  { id: 'food', words: ['comida', 'prato', 'food', 'meal', 'dish', 'cozinha', 'kitchen'] },
  { id: 'cleanliness', words: ['limpeza', 'limpio', 'clean', 'dirty', 'higiene', 'hygiene'] },
  { id: 'price', words: ['preco', 'price', 'caro', 'expensive', 'valor'] },
  { id: 'atmosphere', words: ['ambiente', 'atmosphere', 'barulho', 'noise', 'musica', 'music'] },
  { id: 'delivery', words: ['entrega', 'delivery', 'pedido', 'order', 'takeaway'] },
];

const stringFrom = (item: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const value = item[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
};

const nestedPublicString = (item: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const value = item[key];
    if (!value || typeof value !== 'object') continue;
    const nested = value as Record<string, unknown>;
    for (const candidate of ['displayName', 'name', 'fullName']) {
      if (typeof nested[candidate] === 'string' && nested[candidate].trim()) return nested[candidate].trim();
    }
  }
  return null;
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

const dateFrom = (item: Record<string, unknown>, keys: string[]) => {
  const value = stringFrom(item, keys);
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const startOfWeek = (value: Date) => {
  const date = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  const weekday = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - weekday + 1);
  return date;
};

const collectWeeklyHistory = (reviews: Array<Record<string, unknown>>, now: Date) => {
  const currentWeek = startOfWeek(now);
  const weeks = Array.from({ length: 12 }, (_, index) => {
    const start = new Date(currentWeek);
    start.setUTCDate(start.getUTCDate() - ((11 - index) * 7));
    return {
      start: start.toISOString(),
      reviewCount: 0,
      ratingBreakdown: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
      ownerReplies: 0,
    };
  });
  const byWeek = new Map(weeks.map((week) => [week.start.slice(0, 10), week]));

  for (const review of reviews) {
    const reviewDate = dateFrom(review, ['publishedAtDate', 'reviewDate', 'reviewDateTime', 'date']);
    const stars = numberInRange(review.stars);
    if (reviewDate && stars >= 1 && stars <= 5 && Number.isInteger(stars)) {
      const target = byWeek.get(startOfWeek(reviewDate).toISOString().slice(0, 10));
      if (target) {
        target.reviewCount += 1;
        target.ratingBreakdown[String(stars) as keyof typeof target.ratingBreakdown] += 1;
      }
    }
    const replyDate = dateFrom(review, ['responseFromOwnerDate', 'responseDate', 'ownerReplyDate']);
    if (replyDate) {
      const target = byWeek.get(startOfWeek(replyDate).toISOString().slice(0, 10));
      if (target) target.ownerReplies += 1;
    }
  }
  return { weeks };
};

const collectInsights = (reviews: Array<Record<string, unknown>>, now: Date) => {
  const topics = new Map<TopicId, { positive: number; negative: number }>();
  const responseHours: number[] = [];
  let datedReviews = 0;
  let reviewsLast30Days = 0;
  const since = now.getTime() - 30 * 24 * 60 * 60 * 1_000;

  for (const review of reviews) {
    const reviewDate = dateFrom(review, ['publishedAtDate', 'reviewDate', 'reviewDateTime', 'date']);
    if (reviewDate) {
      datedReviews += 1;
      if (reviewDate.getTime() >= since) reviewsLast30Days += 1;
    }

    const replyDate = dateFrom(review, ['responseFromOwnerDate', 'responseDate', 'ownerReplyDate']);
    if (reviewDate && replyDate && replyDate.getTime() >= reviewDate.getTime()) {
      responseHours.push((replyDate.getTime() - reviewDate.getTime()) / 3_600_000);
    }

    const text = stringFrom(review, ['text', 'reviewText', 'reviewContent', 'comment']);
    if (!text) continue;
    const normalized = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const positive = numberInRange(review.stars) >= 4;
    for (const topic of topicMatchers) {
      if (!topic.words.some((word) => normalized.includes(word))) continue;
      const current = topics.get(topic.id) || { positive: 0, negative: 0 };
      if (positive) current.positive += 1;
      else current.negative += 1;
      topics.set(topic.id, current);
    }
  }

  const topicSignals: TopicSignal[] = [...topics.entries()]
    .map(([id, counts]) => ({
      id,
      count: counts.positive + counts.negative,
      sentiment: counts.positive > counts.negative ? 'positive' : counts.negative > counts.positive ? 'negative' : 'mixed',
    }))
    .sort((a, b) => b.count - a.count || a.id.localeCompare(b.id))
    .slice(0, 6);

  return {
    reviewsLast30Days: datedReviews ? reviewsLast30Days : null,
    averageResponseHours: responseHours.length ? Math.round((responseHours.reduce((sum, hours) => sum + hours, 0) / responseHours.length) * 10) / 10 : null,
    history: collectWeeklyHistory(reviews, now),
    topics: topicSignals,
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
    // A failed transport/authentication attempt must not lock the manager out
    // for 24 hours. Only a completed collection consumes the daily interval.
    admin.from('experimental_apify_runs').select('id').eq('user_id', user.id).eq('google_review_url', googleReviewUrl).eq('status', 'succeeded').gte('requested_at', dayAgo).limit(1).maybeSingle(),
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
    // Apify's Actor endpoint authenticates this call through its server-side
    // `token` parameter. The token never reaches the browser or persisted
    // audit record; it stays inside this Edge Function request.
    actorUrl.searchParams.set('token', apifyToken);
    actorUrl.searchParams.set('timeout', '240');
    actorUrl.searchParams.set('maxItems', '50');
    actorUrl.searchParams.set('clean', 'true');
    const apifyResponse = await fetch(actorUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startUrls: [{ url: actorInputUrl }],
        maxReviews: 50,
        reviewsSort: 'newest',
        reviewsOrigin: 'google',
        // The pilot needs the public display name and public review URL to
        // identify the selected review to the business owner. They are only
        // returned to that authenticated browser for 14 days and are never
        // written to the audit table or any profile cache.
        personalData: true,
      }),
    });
    const actorPayload: unknown = await apifyResponse.json().catch(() => null);
    if (!apifyResponse.ok || !Array.isArray(actorPayload)) {
      const errorCodeByStatus: Record<number, string> = {
        401: 'APIFY_UNAUTHORIZED',
        403: 'APIFY_FORBIDDEN',
        429: 'APIFY_RATE_LIMITED',
      };
      throw new Error(errorCodeByStatus[apifyResponse.status] || 'APIFY_REQUEST_FAILED');
    }

    const reviews = actorPayload.filter((item): item is Record<string, unknown> => {
      if (!item || typeof item !== 'object') return false;
      const origin = (item as Record<string, unknown>).reviewOrigin;
      return typeof origin === 'string' && origin.toLowerCase() === 'google';
    }).slice(0, 50);
    if (!reviews.length) throw new Error('APIFY_NO_GOOGLE_REVIEWS');

    const first = reviews[0];
    const aggregateSnapshot = {
      source: 'apify-experimental' as const,
      fetchedAt: now.toISOString(),
      business: {
        name: typeof first.title === 'string' ? first.title : 'Negócio no Google',
        address: typeof first.address === 'string' ? first.address : '',
        placeId: typeof first.placeId === 'string' ? first.placeId : '',
        googleRating: numberInRange(first.totalScore),
        googleReviewCount: Math.max(0, Math.trunc(numberInRange(first.reviewsCount))),
        googleReviewUrl,
      },
      sample: {
        reviewCount: reviews.length,
        ratingBreakdown: ratingBreakdown(reviews),
        ownerRepliesFound: reviews.filter((review) => typeof review.responseFromOwnerText === 'string' && review.responseFromOwnerText.trim().length > 0).length,
        insights: collectInsights(reviews, now),
      },
    };
    const browserSnapshot = {
      ...aggregateSnapshot,
      sample: {
        ...aggregateSnapshot.sample,
        observedReviews: observedReviewsForBrowser(reviews, now),
      },
    };
    await admin.from('experimental_apify_runs').update({
      status: 'succeeded',
      completed_at: new Date().toISOString(),
      result_summary: aggregateSnapshot,
    }).eq('id', audit.id);
    return json({ snapshot: browserSnapshot });
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
