export const EXPERIMENTAL_APIFY_SNAPSHOT_KEY = 'binno.experimental-apify-snapshot';

export type ExperimentalApifySnapshot = {
  source: 'apify-experimental';
  fetchedAt: string;
  business: {
    name: string;
    address: string;
    placeId: string;
    googleRating: number;
    googleReviewCount: number;
  };
  sample: {
    reviewCount: number;
    ratingBreakdown: Record<'1' | '2' | '3' | '4' | '5', number>;
    ownerRepliesFound: number;
  };
};

const isRatingBreakdown = (value: unknown): value is ExperimentalApifySnapshot['sample']['ratingBreakdown'] => {
  if (!value || typeof value !== 'object') return false;
  return ['1', '2', '3', '4', '5'].every((rating) => typeof (value as Record<string, unknown>)[rating] === 'number');
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
    && isRatingBreakdown(snapshot.sample.ratingBreakdown);
};

export const readExperimentalApifySnapshot = (): ExperimentalApifySnapshot | null => {
  try {
    const serialized = window.localStorage.getItem(EXPERIMENTAL_APIFY_SNAPSHOT_KEY);
    if (!serialized) return null;
    const value: unknown = JSON.parse(serialized);
    return isExperimentalApifySnapshot(value) ? value : null;
  } catch {
    return null;
  }
};

export const saveExperimentalApifySnapshot = (snapshot: ExperimentalApifySnapshot) => {
  window.localStorage.setItem(EXPERIMENTAL_APIFY_SNAPSHOT_KEY, JSON.stringify(snapshot));
};
