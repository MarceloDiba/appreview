import { useEffect, useMemo, useState } from 'react';
import { Check, ExternalLink, RefreshCw, ShieldCheck, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { buildReplySuggestions } from '@/lib/replySuggestions';
import { useGoogleBusinessReviewQueue } from '@/hooks/useGoogleBusinessReviewQueue';
import { useOwnerTranslation } from '@/i18n/owner/useOwnerTranslation';

const GoogleBusinessReviewQueue = ({ userId, businessName, businessCountry }: { userId: string; businessName?: string; businessCountry?: string }) => {
  const { t, i18n } = useOwnerTranslation();
  const queue = useGoogleBusinessReviewQueue(userId);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const activeReview = useMemo(
    () => queue.reviews.find((review) => review.id === activeId) || queue.reviews[0] || null,
    [activeId, queue.reviews],
  );

  useEffect(() => {
    if (!activeReview) {
      setActiveId(null);
      setReply('');
      return;
    }
    setActiveId(activeReview.id);
    setReply(buildReplySuggestions({
      channel: 'public',
      rating: activeReview.rating,
      text: activeReview.comment || '',
      customerName: activeReview.reviewer_name || t('reviews.google.official.anonymous'),
      businessName: businessName || queue.locationTitle || '',
      businessCountry,
    })[0]?.body || '');
  }, [activeReview?.id, businessName, businessCountry, queue.locationTitle, t]);

  if (queue.loading) return <div className="py-8 text-center text-gray-500">{t('reviews.loading')}</div>;

  if (queue.connectionStatus !== 'connected') {
    return (
      <Card className="border-blue-100 shadow-none">
        <CardContent className="p-5">
          <h2 className="font-semibold text-slate-950">{t('reviews.google.official.title')}</h2>
          <p className="mt-1 text-sm text-slate-600">{t('reviews.google.official.connectFirst')}</p>
          <Button asChild className="mt-4 bg-[#2457D6] hover:bg-[#1d47b0]"><Link to="/settings">{t('reviews.google.official.connectAction')}</Link></Button>
        </CardContent>
      </Card>
    );
  }

  if (!queue.locationTitle) {
    return (
      <Card className="border-amber-200 shadow-none"><CardContent className="p-5">
        <h2 className="font-semibold text-slate-950">{t('reviews.google.official.title')}</h2>
        <p className="mt-1 text-sm text-slate-600">{t('reviews.google.official.selectLocation')}</p>
      </CardContent></Card>
    );
  }

  const publish = async () => {
    if (!activeReview || !reply.trim()) return;
    if (await queue.publishReply(activeReview.id, reply.trim())) toast.success(t('reviews.google.official.published'));
    else toast.error(t('reviews.google.official.publishError'));
  };

  return (
    <Card className="rounded-xl border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
      <CardContent className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><h2 className="text-xl font-semibold text-slate-950">{t('reviews.google.official.title')}</h2><p className="mt-1 text-sm text-slate-500">{queue.locationTitle}</p></div>
          <Button variant="outline" onClick={() => void queue.syncAll()} disabled={queue.syncing}><RefreshCw className={`mr-2 h-4 w-4 ${queue.syncing ? 'animate-spin' : ''}`} />{queue.syncing ? t('reviews.google.official.syncing') : t('reviews.google.official.sync')}</Button>
        </div>

        {!queue.syncComplete && <p className="mt-4 flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />{t('reviews.google.official.incomplete')}</p>}
        {queue.error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{t('reviews.google.official.error')}</p>}

        {queue.syncComplete && !activeReview ? <p className="mt-6 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800">{t('reviews.google.official.empty')}</p> : activeReview ? (
          <div className="mt-5 grid gap-5 lg:grid-cols-[1.45fr_0.85fr]">
            <section>
              <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-semibold text-slate-950">{activeReview.reviewer_name || t('reviews.google.official.anonymous')}</p><p className="mt-1 text-xs text-slate-500">{activeReview.review_updated_at ? new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' }).format(new Date(activeReview.review_updated_at)) : ''}</p></div><div className="flex">{[1, 2, 3, 4, 5].map((star) => <Star key={star} className={`h-5 w-5 ${star <= activeReview.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />)}</div></div>
              <p className="mt-5 text-sm leading-relaxed text-slate-700">{activeReview.comment || t('reviews.google.official.noComment')}</p>
              <label className="mt-6 block text-sm font-semibold text-slate-900" htmlFor="google-reply">{t('reviews.google.official.draft')}</label>
              <Textarea id="google-reply" className="mt-3 min-h-36" value={reply} onChange={(event) => setReply(event.target.value)} />
              <Button className="mt-4 w-full rounded-full bg-[#2457D6] hover:bg-[#1d47b0]" disabled={queue.publishing || !reply.trim()} onClick={() => void publish()}><Check className="mr-2 h-4 w-4" />{queue.publishing ? t('reviews.google.official.publishing') : t('reviews.google.official.publish')}</Button>
              <p className="mt-3 text-xs text-slate-500">{t('reviews.google.official.disclaimer')}</p>
            </section>
            <aside className="divide-y divide-slate-200 rounded-lg border border-slate-200">
              {queue.reviews.map((review) => <button key={review.id} type="button" onClick={() => setActiveId(review.id)} className={`flex w-full items-center gap-3 p-3 text-left ${review.id === activeReview.id ? 'bg-blue-50' : 'hover:bg-slate-50'}`}><span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm font-semibold text-slate-600">{review.rating}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-slate-900">{review.reviewer_name || t('reviews.google.official.anonymous')}</span><span className="block truncate text-xs text-slate-500">{review.comment || t('reviews.google.official.noComment')}</span></span><ExternalLink className="h-4 w-4 text-slate-300" /></button>)}</aside>
          </div>
        ) : <p className="mt-5 text-sm text-slate-600">{t('reviews.google.official.startSync')}</p>}
      </CardContent>
    </Card>
  );
};

export default GoogleBusinessReviewQueue;
