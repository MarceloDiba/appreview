import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Info, MessageSquareText, MousePointer2, QrCode, Star, TrendingUp } from 'lucide-react';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { GoogleOutcomeData } from '@/hooks/useGoogleOutcome';
import { useOwnerTranslation } from '@/i18n/owner/useOwnerTranslation';

interface GoogleOutcomeCardProps {
  data: GoogleOutcomeData | null;
  loading?: boolean;
  error?: string | null;
  illustrative?: boolean;
}

const ExampleBadge = () => (
  <span className="rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-[11px] font-medium text-indigo-700">
    Exemplo ilustrativo
  </span>
);

export const GooglePathCard = ({ data, illustrative = false }: { data: GoogleOutcomeData; illustrative?: boolean }) => {
  const { t, i18n } = useOwnerTranslation();
  const integer = new Intl.NumberFormat(i18n.language);
  const percent = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 0 });

  return (
    <Card className="border-stone-200 bg-white shadow-sm">
      <CardContent className="grid gap-4 p-5 md:grid-cols-[1.2fr_repeat(3,1fr)] md:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-stone-950">{t('dashboard.googleOutcome.pathTitle')}</h2>
            {illustrative && <ExampleBadge />}
          </div>
          <p className="mt-1 text-xs leading-relaxed text-stone-500">{t('dashboard.googleOutcome.pathDisclaimer')}</p>
        </div>
        <div className="flex items-center gap-3 md:border-l md:border-stone-200 md:pl-5">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50"><QrCode className="h-5 w-5 text-[#102878]" /></span>
          <div><p className="text-2xl font-bold">{integer.format(data.qrOpens)}</p><p className="text-xs text-stone-500">{t('dashboard.googleOutcome.qrOpens')}</p></div>
        </div>
        <div className="flex items-center gap-3 md:border-l md:border-stone-200 md:pl-5">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50"><MousePointer2 className="h-5 w-5 text-[#102878]" /></span>
          <div><p className="text-2xl font-bold">{integer.format(data.googleClicks)}</p><p className="text-xs text-stone-500">{t('dashboard.googleOutcome.googleClicks')}</p></div>
        </div>
        <div className="flex items-center gap-3 md:border-l md:border-stone-200 md:pl-5">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50"><TrendingUp className="h-5 w-5 text-emerald-700" /></span>
          <div><p className="text-2xl font-bold text-emerald-700">{data.clickThroughRate === null ? '—' : `${percent.format(data.clickThroughRate)}%`}</p><p className="text-xs text-stone-500">{t('dashboard.googleOutcome.continuation')}</p></div>
        </div>
        <Button asChild variant="link" className="h-auto justify-start p-0 text-[#102878] md:col-start-4 md:justify-end">
          <Link to="/reviews">{t('dashboard.googleOutcome.openReviews')}<ArrowRight className="ml-2 h-4 w-4" /></Link>
        </Button>
      </CardContent>
    </Card>
  );
};

const GoogleOutcomeCard = ({ data, loading = false, error = null, illustrative = false }: GoogleOutcomeCardProps) => {
  const { t, i18n } = useOwnerTranslation();
  const locale = i18n.language;

  if (loading) return <Card className="h-72 animate-pulse bg-white" />;

  if (error) {
    return (
      <Card className="border-stone-200 bg-white">
        <CardContent className="p-6 text-sm text-stone-600">{t('dashboard.googleOutcome.loadError')}</CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="border-stone-200 bg-white">
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold text-stone-950">{t('dashboard.googleOutcome.emptyTitle')}</h2>
          <p className="mt-2 max-w-2xl text-sm text-stone-600">{t('dashboard.googleOutcome.empty')}</p>
          <Button asChild className="mt-5 bg-[#102878] hover:bg-[#0b1d5b]">
            <Link to="/settings">{t('dashboard.googleOutcome.configure')}</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const integer = new Intl.NumberFormat(locale);
  const decimal = new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const progressed = (data.reviewGrowth || 0) > 0 || (data.ratingChange || 0) > 0;
  const chartData = data.history.map((point) => ({
    ...point,
    label: new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short' }).format(new Date(point.capturedAt)),
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-stone-950 md:text-4xl">
              {progressed ? t('dashboard.googleOutcome.progressTitle') : t('dashboard.googleOutcome.snapshotTitle')}
            </h1>
            {illustrative && <ExampleBadge />}
          </div>
          <p className="mt-2 text-stone-600">{t('dashboard.googleOutcome.snapshotSubtitle')}</p>
        </div>
        <p className="text-xs text-stone-500">
          {t('dashboard.googleOutcome.lastUpdate', {
            date: new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(data.lastUpdatedAt)),
          })}
        </p>
      </div>

      <Card className="overflow-hidden border-stone-200 bg-white shadow-sm">
        <CardContent className="p-0">
          <div className="grid lg:grid-cols-[1fr_1fr_1.8fr]">
            <div className="border-b border-stone-200 p-6 lg:border-b-0 lg:border-r">
              <div className="flex items-center gap-3 text-sm font-medium text-stone-600">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-50">
                  <Star className="h-5 w-5 fill-amber-400 text-amber-400" aria-hidden="true" />
                </span>
                {t('dashboard.googleOutcome.averageRating')}
              </div>
              <p className="mt-3 text-4xl font-bold text-stone-950">{decimal.format(data.averageRating)}</p>
              <p className="mt-2 text-sm text-emerald-700">
                {data.ratingChange === null
                  ? t('dashboard.googleOutcome.awaitingBaseline')
                  : t('dashboard.googleOutcome.ratingChange', {
                      value: `${data.ratingChange >= 0 ? '+' : ''}${decimal.format(data.ratingChange)}`,
                    })}
              </p>
              {illustrative && <div className="mt-3"><ExampleBadge /></div>}
            </div>

            <div className="border-b border-stone-200 p-6 lg:border-b-0 lg:border-r">
              <div className="flex items-center gap-3 text-sm font-medium text-stone-600">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50">
                  <MessageSquareText className="h-5 w-5 text-[#102878]" aria-hidden="true" />
                </span>
                {t('dashboard.googleOutcome.totalReviews')}
              </div>
              <p className="mt-3 text-4xl font-bold text-stone-950">{integer.format(data.totalReviews)}</p>
              <p className="mt-2 text-sm text-emerald-700">
                {data.reviewGrowth === null
                  ? t('dashboard.googleOutcome.awaitingBaseline')
                  : t('dashboard.googleOutcome.reviewGrowth', {
                      value: `${data.reviewGrowth >= 0 ? '+' : ''}${integer.format(data.reviewGrowth)}`,
                    })}
              </p>
              {illustrative && <div className="mt-3"><ExampleBadge /></div>}
            </div>

            <div className="min-h-56 p-6">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-stone-900">{t('dashboard.googleOutcome.chartTitle')}</p>
                {illustrative && <ExampleBadge />}
              </div>
              {chartData.length >= 2 ? (
                <div className="mt-4 h-36" aria-label={t('dashboard.googleOutcome.chartAria')}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                      <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#78716c' }} />
                      <YAxis domain={['dataMin - 0.2', 'dataMax + 0.2']} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#78716c' }} />
                      <Tooltip formatter={(value: number) => decimal.format(value)} />
                      <Line type="monotone" dataKey="averageRating" stroke="#102878" strokeWidth={3} dot={false} activeDot={{ r: 5 }} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="mt-4 flex h-36 items-center justify-center rounded-lg bg-stone-50 px-6 text-center text-sm text-stone-500">
                  {t('dashboard.googleOutcome.noChartHistory')}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2 border-t border-stone-200 px-6 py-4 text-sm text-stone-600 md:flex-row md:items-center">
            <Info className="h-4 w-4 shrink-0 text-[#102878]" aria-hidden="true" />
            <strong className="text-stone-900">{t('dashboard.googleOutcome.advisorReading')}</strong>
            <span>{progressed ? t('dashboard.googleOutcome.progressReading') : t('dashboard.googleOutcome.neutralReading')}</span>
            <span className="md:ml-auto md:text-right">{t('dashboard.googleOutcome.causality')}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GoogleOutcomeCard;
