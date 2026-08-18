export const EXPERIMENTAL_APIFY_SNAPSHOT_KEY = 'binno.experimental-apify-snapshot';

export type ExperimentalObservedReview = {
  /** Deterministic key used only to preserve browser-local action state. */
  id: string;
  rating: number;
  comment: string;
  publishedAt: string | null;
  /** Public display name, kept only in the authenticated browser for the pilot retention window. */
  reviewerName?: string;
  /** Public Google Maps URL for this exact review when the source provides one. */
  reviewUrl?: string;
  /** A reply was visible in the public source at the time of this collection. */
  responseObserved: boolean;
};

export type ExperimentalApifySnapshot = {
  source: 'apify-experimental';
  fetchedAt: string;
  business: {
    name: string;
    address: string;
    placeId: string;
    googleRating: number;
    googleReviewCount: number;
    googleReviewUrl?: string;
  };
  sample: {
    reviewCount: number;
    ratingBreakdown: Record<'1' | '2' | '3' | '4' | '5', number>;
    ownerRepliesFound: number;
    /**
     * Temporary browser-only queue used by the assisted pilot. It is never
     * written to Supabase audit records and expires automatically.
     */
    observedReviews?: {
      retentionEndsAt: string;
      items: ExperimentalObservedReview[];
    };
    insights?: {
      reviewsLast30Days: number | null;
      averageResponseHours: number | null;
      history?: {
        weeks: Array<{
          start: string;
          reviewCount: number;
          ratingBreakdown: Record<'1' | '2' | '3' | '4' | '5', number>;
          ownerReplies: number;
        }>;
      };
      topics: Array<{
        id: 'service' | 'wait' | 'food' | 'cleanliness' | 'price' | 'atmosphere' | 'delivery';
        count: number;
        sentiment: 'positive' | 'negative' | 'mixed';
      }>;
    };
  };
};

const isRatingBreakdown = (value: unknown): value is ExperimentalApifySnapshot['sample']['ratingBreakdown'] => {
  if (!value || typeof value !== 'object') return false;
  return ['1', '2', '3', '4', '5'].every((rating) => typeof (value as Record<string, unknown>)[rating] === 'number');
};

const isHistory = (value: unknown): boolean => {
  if (!value || typeof value !== 'object') return false;
  const weeks = (value as Record<string, unknown>).weeks;
  return Array.isArray(weeks) && weeks.every((week) => week && typeof week === 'object'
    && typeof (week as Record<string, unknown>).start === 'string'
    && typeof (week as Record<string, unknown>).reviewCount === 'number'
    && typeof (week as Record<string, unknown>).ownerReplies === 'number'
    && isRatingBreakdown((week as Record<string, unknown>).ratingBreakdown));
};

const isInsights = (value: unknown): value is NonNullable<ExperimentalApifySnapshot['sample']['insights']> => {
  if (value === undefined) return true;
  if (!value || typeof value !== 'object') return false;
  const insights = value as Record<string, unknown>;
  return (insights.reviewsLast30Days === null || typeof insights.reviewsLast30Days === 'number')
    && (insights.averageResponseHours === null || typeof insights.averageResponseHours === 'number')
    && (insights.history === undefined || isHistory(insights.history))
    && Array.isArray(insights.topics)
    && insights.topics.every((topic) => topic && typeof topic === 'object'
      && typeof (topic as Record<string, unknown>).id === 'string'
      && typeof (topic as Record<string, unknown>).count === 'number'
      && typeof (topic as Record<string, unknown>).sentiment === 'string');
};

const isObservedReviews = (value: unknown): value is NonNullable<ExperimentalApifySnapshot['sample']['observedReviews']> => {
  if (value === undefined) return true;
  if (!value || typeof value !== 'object') return false;
  const reviews = value as Record<string, unknown>;
  return typeof reviews.retentionEndsAt === 'string'
    && Array.isArray(reviews.items)
    && reviews.items.every((review) => review && typeof review === 'object'
      && typeof (review as Record<string, unknown>).id === 'string'
      && typeof (review as Record<string, unknown>).rating === 'number'
      && typeof (review as Record<string, unknown>).comment === 'string'
      && ((review as Record<string, unknown>).publishedAt === null || typeof (review as Record<string, unknown>).publishedAt === 'string')
      && ((review as Record<string, unknown>).reviewerName === undefined || typeof (review as Record<string, unknown>).reviewerName === 'string')
      && ((review as Record<string, unknown>).reviewUrl === undefined || typeof (review as Record<string, unknown>).reviewUrl === 'string')
      && typeof (review as Record<string, unknown>).responseObserved === 'boolean');
};

export const isExperimentalApifySnapshot = (value: unknown): value is ExperimentalApifySnapshot => {
  if (!value || typeof value !== 'object') return false;
  const snapshot = value as Partial<ExperimentalApifySnapshot>;
  return snapshot.source === 'apify-experimental'
    && typeof snapshot.fetchedAt === 'string'
    && !!snapshot.business
    && typeof snapshot.business.name === 'string'
    && typeof snapshot.business.address === 'string'
    && typeof snapshot.business.placeId === 'string'
    && typeof snapshot.business.googleRating === 'number'
    && typeof snapshot.business.googleReviewCount === 'number'
    && !!snapshot.sample
    && typeof snapshot.sample.reviewCount === 'number'
    && typeof snapshot.sample.ownerRepliesFound === 'number'
    && isRatingBreakdown(snapshot.sample.ratingBreakdown)
    && isInsights(snapshot.sample.insights)
    && isObservedReviews(snapshot.sample.observedReviews);
};

const withoutExpiredObservedReviews = (snapshot: ExperimentalApifySnapshot): ExperimentalApifySnapshot => {
  const retentionEndsAt = snapshot.sample.observedReviews?.retentionEndsAt;
  if (!retentionEndsAt || Number.isNaN(new Date(retentionEndsAt).getTime()) || new Date(retentionEndsAt).getTime() > Date.now()) {
    return snapshot;
  }

  return {
    ...snapshot,
    sample: { ...snapshot.sample, observedReviews: undefined },
  };
};

export const readExperimentalApifySnapshot = (): ExperimentalApifySnapshot | null => {
  try {
    const serialized = window.localStorage.getItem(EXPERIMENTAL_APIFY_SNAPSHOT_KEY);
    if (!serialized) return null;
    const value: unknown = JSON.parse(serialized);
    return isExperimentalApifySnapshot(value) ? withoutExpiredObservedReviews(value) : null;
  } catch {
    return null;
  }
};

/**
 * The browser can hold an explicitly collected experimental reading. During
 * local review we also allow the ignored fixture file so the pilot can be
 * inspected without any API call. That file is never fetched in production.
 */
export const loadExperimentalApifySnapshot = async ({
  allowLocalFixture = false,
}: { allowLocalFixture?: boolean } = {}): Promise<ExperimentalApifySnapshot | null> => {
  const localSnapshot = readExperimentalApifySnapshot();
  if (localSnapshot) return localSnapshot;
  if (!allowLocalFixture) return null;

  try {
    const response = await fetch('/experimental-snapshot.json', { cache: 'no-store' });
    if (!response.ok) return null;
    const value: unknown = await response.json();
    return isExperimentalApifySnapshot(value) ? withoutExpiredObservedReviews(value) : null;
  } catch {
    return null;
  }
};

export const saveExperimentalApifySnapshot = (snapshot: ExperimentalApifySnapshot) => {
  window.localStorage.setItem(EXPERIMENTAL_APIFY_SNAPSHOT_KEY, JSON.stringify(snapshot));
};
