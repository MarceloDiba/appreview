import { useMemo } from 'react';
import type { InternalCase } from '@/hooks/useInternalFeedback';
import { useOwnerTranslation } from '@/i18n/owner/useOwnerTranslation';

export type AlertLevel = 'critical' | 'serious' | 'warning' | 'good' | 'neutral';

export interface AttentionAlert {
  id: string;
  level: AlertLevel;
  /** Short label shown beside the icon — carries the state in text, not only in colour. */
  label: string;
  title: string;
  detail: string;
  /** Concrete next step. Shown as the practice tip. */
  action: string;
}

export interface AttentionInsights {
  hasData: boolean;
  /** The single most important thing right now. Never null once there is data. */
  priority: AttentionAlert;
  /** Everything else worth knowing, already ordered by severity. */
  alerts: AttentionAlert[];
  stats: {
    openCases: number;
    awaitingContact: number;
    oldestOpenDays: number | null;
    weekCount: number;
    weekAverage: number | null;
    baselineAverage: number | null;
    baselineWeeklyCount: number | null;
    resolvedTotal: number;
    resolutionRate: number | null;
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;

const daysSince = (iso: string | null): number | null => {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  return Math.floor((Date.now() - then) / DAY_MS);
};

const mean = (values: number[]): number | null =>
  values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : null;

/**
 * Turns the raw internal cases into one clear priority plus supporting signals.
 *
 * Deliberadamente determinístico: sem API externa, sem IA, sem chave. As regras
 * estão ordenadas pelo quanto o dono perde ao ignorá-las — um cliente sem
 * resposta que deixou contacto pesa mais do que uma oscilação estatística.
 *
 * O texto sai traduzido pelo react-i18next (pt-BR/pt-PT/en), com plural e
 * interpolação resolvidos pelos catálogos em `src/i18n/owner`. Por isso o hook
 * chama `useOwnerTranslation` e recalcula quando o idioma muda.
 */
export const useAttentionInsights = (cases: InternalCase[]): AttentionInsights => {
  const { t, i18n } = useOwnerTranslation();

  return useMemo(() => {
    const decimalFormat = new Intl.NumberFormat(
      i18n.resolvedLanguage || i18n.language,
      { minimumFractionDigits: 1, maximumFractionDigits: 1 }
    );
    const now = Date.now();
    const open = cases.filter((c) => !c.is_addressed);
    const resolvedTotal = cases.length - open.length;

    const awaitingContact = open.filter(
      (c) => !!c.customer_email && c.customer_email.trim() !== ''
    );

    const openWithDates = open
      .map((c) => ({ item: c, days: daysSince(c.created_at) }))
      .filter((entry): entry is { item: InternalCase; days: number } => entry.days !== null)
      .sort((a, b) => b.days - a.days);

    const oldestOpen = openWithDates[0] ?? null;

    const inWindow = (c: InternalCase, fromDaysAgo: number, toDaysAgo: number) => {
      if (!c.created_at) return false;
      const time = new Date(c.created_at).getTime();
      if (Number.isNaN(time)) return false;
      const age = now - time;
      return age >= toDaysAgo * DAY_MS && age < fromDaysAgo * DAY_MS;
    };

    const week = cases.filter((c) => inWindow(c, 7, 0));
    const baseline = cases.filter((c) => inWindow(c, 35, 7));

    const weekAverage = mean(week.map((c) => c.rating));
    const baselineAverage = mean(baseline.map((c) => c.rating));
    const baselineWeeklyCount = baseline.length ? baseline.length / 4 : null;

    const resolutionRate = cases.length ? resolvedTotal / cases.length : null;

    const stats: AttentionInsights['stats'] = {
      openCases: open.length,
      awaitingContact: awaitingContact.length,
      oldestOpenDays: oldestOpen?.days ?? null,
      weekCount: week.length,
      weekAverage,
      baselineAverage,
      baselineWeeklyCount,
      resolvedTotal,
      resolutionRate,
    };

    const alerts: AttentionAlert[] = [];

    // 1. Someone left their contact and is still waiting. The most costly silence.
    if (awaitingContact.length > 0) {
      const names = awaitingContact
        .map((c) => c.customer_name)
        .filter((n): n is string => !!n && n.trim() !== '');
      const detail = names.length
        ? t('attention.awaiting.detailNames', {
            names: names.slice(0, 3).join(', ') + (names.length > 3 ? ` ${t('attention.andOthers')}` : ''),
          })
        : t('attention.awaiting.detailGeneric');
      alerts.push({
        id: 'awaiting-contact',
        level: 'critical',
        label: t('attention.label.awaiting'),
        title: t('attention.awaiting.title', { count: awaitingContact.length }),
        detail,
        action: t('attention.awaiting.action'),
      });
    }

    // 2. A case has been sitting open for too long.
    if (oldestOpen && oldestOpen.days >= 2) {
      const who = oldestOpen.item.customer_name?.trim() || t('attention.stale.someone');
      const quote = oldestOpen.item.feedback_text?.trim();
      alerts.push({
        id: 'stale-case',
        level: oldestOpen.days >= 7 ? 'critical' : 'serious',
        label: t('attention.label.stale'),
        title: t('attention.stale.title', { who, count: oldestOpen.days }),
        detail: quote ? t('attention.stale.detailQuote', { quote }) : t('attention.stale.detailGeneric'),
        action: t('attention.stale.action'),
      });
    }

    // 3. This week is meaningfully worse than the recent baseline.
    if (
      weekAverage !== null &&
      baselineAverage !== null &&
      week.length >= 3 &&
      baseline.length >= 3 &&
      baselineAverage - weekAverage >= 0.5
    ) {
      alerts.push({
        id: 'rating-drop',
        level: 'serious',
        label: t('attention.label.ratingDrop'),
        title: t('attention.ratingDrop.title', { average: decimalFormat.format(weekAverage) }),
        detail: t('attention.ratingDrop.detail', {
          baseline: decimalFormat.format(baselineAverage),
          drop: decimalFormat.format(baselineAverage - weekAverage),
        }),
        action: t('attention.ratingDrop.action'),
      });
    }

    // 4. Volume spike — more complaints than usual, regardless of the average.
    if (
      baselineWeeklyCount !== null &&
      baselineWeeklyCount >= 1 &&
      week.length >= 3 &&
      week.length >= baselineWeeklyCount * 2
    ) {
      alerts.push({
        id: 'volume-spike',
        level: 'warning',
        label: t('attention.label.volume'),
        title: t('attention.volume.title', {
          count: week.length,
          average: decimalFormat.format(baselineWeeklyCount),
        }),
        detail: t('attention.volume.detail'),
        action: t('attention.volume.action'),
      });
    }

    // 5. Open cases without contact details — still worth closing.
    const openWithoutContact = open.length - awaitingContact.length;
    if (openWithoutContact > 0) {
      alerts.push({
        id: 'open-cases',
        level: 'warning',
        label: t('attention.label.open'),
        title: t('attention.open.title', { count: openWithoutContact }),
        detail: t('attention.open.detail'),
        action: t('attention.open.action'),
      });
    }

    // 6. Nothing is wrong — say so plainly and keep one useful habit in view.
    if (alerts.length === 0) {
      const empty = cases.length === 0;
      alerts.push({
        id: 'all-clear',
        level: 'good',
        label: t('attention.label.allClear'),
        title: empty ? t('attention.allClear.titleEmpty') : t('attention.allClear.titleClear'),
        detail: empty
          ? t('attention.allClear.detailEmpty')
          : t('attention.allClear.detailResolved', { count: resolvedTotal }),
        action: empty ? t('attention.allClear.actionEmpty') : t('attention.allClear.actionClear'),
      });
    }

    const order: Record<AlertLevel, number> = {
      critical: 0,
      serious: 1,
      warning: 2,
      neutral: 3,
      good: 4,
    };
    alerts.sort((a, b) => order[a.level] - order[b.level]);

    return {
      hasData: cases.length > 0,
      priority: alerts[0],
      alerts: alerts.slice(1),
      stats,
    };
  }, [cases, i18n.language, i18n.resolvedLanguage, t]);
};
