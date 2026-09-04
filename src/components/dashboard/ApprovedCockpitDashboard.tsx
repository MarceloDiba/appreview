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
import { QR_ANCHOR_ID, QUEUE_ANCHOR_ID } from '@/components/dashboard/ancoras';
import { SampleSourceNote } from '@/components/dashboard/NotaDaAmostra';
import { QrCard, TopicsCard } from '@/components/dashboard/qr/CartoesDeQrETemas';
import { DailyPractice, MobileSummary, RadarNow } from '@/components/dashboard/hoje/CartoesDoDia';
import { decimal, integer } from '@/components/dashboard/formatos';
import {
  RatingTrends,
  ReputationCard,
  VolumeCard,
  WeeklyChange,
  type Week,
} from '@/components/dashboard/reputacao/CartoesDeLeitura';
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


/**
 * O piloto Apify entra no MESMO espaço de identificadores da fila somada, com
 * a fonte dele. Antes disto ele passava o id cru, e a fila do painel e a fila
 * de `/reviews` guardavam a mesma avaliação em duas chaves.
 */
const normalizeObserved = (review: ExperimentalObservedReview): QueueReview =>
  ({ ...review, id: idDaFila('piloto-apify', review.id) });

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

export default ApprovedCockpitDashboard;
