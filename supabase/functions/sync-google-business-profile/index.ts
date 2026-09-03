import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const rating = (value?: string) => ({ ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 }[value || ""] || 0);

type StoredReview = {
  rating: number;
  comment: string | null;
  review_created_at: string | null;
  reply_text: string | null;
  reply_updated_at: string | null;
};

type TopicId = 'service' | 'wait' | 'food' | 'cleanliness' | 'price' | 'atmosphere' | 'delivery';

const topicMatchers: Array<{ id: TopicId; words: string[] }> = [
  { id: 'service', words: ['atendimento', 'atencao', 'atencion', 'service', 'staff', 'waiter', 'friendly'] },
  { id: 'wait', words: ['espera', 'demora', 'wait', 'waiting', 'slow', 'lento'] },
  { id: 'food', words: ['comida', 'prato', 'food', 'meal', 'dish', 'cozinha', 'kitchen'] },
  { id: 'cleanliness', words: ['limpeza', 'limpio', 'clean', 'dirty', 'higiene', 'hygiene'] },
  { id: 'price', words: ['preco', 'price', 'caro', 'expensive', 'valor'] },
  { id: 'atmosphere', words: ['ambiente', 'atmosphere', 'barulho', 'noise', 'musica', 'music'] },
  { id: 'delivery', words: ['entrega', 'delivery', 'pedido', 'order', 'takeaway'] },
];

const validDate = (value: string | null) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

/**
 * Keep the historic reading aggregate-only. The raw review table is already
 * owner-only, but snapshots must never duplicate review text or reviewer data.
 */
const summarizeOfficialReviews = (reviews: StoredReview[], now: Date) => {
  const breakdown: Record<'1' | '2' | '3' | '4' | '5', number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
  const topics = new Map<TopicId, { positive: number; negative: number }>();
  const responseHours: number[] = [];
  const since = now.getTime() - 30 * 24 * 60 * 60 * 1_000;
  let reviewsLast30Days = 0;
  let unansweredReviewCount = 0;

  for (const review of reviews) {
    if (review.rating >= 1 && review.rating <= 5) {
      breakdown[String(review.rating) as keyof typeof breakdown] += 1;
    }
    if (!review.reply_text?.trim()) unansweredReviewCount += 1;

    const reviewDate = validDate(review.review_created_at);
    const replyDate = validDate(review.reply_updated_at);
    if (reviewDate && reviewDate.getTime() >= since) reviewsLast30Days += 1;
    if (reviewDate && replyDate && replyDate.getTime() >= reviewDate.getTime()) {
      responseHours.push((replyDate.getTime() - reviewDate.getTime()) / 3_600_000);
    }

    if (!review.comment) continue;
    const normalized = review.comment.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    for (const topic of topicMatchers) {
      if (!topic.words.some((word) => normalized.includes(word))) continue;
      const current = topics.get(topic.id) || { positive: 0, negative: 0 };
      if (review.rating >= 4) current.positive += 1;
      else current.negative += 1;
      topics.set(topic.id, current);
    }
  }

  const topicSummary = [...topics.entries()]
    .map(([id, counts]) => ({
      id,
      count: counts.positive + counts.negative,
      sentiment: counts.positive > counts.negative ? 'positive' : counts.negative > counts.positive ? 'negative' : 'mixed',
    }))
    .sort((left, right) => right.count - left.count || left.id.localeCompare(right.id))
    .slice(0, 6);

  return {
    ratingBreakdown: breakdown,
    unansweredReviewCount,
    reviewsLast30Days,
    averageResponseHours: responseHours.length
      ? Math.round((responseHours.reduce((sum, hours) => sum + hours, 0) / responseHours.length) * 10) / 10
      : null,
    topics: topicSummary,
  };
};

/**
 * O motivo REAL da recusa do Google, e nao so um 502 mudo.
 *
 * Ate 03/09/2026 esta funcao devolvia a mensagem no corpo da resposta e nao a
 * registava em lado nenhum. Marcelo carregou em "Buscar locais", viu um aviso
 * generico na tela, e o servidor tinha a resposta exacta do Google — que
 * ninguem conseguia ler sem a sessao dele. Um `502` sem motivo obriga a
 * adivinhar, e adivinhar em cima de uma API com cinco servicos separados e
 * caro.
 *
 * `status` e `service` entram no log porque distinguem as duas causas mais
 * provaveis: 403 com SERVICE_DISABLED e "falta activar a API no Console"; 404
 * no `mybusiness.googleapis.com/v4` e "este endereco foi desligado pelo
 * Google". Sao consertos completamente diferentes.
 */
const googleError = async (response: Response, onde: string) => {
  const texto = await response.text().catch(() => "");
  let mensagem = "Google Business Profile request failed";
  try {
    const body = JSON.parse(texto) as { error?: { message?: string; status?: string } };
    mensagem = body.error?.message || mensagem;
    console.error(
      "Google recusou em %s: HTTP %s | status %s | %s",
      onde, response.status, body.error?.status || "?", mensagem,
    );
  } catch {
    console.error("Google recusou em %s: HTTP %s | corpo nao e JSON: %s", onde, response.status, texto.slice(0, 300));
  }
  return mensagem;
};

serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const clientId = Deno.env.get("GOOGLE_OAUTH_CLIENT_ID") || "";
  const clientSecret = Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET") || "";
  const authorization = request.headers.get("Authorization");
  if (!serviceRoleKey || !clientId || !clientSecret) {
    return json({ code: "GOOGLE_OAUTH_NOT_CONFIGURED", error: "Google Business Profile connection is not configured" }, 503);
  }
  if (!authorization) return json({ error: "Authentication required" }, 401);

  const caller = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } });
  const { data: { user }, error: userError } = await caller.auth.getUser();
  if (userError || !user) return json({ error: "Invalid session" }, 401);

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const action = typeof body.action === "string" ? body.action : "";
  const admin = createClient(supabaseUrl, serviceRoleKey);
  const { data: refreshToken, error: tokenError } = await admin.rpc("read_google_business_refresh_token", { p_user_id: user.id });
  if (tokenError || !refreshToken) return json({ code: "GOOGLE_CONNECTION_REQUIRED", error: "Connect Google Business Profile first" }, 409);

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
  });
  const tokenPayload = await tokenResponse.json().catch(() => ({})) as { access_token?: string; error?: string };
  if (!tokenResponse.ok || !tokenPayload.access_token) {
    await admin.from("google_business_connections")
      .update({ status: "revoked", last_error: tokenPayload.error || "Could not refresh Google authorization" })
      .eq("user_id", user.id);
    return json({ code: "GOOGLE_CONNECTION_EXPIRED", error: "Reconnect Google Business Profile" }, 401);
  }
  const googleHeaders = { Authorization: `Bearer ${tokenPayload.access_token}` };

  if (action === "list-locations") {
    const accounts: Array<{ name?: string }> = [];
    let accountPageToken = "";
    do {
      const accountsUrl = new URL("https://mybusinessaccountmanagement.googleapis.com/v1/accounts");
      accountsUrl.searchParams.set("pageSize", "20");
      if (accountPageToken) accountsUrl.searchParams.set("pageToken", accountPageToken);
      const accountsResponse = await fetch(accountsUrl, { headers: googleHeaders });
      if (!accountsResponse.ok) return json({ error: await googleError(accountsResponse, "listar contas") }, 502);
      const accountsPayload = await accountsResponse.json() as { accounts?: Array<{ name?: string }>; nextPageToken?: string };
      accounts.push(...(accountsPayload.accounts || []));
      accountPageToken = accountsPayload.nextPageToken || "";
    } while (accountPageToken);
    const locations: Array<Record<string, unknown>> = [];

    for (const account of accounts) {
      if (!account.name) continue;
      let pageToken = "";
      do {
        const locationsUrl = new URL(`https://mybusiness.googleapis.com/v4/${account.name}/locations`);
        locationsUrl.searchParams.set("pageSize", "100");
        if (pageToken) locationsUrl.searchParams.set("pageToken", pageToken);
        const response = await fetch(locationsUrl, { headers: googleHeaders });
        if (!response.ok) return json({ error: await googleError(response, "listar locais") }, 502);
        const payload = await response.json() as { locations?: Array<Record<string, unknown>>; nextPageToken?: string };
        locations.push(...(payload.locations || []).map((location) => ({ ...location, account_name: account.name })));
        pageToken = payload.nextPageToken || "";
      } while (pageToken);
    }

    const rows = locations.flatMap((location) => {
      const locationName = typeof location.name === "string" ? location.name : "";
      const accountName = typeof location.account_name === "string" ? location.account_name : "";
      if (!locationName || !accountName) return [];
      return [{
        user_id: user.id,
        account_name: accountName,
        location_name: locationName,
        title: typeof location.locationName === "string" ? location.locationName : locationName,
        store_code: typeof location.storeCode === "string" ? location.storeCode : null,
        place_id: typeof (location.metadata as { placeId?: unknown } | undefined)?.placeId === "string"
          ? (location.metadata as { placeId: string }).placeId
          : null,
      }];
    });
    if (rows.length) {
      const { error } = await admin.from("google_business_locations").upsert(rows, { onConflict: "user_id,location_name" });
      if (error) return json({ error: "Could not save available locations" }, 500);
    }
    return json({ locations: rows });
  }

  if (action === "select-location") {
    const locationId = typeof body.location_id === "string" ? body.location_id : "";
    const { data: location } = await admin.from("google_business_locations")
      .select("id, title, location_name")
      .eq("id", locationId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!location) return json({ error: "Location not found" }, 404);
    await admin.from("google_business_locations").update({ is_selected: false }).eq("user_id", user.id).eq("is_selected", true);
    const { error } = await admin.from("google_business_locations").update({ is_selected: true }).eq("id", location.id);
    if (error) return json({ error: "Could not select location" }, 500);
    return json({ location });
  }

  const { data: location } = await admin.from("google_business_locations")
    .select("id, location_name, review_sync_cursor")
    .eq("user_id", user.id)
    .eq("is_selected", true)
    .maybeSingle();
  if (!location) return json({ error: "Select a Google Business Profile location first" }, 409);

  if (action === "sync-reviews") {
    const pageToken = typeof body.page_token === "string" ? body.page_token : location.review_sync_cursor || "";
    const reviewsUrl = new URL(`https://mybusiness.googleapis.com/v4/${location.location_name}/reviews`);
    reviewsUrl.searchParams.set("pageSize", "50");
    reviewsUrl.searchParams.set("orderBy", "updateTime desc");
    if (pageToken) reviewsUrl.searchParams.set("pageToken", pageToken);
    const response = await fetch(reviewsUrl, { headers: googleHeaders });
    if (!response.ok) return json({ error: await googleError(response, "buscar avaliacoes") }, 502);
    const payload = await response.json() as {
      reviews?: Array<Record<string, unknown>>;
      nextPageToken?: string;
      totalReviewCount?: number;
      averageRating?: number;
    };
    const rows = (payload.reviews || []).flatMap((review) => {
      const reviewName = typeof review.name === "string" ? review.name : "";
      const starRating = rating(typeof review.starRating === "string" ? review.starRating : undefined);
      if (!reviewName || !starRating) return [];
      const reviewer = (review.reviewer || {}) as Record<string, unknown>;
      const reply = (review.reviewReply || {}) as Record<string, unknown>;
      return [{
        user_id: user.id,
        location_id: location.id,
        google_review_name: reviewName,
        reviewer_name: typeof reviewer.displayName === "string" ? reviewer.displayName : null,
        reviewer_photo_url: typeof reviewer.profilePhotoUrl === "string" ? reviewer.profilePhotoUrl : null,
        is_anonymous: reviewer.isAnonymous === true,
        rating: starRating,
        comment: typeof review.comment === "string" ? review.comment : null,
        review_created_at: typeof review.createTime === "string" ? review.createTime : null,
        review_updated_at: typeof review.updateTime === "string" ? review.updateTime : null,
        reply_text: typeof reply.comment === "string" ? reply.comment : null,
        reply_updated_at: typeof reply.updateTime === "string" ? reply.updateTime : null,
        reply_state: typeof reply.reviewReplyState === "string" ? reply.reviewReplyState : null,
        synced_at: new Date().toISOString(),
      }];
    });
    if (rows.length) {
      const { error } = await admin.from("google_business_reviews")
        .upsert(rows, { onConflict: "location_id,google_review_name" });
      if (error) return json({ error: "Could not store Google reviews" }, 500);
    }
    const nextPageToken = payload.nextPageToken || null;
    await admin.from("google_business_locations").update({
      review_sync_cursor: nextPageToken,
      review_sync_completed_at: nextPageToken ? null : new Date().toISOString(),
      last_synced_at: new Date().toISOString(),
    }).eq("id", location.id);
    await admin.from("google_business_connections").update({ last_synced_at: new Date().toISOString(), last_error: null }).eq("user_id", user.id);

    // Only a completed pagination can establish an official reading. Store a
    // compact snapshot once the queue is complete, never on a partial page.
    let snapshotWarning: string | null = null;
    if (!nextPageToken) {
      const { data: storedReviews, error: storedReviewsError } = await admin
        .from("google_business_reviews")
        .select("rating, comment, review_created_at, reply_text, reply_updated_at")
        .eq("location_id", location.id);
      if (storedReviewsError) {
        snapshotWarning = "Could not summarize the reputation snapshot";
      } else {

        const now = new Date();
        const summary = summarizeOfficialReviews((storedReviews || []) as StoredReview[], now);
        const reviewCount = (storedReviews || []).length;
        const calculatedAverage = reviewCount
          ? Math.round(((storedReviews || []).reduce((sum, review) => sum + review.rating, 0) / reviewCount) * 10) / 10
          : 0;
        const totalReviews = typeof payload.totalReviewCount === 'number'
          ? Math.max(0, Math.trunc(payload.totalReviewCount))
          : reviewCount;
        const averageRating = typeof payload.averageRating === 'number' && payload.averageRating >= 0 && payload.averageRating <= 5
          ? Math.round(payload.averageRating * 10) / 10
          : calculatedAverage;
        const { error: snapshotError } = await admin.from("google_business_reputation_snapshots").insert({
          user_id: user.id,
          location_id: location.id,
          captured_at: now.toISOString(),
          total_reviews: totalReviews,
          average_rating: averageRating,
          rating_breakdown: summary.ratingBreakdown,
          unanswered_review_count: summary.unansweredReviewCount,
          reviews_last_30_days: summary.reviewsLast30Days,
          average_response_hours: summary.averageResponseHours,
          topics: summary.topics,
        });
        if (snapshotError) snapshotWarning = "Could not store the reputation snapshot";
      }
    }

    return json({
      imported: rows.length,
      next_page_token: nextPageToken,
      complete: !nextPageToken,
      total_review_count: payload.totalReviewCount ?? null,
      average_rating: payload.averageRating ?? null,
      snapshot_warning: snapshotWarning,
    });
  }

  if (action === "publish-reply") {
    const reviewId = typeof body.review_id === "string" ? body.review_id : "";
    const comment = typeof body.comment === "string" ? body.comment.trim() : "";
    if (!reviewId || !comment || new TextEncoder().encode(comment).length > 4096) {
      return json({ error: "A reply is required and must be at most 4096 bytes" }, 422);
    }
    const { data: review } = await admin.from("google_business_reviews")
      .select("id, google_review_name")
      .eq("id", reviewId)
      .eq("location_id", location.id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!review) return json({ error: "Review not found" }, 404);
    const replyResponse = await fetch(`https://mybusiness.googleapis.com/v4/${review.google_review_name}/reply`, {
      method: "PUT",
      headers: { ...googleHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ comment }),
    });
    if (!replyResponse.ok) return json({ error: await googleError(replyResponse, "publicar resposta") }, 502);
    const reply = await replyResponse.json() as Record<string, unknown>;
    const confirmResponse = await fetch(`https://mybusiness.googleapis.com/v4/${review.google_review_name}`, { headers: googleHeaders });
    if (!confirmResponse.ok) return json({ error: "Google accepted the reply but confirmation failed" }, 502);
    const confirmed = await confirmResponse.json() as { reviewReply?: Record<string, unknown> };
    const confirmedReply = confirmed.reviewReply || reply;
    await admin.from("google_business_reviews").update({
      reply_text: typeof confirmedReply.comment === "string" ? confirmedReply.comment : comment,
      reply_updated_at: typeof confirmedReply.updateTime === "string" ? confirmedReply.updateTime : new Date().toISOString(),
      reply_state: typeof confirmedReply.reviewReplyState === "string" ? confirmedReply.reviewReplyState : null,
      synced_at: new Date().toISOString(),
    }).eq("id", review.id);
    return json({ published: true, review_id: review.id });
  }

  return json({ error: "Unsupported action" }, 400);
});
