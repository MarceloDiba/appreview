import React, { useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ExternalLink, RefreshCw, Star } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import ReplySuggestions from '@/components/dashboard/ReplySuggestions';
import { useInternalFeedback } from '@/hooks/useInternalFeedback';
import { useGoogleBusinessReviewQueue } from '@/hooks/useGoogleBusinessReviewQueue';
import { useGoogleReviews } from '@/hooks/useGoogleReviews';
import { useGooglePublicReviewsAnswered } from '@/hooks/useGooglePublicReviewsAnswered';
import { RespostasPublicadas } from './RespostasPublicadas';
import { useRespostaAEsperar, type RespostaAEsperar } from '@/hooks/useRespostaAEsperar';
import { lerNotaDoCaso } from '@/lib/comentarioInterno';
import { itensJaTratados, montarFilaDeRespostas, type ItemDaFila, type OrigemDaResposta } from '@/lib/filaDeRespostas';
import { buildReplySuggestions } from '@/lib/replySuggestions';
import { useOwnerTranslation } from '@/i18n/owner/useOwnerTranslation';

/**
 * Âncora única da fila. `PendingCommentsBanner`, na Visão geral, aponta para
 * cá: quem toca no bloco de comentários pendentes cai na fila, não no topo da
 * página.
 */
export const FILA_ANCHOR_ID = 'fila-de-respostas';

/**
 * A escala só é desenhada quando existe nota. Cinco estrelas apagadas é
 * exactamente o que uma nota 1 desenha, então usá-la para dizer "não houve
 * nota" mostra ao dono o oposto da verdade quando o comentário é um elogio.
 * Foi corrigido para a lista de casos em 30/08/2026 e continua verdade aqui.
 */
const Nota = ({ valor }: { valor: number | null }) => {
  const { t } = useOwnerTranslation();
  const nota = lerNotaDoCaso(valor);
  if (nota.tipo === 'sem-nota') {
    return (
      <span className="inline-flex w-fit rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
        {t('reviews.cases.noRating')}
      </span>
    );
  }
  return (
    <span className="flex">
      {[1, 2, 3, 4, 5].map((estrela) => (
        <Star
          key={estrela}
          size={14}
          className={estrela <= nota.valor ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}
        />
      ))}
    </span>
  );
};

const CORES_DA_ORIGEM: Record<OrigemDaResposta, string> = {
  'comentario-privado': 'bg-violet-50 text-violet-800',
  'google-oficial': 'bg-blue-50 text-[#2457D6]',
  'google-publico': 'bg-blue-50 text-[#2457D6]',
};

const CHAVES_DA_ORIGEM: Record<OrigemDaResposta, string> = {
  'comentario-privado': 'reviews.queue.originPrivate',
  'google-oficial': 'reviews.queue.originGoogle',
  'google-publico': 'reviews.queue.originGoogle',
};

/**
 * As duas caixas de entrada que o dono pediu, sem virarem duas caixas.
 *
 * Em 31/08/2026, depois de rever o painel no telemóvel: "deveria ter 2 caixas
 * de entrada". Na véspera tinha pedido o contrário: "um lugar só para
 * responder, com as origens somadas em vez de separadas por aba". As duas
 * frases conciliam-se porque ele não pediu duas caixas, pediu saber quanto tem
 * de cada lado antes de rolar a lista. As origens pedem coisas diferentes dele,
 * uma mensagem directa e um texto público, e a soma escondia essa conta.
 *
 * Uma fila, dois atalhos: o padrão é a lista inteira, e isto é um filtro que se
 * põe e se tira na mesma tela. Não é aba, não reordena nada, e as contagens
 * nascem da mesma fila somada que a lista desenha logo abaixo: uma segunda
 * contagem, lida de outra fonte, voltaria a poder discordar da lista, que é o
 * defeito que a fila somada existe para não ter.
 */
export type GrupoDeOrigem = 'privado' | 'google';

export const grupoDaOrigem = (origem: OrigemDaResposta): GrupoDeOrigem =>
  origem === 'comentario-privado' ? 'privado' : 'google';

const CartaoDeOrigens = ({
  fila,
  filtro,
  aoFiltrar,
}: {
  fila: ItemDaFila[];
  filtro: GrupoDeOrigem | null;
  aoFiltrar: (grupo: GrupoDeOrigem | null) => void;
}) => {
  const { t } = useOwnerTranslation();
  const linhas: Array<{ grupo: GrupoDeOrigem; rotulo: string }> = [
    { grupo: 'privado', rotulo: t('reviews.queue.originsPrivate') },
    { grupo: 'google', rotulo: t('reviews.queue.originsGoogle') },
  ];

  return (
    <Card className="mt-4">
      <CardContent className="divide-y divide-slate-200 p-0">
        {linhas.map(({ grupo, rotulo }) => {
          const total = fila.filter((item) => grupoDaOrigem(item.origem) === grupo).length;
          const ativo = filtro === grupo;
          return (
            <button
              key={grupo}
              type="button"
              aria-pressed={ativo}
              onClick={() => aoFiltrar(ativo ? null : grupo)}
              className={`flex min-h-12 w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm ${ativo ? 'bg-blue-50 text-[#2457D6]' : 'text-slate-700 hover:bg-slate-50'}`}
            >
              <span className="min-w-0 break-words font-medium">{rotulo}</span>
              <span className="shrink-0 font-semibold tabular-nums">{total}</span>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
};

const Origem = ({ origem }: { origem: OrigemDaResposta }) => {
  const { t } = useOwnerTranslation();
  return (
    <span className={`inline-flex w-fit rounded-full px-2.5 py-0.5 text-xs font-medium ${CORES_DA_ORIGEM[origem]}`}>
      {t(CHAVES_DA_ORIGEM[origem])}
    </span>
  );
};

/**
 * A publicação da resposta no Google só existe com a ligação oficial: é a
 * única origem em que o Binno consegue confirmar no Google que a resposta
 * ficou lá. Nas outras o dono copia e cola na própria página, que é o que o
 * contrato de produto descreve ("o Binno não publica respostas por você").
 */
/**
 * O aviso de que este rascunho ja foi para o WhatsApp.
 *
 * Sai do cartao principal por duas razoes. A primeira e legibilidade: aquele
 * componente ja passa dos 700 linhas. A segunda e que o `lint:portao` mede
 * complexidade, e acrescentar-lhe o botao de recusar e o modo de leitura
 * empurrou-o acima do limite — extrair isto foi a forma honesta de voltar a
 * caber, em vez de subir o tecto de avisos e esconder o crescimento.
 *
 * A INSTRUCAO NAO MANDA DIGITAR. Dizia "Responda 1 no WhatsApp"; desde
 * 05/09/2026 o rascunho vai com botao, e mandar digitar contradiz a promessa
 * que a home vende — "voce responde com um toque".
 */
/**
 * O rascunho: para ler, ou para editar quando o dono pede.
 *
 * A caixa de texto vinha sempre aberta com o texto cru dentro. Marcelo: "na aba
 * review deveria ter o clique para editar". Uma caixa de edicao permanente nao
 * mostra bem o texto — paragrafos colados, barra de rolagem a cortar — e diz que
 * ha trabalho a fazer quando na maior parte das vezes o rascunho esta bom e so
 * falta publicar.
 *
 * `whitespace-pre-line` porque o rascunho traz paragrafos; sem isto colapsam
 * num bloco unico, que era metade do que estava feio de ler.
 */
/**
 * Os tres caminhos que o dono tem a partir de um rascunho: publicar, mudar o
 * texto, ou recusar.
 *
 * Sai do cartao principal porque o `lint:portao` mede complexidade e cada
 * rotulo condicional aqui contava para a do cartao inteiro. Extrair foi a forma
 * honesta de voltar a caber, em vez de subir o tecto de avisos e esconder o
 * crescimento — o tecto e o que impede a proxima adicao de passar sem ninguem
 * dar por ela.
 *
 * RECUSAR SO APARECE COM RASCUNHO A ESPERA, e nao sempre: onde nao ha nada
 * pendente, um botao de recusar nao teria o que recusar.
 */
const AccoesDoRascunho = ({
  podePublicar, publicando, aEditar, aRecusar, temRascunhoAEsperar,
  aoPublicar, aoAlternarEdicao, aoRecusar,
}: {
  podePublicar: boolean;
  publicando: boolean;
  aEditar: boolean;
  aRecusar: boolean;
  temRascunhoAEsperar: boolean;
  aoPublicar: () => void;
  aoAlternarEdicao: () => void;
  aoRecusar: () => void;
}) => {
  const { t } = useOwnerTranslation();
  return (
    <>
      <Button
        className="mt-3 min-h-11 w-full rounded-full bg-[#2457D6] hover:bg-[#1d47b0] sm:w-auto"
        disabled={!podePublicar}
        onClick={aoPublicar}
      >
        {publicando ? t('reviews.google.official.publishing') : t('reviews.google.official.publish')}
      </Button>
      <Button
        variant="outline"
        className="mt-3 min-h-11 w-full rounded-full sm:ml-2 sm:w-auto"
        disabled={publicando}
        onClick={aoAlternarEdicao}
      >
        {aEditar ? t('reviews.google.official.doneEditing') : t('reviews.google.official.edit')}
      </Button>
      {temRascunhoAEsperar && (
        <Button
          variant="outline"
          className="mt-3 min-h-11 w-full rounded-full sm:ml-2 sm:w-auto"
          disabled={aRecusar || publicando}
          onClick={aoRecusar}
        >
          {aRecusar ? t('reviews.google.official.refusing') : t('reviews.google.official.refuse')}
        </Button>
      )}
    </>
  );
};

const Rascunho = ({ id, texto, aEditar, aoMudar }: {
  id: string;
  texto: string;
  aEditar: boolean;
  aoMudar: (valor: string) => void;
}) => (aEditar ? (
  <Textarea
    id={id}
    className="mt-2 min-h-28 resize-y text-sm leading-6"
    value={texto}
    onChange={(evento) => aoMudar(evento.target.value)}
    autoFocus
  />
) : (
  <p
    id={id}
    className="mt-2 whitespace-pre-line rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm leading-6 text-slate-800"
  >
    {texto}
  </p>
));

const JaFoiParaOWhatsApp = ({ rascunho }: { rascunho: string }) => {
  const { t } = useOwnerTranslation();
  return (
    <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm leading-6 text-emerald-900">
      <p className="font-semibold">{t('reviews.google.official.waitingWhatsappTitle')}</p>
      <p className="mt-1 whitespace-pre-line break-words">{rascunho}</p>
      <p className="mt-2">{t('reviews.google.official.waitingWhatsappInstruction')}</p>
    </div>
  );
};

const PublicacaoOficial = ({
  item,
  rascunhoInicial,
  publicar,
  publicando,
  aEsperar,
  revalidarAEsperar,
}: {
  item: ItemDaFila;
  rascunhoInicial: string;
  publicar: (id: string, texto: string) => Promise<boolean>;
  publicando: boolean;
  /**
   * O que este dono mandou para o WhatsApp e ainda espera um "1", se for
   * sobre ESTA avaliacao. `respostas_a_confirmar.review_id` guarda o id de
   * `google_business_reviews`, que e o mesmo que `idNaFonte` carrega para a
   * origem `google-oficial` (ver `daAvaliacaoOficial` em filaDeRespostas.ts) —
   * por isso a comparacao e com `idNaFonte`, e nao com `item.id`, que leva o
   * prefixo da fila somada.
   */
  aEsperar: RespostaAEsperar | null;
  /**
   * Rele `respostas_a_confirmar` depois de uma publicacao pelo painel.
   *
   * Publicar por aqui nao muda essa tabela — so o "1" no WhatsApp confirma, e
   * so o servidor grava isso. Mas sem chamar isto, `aEsperar` continua a ter
   * o valor lido na primeira busca, e o defeito da ronda de correcao 1 volta:
   * o aviso mostrado abaixo depende TAMBEM de `item.is_addressed`, que so
   * fica certo depois de a lista de avaliacoes recarregar; revalidar aqui e
   * o que faz o aviso desaparecer sozinho, sem o dono ter de recarregar a
   * pagina.
   */
  revalidarAEsperar: () => void;
}) => {
  const { t } = useOwnerTranslation();
  // Nunca mostra o aviso sobre uma avaliacao ja tratada. Achado na ronda de
  // correcao 1 de 03/09/2026: o dono publicava por aqui (ou respondia direto
  // no Google, fora do Binno), e o aviso continuava a dizer "responda 1"
  // sobre uma avaliacao que ja tinha resposta — as "duas verdades" que esta
  // tarefa existe para eliminar, reintroduzidas neste canto.
  const respostaAEsperar = item.is_addressed !== true && aEsperar?.reviewId === item.idNaFonte
    ? aEsperar
    : null;

  /*
   * UMA AVALIACAO, UMA RESPOSTA.
   *
   * A caixa comecava sempre com `rascunhoInicial` — uma sugestao gerada aqui —
   * mesmo quando ja havia OUTRO rascunho enviado para o WhatsApp. O dono via os
   * dois textos, diferentes, na mesma tela, e um botao azul grande por baixo do
   * segundo. Marcelo apanhou-o assim.
   *
   * E o cartao existia justamente para impedir isso: o comentario acima diz
   * "sem isto ele nao sabe que a mensagem chegou e pode responder duas vezes".
   * Mostrar o aviso e depois oferecer uma resposta DIFERENTE derrotava a
   * propria razao do aviso.
   *
   * Havendo rascunho a espera, e ele que abre a caixa. Continua editavel: quem
   * quiser mudar o texto antes de publicar muda, e ai publica o que leu.
   */
  const [rascunho, setRascunho] = useState(respostaAEsperar?.rascunho ?? rascunhoInicial);
  const [aRecusar, setARecusar] = useState(false);
  /*
   * O RASCUNHO E PARA LER, NAO PARA EDITAR — a nao ser que o dono peca.
   *
   * A caixa de texto vinha sempre aberta, com o rascunho cru dentro. Marcelo:
   * "na aba review deveria ter o clique para editar". Uma caixa de edicao
   * aberta a toda a hora nao mostra bem o texto (sem espaco entre paragrafos,
   * com barra de rolagem a cortar) e, pior, diz que ha trabalho a fazer quando
   * na maior parte das vezes o rascunho esta bom e so falta publicar.
   *
   * Fechado: le-se o texto formatado e publica-se. Aberto: edita-se. O clique
   * de editar e a excepcao, e nao o estado natural da tela.
   */
  const [aEditar, setAEditar] = useState(false);

  /*
   * RECUSAR EXISTE PORQUE O PRODUTO SO OFERECE UM DE CADA VEZ. Um rascunho que
   * o dono nao queira publicar trancava a fila inteira ate expirar — e ate
   * 05/09/2026 a unica saida daqui era publicar. Marcelo ficou preso nesse
   * estado: "nao tem como recusar em review, apenas no painel".
   */
  const recusar = async () => {
    setARecusar(true);
    const { data, error } = await supabase.rpc('recusar_rascunho', { p_review_id: item.idNaFonte });
    setARecusar(false);
    if (error || !data) {
      toast.error(t('reviews.google.official.refuseError'));
      return;
    }
    toast.success(t('reviews.google.official.refused'));
    revalidarAEsperar();
  };

  const enviar = async () => {
    if (!rascunho.trim()) return;
    if (await publicar(item.idNaFonte, rascunho.trim())) {
      // Nomeia a avaliacao: quando ela sai da lista, a seguinte ocupa o mesmo
      // lugar e sem o nome nao se distingue "publicou" de "nao aconteceu nada".
      toast.success(t('reviews.google.official.published', {
        autor: item.autor || t('dashboard.cockpit.layout.anonymousReviewer'),
      }));
      revalidarAEsperar();
    } else {
      toast.error(t('reviews.google.official.publishError'));
    }
  };

  return (
    <div className="mt-4">
      {/*
        O dono pode ja ter recebido este rascunho no telemovel e estar a
        espera de responder "1" la. Sem isto ele nao sabe que a mensagem
        chegou e pode responder duas vezes a mesma avaliacao — uma pelo
        WhatsApp, outra por aqui. So mostra estas tres coisas, e nada mais: que
        foi enviado, o texto que foi enviado, e que "1" publica.
      */}
      {respostaAEsperar && <JaFoiParaOWhatsApp rascunho={respostaAEsperar.rascunho} />}
      <label className="block text-sm font-semibold text-slate-900" htmlFor={`resposta-${item.id}`}>
        {t('reviews.google.official.draft')}
      </label>
      <Rascunho
        id={`resposta-${item.id}`}
        texto={rascunho}
        aEditar={aEditar}
        aoMudar={setRascunho}
      />
      <AccoesDoRascunho
        podePublicar={!publicando && Boolean(rascunho.trim())}
        publicando={publicando}
        aEditar={aEditar}
        aRecusar={aRecusar}
        temRascunhoAEsperar={Boolean(respostaAEsperar)}
        aoPublicar={() => void enviar()}
        aoAlternarEdicao={() => setAEditar((valor) => !valor)}
        aoRecusar={() => void recusar()}
      />
    </div>
  );
};

const ItemDaFilaCard = ({
  item,
  businessName,
  businessCountry,
  resolvendoId,
  resolverCaso,
  publicar,
  publicando,
  marcandoId,
  marcarRespondida,
  aEsperar,
  revalidarAEsperar,
}: {
  item: ItemDaFila;
  businessName: string | null;
  businessCountry: string | null;
  resolvendoId: string | null;
  resolverCaso: (id: string, tratado: boolean) => void;
  publicar: (id: string, texto: string) => Promise<boolean>;
  publicando: boolean;
  marcandoId: string | null;
  marcarRespondida: (reviewId: string, respondida: boolean) => void;
  aEsperar: RespostaAEsperar | null;
  revalidarAEsperar: () => void;
}) => {
  const { t, i18n } = useOwnerTranslation();
  const tratado = item.is_addressed === true;
  const data = item.created_at
    ? new Intl.DateTimeFormat(i18n.resolvedLanguage || i18n.language, { dateStyle: 'medium' }).format(new Date(item.created_at))
    : '';

  return (
    <Card>
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Origem origem={item.origem} />
          {/*
            O perfil de quem avaliou existia na lista antiga do Google e voltou
            com a fila: para o dono, saber se quem reclamou avaliou uma vez na
            vida ou tem histórico muda o peso da reclamação. Só aparece quando
            a fonte devolve o link; nunca se inventa um.
          */}
          {item.autorUrl ? (
            <a
              className="min-w-0 break-words font-medium text-slate-900 hover:underline"
              href={item.autorUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {item.autor?.trim() || t('reviews.cases.anonCustomer')}
            </a>
          ) : (
            <span className="min-w-0 break-words font-medium text-slate-900">
              {item.autor?.trim() || t('reviews.cases.anonCustomer')}
            </span>
          )}
          {data && <span className="text-sm text-gray-500">{data}</span>}
        </div>

        <div className="mt-2">
          <Nota valor={item.nota} />
        </div>

        {/*
          Uma avaliação do Google pode ser só a nota, sem uma palavra escrita.
          Sem este estado o cartão ficava com um buraco entre a nota e os
          botões, e o dono não sabia se o texto não existia ou não carregou.
        */}
        {item.texto?.trim() ? (
          <p className="mt-3 break-words text-sm leading-6 text-gray-700">{item.texto}</p>
        ) : (
          <p className="mt-3 text-sm italic leading-6 text-gray-500">{t('reviews.google.official.noComment')}</p>
        )}

        {item.customer_email && (
          <p className="mt-2 break-words text-xs text-gray-500">
            {t('reviews.cases.contact')}: {item.customer_email}
          </p>
        )}

        <ReplySuggestions
          reviewId={item.id}
          channel={item.origem === 'comentario-privado' ? 'private' : 'public'}
          rating={item.nota}
          text={item.texto}
          customerName={item.autor}
          customerEmail={item.origem === 'comentario-privado' ? item.customer_email : null}
          podePublicarAqui={item.origem === 'google-oficial'}
          businessName={businessName}
          businessCountry={businessCountry}
        />

        {item.origem === 'google-oficial' && (
          <PublicacaoOficial
            item={item}
            rascunhoInicial={buildReplySuggestions({
              channel: 'public',
              rating: item.nota,
              text: item.texto,
              customerName: item.autor,
              businessName,
              businessCountry,
            })[0]?.body || ''}
            publicar={publicar}
            publicando={publicando}
            aEsperar={aEsperar}
            revalidarAEsperar={revalidarAEsperar}
          />
        )}

        {/*
          A linha de ações empilha no celular e só vira linha a partir de `sm`.
          Enquanto era sempre uma linha, o botão desta ponta não podia encolher
          (`whitespace-nowrap` vem do próprio Button) nem quebrar, então ele
          empurrava a coluna de texto até o mínimo e o conjunto saía do cartão.
          Cada botão é `w-full sm:w-auto` pela mesma razão: largura do cartão
          no celular, largura do texto no ecrã grande.
        */}
        {(item.origem !== 'google-oficial' || item.link) && (
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            {/*
              A marcação é do dono, não do Binno: o Binno nunca publica uma
              resposta no Google. O rótulo é na primeira pessoa dele por isso,
              e é o que tira a avaliação pública da fila. Sem ela, o item ficava
              lá para sempre e a contagem nunca descia.
            */}
            {item.origem === 'google-publico' && (
              <Button
                size="sm"
                className="w-full sm:w-auto"
                variant={tratado ? 'outline' : 'default'}
                disabled={marcandoId === item.idNaFonte}
                onClick={() => marcarRespondida(item.idNaFonte, !tratado)}
              >
                {tratado ? t('reviews.queue.markNotAnswered') : t('reviews.queue.markAnswered')}
              </Button>
            )}
            {item.origem === 'comentario-privado' && (
              <Button
                size="sm"
                className="w-full sm:w-auto"
                variant={tratado ? 'outline' : 'default'}
                disabled={resolvendoId === item.idNaFonte}
                onClick={() => resolverCaso(item.idNaFonte, !tratado)}
              >
                {tratado ? t('reviews.cases.reopen') : t('reviews.cases.markResolved')}
              </Button>
            )}
            {item.link && (
              <Button size="sm" variant="outline" className="w-full sm:w-auto" asChild>
                <a href={item.link} target="_blank" rel="noopener noreferrer">
                  <ExternalLink size={14} className="mr-2" aria-hidden="true" />
                  {t('reviews.google.sourceReview')}
                </a>
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

/**
 * Um lugar só para responder, com as origens somadas.
 *
 * Aprovado por Marcelo em 30/08/2026. As três abas de `/reviews` (comentário
 * privado, fila oficial do Google e leitura pública do Google) viraram uma
 * fila ordenada por recência, com a origem escrita em cada item. Duas das
 * origens dependem de uma ligação que nenhuma conta real tem hoje, então as
 * abas ensinavam ao dono que o produto tem menos do que tem: ele escolhia uma
 * aba e encontrava vazio, ou um convite para conectar.
 *
 * A ordem inteira vem de `montarFilaDeRespostas`, que por sua vez devolve
 * `orderPendingCasesByRecency`. Esta tela não ordena nada por conta própria.
 */
const FilaDeRespostas = ({
  userId,
  businessName,
  businessCountry,
}: {
  userId: string;
  businessName: string | null;
  businessCountry: string | null;
}) => {
  const { t } = useOwnerTranslation();
  const privados = useInternalFeedback(userId);
  // O interruptor de ambiente saiu em 03/09/2026: o Google aprovou o projeto
  // para a Business Profile API, e o próprio hook já devolve fila vazia sem
  // erro quando o dono ainda não ligou a conexão — não há "desligado" que
  // precise de ser simulado aqui.
  const oficiais = useGoogleBusinessReviewQueue(userId);
  const publicas = useGoogleReviews(userId);
  const respondidas = useGooglePublicReviewsAnswered(userId);
  // So ha uma resposta a espera por dono (o indice unico da migracao garante
  // isso), por isso um valor so chega ate aqui e desce para o item certo.
  // `refresh` desce ate `PublicacaoOficial` para reler depois de uma
  // publicacao pelo painel — sem isso o aviso ficava preso na leitura do
  // primeiro carregamento (ronda de correcao 1, 03/09/2026).
  const { aEsperar, refresh: revalidarAEsperar } = useRespostaAEsperar(userId);
  const [falhaAoAtualizar, setFalhaAoAtualizar] = useState(false);
  // O padrão é sem filtro: a fila abre inteira, do mais recente para o mais
  // antigo. O cartão de origens acima dela põe e tira este filtro.
  const [filtroDeOrigem, setFiltroDeOrigem] = useState<GrupoDeOrigem | null>(null);

  const fontes = useMemo(
    () => ({
      privados: privados.cases,
      oficiais: oficiais.reviews,
      publicas: publicas.reviews,
      respondidasNoGoogle: respondidas.answered,
      // Com a ligacao oficial LIGADA e com retrato COMPLETO, so ela fala pelo
      // Google. Nao basta estar ligada: a meio da sincronizacao ela ainda nao
      // sabe tudo, e calar o retrato da Apify ai esconderia avaliacoes reais.
      oficialCompleta: oficiais.connectionStatus === 'connected' && oficiais.syncComplete,
    }),
    [privados.cases, oficiais.reviews, publicas.reviews, respondidas.answered,
     oficiais.connectionStatus, oficiais.syncComplete],
  );
  const fila = useMemo(() => montarFilaDeRespostas(fontes), [fontes]);
  const tratados = useMemo(() => itensJaTratados(fontes), [fontes]);
  // Filtrar não reordena: a ordem inteira continua a sair de
  // `montarFilaDeRespostas`, e o filtro é aplicado depois dela, sobre a lista
  // já ordenada. Uma segunda ordenação aqui seria a quarta cópia da regra de
  // recência neste projeto.
  const filaVisivel = useMemo(
    () => (filtroDeOrigem ? fila.filter((item) => grupoDaOrigem(item.origem) === filtroDeOrigem) : fila),
    [fila, filtroDeOrigem],
  );

  const temItemDoGoogle = [...fila, ...tratados].some((item) => item.origem !== 'comentario-privado');
  const temItemPublico = [...fila, ...tratados].some((item) => item.origem === 'google-publico');
  const carregando = privados.loading || oficiais.loading || publicas.loading;

  const atualizar = async () => {
    setFalhaAoAtualizar(false);
    let falhou = false;
    await privados.refresh();
    // Só se pede ao Google o que o Google pode dar: sincronizar sem ligação
    // oficial, ou reler o perfil público sem Place ID, devolveria um erro que
    // o dono não causou e não pode resolver a partir daqui.
    if (oficiais.connectionStatus === 'connected' && !(await oficiais.syncAll())) falhou = true;
    if (publicas.placeInfo?.place_id && !(await publicas.handleRefresh())) falhou = true;
    await respondidas.refresh();
    setFalhaAoAtualizar(falhou);
  };

  const ocupado = privados.loading || oficiais.syncing || publicas.refreshing;

  return (
    <section id={FILA_ANCHOR_ID} className="scroll-mt-24">
      {/*
        Título e ação empilham no celular. Enquanto isto era um `flex-row` sem
        quebra, o título e o botão somavam mais do que a largura do cartão e o
        botão saía para fora dele.
      */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold text-slate-950">{t('reviews.queue.title')}</h2>
          <p className="mt-1 text-sm text-gray-600">
            {carregando ? t('reviews.loading') : t('reviews.queue.pending', { count: filaVisivel.length })}
          </p>
        </div>
        <Button
          variant="outline"
          className="w-full sm:w-auto"
          disabled={ocupado}
          onClick={() => void atualizar()}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${ocupado ? 'animate-spin' : ''}`} aria-hidden="true" />
          {ocupado ? t('reviews.refreshing') : t('reviews.refresh')}
        </Button>
      </div>

      {/*
        Aqui vivia a frase que explicava que a leitura pública do Google não
        devolve as respostas já publicadas. Marcelo mandou-a sair em 31/08/2026:
        ela pedia ao dono que guardasse na cabeça uma limitação de API para
        poder usar um botão que já se explica sozinho ("Já respondi no Google").
        O botão continua onde estava, e é ele que tira o item da fila.
      */}

      {/*
        A sincronização oficial pagina o perfil inteiro. Enquanto não termina,
        a contagem acima é de uma parte do perfil, e apresentá-la como o total
        seria dado incompleto passado por completo.
      */}
      {/*
        DUAS MENSAGENS DIFERENTES, porque sao duas situacoes diferentes.

        Ate 03/09/2026 havia so uma: "ainda estamos trazendo as paginas". Ela
        aparecia sempre que a sincronizacao nao tinha terminado — inclusive
        quando tinha FALHADO e nada estava a correr. O dono ficava a esperar por
        um trabalho que nao existia, sem nunca saber que havia um erro.

        Agora, quando o Google recusou, diz-se isso e mostra-se o motivo. O
        motivo vem do proprio Google e costuma trazer o que fazer (por exemplo,
        que API activar), portanto e util e nao ruido.
      */}
      {oficiais.connectionStatus === 'connected' && !oficiais.syncComplete && oficiais.syncError && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm leading-5 text-red-900">
          <p className="font-medium">{t('reviews.google.official.syncFailed')}</p>
          <p className="mt-1 break-words text-red-800">{oficiais.syncError}</p>
        </div>
      )}
      {oficiais.connectionStatus === 'connected' && !oficiais.syncComplete && !oficiais.syncError && (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-5 text-amber-900">
          {t('reviews.google.official.incomplete')}
        </p>
      )}

      {/*
        Uma atualização que falha tem de parecer diferente de uma que funcionou
        e não trouxe nada. Sem isto o dono clica, a tela fica igual, e ele não
        tem como saber que quebrou. A frase diz o que fazer, não o que houve.
      */}
      {(falhaAoAtualizar || oficiais.error) && (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm leading-5 text-red-800">
          {t('reviews.queue.refreshError')}
        </p>
      )}

      {privados.error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{privados.error}</p>
      )}

      {/*
        Atribuição ao Google. Isto não é enfeite: os termos do Google exigem a
        atribuição onde quer que o conteúdo de avaliação deles seja mostrado, e
        esta fila mostra nome do avaliador e texto da avaliação. Vinha na lista
        antiga e desapareceu quando as três superfícies viraram uma; volta
        acima da lista, junto do conteúdo, e não num rodapé seis cartões
        abaixo. O aviso de relevância acompanha só quando há item da leitura
        pública, porque é essa porta que devolve as avaliações escolhidas por
        relevância, e não todas.
      */}
      {temItemDoGoogle && (
        <p className="mt-3 text-xs leading-5 text-gray-500">
          {temItemPublico
            ? `${t('reviews.google.relevanceNotice')} · ${t('reviews.google.attribution')}`
            : t('reviews.google.attribution')}
        </p>
      )}

      <CartaoDeOrigens fila={fila} filtro={filtroDeOrigem} aoFiltrar={setFiltroDeOrigem} />

      <div className="mt-4 space-y-4">
        {carregando && filaVisivel.length === 0 && (
          <Card><CardContent className="py-8 text-center text-gray-500">{t('reviews.loading')}</CardContent></Card>
        )}

        {!carregando && filaVisivel.length === 0 && (
          <Card>
            <CardContent className="p-5">
              {/*
                Vazio por filtro e vazio de verdade são coisas diferentes. Dizer
                "nada esperando resposta" a quem acabou de filtrar por uma
                origem seria afirmar sobre a fila inteira o que só vale para um
                lado dela.
              */}
              {filtroDeOrigem ? (
                <>
                  <p className="font-semibold text-slate-950">{t('reviews.queue.emptyFiltered')}</p>
                  <Button variant="outline" className="mt-3 w-full sm:w-auto" onClick={() => setFiltroDeOrigem(null)}>
                    {t('reviews.queue.originsAll')}
                  </Button>
                </>
              ) : (
                <>
                  <p className="font-semibold text-slate-950">{t('reviews.queue.emptyTitle')}</p>
                  <p className="mt-2 text-sm leading-6 text-gray-600">{t('reviews.queue.emptyBody')}</p>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {filaVisivel.map((item) => (
          <ItemDaFilaCard
            key={item.id}
            item={item}
            businessName={businessName}
            businessCountry={businessCountry}
            resolvendoId={privados.resolvingId}
            resolverCaso={privados.resolveCase}
            publicar={oficiais.publishReply}
            publicando={oficiais.publishing}
            marcandoId={respondidas.markingId}
            marcarRespondida={(reviewId, respondida) => void respondidas.mark(reviewId, respondida)}
            aEsperar={aEsperar}
            revalidarAEsperar={revalidarAEsperar}
          />
        ))}
      </div>

      {tratados.length > 0 && (
        <div className="mt-10">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            {t('reviews.queue.handledTitle')}
          </h3>
          <div className="mt-4 space-y-4">
            {tratados.map((item) => (
              <ItemDaFilaCard
                key={item.id}
                item={item}
                businessName={businessName}
                businessCountry={businessCountry}
                resolvendoId={privados.resolvingId}
                resolverCaso={privados.resolveCase}
                publicar={oficiais.publishReply}
                publicando={oficiais.publishing}
                marcandoId={respondidas.markingId}
                marcarRespondida={(reviewId, respondida) => void respondidas.mark(reviewId, respondida)}
                aEsperar={aEsperar}
                revalidarAEsperar={revalidarAEsperar}
              />
            ))}
          </div>
        </div>
      )}

      {/*
        O caminho de volta a uma resposta ja publicada. Fica DEPOIS da fila e
        fora dela: a fila e o que falta responder, e uma resposta publicada nao
        falta. Ver o cabecalho de `RespostasPublicadas.tsx`.
      */}
      <RespostasPublicadas
        respondidas={oficiais.respondidas}
        publicar={oficiais.publishReply}
        publicando={oficiais.publishing}
      />
    </section>
  );
};

export default FilaDeRespostas;
