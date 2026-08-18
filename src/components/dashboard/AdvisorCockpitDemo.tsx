import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  Lightbulb,
  MessageCircle,
  MessageSquareText,
  QrCode,
  Sparkles,
  Star,
  TrendingDown,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';
import { Line, LineChart, ResponsiveContainer } from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';

type CockpitView = 'overview' | 'reviews' | 'volume' | 'practices' | 'profile' | 'whatsapp';

type DemoReview = {
  id: string;
  initials: string;
  name: string;
  rating: number;
  age: string;
  text: string;
  suggestedReply: string;
  theme: string;
};

const tabs: Array<{ id: CockpitView; label: string }> = [
  { id: 'overview', label: 'Visão geral' },
  { id: 'reviews', label: 'Avaliações' },
  { id: 'volume', label: 'Volume' },
  { id: 'practices', label: 'Boas práticas' },
  { id: 'profile', label: 'Perfil no Google' },
  { id: 'whatsapp', label: 'WhatsApp' },
];

const reviews: DemoReview[] = [
  {
    id: 'mariana', initials: 'MS', name: 'Mariana Souza', rating: 2, age: 'há 2 dias', theme: 'Tempo de espera',
    text: 'O atendimento demorou mais do que o esperado e ninguém explicou o que estava a acontecer.',
    suggestedReply: 'Mariana, lamentamos pela demora e por não termos explicado o que se passava. O seu relato ajuda-nos a rever o atendimento nos horários mais movimentados. Se quiser, fale connosco por mensagem para entendermos melhor a sua visita.',
  },
  {
    id: 'rafael', initials: 'RL', name: 'Rafael Lima', rating: 3, age: 'há 3 dias', theme: 'Atendimento',
    text: 'A comida estava boa, mas a equipa pareceu perdida no horário de almoço.',
    suggestedReply: 'Rafael, obrigado por reconhecer a comida e por apontar o atendimento. Estamos a rever a organização do horário de almoço para oferecer uma experiência mais ágil. Esperamos recebê-lo novamente.',
  },
  {
    id: 'ana', initials: 'AL', name: 'Ana Lima', rating: 5, age: 'há 4 dias', theme: 'Prato executivo',
    text: 'Prato executivo excelente e equipa muito atenciosa. Voltarei com certeza!',
    suggestedReply: 'Ana, muito obrigado pela avaliação. Ficamos felizes em saber que gostou do prato executivo e do atendimento. Será um prazer recebê-la novamente.',
  },
];

const ExampleBadge = () => <span className="rounded-full border border-violet-100 bg-violet-50 px-2.5 py-1 text-[11px] font-medium text-violet-800">Dados de demonstração</span>;

const Stars = ({ rating, size = 'small' }: { rating: number; size?: 'small' | 'medium' }) => {
  const iconClass = size === 'medium' ? 'h-5 w-5' : 'h-3.5 w-3.5';
  return <span className="flex" aria-label={`${rating} de 5 estrelas`}>{[1, 2, 3, 4, 5].map((star) => <Star key={star} className={`${iconClass} ${star <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />)}</span>;
};

const AdvisorCockpitDemo = ({ initialView = 'overview' }: { initialView?: CockpitView }) => {
  const [activeView, setActiveView] = useState<CockpitView>(initialView);
  const [activeReviewId, setActiveReviewId] = useState(reviews[0].id);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>(() => Object.fromEntries(reviews.map((review) => [review.id, review.suggestedReply])));
  const [preparedReviewId, setPreparedReviewId] = useState<string | null>(null);
  const [deferredIds, setDeferredIds] = useState<string[]>([]);
  const [whatsAppPrepared, setWhatsAppPrepared] = useState(false);

  const activeReview = reviews.find((review) => review.id === activeReviewId) || reviews[0];
  const pendingReviews = reviews.filter((review) => !deferredIds.includes(review.id));
  const currentIndex = pendingReviews.findIndex((review) => review.id === activeReview.id);
  const selectNext = () => {
    const nextIndex = Math.min(currentIndex + 1, pendingReviews.length - 1);
    if (pendingReviews[nextIndex]) setActiveReviewId(pendingReviews[nextIndex].id);
  };
  const selectPrevious = () => {
    const previousIndex = Math.max(currentIndex - 1, 0);
    if (pendingReviews[previousIndex]) setActiveReviewId(pendingReviews[previousIndex].id);
  };
  const deferCurrent = () => {
    if (pendingReviews.length <= 1) return;
    const remaining = pendingReviews.filter((review) => review.id !== activeReview.id);
    setDeferredIds((current) => [...current, activeReview.id]);
    setActiveReviewId(remaining[Math.min(currentIndex, remaining.length - 1)].id);
  };

  return (
    <main className="flex-1 bg-[#f5f7f9] pb-12">
      <header className="border-b border-slate-200 bg-white">
        <div className="container mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex flex-wrap items-center gap-3"><p className="text-xl font-semibold tracking-tight text-[#6D43C0]">Binno</p><span className="text-sm text-slate-400">·</span><p className="text-sm font-medium text-slate-700">Perfil da empresa</p></div>
          <div className="flex items-center gap-3"><ExampleBadge /><span className="hidden text-sm text-slate-500 sm:inline">Restaurante exemplo · Centro</span><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2457D6] text-xs font-semibold text-white">MD</span></div>
        </div>
      </header>
      <nav className="border-b border-slate-200 bg-white" aria-label="Navegação do painel">
        <div className="container mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4">
          {tabs.map((tab) => <button key={tab.id} type="button" onClick={() => setActiveView(tab.id)} className={`shrink-0 border-b-2 px-3 py-3 text-sm font-medium transition-colors ${activeView === tab.id ? 'border-[#2457D6] text-[#2457D6]' : 'border-transparent text-slate-500 hover:text-slate-900'}`}>{tab.label}</button>)}
        </div>
      </nav>
      <div className="container mx-auto max-w-7xl px-4 pt-6">

        {activeView === 'overview' && <Overview
          activeReview={activeReview}
          activeIndex={currentIndex}
          pendingCount={pendingReviews.length}
          replyDraft={replyDrafts[activeReview.id]}
          prepared={preparedReviewId === activeReview.id}
          onDraftChange={(value) => setReplyDrafts((current) => ({ ...current, [activeReview.id]: value }))}
          onPrepare={() => setPreparedReviewId(activeReview.id)}
          onNext={selectNext}
          onPrevious={selectPrevious}
          onSelect={setActiveReviewId}
          onDefer={deferCurrent}
          disablePrevious={currentIndex <= 0}
          disableNext={currentIndex >= pendingReviews.length - 1}
          whatsAppPrepared={whatsAppPrepared}
          onPrepareWhatsApp={() => setWhatsAppPrepared(true)}
          onOpen={(view) => setActiveView(view)}
        />}
        {activeView === 'reviews' && <ReviewsView activeReview={activeReview} onSelect={setActiveReviewId} onOpenQueue={() => setActiveView('overview')} />}
        {activeView === 'volume' && <VolumeView />}
        {activeView === 'practices' && <PracticesView onOpen={(view) => setActiveView(view)} />}
        {activeView === 'profile' && <ProfileView onOpenPractices={() => setActiveView('practices')} />}
        {activeView === 'whatsapp' && <WhatsAppView prepared={whatsAppPrepared} onPrepare={() => setWhatsAppPrepared(true)} />}

        <p className="mt-6 text-center text-xs leading-5 text-slate-500">Dados ilustrativos. O Binno não publica respostas sozinho, não atribui avaliações ao QR e só afirma fila, tendências e temas após sincronização oficial completa.</p>
      </div>
    </main>
  );
};

const Overview = ({ activeReview, activeIndex, pendingCount, replyDraft, prepared, onDraftChange, onPrepare, onNext, onPrevious, onSelect, onDefer, disablePrevious, disableNext, whatsAppPrepared, onPrepareWhatsApp, onOpen }: {
  activeReview: DemoReview; activeIndex: number; pendingCount: number; replyDraft: string; prepared: boolean; onDraftChange: (value: string) => void; onPrepare: () => void; onNext: () => void; onPrevious: () => void; onSelect: (id: string) => void; onDefer: () => void; disablePrevious: boolean; disableNext: boolean; whatsAppPrepared: boolean; onPrepareWhatsApp: () => void; onOpen: (view: CockpitView) => void;
}) => (
  <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_330px]">
    <section className="min-w-0 space-y-5">
      <Card className="border-blue-100 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]"><CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex gap-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-lg font-semibold text-red-700">{pendingCount}</span><div><p className="font-semibold text-slate-950">{pendingCount} avaliações esperam sua resposta</p><p className="mt-1 text-sm text-slate-600">Responder com atenção mostra que o negócio valoriza o feedback. Comece por quem teve uma experiência pior.</p></div></div><Button onClick={() => onOpen('reviews')} className="shrink-0 rounded-full bg-[#2457D6] hover:bg-[#1d47b0]">Responder agora</Button></CardContent></Card>

      <ReviewQueueCard review={activeReview} index={activeIndex} total={pendingCount} draft={replyDraft} prepared={prepared} onDraftChange={onDraftChange} onPrepare={onPrepare} onNext={onNext} onPrevious={onPrevious} onSelect={onSelect} onDefer={onDefer} disableNext={disableNext} disablePrevious={disablePrevious} />

      <section aria-labelledby="advisor-reading"><div className="mb-3 flex items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#6D43C0]">Leitura do assessor</p><h2 id="advisor-reading" className="mt-1 text-lg font-semibold text-slate-950">O que está ajudando e o que deixa o negócio mais frágil</h2></div><ExampleBadge /></div><div className="grid gap-4 sm:grid-cols-2"><AdvisorSignalCard icon={TrendingUp} tone="good" label="Está trazendo avaliações boas" title="Prato executivo e atendimento atencioso" items={['Prato executivo foi citado positivamente 9 vezes.', 'Atendimento atencioso apareceu em 18 comentários.']} action="Use esses pontos em fotos e descrição" onClick={() => onOpen('practices')} /><AdvisorSignalCard icon={TrendingDown} tone="risk" label="Deixa o negócio mais frágil" title="Espera e resposta atrasada" items={['Tempo de espera reapareceu em 3 comentários negativos.', `${pendingCount} avaliações ainda não receberam resposta pública.`]} action="Ver evidência e responder" onClick={() => onOpen('reviews')} /></div></section>

      <VolumeSummary />
      <RatingDistribution />
      <div className="grid gap-5 md:grid-cols-2"><QrFunnel /><TopicsCard /></div>
    </section>

    <aside className="space-y-5"><ReputationCard /><WhatsAppCard prepared={whatsAppPrepared} onPrepare={onPrepareWhatsApp} onOpen={() => onOpen('whatsapp')} /><ProfileCompleteness onOpen={() => onOpen('practices')} /><WeeklyChangeCard /></aside>
  </div>
);

const ReviewQueueCard = ({ review, index, total, draft, prepared, onDraftChange, onPrepare, onNext, onPrevious, onSelect, onDefer, disableNext, disablePrevious }: {
  review: DemoReview; index: number; total: number; draft: string; prepared: boolean; onDraftChange: (value: string) => void; onPrepare: () => void; onNext: () => void; onPrevious: () => void; onSelect: (id: string) => void; onDefer: () => void; disableNext: boolean; disablePrevious: boolean;
}) => (
  <Card className="overflow-hidden border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]"><CardContent className="p-0"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4"><div><h2 className="text-lg font-semibold text-slate-950">Fila de respostas</h2><p className="mt-1 text-sm text-slate-500">Uma decisão por vez, com o texto já preparado.</p></div><span className="text-sm text-slate-500">{index + 1} de {total}</span></div><div className="p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-slate-950">{review.name}</p><Stars rating={review.rating} size="medium" /></div><p className="mt-1 text-xs text-slate-500">{review.age} · Tema: {review.theme}</p></div><div className="flex gap-2"><Button variant="outline" size="sm" onClick={onPrevious} disabled={disablePrevious}>Anterior</Button><Button variant="outline" size="sm" onClick={onNext} disabled={disableNext}>Próxima</Button></div></div><blockquote className="mt-5 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">“{review.text}”</blockquote><div className="mt-5 rounded-xl border border-slate-200 bg-white p-4"><div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold text-slate-950">Resposta sugerida</p><span className="text-xs text-slate-500">edite antes de usar</span></div><Textarea value={draft} onChange={(event) => onDraftChange(event.target.value)} className="mt-3 min-h-28 resize-y border-slate-300 leading-6" /><div className="mt-4 flex flex-wrap gap-2"><Button onClick={onPrepare} className="rounded-full bg-[#2457D6] hover:bg-[#1d47b0]"><Check className="mr-2 h-4 w-4" />{prepared ? 'Rascunho preparado' : 'Preparar resposta'}</Button><Button variant="outline" onClick={onDefer}><Clock3 className="mr-2 h-4 w-4" />Pular por agora</Button></div>{prepared && <p className="mt-3 flex items-center gap-2 text-xs leading-5 text-emerald-700"><CheckCircle2 className="h-4 w-4 shrink-0" />Rascunho marcado para sua revisão. Nada foi publicado no Google.</p>}</div><div className="mt-4 flex flex-wrap gap-2">{reviews.map((candidate) => <button key={candidate.id} type="button" onClick={() => onSelect(candidate.id)} className={`rounded-lg border px-3 py-2 text-left text-xs transition ${candidate.id === review.id ? 'border-[#2457D6] bg-blue-50 text-[#2457D6]' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}><span className="block font-semibold">{candidate.name}</span><Stars rating={candidate.rating} /></button>)}</div></div></CardContent></Card>
);

const AdvisorSignalCard = ({ icon: Icon, tone, label, title, items, action, onClick }: { icon: LucideIcon; tone: 'good' | 'risk'; label: string; title: string; items: string[]; action: string; onClick: () => void }) => {
  const styles = tone === 'good' ? 'border-emerald-200 bg-emerald-50/40 text-emerald-700' : 'border-red-200 bg-red-50/40 text-red-700';
  const dot = tone === 'good' ? 'bg-emerald-500' : 'bg-red-500';
  return <Card className={`${styles} shadow-none`}><CardContent className="p-5"><div className="flex gap-3"><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${tone === 'good' ? 'bg-emerald-100' : 'bg-red-100'}`}><Icon className="h-4 w-4" /></span><div><p className="text-[10px] font-semibold uppercase tracking-[0.1em]">{label}</p><h3 className="mt-1 font-semibold text-slate-950">{title}</h3></div></div><ul className="mt-4 space-y-2 text-sm leading-5 text-slate-700">{items.map((item) => <li key={item} className="flex gap-2"><span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />{item}</li>)}</ul><button type="button" onClick={onClick} className="mt-4 text-sm font-medium text-[#2457D6]">{action} <ChevronRight className="inline h-4 w-4" /></button></CardContent></Card>;
};

const volumeTrend = [{ week: 1, reviews: 10 }, { week: 2, reviews: 8 }, { week: 3, reviews: 11 }, { week: 4, reviews: 9 }, { week: 5, reviews: 10 }, { week: 6, reviews: 9 }, { week: 7, reviews: 8 }, { week: 8, reviews: 7 }, { week: 9, reviews: 6 }, { week: 10, reviews: 5 }, { week: 11, reviews: 4 }, { week: 12, reviews: 3 }];

const VolumeSummary = () => <Card className="border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]"><CardContent className="p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-semibold text-slate-950">Volume de avaliações</h2><p className="mt-1 text-sm text-slate-500">12 semanas · comparação com a média anterior</p></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">Dado demonstrativo</span></div><div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center"><div className="h-12 w-40 shrink-0" aria-label="Tendência ilustrativa de queda"><ResponsiveContainer width="100%" height="100%"><LineChart data={volumeTrend} margin={{ top: 4, right: 3, bottom: 4, left: 3 }}><Line type="monotone" dataKey="reviews" stroke="#2457D6" strokeWidth={3} dot={false} isAnimationActive={false} /></LineChart></ResponsiveContainer></div><p className="text-lg font-semibold text-slate-950">3 <span className="text-sm font-normal text-slate-600">avaliações nesta semana · média de 10</span></p></div><div className="mt-5 flex gap-3 rounded-lg border border-red-100 bg-red-50 p-4 text-sm leading-5 text-red-950"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-700" /><p><strong>Queda de 70%</strong> em relação à média das últimas oito semanas. É um sinal para investigar; não prova a causa sozinho.</p></div></CardContent></Card>;

const RatingDistribution = () => {
  const rows = [{ rating: 5, current: '54%', previous: '78%', risk: true }, { rating: 4, current: '18%', previous: '12%' }, { rating: 3, current: '7%', previous: '6%' }, { rating: 2, current: '12%', previous: '4%', risk: true }, { rating: 1, current: '9%', previous: '4%', risk: true }];
  return <Card className="border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]"><CardContent className="p-5"><div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-semibold text-slate-950">Cada nota separada</h2><p className="mt-1 text-sm text-slate-500">Mostra onde a composição da reputação mudou.</p></div><ExampleBadge /></div><div className="mt-5 divide-y divide-slate-200 rounded-lg border border-slate-200">{rows.map((row) => <div key={row.rating} className="grid grid-cols-[52px_minmax(0,1fr)_75px] items-center gap-3 p-3"><span className="text-sm font-semibold text-slate-800">{row.rating} <Star className="inline h-3.5 w-3.5 fill-amber-400 text-amber-400" /></span><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${row.risk ? 'bg-red-500' : 'bg-amber-400'}`} style={{ width: row.current }} /></div><span className="text-right text-xs text-slate-500"><strong className="text-slate-900">{row.current}</strong> antes {row.previous}</span></div>)}</div><div className="mt-4 flex gap-3 rounded-lg border border-red-100 bg-red-50 p-4 text-sm leading-5 text-red-950"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-700" /><p>As cinco estrelas caíram e as notas 1–2 subiram neste cenário. O Radar mostra os temas antes de sugerir uma ação.</p></div></CardContent></Card>;
};

const QrFunnel = () => <Card className="border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]"><CardContent className="p-5"><div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-semibold text-slate-950">Do QR ao Google</h2><p className="mt-1 text-sm text-slate-500">Últimos 30 dias</p></div><QrCode className="h-5 w-5 text-[#2457D6]" /></div><dl className="mt-5 space-y-3"><MetricRow label="QR aberto" value="142" /><MetricRow label="Clicou no Google" value="89" /></dl><p className="mt-4 text-xs leading-5 text-slate-500">Abertura e clique são medidos. O Binno não conclui que alguém publicou uma avaliação a partir do QR.</p></CardContent></Card>;

const TopicsCard = () => <Card className="border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]"><CardContent className="p-5"><div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-semibold text-slate-950">Temas mais citados</h2><p className="mt-1 text-sm text-slate-500">Últimos 30 dias</p></div><Sparkles className="h-5 w-5 text-[#6D43C0]" /></div><div className="mt-5 flex flex-wrap gap-2"><Topic label="atendimento · 18" tone="good" /><Topic label="comida · 22" tone="good" /><Topic label="espera · 12" tone="risk" /><Topic label="limpeza · 9" tone="risk" /></div><div className="mt-5 flex gap-3 rounded-lg border border-amber-100 bg-amber-50 p-4 text-sm leading-5 text-amber-950"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" /><p>Espera e limpeza aparecem juntas em seis comentários neste cenário. O gestor vê a hipótese e as evidências, não uma certeza inventada.</p></div></CardContent></Card>;

const ReputationCard = () => <Card className="border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]"><CardContent className="p-5"><div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-semibold text-slate-950">Reputação no Google</h2><p className="mt-1 text-sm text-slate-500">Últimos 90 dias</p></div><ExampleBadge /></div><div className="mt-5 flex items-end gap-3"><strong className="text-5xl font-medium tracking-tight text-slate-950">4,6</strong><div className="pb-1"><Stars rating={4} size="medium" /><p className="mt-1 text-xs text-slate-500">128 avaliações no total</p></div></div><div className="mt-5 divide-y divide-slate-200 rounded-lg border border-slate-200"><MetricRow label="Tempo médio de resposta" value="18 h" /><MetricRow label="Novas avaliações (30 dias)" value="+12" positive /></div></CardContent></Card>;

const WhatsAppCard = ({ prepared, onPrepare, onOpen }: { prepared: boolean; onPrepare: () => void; onOpen: () => void }) => <Card className="border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]"><CardContent className="p-5"><div className="flex items-start justify-between gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50"><MessageCircle className="h-4 w-4 text-emerald-700" /></span><span className={`rounded-full px-2 py-1 text-[10px] font-medium ${prepared ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{prepared ? 'Agenda local pronta' : 'Sem conexão'}</span></div><h2 className="mt-4 font-semibold text-slate-950">Resumo no WhatsApp</h2><p className="mt-1 text-sm leading-6 text-slate-500">Uma leitura curta da mudança, prioridade e ação recomendada.</p><div className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm leading-5 text-emerald-950"><strong className="block">Binno · Demonstração</strong>Há 3 respostas para revisar e a espera reapareceu em comentários recentes.</div><Button variant="link" onClick={() => { onPrepare(); onOpen(); }} className="mt-3 h-auto p-0 text-[#2457D6]">{prepared ? 'Gerenciar programação' : 'Preparar programação local'} <ChevronRight className="ml-1 h-4 w-4" /></Button><p className="mt-3 text-xs leading-5 text-slate-500">Não envia mensagens. Provedor, consentimento e custo ainda precisam de decisão.</p></CardContent></Card>;

const ProfileCompleteness = ({ onOpen }: { onOpen: () => void }) => <Card className="border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]"><CardContent className="p-5"><div className="flex items-center justify-between gap-3"><h2 className="text-lg font-semibold text-slate-950">Prontidão do perfil</h2><span className="text-sm font-medium text-slate-500">68%</span></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full w-[68%] rounded-full bg-[#2457D6]" /></div><p className="mt-4 text-sm leading-6 text-slate-600">Falta confirmar horário especial, fotos recentes e a descrição do negócio.</p><Button variant="link" onClick={onOpen} className="mt-3 h-auto p-0 text-[#2457D6]">Ver plano de melhoria <ChevronRight className="ml-1 h-4 w-4" /></Button></CardContent></Card>;

const WeeklyChangeCard = () => <Card className="border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]"><CardContent className="p-5"><div className="flex gap-3"><TrendingUp className="h-5 w-5 text-[#2457D6]" /><div><h2 className="font-semibold text-slate-950">O que mudou na semana</h2><ul className="mt-3 space-y-2 text-sm leading-5 text-slate-600"><li>3 novas avaliações chegaram.</li><li>A espera voltou a ser citada.</li><li>Prato executivo recebeu elogios.</li></ul></div></div></CardContent></Card>;

const MetricRow = ({ label, value, positive = false }: { label: string; value: string; positive?: boolean }) => <div className="flex items-center justify-between gap-3 p-3"><dt className="text-sm text-slate-600">{label}</dt><dd className={`text-sm font-semibold ${positive ? 'text-emerald-700' : 'text-slate-950'}`}>{value}</dd></div>;

const Topic = ({ label, tone }: { label: string; tone: 'good' | 'risk' }) => <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${tone === 'good' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'}`}>{label}</span>;

const ReviewsView = ({ activeReview, onSelect, onOpenQueue }: { activeReview: DemoReview; onSelect: (id: string) => void; onOpenQueue: () => void }) => <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_330px]"><section className="space-y-5"><div><p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#6D43C0]">Avaliações</p><h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">Fila assistida de respostas</h1><p className="mt-2 text-sm text-slate-600">A sugestão é um rascunho. O gestor edita, decide e só então publica no Google.</p></div><Card className="border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]"><CardContent className="p-0"><div className="border-b border-slate-200 px-5 py-4"><h2 className="font-semibold text-slate-950">Avaliações que merecem leitura</h2></div><div className="divide-y divide-slate-200">{reviews.map((review) => <button type="button" key={review.id} onClick={() => onSelect(review.id)} className={`flex w-full gap-3 p-4 text-left transition ${review.id === activeReview.id ? 'bg-blue-50/60' : 'hover:bg-slate-50'}`}><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${review.rating <= 3 ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>{review.initials}</span><span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2"><strong className="text-sm text-slate-950">{review.name}</strong><Stars rating={review.rating} /><span className="text-xs text-slate-500">{review.age}</span></span><span className="mt-1 block text-sm leading-5 text-slate-600">“{review.text}”</span><span className="mt-2 block text-xs font-medium text-[#6D43C0]">{review.theme}</span></span><ChevronRight className="mt-3 h-4 w-4 shrink-0 text-slate-400" /></button>)}</div></CardContent></Card></section><aside className="space-y-5"><Card className="border-blue-100 bg-blue-50/60 shadow-none"><CardContent className="p-5"><MessageSquareText className="h-5 w-5 text-[#2457D6]" /><h2 className="mt-3 font-semibold text-slate-950">Comece pelo impacto</h2><p className="mt-2 text-sm leading-6 text-slate-600">Notas baixas recentes entram primeiro; avaliações positivas podem receber uma resposta mais curta e contextual.</p><Button onClick={onOpenQueue} className="mt-4 w-full rounded-full bg-[#2457D6] hover:bg-[#1d47b0]">Abrir resposta sugerida</Button></CardContent></Card><Card className="border-amber-200 bg-amber-50/60 shadow-none"><CardContent className="p-5"><AlertTriangle className="h-5 w-5 text-amber-800" /><p className="mt-3 text-sm leading-6 text-amber-950">Só uma sincronização oficial completa permite afirmar a fila real de avaliações sem resposta.</p></CardContent></Card></aside></div>;

const VolumeView = () => <div className="space-y-5"><div><p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#6D43C0]">Volume</p><h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">O ritmo de avaliações mudou?</h1><p className="mt-2 text-sm text-slate-600">Compare períodos para levantar perguntas, não para inventar causas.</p></div><div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_330px]"><section className="space-y-5"><VolumeSummary /><RatingDistribution /><div className="grid gap-5 md:grid-cols-2"><QrFunnel /><TopicsCard /></div></section><aside className="space-y-5"><Card className="border-blue-100 bg-blue-50/60 shadow-none"><CardContent className="p-5"><FileText className="h-5 w-5 text-[#2457D6]" /><h2 className="mt-3 font-semibold text-slate-950">Como ler este painel</h2><p className="mt-2 text-sm leading-6 text-slate-600">Queda de volume, mudança de nota e temas recorrentes são sinais para investigar operação, perfil e experiência do cliente.</p></CardContent></Card><ReputationCard /></aside></div></div>;

const PracticesView = ({ onOpen }: { onOpen: (view: CockpitView) => void }) => {
  const tasks = [{ title: 'Responder as avaliações pendentes', impact: 'alto', time: '10 min', action: 'Responder', view: 'reviews' as CockpitView }, { title: 'Publicar uma foto nova por semana', impact: 'médio', time: '5 min', action: 'Planejar', view: 'profile' as CockpitView }, { title: 'Confirmar horário de funcionamento', impact: 'alto', time: '2 min', action: 'Conferir', view: 'profile' as CockpitView }];
  const sections = [{ title: 'Avaliações', items: ['Pedir avaliação a todos os clientes, sem incentivo e sem filtrar nota.', 'Responder quando houver informação relevante e manter o tom humano.', 'Nunca comprar avaliações ou pedir que removam uma crítica.'] }, { title: 'Perfil completo', items: ['Confirmar categoria, horário e atributos do negócio.', 'Descrever serviços de modo claro e factual.', 'Manter endereço, telefone e área de atendimento corretos.'] }, { title: 'Conteúdo e constância', items: ['Adicionar fotos atuais que mostrem a experiência real.', 'Atualizar horários especiais antes de feriados.', 'Usar o relatório semanal para identificar o que merece revisão.'] }];
  return <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_330px]"><section className="space-y-5"><div><p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#6D43C0]">Boas práticas</p><h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">Plano de melhoria do Perfil Google</h1><p className="mt-2 text-sm text-slate-600">Pequenas ações que o gestor entende, priorizadas pelo benefício provável e pelo tempo necessário.</p></div><Card className="border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]"><CardContent className="p-5"><div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-semibold text-slate-950">Prontidão do perfil</h2><p className="mt-1 text-sm text-slate-500">Leitura demonstrativa · 6 de 12 itens</p></div><strong className="text-4xl font-semibold text-slate-950">68<span className="text-base font-normal text-slate-500">/100</span></strong></div><div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full w-[68%] rounded-full bg-[#2457D6]" /></div></CardContent></Card><Card className="border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]"><CardContent className="p-5"><div className="flex items-end justify-between gap-3"><div><h2 className="text-lg font-semibold text-slate-950">O que fazer agora</h2><p className="mt-1 text-sm text-slate-500">Priorizado por impacto e tempo.</p></div><ExampleBadge /></div><div className="mt-5 space-y-3">{tasks.map((task) => <div key={task.title} className="flex flex-col gap-3 rounded-xl bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold text-slate-950">{task.title}</p><p className="mt-1 text-xs text-slate-500"><span className={`mr-2 rounded-full px-2 py-0.5 ${task.impact === 'alto' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-800'}`}>impacto {task.impact}</span>{task.time}</p></div><Button onClick={() => onOpen(task.view)} size="sm" className="rounded-full bg-[#2457D6] hover:bg-[#1d47b0]">{task.action}</Button></div>)}</div></CardContent></Card>{sections.map((section) => <Card key={section.title} className="border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]"><CardContent className="p-5"><h2 className="text-lg font-semibold text-slate-950">{section.title}</h2><div className="mt-4 divide-y divide-slate-200 rounded-lg border border-slate-200">{section.items.map((item) => <div key={item} className="flex gap-3 p-3"><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border border-slate-300 bg-white" /><p className="text-sm leading-5 text-slate-700">{item}</p></div>)}</div></CardContent></Card>)}</section><aside className="space-y-5"><Card className="border-blue-100 bg-blue-50/60 shadow-none"><CardContent className="p-5"><Lightbulb className="h-5 w-5 text-[#2457D6]" /><h2 className="mt-3 font-semibold text-slate-950">Por que isto importa</h2><p className="mt-2 text-sm leading-6 text-slate-600">Informações completas e precisas ajudam as pessoas a entender o negócio. Respostas úteis e fotos atuais reforçam confiança — sem prometer posição no ranking.</p></CardContent></Card><Card className="border-red-100 bg-red-50/60 shadow-none"><CardContent className="p-5"><AlertTriangle className="h-5 w-5 text-red-700" /><h2 className="mt-3 font-semibold text-slate-950">O que não fazer</h2><ul className="mt-3 space-y-2 text-sm leading-5 text-slate-700"><li>Comprar avaliações ou oferecer recompensa.</li><li>Pedir nota específica ou filtrar quem pode avaliar.</li><li>Copiar a mesma resposta para todos.</li></ul></CardContent></Card></aside></div>;
};

const ProfileView = ({ onOpenPractices }: { onOpenPractices: () => void }) => <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_330px]"><section className="space-y-5"><div><p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#6D43C0]">Perfil no Google</p><h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">O que o cliente encontra antes de chegar</h1><p className="mt-2 text-sm text-slate-600">Esta área aponta informações para conferir; a edição real depende da conexão oficial ao Perfil da Empresa.</p></div><Card className="border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]"><CardContent className="p-5"><h2 className="text-lg font-semibold text-slate-950">Checklist de completude</h2><div className="mt-5 divide-y divide-slate-200 rounded-lg border border-slate-200"><ProfileRow icon={CheckCircle2} title="Categoria e contacto" description="Informações consistentes para a pessoa encontrar e contactar o negócio." state="Conferir" /><ProfileRow icon={Clock3} title="Horários e datas especiais" description="Evita chegar e encontrar o negócio fechado por informação antiga." state="Pendente" attention /><ProfileRow icon={Camera} title="Fotos recentes" description="Mostram a experiência atual antes da visita." state="Revisar" attention /><ProfileRow icon={FileText} title="Descrição e atributos" description="Ajuda a explicar oferta, acessibilidade e serviços." state="Conferir" /></div></CardContent></Card></section><aside className="space-y-5"><Card className="border-amber-200 bg-amber-50/60 shadow-none"><CardContent className="p-5"><AlertTriangle className="h-5 w-5 text-amber-800" /><h2 className="mt-3 font-semibold text-slate-950">Conexão oficial necessária</h2><p className="mt-2 text-sm leading-6 text-slate-700">O Binno não edita nem afirma a completude real do perfil antes da autorização do dono no Google.</p><Button onClick={onOpenPractices} variant="link" className="mt-3 h-auto p-0 text-[#2457D6]">Ver plano de melhoria <ChevronRight className="ml-1 h-4 w-4" /></Button></CardContent></Card><ReputationCard /></aside></div>;

const ProfileRow = ({ icon: Icon, title, description, state, attention = false }: { icon: LucideIcon; title: string; description: string; state: string; attention?: boolean }) => <div className="flex gap-3 p-4"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50"><Icon className="h-4 w-4 text-[#2457D6]" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold text-slate-950">{title}</p><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${attention ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-700'}`}>{state}</span></div><p className="mt-1 text-sm leading-5 text-slate-600">{description}</p></div></div>;

const WhatsAppView = ({ prepared, onPrepare }: { prepared: boolean; onPrepare: () => void }) => <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_330px]"><section className="space-y-5"><div><p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#6D43C0]">WhatsApp</p><h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">Resumo que cabe na rotina do gestor</h1><p className="mt-2 text-sm text-slate-600">A proposta é uma mensagem curta: mudança, prioridade e próxima ação.</p></div><Card className="border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]"><CardContent className="p-6"><div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50"><MessageCircle className="h-5 w-5 text-emerald-700" /></span><div><h2 className="text-xl font-semibold text-slate-950">Configurar resumo semanal</h2><p className="mt-1 text-sm leading-6 text-slate-600">Escolha a frequência nesta demonstração. O envio real só existe depois de provedor, consentimento e política de custo aprovados.</p></div></div><div className="mt-6 grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium text-slate-700">Frequência<select className="mt-2 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"><option>Toda segunda-feira</option><option>Toda sexta-feira</option></select></label><label className="text-sm font-medium text-slate-700">Horário<input type="time" defaultValue="09:00" className="mt-2 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm" /></label></div><div className="mt-5 rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm leading-6 text-emerald-950"><strong className="block">Binno · Demonstração</strong>Esta semana: 3 avaliações precisam de resposta, a espera reapareceu em comentários e o prato executivo segue entre os elogios.</div><Button onClick={onPrepare} className="mt-5 rounded-full bg-[#2457D6] hover:bg-[#1d47b0]">{prepared ? 'Atualizar programação local' : 'Preparar programação local'}</Button>{prepared && <p className="mt-3 flex items-center gap-2 text-xs text-emerald-700"><CheckCircle2 className="h-4 w-4" />Agenda local preparada. Nenhuma mensagem foi enviada.</p>}</CardContent></Card></section><aside className="space-y-5"><Card className="border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]"><CardContent className="p-5"><h2 className="font-semibold text-slate-950">Histórico de mensagens</h2><div className="mt-4 flex gap-3 rounded-lg bg-slate-50 p-4"><Clock3 className="h-5 w-5 shrink-0 text-slate-500" /><p className="text-sm leading-6 text-slate-600">Nenhuma mensagem enviada. O histórico só começa após uma conexão real e consentida.</p></div></CardContent></Card><Card className="border-amber-200 bg-amber-50/60 shadow-none"><CardContent className="p-5"><MessageCircle className="h-5 w-5 text-amber-800" /><h2 className="mt-3 font-semibold text-slate-950">O que ainda falta</h2><p className="mt-2 text-sm leading-6 text-slate-700">Escolher o provedor, registrar consentimento, configurar número e aprovar o teto de custo.</p></CardContent></Card></aside></div>;

export default AdvisorCockpitDemo;
