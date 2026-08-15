export type RadarReview = {
  id: string;
  rating: number;
  comment: string | null;
  reviewCreatedAt: string | null;
  reviewUpdatedAt: string | null;
  replyText: string | null;
};

export type RadarTheme = 'service' | 'wait' | 'food' | 'cleanliness';

export type RadarSignal = {
  kind: 'recurring-concern' | 'recognized-strength';
  theme: RadarTheme;
  mentions: number;
  days: number;
};

export type ReputationRadarResult = {
  periodStart: string;
  periodEnd: string;
  importedReviewCount: number;
  recentReviewCount: number;
  unansweredCount: number;
  lowRatingUnansweredCount: number;
  priorityReview: RadarReview | null;
  signals: RadarSignal[];
};

type ThemeDefinition = {
  key: RadarTheme;
  tokens: string[];
};

const themes: ThemeDefinition[] = [
  {
    key: 'wait',
    tokens: ['demora', 'demorou', 'espera', 'atraso', 'lento', 'lent', 'wait', 'waiting', 'waited', 'slow'],
  },
  {
    key: 'service',
    tokens: ['atendimento', 'atencao', 'cordial', 'equipe', 'servico', 'service', 'staff', 'friendly', 'kind'],
  },
  {
    key: 'food',
    tokens: ['comida', 'prato', 'sabor', 'delicios', 'food', 'meal', 'dish', 'tasty'],
  },
  {
    key: 'cleanliness',
    tokens: ['limpeza', 'limpo', 'higiene', 'clean', 'cleanliness', 'hygiene'],
  },
];

const normalize = (value: string) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase();

const reviewDate = (review: RadarReview) => review.reviewUpdatedAt || review.reviewCreatedAt;

const isInPeriod = (review: RadarReview, periodStart: Date) => {
  const date = reviewDate(review);
  return Boolean(date && new Date(date) >= periodStart);
};

const mentionsTheme = (review: RadarReview, theme: ThemeDefinition) => {
  const comment = review.comment?.trim();
  if (!comment) return false;
  const normalized = normalize(comment);
  return theme.tokens.some((token) => normalized.includes(token));
};

const sortByPriority = (left: RadarReview, right: RadarReview) => {
  if (left.rating !== right.rating) return left.rating - right.rating;
  return new Date(reviewDate(right) || 0).getTime() - new Date(reviewDate(left) || 0).getTime();
};

export const evaluateReputationRadar = (
  reviews: RadarReview[],
  now = new Date(),
  periodDays = 30,
): ReputationRadarResult => {
  const periodStart = new Date(now);
  periodStart.setDate(periodStart.getDate() - periodDays);

  const recentReviews = reviews.filter((review) => isInPeriod(review, periodStart));
  const unanswered = reviews.filter((review) => !review.replyText?.trim());
  const unansweredRecent = unanswered.filter((review) => isInPeriod(review, periodStart));
  const lowRatingUnanswered = unanswered.filter((review) => review.rating <= 3);
  const priorityReview = [...lowRatingUnanswered, ...unansweredRecent]
    .filter((review, index, collection) => collection.findIndex((candidate) => candidate.id === review.id) === index)
    .sort(sortByPriority)[0] || null;

  const signals: RadarSignal[] = [];

  for (const theme of themes) {
    const concernMentions = recentReviews.filter((review) => review.rating <= 3 && mentionsTheme(review, theme)).length;
    if (concernMentions >= 2) {
      signals.push({ kind: 'recurring-concern', theme: theme.key, mentions: concernMentions, days: periodDays });
    }

    const strengthMentions = recentReviews.filter((review) => review.rating >= 4 && mentionsTheme(review, theme)).length;
    if (strengthMentions >= 3) {
      signals.push({ kind: 'recognized-strength', theme: theme.key, mentions: strengthMentions, days: periodDays });
    }
  }

  return {
    periodStart: periodStart.toISOString(),
    periodEnd: now.toISOString(),
    importedReviewCount: reviews.length,
    recentReviewCount: recentReviews.length,
    unansweredCount: unanswered.length,
    lowRatingUnansweredCount: lowRatingUnanswered.length,
    priorityReview,
    signals,
  };
};
