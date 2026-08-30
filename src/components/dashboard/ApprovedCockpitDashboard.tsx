import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Copy, ExternalLink, Info, Lightbulb, MessageCircle, QrCode, Sparkles, Star } from 'lucide-react';
import { Line, LineChart, ResponsiveContainer } from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import type { ExperimentalApifySnapshot, ExperimentalObservedReview } from '@/lib/experimentalApifySnapshot';
import { useOwnerTranslation } from '@/i18n/owner/useOwnerTranslation';
import { useGoogleBusinessReviewQueue } from '@/hooks/useGoogleBusinessReviewQueue';
import { useReviewFunnelMetrics, type ReviewFunnelMetrics } from '@/hooks/useReviewFunnelMetrics';
import { buildReplySuggestions } from '@/lib/replySuggestions';
import { LocalWhatsAppState, useLocalWhatsApp } from '@/hooks/useLocalWhatsApp';
import { WhatsAppNotificationWorkspace } from '@/components/dashboard/WhatsAppNotificationWorkspace';
import { supabase } from '@/integrations/supabase/client';
import { getAdvisorObservedResult, markAdvisorAction } from '@/lib/advisorPilot';
import { getAdvisorReading } from '@/lib/advisorReading';
import PendingCommentsBanner from '@/components/dashboard/PendingCommentsBanner';
import { sampleWasTruncated } from '@/lib/reputationSnapshotReading';

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
const integer = new Intl.NumberFormat();
const decimal = new Intl.NumberFormat(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
// Âncoras que substituem as antigas abas. Os cartões que antes trocavam de
// aba (fila e WhatsApp) agora levam a estes ids por link nativo
// (href="#..."), sem estado de aba nem JavaScript para funcionar.
const QUEUE_ANCHOR_ID = 'fila-de-respostas';
const QR_ANCHOR_ID = 'qr-e-temas';
const WHATSAPP_ANCHOR_ID = 'configuracao-whatsapp';
const RADAR_ANCHOR_ID = 'radar-do-binno';
const VOLUME_ANCHOR_ID = 'volume-de-avaliacoes';
const RATINGS_ANCHOR_ID = 'cada-nota-separada';

// Índice do celular. A ordem aqui repete a ordem da página e nunca a
// reordena: cada atalho leva a um módulo que continua exatamente onde o
// contrato mandou. Nada é escondido, fundido nem deslocado; no ecrã grande
// o índice não existe, porque lá a página inteira já cabe à vista.
const MOBILE_SECTIONS = [
  { id: RADAR_ANCHOR_ID, label: 'Radar' },
  { id: QUEUE_ANCHOR_ID, label: 'Fila' },
  { id: VOLUME_ANCHOR_ID, label: 'Volume' },
  { id: RATINGS_ANCHOR_ID, label: 'Notas' },
  { id: QR_ANCHOR_ID, label: 'QR e temas' },
  { id: WHATSAPP_ANCHOR_ID, label: 'WhatsApp' },
] as const;

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

/**
 * Contrato de produto, linha 30: amostra nunca pode aparecer como dado
 * oficial, completo ou real sem estar identificada.
 *
 * No piloto Apify a distribuição por nota, o tempo médio de resposta, as
 * avaliações dos últimos 30 dias e os temas são calculados sobre a amostra
 * coletada. Um negócio com 400 avaliações mostrava a distribuição de 50 sem
 * nada dizendo isso, oito vezes menor que a realidade.
 *
 * A etiqueta aparece exatamente quando houve corte, e não sempre que a leitura
 * veio do Apify. A coleta pede no máximo 50 e recebe o que existir: um negócio
 * com 20 avaliações recebe as 20, e aí a leitura está completa. Chamar isso de
 * amostra subestimaria, na frente de um cliente, um dado que está inteiro. Por
 * isso a condição é a mesma que decide o histórico semanal, e vem da mesma
 * função: `sampleWasTruncated`.
 *
 * A nota e o total de avaliações nunca levam a etiqueta: mesmo vindos do
 * Apify eles são os números do negócio inteiro, lidos do próprio perfil.
 *
 * A etiqueta é aditiva por exigência do contrato: um rodapé discreto dentro do
 * cartão que já existe, sem redesenhar, fundir, esconder ou deslocar módulo
 * nenhum.
 */
const SampleSourceNote = ({ snapshot }: { snapshot: ExperimentalApifySnapshot }) => {
  const { t } = useOwnerTranslation();
  if (!sampleWasTruncated(snapshot)) return null;
  return <p className="mt-4 text-xs leading-4 text-slate-500">{t('dashboard.cockpit.layout.sampleSourceNote', { sample: snapshot.sample.reviewCount })}</p>;
};

/**
 * Índice do celular, só abaixo de `lg`. É atalho, não navegação: rola até um
 * módulo que continua na página, na mesma ordem. Links nativos, sem estado e
 * sem JavaScript, como as âncoras que já substituíram as abas.
 */
const MobileIndex = () => (
  <nav
    aria-label="Ir para uma seção"
    className="sticky top-0 z-30 -mx-4 border-b border-slate-200 bg-white/95 backdrop-blur lg:hidden"
  >
    <ul className="flex gap-1 overflow-x-auto px-4 py-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {MOBILE_SECTIONS.map((section) => (
        <li key={section.id}>
          <a
            href={`#${section.id}`}
            className="flex min-h-11 items-center whitespace-nowrap rounded-full px-3 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-950"
          >
            {section.label}
          </a>
        </li>
      ))}
    </ul>
  </nav>
);

/**
 * Faixa-resumo do celular, só abaixo de `lg`. Adiciona, nunca substitui: os
 * módulos abaixo continuam inteiros e na ordem aprovada.
 *
 * A fila de respostas vive apenas no navegador que fez a coleta, por contrato
 * (linhas 39 a 41). Num segundo aparelho ela não existe, e a faixa diz isso em
 * vez de mostrar zero, que seria afirmar "nada a responder" sem saber.
 */
const MobileSummary = ({ snapshot, queue, queueOnThisDevice }: { snapshot: ExperimentalApifySnapshot; queue: QueueReview[]; queueOnThisDevice: boolean }) => {
  const waiting = queue.filter((review) => !review.responseObserved).length;
  const next = queue.find((review) => !review.responseObserved);
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 lg:hidden">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="text-2xl font-medium tracking-tight text-slate-950">{decimal.format(snapshot.business.googleRating)}</span>
        <Stars rating={Math.round(snapshot.business.googleRating)} />
        <span className="text-sm text-slate-600">{integer.format(snapshot.business.googleReviewCount)} avaliações</span>
      </div>
      {!queueOnThisDevice ? (
        <p className="mt-2 text-sm leading-5 text-slate-600">A fila de respostas está no aparelho onde a coleta foi feita. Os números acima valem em qualquer aparelho.</p>
      ) : waiting ? (
        <p className="mt-2 text-sm leading-5 text-slate-900">
          <strong className="font-semibold">{waiting}</strong> {waiting === 1 ? 'avaliação espera' : 'avaliações esperam'} resposta
          {next?.reviewerName ? <>. A seguir, {next.reviewerName}</> : null}.
        </p>
      ) : (
        <p className="mt-2 text-sm leading-5 text-slate-600">Nenhuma avaliação esperando resposta.</p>
      )}
      {queueOnThisDevice && waiting ? (
        <a href={`#${QUEUE_ANCHOR_ID}`} className="mt-3 inline-flex min-h-11 items-center text-sm font-medium text-[#2457D6] hover:underline">
          Ir para a fila<ChevronRight className="ml-1 h-4 w-4" />
        </a>
      ) : null}
    </section>
  );
};

const ApprovedCockpitDashboard = ({ snapshot, userId, demo = false, demoFunnel }: { snapshot: ExperimentalApifySnapshot; userId?: string; demo?: boolean; demoFunnel?: ReviewFunnelMetrics }) => {
  const official = useGoogleBusinessReviewQueue(import.meta.env.VITE_GOOGLE_BUSINESS_OAUTH_ENABLED === 'true' ? userId : undefined);
  const liveFunnel = useReviewFunnelMetrics(userId);
  const funnel = demoFunnel ? { ...liveFunnel, data: demoFunnel } : liveFunnel;
  const liveWhatsApp = useLocalWhatsApp();
  const whatsApp: LocalWhatsAppState = demo
    ? { status: 'unavailable', session: null, detail: null, refresh: async () => {} }
    : liveWhatsApp;
  const [onboardingPhone, setOnboardingPhone] = useState('');
  const [advisorActionVersion, setAdvisorActionVersion] = useState(0);
  useEffect(() => {
    if (!userId) return;
    let active = true;
    const loadPhone = async () => {
      try {
        const { data } = await supabase.from('profiles').select('phone').eq('id', userId).maybeSingle();
        if (active) setOnboardingPhone(data?.phone || '');
      } catch {
        if (active) setOnboardingPhone('');
      }
    };
    void loadPhone();
    return () => { active = false; };
  }, [userId]);
  const observed = (snapshot.sample.observedReviews?.items || []).map(normalizeObserved);
  // Fila ausente e fila vazia não são a mesma coisa. Sem o retrato do
  // navegador e sem a conexão oficial, este aparelho não tem como saber o que
  // está por responder, e a faixa do celular precisa dizer isso.
  const queueOnThisDevice = official.syncComplete || snapshot.sample.observedReviews !== undefined;
  const queue: QueueReview[] = official.syncComplete
    ? official.reviews.map((review) => ({ id: review.id, rating: review.rating, comment: review.comment || '', publishedAt: review.review_updated_at, reviewerName: review.reviewer_name || undefined, responseObserved: Boolean(review.reply_text) }))
    : observed;
  const history = useMemo(() => snapshot.sample.insights?.history?.weeks || [], [snapshot.sample.insights?.history?.weeks]);

  // Uma só tela, sem seletor de abas. A ordem segue a decisão de 30/08/2026:
  // o que tem prazo primeiro (comentários pendentes, depois a fila de
  // respostas), o que é informativo depois (volume, notas, QR e temas, mais
  // a coluna lateral já fixada pelo contrato) e o que é configuração por
  // último (WhatsApp). A antiga aba "Avaliações" não vira uma seção própria
  // porque já era, byte a byte, a mesma <ResponseQueue> que a Visão geral
  // sempre mostrou; a aba só duplicava o que já estava na tela.
  return <div className="space-y-5">
    <MobileIndex />
    <MobileSummary snapshot={snapshot} queue={queue} queueOnThisDevice={queueOnThisDevice} />
    <div id={RADAR_ANCHOR_ID} className="scroll-mt-16 lg:scroll-mt-4"><RadarNow snapshot={snapshot} /></div>
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <section className="min-w-0 space-y-5">
        {!demo && <PendingCommentsBanner userId={userId} />}
        <div id={QUEUE_ANCHOR_ID} className="scroll-mt-16 lg:scroll-mt-4"><ResponseQueue reviews={queue} snapshot={snapshot} demo={demo} /></div>
        <div id={VOLUME_ANCHOR_ID} className="scroll-mt-16 lg:scroll-mt-4"><VolumeCard weeks={history} /></div>
        <div id={RATINGS_ANCHOR_ID} className="scroll-mt-16 lg:scroll-mt-4"><RatingTrends weeks={history} snapshot={snapshot} /></div>
        <div id={QR_ANCHOR_ID} className="grid scroll-mt-16 gap-5 md:grid-cols-2 lg:scroll-mt-4"><QrCard funnel={funnel.data} /><TopicsCard snapshot={snapshot} /></div>
      </section>
      <aside className="space-y-5">
        <TodayPlan snapshot={snapshot} onMarked={() => setAdvisorActionVersion((current) => current + 1)} />
        <ReputationCard snapshot={snapshot} />
        <WhatsAppCard localWhatsApp={whatsApp} />
        <DailyPractice snapshot={snapshot} />
        {demo ? <ProfileCompleteness connected={official.syncComplete} demo /> : <ProfileCompleteness connected={official.syncComplete} />}
        <WeeklyChange weeks={history} />
        <ObservedResult snapshot={snapshot} version={advisorActionVersion} />
      </aside>
    </div>
    <div id={WHATSAPP_ANCHOR_ID} className="scroll-mt-16 lg:scroll-mt-4">
      <WhatsAppNotificationWorkspace localWhatsApp={whatsApp} onboardingPhone={onboardingPhone} demoPhone={demo ? '+351 911 000 000' : undefined} demo={demo} />
    </div>
  </div>;
};

const RadarNow = ({ snapshot }: { snapshot: ExperimentalApifySnapshot }) => {
  const { t } = useOwnerTranslation();
  const reading = getAdvisorReading(snapshot);
  const topic = reading.kind === 'alert' || reading.kind === 'strength' ? t(`dashboard.cockpit.topicLabels.${reading.topic}`) : null;
  const urgent = reading.kind === 'alert';
  const content = reading.kind === 'alert'
    ? <><p className="mt-1 text-sm leading-5 text-slate-700">{t('dashboard.advisorPilot.alertTitle')}</p><p className="mt-1 text-sm leading-5 text-slate-600">{t('dashboard.advisorPilot.alertBody', { low: reading.lowRatingCount, topic, mentions: reading.mentions })}</p></>
    : reading.kind === 'opportunity'
      ? <><p className="mt-1 text-sm font-medium text-slate-800">{t('dashboard.advisorPilot.opportunityTitle')}</p><p className="mt-1 text-sm leading-5 text-slate-600">{t('dashboard.advisorPilot.opportunityBody', { phrase: reading.phrase, mentions: reading.mentions })}</p></>
      : reading.kind === 'strength'
        ? <><p className="mt-1 text-sm font-medium text-slate-800">{t('dashboard.advisorPilot.opportunityTitle')}</p><p className="mt-1 text-sm leading-5 text-slate-600">{t('dashboard.advisorPilot.strengthBody', { topic, mentions: reading.mentions })}</p></>
        : <><p className="mt-1 text-sm font-medium text-slate-800">{t('dashboard.advisorPilot.monitorTitle')}</p><p className="mt-1 text-sm leading-5 text-slate-600">{t('dashboard.advisorPilot.monitorBody')}</p></>;
  return <Card className={`shadow-[0_1px_3px_rgba(15,23,42,0.08)] ${urgent ? 'border-red-200 bg-red-50/60' : 'border-violet-200 bg-violet-50/50'}`}><CardContent className="flex items-start gap-3 p-4"><span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${urgent ? 'bg-red-100 text-red-700' : 'bg-violet-100 text-violet-800'}`}>{urgent ? <AlertTriangle className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}</span><div><p className="text-sm font-semibold text-slate-950">{t('dashboard.advisorPilot.radarTitle')}</p>{content}</div></CardContent></Card>;
};

const TodayPlan = ({ snapshot, onMarked }: { snapshot: ExperimentalApifySnapshot; onMarked: () => void }) => {
  const { t } = useOwnerTranslation();
  const reading = getAdvisorReading(snapshot);
  const topic = reading.kind === 'alert' || reading.kind === 'strength' ? t(`dashboard.cockpit.topicLabels.${reading.topic}`) : null;
  const mark = () => {
    if (reading.kind !== 'alert') return;
    const alert = snapshot.sample.advisor?.alert;
    if (!alert) return;
    markAdvisorAction(snapshot, alert);
    onMarked();
  };
  const body = reading.kind === 'alert'
    ? t('dashboard.advisorPilot.planBody', { topic })
    : reading.kind === 'opportunity'
      ? t('dashboard.advisorPilot.opportunityAction')
      : reading.kind === 'strength'
        ? t('dashboard.advisorPilot.strengthAction', { topic })
        : t('dashboard.advisorPilot.monitorAction');
  return <Card className="border-violet-200 bg-violet-50/40 shadow-[0_1px_3px_rgba(15,23,42,0.08)]"><CardContent className="p-5"><div className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-[#6D43C0]" /><h2 className="font-semibold text-slate-950">{t('dashboard.advisorPilot.planTitle')}</h2></div><p className="mt-4 text-sm font-medium leading-5 text-slate-900">{body}</p>{reading.kind === 'alert' ? <Button onClick={mark} className="mt-4 rounded-full bg-[#2457D6] hover:bg-[#1d47b0]"><CheckCircle2 className="mr-2 h-4 w-4" />{t('dashboard.advisorPilot.markDone')}</Button> : <Button asChild variant="outline" className="mt-4"><a href={`#${QUEUE_ANCHOR_ID}`}>{t('dashboard.advisorPilot.reviewEvidence')}</a></Button>}</CardContent></Card>;
};

const ResponseQueue = ({ reviews, snapshot, demo = false }: { reviews: QueueReview[]; snapshot: ExperimentalApifySnapshot; demo?: boolean }) => {
  const { t, i18n } = useOwnerTranslation();
  const [selectedId, setSelectedId] = useState<string | null>(reviews[0]?.id || null);
  const [editing, setEditing] = useState(false);
  const [actions, setActions] = useState<Record<string, ActionState>>(readActions);
  const selected = reviews.find((review) => review.id === selectedId) || reviews[0];
  const index = selected ? reviews.findIndex((review) => review.id === selected.id) : 0;
  const baseSuggestion = selected ? buildReplySuggestions({ rating: selected.rating, text: selected.comment, customerName: selected.reviewerName, businessName: snapshot.business.name, channel: 'public' })[0]?.body || '' : '';
  const suggestion = demo
    ? baseSuggestion.replace(/\.\s*—\s*/g, '. ').replace(/\s*—\s*/g, ', ')
    : baseSuggestion;
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
  // Sem oficial sincronizado e sem recolha local do piloto, a fila fica
  // genuinamente vazia hoje em toda conta real: a ligação oficial ao Google
  // está em aprovação desde 21/08/2026. Um traço aqui ensinaria o dono que o
  // produto tem menos do que tem, o mesmo defeito que motivou tirar a aba
  // Avaliações. Reaproveita o par título/ação já escrito para este estado em
  // `dashboard.cockpit.reviews.lockedTitle`/`action`; o corpo ganha uma chave
  // nova (`queueEmptyBody`) porque `lockedBody` descreve uma coleta que não
  // guarda nome, texto ou link, o que já não é verdade desde que o piloto
  // Apify passou a reter isso por até 14 dias no navegador. Este bloco some
  // sozinho assim que a fila tiver uma avaliação, oficial ou do piloto.
  if (!selected) return <Card className="border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]"><CardContent className="p-5">
    <h2 className="text-lg font-semibold text-slate-950">{t('dashboard.cockpit.layout.queueTitle')}</h2>
    <div className="mt-4 flex gap-3 rounded-xl border border-amber-100 bg-amber-50/60 p-4">
      <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-800" />
      <div>
        <p className="font-semibold text-amber-950">{t('dashboard.cockpit.reviews.lockedTitle')}</p>
        <p className="mt-1 text-sm leading-6 text-amber-950">{t('dashboard.cockpit.layout.queueEmptyBody')}</p>
      </div>
    </div>
    <Button asChild variant="outline" className="mt-4"><Link to="/settings">{t('dashboard.cockpit.reviews.action')}<ChevronRight className="ml-1 h-4 w-4" /></Link></Button>
  </CardContent></Card>;

  return <Card className="overflow-hidden border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]"><CardContent className="p-0">
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5"><h2 className="text-lg font-semibold text-slate-950">{t('dashboard.cockpit.layout.queueTitle')}</h2><span className="text-sm text-slate-500">{index + 1} de {reviews.length}</span></div>
    <div className="p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-slate-950">{selected.reviewerName || t('dashboard.cockpit.layout.anonymousReviewer')}</p><Stars rating={selected.rating} medium /></div><p className="mt-1 text-xs text-slate-500">{formatAge(selected.publishedAt, i18n.language)}</p></div><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => select(index - 1)} disabled={index === 0}><ChevronLeft className="mr-1 h-4 w-4" />Anterior</Button><Button variant="outline" size="sm" onClick={() => select(index + 1)} disabled={index >= reviews.length - 1}>Próxima<ChevronRight className="ml-1 h-4 w-4" /></Button></div></div>
      <blockquote className="mt-5 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">“{selected.comment}”</blockquote>
      <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4"><span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-[#2457D6]">{t('dashboard.cockpit.layout.replyTitle')}</span>{editing ? <Textarea value={currentAction.draft} onChange={(event) => save({ draft: event.target.value })} className="mt-3 min-h-28 resize-y text-sm leading-6" /> : <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-700">{currentAction.draft}</p>}<div className="mt-4 flex flex-wrap gap-2">{selected.reviewUrl ? <Button asChild className="rounded-full bg-[#2457D6] hover:bg-[#1d47b0]"><a href={selected.reviewUrl} target="_blank" rel="noreferrer" onClick={() => void copyReply()}><Copy className="mr-2 h-4 w-4" />{t('dashboard.cockpit.assisted.copyAndOpenReview')}<ExternalLink className="ml-2 h-4 w-4" /></a></Button> : <Button onClick={() => void copyReply()} className="rounded-full bg-[#2457D6] hover:bg-[#1d47b0]"><Copy className="mr-2 h-4 w-4" />{currentAction.copied ? t('dashboard.advisor.copiedButton') : t('dashboard.cockpit.assisted.copy')}</Button>}<Button variant="outline" onClick={() => setEditing((value) => !value)}>{editing ? 'Concluir' : 'Editar'}</Button><Button variant="outline" onClick={() => select(Math.min(index + 1, reviews.length - 1))}>Pular</Button></div></div>
      <div className="mt-4 flex flex-wrap gap-2">{reviews.slice(0, 8).map((review) => <button key={review.id} type="button" onClick={() => { setSelectedId(review.id); setEditing(false); }} className={`rounded-xl border px-3 py-2 text-left text-xs ${review.id === selected.id ? 'border-[#2457D6] bg-blue-50 text-[#2457D6]' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}><span className="block max-w-32 truncate font-semibold">{review.reviewerName || t('dashboard.cockpit.layout.anonymousReviewer')}</span><Stars rating={review.rating} /></button>)}</div>
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
  const hasDistribution = snapshot.sample.reviewCount > 0;
  const rows = ratings.map((rating) => ({ rating, current: hasHistory ? Math.round(share(current, rating) * 100) : hasDistribution ? Math.round((snapshot.sample.ratingBreakdown[rating] / snapshot.sample.reviewCount) * 100) : null, previous: hasHistory ? Math.round(share(previous, rating) * 100) : null, series: weeks.map((week) => ({ value: week.reviewCount ? Math.round((week.ratingBreakdown[rating] / week.reviewCount) * 100) : 0 })) }));
  const five = rows[0];
  const lowCurrent = rows.filter((row) => row.rating === '1' || row.rating === '2').reduce((sum, row) => sum + (row.current || 0), 0);
  const lowPrevious = rows.filter((row) => row.rating === '1' || row.rating === '2').reduce((sum, row) => sum + (row.previous || 0), 0);
  const needsAttention = hasHistory && five.current < (five.previous || 0) || hasHistory && lowCurrent > lowPrevious;
  return <Card className="border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]"><CardContent className="p-5"><div className="flex items-center justify-between gap-3"><h2 className="text-lg font-semibold text-slate-950">Cada nota separada</h2><span className="text-sm text-slate-500">sem empilhamento</span></div><div className="mt-5 divide-y divide-slate-200">{rows.map((row) => { const risk = hasHistory && row.current !== null && (row.rating === '5' ? row.current < (row.previous || 0) : Number(row.rating) <= 2 && row.current > (row.previous || 0)); return <div key={row.rating} className="grid grid-cols-[40px_1fr_auto] items-center gap-2 py-3 sm:grid-cols-[52px_1fr_auto] sm:gap-3"><span className="text-sm font-semibold text-slate-800">{row.rating}<Star className="ml-1 inline h-3.5 w-3.5 fill-amber-400 text-amber-400" /></span><div className="h-8 min-w-16 sm:min-w-24">{hasHistory && <ResponsiveContainer width="100%" height="100%"><LineChart data={row.series}><Line type="monotone" dataKey="value" stroke={risk ? '#C2413A' : '#D4A72C'} strokeWidth={2.5} dot={false} isAnimationActive={false} /></LineChart></ResponsiveContainer>}</div><span className="text-right text-xs leading-5 text-slate-500"><strong className="text-slate-900">{row.current === null ? '—' : `${row.current}%`}</strong> antes {row.previous === null ? '—' : `${row.previous}%`} {risk && <span className="ml-2 rounded-full bg-red-50 px-2 py-1 text-red-700">atenção</span>}</span></div>; })}</div>{needsAttention && <div className="mt-5 flex gap-3 rounded-lg border border-red-100 bg-red-50 p-4 text-sm leading-5 text-red-950"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-700" /><p>As 5 estrelas mudaram de {five.previous}% para {five.current}% e as notas 1 e 2 mudaram de {lowPrevious}% para {lowCurrent}% nas últimas 4 semanas.</p></div>}<SampleSourceNote snapshot={snapshot} /></CardContent></Card>;
};

const ReputationCard = ({ snapshot }: { snapshot: ExperimentalApifySnapshot }) => {
  const replyHours = snapshot.sample.insights?.averageResponseHours;
  const last30 = snapshot.sample.insights?.reviewsLast30Days;
  const hasDistribution = snapshot.sample.reviewCount > 0;
  return <Card className="border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]"><CardContent className="p-5"><div className="flex items-center justify-between gap-3"><h2 className="font-semibold text-slate-950">Reputação no Google</h2><span className="text-xs text-slate-500">últimos dados</span></div><div className="mt-4 flex items-end gap-3"><p className="text-4xl font-medium tracking-tight text-slate-950">{decimal.format(snapshot.business.googleRating)}</p><Stars rating={Math.round(snapshot.business.googleRating)} medium /></div><p className="mt-1 text-sm text-slate-600">{integer.format(snapshot.business.googleReviewCount)} avaliações no total</p>{hasDistribution ? <div className="mt-5 space-y-2">{ratings.map((rating) => { const count = snapshot.sample.ratingBreakdown[rating]; const width = Math.round((count / snapshot.sample.reviewCount) * 100); return <div key={rating} className="grid grid-cols-[28px_1fr_36px] items-center gap-2 text-xs"><span>{rating}★</span><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={`${Number(rating) <= 2 ? 'bg-red-500' : 'bg-amber-400'} h-full rounded-full`} style={{ width: `${width}%` }} /></div><span className="text-right text-slate-600">{width}%</span></div>; })}</div> : <p className="mt-5 text-sm text-slate-500">—</p>}<div className="mt-5 grid grid-cols-2 gap-3"><Metric label="Tempo médio de resposta" value={replyHours === null || replyHours === undefined ? '—' : `${Math.round(replyHours)} h`} /><Metric label="Novas avaliações (30 dias)" value={last30 === null || last30 === undefined ? '—' : `+${last30}`} tone="positive" /></div><SampleSourceNote snapshot={snapshot} /></CardContent></Card>;
};

const Metric = ({ label, value, tone }: { label: string; value: string; tone?: 'positive' }) => <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs leading-4 text-slate-500">{label}</p><p className={`mt-2 text-xl font-semibold ${tone === 'positive' ? 'text-emerald-700' : 'text-slate-950'}`}>{value}</p></div>;

const WhatsAppCard = ({ localWhatsApp }: { localWhatsApp: LocalWhatsAppState }) => <Card className="border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]"><CardContent className="p-5"><div className="flex items-center justify-between gap-3"><h2 className="font-semibold text-slate-950">Resumo no WhatsApp</h2><MessageCircle className="h-5 w-5 text-emerald-700" /></div><div className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm leading-5 text-emerald-950">{localWhatsApp.status === 'ready' ? 'Canal conectado para o seu resumo.' : 'Configure quando quer receber o resumo.'}</div><Button asChild variant="link" className="mt-2 h-auto px-0 text-[#2457D6]"><a href={`#${WHATSAPP_ANCHOR_ID}`}>Configurar WhatsApp<ChevronRight className="ml-1 h-4 w-4" /></a></Button></CardContent></Card>;

const DailyPractice = ({ snapshot }: { snapshot: ExperimentalApifySnapshot }) => {
  const { t } = useOwnerTranslation();
  const reading = getAdvisorReading(snapshot);
  const unresolved = (snapshot.sample.observedReviews?.items || []).filter((review) => !review.responseObserved).length;
  // O destino do CTA acompanha o texto: "Ver QR Codes" tinha o rótulo certo
  // mas sempre levava para a fila (herdado de quando só existia setTab para
  // a aba de avaliações). Cada variante aponta para a âncora que o próprio
  // texto promete.
  const practice = reading.kind === 'opportunity'
    ? { title: t('dashboard.advisorPilot.opportunityBody', { phrase: reading.phrase, mentions: reading.mentions }), body: t('dashboard.advisorPilot.opportunityAction'), action: t('dashboard.advisorPilot.planTitle'), target: QUEUE_ANCHOR_ID }
    : reading.kind === 'strength'
      ? { title: t('dashboard.advisorPilot.strengthBody', { topic: t(`dashboard.cockpit.topicLabels.${reading.topic}`), mentions: reading.mentions }), body: t('dashboard.advisorPilot.strengthAction', { topic: t(`dashboard.cockpit.topicLabels.${reading.topic}`) }), action: t('dashboard.advisorPilot.reviewEvidence'), target: QUEUE_ANCHOR_ID }
    : unresolved ? { title: `${unresolved} avaliações com texto ainda não mostram resposta`, body: 'Revise uma resposta e publique quando estiver satisfeito.', action: 'Revisar fila', target: QUEUE_ANCHOR_ID } : { title: 'Planeje uma foto recente da experiência', body: 'Mostre o que o cliente encontra hoje.', action: 'Ver QR Codes', target: QR_ANCHOR_ID };
  return <Card className="border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]"><CardContent className="p-5"><div className="flex items-center gap-2"><Lightbulb className="h-5 w-5 text-[#6D43C0]" /><h2 className="font-semibold text-slate-950">Boas práticas</h2></div><p className="mt-4 font-medium text-slate-900">{practice.title}</p><p className="mt-1 text-sm leading-5 text-slate-600">{practice.body}</p><Button asChild variant="link" className="mt-2 h-auto px-0 text-[#2457D6]"><a href={`#${practice.target}`}>{practice.action}<ChevronRight className="ml-1 h-4 w-4" /></a></Button></CardContent></Card>;
};

const ProfileCompleteness = ({ connected, demo = false }: { connected: boolean; demo?: boolean }) => {
  const percentage = demo ? 68 : undefined;

  return <Card className="border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]"><CardContent className="p-5"><div className="flex items-center justify-between gap-3"><h2 className="font-semibold text-slate-950">Completude do perfil</h2><span className="text-sm text-slate-500">{percentage ? `${percentage}%` : '—'}</span></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#2457D6]" style={{ width: `${percentage ?? 0}%` }} /></div>{demo && <p className="mt-3 text-sm leading-5 text-slate-600">Falta: horário de funcionamento, duas fotos e a descrição do negócio.</p>}{connected && !demo ? <p className="mt-3 text-sm leading-5 text-slate-600">Os dados do Perfil da Empresa estão disponíveis para acompanhamento.</p> : null}</CardContent></Card>;
};

const WeeklyChange = ({ weeks }: { weeks: Week[] }) => {
  const current = weeks.at(-1)?.ownerReplies || 0;
  const { t } = useOwnerTranslation();
  return <Card className="border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]"><CardContent className="p-5"><div className="flex items-center justify-between gap-3"><h2 className="font-semibold text-slate-950">O que mudou na semana</h2><span className="text-xs text-slate-500">7 dias</span></div><div className="mt-4 flex items-center gap-3"><div className="h-8 w-20">{weeks.length > 0 && <ResponsiveContainer width="100%" height="100%"><LineChart data={weeks}><Line type="monotone" dataKey="ownerReplies" stroke="#2457D6" strokeWidth={2.5} dot={false} isAnimationActive={false} /></LineChart></ResponsiveContainer>}</div><p className="text-sm leading-5 text-slate-600">{weeks.length ? (current ? `Você respondeu ${current} avaliações nos últimos 7 dias.` : t('whatsappPilot.weeklyChangeEmpty')) : t('whatsappPilot.weeklyChangeEmpty')}</p></div></CardContent></Card>;
};

const ObservedResult = ({ snapshot, version }: { snapshot: ExperimentalApifySnapshot; version: number }) => {
  const { t } = useOwnerTranslation();
  // version intentionally refreshes local action state after the owner marks it.
  void version;
  const result = getAdvisorObservedResult(snapshot);
  const copy = result === 'persisting'
    ? t('dashboard.advisorPilot.resultPersisting')
    : result === 'not-repeated'
      ? t('dashboard.advisorPilot.resultNotRepeated')
      : t('dashboard.advisorPilot.resultWaiting');
  return <Card className="border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]"><CardContent className="p-5"><div className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-[#6D43C0]" /><h2 className="font-semibold text-slate-950">{t('dashboard.advisorPilot.resultTitle')}</h2></div><p className="mt-3 text-sm leading-5 text-slate-600">{copy}</p></CardContent></Card>;
};

const QrCard = ({ funnel }: { funnel: { qrOpens: number; googleClicks: number } | null }) => <Card className="border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]"><CardContent className="p-5"><div className="flex items-center justify-between gap-3"><h2 className="text-lg font-semibold text-slate-950">Do QR ao Google</h2><QrCode className="h-5 w-5 text-[#2457D6]" /></div><dl className="mt-5 space-y-3"><div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"><dt className="text-sm text-slate-600">QR aberto</dt><dd className="font-semibold text-slate-950">{funnel?.qrOpens ?? '—'}</dd></div><div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"><dt className="text-sm text-slate-600">Clicou no Google</dt><dd className="font-semibold text-slate-950">{funnel?.googleClicks ?? '—'}</dd></div></dl></CardContent></Card>;

const TopicsCard = ({ snapshot }: { snapshot: ExperimentalApifySnapshot }) => {
  const { t } = useOwnerTranslation();
  const topics = snapshot.sample.insights?.topics || [];
  const reading = getAdvisorReading(snapshot);
  const detail = reading.kind === 'alert'
    ? <><p className="text-xs font-semibold text-red-700">{t('dashboard.advisorPilot.alertTitle')}</p><p className="mt-1 text-sm leading-5 text-slate-700">{t('dashboard.advisorPilot.alertBody', { low: reading.lowRatingCount, topic: t(`dashboard.cockpit.topicLabels.${reading.topic}`), mentions: reading.mentions })}</p></>
    : reading.kind === 'opportunity'
      ? <><p className="text-xs font-semibold text-emerald-700">{t('dashboard.advisorPilot.opportunityTitle')}</p><p className="mt-1 text-sm leading-5 text-slate-700">{t('dashboard.advisorPilot.opportunityBody', { phrase: reading.phrase, mentions: reading.mentions })}</p></>
      : reading.kind === 'strength'
        ? <><p className="text-xs font-semibold text-emerald-700">{t('dashboard.advisorPilot.opportunityTitle')}</p><p className="mt-1 text-sm leading-5 text-slate-700">{t('dashboard.advisorPilot.strengthBody', { topic: t(`dashboard.cockpit.topicLabels.${reading.topic}`), mentions: reading.mentions })}</p></>
        : null;
  return <Card className="border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]"><CardContent className="p-5"><h2 className="text-lg font-semibold text-slate-950">{t('dashboard.cockpit.layout.topicsTitle')}</h2>{topics.length ? <div className="mt-5 flex flex-wrap gap-2">{topics.map((topic) => <span key={topic.id} className={`rounded-full px-3 py-1.5 text-xs font-medium ${topic.sentiment === 'negative' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>{t(`dashboard.cockpit.topicLabels.${topic.id}`)} · {topic.count}</span>)}</div> : <p className="mt-4 text-sm text-slate-500">—</p>}{detail && <div className="mt-5 border-t border-slate-200 pt-4">{detail}</div>}<SampleSourceNote snapshot={snapshot} /></CardContent></Card>;
};

export default ApprovedCockpitDashboard;
