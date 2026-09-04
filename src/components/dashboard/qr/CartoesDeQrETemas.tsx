import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import type { ExperimentalApifySnapshot } from '@/lib/experimentalApifySnapshot';
import { useOwnerTranslation } from '@/i18n/owner/useOwnerTranslation';
import { SampleSourceNote } from '@/components/dashboard/NotaDaAmostra';
import {
  avaliacoesComTexto,
  chaveDoRetrato,
  MINIMO_DE_AVALIACOES as MINIMO_PARA_TEMAS,
  pedirTemas,
  temasGuardados,
  temasNaTela,
  type ResultadoDosTemas,
  type TemaDoModelo,
} from '@/lib/temasDoModelo';
import { pedirTemasAoBinno } from '@/lib/temasDasAvaliacoes';
import { getAdvisorReading } from '@/lib/advisorReading';

/**
 * O QR E OS TEMAS, em ficheiro proprio.
 *
 * Terceira costura tirada de `ApprovedCockpitDashboard.tsx` em 04/09/2026.
 * Estes dois cartoes vivem sob a mesma ancora no painel (`qr-e-temas`) e
 * respondem a mesma pergunta: o que o QR trouxe, e do que os clientes falam.
 */
/**
 * Zero aberturas é evidência: o QR está na mesa e ninguém o leu. Nenhuma
 * leitura de funil é outra coisa, e era essa que desenhava dois mosaicos com um
 * traço em cada. Só a segunda encolhe.
 */
export const QrCard = ({ funnel }: { funnel: { qrOpens: number; googleClicks: number } | null }) => {
  const { t } = useOwnerTranslation();
  const semEvidencia = funnel === null;
  return <Card className="border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]"><CardContent className="p-4 sm:p-5"><h2 className="text-lg font-semibold text-slate-950">{t('dashboard.cockpit.approved.qrTitle')}</h2>{semEvidencia ? <p className="mt-2 text-sm text-slate-500">{t('dashboard.cockpit.approved.qrEmpty')}</p> : <dl className="mt-5 space-y-3"><div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"><dt className="text-sm text-slate-600">{t('dashboard.cockpit.approved.qrOpened')}</dt><dd className="font-semibold text-slate-950">{funnel.qrOpens}</dd></div><div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"><dt className="text-sm text-slate-600">{t('dashboard.cockpit.approved.qrClicked')}</dt><dd className="font-semibold text-slate-950">{funnel.googleClicks}</dd></div></dl>}</CardContent></Card>;
};

/**
 * Sem tema nenhum, este cartão gastava uma tela inteira de telemóvel para
 * mostrar um traço. O contrato exige que o módulo continue presente sem
 * evidência; não exige que ele ocupe o mesmo espaço de quando tem conteúdo.
 * Encolhido, ele continua visível e para de empurrar o resto para baixo.
 */
export const TopicsCard = ({ snapshot, userId, demo = false }: { snapshot: ExperimentalApifySnapshot; userId?: string; demo?: boolean }) => {
  const { t, i18n } = useOwnerTranslation();
  /**
   * O CHÃO: os temas por palavra-chave, que continuam a existir.
   *
   * São sete gavetas de vocabulário de restaurante, e para um restaurante em
   * que elas acertem continuam a servir. Ficam por baixo do que o modelo
   * agrupa, e não no lugar dele, porque apagá-las seria trocar uma leitura
   * grátis e determinística por uma que depende de rede.
   */
  const porPalavraChave: TemaDoModelo[] = (snapshot.sample.insights?.topics || []).map((topic) => ({
    rotulo: t(`dashboard.cockpit.topicLabels.${topic.id}`),
    contagem: topic.count,
    sentimento: topic.sentiment === 'negative' ? 'negativo' : topic.sentiment === 'positive' ? 'positivo' : 'misto',
  }));
  const [doModelo, setDoModelo] = useState<ResultadoDosTemas | undefined>(undefined);
  const avaliacoes = useMemo(
    () => avaliacoesComTexto(snapshot.sample.observedReviews?.items),
    [snapshot.sample.observedReviews],
  );
  const chave = chaveDoRetrato(snapshot.business.placeId, snapshot.fetchedAt);

  useEffect(() => {
    // A demonstração pública não paga chamada nenhuma: não há dono, e o
    // retrato dela é escrito à mão com temas já dentro.
    if (demo || !userId) return;
    // Sem texto suficiente não há o que agrupar, e a função devolveria
    // `POUCO_TEXTO`. Perguntar antes de pagar é a diferença entre um limite e
    // uma factura.
    if (avaliacoes.length < MINIMO_PARA_TEMAS) return;
    const guardado = temasGuardados(chave);
    if (guardado) {
      setDoModelo(guardado);
      return;
    }
    let vivo = true;
    setDoModelo({ origem: 'pedindo' });
    void pedirTemas(
      chave,
      { reviews: avaliacoes, businessName: snapshot.business.name, idioma: i18n.language },
      pedirTemasAoBinno,
    ).then((resultado) => { if (vivo) setDoModelo(resultado); });
    return () => { vivo = false; };
  }, [chave, demo, userId, avaliacoes, snapshot.business.name, i18n.language]);

  const naTela = temasNaTela(doModelo, porPalavraChave);
  const reading = getAdvisorReading(snapshot);
  const detail = reading.kind === 'alert'
    ? <><p className="text-xs font-semibold text-red-700">{t('dashboard.advisorPilot.alertTitle')}</p><p className="mt-1 text-sm leading-5 text-slate-700">{t('dashboard.advisorPilot.alertBody', { low: reading.lowRatingCount, topic: t(`dashboard.cockpit.topicLabels.${reading.topic}`), mentions: reading.mentions })}</p></>
    : reading.kind === 'opportunity'
      ? <><p className="text-xs font-semibold text-emerald-700">{t('dashboard.advisorPilot.opportunityTitle')}</p><p className="mt-1 text-sm leading-5 text-slate-700">{t('dashboard.advisorPilot.opportunityBody', { phrase: reading.phrase, mentions: reading.mentions })}</p></>
      : reading.kind === 'strength'
        ? <><p className="text-xs font-semibold text-emerald-700">{t('dashboard.advisorPilot.opportunityTitle')}</p><p className="mt-1 text-sm leading-5 text-slate-700">{t('dashboard.advisorPilot.strengthBody', { topic: t(`dashboard.cockpit.topicLabels.${reading.topic}`), mentions: reading.mentions })}</p></>
        : null;
  const cor = (sentimento: TemaDoModelo['sentimento']) => sentimento === 'negativo'
    ? 'bg-red-50 text-red-700'
    : sentimento === 'positivo' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700';
  return <Card className="border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]"><CardContent className="p-4 sm:p-5"><h2 className="text-lg font-semibold text-slate-950">{t('dashboard.cockpit.layout.topicsTitle')}</h2>{naTela.temas.length ? <div className="mt-5 flex flex-wrap gap-2">{naTela.temas.map((tema) => <span key={tema.rotulo} className={`rounded-full px-3 py-1.5 text-xs font-medium ${cor(tema.sentimento)}`}>{tema.rotulo} · {tema.contagem}</span>)}</div> : <p className="mt-2 text-sm text-slate-500">{t('dashboard.cockpit.approved.topicsEmpty')}</p>}{naTela.temas.length ? <>{detail && <div className="mt-5 border-t border-slate-200 pt-4">{detail}</div>}<SampleSourceNote snapshot={snapshot} /></> : null}</CardContent></Card>;
};
