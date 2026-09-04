import { AlertTriangle, Star } from 'lucide-react';
import { Line, LineChart, ResponsiveContainer } from 'recharts';
import { Card, CardContent } from '@/components/ui/card';
import type { ExperimentalApifySnapshot } from '@/lib/experimentalApifySnapshot';
import { useOwnerTranslation } from '@/i18n/owner/useOwnerTranslation';
import { Stars } from '@/components/dashboard/Stars';
import { SampleSourceNote } from '@/components/dashboard/NotaDaAmostra';
import { decimal, integer } from '@/components/dashboard/formatos';

/**
 * OS CARTOES QUE LEEM A REPUTACAO, em ficheiro proprio.
 *
 * Segunda costura tirada de `ApprovedCockpitDashboard.tsx` em 04/09/2026. A
 * primeira foi a fila de respostas; esta e a leitura: volume de avaliacoes,
 * cada nota separada, o cartao da reputacao e a mudanca da semana.
 *
 * SAO UMA COISA SO porque partilham a mesma materia — as semanas (`Week`) e a
 * distribuicao por nota — e as mesmas regras de honestidade sobre quando ha
 * evidencia suficiente para dizer alguma coisa. `MINIMO_DE_AVALIACOES` vive
 * aqui porque so estes cartoes o consultam.
 *
 * `Week` e `Rating` sao exportados: o painel continua a MONTAR as semanas a
 * partir do retrato, e passa-as para ca prontas.
 */
export type Rating = '1' | '2' | '3' | '4' | '5';

export type Week = { start: string; reviewCount: number; ratingBreakdown: Record<Rating, number>; ownerReplies: number };

const ratings: Rating[] = ['5', '4', '3', '2', '1'];

const share = (weeks: Week[], rating: Rating) => weeks.reduce((sum, week) => sum + week.ratingBreakdown[rating], 0) / Math.max(1, weeks.reduce((sum, week) => sum + week.reviewCount, 0));

/**
 * Quantas avaliações a leitura precisa de ter atrás dela para as cinco linhas
 * deste cartão dizerem alguma coisa.
 *
 * VINTE, decidido em 01/09/2026 depois de o dono ver o cartão na conta dele.
 * Ele tem 10 avaliações, todas da mesma nota, e o que estava na tela era
 * 100% / 0% / 0% / 0% / 0% com cinco linhas rectas. Não era um erro de
 * cálculo: era a aritmética a funcionar em cima de quase nada.
 *
 * A conta que fixa o número: uma percentagem repartida por cinco notas move-se
 * em degraus de 100/N pontos. Com 10 avaliações o degrau é de 10 pontos, e o
 * próprio cartão chama "atenção" a qualquer descida das 5 estrelas ou subida
 * das notas 1 e 2. Abaixo de 20, portanto, o gráfico anuncia a CHEGADA de uma
 * avaliação como se fosse uma mudança do negócio, que é a definição de ruído
 * com ar de informação. A 20 o degrau desce para 5 pontos, e as duas janelas
 * de quatro semanas que o cartão compara passam a ter conteúdo de sobra.
 *
 * O módulo continua PRESENTE, como o contrato exige: encolhe para a linha
 * honesta dos outros cartões e diz porquê, com o número que ele tem hoje e o
 * número a partir do qual o gráfico aparece.
 */
const MINIMO_DE_AVALIACOES = 20;

/**
 * Sem semana nenhuma no histórico este cartão desenhava uma caixa de gráfico
 * vazia, um traço no lugar do número e a janela de "12 semanas" a prometer uma
 * leitura que não existe. O padrão de 31/08/2026 é o mesmo dos "Temas mais
 * citados": o módulo continua presente, encolhido numa linha honesta que diz o
 * que aparece ali e o que o dono faz para que apareça.
 */
export const VolumeCard = ({ weeks }: { weeks: Week[] }) => {
  const { t } = useOwnerTranslation();
  const semEvidencia = weeks.length === 0;
  const current = weeks.at(-1) || { reviewCount: 0 };
  const previous = weeks.slice(-9, -1);
  const average = previous.length ? previous.reduce((sum, week) => sum + week.reviewCount, 0) / previous.length : 0;
  const change = !semEvidencia && average > 0 ? Math.round(((current.reviewCount - average) / average) * 100) : null;
  return <Card className="border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]"><CardContent className="p-4 sm:p-5"><div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1"><h2 className="text-lg font-semibold text-slate-950">{t('dashboard.cockpit.layout.volumeTitle')}</h2>{semEvidencia ? null : <span className="whitespace-nowrap text-xs text-slate-500">{t('dashboard.cockpit.approved.volumeWindow')}</span>}</div>{semEvidencia ? <p className="mt-2 text-sm text-slate-500">{t('dashboard.cockpit.approved.volumeEmpty')}</p> : <><div className="mt-4 flex flex-col gap-3 sm:mt-5 sm:flex-row sm:items-center sm:gap-4"><div className="h-12 w-full shrink-0 sm:w-40 lg:w-72"><ResponsiveContainer width="100%" height="100%"><LineChart data={weeks}><Line type="monotone" dataKey="reviewCount" stroke="#2457D6" strokeWidth={3} dot={false} isAnimationActive={false} /></LineChart></ResponsiveContainer></div><p className="text-lg font-semibold text-slate-950">{current.reviewCount} <span className="text-sm font-normal text-slate-600">{t('dashboard.cockpit.approved.volumeThisWeek', { count: current.reviewCount })} {t('dashboard.cockpit.approved.volumeAverage', { average: Math.round(average) })}</span></p></div>{change !== null && change <= -25 && <div className="mt-5 flex gap-3 rounded-lg border border-red-100 bg-red-50 p-4 text-sm leading-5 text-red-950"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-700" /><p><strong>{t('dashboard.cockpit.approved.volumeDrop', { percent: Math.abs(change) })}</strong> {t('dashboard.cockpit.approved.volumeDropRest')}</p></div>}</>}</CardContent></Card>;
};

/**
 * Sem histórico e sem distribuição na amostra, as cinco linhas deste cartão
 * desenhavam um traço no lugar da percentagem de hoje e outro no lugar da de
 * antes, cinco vezes, com cinco caixas de gráfico vazias: era o módulo mais
 * alto do painel a dizer que não sabia nada.
 *
 * Desde 01/09/2026 há um segundo motivo para encolher, e ele é diferente do
 * primeiro: a leitura EXISTE mas é pequena demais para ser lida. Os dois
 * motivos dão a mesma forma (a linha honesta) e frases diferentes, porque o
 * que o dono faz a seguir é diferente: num caso falta o Binno procurar, no
 * outro faltam avaliações e o que ele faz é pôr o QR na mesa.
 *
 * `avaliacoesLidas` é a base de que as percentagens saem, e não um total
 * qualquer do perfil: é a amostra que o Binno buscou, a mesma que a nota de
 * rodapé deste cartão já nomeia, e as semanas do histórico são um recorte
 * dela. Sem amostra, cai nas avaliações das oito semanas que o cartão compara.
 *
 * Medir a amostra, e não a janela, é também o que faz o número na frase ser um
 * número que o dono reconhece: ele sabe quantas avaliações tem, não quantas
 * caíram dentro das últimas oito semanas.
 */
export const RatingTrends = ({ weeks, snapshot }: { weeks: Week[]; snapshot: ExperimentalApifySnapshot }) => {
  const { t } = useOwnerTranslation();
  const hasHistory = weeks.length > 0;
  const current = weeks.slice(-4);
  const previous = weeks.slice(-8, -4);
  const hasDistribution = snapshot.sample.reviewCount > 0;
  const semLeitura = !hasHistory && !hasDistribution;
  const avaliacoesLidas = hasDistribution
    ? snapshot.sample.reviewCount
    : weeks.slice(-8).reduce((total, week) => total + week.reviewCount, 0);
  const poucasAvaliacoes = !semLeitura && avaliacoesLidas < MINIMO_DE_AVALIACOES;
  /*
   * DUAS PERGUNTAS DIFERENTES, e so uma delas precisa de vinte avaliacoes.
   *
   * Ate 03/09/2026 este cartao escondia TUDO abaixo de 20. Marcelo reclamou
   * cinco vezes, e tinha razao: o cartao chama-se "Cada nota separada", e ao
   * lado dele o cartao da reputacao ja mostrava exactamente isso — 70% de
   * cinco estrelas, 30% de quatro — com as mesmas 10 avaliacoes. Um cartao
   * dizia "espere por 20" enquanto o vizinho mostrava a resposta.
   *
   * A divisao de HOJE e uma contagem: com 10 avaliacoes, 70% e 70%, exacto.
   * Nao ha ruido nenhum em dizer o que se tem.
   *
   * O que precisa de volume e a COMPARACAO: esta janela contra a anterior, e o
   * alerta que dela sai. Ai sim, com 10 avaliacoes o degrau e de 10 pontos e a
   * chegada de UMA avaliacao aparece como uma mudanca do negocio — ruido com ar
   * de informacao, que foi o motivo original do limiar e continua valido.
   *
   * Entao: a divisao aparece sempre que existir, a comparacao espera pelas 20.
   */
  const comparacaoDisponivel = hasHistory && !poucasAvaliacoes;
  const semEvidencia = semLeitura;
  const rows = ratings.map((rating) => ({ rating, current: hasHistory ? Math.round(share(current, rating) * 100) : hasDistribution ? Math.round((snapshot.sample.ratingBreakdown[rating] / snapshot.sample.reviewCount) * 100) : null, previous: comparacaoDisponivel ? Math.round(share(previous, rating) * 100) : null, series: weeks.map((week) => ({ value: week.reviewCount ? Math.round((week.ratingBreakdown[rating] / week.reviewCount) * 100) : 0 })) }));
  const five = rows[0];
  const lowCurrent = rows.filter((row) => row.rating === '1' || row.rating === '2').reduce((sum, row) => sum + (row.current || 0), 0);
  const lowPrevious = rows.filter((row) => row.rating === '1' || row.rating === '2').reduce((sum, row) => sum + (row.previous || 0), 0);
  const needsAttention = comparacaoDisponivel && (five.current < (five.previous || 0) || lowCurrent > lowPrevious);
  return <Card className="border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]"><CardContent className="p-4 sm:p-5"><div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1"><h2 className="text-lg font-semibold text-slate-950">{t('dashboard.cockpit.layout.distributionTitle')}</h2>{semEvidencia ? null : <span className="text-xs text-slate-500">{t('dashboard.cockpit.approved.ratingsNoStacking')}</span>}</div>{semEvidencia ? <p className="mt-2 text-sm text-slate-500">{semLeitura ? t('dashboard.cockpit.approved.distributionEmpty') : t('dashboard.cockpit.approved.distributionTooFew', { count: avaliacoesLidas, minimo: MINIMO_DE_AVALIACOES })}</p> : <><div className="mt-5 divide-y divide-slate-200">{rows.map((row) => { const risk = comparacaoDisponivel && row.current !== null && (row.rating === '5' ? row.current < (row.previous || 0) : Number(row.rating) <= 2 && row.current > (row.previous || 0)); return <div key={row.rating} className="grid grid-cols-[32px_minmax(0,1fr)_104px] items-center gap-2 py-3 sm:grid-cols-[52px_minmax(0,1fr)_208px] sm:gap-3"><span className="text-sm font-semibold text-slate-800">{row.rating}<Star className="ml-1 inline h-3.5 w-3.5 fill-amber-400 text-amber-400" /></span><div className="h-8 min-w-16 sm:min-w-24">{comparacaoDisponivel && <ResponsiveContainer width="100%" height="100%"><LineChart data={row.series}><Line type="monotone" dataKey="value" stroke={risk ? '#C2413A' : '#D4A72C'} strokeWidth={2.5} dot={false} isAnimationActive={false} /></LineChart></ResponsiveContainer>}</div><span className="text-right text-xs leading-5 text-slate-500"><strong className="text-slate-900">{row.current === null ? '—' : `${row.current}%`}</strong> {comparacaoDisponivel && <>{t('dashboard.cockpit.approved.ratingsBefore')} {row.previous === null ? '—' : `${row.previous}%`}</>} {risk && <span className="ml-2 rounded-full bg-red-50 px-2 py-1 text-red-700">{t('dashboard.cockpit.approved.ratingsAttention')}</span>}</span></div>; })}</div>{needsAttention && <div className="mt-5 flex gap-3 rounded-lg border border-red-100 bg-red-50 p-4 text-sm leading-5 text-red-950"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-700" /><p>{t('dashboard.cockpit.approved.ratingsShift', { fiveBefore: five.previous, fiveNow: five.current, lowBefore: lowPrevious, lowNow: lowCurrent })}</p></div>}{poucasAvaliacoes && <p className="mt-4 text-sm text-slate-500">{t('dashboard.cockpit.approved.distributionComparisonFrom', { count: avaliacoesLidas, minimo: MINIMO_DE_AVALIACOES })}</p>}<SampleSourceNote snapshot={snapshot} /></>}</CardContent></Card>;
};

/**
 * A nota e o total nunca faltam: são lidos do próprio perfil e ficam sempre.
 * O que falta às vezes é o que vem da amostra, e era isso que desenhava um
 * traço solto no lugar das barras e dois mosaicos com um traço cada. Cada uma
 * dessas duas metades encolhe para a sua linha honesta, em vez de ocupar o
 * espaço de quando tem conteúdo.
 */
export const ReputationCard = ({ snapshot }: { snapshot: ExperimentalApifySnapshot }) => {
  const { t } = useOwnerTranslation();
  const replyHours = snapshot.sample.insights?.averageResponseHours;
  const last30 = snapshot.sample.insights?.reviewsLast30Days;
  const hasDistribution = snapshot.sample.reviewCount > 0;
  const semMedidas = (replyHours === null || replyHours === undefined) && (last30 === null || last30 === undefined);
  return <Card className="border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]"><CardContent className="p-4 sm:p-5"><div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1"><h2 className="text-lg font-semibold text-slate-950">{t('dashboard.cockpit.approved.reputationTitle')}</h2><span className="text-xs text-slate-500">{t('dashboard.cockpit.approved.reputationFreshness')}</span></div><div className="mt-4 hidden items-end gap-3 lg:flex"><p className="text-4xl font-medium tracking-tight text-slate-950">{decimal.format(snapshot.business.googleRating)}</p><Stars rating={Math.round(snapshot.business.googleRating)} medium /></div><p className="mt-1 hidden text-sm text-slate-600 lg:block">{integer.format(snapshot.business.googleReviewCount)} {t('dashboard.cockpit.approved.reviewsTotal')}</p>{hasDistribution ? <div className="mt-5 space-y-2">{ratings.map((rating) => { const count = snapshot.sample.ratingBreakdown[rating]; const width = Math.round((count / snapshot.sample.reviewCount) * 100); return <div key={rating} className="grid grid-cols-[28px_1fr_36px] items-center gap-2 text-xs"><span>{rating}★</span><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={`${Number(rating) <= 2 ? 'bg-red-500' : 'bg-amber-400'} h-full rounded-full`} style={{ width: `${width}%` }} /></div><span className="text-right text-slate-600">{width}%</span></div>; })}</div> : <p className="mt-2 text-sm text-slate-500">{t('dashboard.cockpit.approved.reputationBreakdownEmpty')}</p>}{semMedidas ? <p className="mt-2 text-sm text-slate-500">{t('dashboard.cockpit.approved.reputationMetricsEmpty')}</p> : <div className="mt-5 grid grid-cols-2 gap-3"><Metric label={t('dashboard.cockpit.layout.averageReplyTime')} value={replyHours === null || replyHours === undefined ? '—' : `${Math.round(replyHours)} h`} /><Metric label={t('dashboard.cockpit.layout.newReviews30d')} value={last30 === null || last30 === undefined ? '—' : `+${last30}`} tone="positive" /></div>}<SampleSourceNote snapshot={snapshot} /></CardContent></Card>;
};

export const Metric = ({ label, value, tone }: { label: string; value: string; tone?: 'positive' }) => <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs leading-4 text-slate-500">{label}</p><p className={`mt-2 text-xl font-semibold ${tone === 'positive' ? 'text-emerald-700' : 'text-slate-950'}`}>{value}</p></div>;

/*
 * Aqui vivia o cartão "Resumo no WhatsApp" da coluna lateral, removido em
 * 31/08/2026 por decisão de Marcelo. Ele era um atalho para a configuração que
 * agora tem destino próprio no menu (`/whatsapp`), e repetia na lateral aquilo
 * que o menu passou a dizer melhor. Ver "Painel que cabe no celular" no
 * contrato de produto.
 */

/**
 * Sem semana nenhuma, a caixa do gráfico continuava a ocupar a linha inteira
 * vazia ao lado do texto. Encolhe pela mesma regra: fica a linha honesta e mais
 * nada.
 */
export const WeeklyChange = ({ weeks }: { weeks: Week[] }) => {
  const current = weeks.at(-1)?.ownerReplies || 0;
  const { t } = useOwnerTranslation();
  const semEvidencia = weeks.length === 0;
  return <Card className="border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]"><CardContent className="p-4 sm:p-5"><div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1"><h2 className="text-lg font-semibold text-slate-950">{t('dashboard.cockpit.approved.weekTitle')}</h2>{semEvidencia ? null : <span className="text-xs text-slate-500">{t('dashboard.cockpit.approved.weekWindow')}</span>}</div>{semEvidencia ? <p className="mt-2 text-sm text-slate-500">{t('whatsappPilot.weeklyChangeEmpty')}</p> : <div className="mt-4 flex items-center gap-3"><div className="h-8 w-20"><ResponsiveContainer width="100%" height="100%"><LineChart data={weeks}><Line type="monotone" dataKey="ownerReplies" stroke="#2457D6" strokeWidth={2.5} dot={false} isAnimationActive={false} /></LineChart></ResponsiveContainer></div><p className="text-sm leading-5 text-slate-600">{current ? t('dashboard.cockpit.approved.weekReplies', { count: current }) : t('whatsappPilot.weeklyChangeEmpty')}</p></div>}</CardContent></Card>;
};

/*
 * Aqui vivia "Deu resultado?" (resultado observado), removido em 31/08/2026 por
 * decisão de Marcelo. Ele só tinha o que dizer depois de o dono marcar uma ação
 * E de chegar uma leitura seguinte, o que nunca aconteceu numa conta real; até
 * lá ocupava um cartão inteiro para dizer que ainda não sabe.
 */