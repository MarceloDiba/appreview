import type { ExperimentalApifySnapshot } from '@/lib/experimentalApifySnapshot';
import type { ReviewFunnelMetrics } from '@/hooks/useReviewFunnelMetrics';

/**
 * A única fonte visual do demo público. Não é salva, não é coletada e não
 * representa um negócio real. O cockpit recebe este retrato em modo demo.
 */
export const ILLUSTRATIVE_DEMO_SNAPSHOT: ExperimentalApifySnapshot = {
  source: 'apify-experimental',
  fetchedAt: '2026-08-20T12:00:00.000Z',
  business: {
    name: 'Bistrô Horizonte',
    address: 'Centro, Lisboa',
    placeId: 'illustrative-binno-demo',
    googleRating: 4.6,
    googleReviewCount: 128,
  },
  sample: {
    reviewCount: 54,
    ratingBreakdown: { '1': 5, '2': 7, '3': 4, '4': 10, '5': 28 },
    ownerRepliesFound: 17,
    advisor: {
      alert: {
        fingerprint: 'illustrative-waiting-time',
        topic: 'wait',
        lowRatingCount: 3,
        topicMentions: 3,
        recentLowShare: 21,
        baselineLowShare: 8,
      },
      opportunity: { phrase: 'prato executivo', mentions: 22 },
    },
    observedReviews: {
      retentionEndsAt: '2099-01-01T00:00:00.000Z',
      items: [
        { id: 'illustrative-mariana', reviewerName: 'Mariana Souza', rating: 2, publishedAt: '2026-08-18T12:00:00.000Z', comment: 'O atendimento demorou mais do que o esperado e ninguém explicou o que estava acontecendo.', responseObserved: false },
        { id: 'illustrative-rafael', reviewerName: 'Rafael Lima', rating: 3, publishedAt: '2026-08-17T12:00:00.000Z', comment: 'A comida estava boa, mas a equipe parecia perdida no horário de almoço.', responseObserved: false },
        { id: 'illustrative-ana', reviewerName: 'Ana Lima', rating: 5, publishedAt: '2026-08-16T12:00:00.000Z', comment: 'Prato executivo excelente e equipe muito atenciosa. Voltarei com certeza!', responseObserved: true },
      ],
    },
    insights: {
      reviewsLast30Days: 12,
      averageResponseHours: 18,
      history: {
        weeks: [
          { start: '2026-06-01', reviewCount: 10, ratingBreakdown: { '1': 0, '2': 1, '3': 1, '4': 2, '5': 6 }, ownerReplies: 3 },
          { start: '2026-06-08', reviewCount: 9, ratingBreakdown: { '1': 0, '2': 1, '3': 1, '4': 1, '5': 6 }, ownerReplies: 2 },
          { start: '2026-06-15', reviewCount: 11, ratingBreakdown: { '1': 0, '2': 1, '3': 1, '4': 2, '5': 7 }, ownerReplies: 4 },
          { start: '2026-06-22', reviewCount: 10, ratingBreakdown: { '1': 0, '2': 1, '3': 1, '4': 1, '5': 7 }, ownerReplies: 3 },
          { start: '2026-06-29', reviewCount: 10, ratingBreakdown: { '1': 0, '2': 1, '3': 1, '4': 1, '5': 7 }, ownerReplies: 4 },
          { start: '2026-07-06', reviewCount: 9, ratingBreakdown: { '1': 0, '2': 1, '3': 1, '4': 2, '5': 5 }, ownerReplies: 2 },
          { start: '2026-07-13', reviewCount: 8, ratingBreakdown: { '1': 1, '2': 1, '3': 1, '4': 2, '5': 3 }, ownerReplies: 2 },
          { start: '2026-07-20', reviewCount: 7, ratingBreakdown: { '1': 1, '2': 1, '3': 0, '4': 2, '5': 3 }, ownerReplies: 2 },
          { start: '2026-07-27', reviewCount: 6, ratingBreakdown: { '1': 1, '2': 1, '3': 1, '4': 1, '5': 2 }, ownerReplies: 1 },
          { start: '2026-08-03', reviewCount: 5, ratingBreakdown: { '1': 1, '2': 1, '3': 0, '4': 1, '5': 2 }, ownerReplies: 1 },
          { start: '2026-08-10', reviewCount: 4, ratingBreakdown: { '1': 1, '2': 1, '3': 0, '4': 1, '5': 1 }, ownerReplies: 1 },
          { start: '2026-08-17', reviewCount: 3, ratingBreakdown: { '1': 1, '2': 1, '3': 0, '4': 0, '5': 1 }, ownerReplies: 1 },
        ],
      },
      topics: [
        { id: 'food', count: 22, sentiment: 'positive' },
        { id: 'service', count: 18, sentiment: 'positive' },
        { id: 'wait', count: 12, sentiment: 'negative' },
        { id: 'cleanliness', count: 9, sentiment: 'negative' },
      ],
    },
  },
};

export const ILLUSTRATIVE_DEMO_FUNNEL: ReviewFunnelMetrics = {
  qrOpens: 142,
  googleClicks: 89,
  privateFeedback: 0,
  clickThroughRate: 62.7,
};
