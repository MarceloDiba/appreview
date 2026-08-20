import type { ExperimentalApifySnapshot } from '@/lib/experimentalApifySnapshot';

type TopicId = NonNullable<ExperimentalApifySnapshot['sample']['insights']>['topics'][number]['id'];

/**
 * Presentation-only reading for the owner dashboard.
 *
 * It deliberately reuses only already observed, aggregated signals from the
 * browser snapshot. It does not create a notification, persist extra data, or
 * turn a weak topic into an operational alert.
 */
export type AdvisorReading =
  | { kind: 'alert'; topic: TopicId; mentions: number; lowRatingCount: number }
  | { kind: 'opportunity'; phrase: string; mentions: number }
  | { kind: 'strength'; topic: TopicId; mentions: number }
  | { kind: 'monitor' };

export const getAdvisorReading = (snapshot: ExperimentalApifySnapshot): AdvisorReading => {
  const alert = snapshot.sample.advisor?.alert;
  if (alert) {
    return {
      kind: 'alert',
      topic: alert.topic,
      mentions: alert.topicMentions,
      lowRatingCount: alert.lowRatingCount,
    };
  }

  const opportunity = snapshot.sample.advisor?.opportunity;
  if (opportunity) return { kind: 'opportunity', ...opportunity };

  const strength = [...(snapshot.sample.insights?.topics || [])]
    .filter((topic) => topic.sentiment === 'positive' && topic.count >= 3)
    .sort((left, right) => right.count - left.count || left.id.localeCompare(right.id))[0];

  if (strength) return { kind: 'strength', topic: strength.id, mentions: strength.count };
  return { kind: 'monitor' };
};
