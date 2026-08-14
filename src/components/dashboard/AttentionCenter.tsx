import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle2, Clock, Info, Lightbulb, MailWarning } from 'lucide-react';
import type { AlertLevel, AttentionAlert, AttentionInsights } from '@/hooks/useAttentionInsights';
import { useOwnerTranslation } from '@/i18n/owner/useOwnerTranslation';

interface AttentionCenterProps {
  insights: AttentionInsights;
  loading?: boolean;
}

/**
 * State is carried by icon + written label as well as colour, so the panel stays
 * readable in greyscale, in print, and for colour-blind readers.
 */
const levelStyles: Record<
  AlertLevel,
  { icon: React.ElementType; ring: string; chip: string; iconColor: string }
> = {
  critical: {
    icon: MailWarning,
    ring: 'border-red-200 bg-red-50',
    chip: 'bg-red-100 text-red-900',
    iconColor: 'text-red-600',
  },
  serious: {
    icon: AlertTriangle,
    ring: 'border-orange-200 bg-orange-50',
    chip: 'bg-orange-100 text-orange-900',
    iconColor: 'text-orange-600',
  },
  warning: {
    icon: Clock,
    ring: 'border-amber-200 bg-amber-50',
    chip: 'bg-amber-100 text-amber-900',
    iconColor: 'text-amber-600',
  },
  neutral: {
    icon: Info,
    ring: 'border-gray-200 bg-gray-50',
    chip: 'bg-gray-100 text-gray-800',
    iconColor: 'text-gray-600',
  },
  good: {
    icon: CheckCircle2,
    ring: 'border-green-200 bg-green-50',
    chip: 'bg-green-100 text-green-900',
    iconColor: 'text-green-700',
  },
};

const StatTile: React.FC<{
  label: string;
  value: string;
  hint?: string;
}> = ({ label, value, hint }) => (
  <div className="rounded-lg border border-gray-200 bg-white p-4">
    <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
    <div className="mt-1 text-2xl font-bold text-gray-900">{value}</div>
    {hint && <div className="mt-1 text-xs text-gray-500">{hint}</div>}
  </div>
);

const AlertRow: React.FC<{ alert: AttentionAlert }> = ({ alert }) => {
  const style = levelStyles[alert.level];
  const Icon = style.icon;
  return (
    <div className="flex items-start gap-3 border-t border-gray-100 py-3 first:border-t-0 first:pt-0">
      <Icon className={`mt-0.5 h-4 w-4 flex-shrink-0 ${style.iconColor}`} aria-hidden="true" />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${style.chip}`}>
            {alert.label}
          </span>
          <span className="text-sm font-medium text-gray-900">{alert.title}</span>
        </div>
        <p className="mt-1 text-sm text-gray-600">{alert.detail}</p>
      </div>
    </div>
  );
};

const AttentionCenter: React.FC<AttentionCenterProps> = ({ insights, loading }) => {
  const { t, i18n } = useOwnerTranslation();

  if (loading) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-gray-500">
          {t('attention.ui.analyzing')}
        </CardContent>
      </Card>
    );
  }

  const { priority, alerts, stats } = insights;
  const style = levelStyles[priority.level];
  const PriorityIcon = style.icon;
  const locale = i18n.resolvedLanguage || i18n.language;
  const integerFormat = new Intl.NumberFormat(locale);
  const decimalFormat = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  const percentFormat = new Intl.NumberFormat(locale, { style: 'percent' });

  const weekAverageLabel =
    stats.weekAverage !== null ? decimalFormat.format(stats.weekAverage) : '—';
  const weekAverageHint =
    stats.weekAverage !== null && stats.baselineAverage !== null
      ? t('attention.ui.prevAverage', { value: decimalFormat.format(stats.baselineAverage) })
      : t('attention.ui.noHistory');

  const resolutionLabel =
    stats.resolutionRate !== null ? percentFormat.format(stats.resolutionRate) : '—';

  return (
    <section aria-label={t('attention.ui.heading')} className="space-y-4">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-xl font-semibold text-gray-900">{t('attention.ui.heading')}</h2>
        <span className="text-xs text-gray-500">{t('attention.ui.last7')}</span>
      </div>

      {/* The single most important thing right now. */}
      <Card className={`border ${style.ring}`}>
        <CardContent className="p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <PriorityIcon
              className={`mt-1 h-5 w-5 flex-shrink-0 ${style.iconColor}`}
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${style.chip}`}>
                  {priority.label}
                </span>
                <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  {t('attention.ui.priorityNow')}
                </span>
              </div>

              <h3 className="mt-2 text-lg font-semibold text-gray-900 sm:text-xl">
                {priority.title}
              </h3>
              <p className="mt-1 text-sm text-gray-700">{priority.detail}</p>

              <div className="mt-4 flex items-start gap-2 rounded-md bg-white/70 p-3">
                <Lightbulb
                  className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-500"
                  aria-hidden="true"
                />
                <p className="text-sm text-gray-700">{priority.action}</p>
              </div>

              {stats.openCases > 0 && (
                <div className="mt-4">
                  <Button asChild size="sm">
                    <Link to="/reviews">{t('attention.ui.openCasesBtn')}</Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label={t('attention.ui.newCases')}
          value={integerFormat.format(stats.newCases)}
          hint={
            stats.oldestOpenDays !== null
              ? t('attention.ui.oldest', { count: stats.oldestOpenDays })
              : t('attention.ui.nothingPending')
          }
        />
        <StatTile
          label={t('attention.ui.inProgress')}
          value={integerFormat.format(stats.inProgressCases)}
          hint={t('attention.ui.withoutOwner', { count: stats.unassignedCases })}
        />
        <StatTile
          label={t('attention.ui.awaitingReturn')}
          value={integerFormat.format(stats.awaitingContact)}
          hint={t('attention.ui.leftContact')}
        />
        <StatTile
          label={t('attention.ui.resolutionRate')}
          value={resolutionLabel}
          hint={t('attention.ui.resolvedTotal', { count: stats.resolvedTotal })}
        />
      </div>

      {(stats.weekAverage !== null || stats.baselineAverage !== null) && (
        <p className="text-xs text-gray-500">
          {t('attention.ui.weekSignal', { value: weekAverageLabel, comparison: weekAverageHint })}
        </p>
      )}

      {alerts.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
              {t('attention.ui.alsoWorth')}
            </h3>
            <div>
              {alerts.map((alert) => (
                <AlertRow key={alert.id} alert={alert} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </section>
  );
};

export default AttentionCenter;
