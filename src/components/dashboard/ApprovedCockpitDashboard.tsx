import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ChevronLeft, ChevronRight, Copy, ExternalLink, Send, Star } from 'lucide-react';
import { toast } from 'sonner';
import { Line, LineChart, ResponsiveContainer } from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import type { ExperimentalApifySnapshot, ExperimentalObservedReview } from '@/lib/experimentalApifySnapshot';
import { useOwnerTranslation } from '@/i18n/owner/useOwnerTranslation';
import { useGoogleBusinessReviewQueue } from '@/hooks/useGoogleBusinessReviewQueue';
import { useReviewFunnelMetrics, type ReviewFunnelMetrics } from '@/hooks/useReviewFunnelMetrics';
import { buildReplySuggestions } from '@/lib/replySuggestions';
import { Stars } from '@/components/dashboard/Stars';
import { ResponseQueue, type QueueReview } from '@/components/dashboard/reviews/FilaDoPainel';
import {
  pedirRascunho,
  rascunhoGuardado,
  rascunhoNaTela,
  type ResultadoDoModelo,
} from '@/lib/rascunhoDoModelo';
import { pedirRascunhoAoBinno } from '@/lib/sugerirResposta';
import OrigemDoRascunho from '@/components/dashboard/OrigemDoRascunho';
import { supabase } from '@/integrations/supabase/client';
import { getAdvisorReading } from '@/lib/advisorReading';
import { useInternalFeedback } from '@/hooks/useInternalFeedback';
import { useExternalLinks } from '@/hooks/useExternalLinks';
import { orderPendingCasesByRecency } from '@/lib/internalCasePriority';
import PendingCommentsBanner from '@/components/dashboard/PendingCommentsBanner';
import { sampleWasTruncated } from '@/lib/reputationSnapshotReading';
import { idDaFila } from '@/lib/filaDeRespostas';
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

type Rating = '1' | '2' | '3' | '4' | '5';
type Week = { start: string; reviewCount: number; ratingBreakdown: Record<Rating, number>; ownerReplies: number };

const ratings: Rating[] = ['5', '4', '3', '2', '1'];
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

/**
 * O piloto Apify entra no MESMO espaço de identificadores da fila somada, com
 * a fonte dele. Antes disto ele passava o id cru, e a fila do painel e a fila
 * de `/reviews` guardavam a mesma avaliação em duas chaves.
 */
const normalizeObserved = (review: ExperimentalObservedReview): QueueReview =>
  ({ ...review, id: idDaFila('piloto-apify', review.id) });

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

const ApprovedCockpitDashboard = ({ snapshot, userId, demo = false, demoFunnel, demoBusinessCountry = null }: { snapshot: ExperimentalApifySnapshot; userId?: string; demo?: boolean; demoFunnel?: ReviewFunnelMetrics; demoBusinessCountry?: string | null }) => {
  // O interruptor de ambiente saiu em 03/09/2026, junto com a aprovação do
  // Google: o hook já devolve fila vazia, sem erro, para quem ainda não ligou
  // a conexão oficial.
  const official = useGoogleBusinessReviewQueue(userId);
  const liveFunnel = useReviewFunnelMetrics(userId);
  const funnel = demoFunnel ? { ...liveFunnel, data: demoFunnel } : liveFunnel;
  // Os comentários internos por tratar, lidos AQUI e não dentro do cartão que
  // os desenha (mudança de 01/09/2026; ver o cabeçalho de
  // `PendingCommentsBanner`). É uma leitura só, a mesma de sempre, e serve
  // duas coisas ao mesmo tempo: o cartão, e a largura que a fila de respostas
  // pode ocupar ao lado dele.
  //
  // Sem `userId` (demonstração pública) o hook nem chega a consultar o banco e
  // devolve lista vazia, que é o mesmo que dizer "não há cartão".
  const internos = useInternalFeedback(userId || '');
  const comentariosInternos = useMemo(
    () => orderPendingCasesByRecency(internos.cases),
    [internos.cases],
  );
  // O link de avaliação do Google, para o convite ao lado do comentário
  // pendente (`PendingCommentsBanner`). MESMA leitura de `platform_links` que
  // as Definições usam; o cartão não lê nada sozinho, recebe por propriedade.
  //
  // O CRITÉRIO É O DE `useSetupStatus`, ELO A ELO: a plataforma diz "google" E
  // o endereço não está vazio. Até 02/09/2026 esta linha exigia só a primeira
  // metade, e o comentário aqui afirmava que eram iguais quando não eram. O
  // dono com uma entrada "Google Reviews" sem endereço e uma "Google Maps" com
  // endereço via o passo a passo dizer que estava completo e o convite dizer
  // para ligar o link: `find` parava na primeira entrada, que não tem URL.
  const { externalLinks } = useExternalLinks(userId, { silent: true });
  const linkDeAvaliacaoDoGoogle = useMemo(
    () => externalLinks.find((link) => link.platform.toLowerCase().includes('google') && !!link.url?.trim())?.url?.trim() || null,
    [externalLinks],
  );
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
  const [paisDoPerfil, setPaisDoPerfil] = useState<string | null>(null);
  /**
   * O país do negócio, de duas origens que nunca se misturam.
   *
   * Com sessão, vem do perfil, lido uma vez. Na demonstração pública não há
   * perfil nenhum, e sem país o molde cai no português de Portugal: em
   * 01/09/2026 Marcelo viu a demonstração dizer "Se puder falar connosco
   * directamente, resolvemos isto consigo" a um público brasileiro, ao lado de
   * avaliações de exemplo já escritas em brasileiro ("prato executivo",
   * "equipe"). O exemplo contradizia-se a si próprio.
   *
   * ISTO É LIDO, E NÃO GUARDADO, e a diferença custou uma correção. A primeira
   * versão fazia `useState(demoBusinessCountry)`, e `useState` só usa o valor
   * inicial: o idioma do site chega um render DEPOIS, porque o hook que o
   * detecta corre num efeito. O estado guardava o `null` do primeiro quadro e
   * nunca mais mudava. Compilava, passava nos guardas, e na tela continuava em
   * português de Portugal. Só apareceu ao abrir a página e ler o texto.
   */
  const businessCountry = demo ? demoBusinessCountry : paisDoPerfil;
  /**
   * "Já se leu o país" é uma pergunta diferente de "qual é o país", e o painel
   * precisava das duas. `businessCountry` nasce `null`, e `null` também é a
   * resposta legítima de quem não tem país gravado: os dois estados eram o
   * mesmo valor.
   *
   * O preço apareceu numa auditoria em 01/09/2026. A fila do piloto Apify já
   * está no retrato quando o painel monta, por isso há avaliação selecionada
   * no primeiro quadro e o pedido do rascunho partia antes do `await` ao
   * perfil, com o país a `null`. O modelo recebia "escreva português de
   * Portugal", o cache do rascunho é por id da avaliação e prende o primeiro
   * resultado à sessão, e o dono brasileiro ficava com a primeira avaliação da
   * fila respondida em português de Portugal ao lado de um molde em pt-BR, na
   * mesma tela. É o defeito que a variante foi corrigir, com o sinal trocado.
   *
   * Em Portugal `null` calha no lado certo, e por isso o piloto não o mostrava.
   */
  const [paisLido, setPaisLido] = useState(false);
  useEffect(() => {
    // Sem sessão não há perfil para esperar, e a espera nunca acabaria.
    if (!userId) { setPaisLido(true); return; }
    let active = true;
    const loadProfile = async () => {
      try {
        const { data } = await supabase.from('profiles').select('business_country').eq('id', userId).maybeSingle();
        if (!active) return;
        setPaisDoPerfil(data?.business_country || null);
      } catch {
        if (!active) return;
        setPaisDoPerfil(null);
      } finally {
        // No `finally` de propósito: uma leitura que falhou também é uma
        // leitura feita, e o painel não pode ficar à espera para sempre.
        if (active) setPaisLido(true);
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
    // `idDaFila` e nao um molde escrito aqui: estas sao as MESMAS linhas de
    // `useGoogleBusinessReviewQueue` que a fila de `/reviews` mostra, e enquanto
    // esta tela passava o `review.id` cru a mesma avaliacao era paga duas vezes
    // e rendia dois textos diferentes nas duas telas. Ver `idDaFila`.
    ? official.reviews.map((review) => ({ id: idDaFila('google-oficial', review.id), idNaFonte: review.id, rating: review.rating, comment: review.comment || '', publishedAt: review.review_updated_at, reviewerName: review.reviewer_name || undefined, responseObserved: Boolean(review.reply_text) }))
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
  // O ESQUELETO das faixas, mudado em 01/09/2026 pelo que o portátil mostrava:
  // "continuamos mal estruturados e com espaços vazios".
  //
  // Até aqui cada faixa era uma coluna larga mais uma lateral fixa de 340px com
  // UM cartão curto dentro. A lateral acabava muito antes da coluna larga, e o
  // que sobrava do lado direito do portátil eram dois retângulos de fundo vazio,
  // de cerca de 340x590 em Mudança e 340x500 em Referência. Era isso que ele
  // estava a ver, e está medido no ecrã, não deduzido do código.
  //
  // Agora cada faixa é a MESMA grade de três colunas, e os cartões emparelham
  // por altura em vez de se empilharem numa lateral: o cartão largo ocupa duas
  // colunas, o cartão curto ocupa a terceira ao lado dele, e o cartão que
  // precisa de largura ocupa a linha inteira por baixo. O buraco deixa de
  // existir porque nenhuma coluna fica sozinha a segurar a altura da faixa.
  //
  // Duas coisas que isto NÃO muda, que são as que o contrato prende:
  //
  // 1. A ordem. As faixas continuam Ação, Mudança e Referência, e cada módulo
  //    continua na faixa que a decisão de 31/08/2026 lhe deu. Dentro da faixa a
  //    sequência do DOM também é a mesma, e é ela que o telemóvel lê: volume,
  //    cada nota, o que mudou; reputação, QR, temas, boas práticas, Radar.
  // 2. A presença. Nenhum módulo saiu, fundiu-se com outro ou trocou de faixa.
  //
  // `items-start` é metade da correção, e não um detalhe: sem ele a grade
  // estica cada cartão até à altura do vizinho mais alto, e o vazio muda de
  // sítio em vez de desaparecer. Era assim que o "Do QR ao Google" ficava com
  // 137px de branco por baixo do último número, dentro do próprio cartão.
  //
  // O traço e o `pt-8` acima de Mudança e de Referência são o que faz as três
  // faixas lerem-se como três grupos. Sem eles todos os intervalos da página
  // mediam quase o mesmo, 24px entre faixas contra 20px entre cartões da mesma
  // faixa, e a fronteira entre "o que fazer" e "o que mudou" era o mesmo
  // acontecimento visual que a fronteira entre dois cartões vizinhos. Não é
  // rótulo: o contrato proíbe escrever "Ação" acima de um cartão que já diz o
  // que é, e um traço não escreve nada.
  return <div className="space-y-8 lg:space-y-10">
    <MobileSummary snapshot={snapshot} queue={queue} temFila={temFila} />

    {/* Ação: o que ele precisa de decidir ou fazer agora.

        A FAIXA DE AÇÃO PASSA A USAR A LARGURA (01/09/2026). Nas palavras de
        Marcelo, no portátil dele: "poderia dividir a tela ao meio e apresentar
        mais coisas na primeira dobra". Até aqui esta faixa era `space-y-4`, e
        os dois cartões dela ocupavam a largura toda um debaixo do outro: a
        1280 ele via "Comentários internos" e "Avaliações no Google", e mais
        nada, na primeira dobra.

        A repartição segue o que cada cartão precisa de ler, e não o tamanho
        que ele calharia ter. A fila é onde o dono lê uma avaliação inteira e
        um rascunho inteiro, e pede largura de texto.

        SEGUNDA MUDANÇA NO MESMO DIA, a pedido de Marcelo: "suba Reputação no
        Google para o lado de Avaliações no Google, assim a pessoa enxerga as
        métricas mais importantes de uma só vez". A Reputação passa a ocupar a
        terceira coluna, ao lado da fila.

        Isso resolveu de caminho o que a primeira mudança tinha resolvido com
        uma condicional. Nessa altura o único candidato à terceira coluna era o
        cartão de comentários internos, que DESAPARECE numa conta em dia, e por
        isso a fila trocava de largura para não deixar um terço vazio. A
        Reputação está sempre lá: a coluna estreita deixou de poder ficar vazia
        e a largura variável deixou de ter o que resolver. Uma largura
        condicional agora seria pior, porque sem comentário interno a fila
        esticava por cima da Reputação.

        O bloco de comentários passou a atravessar a faixa inteira, acima dos
        dois. A ORDEM NÃO MUDA, e é o que o contrato prende: ele continua
        primeiro no DOM, que é a ordem que o telemóvel lê, porque um comentário
        privado com nota baixa expira e o cliente ainda está lá. No telemóvel a
        faixa empilha na ordem da decisão: o que expira, depois o que ele abriu
        o painel para fazer, e a leitura por último. */}
    <section data-faixa="acao" className="grid items-start gap-4 lg:grid-cols-3">
      {radarEmAcao && <RadarNow snapshot={snapshot} />}
      {/* O bloco de comentários pendentes atravessa a faixa inteira e fica
          ACIMA da fila, porque é isso que o contrato manda: um comentário
          privado com nota baixa expira, o cliente ainda está no restaurante ou
          acabou de sair. Ele tem de ser a primeira coisa, e no telemóvel a
          ordem do DOM é a ordem da tela.

          `empty:hidden` não é enfeite. Sem caso por tratar o cartão devolve
          `null` e esta caixa fica sem filho nenhum: continua a ser item da
          grade, e o `gap-4` continua a contar com ela. Medido no ecrã, isso
          custava 16px de branco por cima da fila em toda conta em dia. */}
      <div className="min-w-0 empty:hidden lg:col-span-3"><PendingCommentsBanner casos={comentariosInternos} nomeDoNegocio={snapshot.business.name} linkDeAvaliacao={linkDeAvaliacaoDoGoogle} businessCountry={businessCountry} /></div>
      {/* A fila e a Reputação lado a lado, decisão de Marcelo em 01/09/2026:
          "suba Reputação no Google para o lado de Avaliações no Google, assim a
          pessoa enxerga as métricas mais importantes de uma só vez".

          A fila leva duas colunas porque tem de mostrar uma avaliação E um
          rascunho ao lado. A Reputação leva a terceira, e é ela que garante que
          a terceira coluna nunca fica vazia: era essa a razão de a fila trocar
          de largura conforme houvesse comentário interno, e com um cartão que
          está sempre lá a largura variável deixou de ter o que resolver.

          No telemóvel isto empilha na ordem da decisão: o que expira primeiro,
          depois o que ele abriu o painel para fazer, e a leitura por último. */}
      <div id={QUEUE_ANCHOR_ID} className="min-w-0 scroll-mt-16 lg:col-span-2 lg:scroll-mt-4"><ResponseQueue reviews={queue} snapshot={snapshot} demo={demo} businessCountry={businessCountry} paisLido={paisLido} publicar={official.publishReply} publicando={official.publishing} /></div>
      <div className="min-w-0"><ReputationCard snapshot={snapshot} /></div>
    </section>

    {/* Mudança: o que se mexeu desde a última vez. */}
    <section data-faixa="mudanca" className="grid items-start gap-4 border-t border-slate-200 pt-8 lg:grid-cols-3">
      <div className="min-w-0 lg:col-span-2 lg:row-start-1"><VolumeCard weeks={history} /></div>
      {/* "Cada nota separada" leva a linha inteira: são cinco gráficos com o
          número ao lado, e a 560px cada um ficava do tamanho de um selo. */}
      <div className="min-w-0 lg:col-span-3 lg:row-start-2"><RatingTrends weeks={history} snapshot={snapshot} /></div>
      <div className="min-w-0 lg:col-start-3 lg:row-start-1"><WeeklyChange weeks={history} /></div>
    </section>

    {/* Referência: o que ele consulta em vez de agir. */}
    <section data-faixa="referencia" className="grid items-start gap-4 border-t border-slate-200 pt-8 lg:grid-cols-3">
      {/* MEDIDO NO ECRÃ em 01/09/2026, com o retrato da conta do dono (10
          avaliações, 6 com texto, sem temas): esta faixa tinha um retângulo de
          cerca de 1270x400 de fundo vazio. O cartão de temas é BAIXO, mesmo
          cheio (é uma nuvem de etiquetas), e a coluna estreita ao lado dele
          empilhava dois cartões e ficava alta. Duas colunas curtas ao lado de
          uma coluna alta é o buraco de sempre, virado ao contrário.

          O desenho segue a ALTURA de cada cartão, e não só a largura que ele
          quer ler. Os temas querem largura e não têm altura: levam a linha
          inteira. O QR e as boas práticas têm alturas parecidas entre si, e
          por isso ficam lado a lado por baixo, em vez de empilhados.

          Marcelo, no mesmo dia: "só quero melhorar esse ponto que pode ficar
          com 4 colunas". */}
      <div className="min-w-0 lg:col-span-3 lg:row-start-1"><TopicsCard snapshot={snapshot} userId={userId} demo={demo} /></div>
      <div id={QR_ANCHOR_ID} className="min-w-0 scroll-mt-16 lg:row-start-2 lg:scroll-mt-4"><QrCard funnel={funnel.data} /></div>
      <div className="min-w-0 lg:col-span-2 lg:row-start-2"><DailyPractice snapshot={snapshot} /></div>
      {/*
        O Radar calmo fecha a página. Fica filho DIRETO da grade, sem div à
        volta, porque `check-ordem-por-decisao` procura esta expressão inteira
        para provar que ele aparece na Referência; embrulhá-lo escondia o módulo
        do guarda. A largura dele vem de `lg:col-span-3`, no próprio componente.
      */}
      {!radarEmAcao && <RadarNow snapshot={snapshot} />}
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
  return <Card className="border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]"><CardContent className="p-4 sm:p-5"><div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1"><h2 className="text-lg font-semibold text-slate-950">{t('dashboard.cockpit.layout.volumeTitle')}</h2>{semEvidencia ? null : <span className="whitespace-nowrap text-xs text-slate-500">{t('dashboard.cockpit.approved.volumeWindow')}</span>}</div>{semEvidencia ? <p className="mt-2 text-sm text-slate-500">{t('dashboard.cockpit.approved.volumeEmpty')}</p> : <><div className="mt-4 flex flex-col gap-3 sm:mt-5 sm:flex-row sm:items-center sm:gap-4"><div className="h-12 w-full shrink-0 sm:w-40 lg:w-72"><ResponsiveContainer width="100%" height="100%"><LineChart data={weeks}><Line type="monotone" dataKey="reviewCount" stroke="#2457D6" strokeWidth={3} dot={false} isAnimationActive={false} /></LineChart></ResponsiveContainer></div><p className="text-lg font-semibold text-slate-950">{current.reviewCount} <span className="text-sm font-normal text-slate-600">{t('dashboard.cockpit.approved.volumeThisWeek', { count: current.reviewCount })} {t('dashboard.cockpit.approved.volumeAverage', { average: Math.round(average) })}</span></p></div>{change !== null && change <= -25 && <div className="mt-5 flex gap-3 rounded-lg border border-red-100 bg-red-50 p-4 text-sm leading-5 text-red-950"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-700" /><p><strong>{t('dashboard.cockpit.approved.volumeDrop', { percent: Math.abs(change) })}</strong> {t('dashboard.cockpit.approved.volumeDropRest')}</p></div>}</>}</CardContent></Card>;
};

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
const RatingTrends = ({ weeks, snapshot }: { weeks: Week[]; snapshot: ExperimentalApifySnapshot }) => {
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
const ReputationCard = ({ snapshot }: { snapshot: ExperimentalApifySnapshot }) => {
  const { t } = useOwnerTranslation();
  const replyHours = snapshot.sample.insights?.averageResponseHours;
  const last30 = snapshot.sample.insights?.reviewsLast30Days;
  const hasDistribution = snapshot.sample.reviewCount > 0;
  const semMedidas = (replyHours === null || replyHours === undefined) && (last30 === null || last30 === undefined);
  return <Card className="border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]"><CardContent className="p-4 sm:p-5"><div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1"><h2 className="text-lg font-semibold text-slate-950">{t('dashboard.cockpit.approved.reputationTitle')}</h2><span className="text-xs text-slate-500">{t('dashboard.cockpit.approved.reputationFreshness')}</span></div><div className="mt-4 hidden items-end gap-3 lg:flex"><p className="text-4xl font-medium tracking-tight text-slate-950">{decimal.format(snapshot.business.googleRating)}</p><Stars rating={Math.round(snapshot.business.googleRating)} medium /></div><p className="mt-1 hidden text-sm text-slate-600 lg:block">{integer.format(snapshot.business.googleReviewCount)} {t('dashboard.cockpit.approved.reviewsTotal')}</p>{hasDistribution ? <div className="mt-5 space-y-2">{ratings.map((rating) => { const count = snapshot.sample.ratingBreakdown[rating]; const width = Math.round((count / snapshot.sample.reviewCount) * 100); return <div key={rating} className="grid grid-cols-[28px_1fr_36px] items-center gap-2 text-xs"><span>{rating}★</span><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={`${Number(rating) <= 2 ? 'bg-red-500' : 'bg-amber-400'} h-full rounded-full`} style={{ width: `${width}%` }} /></div><span className="text-right text-slate-600">{width}%</span></div>; })}</div> : <p className="mt-2 text-sm text-slate-500">{t('dashboard.cockpit.approved.reputationBreakdownEmpty')}</p>}{semMedidas ? <p className="mt-2 text-sm text-slate-500">{t('dashboard.cockpit.approved.reputationMetricsEmpty')}</p> : <div className="mt-5 grid grid-cols-2 gap-3"><Metric label={t('dashboard.cockpit.layout.averageReplyTime')} value={replyHours === null || replyHours === undefined ? '—' : `${Math.round(replyHours)} h`} /><Metric label={t('dashboard.cockpit.layout.newReviews30d')} value={last30 === null || last30 === undefined ? '—' : `+${last30}`} tone="positive" /></div>}<SampleSourceNote snapshot={snapshot} /></CardContent></Card>;
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
  return <Card className="border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]"><CardContent className="p-4 sm:p-5"><h2 className="text-lg font-semibold text-slate-950">{t('dashboard.cockpit.approved.practiceTitle')}</h2><p className="mt-4 font-medium text-slate-900">{practice.title}</p><p className="mt-1 text-sm leading-5 text-slate-600">{practice.body}</p><Button asChild variant="link" className="mt-2 h-auto px-0 text-[#2457D6]"><a href={`#${practice.target}`}>{practice.action}<ChevronRight className="ml-1 h-4 w-4" /></a></Button></CardContent></Card>;
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
  return <Card className="border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]"><CardContent className="p-4 sm:p-5"><div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1"><h2 className="text-lg font-semibold text-slate-950">{t('dashboard.cockpit.approved.weekTitle')}</h2>{semEvidencia ? null : <span className="text-xs text-slate-500">{t('dashboard.cockpit.approved.weekWindow')}</span>}</div>{semEvidencia ? <p className="mt-2 text-sm text-slate-500">{t('whatsappPilot.weeklyChangeEmpty')}</p> : <div className="mt-4 flex items-center gap-3"><div className="h-8 w-20"><ResponsiveContainer width="100%" height="100%"><LineChart data={weeks}><Line type="monotone" dataKey="ownerReplies" stroke="#2457D6" strokeWidth={2.5} dot={false} isAnimationActive={false} /></LineChart></ResponsiveContainer></div><p className="text-sm leading-5 text-slate-600">{current ? t('dashboard.cockpit.approved.weekReplies', { count: current }) : t('whatsappPilot.weeklyChangeEmpty')}</p></div>}</CardContent></Card>;
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
  return <Card className="border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]"><CardContent className="p-4 sm:p-5"><h2 className="text-lg font-semibold text-slate-950">{t('dashboard.cockpit.approved.qrTitle')}</h2>{semEvidencia ? <p className="mt-2 text-sm text-slate-500">{t('dashboard.cockpit.approved.qrEmpty')}</p> : <dl className="mt-5 space-y-3"><div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"><dt className="text-sm text-slate-600">{t('dashboard.cockpit.approved.qrOpened')}</dt><dd className="font-semibold text-slate-950">{funnel.qrOpens}</dd></div><div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"><dt className="text-sm text-slate-600">{t('dashboard.cockpit.approved.qrClicked')}</dt><dd className="font-semibold text-slate-950">{funnel.googleClicks}</dd></div></dl>}</CardContent></Card>;
};

/**
 * Sem tema nenhum, este cartão gastava uma tela inteira de telemóvel para
 * mostrar um traço. O contrato exige que o módulo continue presente sem
 * evidência; não exige que ele ocupe o mesmo espaço de quando tem conteúdo.
 * Encolhido, ele continua visível e para de empurrar o resto para baixo.
 */
const TopicsCard = ({ snapshot, userId, demo = false }: { snapshot: ExperimentalApifySnapshot; userId?: string; demo?: boolean }) => {
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

export default ApprovedCockpitDashboard;
