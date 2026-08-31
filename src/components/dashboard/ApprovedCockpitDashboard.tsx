import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ChevronLeft, ChevronRight, Copy, ExternalLink, Star } from 'lucide-react';
import { Line, LineChart, ResponsiveContainer } from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import type { ExperimentalApifySnapshot, ExperimentalObservedReview } from '@/lib/experimentalApifySnapshot';
import { useOwnerTranslation } from '@/i18n/owner/useOwnerTranslation';
import { useGoogleBusinessReviewQueue } from '@/hooks/useGoogleBusinessReviewQueue';
import { useReviewFunnelMetrics, type ReviewFunnelMetrics } from '@/hooks/useReviewFunnelMetrics';
import { buildReplySuggestions } from '@/lib/replySuggestions';
import { supabase } from '@/integrations/supabase/client';
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
// aba agora levam a estes ids por link nativo (href="#..."), sem estado de aba
// nem JavaScript para funcionar.
//
// Em 31/08/2026 a âncora do WhatsApp saiu daqui junto com a configuração, que
// virou destino próprio do menu (`/whatsapp`). As âncoras do Radar, do volume
// e das notas saíram com o índice do celular: elas só existiam para ele.
const QUEUE_ANCHOR_ID = 'fila-de-respostas';
const QR_ANCHOR_ID = 'qr-e-temas';

const readActions = (): Record<string, ActionState> => {
  try {
    return JSON.parse(window.localStorage.getItem(actionStorageKey) || '{}') as Record<string, ActionState>;
  } catch {
    return {};
  }
};

const Stars = ({ rating, medium = false }: { rating: number; medium?: boolean }) => {
  const { t } = useOwnerTranslation();
  return (
    <span className="flex" aria-label={t('dashboard.cockpit.approved.starsLabel', { rating })}>
      {[1, 2, 3, 4, 5].map((star) => <Star key={star} className={`${medium ? 'h-5 w-5' : 'h-3.5 w-3.5'} ${star <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />)}
    </span>
  );
};

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

/*
 * Aqui vivia o índice fixo do celular (`MobileIndex`), aprovado em 30/08/2026
 * e removido em 31/08/2026 por decisão de Marcelo, depois de o ver cortado no
 * próprio telemóvel. O menu principal já leva a pessoa a cada destino, e um
 * segundo nível de navegação por cima dele custava a primeira dobra inteira.
 * Ver "Painel que cabe no celular" no contrato de produto.
 */

/**
 * Faixa-resumo do celular, só abaixo de `lg`. Adiciona, nunca substitui: as três
 * faixas abaixo continuam inteiras e na ordem decidida, e ela precede-as, como o
 * contrato aprovou em 30/08/2026.
 *
 * A parte deste comentário que dizia que a fila só existe no navegador que fez a
 * coleta saiu em 31/08/2026: ela deixou de ser verdade quando a fila passou a
 * viver no banco. O que a faixa distingue continua a ser o mesmo, com outro
 * motivo: fila ausente não é fila vazia, e sem busca nenhuma ela diz o que fazer
 * em vez de mostrar zero, que afirmaria "nada a responder" sem saber.
 */
const MobileSummary = ({ snapshot, queue, temFila }: { snapshot: ExperimentalApifySnapshot; queue: QueueReview[]; temFila: boolean }) => {
  const { t } = useOwnerTranslation();
  const waiting = queue.filter((review) => !review.responseObserved).length;
  const next = queue.find((review) => !review.responseObserved);
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 lg:hidden">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="text-2xl font-medium tracking-tight text-slate-950">{decimal.format(snapshot.business.googleRating)}</span>
        <Stars rating={Math.round(snapshot.business.googleRating)} />
        <span className="text-sm text-slate-600">{integer.format(snapshot.business.googleReviewCount)} {t('dashboard.cockpit.approved.reviewsShort')}</span>
      </div>
      {/*
        Aqui dizia que a fila ficava no aparelho onde a busca foi feita. Isso
        deixou de ser verdade em 31/08/2026, quando a fila passou a viver no
        banco, e a frase sobreviveu à mudança dizendo o contrário do que o
        produto faz. Sem fila nenhuma o que falta não é um aviso sobre
        aparelhos: é dizer o que fazer para ter uma.
      */}
      {!temFila ? (
        <p className="mt-2 text-sm leading-5 text-slate-600">{t('dashboard.cockpit.approved.queueEmptyHint')}</p>
      ) : waiting ? (
        <p className="mt-2 text-sm leading-5 text-slate-900">
          <strong className="font-semibold">{waiting}</strong> {t('dashboard.cockpit.approved.waitingReplies', { count: waiting })}
          {next?.reviewerName ? <>{t('dashboard.cockpit.approved.nextInQueue', { name: next.reviewerName })}</> : null}.
        </p>
      ) : (
        <p className="mt-2 text-sm leading-5 text-slate-600">{t('dashboard.cockpit.approved.noneWaiting')}</p>
      )}
      {temFila && waiting ? (
        <a href={`#${QUEUE_ANCHOR_ID}`} className="mt-3 inline-flex min-h-11 items-center text-sm font-medium text-[#2457D6] hover:underline">
          {t('dashboard.cockpit.approved.goToQueue')}<ChevronRight className="ml-1 h-4 w-4" />
        </a>
      ) : null}
    </section>
  );
};

const ApprovedCockpitDashboard = ({ snapshot, userId, demo = false, demoFunnel }: { snapshot: ExperimentalApifySnapshot; userId?: string; demo?: boolean; demoFunnel?: ReviewFunnelMetrics }) => {
  const official = useGoogleBusinessReviewQueue(import.meta.env.VITE_GOOGLE_BUSINESS_OAUTH_ENABLED === 'true' ? userId : undefined);
  const liveFunnel = useReviewFunnelMetrics(userId);
  const funnel = demoFunnel ? { ...liveFunnel, data: demoFunnel } : liveFunnel;
  // `profiles.business_country` decide a variante do português da resposta
  // sugerida (pt-BR vs. pt-PT), pela mesma regra do cartão impresso em
  // `src/lib/businessLocale.ts`. Fica em `null` enquanto o perfil não
  // responde, e continua `null` na demonstração pública, onde não há dono
  // nem país para ler: `null` é a afirmação de que não se sabe, e o texto
  // cai no português de Portugal, que é o padrão histórico.
  //
  // O telefone do onboarding saía desta mesma leitura, para a configuração do
  // WhatsApp que vivia ao fim da página. Em 31/08/2026 a configuração mudou-se
  // para `/whatsapp` e leva o telefone consigo; aqui ficou só o país.
  const [businessCountry, setBusinessCountry] = useState<string | null>(null);
  useEffect(() => {
    if (!userId) return;
    let active = true;
    const loadProfile = async () => {
      try {
        const { data } = await supabase.from('profiles').select('business_country').eq('id', userId).maybeSingle();
        if (!active) return;
        setBusinessCountry(data?.business_country || null);
      } catch {
        if (!active) return;
        setBusinessCountry(null);
      }
    };
    void loadProfile();
    return () => { active = false; };
  }, [userId]);
  const observed = (snapshot.sample.observedReviews?.items || []).map(normalizeObserved);
  // Fila ausente e fila vazia não são a mesma coisa. Sem o retrato do
  // navegador e sem a conexão oficial, este aparelho não tem como saber o que
  // está por responder, e a faixa do celular precisa dizer isso.
  // Fila ausente e fila vazia continuam sendo coisas diferentes, mas o motivo
  // mudou: antes era "este aparelho não tem", agora é "ainda não houve busca".
  const temFila = official.syncComplete || snapshot.sample.observedReviews !== undefined;
  const queue: QueueReview[] = official.syncComplete
    ? official.reviews.map((review) => ({ id: review.id, rating: review.rating, comment: review.comment || '', publishedAt: review.review_updated_at, reviewerName: review.reviewer_name || undefined, responseObserved: Boolean(review.reply_text) }))
    : observed;
  const history = useMemo(() => snapshot.sample.insights?.history?.weeks || [], [snapshot.sample.insights?.history?.weeks]);

  // A página começa pelo que muda o dia do dono e termina no que ele apenas
  // consulta. Decisão de 31/08/2026, autorizada por Marcelo; ver "Ordem por
  // decisão" em docs/contrato-produto-binno.md.
  //
  // Até aqui a ordem era o inventário dos módulos na sequência em que foram
  // construídos, escrita para um portátil. No telemóvel isso vira um rolo em
  // que o dono passa por gráficos e por leituras de consulta antes de chegar à
  // única coisa que ele abriu o painel para fazer, que é responder alguém.
  //
  // As três faixas são declaradas no DOM (`data-faixa`) em vez de ficarem só
  // num comentário: assim a regra é uma construção que o guarda lê e que
  // qualquer pessoa vê no inspetor, e não uma promessa escrita ao lado do
  // código.
  //
  // O Radar muda de faixa conforme o que ele tem a dizer, e é o mesmo
  // componente nas duas: com alerta ele é decisão de hoje e abre a página; sem
  // alerta ele é leitura de consulta e fecha. `radarEmAcao` e a sua negação
  // garantem que ele aparece uma vez, sempre.
  const radarEmAcao = getAdvisorReading(snapshot).kind === 'alert';
  return <div className="space-y-6">
    <MobileSummary snapshot={snapshot} queue={queue} temFila={temFila} />

    {/* Ação: o que ele precisa de decidir ou fazer agora. */}
    <section data-faixa="acao" className="space-y-5">
      {radarEmAcao && <RadarNow snapshot={snapshot} />}
      {!demo && <PendingCommentsBanner userId={userId} />}
      <div id={QUEUE_ANCHOR_ID} className="scroll-mt-16 lg:scroll-mt-4"><ResponseQueue reviews={queue} snapshot={snapshot} demo={demo} businessCountry={businessCountry} /></div>
    </section>

    {/* Mudança: o que se mexeu desde a última vez. */}
    <section data-faixa="mudanca" className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 space-y-5">
        <VolumeCard weeks={history} />
        <RatingTrends weeks={history} snapshot={snapshot} />
      </div>
      <div className="space-y-5"><WeeklyChange weeks={history} /></div>
    </section>

    {/* Referência: o que ele consulta em vez de agir. */}
    <section data-faixa="referencia" className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 space-y-5">
        <ReputationCard snapshot={snapshot} />
        <div id={QR_ANCHOR_ID} className="grid scroll-mt-16 gap-5 md:grid-cols-2 lg:scroll-mt-4"><QrCard funnel={funnel.data} /><TopicsCard snapshot={snapshot} /></div>
      </div>
      <div className="space-y-5">
        <DailyPractice snapshot={snapshot} />
        {!radarEmAcao && <RadarNow snapshot={snapshot} />}
      </div>
    </section>
  </div>;
};

/**
 * O Radar, em no máximo uma linha (decisão de 31/08/2026).
 *
 * Continua proibido de inventar uma fragilidade: os critérios de alerta,
 * oportunidade e força observada seguem inteiros em `getAdvisorReading`, e o
 * estado de acompanhamento continua a dizer que segue acompanhando. O que mudou
 * é o tamanho. No telemóvel do dono a versão anterior enchia a primeira dobra
 * com quatro linhas para dizer que não havia nada a fazer, e a fila de
 * respostas, que é o centro do produto, ficava abaixo do fim da tela.
 *
 * O que mudou depois, na ordem por decisão de 31/08/2026, foi o lugar. Com
 * alerta ele abre a página, na faixa de Ação, porque um alerta é decisão de
 * hoje. Sem alerta ele fecha a página, na faixa de Referência: "nada precisa de
 * você agora" é leitura de consulta, e ocupar a primeira dobra com isso é o
 * mesmo defeito de tamanho noutro formato.
 *
 * O ícone só existe no alerta. Ali ele carrega a severidade, que o texto sozinho
 * não carrega; nos outros três estados era enfeite a comer largura.
 */
const RadarNow = ({ snapshot }: { snapshot: ExperimentalApifySnapshot }) => {
  const { t } = useOwnerTranslation();
  const reading = getAdvisorReading(snapshot);
  const topic = reading.kind === 'alert' || reading.kind === 'strength' ? t(`dashboard.cockpit.topicLabels.${reading.topic}`) : null;
  const urgent = reading.kind === 'alert';
  const linha = reading.kind === 'alert'
    ? t('dashboard.advisorPilot.radarLineAlert', { low: reading.lowRatingCount, topic, mentions: reading.mentions })
    : reading.kind === 'opportunity'
      ? t('dashboard.advisorPilot.radarLineOpportunity', { phrase: reading.phrase, mentions: reading.mentions })
      : reading.kind === 'strength'
        ? t('dashboard.advisorPilot.radarLineStrength', { topic, mentions: reading.mentions })
        : t('dashboard.advisorPilot.radarLineMonitor');
  return <p className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm leading-5 ${urgent ? 'border-red-200 bg-red-50/60 text-red-950' : 'border-violet-200 bg-violet-50/50 text-slate-700'}`}>
    {urgent ? <AlertTriangle className="h-4 w-4 shrink-0 text-red-700" aria-hidden="true" /> : null}
    <span className="min-w-0">{linha}</span>
  </p>;
};

/*
 * Aqui vivia o "Plano de hoje", removido em 31/08/2026 por decisão de Marcelo.
 * Nas palavras dele: "não soma em nada".
 *
 * Ele lia `getAdvisorReading`, a mesma leitura do Radar, e escrevia o mesmo que
 * já estava na tela. Com o Radar calmo repetia o Radar; com alerta repetia o
 * alerta; nas variantes de oportunidade e de força observada o corpo dele era,
 * palavra por palavra, o corpo de "Boas práticas" (`opportunityAction` e
 * `strengthAction`), porque os dois cartões liam as mesmas chaves.
 *
 * A única coisa que ele carregava sozinho era o botão "Marcar como feito", que
 * escrevia em `binno.advisor-pilot-actions`. Quem lia essa marcação era o
 * cartão "Deu resultado?", removido em 31/08/2026 mais cedo: desde então a
 * marcação já não tinha leitor nenhum, e o toque devolvia ao dono um botão
 * desativado e mais nada. `src/lib/advisorPilot.ts` saiu junto, porque ficou
 * sem nenhum chamador.
 */

const ResponseQueue = ({ reviews, snapshot, demo = false, businessCountry }: { reviews: QueueReview[]; snapshot: ExperimentalApifySnapshot; demo?: boolean; businessCountry: string | null }) => {
  const { t, i18n } = useOwnerTranslation();
  const [selectedId, setSelectedId] = useState<string | null>(reviews[0]?.id || null);
  const [editing, setEditing] = useState(false);
  const [actions, setActions] = useState<Record<string, ActionState>>(readActions);
  const selected = reviews.find((review) => review.id === selectedId) || reviews[0];
  const index = selected ? reviews.findIndex((review) => review.id === selected.id) : 0;
  const baseSuggestion = selected ? buildReplySuggestions({ rating: selected.rating, text: selected.comment, customerName: selected.reviewerName, businessName: snapshot.business.name, businessCountry, channel: 'public' })[0]?.body || '' : '';
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
    <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50/60 p-4">
      <p className="font-semibold text-amber-950">{t('dashboard.cockpit.reviews.lockedTitle')}</p>
      <p className="mt-1 text-sm leading-6 text-amber-950">{t('dashboard.cockpit.layout.queueEmptyBody')}</p>
    </div>
    <Button asChild variant="outline" className="mt-4"><Link to="/settings">{t('dashboard.cockpit.reviews.action')}<ChevronRight className="ml-1 h-4 w-4" /></Link></Button>
  </CardContent></Card>;

  return <Card className="overflow-hidden border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]"><CardContent className="p-0">
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5"><h2 className="text-lg font-semibold text-slate-950">{t('dashboard.cockpit.layout.queueTitle')}</h2><span className="text-sm text-slate-500">{t('dashboard.cockpit.approved.queuePosition', { current: index + 1, total: reviews.length })}</span></div>
    <div className="p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-slate-950">{selected.reviewerName || t('dashboard.cockpit.layout.anonymousReviewer')}</p><Stars rating={selected.rating} medium /></div><p className="mt-1 text-xs text-slate-500">{formatAge(selected.publishedAt, i18n.language)}</p></div><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => select(index - 1)} disabled={index === 0}><ChevronLeft className="mr-1 h-4 w-4" />{t('dashboard.cockpit.approved.previous')}</Button><Button variant="outline" size="sm" onClick={() => select(index + 1)} disabled={index >= reviews.length - 1}>{t('dashboard.cockpit.approved.next')}<ChevronRight className="ml-1 h-4 w-4" /></Button></div></div>
      <blockquote className="mt-5 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">“{selected.comment}”</blockquote>
      <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4"><span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-[#2457D6]">{t('dashboard.cockpit.layout.replyTitle')}</span>{editing ? <Textarea value={currentAction.draft} onChange={(event) => save({ draft: event.target.value })} className="mt-3 min-h-28 resize-y text-sm leading-6" /> : <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-700">{currentAction.draft}</p>}<div className="mt-4 flex flex-wrap gap-2">{selected.reviewUrl ? <Button asChild className="rounded-full bg-[#2457D6] hover:bg-[#1d47b0]"><a href={selected.reviewUrl} target="_blank" rel="noreferrer" onClick={() => void copyReply()}><Copy className="mr-2 h-4 w-4" />{t('dashboard.cockpit.assisted.copyAndOpenReview')}<ExternalLink className="ml-2 h-4 w-4" /></a></Button> : <Button onClick={() => void copyReply()} className="rounded-full bg-[#2457D6] hover:bg-[#1d47b0]"><Copy className="mr-2 h-4 w-4" />{currentAction.copied ? t('dashboard.advisor.copiedButton') : t('dashboard.cockpit.assisted.copy')}</Button>}<Button variant="outline" onClick={() => setEditing((value) => !value)}>{editing ? t('dashboard.cockpit.approved.doneEditing') : t('dashboard.cockpit.approved.edit')}</Button><Button variant="outline" onClick={() => select(Math.min(index + 1, reviews.length - 1))}>{t('dashboard.cockpit.approved.skip')}</Button></div></div>
      <div className="mt-4 flex flex-wrap gap-2">{reviews.slice(0, 8).map((review) => <button key={review.id} type="button" onClick={() => { setSelectedId(review.id); setEditing(false); }} className={`rounded-xl border px-3 py-2 text-left text-xs ${review.id === selected.id ? 'border-[#2457D6] bg-blue-50 text-[#2457D6]' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}><span className="block max-w-32 truncate font-semibold">{review.reviewerName || t('dashboard.cockpit.layout.anonymousReviewer')}</span><Stars rating={review.rating} /></button>)}</div>
    </div>
  </CardContent></Card>;
};

/**
 * Sem semana nenhuma no histórico este cartão desenhava uma caixa de gráfico
 * vazia, um traço no lugar do número e a janela de "12 semanas" a prometer uma
 * leitura que não existe. O padrão de 31/08/2026 é o mesmo dos "Temas mais
 * citados": o módulo continua presente, encolhido numa linha honesta que diz o
 * que aparece ali e o que o dono faz para que apareça.
 */
const VolumeCard = ({ weeks }: { weeks: Week[] }) => {
  const { t } = useOwnerTranslation();
  const semEvidencia = weeks.length === 0;
  const current = weeks.at(-1) || { reviewCount: 0 };
  const previous = weeks.slice(-9, -1);
  const average = previous.length ? previous.reduce((sum, week) => sum + week.reviewCount, 0) / previous.length : 0;
  const change = !semEvidencia && average > 0 ? Math.round(((current.reviewCount - average) / average) * 100) : null;
  return <Card className="border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]"><CardContent className="p-5"><div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1"><h2 className="text-lg font-semibold text-slate-950">{t('dashboard.cockpit.layout.volumeTitle')}</h2>{semEvidencia ? null : <span className="whitespace-nowrap text-sm text-slate-500">{t('dashboard.cockpit.approved.volumeWindow')}</span>}</div>{semEvidencia ? <p className="mt-2 text-sm text-slate-500">{t('dashboard.cockpit.approved.volumeEmpty')}</p> : <><div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center"><div className="h-12 w-40 shrink-0"><ResponsiveContainer width="100%" height="100%"><LineChart data={weeks}><Line type="monotone" dataKey="reviewCount" stroke="#2457D6" strokeWidth={3} dot={false} isAnimationActive={false} /></LineChart></ResponsiveContainer></div><p className="text-lg font-semibold text-slate-950">{current.reviewCount} <span className="text-sm font-normal text-slate-600">{t('dashboard.cockpit.approved.volumeThisWeek')} {t('dashboard.cockpit.approved.volumeAverage', { average: Math.round(average) })}</span></p></div>{change !== null && change <= -25 && <div className="mt-5 flex gap-3 rounded-lg border border-red-100 bg-red-50 p-4 text-sm leading-5 text-red-950"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-700" /><p><strong>{t('dashboard.cockpit.approved.volumeDrop', { percent: Math.abs(change) })}</strong> {t('dashboard.cockpit.approved.volumeDropRest')}</p></div>}</>}</CardContent></Card>;
};

const share = (weeks: Week[], rating: Rating) => weeks.reduce((sum, week) => sum + week.ratingBreakdown[rating], 0) / Math.max(1, weeks.reduce((sum, week) => sum + week.reviewCount, 0));

/**
 * Sem histórico e sem distribuição na amostra, as cinco linhas deste cartão
 * desenhavam um traço no lugar da percentagem de hoje e outro no lugar da de
 * antes, cinco vezes, com cinco caixas de gráfico vazias: era o módulo mais
 * alto do painel a dizer que não sabia nada. Encolhe pela mesma regra dos
 * outros, e continua presente.
 *
 * Com distribuição e sem histórico ele NÃO encolhe: a percentagem de cada nota
 * na amostra é evidência de verdade, e o "antes" é que fica em traço.
 */
const RatingTrends = ({ weeks, snapshot }: { weeks: Week[]; snapshot: ExperimentalApifySnapshot }) => {
  const { t } = useOwnerTranslation();
  const hasHistory = weeks.length > 0;
  const current = weeks.slice(-4);
  const previous = weeks.slice(-8, -4);
  const hasDistribution = snapshot.sample.reviewCount > 0;
  const semEvidencia = !hasHistory && !hasDistribution;
  const rows = ratings.map((rating) => ({ rating, current: hasHistory ? Math.round(share(current, rating) * 100) : hasDistribution ? Math.round((snapshot.sample.ratingBreakdown[rating] / snapshot.sample.reviewCount) * 100) : null, previous: hasHistory ? Math.round(share(previous, rating) * 100) : null, series: weeks.map((week) => ({ value: week.reviewCount ? Math.round((week.ratingBreakdown[rating] / week.reviewCount) * 100) : 0 })) }));
  const five = rows[0];
  const lowCurrent = rows.filter((row) => row.rating === '1' || row.rating === '2').reduce((sum, row) => sum + (row.current || 0), 0);
  const lowPrevious = rows.filter((row) => row.rating === '1' || row.rating === '2').reduce((sum, row) => sum + (row.previous || 0), 0);
  const needsAttention = hasHistory && five.current < (five.previous || 0) || hasHistory && lowCurrent > lowPrevious;
  return <Card className="border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]"><CardContent className="p-5"><div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1"><h2 className="text-lg font-semibold text-slate-950">{t('dashboard.cockpit.layout.distributionTitle')}</h2>{semEvidencia ? null : <span className="text-sm text-slate-500">{t('dashboard.cockpit.approved.ratingsNoStacking')}</span>}</div>{semEvidencia ? <p className="mt-2 text-sm text-slate-500">{t('dashboard.cockpit.approved.distributionEmpty')}</p> : <><div className="mt-5 divide-y divide-slate-200">{rows.map((row) => { const risk = hasHistory && row.current !== null && (row.rating === '5' ? row.current < (row.previous || 0) : Number(row.rating) <= 2 && row.current > (row.previous || 0)); return <div key={row.rating} className="grid grid-cols-[40px_1fr_auto] items-center gap-2 py-3 sm:grid-cols-[52px_1fr_auto] sm:gap-3"><span className="text-sm font-semibold text-slate-800">{row.rating}<Star className="ml-1 inline h-3.5 w-3.5 fill-amber-400 text-amber-400" /></span><div className="h-8 min-w-16 sm:min-w-24">{hasHistory && <ResponsiveContainer width="100%" height="100%"><LineChart data={row.series}><Line type="monotone" dataKey="value" stroke={risk ? '#C2413A' : '#D4A72C'} strokeWidth={2.5} dot={false} isAnimationActive={false} /></LineChart></ResponsiveContainer>}</div><span className="text-right text-xs leading-5 text-slate-500"><strong className="text-slate-900">{row.current === null ? '—' : `${row.current}%`}</strong> {t('dashboard.cockpit.approved.ratingsBefore')} {row.previous === null ? '—' : `${row.previous}%`} {risk && <span className="ml-2 rounded-full bg-red-50 px-2 py-1 text-red-700">{t('dashboard.cockpit.approved.ratingsAttention')}</span>}</span></div>; })}</div>{needsAttention && <div className="mt-5 flex gap-3 rounded-lg border border-red-100 bg-red-50 p-4 text-sm leading-5 text-red-950"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-700" /><p>{t('dashboard.cockpit.approved.ratingsShift', { fiveBefore: five.previous, fiveNow: five.current, lowBefore: lowPrevious, lowNow: lowCurrent })}</p></div>}<SampleSourceNote snapshot={snapshot} /></>}</CardContent></Card>;
};

/**
 * A nota e o total nunca faltam: são lidos do próprio perfil e ficam sempre.
 * O que falta às vezes é o que vem da amostra, e era isso que desenhava um
 * traço solto no lugar das barras e dois mosaicos com um traço cada. Cada uma
 * dessas duas metades encolhe para a sua linha honesta, em vez de ocupar o
 * espaço de quando tem conteúdo.
 */
const ReputationCard = ({ snapshot }: { snapshot: ExperimentalApifySnapshot }) => {
  const { t } = useOwnerTranslation();
  const replyHours = snapshot.sample.insights?.averageResponseHours;
  const last30 = snapshot.sample.insights?.reviewsLast30Days;
  const hasDistribution = snapshot.sample.reviewCount > 0;
  const semMedidas = (replyHours === null || replyHours === undefined) && (last30 === null || last30 === undefined);
  return <Card className="border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]"><CardContent className="p-5"><div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1"><h2 className="font-semibold text-slate-950">{t('dashboard.cockpit.approved.reputationTitle')}</h2><span className="text-xs text-slate-500">{t('dashboard.cockpit.approved.reputationFreshness')}</span></div><div className="mt-4 hidden items-end gap-3 lg:flex"><p className="text-4xl font-medium tracking-tight text-slate-950">{decimal.format(snapshot.business.googleRating)}</p><Stars rating={Math.round(snapshot.business.googleRating)} medium /></div><p className="mt-1 hidden text-sm text-slate-600 lg:block">{integer.format(snapshot.business.googleReviewCount)} {t('dashboard.cockpit.approved.reviewsTotal')}</p>{hasDistribution ? <div className="mt-5 space-y-2">{ratings.map((rating) => { const count = snapshot.sample.ratingBreakdown[rating]; const width = Math.round((count / snapshot.sample.reviewCount) * 100); return <div key={rating} className="grid grid-cols-[28px_1fr_36px] items-center gap-2 text-xs"><span>{rating}★</span><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={`${Number(rating) <= 2 ? 'bg-red-500' : 'bg-amber-400'} h-full rounded-full`} style={{ width: `${width}%` }} /></div><span className="text-right text-slate-600">{width}%</span></div>; })}</div> : <p className="mt-2 text-sm text-slate-500">{t('dashboard.cockpit.approved.reputationBreakdownEmpty')}</p>}{semMedidas ? <p className="mt-2 text-sm text-slate-500">{t('dashboard.cockpit.approved.reputationMetricsEmpty')}</p> : <div className="mt-5 grid grid-cols-2 gap-3"><Metric label={t('dashboard.cockpit.layout.averageReplyTime')} value={replyHours === null || replyHours === undefined ? '—' : `${Math.round(replyHours)} h`} /><Metric label={t('dashboard.cockpit.layout.newReviews30d')} value={last30 === null || last30 === undefined ? '—' : `+${last30}`} tone="positive" /></div>}<SampleSourceNote snapshot={snapshot} /></CardContent></Card>;
};

const Metric = ({ label, value, tone }: { label: string; value: string; tone?: 'positive' }) => <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs leading-4 text-slate-500">{label}</p><p className={`mt-2 text-xl font-semibold ${tone === 'positive' ? 'text-emerald-700' : 'text-slate-950'}`}>{value}</p></div>;

/*
 * Aqui vivia o cartão "Resumo no WhatsApp" da coluna lateral, removido em
 * 31/08/2026 por decisão de Marcelo. Ele era um atalho para a configuração que
 * agora tem destino próprio no menu (`/whatsapp`), e repetia na lateral aquilo
 * que o menu passou a dizer melhor. Ver "Painel que cabe no celular" no
 * contrato de produto.
 */

const DailyPractice = ({ snapshot }: { snapshot: ExperimentalApifySnapshot }) => {
  const { t } = useOwnerTranslation();
  const reading = getAdvisorReading(snapshot);
  const unresolved = (snapshot.sample.observedReviews?.items || []).filter((review) => !review.responseObserved).length;
  // O destino do CTA acompanha o texto: "Ver QR Codes" tinha o rótulo certo
  // mas sempre levava para a fila (herdado de quando só existia setTab para
  // a aba de avaliações). Cada variante aponta para a âncora que o próprio
  // texto promete.
  //
  // O rótulo da variante de oportunidade era "Plano de hoje", nome do cartão
  // que saiu em 31/08/2026. Ele já apontava para a fila, então passa a dizer o
  // que faz, com o mesmo rótulo da variante de força observada.
  const practice = reading.kind === 'opportunity'
    ? { title: t('dashboard.advisorPilot.opportunityBody', { phrase: reading.phrase, mentions: reading.mentions }), body: t('dashboard.advisorPilot.opportunityAction'), action: t('dashboard.advisorPilot.reviewEvidence'), target: QUEUE_ANCHOR_ID }
    : reading.kind === 'strength'
      ? { title: t('dashboard.advisorPilot.strengthBody', { topic: t(`dashboard.cockpit.topicLabels.${reading.topic}`), mentions: reading.mentions }), body: t('dashboard.advisorPilot.strengthAction', { topic: t(`dashboard.cockpit.topicLabels.${reading.topic}`) }), action: t('dashboard.advisorPilot.reviewEvidence'), target: QUEUE_ANCHOR_ID }
    : unresolved ? { title: t('dashboard.cockpit.approved.practiceUnansweredTitle', { count: unresolved }), body: t('dashboard.cockpit.approved.practiceUnansweredBody'), action: t('dashboard.cockpit.approved.practiceUnansweredAction'), target: QUEUE_ANCHOR_ID } : { title: t('dashboard.cockpit.approved.practicePhotoTitle'), body: t('dashboard.cockpit.approved.practicePhotoBody'), action: t('dashboard.cockpit.approved.practicePhotoAction'), target: QR_ANCHOR_ID };
  return <Card className="border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]"><CardContent className="p-5"><h2 className="font-semibold text-slate-950">{t('dashboard.cockpit.approved.practiceTitle')}</h2><p className="mt-4 font-medium text-slate-900">{practice.title}</p><p className="mt-1 text-sm leading-5 text-slate-600">{practice.body}</p><Button asChild variant="link" className="mt-2 h-auto px-0 text-[#2457D6]"><a href={`#${practice.target}`}>{practice.action}<ChevronRight className="ml-1 h-4 w-4" /></a></Button></CardContent></Card>;
};

/*
 * Aqui vivia "O que falta no seu perfil do Google" (completude do perfil),
 * removido em 31/08/2026 por decisão de Marcelo. Sem a ligação oficial ele
 * nunca teve o que medir: em toda conta real desenhava um traço e uma barra a
 * zero, e uma barra vazia não é um estado neutro, é uma acusação sem prova.
 */

/**
 * Sem semana nenhuma, a caixa do gráfico continuava a ocupar a linha inteira
 * vazia ao lado do texto. Encolhe pela mesma regra: fica a linha honesta e mais
 * nada.
 */
const WeeklyChange = ({ weeks }: { weeks: Week[] }) => {
  const current = weeks.at(-1)?.ownerReplies || 0;
  const { t } = useOwnerTranslation();
  const semEvidencia = weeks.length === 0;
  return <Card className="border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]"><CardContent className="p-5"><div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1"><h2 className="font-semibold text-slate-950">{t('dashboard.cockpit.approved.weekTitle')}</h2>{semEvidencia ? null : <span className="text-xs text-slate-500">{t('dashboard.cockpit.approved.weekWindow')}</span>}</div>{semEvidencia ? <p className="mt-2 text-sm text-slate-500">{t('whatsappPilot.weeklyChangeEmpty')}</p> : <div className="mt-4 flex items-center gap-3"><div className="h-8 w-20"><ResponsiveContainer width="100%" height="100%"><LineChart data={weeks}><Line type="monotone" dataKey="ownerReplies" stroke="#2457D6" strokeWidth={2.5} dot={false} isAnimationActive={false} /></LineChart></ResponsiveContainer></div><p className="text-sm leading-5 text-slate-600">{current ? t('dashboard.cockpit.approved.weekReplies', { count: current }) : t('whatsappPilot.weeklyChangeEmpty')}</p></div>}</CardContent></Card>;
};

/*
 * Aqui vivia "Deu resultado?" (resultado observado), removido em 31/08/2026 por
 * decisão de Marcelo. Ele só tinha o que dizer depois de o dono marcar uma ação
 * E de chegar uma leitura seguinte, o que nunca aconteceu numa conta real; até
 * lá ocupava um cartão inteiro para dizer que ainda não sabe.
 */

/**
 * Zero aberturas é evidência: o QR está na mesa e ninguém o leu. Nenhuma
 * leitura de funil é outra coisa, e era essa que desenhava dois mosaicos com um
 * traço em cada. Só a segunda encolhe.
 */
const QrCard = ({ funnel }: { funnel: { qrOpens: number; googleClicks: number } | null }) => {
  const { t } = useOwnerTranslation();
  const semEvidencia = funnel === null;
  return <Card className="border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]"><CardContent className="p-5"><h2 className="text-lg font-semibold text-slate-950">{t('dashboard.cockpit.approved.qrTitle')}</h2>{semEvidencia ? <p className="mt-2 text-sm text-slate-500">{t('dashboard.cockpit.approved.qrEmpty')}</p> : <dl className="mt-5 space-y-3"><div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"><dt className="text-sm text-slate-600">{t('dashboard.cockpit.approved.qrOpened')}</dt><dd className="font-semibold text-slate-950">{funnel.qrOpens}</dd></div><div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"><dt className="text-sm text-slate-600">{t('dashboard.cockpit.approved.qrClicked')}</dt><dd className="font-semibold text-slate-950">{funnel.googleClicks}</dd></div></dl>}</CardContent></Card>;
};

/**
 * Sem tema nenhum, este cartão gastava uma tela inteira de telemóvel para
 * mostrar um traço. O contrato exige que o módulo continue presente sem
 * evidência; não exige que ele ocupe o mesmo espaço de quando tem conteúdo.
 * Encolhido, ele continua visível e para de empurrar o resto para baixo.
 */
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
  return <Card className="border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]"><CardContent className="p-5"><h2 className="text-lg font-semibold text-slate-950">{t('dashboard.cockpit.layout.topicsTitle')}</h2>{topics.length ? <div className="mt-5 flex flex-wrap gap-2">{topics.map((topic) => <span key={topic.id} className={`rounded-full px-3 py-1.5 text-xs font-medium ${topic.sentiment === 'negative' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>{t(`dashboard.cockpit.topicLabels.${topic.id}`)} · {topic.count}</span>)}</div> : <p className="mt-2 text-sm text-slate-500">{t('dashboard.cockpit.approved.topicsEmpty')}</p>}{topics.length ? <>{detail && <div className="mt-5 border-t border-slate-200 pt-4">{detail}</div>}<SampleSourceNote snapshot={snapshot} /></> : null}</CardContent></Card>;
};

export default ApprovedCockpitDashboard;
