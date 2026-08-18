import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ChevronLeft, ChevronRight, Copy, ExternalLink, Lightbulb, MessageCircle, QrCode, Star } from 'lucide-react';
import { Line, LineChart, ResponsiveContainer } from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import type { ExperimentalApifySnapshot, ExperimentalObservedReview } from '@/lib/experimentalApifySnapshot';
import { useOwnerTranslation } from '@/i18n/owner/useOwnerTranslation';
import { useGoogleBusinessReviewQueue } from '@/hooks/useGoogleBusinessReviewQueue';
import { useReviewFunnelMetrics } from '@/hooks/useReviewFunnelMetrics';
import { buildReplySuggestions } from '@/lib/replySuggestions';
import { LocalWhatsAppState, useLocalWhatsApp } from '@/hooks/useLocalWhatsApp';
import { WhatsAppWorkspace as FullWhatsAppWorkspace } from '@/components/dashboard/ExperimentalCockpitDashboard';

type CockpitTab = 'overview' | 'reviews' | 'whatsapp';
type QueueReview = {
  id: string;
  rating: number;
  comment: string;
  publishedAt: string | null;
  reviewerName?: string;
  reviewUrl?: string;
  responseObserved: boolean;
};
type ActionState = { draft: string; copied?: boolean };
type Rating = '1' | '2' | '3' | '4' | '5';
type Week = { start: string; reviewCount: number; ratingBreakdown: Record<Rating, number>; ownerReplies: number };

const ratings: Rating[] = ['5', '4', '3', '2', '1'];
const actionStorageKey = 'binno.approved-cockpit-actions';

const readActions = (): Record<string, ActionState> => {
  try {
    return JSON.parse(window.localStorage.getItem(actionStorageKey) || '{}') as Record<string, ActionState>;
  } catch {
    return {};
  }
};

const Stars = ({ rating, medium = false }: { rating: number; medium?: boolean }) => (
  <span className="flex" aria-label={`${rating} de 5 estrelas`}>
    {[1, 2, 3, 4, 5].map((star) => <Star key={star} className={`${medium ? 'h-5 w-5' : 'h-3.5 w-3.5'} ${star <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />)}
  </span>
);

const formatAge = (value: string | null, locale: string) => value
  ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(value))
  : '—';

const normalizeObserved = (review: ExperimentalObservedReview): QueueReview => review;

const ApprovedCockpitDashboard = ({ snapshot, userId }: { snapshot: ExperimentalApifySnapshot; userId?: string }) => {
  const { t, i18n } = useOwnerTranslation();
  const [tab, setTab] = useState<CockpitTab>('overview');
  const official = useGoogleBusinessReviewQueue(import.meta.env.VITE_GOOGLE_BUSINESS_OAUTH_ENABLED === 'true' ? userId : undefined);
  const funnel = useReviewFunnelMetrics(userId);
  const whatsApp = useLocalWhatsApp();
  const observed = (snapshot.sample.observedReviews?.items || []).map(normalizeObserved);
  const queue: QueueReview[] = official.syncComplete
    ? official.reviews.map((review) => ({ id: review.id, rating: review.rating, comment: review.comment || '', publishedAt: review.review_updated_at, reviewerName: review.reviewer_name || undefined, responseObserved: Boolean(review.reply_text) }))
    : observed;
  const history = useMemo(() => snapshot.sample.insights?.history?.weeks || [], [snapshot.sample.insights?.history?.weeks]);
  const tabs: Array<{ id: CockpitTab; label: string }> = [
    { id: 'overview', label: t('dashboard.cockpit.tabs.overview') },
    { id: 'reviews', label: t('dashboard.cockpit.tabs.reviews') },
    { id: 'whatsapp', label: t('dashboard.cockpit.tabs.whatsapp') },
  ];

  return <div className="space-y-5">
    <nav className="flex gap-1 overflow-x-auto border-b border-slate-200" aria-label={t('dashboard.cockpit.layout.navigation')}>
      {tabs.map((item) => <button key={item.id} type="button" onClick={() => setTab(item.id)} className={`shrink-0 border-b-2 px-3 py-3 text-sm font-medium transition-colors ${tab === item.id ? 'border-[#2457D6] text-[#2457D6]' : 'border-transparent text-slate-500 hover:text-slate-900'}`}>{item.label}</button>)}
    </nav>
    {tab === 'whatsapp' ? <FullWhatsAppWorkspace snapshot={snapshot} localWhatsApp={whatsApp} /> : tab === 'reviews' ? <ResponseQueue reviews={queue} snapshot={snapshot} /> : <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <section className="min-w-0 space-y-5">
        <ResponseQueue reviews={queue} snapshot={snapshot} />
        <VolumeCard weeks={history} />
        <RatingTrends weeks={history} snapshot={snapshot} />
        <div className="grid gap-5 md:grid-cols-2"><QrCard funnel={funnel.data} /><TopicsCard snapshot={snapshot} /></div>
      </section>
      <aside className="space-y-5">
        <ReputationCard snapshot={snapshot} />
        <WhatsAppCard localWhatsApp={whatsApp} onOpen={() => setTab('whatsapp')} />
        <DailyPractice snapshot={snapshot} onOpenReviews={() => setTab('reviews')} />
        <ProfileCompleteness connected={official.syncComplete} />
        <WeeklyChange weeks={history} />
      </aside>
    </div>}
  </div>;
};

const ResponseQueue = ({ reviews, snapshot }: { reviews: QueueReview[]; snapshot: ExperimentalApifySnapshot }) => {
  const { t, i18n } = useOwnerTranslation();
  const [selectedId, setSelectedId] = useState<string | null>(reviews[0]?.id || null);
  const [editing, setEditing] = useState(false);
  const [actions, setActions] = useState<Record<string, ActionState>>(readActions);
  const selected = reviews.find((review) => review.id === selectedId) || reviews[0];
  const index = selected ? reviews.findIndex((review) => review.id === selected.id) : 0;
  const suggestion = selected ? buildReplySuggestions({ rating: selected.rating, text: selected.comment, customerName: selected.reviewerName, businessName: snapshot.business.name, channel: 'public' })[0]?.body || '' : '';
  const currentAction = selected ? actions[selected.id] || { draft: suggestion } : { draft: '' };
  const save = (next: ActionState) => {
    if (!selected) return;
    setActions((current) => {
      const updated = { ...current, [selected.id]: next };
      window.localStorage.setItem(actionStorageKey, JSON.stringify(updated));
      return updated;
    });
  };
  const select = (next: number) => {
    if (reviews[next]) {
      setSelectedId(reviews[next].id);
      setEditing(false);
    }
  };
  const copyReply = async () => {
    try { await navigator.clipboard.writeText(currentAction.draft); } catch { /* Keep the editable draft available. */ }
    save({ ...currentAction, copied: true });
  };
  if (!selected) return <Card className="border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]"><CardContent className="p-5"><h2 className="text-lg font-semibold text-slate-950">{t('dashboard.cockpit.layout.queueTitle')}</h2></CardContent></Card>;

  return <Card className="overflow-hidden border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]"><CardContent className="p-0">
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5"><h2 className="text-lg font-semibold text-slate-950">{t('dashboard.cockpit.layout.queueTitle')}</h2><span className="text-sm text-slate-500">{index + 1} de {reviews.length}</span></div>
    <div className="p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-slate-950">{selected.reviewerName || `${t('dashboard.cockpit.assisted.reviewLabel', { rating: selected.rating })}`}</p><Stars rating={selected.rating} medium /></div><p className="mt-1 text-xs text-slate-500">{formatAge(selected.publishedAt, i18n.language)}</p></div><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => select(index - 1)} disabled={index === 0}><ChevronLeft className="mr-1 h-4 w-4" />Anterior</Button><Button variant="outline" size="sm" onClick={() => select(index + 1)} disabled={index >= reviews.length - 1}>Próxima<ChevronRight className="ml-1 h-4 w-4" /></Button></div></div>
      <blockquote className="mt-5 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">“{selected.comment}”</blockquote>
      <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4"><span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-[#2457D6]">{t('dashboard.cockpit.layout.replyTitle')}</span>{editing ? <Textarea value={currentAction.draft} onChange={(event) => save({ draft: event.target.value })} className="mt-3 min-h-28 resize-y text-sm leading-6" /> : <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-700">{currentAction.draft}</p>}<div className="mt-4 flex flex-wrap gap-2"><Button onClick={() => void copyReply()} className="rounded-full bg-[#2457D6] hover:bg-[#1d47b0]"><Copy className="mr-2 h-4 w-4" />{currentAction.copied ? t('dashboard.advisor.copiedButton') : 'Usar resposta'}</Button><Button variant="outline" onClick={() => setEditing((value) => !value)}>{editing ? 'Concluir' : 'Editar'}</Button><Button variant="outline" onClick={() => select(Math.min(index + 1, reviews.length - 1))}>Pular</Button>{selected.reviewUrl && <Button asChild variant="ghost" className="text-[#2457D6]"><a href={selected.reviewUrl} target="_blank" rel="noreferrer">{t('dashboard.cockpit.assisted.openReview')}<ExternalLink className="ml-2 h-4 w-4" /></a></Button>}</div></div>
      <div className="mt-4 flex flex-wrap gap-2">{reviews.slice(0, 8).map((review) => <button key={review.id} type="button" onClick={() => { setSelectedId(review.id); setEditing(false); }} className={`rounded-xl border px-3 py-2 text-left text-xs ${review.id === selected.id ? 'border-[#2457D6] bg-blue-50 text-[#2457D6]' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}><span className="block max-w-32 truncate font-semibold">{review.reviewerName || `${review.rating} ★`}</span><Stars rating={review.rating} /></button>)}</div>
    </div>
  </CardContent></Card>;
};

const VolumeCard = ({ weeks }: { weeks: Week[] }) => {
  const hasHistory = weeks.length > 0;
  const current = weeks.at(-1) || { reviewCount: 0 };
  const previous = weeks.slice(-9, -1);
  const average = previous.length ? previous.reduce((sum, week) => sum + week.reviewCount, 0) / previous.length : 0;
  const change = hasHistory && average > 0 ? Math.round(((current.reviewCount - average) / average) * 100) : null;
  return <Card className="border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]"><CardContent className="p-5"><div className="flex items-center justify-between gap-3"><h2 className="text-lg font-semibold text-slate-950">Volume de avaliações</h2><span className="text-sm text-slate-500">12 semanas</span></div><div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center"><div className="h-12 w-40 shrink-0">{hasHistory && <ResponsiveContainer width="100%" height="100%"><LineChart data={weeks}><Line type="monotone" dataKey="reviewCount" stroke="#2457D6" strokeWidth={3} dot={false} isAnimationActive={false} /></LineChart></ResponsiveContainer>}</div><p className="text-lg font-semibold text-slate-950">{hasHistory ? current.reviewCount : '—'} <span className="text-sm font-normal text-slate-600">avaliações nesta semana{hasHistory ? ` · média de ${Math.round(average)}` : ''}</span></p></div>{change !== null && change <= -25 && <div className="mt-5 flex gap-3 rounded-lg border border-red-100 bg-red-50 p-4 text-sm leading-5 text-red-950"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-700" /><p><strong>Queda de {Math.abs(change)}%</strong> em relação à média das últimas 8 semanas.</p></div>}</CardContent></Card>;
};

const share = (weeks: Week[], rating: Rating) => weeks.reduce((sum, week) => sum + week.ratingBreakdown[rating], 0) / Math.max(1, weeks.reduce((sum, week) => sum + week.reviewCount, 0));

const RatingTrends = ({ weeks, snapshot }: { weeks: Week[]; snapshot: ExperimentalApifySnapshot }) => {
  const hasHistory = weeks.length > 0;
  const current = weeks.slice(-4);
  const previous = weeks.slice(-8, -4);
  const rows = ratings.map((rating) => ({ rating, current: hasHistory ? Math.round(share(current, rating) * 100) : Math.round((snapshot.sample.ratingBreakdown[rating] / Math.max(1, snapshot.sample.reviewCount)) * 100), previous: hasHistory ? Math.round(share(previous, rating) * 100) : null, series: weeks.map((week) => ({ value: week.reviewCount ? Math.round((week.ratingBreakdown[rating] / week.reviewCount) * 100) : 0 })) }));
  const five = rows[0];
  const lowCurrent = rows.filter((row) => row.rating === '1' || row.rating === '2').reduce((sum, row) => sum + row.current, 0);
  const lowPrevious = rows.filter((row) => row.rating === '1' || row.rating === '2').reduce((sum, row) => sum + (row.previous || 0), 0);
  const needsAttention = hasHistory && five.current < (five.previous || 0) || hasHistory && lowCurrent > lowPrevious;
  return <Card className="border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]"><CardContent className="p-5"><div className="flex items-center justify-between gap-3"><h2 className="text-lg font-semibold text-slate-950">Cada nota separada</h2><span className="text-sm text-slate-500">sem empilhamento</span></div><div className="mt-5 divide-y divide-slate-200">{rows.map((row) => { const risk = hasHistory && (row.rating === '5' ? row.current < (row.previous || 0) : Number(row.rating) <= 2 && row.current > (row.previous || 0)); return <div key={row.rating} className="grid grid-cols-[52px_1fr_auto] items-center gap-3 py-3"><span className="text-sm font-semibold text-slate-800">{row.rating}<Star className="ml-1 inline h-3.5 w-3.5 fill-amber-400 text-amber-400" /></span><div className="h-8 min-w-24">{hasHistory && <ResponsiveContainer width="100%" height="100%"><LineChart data={row.series}><Line type="monotone" dataKey="value" stroke={risk ? '#C2413A' : '#D4A72C'} strokeWidth={2.5} dot={false} isAnimationActive={false} /></LineChart></ResponsiveContainer>}</div><span className="whitespace-nowrap text-xs text-slate-500"><strong className="text-slate-900">{row.current}%</strong> antes {row.previous === null ? '—' : `${row.previous}%`} {risk && <span className="ml-2 rounded-full bg-red-50 px-2 py-1 text-red-700">atenção</span>}</span></div>; })}</div>{needsAttention && <div className="mt-5 flex gap-3 rounded-lg border border-red-100 bg-red-50 p-4 text-sm leading-5 text-red-950"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-700" /><p>As 5 estrelas mudaram de {five.previous}% para {five.current}% e as notas 1 e 2 mudaram de {lowPrevious}% para {lowCurrent}% nas últimas 4 semanas.</p></div>}</CardContent></Card>;
};

const ReputationCard = ({ snapshot }: { snapshot: ExperimentalApifySnapshot }) => {
  const integer = new Intl.NumberFormat();
  const decimal = new Intl.NumberFormat(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const replyHours = snapshot.sample.insights?.averageResponseHours;
  const last30 = snapshot.sample.insights?.reviewsLast30Days;
  return <Card className="border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]"><CardContent className="p-5"><div className="flex items-center justify-between gap-3"><h2 className="font-semibold text-slate-950">Reputação no Google</h2><span className="text-xs text-slate-500">últimos dados</span></div><div className="mt-4 flex items-end gap-3"><p className="text-4xl font-medium tracking-tight text-slate-950">{decimal.format(snapshot.business.googleRating)}</p><Stars rating={Math.round(snapshot.business.googleRating)} medium /></div><p className="mt-1 text-sm text-slate-600">{integer.format(snapshot.business.googleReviewCount)} avaliações no total</p><div className="mt-5 space-y-2">{ratings.map((rating) => { const count = snapshot.sample.ratingBreakdown[rating]; const width = snapshot.sample.reviewCount ? Math.round((count / snapshot.sample.reviewCount) * 100) : 0; return <div key={rating} className="grid grid-cols-[28px_1fr_36px] items-center gap-2 text-xs"><span>{rating}★</span><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={`${Number(rating) <= 2 ? 'bg-red-500' : 'bg-amber-400'} h-full rounded-full`} style={{ width: `${width}%` }} /></div><span className="text-right text-slate-600">{width}%</span></div>; })}</div><div className="mt-5 grid grid-cols-2 gap-3"><Metric label="Tempo médio de resposta" value={replyHours === null || replyHours === undefined ? '—' : `${Math.round(replyHours)} h`} /><Metric label="Novas avaliações (30 dias)" value={last30 === null || last30 === undefined ? '—' : `+${last30}`} tone="positive" /></div></CardContent></Card>;
};

const Metric = ({ label, value, tone }: { label: string; value: string; tone?: 'positive' }) => <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs leading-4 text-slate-500">{label}</p><p className={`mt-2 text-xl font-semibold ${tone === 'positive' ? 'text-emerald-700' : 'text-slate-950'}`}>{value}</p></div>;

const WhatsAppCard = ({ localWhatsApp, onOpen }: { localWhatsApp: LocalWhatsAppState; onOpen: () => void }) => <Card className="border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]"><CardContent className="p-5"><div className="flex items-center justify-between gap-3"><h2 className="font-semibold text-slate-950">Resumo no WhatsApp</h2><MessageCircle className="h-5 w-5 text-emerald-700" /></div><div className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm leading-5 text-emerald-950">{localWhatsApp.status === 'ready' ? 'Canal conectado para o seu resumo.' : 'Configure quando quer receber o resumo.'}</div><Button variant="link" className="mt-2 h-auto px-0 text-[#2457D6]" onClick={onOpen}>Configurar WhatsApp<ChevronRight className="ml-1 h-4 w-4" /></Button></CardContent></Card>;

const DailyPractice = ({ snapshot, onOpenReviews }: { snapshot: ExperimentalApifySnapshot; onOpenReviews: () => void }) => {
  const unresolved = (snapshot.sample.observedReviews?.items || []).filter((review) => !review.responseObserved).length;
  const practice = unresolved ? { title: `${unresolved} avaliações com texto ainda não mostram resposta`, body: 'Revise uma resposta e publique quando estiver satisfeito.', action: 'Revisar fila' } : { title: 'Planeje uma foto recente da experiência', body: 'Mostre o que o cliente encontra hoje.', action: 'Ver QR Codes' };
  return <Card className="border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]"><CardContent className="p-5"><div className="flex items-center gap-2"><Lightbulb className="h-5 w-5 text-[#6D43C0]" /><h2 className="font-semibold text-slate-950">Boas práticas</h2></div><p className="mt-4 font-medium text-slate-900">{practice.title}</p><p className="mt-1 text-sm leading-5 text-slate-600">{practice.body}</p><Button variant="link" className="mt-2 h-auto px-0 text-[#2457D6]" onClick={onOpenReviews}>{practice.action}<ChevronRight className="ml-1 h-4 w-4" /></Button></CardContent></Card>;
};

const ProfileCompleteness = ({ connected }: { connected: boolean }) => <Card className="border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]"><CardContent className="p-5"><div className="flex items-center justify-between gap-3"><h2 className="font-semibold text-slate-950">Completude do perfil</h2><span className="text-sm text-slate-500">{connected ? '—' : '—'}</span></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full w-0 rounded-full bg-[#2457D6]" /></div></CardContent></Card>;

const WeeklyChange = ({ weeks }: { weeks: Week[] }) => {
  const current = weeks.at(-1)?.ownerReplies || 0;
  return <Card className="border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]"><CardContent className="p-5"><div className="flex items-center justify-between gap-3"><h2 className="font-semibold text-slate-950">O que mudou na semana</h2><span className="text-xs text-slate-500">7 dias</span></div><div className="mt-4 flex items-center gap-3"><div className="h-8 w-20"><ResponsiveContainer width="100%" height="100%"><LineChart data={weeks}><Line type="monotone" dataKey="ownerReplies" stroke="#2457D6" strokeWidth={2.5} dot={false} isAnimationActive={false} /></LineChart></ResponsiveContainer></div><p className="text-sm leading-5 text-slate-600">{current ? `Você respondeu ${current} avaliações nos últimos 7 dias.` : '—'}</p></div></CardContent></Card>;
};

const QrCard = ({ funnel }: { funnel: { qrOpens: number; googleClicks: number } | null }) => <Card className="border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]"><CardContent className="p-5"><div className="flex items-center justify-between gap-3"><h2 className="text-lg font-semibold text-slate-950">Do QR ao Google</h2><QrCode className="h-5 w-5 text-[#2457D6]" /></div><dl className="mt-5 space-y-3"><div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"><dt className="text-sm text-slate-600">QR aberto</dt><dd className="font-semibold text-slate-950">{funnel?.qrOpens ?? '—'}</dd></div><div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"><dt className="text-sm text-slate-600">Clicou no Google</dt><dd className="font-semibold text-slate-950">{funnel?.googleClicks ?? '—'}</dd></div></dl></CardContent></Card>;

const TopicsCard = ({ snapshot }: { snapshot: ExperimentalApifySnapshot }) => {
  const { t } = useOwnerTranslation();
  const topics = snapshot.sample.insights?.topics || [];
  return <Card className="border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]"><CardContent className="p-5"><h2 className="text-lg font-semibold text-slate-950">{t('dashboard.cockpit.layout.topicsTitle')}</h2><div className="mt-5 flex flex-wrap gap-2">{topics.map((topic) => <span key={topic.id} className={`rounded-full px-3 py-1.5 text-xs font-medium ${topic.sentiment === 'negative' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>{t(`dashboard.cockpit.topicLabels.${topic.id}`)} · {topic.count}</span>)}</div></CardContent></Card>;
};

export default ApprovedCockpitDashboard;
