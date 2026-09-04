import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { ExperimentalApifySnapshot } from '@/lib/experimentalApifySnapshot';
import { useOwnerTranslation } from '@/i18n/owner/useOwnerTranslation';
import { Stars } from '@/components/dashboard/Stars';
import { Link } from 'react-router-dom';
import { AlertTriangle, ChevronRight } from 'lucide-react';
import { getAdvisorReading } from '@/lib/advisorReading';
import { QR_ANCHOR_ID, QUEUE_ANCHOR_ID } from '@/components/dashboard/ancoras';
import { decimal, integer } from '@/components/dashboard/formatos';
import type { QueueReview } from '@/components/dashboard/reviews/FilaDoPainel';

/**
 * O QUE O DONO VE PRIMEIRO, em ficheiro proprio.
 *
 * Quarta e ultima costura tirada de `ApprovedCockpitDashboard.tsx` em
 * 04/09/2026, a que o poe abaixo do tecto de 350 linhas.
 *
 * Sao os tres blocos que respondem "e agora?": a faixa que resume tudo no
 * celular, o radar do que precisa de atencao hoje, e a pratica diaria. Nenhum
 * deles desenha historico nem distribuicao — isso e dos cartoes de leitura.
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
export const MobileSummary = ({ snapshot, queue, temFila }: { snapshot: ExperimentalApifySnapshot; queue: QueueReview[]; temFila: boolean }) => {
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
export const RadarNow = ({ snapshot }: { snapshot: ExperimentalApifySnapshot }) => {
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
  return <p className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm leading-5 lg:col-span-3 ${urgent ? 'border-red-200 bg-red-50/60 text-red-950' : 'border-violet-200 bg-violet-50/50 text-slate-700'}`}>
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

export const DailyPractice = ({ snapshot }: { snapshot: ExperimentalApifySnapshot }) => {
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
  return <Card className="border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]"><CardContent className="p-4 sm:p-5"><h2 className="text-lg font-semibold text-slate-950">{t('dashboard.cockpit.approved.practiceTitle')}</h2><p className="mt-4 font-medium text-slate-900">{practice.title}</p><p className="mt-1 text-sm leading-5 text-slate-600">{practice.body}</p><Button asChild variant="link" className="mt-2 h-auto px-0 text-[#2457D6]"><a href={`#${practice.target}`}>{practice.action}<ChevronRight className="ml-1 h-4 w-4" /></a></Button></CardContent></Card>;
};

/*
 * Aqui vivia "O que falta no seu perfil do Google" (completude do perfil),
 * removido em 31/08/2026 por decisão de Marcelo. Sem a ligação oficial ele
 * nunca teve o que medir: em toda conta real desenhava um traço e uma barra a
 * zero, e uma barra vazia não é um estado neutro, é uma acusação sem prova.
 */