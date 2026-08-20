import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BellRing,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  ExternalLink,
  Lightbulb,
  MessageCircle,
  QrCode,
  Sparkles,
  Star,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { Line, LineChart, ResponsiveContainer } from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import type { Locale } from '@/i18n';
import type { MarketingCopy } from '@/i18n/marketing';

type DemoTab = 'overview' | 'reviews' | 'whatsapp';

type DemoReview = {
  id: string;
  name: string;
  rating: number;
  age: string;
  text: string;
  reply: string;
};

const volume = [10, 8, 11, 9, 10, 9, 8, 7, 6, 5, 4, 3].map((reviews, index) => ({ index, reviews }));
const starSeries = [
  { label: '5', current: 54, previous: 78, values: [78, 76, 77, 73, 75, 70, 67, 64, 60, 54], risk: true },
  { label: '4', current: 18, previous: 12, values: [12, 10, 13, 11, 15, 16, 16, 16, 15, 18], risk: false },
  { label: '3', current: 7, previous: 6, values: [6, 6, 6, 6, 6, 6, 6, 5, 5, 7], risk: false },
  { label: '2', current: 12, previous: 4, values: [4, 4, 4, 8, 4, 4, 4, 10, 12, 12], risk: true },
  { label: '1', current: 9, previous: 4, values: [4, 4, 4, 4, 4, 4, 4, 9, 9, 9], risk: true },
];

type DemoUiCopy = {
  product: string; positiveMentions: string; opportunity: string; strengthHeading: string; fragilityHeading: string;
  strengthDetail: string; fragilityDetail: string; weeks: string; days30: string; qrOpen: string; googleClick: string;
  qrNote: string; topics: [string, string, string, string]; topicsAlert: string; totalReviews: string; profileMissing: string;
  weekDays: string; weeklyChange: string; previous: string; next: string; of: string; reviewLanguage: string;
  connectedReview: string; frequencyWeekly: string; frequencyDaily: string; savePreferences: string; previewNote: string;
  reviews: Array<{ name: string; age: string; text: string; reply: string }>;
};

const DEMO_UI: Record<Locale, DemoUiCopy> = {
  'pt-BR': {
    product: 'Prato executivo', positiveMentions: '22 menções positivas', opportunity: 'Oportunidade observada', strengthHeading: 'Prato executivo e atendimento', fragilityHeading: 'Espera e resposta atrasada', strengthDetail: 'Prato executivo apareceu em 22 elogios. Atendimento atencioso apareceu em 18.', fragilityDetail: 'Tempo de espera apareceu em três avaliações recentes. Três respostas aguardam revisão.', weeks: '12 semanas', days30: 'Últimos 30 dias', qrOpen: 'QR aberto', googleClick: 'Clicou no Google', qrNote: 'Abertura e clique são sinais de intenção. Esta demonstração não atribui avaliações publicadas ao QR.', topics: ['comida', 'atendimento', 'limpeza', 'delivery'], topicsAlert: 'Limpeza e delivery aparecem juntos em seis avaliações. Pode ser um ponto a revisar.', totalReviews: '128 avaliações no total', profileMissing: 'Faltam horário de funcionamento, duas fotos e descrição do negócio.', weekDays: '7 dias', weeklyChange: 'Duas avaliações novas chegaram. Uma resposta foi preparada para revisão.', previous: 'Anterior', next: 'Próxima', of: 'de', reviewLanguage: 'Idioma da avaliação', connectedReview: 'No produto conectado, este passo abre somente o link individual da avaliação.', frequencyWeekly: 'Toda segunda-feira, 09:00', frequencyDaily: 'Todos os dias úteis, 09:00', savePreferences: 'Salvar preferências', previewNote: 'Esta é uma prévia ilustrativa. O envio automático depende da configuração operacional do canal.', reviews: [{ name: 'Mariana Souza', age: '2 dias', text: 'O atendimento demorou mais do que o esperado e ninguém explicou o que estava acontecendo.', reply: 'Mariana, sentimos muito pela sua experiência. Já estamos revisando a organização do atendimento nos horários mais movimentados. Obrigado por nos contar o que aconteceu.' }, { name: 'Rafael Lima', age: '3 dias', text: 'A comida estava boa, mas a equipe parecia perdida no horário de almoço.', reply: 'Rafael, obrigado por reconhecer a comida e por apontar o atendimento. Estamos revisando a organização do almoço para tornar a experiência mais ágil.' }, { name: 'Ana Lima', age: '4 dias', text: 'Prato executivo excelente e equipe muito atenciosa. Voltarei com certeza!', reply: 'Ana, muito obrigado pela avaliação. Ficamos felizes em saber que gostou do prato executivo e do atendimento. Será um prazer recebê-la novamente.' }] },
  'pt-PT': {
    product: 'Prato executivo', positiveMentions: '22 menções positivas', opportunity: 'Oportunidade observada', strengthHeading: 'Prato executivo e atendimento', fragilityHeading: 'Espera e resposta atrasada', strengthDetail: 'Prato executivo surgiu em 22 elogios. Atendimento atencioso surgiu em 18.', fragilityDetail: 'Tempo de espera surgiu em três avaliações recentes. Três respostas aguardam revisão.', weeks: '12 semanas', days30: 'Últimos 30 dias', qrOpen: 'QR aberto', googleClick: 'Clicou no Google', qrNote: 'Abertura e clique são sinais de intenção. Esta demonstração não atribui avaliações publicadas ao QR.', topics: ['comida', 'atendimento', 'limpeza', 'delivery'], topicsAlert: 'Limpeza e delivery surgem juntos em seis avaliações. Pode ser um ponto a rever.', totalReviews: '128 avaliações no total', profileMissing: 'Faltam horário de funcionamento, duas fotografias e descrição do negócio.', weekDays: '7 dias', weeklyChange: 'Chegaram duas avaliações novas. Uma resposta foi preparada para revisão.', previous: 'Anterior', next: 'Seguinte', of: 'de', reviewLanguage: 'Idioma da avaliação', connectedReview: 'No produto ligado, este passo abre apenas a ligação individual da avaliação.', frequencyWeekly: 'Todas as segundas-feiras, 09:00', frequencyDaily: 'Todos os dias úteis, 09:00', savePreferences: 'Guardar preferências', previewNote: 'Esta é uma pré-visualização ilustrativa. O envio automático depende da configuração operacional do canal.', reviews: [{ name: 'Mariana Souza', age: 'há 2 dias', text: 'O atendimento demorou mais do que o esperado e ninguém explicou o que estava a acontecer.', reply: 'Mariana, lamentamos muito a sua experiência. Já estamos a rever a organização do atendimento nos horários mais movimentados. Obrigado por nos contar o que aconteceu.' }, { name: 'Rafael Lima', age: 'há 3 dias', text: 'A comida estava boa, mas a equipa parecia perdida no horário de almoço.', reply: 'Rafael, obrigado por reconhecer a comida e por apontar o atendimento. Estamos a rever a organização do almoço para tornar a experiência mais ágil.' }, { name: 'Ana Lima', age: 'há 4 dias', text: 'Prato executivo excelente e equipa muito atenciosa. Voltarei com certeza!', reply: 'Ana, muito obrigado pela avaliação. Ficamos felizes por saber que gostou do prato executivo e do atendimento. Será um prazer recebê-la novamente.' }] },
  en: {
    product: 'Executive lunch', positiveMentions: '22 positive mentions', opportunity: 'Opportunity spotted', strengthHeading: 'Executive lunch and service', fragilityHeading: 'Waiting time and delayed replies', strengthDetail: 'Executive lunch appeared in 22 compliments. Attentive service appeared in 18.', fragilityDetail: 'Waiting time appeared in three recent reviews. Three replies are waiting for review.', weeks: '12 weeks', days30: 'Last 30 days', qrOpen: 'QR opened', googleClick: 'Clicked Google', qrNote: 'Opens and clicks show intent. This demo does not attribute published reviews to the QR.', topics: ['food', 'service', 'cleanliness', 'delivery'], topicsAlert: 'Cleanliness and delivery appear together in six reviews. It may be worth reviewing.', totalReviews: '128 reviews in total', profileMissing: 'Business hours, two photos and the business description are still missing.', weekDays: '7 days', weeklyChange: 'Two new reviews arrived. One reply was prepared for review.', previous: 'Previous', next: 'Next', of: 'of', reviewLanguage: 'Review language', connectedReview: 'In the connected product, this step opens only the individual review link.', frequencyWeekly: 'Every Monday, 09:00', frequencyDaily: 'Every weekday, 09:00', savePreferences: 'Save preferences', previewNote: 'This is an illustrative preview. Automatic delivery depends on operational channel setup.', reviews: [{ name: 'Mariana Souza', age: '2 days ago', text: 'Service took longer than expected and nobody explained what was happening.', reply: 'Mariana, we are very sorry about your experience. We are reviewing service organization during the busiest hours. Thank you for telling us what happened.' }, { name: 'Rafael Lima', age: '3 days ago', text: 'The food was good, but the team seemed lost during lunch.', reply: 'Rafael, thank you for recognizing the food and pointing out the service. We are reviewing lunch operations to make the experience quicker.' }, { name: 'Ana Lima', age: '4 days ago', text: 'Excellent executive lunch and very attentive team. I will be back for sure!', reply: 'Ana, thank you very much for your review. We are glad you enjoyed the executive lunch and service. It will be a pleasure to welcome you again.' }] },
};

const PanelCard = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <Card className={`border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)] ${className}`}><CardContent className="p-5">{children}</CardContent></Card>
);

const Stars = ({ rating, size = 'small' }: { rating: number; size?: 'small' | 'medium' }) => {
  const className = size === 'medium' ? 'h-5 w-5' : 'h-3.5 w-3.5';
  return <span className="inline-flex" aria-label={`${rating}/5`}>{[1, 2, 3, 4, 5].map((star) => <Star key={star} className={`${className} ${star <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />)}</span>;
};

const DemoBadge = ({ copy }: { copy: MarketingCopy }) => <span className="rounded-full border border-violet-100 bg-violet-50 px-2.5 py-1 text-[11px] font-medium text-violet-800">{copy.cockpit.illustration}</span>;

const MiniChart = ({ values, tone = '#2457D6' }: { values: number[]; tone?: string }) => (
  <div className="h-9 w-24"><ResponsiveContainer width="100%" height="100%"><LineChart data={values.map((value, index) => ({ index, value }))}><Line type="monotone" dataKey="value" stroke={tone} strokeWidth={2.5} dot={false} isAnimationActive={false} /></LineChart></ResponsiveContainer></div>
);

export const SalesCockpitPreview = ({ copy }: { copy: MarketingCopy }) => (
  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-[#f5f7f9] shadow-2xl shadow-slate-950/10">
    <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
      <div><p className="text-sm font-semibold text-slate-950">{copy.cockpit.business}</p><p className="text-xs text-slate-500">{copy.cockpit.illustration}</p></div>
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2457D6] text-xs font-semibold text-white">BH</span>
    </div>
    <div className="space-y-3 p-4">
      <div className="rounded-xl border border-red-200 bg-red-50 p-3">
        <div className="flex gap-3"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-700" /><div><p className="text-xs font-semibold text-red-800">{copy.cockpit.radar}</p><p className="mt-1 text-sm font-semibold text-slate-950">{copy.cockpit.radarTitle}</p><p className="mt-1 text-xs leading-5 text-slate-600">{copy.cockpit.radarBody}</p></div></div>
      </div>
      <div className="grid gap-3 sm:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-xs font-semibold text-slate-900">{copy.cockpit.queue}</p><div className="mt-3 flex items-center justify-between"><div><p className="text-sm font-semibold">{DEMO_UI[copy.locale].reviews[0].name}</p><Stars rating={2} /></div><span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] text-[#2457D6]">{copy.cockpit.replySuggested}</span></div><p className="mt-3 text-xs leading-5 text-slate-600">{copy.cockpit.reviewMessage}</p></div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3"><p className="text-xs font-semibold text-emerald-800">{copy.cockpit.strength}</p><p className="mt-2 text-sm font-semibold text-slate-950">{DEMO_UI[copy.locale].product}</p><p className="mt-1 text-xs leading-5 text-slate-600">{DEMO_UI[copy.locale].positiveMentions}</p><div className="mt-3 flex items-center gap-2 text-xs text-emerald-800"><TrendingUp className="h-4 w-4" />{DEMO_UI[copy.locale].opportunity}</div></div>
      </div>
    </div>
  </div>
);

const BinnoDemoCockpit = ({ copy }: { copy: MarketingCopy }) => {
  const ui = DEMO_UI[copy.locale];
  const [tab, setTab] = useState<DemoTab>('overview');
  const reviews = useMemo<DemoReview[]>(() => [
    { id: 'mariana', rating: 2, ...ui.reviews[0] },
    { id: 'rafael', rating: 3, ...ui.reviews[1] },
    { id: 'ana', rating: 5, ...ui.reviews[2] },
  ], [ui]);
  const [selectedId, setSelectedId] = useState(reviews[0].id);
  const [drafts, setDrafts] = useState<Record<string, string>>(() => Object.fromEntries(reviews.map((review) => [review.id, review.reply])));
  const [replyReady, setReplyReady] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [preferences, setPreferences] = useState({ weekly: true, radar: true, replies: true, profile: false });
  useEffect(() => {
    setSelectedId(reviews[0].id);
    setDrafts(Object.fromEntries(reviews.map((review) => [review.id, review.reply])));
    setReplyReady(false);
    setEditing(false);
  }, [copy.locale, reviews]);
  const selected = reviews.find((review) => review.id === selectedId) || reviews[0];
  const index = reviews.findIndex((review) => review.id === selected.id);

  const useReply = async () => {
    try { await navigator.clipboard.writeText(drafts[selected.id]); } catch { /* The visible draft remains available for the demo. */ }
    setReplyReady(true);
  };
  const previous = () => setSelectedId(reviews[Math.max(0, index - 1)].id);
  const next = () => setSelectedId(reviews[Math.min(reviews.length - 1, index + 1)].id);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-[#f5f7f9] shadow-[0_18px_60px_rgba(15,23,42,0.10)]">
      <header className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><p className="text-xl font-bold tracking-tight text-[#6D43C0]">Binno</p><span className="hidden h-5 border-l border-slate-200 sm:block" /><p className="text-sm font-medium text-slate-700">{copy.cockpit.business}</p></div><DemoBadge copy={copy} /></div></header>
      <nav className="border-b border-slate-200 bg-white px-4 sm:px-6" aria-label="Demonstração do Binno"><div className="flex gap-1 overflow-x-auto">{([{ id: 'overview', label: copy.cockpit.overview }, { id: 'reviews', label: copy.cockpit.reviews }, { id: 'whatsapp', label: copy.cockpit.whatsapp }] as const).map((item) => <button key={item.id} type="button" onClick={() => setTab(item.id)} className={`shrink-0 border-b-2 px-3 py-3 text-sm font-medium ${tab === item.id ? 'border-[#2457D6] text-[#2457D6]' : 'border-transparent text-slate-500 hover:text-slate-900'}`}>{item.label}</button>)}</div></nav>
      <div className="p-4 sm:p-6">
        {tab === 'overview' && <Overview copy={copy} onOpenReviews={() => setTab('reviews')} onOpenWhatsApp={() => setTab('whatsapp')} />}
        {tab === 'reviews' && <ReviewsTab copy={copy} selected={selected} index={index} total={reviews.length} draft={drafts[selected.id]} ready={replyReady} editing={editing} onDraft={(value) => setDrafts((current) => ({ ...current, [selected.id]: value }))} onUse={() => void useReply()} onEdit={() => setEditing((value) => !value)} onPrevious={previous} onNext={next} onSelect={(id) => { setSelectedId(id); setReplyReady(false); setEditing(false); }} />}
        {tab === 'whatsapp' && <WhatsAppTab copy={copy} preferences={preferences} saved={saved} onToggle={(key) => setPreferences((current) => ({ ...current, [key]: !current[key] }))} onSave={() => setSaved(true)} />}
      </div>
    </section>
  );
};

const Overview = ({ copy, onOpenReviews, onOpenWhatsApp }: { copy: MarketingCopy; onOpenReviews: () => void; onOpenWhatsApp: () => void }) => (
  <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
    <section className="space-y-5">
      <PanelCard className="border-red-200 bg-red-50/50"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-lg font-semibold text-red-700">3</span><div><p className="font-semibold text-slate-950">{copy.cockpit.waiting}</p><p className="mt-1 text-sm text-slate-600">{copy.replies.body}</p></div></div><Button onClick={onOpenReviews} className="rounded-full bg-[#2457D6] hover:bg-[#1d47b0]">{copy.cockpit.reviews}</Button></div></PanelCard>
      <PanelCard className="border-violet-200 bg-violet-50/50"><div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-100"><Sparkles className="h-5 w-5 text-[#6D43C0]" /></span><div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6D43C0]">{copy.cockpit.radar}</p><h2 className="mt-1 text-lg font-semibold text-slate-950">{copy.cockpit.radarTitle}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-700">{copy.cockpit.radarBody}</p><button type="button" onClick={onOpenReviews} className="mt-3 text-sm font-semibold text-[#2457D6]">{copy.cockpit.details}<ChevronRight className="ml-1 inline h-4 w-4" /></button></div></div></PanelCard>
      <div className="grid gap-5 sm:grid-cols-2"><SignalCard copy={copy} good /><SignalCard copy={copy} /></div>
      <VolumeCard copy={copy} />
      <StarsCard copy={copy} />
      <div className="grid gap-5 md:grid-cols-2"><QrCard copy={copy} /><TopicsCard copy={copy} /></div>
    </section>
    <aside className="space-y-5"><ReputationCard copy={copy} /><WhatsAppSummary copy={copy} onOpen={onOpenWhatsApp} /><PlanCard copy={copy} /><ProfileCard copy={copy} /><WeeklyCard copy={copy} /></aside>
  </div>
);

const SignalCard = ({ copy, good = false }: { copy: MarketingCopy; good?: boolean }) => {
  const ui = DEMO_UI[copy.locale];
  const tone = good ? 'border-emerald-200 bg-emerald-50/50' : 'border-red-200 bg-red-50/50';
  const title = good ? copy.cockpit.strength : copy.cockpit.fragility;
  const heading = good ? ui.strengthHeading : ui.fragilityHeading;
  const detail = good ? ui.strengthDetail : ui.fragilityDetail;
  const Icon = good ? TrendingUp : TrendingDown;
  return <PanelCard className={tone}><div className="flex gap-3"><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${good ? 'bg-emerald-100' : 'bg-red-100'}`}><Icon className={`h-4 w-4 ${good ? 'text-emerald-700' : 'text-red-700'}`} /></span><div><p className={`text-xs font-semibold ${good ? 'text-emerald-800' : 'text-red-800'}`}>{title}</p><h2 className="mt-1 font-semibold text-slate-950">{heading}</h2><p className="mt-2 text-sm leading-5 text-slate-700">{detail}</p></div></div></PanelCard>;
};

const VolumeCard = ({ copy }: { copy: MarketingCopy }) => <PanelCard><div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-semibold text-slate-950">{copy.cockpit.volume}</h2><p className="mt-1 text-sm text-slate-500">{DEMO_UI[copy.locale].weeks}</p></div><DemoBadge copy={copy} /></div><div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center"><div className="h-12 w-40 shrink-0"><ResponsiveContainer width="100%" height="100%"><LineChart data={volume}><Line type="monotone" dataKey="reviews" stroke="#2457D6" strokeWidth={3} dot={false} isAnimationActive={false} /></LineChart></ResponsiveContainer></div><p className="text-lg font-semibold text-slate-950">{copy.cockpit.volumeBody}</p></div><div className="mt-5 flex gap-3 rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-950"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-700" /><p>{copy.cockpit.volumeAlert}</p></div></PanelCard>;

const StarsCard = ({ copy }: { copy: MarketingCopy }) => <PanelCard><div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-semibold text-slate-950">{copy.cockpit.stars}</h2><p className="mt-1 text-sm text-slate-500">{DEMO_UI[copy.locale].weeks}</p></div><DemoBadge copy={copy} /></div><div className="mt-5 divide-y divide-slate-200">{starSeries.map((row) => <div key={row.label} className="grid grid-cols-[48px_1fr_auto] items-center gap-3 py-3"><span className="text-sm font-semibold text-slate-800">{row.label}<Star className="ml-1 inline h-3.5 w-3.5 fill-amber-400 text-amber-400" /></span><MiniChart values={row.values} tone={row.risk ? '#C2413A' : '#D4A72C'} /><span className="text-right text-xs text-slate-500"><strong className="text-slate-950">{row.current}%</strong> {copy.locale === 'en' ? 'before' : 'antes'} {row.previous}%</span></div>)}</div><div className="mt-4 rounded-lg border border-red-100 bg-red-50 p-3 text-sm leading-5 text-red-950">{copy.cockpit.starsBody}</div></PanelCard>;

const QrCard = ({ copy }: { copy: MarketingCopy }) => <PanelCard><div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-semibold text-slate-950">{copy.cockpit.qr}</h2><p className="mt-1 text-sm text-slate-500">{DEMO_UI[copy.locale].days30}</p></div><QrCode className="h-5 w-5 text-[#2457D6]" /></div><div className="mt-5 space-y-3"><MetricRow label={DEMO_UI[copy.locale].qrOpen} value="142" /><MetricRow label={DEMO_UI[copy.locale].googleClick} value="89" /></div><p className="mt-4 text-xs leading-5 text-slate-500">{DEMO_UI[copy.locale].qrNote}</p></PanelCard>;

const TopicsCard = ({ copy }: { copy: MarketingCopy }) => <PanelCard><h2 className="text-lg font-semibold text-slate-950">{copy.cockpit.topics}</h2><div className="mt-5 flex flex-wrap gap-2"><Topic label={DEMO_UI[copy.locale].topics[0]} count="22" good /><Topic label={DEMO_UI[copy.locale].topics[1]} count="18" good /><Topic label={DEMO_UI[copy.locale].topics[2]} count="12" /><Topic label={DEMO_UI[copy.locale].topics[3]} count="9" /></div><div className="mt-5 rounded-lg border border-red-100 bg-red-50 p-3 text-sm leading-5 text-red-950">{DEMO_UI[copy.locale].topicsAlert}</div></PanelCard>;

const Topic = ({ label, count, good = false }: { label: string; count: string; good?: boolean }) => <span className={`rounded-full px-3 py-1.5 text-xs font-medium ${good ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'}`}>{label} · {count}</span>;

const ReputationCard = ({ copy }: { copy: MarketingCopy }) => <PanelCard><h2 className="font-semibold text-slate-950">{copy.cockpit.reputation}</h2><div className="mt-3 flex items-end gap-2"><p className="text-4xl font-semibold tracking-tight">4,6</p><Stars rating={5} size="medium" /></div><p className="mt-1 text-sm text-slate-600">{DEMO_UI[copy.locale].totalReviews}</p><div className="mt-5 grid grid-cols-2 gap-3"><SmallMetric label={copy.cockpit.responseTime} value="18 h" /><SmallMetric label={copy.cockpit.newReviews} value="+12" good /></div></PanelCard>;

const WhatsAppSummary = ({ copy, onOpen }: { copy: MarketingCopy; onOpen: () => void }) => <PanelCard><div className="flex items-center justify-between gap-3"><h2 className="font-semibold text-slate-950">{copy.cockpit.whatsappTitle}</h2><MessageCircle className="h-5 w-5 text-emerald-700" /></div><p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm leading-5 text-emerald-950">{copy.cockpit.whatsappBody}</p><Button variant="link" className="mt-2 h-auto px-0 text-[#2457D6]" onClick={onOpen}>{copy.cockpit.whatsapp}<ChevronRight className="ml-1 h-4 w-4" /></Button></PanelCard>;

const PlanCard = ({ copy }: { copy: MarketingCopy }) => <PanelCard><div className="flex gap-2"><Lightbulb className="h-5 w-5 text-[#6D43C0]" /><h2 className="font-semibold text-slate-950">{copy.cockpit.plan}</h2></div><p className="mt-3 text-sm leading-5 text-slate-700">{copy.cockpit.practice}</p><button type="button" className="mt-3 text-sm font-semibold text-[#2457D6]">{copy.cockpit.details}<ChevronRight className="ml-1 inline h-4 w-4" /></button></PanelCard>;

const ProfileCard = ({ copy }: { copy: MarketingCopy }) => <PanelCard><div className="flex items-center justify-between"><h2 className="font-semibold text-slate-950">{copy.cockpit.completeness}</h2><span className="text-sm text-slate-500">68%</span></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full w-[68%] rounded-full bg-[#2457D6]" /></div><p className="mt-3 text-sm leading-5 text-slate-600">{DEMO_UI[copy.locale].profileMissing}</p></PanelCard>;

const WeeklyCard = ({ copy }: { copy: MarketingCopy }) => <PanelCard><div className="flex items-center justify-between"><h2 className="font-semibold text-slate-950">{copy.cockpit.weekly}</h2><span className="text-xs text-slate-500">{DEMO_UI[copy.locale].weekDays}</span></div><div className="mt-4 flex items-center gap-3"><MiniChart values={[3, 4, 2, 5, 3, 4, 3]} /><p className="text-sm leading-5 text-slate-600">{DEMO_UI[copy.locale].weeklyChange}</p></div></PanelCard>;

const MetricRow = ({ label, value }: { label: string; value: string }) => <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"><span className="text-sm text-slate-600">{label}</span><strong className="text-slate-950">{value}</strong></div>;
const SmallMetric = ({ label, value, good = false }: { label: string; value: string; good?: boolean }) => <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs leading-4 text-slate-500">{label}</p><p className={`mt-2 text-xl font-semibold ${good ? 'text-emerald-700' : 'text-slate-950'}`}>{value}</p></div>;

const ReviewsTab = ({ copy, selected, index, total, draft, ready, editing, onDraft, onUse, onEdit, onPrevious, onNext, onSelect }: {
  copy: MarketingCopy; selected: DemoReview; index: number; total: number; draft: string; ready: boolean; editing: boolean;
  onDraft: (value: string) => void; onUse: () => void; onEdit: () => void; onPrevious: () => void; onNext: () => void; onSelect: (id: string) => void;
}) => {
  const ui = DEMO_UI[copy.locale];
  const candidates = ['mariana', 'rafael', 'ana'];
  return <div className="mx-auto max-w-4xl"><PanelCard><div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-xl font-semibold text-slate-950">{copy.cockpit.queue}</h1><p className="mt-1 text-sm text-slate-500">{index + 1} {ui.of} {total}</p></div><div className="flex gap-2"><Button size="sm" variant="outline" onClick={onPrevious} disabled={index === 0}><ChevronLeft className="mr-1 h-4 w-4" />{ui.previous}</Button><Button size="sm" variant="outline" onClick={onNext} disabled={index === total - 1}>{ui.next}<ChevronRight className="ml-1 h-4 w-4" /></Button></div></div><div className="mt-6"><div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-semibold text-slate-950">{selected.name}</h2><Stars rating={selected.rating} size="medium" /></div><p className="mt-1 text-sm text-slate-500">{selected.age}</p><blockquote className="mt-4 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">“{selected.text}”</blockquote></div><div className="mt-5 rounded-xl border border-slate-200 p-4"><div className="flex items-center justify-between gap-3"><p className="font-semibold text-slate-950">{copy.cockpit.replySuggested}</p><span className="text-xs text-slate-500">{ui.reviewLanguage}</span></div>{editing ? <Textarea value={draft} onChange={(event) => onDraft(event.target.value)} className="mt-3 min-h-32 leading-6" /> : <p className="mt-3 text-sm leading-6 text-slate-700">{draft}</p>}<div className="mt-4 flex flex-wrap gap-2"><Button onClick={onUse} className="rounded-full bg-[#2457D6] hover:bg-[#1d47b0]"><ClipboardCheck className="mr-2 h-4 w-4" />{ready ? copy.cockpit.copied : copy.cockpit.useReply}</Button><Button variant="outline" onClick={onEdit}>{copy.cockpit.edit}</Button><Button variant="outline"><Clock3 className="mr-2 h-4 w-4" />{copy.cockpit.skip}</Button></div>{ready && <p className="mt-3 flex items-center gap-2 text-sm text-emerald-700"><CheckCircle2 className="h-4 w-4" />{copy.cockpit.copied}. {ui.connectedReview}</p>}<p className="mt-4 flex gap-2 text-xs leading-5 text-slate-500"><ExternalLink className="mt-0.5 h-4 w-4 shrink-0" />{copy.replies.note}</p></div><div className="mt-5 flex flex-wrap gap-2">{candidates.map((id, candidateIndex) => <button key={id} type="button" onClick={() => onSelect(id)} className={`rounded-xl border px-3 py-2 text-left text-xs ${id === selected.id ? 'border-[#2457D6] bg-blue-50 text-[#2457D6]' : 'border-slate-200 bg-white text-slate-700'}`}><strong className="block">{ui.reviews[candidateIndex].name}</strong><Stars rating={[2, 3, 5][candidateIndex]} /></button>)}</div></PanelCard></div>;
};

const WhatsAppTab = ({ copy, preferences, saved, onToggle, onSave }: { copy: MarketingCopy; preferences: { weekly: boolean; radar: boolean; replies: boolean; profile: boolean }; saved: boolean; onToggle: (key: keyof typeof preferences) => void; onSave: () => void }) => <div className="mx-auto grid max-w-4xl gap-5 lg:grid-cols-[1fr_0.82fr]"><PanelCard><div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100"><BellRing className="h-5 w-5 text-emerald-700" /></span><div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-800">{copy.cockpit.whatsapp}</p><h1 className="mt-1 text-xl font-semibold text-slate-950">{copy.cockpit.preferenceTitle}</h1><p className="mt-2 text-sm leading-6 text-slate-600">{copy.cockpit.whatsappBody}</p></div></div><div className="mt-6 grid gap-4"><label><span className="text-sm font-medium text-slate-900">{copy.cockpit.recipient}</span><input className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value="+351 911 000 000" readOnly /></label><label><span className="text-sm font-medium text-slate-900">{copy.cockpit.frequency}</span><select className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" defaultValue="weekly"><option value="weekly">{DEMO_UI[copy.locale].frequencyWeekly}</option><option value="daily">{DEMO_UI[copy.locale].frequencyDaily}</option></select></label></div><div className="mt-6 space-y-3">{([{ key: 'weekly', label: copy.cockpit.weeklySummary }, { key: 'radar', label: copy.cockpit.radarAlerts }, { key: 'replies', label: copy.cockpit.replyAlerts }, { key: 'profile', label: copy.cockpit.profileAlerts }] as const).map((item) => <div key={item.key} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-3"><span className="text-sm font-medium text-slate-800">{item.label}</span><Switch checked={preferences[item.key]} onCheckedChange={() => onToggle(item.key)} /></div>)}</div><Button onClick={onSave} className="mt-6 w-full bg-[#2457D6] hover:bg-[#1d47b0]"><Check className="mr-2 h-4 w-4" />{DEMO_UI[copy.locale].savePreferences}</Button>{saved && <p className="mt-3 text-sm text-emerald-700">{copy.cockpit.saved}</p>}</PanelCard><PanelCard className="self-start"><div className="flex items-center gap-2"><MessageCircle className="h-5 w-5 text-emerald-700" /><h2 className="font-semibold text-slate-950">{copy.cockpit.preview}</h2></div><div className="mt-5 rounded-2xl rounded-tl-sm bg-emerald-50 p-4 text-sm leading-6 text-emerald-950"><p className="text-xs font-semibold text-emerald-800">Binno</p><p className="mt-2">{copy.cockpit.previewBody}</p></div><p className="mt-4 text-xs leading-5 text-slate-500">{DEMO_UI[copy.locale].previewNote}</p></PanelCard></div>;

export default BinnoDemoCockpit;
