import { AlertTriangle, ArrowRight, CheckCircle2, Info, LockKeyhole, MessageSquareText, QrCode, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
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

export const ExperimentalGoogleOutcomeCard = ({ snapshot }: { snapshot: ExperimentalApifySnapshot }) => {
  const { t, i18n } = useOwnerTranslation();
  const integer = new Intl.NumberFormat(i18n.language);
  const decimal = new Intl.NumberFormat(i18n.language, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const collectedAt = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' }).format(new Date(snapshot.fetchedAt));
  const ratingRows = ['5', '4', '3', '2', '1'] as const;

  return (
    <Card className="overflow-hidden rounded-xl border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
      <CardContent className="p-0">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-semibold text-slate-950">{t('dashboard.googleOutcome.summaryTitle')}</h2><span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[11px] font-medium text-violet-800">{t('dashboard.experimental.source')}</span></div>
            <p className="mt-1 text-sm text-slate-500">{t('dashboard.experimental.summarySubtitle')}</p>
          </div>
          <p className="text-xs text-slate-500">{t('dashboard.experimental.collectedAt', { date: collectedAt })}</p>
        </div>

        <div className="grid lg:grid-cols-[0.85fr_1fr_1.55fr]">
          <div className="border-b border-slate-200 p-5 lg:border-b-0 lg:border-r"><p className="text-sm font-medium text-slate-600">{t('dashboard.googleOutcome.averageRating')}</p><div className="mt-3 flex items-end gap-3"><p className="text-4xl font-medium tracking-tight text-slate-950">{decimal.format(snapshot.business.googleRating)}</p><RatingStars rating={snapshot.business.googleRating} label={t('dashboard.experimental.ratingAria', { rating: decimal.format(snapshot.business.googleRating) })} /></div><p className="mt-2 text-sm text-slate-500">{t('dashboard.experimental.publicProfile')}</p></div>
          <div className="border-b border-slate-200 p-5 lg:border-b-0 lg:border-r"><p className="text-sm font-medium text-slate-600">{t('dashboard.googleOutcome.totalReviews')}</p><p className="mt-3 text-4xl font-medium tracking-tight text-slate-950">{integer.format(snapshot.business.googleReviewCount)}</p><p className="mt-2 text-sm text-slate-500">{t('dashboard.experimental.profileTotal', { count: integer.format(snapshot.business.googleReviewCount) })}</p></div>
          <div className="p-5"><p className="text-sm font-semibold text-slate-900">{t('dashboard.experimental.distribution')}</p><p className="mt-1 text-xs text-slate-500">{t('dashboard.experimental.sampleDistribution', { count: integer.format(snapshot.sample.reviewCount) })}</p><div className="mt-3 space-y-2.5">{ratingRows.map((rating) => { const count = snapshot.sample.ratingBreakdown[rating]; const width = snapshot.sample.reviewCount ? Math.round((count / snapshot.sample.reviewCount) * 100) : 0; return <div key={rating} className="grid grid-cols-[30px_1fr_34px] items-center gap-2 text-xs"><span className="font-medium text-slate-700">{rating} ★</span><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#2457D6]" style={{ width: `${width}%` }} /></div><span className="text-right text-slate-500">{integer.format(count)}</span></div>; })}</div></div>
        </div>

        <div className="flex items-start gap-2 border-t border-slate-200 px-5 py-3.5 text-xs leading-5 text-slate-600"><Info className="mt-0.5 h-4 w-4 shrink-0 text-[#2457D6]" aria-hidden="true" /><span>{t('dashboard.experimental.summaryDisclaimer')}</span></div>
      </CardContent>
    </Card>
  );
};

export const ExperimentalAdvisorCard = ({ snapshot }: { snapshot: ExperimentalApifySnapshot }) => {
  const { t, i18n } = useOwnerTranslation();
  const integer = new Intl.NumberFormat(i18n.language);
  const lowRatingCount = snapshot.sample.ratingBreakdown['1'] + snapshot.sample.ratingBreakdown['2'];
  const responseRate = snapshot.sample.reviewCount ? Math.round((snapshot.sample.ownerRepliesFound / snapshot.sample.reviewCount) * 100) : 0;

  return (
    <Card className="overflow-hidden rounded-xl border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
      <CardContent className="p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold text-slate-950">{t('dashboard.advisor.attentionTitle')}</h2><span className="rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-medium text-violet-800">{t('dashboard.experimental.source')}</span></div>
        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50/60 p-4 sm:p-5">
          <div className="flex gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-amber-800"><AlertTriangle className="h-5 w-5" aria-hidden="true" /></span><div><h3 className="font-semibold text-slate-950">{t('dashboard.experimental.priority.title', { count: integer.format(lowRatingCount) })}</h3><p className="mt-1 text-sm leading-6 text-slate-700">{t('dashboard.experimental.priority.body')}</p></div></div>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-slate-200 p-4"><p className="text-sm font-semibold text-slate-900">{t('dashboard.experimental.priority.safeTitle')}</p><p className="mt-1 text-sm leading-6 text-slate-600">{t('dashboard.experimental.priority.safeBody')}</p></div>
          <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-4"><p className="text-sm font-semibold text-slate-900">{t('dashboard.experimental.priority.observedTitle')}</p><p className="mt-1 text-sm leading-6 text-slate-600">{t('dashboard.experimental.priority.observedBody', { count: integer.format(snapshot.sample.ownerRepliesFound), rate: integer.format(responseRate) })}</p></div>
        </div>
        <div className="mt-5 flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs leading-5 text-slate-500"><LockKeyhole className="mr-1 inline h-3.5 w-3.5" />{t('dashboard.experimental.priority.disclaimer')}</p><Button asChild variant="outline" className="shrink-0 border-[#2457D6] text-[#2457D6] hover:bg-blue-50"><Link to="/settings">{t('dashboard.experimental.priority.action')}<ArrowRight className="ml-2 h-4 w-4" /></Link></Button></div>
      </CardContent>
    </Card>
  );
};

export const ExperimentalGooglePathEmptyCard = () => {
  const { t } = useOwnerTranslation();

  return (
    <Card className="rounded-xl border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
      <CardContent className="grid gap-4 p-5 md:grid-cols-[1.15fr_repeat(3,1fr)] md:items-center">
        <div>
          <h2 className="text-base font-semibold text-slate-950">{t('dashboard.googleOutcome.pathTitle')}</h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">{t('dashboard.experimental.path.disclaimer')}</p>
        </div>
        <div className="flex items-center gap-3 md:border-l md:border-slate-200 md:pl-5"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50"><QrCode className="h-4 w-4 text-[#2457D6]" /></span><div><p className="text-2xl font-semibold text-slate-950">—</p><p className="text-xs text-slate-500">{t('dashboard.googleOutcome.qrOpens')}</p></div></div>
        <div className="flex items-center gap-3 md:border-l md:border-slate-200 md:pl-5"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50"><MessageSquareText className="h-4 w-4 text-[#2457D6]" /></span><div><p className="text-sm font-semibold text-slate-900">{t('dashboard.experimental.path.waitingTitle')}</p><p className="mt-1 text-xs leading-relaxed text-slate-500">{t('dashboard.experimental.path.waitingBody')}</p></div></div>
        <Button asChild variant="link" className="h-auto justify-start p-0 text-[#2457D6] md:col-start-4 md:justify-end"><Link to="/qrcodes">{t('dashboard.experimental.path.action')}<ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
      </CardContent>
    </Card>
  );
};

export default ExperimentalApifySnapshotDashboard;
