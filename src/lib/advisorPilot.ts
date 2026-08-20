import type { ExperimentalApifySnapshot } from '@/lib/experimentalApifySnapshot';

type AdvisorAlert = NonNullable<ExperimentalApifySnapshot['sample']['advisor']>['alert'];

export type AdvisorAction = {
  fingerprint: string;
  topic: string;
  markedAt: string;
};

const actionStorageKey = 'binno.advisor-pilot-actions';

const actionKey = (snapshot: ExperimentalApifySnapshot) =>
  `${snapshot.business.placeId || snapshot.business.googleReviewUrl || snapshot.business.name}`;

const readActions = (): Record<string, AdvisorAction> => {
  try {
    return JSON.parse(window.localStorage.getItem(actionStorageKey) || '{}') as Record<string, AdvisorAction>;
  } catch {
    return {};
  }
};

export const getAdvisorAction = (snapshot: ExperimentalApifySnapshot) => readActions()[actionKey(snapshot)] || null;

export const markAdvisorAction = (snapshot: ExperimentalApifySnapshot, alert: AdvisorAlert) => {
  if (!alert) return null;
  const next: AdvisorAction = { fingerprint: alert.fingerprint, topic: alert.topic, markedAt: new Date().toISOString() };
  const actions = { ...readActions(), [actionKey(snapshot)]: next };
  window.localStorage.setItem(actionStorageKey, JSON.stringify(actions));
  return next;
};

export type AdvisorObservedResult = 'waiting' | 'not-repeated' | 'persisting';

/**
 * This deliberately reports only what the next public reading observed. It
 * does not call the absence of a repeated signal a confirmed business result.
 */
export const getAdvisorObservedResult = (snapshot: ExperimentalApifySnapshot): AdvisorObservedResult | null => {
  const action = getAdvisorAction(snapshot);
  if (!action || new Date(snapshot.fetchedAt).getTime() <= new Date(action.markedAt).getTime()) return null;
  const alert = snapshot.sample.advisor?.alert;
  if (!alert) return 'not-repeated';
  return alert.topic === action.topic ? 'persisting' : 'not-repeated';
};
