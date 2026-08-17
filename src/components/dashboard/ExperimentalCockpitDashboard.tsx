import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, BarChart3, CalendarClock, CheckCircle2, ChevronRight, Clock3, FileText, Image, Info, Link2, MessageCircle, MessageSquareText, QrCode, Send, Settings2, Sparkles, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { ExperimentalApifySnapshot } from '@/lib/experimentalApifySnapshot';
import { useOwnerTranslation } from '@/i18n/owner/useOwnerTranslation';
import { LocalWhatsAppState, useLocalWhatsApp } from '@/hooks/useLocalWhatsApp';
import { maskInternationalPhone, sendLocalWhatsAppText } from '@/lib/localWhatsApp';

type CockpitTab = 'overview' | 'reviews' | 'questions' | 'photos' | 'performance' | 'whatsapp';

const ratingRows = ['5', '4', '3', '2', '1'] as const;

const MetricCard = ({ label, value, detail, tone = 'default' }: { label: string; value: string; detail: string; tone?: 'default' | 'attention' | 'positive' }) => (
  <Card className={tone === 'attention' ? 'border-red-200 bg-red-50/35 shadow-none' : 'border-slate-200 bg-white shadow-none'}>
    <CardContent className="p-4"><p className="text-xs font-medium text-slate-500">{label}</p><p className={`mt-2 text-3xl font-semibold tracking-tight ${tone === 'attention' ? 'text-red-600' : 'text-slate-950'}`}>{value}</p><p className={`mt-1 text-xs leading-5 ${tone === 'positive' ? 'text-emerald-700' : 'text-slate-500'}`}>{detail}</p></CardContent>
  </Card>
);

const ExperimentalCockpitDashboard = ({ snapshot }: { snapshot: ExperimentalApifySnapshot }) => {
  const { t, i18n } = useOwnerTranslation();
  const [activeTab, setActiveTab] = useState<CockpitTab>('overview');
  const localWhatsApp = useLocalWhatsApp();
  const integer = new Intl.NumberFormat(i18n.language);
  const decimal = new Intl.NumberFormat(i18n.language, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const lowRatingCount = snapshot.sample.ratingBreakdown['1'] + snapshot.sample.ratingBreakdown['2'];
  const sampleAverage = useMemo(() => ratingRows.reduce((total, rating) => total + Number(rating) * snapshot.sample.ratingBreakdown[rating], 0) / snapshot.sample.reviewCount, [snapshot]);
  const replyRate = Math.round((snapshot.sample.ownerRepliesFound / snapshot.sample.reviewCount) * 100);
  const tabs: Array<{ id: CockpitTab; label: string }> = [
    { id: 'overview', label: t('dashboard.cockpit.tabs.overview') },
    { id: 'reviews', label: t('dashboard.cockpit.tabs.reviews') },
    { id: 'questions', label: t('dashboard.cockpit.tabs.questions') },
    { id: 'photos', label: t('dashboard.cockpit.tabs.photos') },
    { id: 'performance', label: t('dashboard.cockpit.tabs.performance') },
    { id: 'whatsapp', label: t('dashboard.cockpit.tabs.whatsapp') },
  ];

  const unavailableTab = activeTab !== 'overview' && activeTab !== 'whatsapp';
  if (unavailableTab) {
    return <div className="space-y-5"><CockpitTabs activeTab={activeTab} setActiveTab={setActiveTab} tabs={tabs} /><Card className="border-slate-200 bg-white"><CardContent className="flex min-h-64 flex-col items-center justify-center p-8 text-center"><Link2 className="h-8 w-8 text-[#2457D6]" /><h2 className="mt-4 text-xl font-semibold text-slate-950">{t('dashboard.cockpit.locked.title')}</h2><p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">{t('dashboard.cockpit.locked.body')}</p><Button asChild className="mt-5 bg-[#2457D6] hover:bg-[#1d47b0]"><Link to="/settings">{t('dashboard.cockpit.locked.action')}</Link></Button></CardContent></Card></div>;
  }

  return (
    <div className="space-y-5">
      <CockpitTabs activeTab={activeTab} setActiveTab={setActiveTab} tabs={tabs} />
      {activeTab === 'whatsapp' ? (
        <WhatsAppWorkspace localWhatsApp={localWhatsApp} />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_370px]">
          <section className="min-w-0 space-y-5">
            <Card className="overflow-hidden border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]"><CardContent className="p-0">
              <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-semibold text-slate-950">{t('dashboard.cockpit.summary.title')}</h2><span className="rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-medium text-violet-800">{t('dashboard.experimental.source')}</span></div><p className="mt-1 text-sm text-slate-500">{t('dashboard.cockpit.summary.subtitle')}</p></div><span className="text-xs text-slate-500">{t('dashboard.cockpit.summary.observed')}</span></div>
              <div className="grid lg:grid-cols-[0.62fr_1fr_0.9fr]">
                <div className="border-b border-slate-200 p-5 lg:border-b-0 lg:border-r"><p className="text-5xl font-medium tracking-tight text-slate-950">{decimal.format(snapshot.business.googleRating)}</p><div className="mt-2 flex">{[1, 2, 3, 4, 5].map((star) => <Star key={star} className={`h-4 w-4 ${star <= Math.round(snapshot.business.googleRating) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />)}</div><p className="mt-2 text-sm text-slate-500">{t('dashboard.cockpit.summary.profileCount', { count: integer.format(snapshot.business.googleReviewCount) })}</p></div>
                <div className="border-b border-slate-200 p-5 lg:border-b-0 lg:border-r"><p className="text-xs font-medium uppercase tracking-wide text-slate-500">{t('dashboard.cockpit.summary.sampleDistribution', { count: integer.format(snapshot.sample.reviewCount) })}</p><div className="mt-3 space-y-2">{ratingRows.map((rating) => { const count = snapshot.sample.ratingBreakdown[rating]; const width = Math.round((count / snapshot.sample.reviewCount) * 100); return <div key={rating} className="grid grid-cols-[18px_1fr_28px] items-center gap-2 text-xs"><span>{rating}</span><div className="h-2.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-amber-400" style={{ width: `${width}%` }} /></div><span className="text-right text-slate-500">{count}</span></div>; })}</div></div>
                <div className="p-5"><p className="text-xs font-medium uppercase tracking-wide text-slate-500">{t('dashboard.cockpit.summary.trend')}</p><div className="mt-4 flex h-20 items-end border-b border-slate-200"><div className="mb-2 w-full border-t border-dashed border-slate-300" /></div><p className="mt-3 text-sm font-semibold text-slate-900">{t('dashboard.cockpit.summary.trendWaiting')}</p><p className="mt-1 text-xs leading-5 text-slate-500">{t('dashboard.cockpit.summary.trendBody')}</p></div>
              </div>
            </CardContent></Card>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard label={t('dashboard.cockpit.metrics.lowRatings')} value={integer.format(lowRatingCount)} detail={t('dashboard.cockpit.metrics.lowRatingsDetail', { count: integer.format(snapshot.sample.reviewCount) })} tone="attention" />
              <MetricCard label={t('dashboard.cockpit.metrics.observedReplies')} value={`${integer.format(snapshot.sample.ownerRepliesFound)}/${integer.format(snapshot.sample.reviewCount)}`} detail={t('dashboard.cockpit.metrics.observedRepliesDetail', { rate: integer.format(replyRate) })} />
              <MetricCard label={t('dashboard.cockpit.metrics.sampleRating')} value={decimal.format(sampleAverage)} detail={t('dashboard.cockpit.metrics.sampleRatingDetail')} tone="positive" />
              <MetricCard label={t('dashboard.cockpit.metrics.newReviews')} value="—" detail={t('dashboard.cockpit.metrics.connectionRequired')} />
            </div>

            <Card className="overflow-hidden border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]"><CardContent className="p-0"><div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-lg font-semibold text-slate-950">{t('dashboard.cockpit.reviews.title')}</h2><p className="mt-1 text-sm text-slate-500">{t('dashboard.cockpit.reviews.subtitle')}</p></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">{t('dashboard.cockpit.reviews.lockedBadge')}</span></div><div className="flex flex-col items-start gap-4 p-5 sm:flex-row sm:items-center"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[#2457D6]"><MessageSquareText className="h-5 w-5" /></span><div className="flex-1"><p className="font-semibold text-slate-950">{t('dashboard.cockpit.reviews.lockedTitle')}</p><p className="mt-1 text-sm leading-6 text-slate-600">{t('dashboard.cockpit.reviews.lockedBody')}</p></div><Button asChild variant="outline" className="shrink-0"><Link to="/settings">{t('dashboard.cockpit.reviews.action')}</Link></Button></div></CardContent></Card>

            <Card className="border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]"><CardContent className="p-5"><h2 className="text-lg font-semibold text-slate-950">{t('dashboard.cockpit.path.title')}</h2><p className="mt-1 text-sm text-slate-500">{t('dashboard.cockpit.path.subtitle')}</p><div className="mt-5 grid gap-4 md:grid-cols-3"><PathMetric icon={QrCode} value="—" label={t('dashboard.cockpit.path.opens')} detail={t('dashboard.cockpit.path.waiting')} /><PathMetric icon={ChevronRight} value="—" label={t('dashboard.cockpit.path.clicks')} detail={t('dashboard.cockpit.path.waiting')} /><PathMetric icon={BarChart3} value="—" label={t('dashboard.cockpit.path.published')} detail={t('dashboard.cockpit.path.officialOnly')} /></div><div className="mt-5 border-t border-slate-200 pt-4"><Button asChild variant="link" className="h-auto p-0 text-[#2457D6]"><Link to="/qrcodes">{t('dashboard.cockpit.path.action')}<ChevronRight className="ml-1 h-4 w-4" /></Link></Button></div></CardContent></Card>

            <Card className="border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]"><CardContent className="p-5"><h2 className="text-lg font-semibold text-slate-950">{t('dashboard.cockpit.topics.title')}</h2><p className="mt-1 text-sm text-slate-500">{t('dashboard.cockpit.topics.subtitle')}</p><div className="mt-4 flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4"><Info className="mt-0.5 h-5 w-5 shrink-0 text-[#2457D6]" /><p className="text-sm leading-6 text-slate-600">{t('dashboard.cockpit.topics.body')}</p></div></CardContent></Card>
          </section>

          <aside className="space-y-5">
            <Card className="border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]"><CardContent className="p-5"><h2 className="font-semibold text-slate-950">{t('dashboard.cockpit.attention.title')}</h2><p className="mt-3 text-4xl font-medium text-red-600">{integer.format(lowRatingCount)}</p><p className="mt-2 text-sm leading-6 text-slate-600">{t('dashboard.cockpit.attention.body', { count: integer.format(snapshot.sample.reviewCount) })}</p><Button asChild className="mt-5 w-full rounded-full bg-[#2457D6] hover:bg-[#1d47b0]"><Link to="/settings">{t('dashboard.cockpit.attention.action')}</Link></Button></CardContent></Card>
            <WhatsAppCard localWhatsApp={localWhatsApp} onOpen={() => setActiveTab('whatsapp')} />
            <ProfileHealthCard />
            <Card className="border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]"><CardContent className="p-5"><h2 className="font-semibold text-slate-950">{t('dashboard.cockpit.changes.title')}</h2><div className="mt-4 space-y-3"><ChangeItem text={t('dashboard.cockpit.changes.snapshot')} /><ChangeItem text={t('dashboard.cockpit.changes.lowRatings', { count: integer.format(lowRatingCount) })} /><ChangeItem text={t('dashboard.cockpit.changes.official')} /></div></CardContent></Card>
          </aside>
        </div>
      )}
    </div>
  );
};

const CockpitTabs = ({ activeTab, setActiveTab, tabs }: { activeTab: CockpitTab; setActiveTab: (tab: CockpitTab) => void; tabs: Array<{ id: CockpitTab; label: string }> }) => <nav className="flex gap-1 overflow-x-auto border-b border-slate-200" aria-label="Seções do painel">{tabs.map((tab) => <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={`shrink-0 border-b-2 px-3 py-3 text-sm font-medium transition-colors ${activeTab === tab.id ? 'border-[#2457D6] text-[#2457D6]' : 'border-transparent text-slate-500 hover:text-slate-900'}`}>{tab.label}</button>)}</nav>;

const PathMetric = ({ icon: Icon, value, label, detail }: { icon: typeof QrCode; value: string; label: string; detail: string }) => <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50"><Icon className="h-5 w-5 text-[#2457D6]" /></span><div><p className="text-2xl font-semibold text-slate-950">{value}</p><p className="text-xs font-medium text-slate-700">{label}</p><p className="mt-1 text-xs text-slate-500">{detail}</p></div></div>;

const ChangeItem = ({ text }: { text: string }) => <div className="flex gap-3 text-sm leading-5 text-slate-600"><span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#2457D6]" />{text}</div>;

const WhatsAppCard = ({ localWhatsApp, onOpen }: { localWhatsApp: LocalWhatsAppState; onOpen: () => void }) => {
  const { t } = useOwnerTranslation();
  const connected = localWhatsApp.status === 'ready';
  return <Card className="border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]"><CardContent className="p-5"><div className="flex items-start justify-between gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50"><MessageCircle className="h-4 w-4 text-emerald-700" /></span><span className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${connected ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{t(`dashboard.cockpit.whatsapp.status.${localWhatsApp.status}`)}</span></div><p className="mt-4 font-semibold text-slate-950">{t('dashboard.cockpit.whatsapp.title')}</p><p className="mt-1 text-sm leading-6 text-slate-500">{connected ? t('dashboard.cockpit.whatsapp.localCardReady') : t('dashboard.cockpit.whatsapp.body')}</p><Button variant="link" onClick={onOpen} className="mt-3 h-auto p-0 text-[#2457D6]">{connected ? t('dashboard.cockpit.whatsapp.openTest') : t('dashboard.cockpit.whatsapp.connect')}<ChevronRight className="ml-1 h-4 w-4" /></Button></CardContent></Card>;
};

const WhatsAppWorkspace = ({ localWhatsApp }: { localWhatsApp: LocalWhatsAppState }) => {
  const { t, i18n } = useOwnerTranslation();
  const [recipient, setRecipient] = useState('');
  const [message, setMessage] = useState(t('dashboard.cockpit.whatsapp.defaultMessage'));
  const [confirmed, setConfirmed] = useState(false);
  const [sendState, setSendState] = useState<{ status: 'idle' | 'sending' | 'sent' | 'error'; detail?: string; sentAt?: string; recipient?: string }>({ status: 'idle' });
  const ready = localWhatsApp.status === 'ready' && localWhatsApp.session;

  const sendTest = async () => {
    if (!ready || !message.trim() || !recipient.trim()) return;
    setSendState({ status: 'sending' });
    try {
      const result = await sendLocalWhatsAppText({ sessionId: localWhatsApp.session!.id, phone: recipient, text: message.trim() });
      setSendState({ status: 'sent', sentAt: result.sentAt, recipient: maskInternationalPhone(recipient) });
      setConfirmed(false);
    } catch (error) {
      setSendState({ status: 'error', detail: error instanceof Error ? error.message : t('dashboard.cockpit.whatsapp.sendError') });
    }
  };

  return <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_370px]"><section className="space-y-5"><Card className="border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]"><CardContent className="p-6"><div className="flex items-start justify-between gap-3"><div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50"><MessageCircle className="h-5 w-5 text-emerald-700" /></span><div><h2 className="text-xl font-semibold text-slate-950">{t('dashboard.cockpit.whatsapp.localTitle')}</h2><p className="mt-1 text-sm leading-6 text-slate-600">{t('dashboard.cockpit.whatsapp.localBody')}</p></div></div><Button variant="outline" size="sm" onClick={() => void localWhatsApp.refresh()}>{t('dashboard.cockpit.whatsapp.refresh')}</Button></div><div className={`mt-5 rounded-lg border p-4 text-sm leading-6 ${ready ? 'border-emerald-100 bg-emerald-50/60 text-emerald-950' : 'border-amber-200 bg-amber-50/60 text-amber-950'}`}><strong className="block">{t(`dashboard.cockpit.whatsapp.status.${localWhatsApp.status}`)}</strong><p className="mt-1">{ready ? t('dashboard.cockpit.whatsapp.readyBody') : localWhatsApp.detail || t('dashboard.cockpit.whatsapp.unavailableBody')}</p></div><div className="mt-6 space-y-4"><label className="block text-sm font-medium text-slate-700">{t('dashboard.cockpit.whatsapp.recipient')}<Input value={recipient} onChange={(event) => setRecipient(event.target.value)} autoComplete="tel" inputMode="tel" placeholder="+351 911 056 526" className="mt-2" disabled={!ready || sendState.status === 'sending'} /><span className="mt-1.5 block text-xs font-normal leading-5 text-slate-500">{t('dashboard.cockpit.whatsapp.recipientHint')}</span></label><label className="block text-sm font-medium text-slate-700">{t('dashboard.cockpit.whatsapp.message')}<Textarea value={message} onChange={(event) => setMessage(event.target.value)} className="mt-2 min-h-28 resize-y" disabled={!ready || sendState.status === 'sending'} /></label><label className="flex items-start gap-3 rounded-lg border border-slate-200 p-3 text-sm leading-5 text-slate-700"><Checkbox checked={confirmed} onCheckedChange={(checked) => setConfirmed(checked === true)} disabled={!ready || sendState.status === 'sending'} /><span>{t('dashboard.cockpit.whatsapp.confirmation')}</span></label><Button onClick={() => void sendTest()} disabled={!ready || !recipient.trim() || !message.trim() || !confirmed || sendState.status === 'sending'} className="rounded-full bg-[#2457D6] hover:bg-[#1d47b0]">{sendState.status === 'sending' ? t('dashboard.cockpit.whatsapp.sending') : t('dashboard.cockpit.whatsapp.sendTest')}</Button>{sendState.status === 'error' && <p className="text-sm text-red-700">{sendState.detail}</p>}{sendState.status === 'sent' && sendState.sentAt && <p className="flex items-center gap-2 text-sm text-emerald-700"><CheckCircle2 className="h-4 w-4" />{t('dashboard.cockpit.whatsapp.sent', { recipient: sendState.recipient, time: new Intl.DateTimeFormat(i18n.language, { dateStyle: 'short', timeStyle: 'short' }).format(new Date(sendState.sentAt)) })}</p>}</div></CardContent></Card></section><aside className="space-y-5"><Card className="border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]"><CardContent className="p-5"><h2 className="font-semibold text-slate-950">{t('dashboard.cockpit.whatsapp.historyTitle')}</h2><div className="mt-4 flex items-start gap-3 rounded-lg bg-slate-50 p-4"><Clock3 className="mt-0.5 h-5 w-5 text-slate-500" /><p className="text-sm leading-6 text-slate-600">{sendState.status === 'sent' ? t('dashboard.cockpit.whatsapp.historyLive') : t('dashboard.cockpit.whatsapp.historyEmpty')}</p></div></CardContent></Card><Card className="border-amber-200 bg-amber-50/50 shadow-none"><CardContent className="p-5"><Settings2 className="h-5 w-5 text-amber-800" /><h2 className="mt-3 font-semibold text-slate-950">{t('dashboard.cockpit.whatsapp.connectionTitle')}</h2><p className="mt-1 text-sm leading-6 text-slate-700">{t('dashboard.cockpit.whatsapp.connectionBody')}</p></CardContent></Card></aside></div>;
};

const ProfileHealthCard = () => {
  const { t } = useOwnerTranslation();
  return <Card className="border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]"><CardContent className="p-5"><h2 className="font-semibold text-slate-950">{t('dashboard.cockpit.health.title')}</h2><p className="mt-1 text-sm text-slate-500">{t('dashboard.cockpit.health.subtitle')}</p><div className="mt-4 divide-y divide-slate-200 rounded-lg border border-slate-200"><HealthRow icon={MessageSquareText} title={t('dashboard.cockpit.health.responses')} value={t('dashboard.cockpit.health.connection')} /><HealthRow icon={Image} title={t('dashboard.cockpit.health.photos')} value={t('dashboard.cockpit.health.connection')} /><HealthRow icon={FileText} title={t('dashboard.cockpit.health.info')} value={t('dashboard.cockpit.health.review')} /></div></CardContent></Card>;
};

const HealthRow = ({ icon: Icon, title, value }: { icon: typeof Image; title: string; value: string }) => <div className="flex items-center gap-3 p-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50"><Icon className="h-4 w-4 text-[#2457D6]" /></span><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-slate-900">{title}</p><p className="mt-0.5 text-xs text-amber-700">{value}</p></div><ChevronRight className="h-4 w-4 text-slate-400" /></div>;

export default ExperimentalCockpitDashboard;
