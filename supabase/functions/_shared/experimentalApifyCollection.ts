import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Núcleo partilhado da coleta Apify experimental.
 *
 * Até 30/08/2026 este código vivia inteiro dentro de
 * `sync-experimental-apify/index.ts`, chamado só pelo botão manual do piloto
 * assistido. A decisão de 30/08/2026 (Marcelo: "Faça a coleta no apify sempre
 * que cadastrar um novo negócio até trocarmos pelo google, quando o google
 * chegar desativamos.") adiciona um segundo chamador: o drenador
 * `apify-auto-collect-on-signup`, que dispara a mesma coleta automaticamente
 * a partir da fila gravada pelo gatilho de banco em
 * `supabase/migrations/20260830190000_coleta_apify_automatica_no_cadastro.sql`.
 *
 * Os dois chamadores precisam obedecer exatamente às mesmas regras: uma
 * coleta por negócio a cada 24 horas e o teto mensal configurado. Em vez de
 * duplicar essa lógica, os dois importam a mesma função,
 * `runExperimentalApifyCollection`. Isso é o que garante que a coleta
 * automática não pode, por construção, contornar um limite que a coleta
 * manual respeita.
 */

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export const json = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

const googleHosts = new Set([
  'google.com', 'www.google.com', 'maps.google.com', 'g.page', 'maps.app.goo.gl', 'goo.gl', 'share.google',
  'google.com.br', 'www.google.com.br', 'maps.google.com.br', 'google.pt', 'www.google.pt', 'maps.google.pt',
]);

export const parseGoogleUrl = (value: unknown): string | null => {
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
 * Redirects remain constrained to Google-owned hosts só this is never an open
 * proxy for a supplied URL.
 */
export const resolveGoogleMapsUrl = async (initialUrl: string): Promise<string> => {
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

export const numberInRange = (value: unknown, fallback = 0) =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

export const ratingBreakdown = (reviews: Array<Record<string, unknown>>) => {
  const counts: Record<'1' | '2' | '3' | '4' | '5', number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
  for (const review of reviews) {
    const stars = numberInRange(review.stars);
    if (stars >= 1 && stars <= 5 && Number.isInteger(stars)) counts[String(stars) as keyof typeof counts] += 1;
  }
  return counts;
};

export type TopicId = 'service' | 'wait' | 'food' | 'cleanliness' | 'price' | 'atmosphere' | 'delivery';
export type TopicSignal = { id: TopicId; count: number; sentiment: 'positive' | 'negative' | 'mixed' };
export type AdvisorAlert = {
  fingerprint: string;
  topic: TopicId;
  lowRatingCount: number;
  topicMentions: number;
  recentLowShare: number;
  baselineLowShare: number;
};
export type AdvisorOpportunity = { phrase: string; mentions: number };
export type AdvisorReport = { alert?: AdvisorAlert; opportunity?: AdvisorOpportunity };

const topicMatchers: Array<{ id: TopicId; words: string[] }> = [
  { id: 'service', words: ['atendimento', 'atencao', 'atencion', 'service', 'staff', 'waiter', 'friendly'] },
  { id: 'wait', words: ['espera', 'demora', 'wait', 'waiting', 'slow', 'lento'] },
  { id: 'food', words: ['comida', 'prato', 'food', 'meal', 'dish', 'cozinha', 'kitchen'] },
  { id: 'cleanliness', words: ['limpeza', 'limpio', 'clean', 'dirty', 'higiene', 'hygiene'] },
  { id: 'price', words: ['preco', 'price', 'caro', 'expensive', 'valor'] },
  { id: 'atmosphere', words: ['ambiente', 'atmosphere', 'barulho', 'noise', 'musica', 'music'] },
  { id: 'delivery', words: ['entrega', 'delivery', 'pedido', 'order', 'takeaway'] },
];

export const stringFrom = (item: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const value = item[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
};

export const nestedPublicString = (item: Record<string, unknown>, keys: string[]) => {
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

/**
 * A fila de respostas: uma linha por avaliacao que o dono pode responder.
 *
 * Isto vivia em `sync-experimental-apify/index.ts`, ou seja, no chamador
 * manual. O drenador automatico chama este nucleo e nunca passava por la, entao
 * uma coleta feita pelo servidor produzia numeros e nenhuma fila. Vivendo aqui,
 * os dois caminhos produzem a mesma lista e nao podem divergir.
 */
export const RETENCAO_DA_FILA_MS = 14 * 24 * 60 * 60 * 1_000;

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

// O Compass devolve o nome publico de quem avaliou como `name`. E seguro aqui
// porque esta funcao le um registo de avaliacao; o nome do negocio vem
// separado, como `title`.
const publicReviewerName = (review: Record<string, unknown>) =>
  stringFrom(review, ['reviewerName', 'authorName', 'reviewerDisplayName', 'name'])
  || nestedPublicString(review, ['reviewer', 'author', 'user']);

// `url` pode identificar o lugar em vez desta avaliacao. So aceitar campos
// documentados como permalink evita que o botao abra o perfil do negocio
// dizendo que abre a avaliacao escolhida.
const publicReviewUrl = (review: Record<string, unknown>) => {
  const candidate = stringFrom(review, ['reviewUrl', 'reviewURL', 'reviewLink', 'reviewUri']);
  return candidate && parseGoogleUrl(candidate) ? candidate : undefined;
};

export const montarFilaDeRespostas = (reviews: Array<Record<string, unknown>>, now: Date) => {
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
    retentionEndsAt: new Date(now.getTime() + RETENCAO_DA_FILA_MS).toISOString(),
    items,
  };
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

export const collectInsights = (reviews: Array<Record<string, unknown>>, now: Date) => {
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

const topicIdsInText = (text: string) => {
  const normalized = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return topicMatchers.filter((topic) => topic.words.some((word) => normalized.includes(word))).map((topic) => topic.id);
};

const phraseStopWords = new Set([
  'muito', 'mais', 'menos', 'para', 'com', 'sem', 'que', 'uma', 'um', 'the', 'and', 'was', 'were', 'very',
  'bom', 'boa', 'good', 'great', 'excelente', 'amazing', 'atendimento', 'service', 'comida', 'food', 'ambiente',
  'espera', 'wait', 'tempo', 'price', 'preco', 'limpeza', 'clean', 'delivery', 'entrega',
]);

const opportunityPhrases = (text: string) => {
  const words = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().match(/[a-z]{3,}/g) || [];
  const phrases = new Set<string>();
  for (let index = 0; index < words.length - 1; index += 1) {
    const pair = words.slice(index, index + 2);
    if (pair.length < 2 || pair.some((word) => phraseStopWords.has(word))) continue;
    phrases.add(pair.join(' '));
  }
  return [...phrases];
};

/**
 * Conservative experimental advisor: a message only exists when dated public
 * reviews give both a quality shift and a repeated operational cause. It is a
 * signal from this public sample, never a statement about the full Google
 * profile. Reviewer identity and raw text leave this function only in the
 * browser-only queue.
 */
export const collectAdvisor = (reviews: Array<Record<string, unknown>>, now: Date): AdvisorReport => {
  const recentStart = now.getTime() - 7 * 24 * 60 * 60 * 1_000;
  const baselineStart = now.getTime() - 35 * 24 * 60 * 60 * 1_000;
  const opportunityStart = now.getTime() - 30 * 24 * 60 * 60 * 1_000;
  const recent: Array<Record<string, unknown>> = [];
  const baseline: Array<Record<string, unknown>> = [];
  const positiveRecent: Array<Record<string, unknown>> = [];

  for (const review of reviews) {
    const date = dateFrom(review, ['publishedAtDate', 'reviewDate', 'reviewDateTime', 'date']);
    if (!date) continue;
    const time = date.getTime();
    if (time >= recentStart) recent.push(review);
    else if (time >= baselineStart && time < recentStart) baseline.push(review);
    if (time >= opportunityStart && numberInRange(review.stars) >= 4) positiveRecent.push(review);
  }

  const lowCount = (items: Array<Record<string, unknown>>) => items.filter((review) => numberInRange(review.stars) <= 2).length;
  const recentLow = lowCount(recent);
  const baselineLow = lowCount(baseline);
  const recentLowShare = recent.length ? recentLow / recent.length : 0;
  const baselineLowShare = baseline.length ? baselineLow / baseline.length : 0;
  let alert: AdvisorAlert | undefined;

  if (recent.length >= 3 && baseline.length >= 8 && recentLow >= 2 && recentLowShare - baselineLowShare >= 0.15) {
    const counts = new Map<TopicId, number>();
    for (const review of recent) {
      if (numberInRange(review.stars) > 2) continue;
      const text = stringFrom(review, ['text', 'reviewText', 'reviewContent', 'comment']);
      if (!text) continue;
      for (const topic of topicIdsInText(text)) counts.set(topic, (counts.get(topic) || 0) + 1);
    }
    const match = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
    if (match && match[1] >= 2) {
      alert = {
        fingerprint: `${match[0]}:${recentLow}:${Math.round(recentLowShare * 100)}:${Math.round(baselineLowShare * 100)}`,
        topic: match[0],
        lowRatingCount: recentLow,
        topicMentions: match[1],
        recentLowShare: Math.round(recentLowShare * 100),
        baselineLowShare: Math.round(baselineLowShare * 100),
      };
    }
  }

  const phrases = new Map<string, number>();
  for (const review of positiveRecent) {
    const text = stringFrom(review, ['text', 'reviewText', 'reviewContent', 'comment']);
    if (!text) continue;
    for (const phrase of opportunityPhrases(text)) phrases.set(phrase, (phrases.get(phrase) || 0) + 1);
  }
  const phrase = [...phrases.entries()].filter(([, count]) => count >= 3).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];

  return {
    ...(alert ? { alert } : {}),
    ...(phrase ? { opportunity: { phrase: phrase[0], mentions: phrase[1] } } : {}),
  };
};

export const enqueueAdvisorAlert = async ({
  admin,
  userId,
  businessName,
  placeId,
  alert,
}: {
  admin: ReturnType<typeof createClient>;
  userId: string;
  businessName: string;
  placeId: string;
  alert: AdvisorAlert | undefined;
}) => {
  if (!alert) return;
  const { data: preferences } = await admin.from('whatsapp_notification_preferences')
    .select('recipient_e164, reputation_enabled, consented_at')
    .eq('user_id', userId).maybeSingle();
  if (!preferences?.consented_at || !preferences.reputation_enabled) return;
  const topicLabel: Record<TopicId, string> = {
    service: 'atendimento', wait: 'tempo de espera', food: 'comida', cleanliness: 'limpeza', price: 'preço', atmosphere: 'ambiente', delivery: 'entrega',
  };
  const body = [
    'Binno',
    `Atenção em ${businessName}.`,
    `A leitura recente encontrou ${alert.lowRatingCount} notas baixas e ${alert.topicMentions} menções a ${topicLabel[alert.topic]}.`,
    'Abra o painel para conferir a evidência e decidir a próxima ação.',
  ].join('\n');
  await admin.from('whatsapp_outbox').upsert({
    user_id: userId,
    kind: 'alert',
    recipient_e164: preferences.recipient_e164,
    body,
    idempotency_key: `apify-alert:${placeId || 'google'}:${alert.fingerprint}`,
  }, { onConflict: 'user_id,idempotency_key', ignoreDuplicates: true });
};

/**
 * O teto mensal é lido do mesmo segredo pelos dois chamadores. Documentado em
 * `APIFY_EXPERIMENTAL_MONTHLY_RUN_LIMIT` (docs/apify-experimental-rollout.md).
 * Continua em 10 por padrão porque foi posto quando a coleta era só o
 * experimento manual; subir esse número para acomodar a coleta automática no
 * cadastro é decisão de negócio de Marcelo, não algo que o código decide
 * sozinho.
 */
export const resolveMonthlyRunLimit = () => {
  const configured = Number(Deno.env.get('APIFY_EXPERIMENTAL_MONTHLY_RUN_LIMIT') || '10');
  return Number.isFinite(configured) ? Math.max(1, Math.min(configured, 100)) : 10;
};

/**
 * Proveniência do piloto Apify. É o mesmo literal que o retrato agregado já
 * emitia como `source`, agora com um nome só para que a linha gravada no
 * banco e o retrato entregue ao navegador não possam divergir.
 */
export const APIFY_SNAPSHOT_SOURCE = 'apify-experimental';

/**
 * Grava o agregado da coleta em `google_business_reputation_snapshots`, que é
 * a tabela de onde o painel tira os números. Sem isto, uma coleta paga existe
 * apenas no `localStorage` do aparelho que a pediu: outro aparelho do mesmo
 * dono não vê nada, e a coleta automática do cadastro, que roda sem navegador
 * nenhum, gasta dinheiro e não entrega nada que o dono consiga ver.
 *
 * Só medição entra aqui. Nome do avaliador, texto da avaliação e URL pública
 * da avaliação ficam na fila efêmera do navegador autenticado, por até 14
 * dias (contrato de produto, linhas 39 a 41).
 *
 * Uma falha de gravação é registrada e nunca propagada. A essa altura o Apify
 * já cobrou e a auditoria já está marcada como bem-sucedida; transformar isso
 * numa coleta falhada faria o chamador tentar de novo e gastar de novo.
 */
/**
 * Grava a fila de respostas do dono.
 *
 * O padrao de falha e o mesmo do agregado, e pela mesma razao: a essa altura o
 * Apify ja cobrou. Uma falha aqui e registrada e nunca propagada.
 *
 * Cada gravacao apaga primeiro o que venceu deste dono. A retencao de 14 dias
 * so vale se algo a fizer valer; deixar a linha morta no banco e confiar no
 * filtro da leitura transformaria o prazo em promessa verbal.
 */
const persistirFilaDeRespostas = async ({
  admin,
  userId,
  fila,
  now,
}: {
  admin: ReturnType<typeof createClient>;
  userId: string;
  fila: { retentionEndsAt: string; items: Array<Record<string, unknown>> };
  now: Date;
}) => {
  try {
    const { error: erroDaLimpeza } = await admin
      .from('google_reviews_awaiting_reply')
      .delete()
      .eq('user_id', userId)
      .lt('expires_at', now.toISOString());
    if (erroDaLimpeza) console.error('Nao consegui apagar a fila vencida:', erroDaLimpeza);

    if (!fila.items.length) return;

    const { error } = await admin.from('google_reviews_awaiting_reply').upsert(
      fila.items.map((item) => ({
        user_id: userId,
        review_id: item.id as string,
        rating: item.rating as number,
        comment: item.comment as string,
        published_at: (item.publishedAt as string | null) ?? null,
        reviewer_name: (item.reviewerName as string | undefined) ?? null,
        review_url: (item.reviewUrl as string | undefined) ?? null,
        response_observed: Boolean(item.responseObserved),
        collected_at: now.toISOString(),
        // `expires_at` NAO vai aqui de proposito. A coluna tem valor padrao e
        // so e escrita na primeira gravacao daquela avaliacao. Reenviando-a, o
        // upsert reestamparia o prazo a cada coleta e uma avaliacao que
        // continuasse na amostra nunca venceria: com coleta diaria os 14 dias
        // viravam promessa que nada aplica.
      })),
      { onConflict: 'user_id,review_id' },
    );
    if (error) console.error('Nao consegui gravar a fila de respostas:', error);
  } catch (erro) {
    console.error('Nao consegui gravar a fila de respostas:', erro);
  }
};

const persistAggregateSnapshot = async ({
  admin,
  userId,
  aggregateSnapshot,
}: {
  admin: ReturnType<typeof createClient>;
  userId: string;
  aggregateSnapshot: Record<string, unknown> & { sample: Record<string, unknown> };
}) => {
  try {
    const business = (aggregateSnapshot.business || {}) as Record<string, unknown>;
    const sample = aggregateSnapshot.sample;
    const insights = (sample.insights || {}) as Record<string, unknown>;
    const sampleSize = numberInRange(sample.reviewCount);
    const ownerReplies = numberInRange(sample.ownerRepliesFound);
    const { error } = await admin.from('google_business_reputation_snapshots').insert({
      user_id: userId,
      // Uma coleta Apify não passa pela conexão oficial e não tem localização.
      location_id: null,
      captured_at: aggregateSnapshot.fetchedAt as string,
      // Totais do negócio inteiro, lidos do próprio perfil no Google
      // (`reviewsCount` e `totalScore` do Actor). Não são números de amostra.
      total_reviews: Math.max(0, Math.trunc(numberInRange(business.googleReviewCount))),
      // O historico semanal, que ate 02/09/2026 morria no navegador que
      // coletou. `insights.history` ja foi calculado acima; so faltava
      // grava-lo. Nulo quando a coleta nao produziu semanas, que e diferente
      // de ter produzido zero.
      weekly_history: (insights.history as unknown) ?? null,
      average_rating: Math.round(Math.min(5, Math.max(0, numberInRange(business.googleRating))) * 10) / 10,
      // Daqui para baixo tudo vem da amostra de no máximo 50 avaliações. É
      // exatamente por isso que a coluna `source` importa: no caminho oficial
      // as mesmas colunas são calculadas sobre todas as avaliações do negócio,
      // e comparar as duas sem separar por proveniência inventaria um salto
      // que o dono leria como resultado dele.
      rating_breakdown: sample.ratingBreakdown,
      // Não respondidas DENTRO DA AMOSTRA, nunca no negócio inteiro.
      unanswered_review_count: Math.max(0, sampleSize - ownerReplies),
      // Nulo quando nenhuma avaliação da amostra trouxe data. Desconhecido não
      // é zero, e zero apareceria no painel como "nenhuma avaliação nova".
      reviews_last_30_days: insights.reviewsLast30Days ?? null,
      average_response_hours: insights.averageResponseHours ?? null,
      topics: insights.topics ?? [],
      source: APIFY_SNAPSHOT_SOURCE,
    });
    if (error) console.error('Agregado da coleta Apify não foi persistido', error.code || error.message);
  } catch (error) {
    console.error('Agregado da coleta Apify não foi persistido', error instanceof Error ? error.message : 'erro desconhecido');
  }
};

export type CollectionSuccess = {
  ok: true;
  runId: string;
  reviews: Array<Record<string, unknown>>;
  aggregateSnapshot: Record<string, unknown> & { sample: Record<string, unknown> };
  advisor: AdvisorReport;
};
export type CollectionFailure = {
  ok: false;
  code: string;
  status: number;
  message: string;
};
export type CollectionOutcome = CollectionSuccess | CollectionFailure;

/**
 * Uma linha 'started' sem conclusão significa que o processo pode ter caído
 * entre a chamada ao Apify (a cobrança) e a gravação do resultado. Não há
 * como saber, a essa altura, se o Apify já cobrou. Por isso 'started'
 * bloqueia a janela de 24h exatamente como 'succeeded', e o índice único
 * parcial `experimental_apify_runs_one_started_idx` (ver migração
 * 20260830190000) impede uma segunda linha 'started' simultânea para o
 * mesmo user_id: o INSERT abaixo É a reivindicação atômica de uma coleta em
 * andamento, não só um registro depois da checagem.
 *
 * Isso sozinho bloquearia um negócio para sempre se a linha nunca fosse
 * concluída. A saída escolhida: depois de um tempo bem maior que qualquer
 * coleta legítima leva (o Actor roda com timeout de 240s), a linha é
 * reivindicada como órfã e marcada 'failed' com um código próprio. Isso a
 * tira do bloqueio (e, por ser um índice PARCIAL sobre `status = 'started'`,
 * libera a vaga do índice único assim que o status muda), e a próxima
 * tentativa pode gastar de novo, mas essa é uma decisão visível e registrada
 * (error_code = 'APIFY_EXPERIMENTAL_ORPHANED'), não uma nova tentativa
 * silenciosa. A reivindicação é preguiçosa: só acontece na próxima vez que
 * alguém tentar coletar para o mesmo negócio; não existe uma varredura
 * agendada separada. Ela é escopada só por user_id (não também por link),
 * porque é isso que o índice único protege: uma linha 'started' presa sob um
 * link antigo tem que liberar a vaga para uma tentativa com o link atual.
 */
// Este valor tem um gêmeo em SQL: o `interval '15 minutes'` que reivindica
// linhas 'processing' travadas na fila (supabase/migrations/20260830190000_coleta_apify_automatica_no_cadastro.sql,
// claim_apify_auto_collection). TypeScript não lê SQL nem o contrário, então
// os dois literais são independentes por construção; `scripts/check-apify-auto-collection.mjs`
// lê os dois e falha se divergirem. Mudar este valor exige mudar o outro.
const ORPHANED_STARTED_AFTER_MS = 15 * 60 * 1_000;

// Código Postgres de violação de unicidade (unique_violation). O
// supabase-js repassa esse código em PostgrestError.code quando o INSERT
// esbarra no índice único parcial sobre `status = 'started'`.
const POSTGRES_UNIQUE_VIOLATION = '23505';

/**
 * Coleta guardada: aplica o teto de 24 horas por (negócio, link) e o teto
 * mensal por negócio antes de gastar um único centavo, grava a auditoria em
 * `experimental_apify_runs` e devolve um resumo agregado (nunca a fila
 * efêmera de avaliações com nome público, que é assunto exclusivo do piloto
 * manual em `sync-experimental-apify/index.ts`).
 *
 * QUALQUER chamador, seja o botão manual, seja o drenador automático do
 * cadastro, passa por aqui. Não existe um segundo caminho que fale com o Apify.
 */
export async function runExperimentalApifyCollection({
  admin,
  userId,
  googleReviewUrl,
  apifyToken,
  monthlyRunLimit,
  now,
}: {
  admin: ReturnType<typeof createClient>;
  userId: string;
  googleReviewUrl: string;
  apifyToken: string;
  monthlyRunLimit: number;
  now: Date;
}): Promise<CollectionOutcome> {
  // Uma constante só: a janela que bloqueia e a hora que a mensagem promete
  // vêm do mesmo número, senão a tela diria uma hora e a trava usaria outra.
  const DAY_MS = 24 * 60 * 60 * 1_000;
  const dayAgo = new Date(now.getTime() - DAY_MS).toISOString();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();

  // Reivindica primeiro qualquer linha 'started' órfã deste negócio (por
  // user_id, não também por link: é essa a chave do índice único que o
  // INSERT abaixo depende para reivindicar a vaga), só depois disso a
  // checagem de 24h abaixo pode confiar no que lê, e só depois disso o
  // INSERT mais adiante pode contar com a vaga do índice único livre.
  const orphanCutoff = new Date(now.getTime() - ORPHANED_STARTED_AFTER_MS).toISOString();
  const { error: reclaimError } = await admin.from('experimental_apify_runs')
    .update({ status: 'failed', completed_at: now.toISOString(), error_code: 'APIFY_EXPERIMENTAL_ORPHANED' })
    .eq('user_id', userId).eq('status', 'started').lt('requested_at', orphanCutoff);
  if (reclaimError) {
    return { ok: false, code: 'APIFY_EXPERIMENTAL_LIMIT_CHECK_FAILED', status: 500, message: 'Não foi possível aplicar os limites da coleta experimental.' };
  }

  const [{ data: recentRun, error: recentError }, { count: monthlyCount, error: monthlyError }] = await Promise.all([
    // 'started' bloqueia igual a 'succeeded': um crash entre a cobrança e a
    // gravação do resultado não pode virar uma segunda cobrança. Só uma linha
    // órfã reivindicada acima (agora 'failed') deixa de bloquear.
    admin.from('experimental_apify_runs').select('id, requested_at').eq('user_id', userId).eq('google_review_url', googleReviewUrl).in('status', ['succeeded', 'started']).gte('requested_at', dayAgo).order('requested_at', { ascending: false }).limit(1).maybeSingle(),
    admin.from('experimental_apify_runs').select('id', { count: 'exact', head: true }).eq('user_id', userId).gte('requested_at', monthStart),
  ]);
  if (recentError || monthlyError) {
    return { ok: false, code: 'APIFY_EXPERIMENTAL_LIMIT_CHECK_FAILED', status: 500, message: 'Não foi possível aplicar os limites da coleta experimental.' };
  }
  if (recentRun) {
    // A mensagem diz a hora exata de propósito. Em 31/08/2026 Marcelo clicou em
    // buscar, a trava recusou, e ele só percebeu que nada tinha acontecido
    // porque a fila continuou vazia: a frase antiga não dizia quando tentar de
    // novo e desaparecia sozinha. Uma recusa que não diz o que fazer a seguir é
    // quase indistinguível de uma busca que não achou nada.
    const quando = (recentRun as { requested_at?: string }).requested_at;
    const liberaEm = quando ? new Date(new Date(quando).getTime() + DAY_MS) : null;
    const hora = liberaEm
      ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(liberaEm)
      : null;
    return {
      ok: false,
      code: 'APIFY_EXPERIMENTAL_COOLDOWN',
      status: 429,
      message: hora
        ? `Não busquei nada agora: já busquei as avaliações deste negócio nas últimas 24 horas. Pode buscar de novo a partir de ${hora}. O que está no painel continua valendo.`
        : 'Não busquei nada agora: já busquei as avaliações deste negócio nas últimas 24 horas. O que está no painel continua valendo.',
    };
  }
  if ((monthlyCount || 0) >= monthlyRunLimit) {
    return { ok: false, code: 'APIFY_EXPERIMENTAL_MONTHLY_LIMIT', status: 429, message: 'O limite mensal de coletas experimentais foi alcançado.' };
  }

  // Este INSERT É a reivindicação atômica, não um registro depois de já
  // termos decidido gastar. Se outra chamada (o botão manual, ou outra
  // execução concorrente do drenador) já tem uma linha 'started' para este
  // user_id, o índice único parcial `experimental_apify_runs_one_started_idx`
  // rejeita este INSERT com unique_violation (23505) antes de qualquer
  // `fetch` ao Apify: ninguém gasta duas vezes só porque as duas leituras
  // de SELECT passaram antes de qualquer uma delas escrever.
  const { data: audit, error: auditError } = await admin.from('experimental_apify_runs').insert({
    user_id: userId,
    google_review_url: googleReviewUrl,
    status: 'started',
  }).select('id').single();
  if (auditError) {
    if (auditError.code === POSTGRES_UNIQUE_VIOLATION) {
      // Outra chamada já detém a reivindicação para este negócio. Não é um
      // erro para o chamador tratar como falha definitiva: é a mesma
      // condição transitória que o cooldown representa, só que descoberta
      // no momento da escrita em vez de numa leitura anterior.
      return { ok: false, code: 'APIFY_EXPERIMENTAL_CLAIMED_ELSEWHERE', status: 409, message: 'Já existe uma coleta em andamento para este negócio.' };
    }
    return { ok: false, code: 'APIFY_EXPERIMENTAL_START_FAILED', status: 500, message: 'Não foi possível iniciar a coleta experimental.' };
  }
  if (!audit) {
    return { ok: false, code: 'APIFY_EXPERIMENTAL_START_FAILED', status: 500, message: 'Não foi possível iniciar a coleta experimental.' };
  }

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
    const advisor = collectAdvisor(reviews, now);
    const aggregateSnapshot = {
      source: APIFY_SNAPSHOT_SOURCE,
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
        ...(advisor.alert ? { advisor: { alert: advisor.alert } } : {}),
      },
    };
    await admin.from('experimental_apify_runs').update({
      status: 'succeeded',
      completed_at: new Date().toISOString(),
      result_summary: aggregateSnapshot,
    }).eq('id', audit.id);
    await persistAggregateSnapshot({ admin, userId, aggregateSnapshot });
    await persistirFilaDeRespostas({ admin, userId, fila: montarFilaDeRespostas(reviews, now), now });
    await enqueueAdvisorAlert({
      admin,
      userId,
      businessName: aggregateSnapshot.business.name,
      placeId: aggregateSnapshot.business.placeId,
      alert: advisor.alert,
    });
    return { ok: true, runId: audit.id as string, reviews, aggregateSnapshot, advisor };
  } catch (error) {
    const errorCode = error instanceof Error && /^APIFY_[A-Z_]+$/.test(error.message) ? error.message : 'APIFY_REQUEST_FAILED';
    await admin.from('experimental_apify_runs').update({
      status: 'failed',
      completed_at: new Date().toISOString(),
      error_code: errorCode,
    }).eq('id', audit.id);
    return { ok: false, code: errorCode, status: 502, message: 'Não foi possível concluir a coleta experimental agora.' };
  }
}
