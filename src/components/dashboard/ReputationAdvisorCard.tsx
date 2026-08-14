import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarClock, Camera, Check, Copy, ExternalLink, Info, LockKeyhole, MessageSquareText, Sparkles, Star } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useOwnerTranslation } from '@/i18n/owner/useOwnerTranslation';
import { AdvisorReview, useReputationAdvisor } from '@/hooks/useReputationAdvisor';

interface ReputationAdvisorCardProps {
  userId?: string;
  previewReview?: AdvisorReview;
  illustrative?: boolean;
  reviewQueueCount?: number;
  reviewQueueHref?: string;
  showProfileHealth?: boolean;
}

const ExampleBadge = () => (
  <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-500">
    Exemplo ilustrativo
  </span>
);

const ConnectionBadge = ({ children }: { children: React.ReactNode }) => (
  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-medium text-slate-600">{children}</span>
);

export const ProfileHealthCard = ({ illustrative = false }: { illustrative?: boolean }) => {
  const { t } = useOwnerTranslation();

  return (
    <Card className="rounded-xl border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
      <CardContent className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">{t('dashboard.profileHealth.title')}</h2>
            <p className="mt-1 text-sm text-slate-500">{t('dashboard.profileHealth.subtitle')}</p>
          </div>
          {illustrative && <ExampleBadge />}
        </div>

        <div className="mt-4 divide-y divide-slate-200 rounded-lg border border-slate-200">
          <div className="flex gap-3 p-3.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50"><MessageSquareText className="h-4 w-4 text-[#2457D6]" /></span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold text-slate-900">{t('dashboard.profileHealth.responses')}</p><ConnectionBadge>{t('dashboard.profileHealth.requiresConnection')}</ConnectionBadge></div>
              <p className="mt-1 text-sm font-medium text-amber-700">{illustrative ? t('dashboard.profileHealth.exampleUnanswered') : t('dashboard.profileHealth.connectToMeasure')}</p>
            </div>
          </div>
          <div className="flex gap-3 p-3.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50"><Camera className="h-4 w-4 text-[#2457D6]" /></span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold text-slate-900">{t('dashboard.profileHealth.photos')}</p><ConnectionBadge>{t('dashboard.profileHealth.requiresConnection')}</ConnectionBadge></div>
              <p className="mt-1 text-sm font-medium text-amber-700">{illustrative ? t('dashboard.profileHealth.examplePhotoAge') : t('dashboard.profileHealth.connectToMeasure')}</p>
            </div>
          </div>
          <Link to="/settings" className="flex gap-3 p-3.5 transition-colors hover:bg-slate-50">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-50"><Info className="h-4 w-4 text-[#6D43C0]" /></span>
            <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-slate-900">{t('dashboard.profileHealth.businessInfo')}</p><p className="mt-1 text-sm text-[#2457D6]">{t('dashboard.profileHealth.reviewInfo')}</p></div>
            <ArrowRight className="mt-2 h-4 w-4 text-slate-400" />
          </Link>
        </div>

        <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50/70 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-[#2457D6]"><Sparkles className="h-4 w-4 text-[#6D43C0]" />{t('dashboard.profileHealth.readingTitle')}</p>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">{t('dashboard.profileHealth.readingBody')}</p>
        </div>

        <a className="mt-4 inline-flex items-center text-xs font-medium text-[#2457D6] hover:underline" href="https://support.google.com/business/answer/7091" target="_blank" rel="noopener noreferrer">
          {t('dashboard.profileHealth.bestPractices')}<ExternalLink className="ml-1 h-3.5 w-3.5" />
        </a>
      </CardContent>
    </Card>
  );
};

const ReputationAdvisorCard = ({ userId, previewReview, illustrative = false, reviewQueueCount = 0, reviewQueueHref = '/reviews', showProfileHealth = true }: ReputationAdvisorCardProps) => {
  const { t, i18n } = useOwnerTranslation();
  const live = useReputationAdvisor(illustrative ? undefined : userId);
  const review = previewReview || live.review;
  const loading = illustrative ? false : live.loading;
  const error = illustrative ? null : live.error;
  const [copied, setCopied] = useState(false);
  const [deferred, setDeferred] = useState(false);

  const prioritizedReason = useMemo(
    () => review && (review.rating <= 3 ? t('dashboard.advisor.priorityReasonLow') : t('dashboard.advisor.priorityReasonRecent')),
    [review, t]
  );

  const copySuggestion = async () => {
    if (!review?.suggestedReply) return;
    try {
      await navigator.clipboard.writeText(review.suggestedReply);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
      toast.success(t('dashboard.advisor.copied'));
    } catch {
      toast.error(t('dashboard.advisor.copyError'));
    }
  };

  if (loading) return <Card className="h-80 animate-pulse bg-white" />;

  return (
    <div className={showProfileHealth ? 'grid gap-4 lg:grid-cols-[1.55fr_1fr]' : ''}>
      <Card className="overflow-hidden rounded-xl border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
        <CardContent className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-950">{t('dashboard.advisor.attentionTitle')}</h2>
            {illustrative && <ExampleBadge />}
          </div>

          {reviewQueueCount > 0 && (
            <div className="mt-4 flex flex-col gap-3 rounded-lg border border-blue-100 bg-blue-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#2457D6]"><MessageSquareText className="h-4 w-4" /></span>
                <div><p className="font-semibold text-slate-950">{t('dashboard.advisor.queueTitle', { count: reviewQueueCount })}</p><p className="mt-0.5 text-sm text-slate-600">{t('dashboard.advisor.queueSubtitle')}</p></div>
              </div>
              <Button asChild size="sm" className="shrink-0 rounded-full bg-[#2457D6] px-5 hover:bg-[#1d47b5]"><Link to={reviewQueueHref}>{t('dashboard.advisor.queueAction')}</Link></Button>
            </div>
          )}

          {error ? (
            <p className="mt-6 text-sm text-stone-600">{t('dashboard.advisor.error')}</p>
          ) : !review ? (
            <div className="mt-6 rounded-xl bg-stone-50 p-6">
              <p className="font-medium text-stone-900">{t('dashboard.advisor.emptyTitle')}</p>
              <p className="mt-2 text-sm text-stone-600">{t('dashboard.advisor.emptyBody')}</p>
              <Button asChild variant="link" className="mt-3 h-auto p-0 text-[#2457D6]">
                <Link to="/reviews">{t('dashboard.advisor.openReviews')}</Link>
              </Button>
            </div>
          ) : deferred ? (
            <div className="mt-6 flex min-h-72 flex-col items-start justify-center rounded-xl bg-stone-50 p-6">
              <CalendarClock className="h-8 w-8 text-[#2457D6]" />
              <p className="mt-4 text-lg font-semibold text-stone-950">{t('dashboard.advisor.deferredTitle')}</p>
              <p className="mt-2 max-w-xl text-sm text-stone-600">{t('dashboard.advisor.deferredBody')}</p>
              <Button variant="outline" className="mt-5" onClick={() => setDeferred(false)}>{t('dashboard.advisor.undoDeferred')}</Button>
            </div>
          ) : (
            <div className="mt-6 grid gap-5 md:grid-cols-[0.9fr_1.1fr]">
              <section className="md:border-r md:border-stone-200 md:pr-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-stone-950">{review.authorName}</p>
                    <p className="mt-1 text-xs text-stone-500">
                      {new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' }).format(new Date(review.time))}
                    </p>
                  </div>
                  <div className="flex" aria-label={t('dashboard.advisor.ratingAria', { rating: review.rating })}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className={`h-5 w-5 ${star <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-stone-200'}`} />
                    ))}
                  </div>
                </div>
                <p className="mt-5 text-sm leading-relaxed text-stone-700">{review.text}</p>
                {illustrative && <div className="mt-3"><ExampleBadge /></div>}
                <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <p className="flex items-center gap-2 text-sm font-semibold text-amber-950"><Info className="h-4 w-4" />{t('dashboard.advisor.whyTitle')}</p>
                  <p className="mt-2 text-xs leading-relaxed text-amber-900">{prioritizedReason}</p>
                </div>
              </section>

              <section>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-stone-900">{t('dashboard.advisor.replyLabel')}</p>
                  <span className="text-xs text-stone-500">{t('dashboard.advisor.editable')}</span>
                </div>
                <div className="mt-3 rounded-lg border border-stone-300 bg-white p-4">
                  <p className="text-sm leading-relaxed text-stone-700">{review.suggestedReply}</p>
                  <div className="mt-4 border-t border-stone-200 pt-3">
                    <Button size="sm" variant="ghost" className="h-auto p-0 text-stone-600" onClick={() => void copySuggestion()}>
                      {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                      {copied ? t('dashboard.advisor.copiedButton') : t('dashboard.advisor.copy')}
                    </Button>
                  </div>
                </div>
                <Button asChild className="mt-3 w-full rounded-full bg-[#2457D6] hover:bg-[#1d47b5]">
                  <Link to={reviewQueueHref}><MessageSquareText className="mr-2 h-4 w-4" />{reviewQueueCount > 0 ? t('dashboard.advisor.queueAction') : t('dashboard.advisor.reviewReply')}</Link>
                </Button>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {review.googleMapsUri ? (
                    <Button asChild variant="outline" size="sm"><a href={review.googleMapsUri} target="_blank" rel="noopener noreferrer"><ExternalLink className="mr-2 h-4 w-4" />{t('dashboard.advisor.source')}</a></Button>
                  ) : (
                    <Button variant="outline" size="sm" disabled><ExternalLink className="mr-2 h-4 w-4" />{t('dashboard.advisor.source')}</Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => setDeferred(true)}><CalendarClock className="mr-2 h-4 w-4" />{t('dashboard.advisor.defer')}</Button>
                </div>
              </section>
              <p className="text-xs leading-relaxed text-stone-500 md:col-span-2"><LockKeyhole className="mr-1 inline h-3.5 w-3.5" />{t('dashboard.advisor.disclaimer')}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {showProfileHealth && <ProfileHealthCard illustrative={illustrative} />}
    </div>
  );
};

export default ReputationAdvisorCard;
