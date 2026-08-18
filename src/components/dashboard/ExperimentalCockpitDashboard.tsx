import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Copy,
  ExternalLink,
  Info,
  Lightbulb,
  MessageCircle,
  MessageSquareText,
  QrCode,
  Send,
  Sparkles,
  Star,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { ExperimentalApifySnapshot } from '@/lib/experimentalApifySnapshot';
import { useOwnerTranslation } from '@/i18n/owner/useOwnerTranslation';
import { LocalWhatsAppState, useLocalWhatsApp } from '@/hooks/useLocalWhatsApp';
import { maskInternationalPhone, sendLocalWhatsAppText } from '@/lib/localWhatsApp';
import { ReviewFunnelMetrics, useReviewFunnelMetrics } from '@/hooks/useReviewFunnelMetrics';
import { useGoogleBusinessReviewQueue } from '@/hooks/useGoogleBusinessReviewQueue';
import { buildReplySuggestions } from '@/lib/replySuggestions';

type CockpitTab = 'overview' | 'reviews' | 'questions' | 'photos' | 'performance' | 'practices' | 'whatsapp';
type SavedNotificationPreferences = {
  weeklyEnabled: boolean;
  priorityEnabled: boolean;
  recipient: string;
  day: 'monday' | 'friday';
  time: string;
  consented: boolean;
};

const ratingRows = ['5', '4', '3', '2', '1'] as const;
const notificationStorageKey = 'binno.local-whatsapp-preferences';
const defaultNotificationPreferences: SavedNotificationPreferences = {
  weeklyEnabled: true,
  priorityEnabled: true,
  recipient: '',
  day: 'monday',
  time: '09:00',
  consented: false,
};
type AssistedReviewAction = {
  status: 'draft' | 'copied' | 'manager-confirmed';
  draft?: string;
};
const assistedQueueStorageKey = 'binno.assisted-public-review-actions';

const readAssistedReviewActions = (): Record<string, AssistedReviewAction> => {
  try {
    return JSON.parse(window.localStorage.getItem(assistedQueueStorageKey) || '{}') as Record<string, AssistedReviewAction>;
  } catch {
    return {};
  }
};

const readNotificationPreferences = (): SavedNotificationPreferences => {
  try {
    const value = JSON.parse(window.localStorage.getItem(notificationStorageKey) || '{}') as Partial<SavedNotificationPreferences>;
    return { ...defaultNotificationPreferences, ...value };
  } catch {
    return defaultNotificationPreferences;
  }
};

const ExperimentalCockpitDashboard = ({ snapshot, userId }: { snapshot: ExperimentalApifySnapshot; userId?: string }) => {
  const { t, i18n } = useOwnerTranslation();
  const [activeTab, setActiveTab] = useState<CockpitTab>('overview');
  const localWhatsApp = useLocalWhatsApp();
  const funnel = useReviewFunnelMetrics(userId);
  const officialQueue = useGoogleBusinessReviewQueue(import.meta.env.VITE_GOOGLE_BUSINESS_OAUTH_ENABLED === 'true' ? userId : undefined);
  const integer = new Intl.NumberFormat(i18n.language);
  const decimal = new Intl.NumberFormat(i18n.language, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const collectedAt = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(snapshot.fetchedAt));
  const lowRatingCount = snapshot.sample.ratingBreakdown['1'] + snapshot.sample.ratingBreakdown['2'];
  const sampleWithoutReply = Math.max(0, snapshot.sample.reviewCount - snapshot.sample.ownerRepliesFound);
  const hasObservedQueue = Boolean(snapshot.sample.observedReviews?.items.length);
  const tabs: Array<{ id: CockpitTab; label: string }> = [
    { id: 'overview', label: t('dashboard.cockpit.tabs.overview') },
    { id: 'reviews', label: t('dashboard.cockpit.tabs.reviews') },
    { id: 'questions', label: t('dashboard.cockpit.tabs.questions') },
    { id: 'photos', label: t('dashboard.cockpit.tabs.photos') },
    { id: 'performance', label: t('dashboard.cockpit.tabs.performance') },
    { id: 'practices', label: t('dashboard.cockpit.tabs.practices') },
    { id: 'whatsapp', label: t('dashboard.cockpit.tabs.whatsapp') },
  ];

  return (
    <div className="space-y-5">
      <nav className="flex gap-1 overflow-x-auto border-b border-slate-200" aria-label={t('dashboard.cockpit.layout.navigation')}>
        {tabs.map((tab) => (
          <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={`shrink-0 border-b-2 px-3 py-3 text-sm font-medium transition-colors ${activeTab === tab.id ? 'border-[#2457D6] text-[#2457D6]' : 'border-transparent text-slate-500 hover:text-slate-900'}`}>
            {tab.label}
          </button>
        ))}
      </nav>
      {activeTab === 'whatsapp' ? (
        <WhatsAppWorkspace localWhatsApp={localWhatsApp} snapshot={snapshot} />
      ) : activeTab === 'reviews' ? (
        <QueueCard snapshot={snapshot} officialQueue={officialQueue} businessName={snapshot.business.name} sampleCount={snapshot.sample.reviewCount} sampleWithoutReply={sampleWithoutReply} />
      ) : activeTab === 'practices' ? (
        <DailyPractice snapshot={snapshot} onOpenQueue={() => setActiveTab('reviews')} />
      ) : activeTab !== 'overview' ? (
        <LockedModule />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <section className="min-w-0 space-y-5">
            <PriorityBanner lowRatingCount={lowRatingCount} sampleWithoutReply={sampleWithoutReply} hasObservedQueue={hasObservedQueue} onOpenQueue={() => setActiveTab('reviews')} />
            <QueueCard snapshot={snapshot} officialQueue={officialQueue} businessName={snapshot.business.name} sampleCount={snapshot.sample.reviewCount} sampleWithoutReply={sampleWithoutReply} />
            <DailyPractice snapshot={snapshot} onOpenQueue={() => setActiveTab('reviews')} compact />
            <VolumeStatus sampleCount={snapshot.sample.reviewCount} collectedAt={collectedAt} integer={integer} />
            <Distribution snapshot={snapshot} lowRatingCount={lowRatingCount} />
            <div className="grid gap-5 md:grid-cols-2">
              <QrStatus funnel={funnel} integer={integer} />
              <TopicsStatus snapshot={snapshot} />
            </div>
          </section>
          <aside className="space-y-5">
            <GoogleReadStatus snapshot={snapshot} collectedAt={collectedAt} decimal={decimal} integer={integer} />
            <WhatsAppStatus localWhatsApp={localWhatsApp} onOpen={() => setActiveTab('whatsapp')} />
            <ProfileStatus />
            <ChangeStatus collectedAt={collectedAt} funnel={funnel} integer={integer} />
          </aside>
        </div>
      )}
    </div>
  );
};

const PriorityBanner = ({ lowRatingCount, sampleWithoutReply, hasObservedQueue, onOpenQueue }: { lowRatingCount: number; sampleWithoutReply: number; hasObservedQueue: boolean; onOpenQueue: () => void }) => {
  const { t } = useOwnerTranslation();
  return <Card className="border-blue-100 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]"><CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex gap-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-600 text-lg font-semibold text-white">{lowRatingCount}</span><div><p className="font-semibold text-slate-950">{t('dashboard.cockpit.layout.priorityTitle', { count: lowRatingCount })}</p><p className="mt-1 text-sm leading-6 text-slate-600">{hasObservedQueue ? t('dashboard.cockpit.assisted.priorityBody', { count: sampleWithoutReply }) : t('dashboard.cockpit.layout.prioritySampleBody', { count: sampleWithoutReply })}</p></div></div>{hasObservedQueue ? <Button onClick={onOpenQueue} className="shrink-0 rounded-full bg-[#2457D6] hover:bg-[#1d47b0]">{t('dashboard.cockpit.assisted.openQueue')}</Button> : <Button asChild className="shrink-0 rounded-full bg-[#2457D6] hover:bg-[#1d47b0]"><Link to="/settings">{t('dashboard.cockpit.layout.priorityAction')}</Link></Button>}</CardContent></Card>;
};

const QueueCard = ({ snapshot, officialQueue, businessName, sampleCount, sampleWithoutReply }: { snapshot: ExperimentalApifySnapshot; officialQueue: ReturnType<typeof useGoogleBusinessReviewQueue>; businessName: string; sampleCount: number; sampleWithoutReply: number }) => {
  const { t, i18n } = useOwnerTranslation();
  const review = officialQueue.syncComplete ? officialQueue.reviews[0] : null;
  const suggestion = review ? buildReplySuggestions({ rating: review.rating, text: review.comment, customerName: review.reviewer_name, businessName, channel: 'public' })[0] : null;
  const stars = (rating: number) => <span className="flex">{[1, 2, 3, 4, 5].map((star) => <Star key={star} className={`h-4 w-4 ${star <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />)}</span>;
  const observedReviews = snapshot.sample.observedReviews?.items || [];
  return <Card className="overflow-hidden border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]"><CardContent className="p-0"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4"><div><h2 className="text-lg font-semibold text-slate-950">{t('dashboard.cockpit.layout.queueTitle')}</h2><p className="mt-1 text-sm text-slate-500">{review ? t('dashboard.cockpit.layout.queueSubtitle') : observedReviews.length ? t('dashboard.cockpit.assisted.queueSubtitle') : t('dashboard.cockpit.layout.queueSubtitle')}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${review ? 'bg-emerald-50 text-emerald-700' : observedReviews.length ? 'bg-violet-50 text-violet-800' : 'bg-amber-50 text-amber-800'}`}>{review ? t('dashboard.cockpit.layout.queueLive') : observedReviews.length ? t('dashboard.cockpit.assisted.badge') : t('dashboard.cockpit.reviews.lockedBadge')}</span></div>{review ? <div className="p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold text-slate-950">{review.reviewer_name || t('dashboard.cockpit.layout.anonymousReviewer')}</p><p className="mt-1 text-xs text-slate-500">{review.review_updated_at ? new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' }).format(new Date(review.review_updated_at)) : t('dashboard.cockpit.layout.dateUnavailable')}</p></div>{stars(review.rating)}</div><blockquote className="mt-4 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">{review.comment || t('dashboard.cockpit.layout.commentUnavailable')}</blockquote><div className="mt-4 rounded-xl border border-slate-200 p-4"><div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold text-slate-950">{t('dashboard.cockpit.layout.replyTitle')}</p><span className="text-xs text-slate-500">{t('dashboard.cockpit.layout.editBeforePublish')}</span></div><p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-700">{suggestion?.body}</p><Button asChild className="mt-4 rounded-full bg-[#2457D6] hover:bg-[#1d47b0]"><Link to="/reviews">{t('dashboard.cockpit.layout.openQueue')}<ChevronRight className="ml-1 h-4 w-4" /></Link></Button></div></div> : observedReviews.length ? <ObservedReviewQueue reviews={observedReviews} businessName={businessName} googleReviewUrl={snapshot.business.googleReviewUrl} retentionEndsAt={snapshot.sample.observedReviews?.retentionEndsAt || null} /> : <div className="p-5"><div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-3"><QueueMetric value={sampleCount} label={t('dashboard.cockpit.layout.queueSampleCount')} /><QueueMetric value={sampleWithoutReply} label={t('dashboard.cockpit.layout.queueSampleUnanswered')} tone="attention" /><QueueMetric value={sampleCount - sampleWithoutReply} label={t('dashboard.cockpit.layout.queueSampleReplies')} tone="positive" /></div><div className="mt-4 flex gap-3 rounded-xl border border-amber-100 bg-amber-50/60 p-4"><Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-800" /><div><p className="font-semibold text-amber-950">{t('dashboard.cockpit.layout.queueUnavailableTitle')}</p><p className="mt-1 text-sm leading-6 text-amber-950">{t('dashboard.cockpit.layout.queueSampleBody')}</p></div></div><div className="mt-4 rounded-xl border border-slate-200 bg-white p-4"><div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm font-semibold text-slate-950">{t('dashboard.cockpit.layout.replyTitle')}</p><span className="text-xs text-slate-500">{t('dashboard.cockpit.layout.replyWaiting')}</span></div><p className="mt-3 text-sm leading-6 text-slate-600">{t('dashboard.cockpit.layout.replyBody')}</p><Button asChild variant="outline" className="mt-4"><Link to="/settings">{t('dashboard.cockpit.reviews.action')}<ChevronRight className="ml-1 h-4 w-4" /></Link></Button></div></div>}</CardContent></Card>;
};

const ObservedReviewQueue = ({ reviews, businessName, googleReviewUrl, retentionEndsAt }: { reviews: NonNullable<ExperimentalApifySnapshot['sample']['observedReviews']>['items']; businessName: string; googleReviewUrl?: string; retentionEndsAt: string | null }) => {
  const { t, i18n } = useOwnerTranslation();
  const [selectedId, setSelectedId] = useState(() => reviews.find((review) => !review.responseObserved)?.id || reviews[0].id);
  const [actions, setActions] = useState<Record<string, AssistedReviewAction>>(readAssistedReviewActions);
  const selected = reviews.find((review) => review.id === selectedId) || reviews[0];
  const suggested = buildReplySuggestions({ rating: selected.rating, text: selected.comment, businessName, channel: 'public' })[0]?.body || '';
  const action = actions[selected.id] || { status: 'draft' as const, draft: suggested };
  const draft = action.draft ?? suggested;
  const saveAction = (next: AssistedReviewAction) => {
    setActions((current) => {
      const updated = { ...current, [selected.id]: next };
      window.localStorage.setItem(assistedQueueStorageKey, JSON.stringify(updated));
      return updated;
    });
  };
  const copySuggestion = async () => {
    try {
      await navigator.clipboard.writeText(draft);
      saveAction({ status: 'copied', draft });
    } catch {
      saveAction({ status: 'draft', draft });
    }
  };
  const statusKey = selected.responseObserved ? 'observed' : action.status;
  const formattedDate = selected.publishedAt ? new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' }).format(new Date(selected.publishedAt)) : t('dashboard.cockpit.layout.dateUnavailable');
  const retentionDate = retentionEndsAt ? new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' }).format(new Date(retentionEndsAt)) : '';
  const googleDestination = selected.reviewUrl || googleReviewUrl;
  const googleAction = selected.reviewUrl ? t('dashboard.cockpit.assisted.openReview') : t('dashboard.cockpit.assisted.openGoogleFallback');
  return <div className="p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold text-slate-950">{selected.reviewerName || t('dashboard.cockpit.assisted.reviewerUnavailable')}</p><p className="mt-1 text-xs text-slate-500">{t('dashboard.cockpit.assisted.reviewLabel', { rating: selected.rating })} · {formattedDate}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusKey === 'observed' ? 'bg-emerald-50 text-emerald-700' : statusKey === 'manager-confirmed' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-700'}`}>{t(`dashboard.cockpit.assisted.status.${statusKey}`)}</span></div><blockquote className="mt-4 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">{selected.comment}</blockquote><div className="mt-4 rounded-xl border border-slate-200 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm font-semibold text-slate-950">{t('dashboard.cockpit.layout.replyTitle')}</p><span className="text-xs text-slate-500">{t('dashboard.cockpit.assisted.editLocal')}</span></div><Textarea value={draft} onChange={(event) => saveAction({ status: 'draft', draft: event.target.value })} className="mt-3 min-h-28 resize-y text-sm leading-6" /><div className="mt-4 flex flex-wrap gap-2"><Button onClick={() => void copySuggestion()} className="rounded-full bg-[#2457D6] hover:bg-[#1d47b0]"><Copy className="mr-2 h-4 w-4" />{t('dashboard.cockpit.assisted.copy')}</Button>{googleDestination && <Button asChild variant="outline" className="rounded-full"><a href={googleDestination} target="_blank" rel="noreferrer">{googleAction}<ExternalLink className="ml-2 h-4 w-4" /></a></Button>}{!selected.responseObserved && <Button variant="ghost" onClick={() => saveAction({ status: 'manager-confirmed', draft })}>{t('dashboard.cockpit.assisted.markResponded')}</Button>}</div>{statusKey === 'manager-confirmed' && <p className="mt-3 text-xs leading-5 text-blue-800">{t('dashboard.cockpit.assisted.managerNote')}</p>}{statusKey === 'observed' && <p className="mt-3 text-xs leading-5 text-emerald-800">{t('dashboard.cockpit.assisted.observedNote')}</p>}</div><div className="mt-4 flex flex-wrap gap-2">{reviews.slice(0, 8).map((review) => <Button key={review.id} size="sm" variant={review.id === selected.id ? 'default' : 'outline'} onClick={() => setSelectedId(review.id)} className={review.id === selected.id ? 'bg-[#2457D6] hover:bg-[#1d47b0]' : ''}><span className="max-w-32 truncate">{review.reviewerName || `${review.rating} ★`}</span></Button>)}</div><p className="mt-4 text-xs leading-5 text-slate-500">{t('dashboard.cockpit.assisted.retention', { date: retentionDate })}</p></div>;
};

type DailyPracticeId = 'reply' | 'hours' | 'photos' | 'invite';

const stableDailyOffset = (businessKey: string, count: number) => {
  const day = new Date().toISOString().slice(0, 10);
  const material = `${businessKey}:${day}`;
  let value = 0;
  for (let index = 0; index < material.length; index += 1) value = ((value * 31) + material.charCodeAt(index)) >>> 0;
  return count ? value % count : 0;
};

const DailyPractice = ({ snapshot, onOpenQueue, compact = false }: { snapshot: ExperimentalApifySnapshot; onOpenQueue: () => void; compact?: boolean }) => {
  const { t } = useOwnerTranslation();
  const observedWithoutReply = (snapshot.sample.observedReviews?.items || []).filter((review) => !review.responseObserved).length;
  const practices: DailyPracticeId[] = [
    ...(observedWithoutReply ? ['reply' as const] : []),
    'hours',
    'photos',
    'invite',
  ];
  const [offset, setOffset] = useState(() => stableDailyOffset(snapshot.business.placeId || snapshot.business.name, practices.length));
  const practice = practices[offset % practices.length];
  const copy = practice === 'reply'
    ? { title: t('dashboard.cockpit.practice.items.reply.title', { count: observedWithoutReply }), body: t('dashboard.cockpit.practice.items.reply.body'), action: t('dashboard.cockpit.practice.items.reply.action') }
    : { title: t(`dashboard.cockpit.practice.items.${practice}.title`), body: t(`dashboard.cockpit.practice.items.${practice}.body`), action: t(`dashboard.cockpit.practice.items.${practice}.action`) };
  const action = practice === 'reply'
    ? <Button onClick={onOpenQueue} className="rounded-full bg-[#2457D6] hover:bg-[#1d47b0]">{copy.action}<ChevronRight className="ml-1 h-4 w-4" /></Button>
    : practice === 'photos' && snapshot.business.googleReviewUrl
      ? <Button asChild variant="outline" className="rounded-full"><a href={snapshot.business.googleReviewUrl} target="_blank" rel="noreferrer">{copy.action}<ExternalLink className="ml-1 h-4 w-4" /></a></Button>
      : <Button asChild variant="outline" className="rounded-full"><Link to="/settings">{copy.action}<ChevronRight className="ml-1 h-4 w-4" /></Link></Button>;
  return <Card className={compact ? 'border-violet-200 bg-violet-50/30 shadow-[0_1px_3px_rgba(15,23,42,0.08)]' : 'mx-auto max-w-3xl border-violet-200 bg-violet-50/30 shadow-[0_1px_3px_rgba(15,23,42,0.08)]'}><CardContent className={compact ? 'p-5' : 'p-6'}><div className="flex flex-wrap items-start justify-between gap-4"><div className="flex min-w-0 gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[#6D43C0]"><Lightbulb className="h-5 w-5" /></span><div><p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#6D43C0]">{t('dashboard.cockpit.practice.eyebrow')}</p><h2 className="mt-1 text-lg font-semibold text-slate-950">{copy.title}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{copy.body}</p></div></div><span className="rounded-full bg-white px-2.5 py-1 text-xs text-slate-600">{t('dashboard.cockpit.practice.daily')}</span></div><div className="mt-5 flex flex-wrap items-center gap-2">{action}{practices.length > 1 && <Button variant="ghost" onClick={() => setOffset((current) => current + 1)} className="text-[#6D43C0] hover:bg-violet-100 hover:text-[#5935a3]">{t('dashboard.cockpit.practice.next')}</Button>}</div><p className="mt-4 text-xs leading-5 text-slate-500">{t('dashboard.cockpit.practice.disclaimer')}</p></CardContent></Card>;
};

const QueueMetric = ({ value, label, tone = 'default' }: { value: number; label: string; tone?: 'default' | 'attention' | 'positive' }) => <div><p className={`text-2xl font-semibold ${tone === 'attention' ? 'text-red-600' : tone === 'positive' ? 'text-emerald-700' : 'text-slate-950'}`}>{value}</p><p className="mt-1 text-xs leading-5 text-slate-600">{label}</p></div>;

const VolumeStatus = ({ sampleCount, collectedAt, integer }: { sampleCount: number; collectedAt: string; integer: Intl.NumberFormat }) => { const { t } = useOwnerTranslation(); return <Card className="border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]"><CardContent className="p-5"><div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-semibold text-slate-950">{t('dashboard.cockpit.layout.volumeTitle')}</h2><p className="mt-1 text-sm text-slate-500">{t('dashboard.cockpit.layout.volumeSubtitle')}</p></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">{t('dashboard.cockpit.layout.firstReading')}</span></div><div className="mt-5 grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-[auto_1fr]"><p className="text-4xl font-medium tracking-tight text-slate-950">{integer.format(sampleCount)}</p><div className="min-w-0"><p className="text-sm font-semibold text-slate-950">{t('dashboard.cockpit.layout.volumeObserved')}</p><p className="mt-1 text-sm text-slate-600">{t('dashboard.cockpit.layout.volumeCollectedAt', { date: collectedAt })}</p><div className="mt-4 flex h-3 items-center border-t border-dashed border-slate-300"><span className="h-3 w-3 rounded-full bg-[#2457D6]" aria-label={t('dashboard.cockpit.layout.firstReading')} /></div></div></div><div className="mt-4 flex gap-3 rounded-xl border border-amber-100 bg-amber-50/60 p-4 text-sm leading-6 text-amber-950"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-800" /><p>{t('dashboard.cockpit.layout.volumeBody')}</p></div></CardContent></Card>; };

const Distribution = ({ snapshot, lowRatingCount }: { snapshot: ExperimentalApifySnapshot; lowRatingCount: number }) => { const { t } = useOwnerTranslation(); const total = snapshot.sample.reviewCount; return <Card className="border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]"><CardContent className="p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-semibold text-slate-950">{t('dashboard.cockpit.layout.distributionTitle')}</h2><p className="mt-1 text-sm text-slate-500">{t('dashboard.experimental.sampleDistribution', { count: total })}</p></div><span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-800">{t('dashboard.experimental.source')}</span></div><div className="mt-5 divide-y divide-slate-200 rounded-xl border border-slate-200">{ratingRows.map((rating) => { const count = snapshot.sample.ratingBreakdown[rating]; const share = total ? Math.round((count / total) * 100) : 0; const attention = rating === '1' || rating === '2'; return <div key={rating} className="grid grid-cols-[48px_minmax(0,1fr)_76px] items-center gap-3 p-3"><span className="text-sm font-semibold text-slate-800">{rating}<Star className="ml-1 inline h-3.5 w-3.5 fill-amber-400 text-amber-400" /></span><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${attention ? 'bg-red-500' : 'bg-amber-400'}`} style={{ width: `${share}%` }} /></div><span className="text-right text-xs text-slate-600">{count} · {share}%</span></div>; })}</div><div className="mt-4 flex gap-3 rounded-xl border border-red-100 bg-red-50 p-4 text-sm leading-6 text-red-950"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-700" /><p>{t('dashboard.cockpit.layout.distributionBody', { count: lowRatingCount, total })}</p></div></CardContent></Card>; };

const QrStatus = ({ funnel, integer }: { funnel: { data: ReviewFunnelMetrics | null; loading: boolean; error: string | null }; integer: Intl.NumberFormat }) => { const { t } = useOwnerTranslation(); const value = (metric: number) => integer.format(metric); return <Card className="border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]"><CardContent className="p-5"><div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-semibold text-slate-950">{t('dashboard.cockpit.path.title')}</h2><p className="mt-1 text-sm text-slate-500">{t('dashboard.cockpit.layout.qrSubtitle')}</p></div><QrCode className="h-5 w-5 text-[#2457D6]" /></div>{funnel.loading ? <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">{t('dashboard.cockpit.layout.eventsLoading')}</p> : funnel.error || !funnel.data ? <p className="mt-5 rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm leading-6 text-amber-950">{t('dashboard.cockpit.layout.eventsUnavailable')}</p> : <><dl className="mt-5 divide-y divide-slate-200 rounded-xl border border-slate-200"><MetricRow label={t('dashboard.cockpit.path.opens')} value={value(funnel.data.qrOpens)} /><MetricRow label={t('dashboard.cockpit.path.clicks')} value={value(funnel.data.googleClicks)} /><MetricRow label={t('dashboard.cockpit.layout.qrContinuation')} value={funnel.data.clickThroughRate === null ? '—' : `${Math.round(funnel.data.clickThroughRate)}%`} /></dl><p className="mt-3 text-xs leading-5 text-slate-500">{t('dashboard.cockpit.layout.qrPeriod')}</p></>}<p className="mt-4 text-xs leading-5 text-slate-500">{t('dashboard.cockpit.path.disclaimer')}</p></CardContent></Card>; };

const TopicsStatus = ({ snapshot }: { snapshot: ExperimentalApifySnapshot }) => { const { t } = useOwnerTranslation(); const topics = snapshot.sample.insights?.topics || []; return <Card className="border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]"><CardContent className="p-5"><div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-semibold text-slate-950">{t('dashboard.cockpit.layout.topicsTitle')}</h2><p className="mt-1 text-sm text-slate-500">{t('dashboard.cockpit.layout.topicsSubtitle')}</p></div><Sparkles className="h-5 w-5 text-[#6D43C0]" /></div>{topics.length ? <div className="mt-5"><div className="flex flex-wrap gap-2">{topics.map((topic) => <span key={topic.id} className={`rounded-full px-2.5 py-1 text-xs font-medium ${topic.sentiment === 'negative' ? 'bg-red-50 text-red-700' : topic.sentiment === 'positive' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>{t(`dashboard.cockpit.topicLabels.${topic.id}`)} · {topic.count}</span>)}</div><p className="mt-4 text-sm leading-6 text-slate-600">{t('dashboard.cockpit.topics.body')}</p></div> : <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="text-3xl font-medium tracking-tight text-slate-950">0</p><p className="mt-1 text-sm font-medium text-slate-900">{t('dashboard.cockpit.layout.analyzableComments')}</p><p className="mt-3 text-sm leading-6 text-slate-600">{t('dashboard.cockpit.layout.topicsBody')}</p></div>}</CardContent></Card>; };

const GoogleReadStatus = ({ snapshot, collectedAt, decimal, integer }: { snapshot: ExperimentalApifySnapshot; collectedAt: string; decimal: Intl.NumberFormat; integer: Intl.NumberFormat }) => {
  const { t } = useOwnerTranslation();
  const total = snapshot.sample.reviewCount;
  const insights = snapshot.sample.insights;
  const averageResponseHours = insights?.averageResponseHours ?? null;
  const reviewsLast30Days = insights?.reviewsLast30Days ?? null;
  const metricDetail = t('dashboard.experimental.summaryDisclaimer');

  return <Card className="border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]"><CardContent className="p-5"><div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-semibold text-slate-950">{t('dashboard.cockpit.layout.googleTitle')}</h2><p className="mt-1 text-sm text-slate-500">{t('dashboard.experimental.collectedAt', { date: collectedAt })}</p></div><span className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-medium text-violet-800">{t('dashboard.experimental.source')}</span></div><div className="mt-5 flex items-end gap-3"><strong className="text-5xl font-medium tracking-tight text-slate-950">{decimal.format(snapshot.business.googleRating)}</strong><div className="pb-1"><div className="flex">{[1, 2, 3, 4, 5].map((star) => <Star key={star} className={`h-4 w-4 ${star <= Math.round(snapshot.business.googleRating) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />)}</div><p className="mt-1 text-xs text-slate-500">{t('dashboard.experimental.profileTotal', { count: integer.format(snapshot.business.googleReviewCount) })}</p></div></div><p className="mt-5 text-xs font-semibold uppercase tracking-wide text-slate-500">{t('dashboard.cockpit.layout.googleBreakdown')}</p><div className="mt-3 space-y-2">{ratingRows.map((rating) => { const count = snapshot.sample.ratingBreakdown[rating]; const share = total ? Math.round((count / total) * 100) : 0; const attention = rating === '1' || rating === '2'; return <div key={rating} className="grid grid-cols-[18px_1fr_48px] items-center gap-2 text-xs"><span>{rating}<Star className="ml-0.5 inline h-3 w-3 fill-amber-400 text-amber-400" /></span><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${attention ? 'bg-red-500' : 'bg-amber-400'}`} style={{ width: `${share}%` }} /></div><span className="text-right text-slate-600">{share}%</span></div>; })}</div><div className="mt-5 grid grid-cols-2 gap-3"><MetricTile label={t('dashboard.cockpit.layout.averageReplyTime')} value={averageResponseHours === null ? '—' : `${decimal.format(averageResponseHours)} h`} detail={averageResponseHours === null ? t('dashboard.cockpit.layout.metricNeedsResponseDates') : metricDetail} /><MetricTile label={t('dashboard.cockpit.layout.newReviews30d')} value={reviewsLast30Days === null ? '—' : integer.format(reviewsLast30Days)} detail={reviewsLast30Days === null ? t('dashboard.cockpit.layout.metricNeedsReviewDates') : metricDetail} /></div><div className="mt-4 rounded-xl bg-violet-50 p-3 text-xs leading-5 text-violet-950"><p className="font-semibold">{t('dashboard.cockpit.layout.googleRead')}</p><p className="mt-1">{t('dashboard.experimental.summaryDisclaimer')}</p></div><Button asChild variant="link" className="mt-3 h-auto p-0 text-[#2457D6]"><Link to="/settings">{t('dashboard.cockpit.layout.googleAction')}<ChevronRight className="ml-1 h-4 w-4" /></Link></Button></CardContent></Card>;
};

const MetricTile = ({ label, value, detail }: { label: string; value: string; detail: string }) => <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs leading-4 text-slate-500">{label}</p><p className="mt-2 text-2xl font-medium text-slate-950">{value}</p><p className="mt-1 text-[11px] leading-4 text-slate-500">{detail}</p></div>;

const WhatsAppStatus = ({ localWhatsApp, onOpen }: { localWhatsApp: LocalWhatsAppState; onOpen: () => void }) => { const { t } = useOwnerTranslation(); const ready = localWhatsApp.status === 'ready'; return <Card className="border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]"><CardContent className="p-5"><div className="flex items-start justify-between gap-3"><MessageCircle className="h-5 w-5 text-emerald-700" /><span className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${ready ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{t(`dashboard.cockpit.whatsapp.status.${localWhatsApp.status}`)}</span></div><h2 className="mt-4 font-semibold text-slate-950">{t('dashboard.cockpit.whatsapp.summaryTitle')}</h2><p className="mt-1 text-sm leading-6 text-slate-600">{ready ? t('dashboard.cockpit.layout.whatsappReady') : t('dashboard.cockpit.whatsapp.summaryWaiting')}</p><Button variant="link" onClick={onOpen} className="mt-3 h-auto p-0 text-[#2457D6]">{t('dashboard.cockpit.whatsapp.openTest')}<ChevronRight className="ml-1 h-4 w-4" /></Button></CardContent></Card>; };

const ProfileStatus = () => { const { t } = useOwnerTranslation(); return <Card className="border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]"><CardContent className="p-5"><div className="flex items-center justify-between gap-3"><h2 className="text-lg font-semibold text-slate-950">{t('dashboard.cockpit.layout.profileTitle')}</h2><span className="text-sm font-medium text-slate-500">—</span></div><p className="mt-4 text-sm leading-6 text-slate-600">{t('dashboard.cockpit.layout.profileBody')}</p><Button asChild variant="link" className="mt-3 h-auto p-0 text-[#2457D6]"><Link to="/settings">{t('dashboard.cockpit.layout.profileAction')}<ChevronRight className="ml-1 h-4 w-4" /></Link></Button></CardContent></Card>; };

const ChangeStatus = ({ collectedAt, funnel, integer }: { collectedAt: string; funnel: { data: ReviewFunnelMetrics | null; loading: boolean; error: string | null }; integer: Intl.NumberFormat }) => { const { t } = useOwnerTranslation(); return <Card className="border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]"><CardContent className="p-5"><div className="flex gap-3"><Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-[#2457D6]" /><div className="min-w-0"><h2 className="font-semibold text-slate-950">{t('dashboard.cockpit.layout.changeTitle')}</h2><p className="mt-1 text-xs text-slate-500">{t('dashboard.cockpit.layout.changePeriod')}</p><ul className="mt-3 space-y-2 text-sm leading-5 text-slate-600"><li>{t('dashboard.cockpit.layout.changeReading', { date: collectedAt })}</li>{!funnel.loading && !funnel.error && funnel.data && <><li>{t('dashboard.cockpit.layout.changeOpens', { count: integer.format(funnel.data.qrOpens) })}</li><li>{t('dashboard.cockpit.layout.changeClicks', { count: integer.format(funnel.data.googleClicks) })}</li></>}<li>{t('dashboard.cockpit.layout.changeWaiting')}</li></ul></div></div></CardContent></Card>; };

const LockedModule = () => { const { t } = useOwnerTranslation(); return <Card className="border-slate-200 bg-white"><CardContent className="flex min-h-64 flex-col items-center justify-center p-8 text-center"><Info className="h-8 w-8 text-[#2457D6]" /><h2 className="mt-4 text-xl font-semibold text-slate-950">{t('dashboard.cockpit.locked.title')}</h2><p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">{t('dashboard.cockpit.locked.body')}</p><Button asChild className="mt-5 bg-[#2457D6] hover:bg-[#1d47b0]"><Link to="/settings">{t('dashboard.cockpit.locked.action')}</Link></Button></CardContent></Card>; };

const MetricRow = ({ label, value }: { label: string; value: string }) => <div className="flex items-center justify-between gap-3 p-3"><dt className="text-sm text-slate-600">{label}</dt><dd className="text-sm font-semibold text-slate-950">{value}</dd></div>;

const WhatsAppWorkspace = ({ localWhatsApp, snapshot }: { localWhatsApp: LocalWhatsAppState; snapshot: ExperimentalApifySnapshot }) => {
  const { t, i18n } = useOwnerTranslation();
  const [recipient, setRecipient] = useState('');
  const [message, setMessage] = useState(t('dashboard.cockpit.whatsapp.defaultMessage'));
  const [confirmed, setConfirmed] = useState(false);
  const [preferences, setPreferences] = useState<SavedNotificationPreferences>(defaultNotificationPreferences);
  const [preferencesSaved, setPreferencesSaved] = useState(false);
  const [sendState, setSendState] = useState<{ status: 'idle' | 'sending' | 'sent' | 'error'; detail?: string; sentAt?: string; recipient?: string }>({ status: 'idle' });
  const ready = localWhatsApp.status === 'ready' && localWhatsApp.session;
  const lowRatings = snapshot.sample.ratingBreakdown['1'] + snapshot.sample.ratingBreakdown['2'];
  const observedReviews = snapshot.sample.observedReviews?.items || [];
  const withoutObservedReply = observedReviews.filter((review) => !review.responseObserved).length;
  const briefing = t('dashboard.cockpit.assisted.briefing', {
    business: snapshot.business.name,
    rating: new Intl.NumberFormat(i18n.language, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(snapshot.business.googleRating),
    total: new Intl.NumberFormat(i18n.language).format(snapshot.business.googleReviewCount),
    low: new Intl.NumberFormat(i18n.language).format(lowRatings),
    queue: new Intl.NumberFormat(i18n.language).format(withoutObservedReply),
  });

  useEffect(() => { setPreferences(readNotificationPreferences()); }, []);

  const savePreferences = () => {
    window.localStorage.setItem(notificationStorageKey, JSON.stringify(preferences));
    setPreferencesSaved(true);
  };
  const sendTest = async () => {
    if (!ready || !message.trim() || !recipient.trim()) return;
    setSendState({ status: 'sending' });
    try {
      const result = await sendLocalWhatsAppText({ sessionId: localWhatsApp.session.id, phone: recipient, text: message.trim() });
      setSendState({ status: 'sent', sentAt: result.sentAt, recipient: maskInternationalPhone(recipient) });
      setConfirmed(false);
    } catch (error) {
      setSendState({ status: 'error', detail: error instanceof Error ? error.message : t('dashboard.cockpit.whatsapp.sendError') });
    }
  };

  return <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]"><section className="space-y-5"><Card className="border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]"><CardContent className="p-6"><div><h2 className="text-xl font-semibold text-slate-950">{t('dashboard.cockpit.whatsapp.notificationsTitle')}</h2><p className="mt-1 text-sm leading-6 text-slate-600">{t('dashboard.cockpit.whatsapp.notificationsBody')}</p></div><div className="mt-6 space-y-4"><label className="flex items-start gap-3 rounded-xl border border-slate-200 p-4 text-sm leading-5 text-slate-700"><Checkbox checked={preferences.weeklyEnabled} onCheckedChange={(checked) => setPreferences((current) => ({ ...current, weeklyEnabled: checked === true }))} /><span><strong className="block text-slate-950">{t('dashboard.cockpit.whatsapp.weeklyTitle')}</strong>{t('dashboard.cockpit.whatsapp.weeklyBody')}</span></label><label className="flex items-start gap-3 rounded-xl border border-slate-200 p-4 text-sm leading-5 text-slate-700"><Checkbox checked={preferences.priorityEnabled} onCheckedChange={(checked) => setPreferences((current) => ({ ...current, priorityEnabled: checked === true }))} /><span><strong className="block text-slate-950">{t('dashboard.cockpit.whatsapp.priorityTitle')}</strong>{t('dashboard.cockpit.whatsapp.priorityBody')}</span></label><div className="grid gap-4 sm:grid-cols-3"><label className="text-sm font-medium text-slate-700 sm:col-span-2">{t('dashboard.cockpit.whatsapp.recipient')}<Input value={preferences.recipient} onChange={(event) => setPreferences((current) => ({ ...current, recipient: event.target.value }))} placeholder="+351 911 056 526" className="mt-2" inputMode="tel" /></label><label className="text-sm font-medium text-slate-700">{t('dashboard.cockpit.whatsapp.time')}<Input type="time" value={preferences.time} onChange={(event) => setPreferences((current) => ({ ...current, time: event.target.value }))} className="mt-2" /></label></div><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium text-slate-700">{t('dashboard.cockpit.whatsapp.frequency')}<select value={preferences.day} onChange={(event) => setPreferences((current) => ({ ...current, day: event.target.value as SavedNotificationPreferences['day'] }))} className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="monday">{t('dashboard.cockpit.whatsapp.schedule.monday')}</option><option value="friday">{t('dashboard.cockpit.whatsapp.schedule.friday')}</option></select></label></div><label className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-sm leading-5 text-amber-950"><Checkbox checked={preferences.consented} onCheckedChange={(checked) => setPreferences((current) => ({ ...current, consented: checked === true }))} /><span>{t('dashboard.cockpit.whatsapp.notificationsConsent')}</span></label><Button onClick={savePreferences} className="rounded-full bg-[#2457D6] hover:bg-[#1d47b0]"><Send className="mr-2 h-4 w-4" />{t('dashboard.cockpit.whatsapp.saveLocal')}</Button>{preferencesSaved && <p className="text-sm text-emerald-700">{t('dashboard.cockpit.whatsapp.preferencesSaved')}</p>}</div></CardContent></Card><Card className="border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]"><CardContent className="p-6"><div className="flex items-start justify-between gap-3"><div><h2 className="text-xl font-semibold text-slate-950">{t('dashboard.cockpit.whatsapp.localTitle')}</h2><p className="mt-1 text-sm leading-6 text-slate-600">{t('dashboard.cockpit.whatsapp.localBody')}</p></div><Button variant="outline" size="sm" onClick={() => void localWhatsApp.refresh()}>{t('dashboard.cockpit.whatsapp.refresh')}</Button></div><div className={`mt-5 rounded-xl border p-4 text-sm leading-6 ${ready ? 'border-emerald-100 bg-emerald-50/60 text-emerald-950' : 'border-amber-200 bg-amber-50/60 text-amber-950'}`}><strong className="block">{t(`dashboard.cockpit.whatsapp.status.${localWhatsApp.status}`)}</strong><p className="mt-1">{ready ? t('dashboard.cockpit.whatsapp.readyBody') : localWhatsApp.detail || t('dashboard.cockpit.whatsapp.unavailableBody')}</p></div><div className="mt-6 space-y-4"><div className="rounded-xl border border-violet-200 bg-violet-50/50 p-4"><p className="text-sm font-semibold text-violet-950">{t('dashboard.cockpit.assisted.briefingTitle')}</p><p className="mt-2 whitespace-pre-line text-sm leading-6 text-violet-950">{briefing}</p><Button type="button" variant="outline" className="mt-3 border-violet-300 bg-white" onClick={() => setMessage(briefing)} disabled={!ready || sendState.status === 'sending'}>{t('dashboard.cockpit.assisted.useBriefing')}</Button></div><label className="block text-sm font-medium text-slate-700">{t('dashboard.cockpit.whatsapp.recipient')}<Input value={recipient} onChange={(event) => setRecipient(event.target.value)} autoComplete="tel" inputMode="tel" placeholder="+351 911 056 526" className="mt-2" disabled={!ready || sendState.status === 'sending'} /></label><label className="block text-sm font-medium text-slate-700">{t('dashboard.cockpit.whatsapp.message')}<Textarea value={message} onChange={(event) => setMessage(event.target.value)} className="mt-2 min-h-28 resize-y" disabled={!ready || sendState.status === 'sending'} /></label><label className="flex items-start gap-3 rounded-xl border border-slate-200 p-3 text-sm leading-5 text-slate-700"><Checkbox checked={confirmed} onCheckedChange={(checked) => setConfirmed(checked === true)} disabled={!ready || sendState.status === 'sending'} /><span>{t('dashboard.cockpit.whatsapp.confirmation')}</span></label><Button onClick={() => void sendTest()} disabled={!ready || !recipient.trim() || !message.trim() || !confirmed || sendState.status === 'sending'} className="rounded-full bg-[#2457D6] hover:bg-[#1d47b0]">{sendState.status === 'sending' ? t('dashboard.cockpit.whatsapp.sending') : t('dashboard.cockpit.whatsapp.sendTest')}</Button>{sendState.status === 'error' && <p className="text-sm text-red-700">{sendState.detail}</p>}{sendState.status === 'sent' && sendState.sentAt && <p className="mt-3 flex items-center gap-2 text-sm text-emerald-700"><CheckCircle2 className="h-4 w-4" />{t('dashboard.cockpit.whatsapp.sent', { recipient: sendState.recipient, time: new Intl.DateTimeFormat(i18n.language, { dateStyle: 'short', timeStyle: 'short' }).format(new Date(sendState.sentAt)) })}</p>}</div></CardContent></Card></section><aside><Card className="border-amber-200 bg-amber-50/50 shadow-none"><CardContent className="p-5"><MessageCircle className="h-5 w-5 text-amber-800" /><h2 className="mt-3 font-semibold text-slate-950">{t('dashboard.cockpit.whatsapp.connectionTitle')}</h2><p className="mt-1 text-sm leading-6 text-slate-700">{t('dashboard.cockpit.whatsapp.connectionBody')}</p></CardContent></Card></aside></div>;
};

export default ExperimentalCockpitDashboard;
