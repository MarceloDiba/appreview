import { AlertTriangle, CheckCircle2, Info, LockKeyhole, MessageSquareText, Star } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { ExperimentalApifySnapshot } from '@/lib/experimentalApifySnapshot';
import { useOwnerTranslation } from '@/i18n/owner/useOwnerTranslation';

const RatingStars = ({ rating, label }: { rating: number; label: string }) => (
  <div className="flex" aria-label={label}>
    {[1, 2, 3, 4, 5].map((star) => (
      <Star key={star} className={`h-4 w-4 ${star <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
    ))}
  </div>
);

const ExperimentalApifySnapshotDashboard = ({ snapshot }: { snapshot: ExperimentalApifySnapshot }) => {
  const { t, i18n } = useOwnerTranslation();
  const integer = new Intl.NumberFormat(i18n.language);
  const decimal = new Intl.NumberFormat(i18n.language, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const collectedAt = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(snapshot.fetchedAt));
  const lowRatingCount = snapshot.sample.ratingBreakdown['1'] + snapshot.sample.ratingBreakdown['2'];
  const replyRate = snapshot.sample.reviewCount > 0
    ? Math.round((snapshot.sample.ownerRepliesFound / snapshot.sample.reviewCount) * 100)
    : 0;
  const ratingRows = ['5', '4', '3', '2', '1'] as const;

  return (
    <section className="space-y-4" aria-label={t('dashboard.experimental.title')}>
      <Card className="overflow-hidden rounded-xl border-violet-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
        <CardContent className="p-0">
          <div className="flex flex-col gap-3 border-b border-violet-100 bg-violet-50/60 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-violet-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-violet-900">{t('dashboard.experimental.source')}</span>
                <span className="text-xs text-slate-500">{t('dashboard.experimental.notOfficial')}</span>
              </div>
              <h2 className="mt-3 text-lg font-semibold text-slate-950">{t('dashboard.experimental.title')}</h2>
              <p className="mt-1 text-sm text-slate-600">{t('dashboard.experimental.subtitle', { business: snapshot.business.name })}</p>
            </div>
            <p className="text-xs text-slate-500">{t('dashboard.experimental.collectedAt', { date: collectedAt })}</p>
          </div>

          <div className="grid lg:grid-cols-[0.85fr_1fr_1.55fr]">
            <div className="border-b border-slate-200 p-5 lg:border-b-0 lg:border-r">
              <p className="text-sm font-medium text-slate-600">{t('dashboard.experimental.rating')}</p>
              <div className="mt-3 flex items-end gap-3"><p className="text-4xl font-medium tracking-tight text-slate-950">{decimal.format(snapshot.business.googleRating)}</p><RatingStars rating={snapshot.business.googleRating} label={t('dashboard.experimental.ratingAria', { rating: decimal.format(snapshot.business.googleRating) })} /></div>
              <p className="mt-2 text-sm text-slate-600">{t('dashboard.experimental.profileTotal', { count: integer.format(snapshot.business.googleReviewCount) })}</p>
            </div>

            <div className="border-b border-slate-200 p-5 lg:border-b-0 lg:border-r">
              <p className="text-sm font-medium text-slate-600">{t('dashboard.experimental.sample')}</p>
              <p className="mt-3 text-4xl font-medium tracking-tight text-slate-950">{integer.format(snapshot.sample.reviewCount)}</p>
              <p className="mt-2 text-sm text-slate-600">{t('dashboard.experimental.sampleLimit')}</p>
            </div>

            <div className="p-5">
              <p className="text-sm font-semibold text-slate-900">{t('dashboard.experimental.distribution')}</p>
              <div className="mt-3 space-y-2.5">
                {ratingRows.map((rating) => {
                  const count = snapshot.sample.ratingBreakdown[rating];
                  const width = snapshot.sample.reviewCount ? Math.round((count / snapshot.sample.reviewCount) * 100) : 0;
                  return <div key={rating} className="grid grid-cols-[30px_1fr_34px] items-center gap-2 text-xs"><span className="font-medium text-slate-700">{rating} ★</span><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#2457D6]" style={{ width: `${width}%` }} /></div><span className="text-right text-slate-500">{integer.format(count)}</span></div>;
                })}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2 border-t border-slate-200 px-5 py-3.5 text-xs leading-5 text-slate-600">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#2457D6]" aria-hidden="true" />
            <span>{t('dashboard.experimental.disclaimer')}</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-emerald-200 bg-emerald-50/45 shadow-none"><CardContent className="p-5"><CheckCircle2 className="h-5 w-5 text-emerald-700" aria-hidden="true" /><p className="mt-3 text-sm font-semibold text-emerald-950">{t('dashboard.experimental.available.title')}</p><p className="mt-1 text-sm leading-6 text-emerald-900/80">{t('dashboard.experimental.available.body')}</p></CardContent></Card>
        <Card className={lowRatingCount ? 'border-amber-200 bg-amber-50/55 shadow-none' : 'border-slate-200 bg-white shadow-none'}><CardContent className="p-5"><AlertTriangle className={`h-5 w-5 ${lowRatingCount ? 'text-amber-700' : 'text-slate-500'}`} aria-hidden="true" /><p className="mt-3 text-sm font-semibold text-slate-950">{t('dashboard.experimental.attention.title')}</p><p className="mt-1 text-sm leading-6 text-slate-600">{t('dashboard.experimental.attention.body', { count: integer.format(lowRatingCount) })}</p></CardContent></Card>
        <Card className="border-slate-200 bg-white shadow-none"><CardContent className="p-5"><MessageSquareText className="h-5 w-5 text-[#2457D6]" aria-hidden="true" /><p className="mt-3 text-sm font-semibold text-slate-950">{t('dashboard.experimental.replies.title')}</p><p className="mt-1 text-sm leading-6 text-slate-600">{t('dashboard.experimental.replies.body', { count: integer.format(snapshot.sample.ownerRepliesFound), rate: integer.format(replyRate) })}</p></CardContent></Card>
      </div>

      <Card className="border-amber-200 bg-amber-50/45 shadow-none"><CardContent className="flex gap-3 p-5"><LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-amber-800" aria-hidden="true" /><div><h2 className="font-semibold text-slate-950">{t('dashboard.experimental.official.title')}</h2><p className="mt-1 text-sm leading-6 text-slate-700">{t('dashboard.experimental.official.body')}</p></div></CardContent></Card>
    </section>
  );
};

export default ExperimentalApifySnapshotDashboard;
