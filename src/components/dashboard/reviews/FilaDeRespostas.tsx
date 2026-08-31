import React, { useMemo, useState } from 'react';
import { ExternalLink, RefreshCw, Star } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import ReplySuggestions from '@/components/dashboard/ReplySuggestions';
import { useInternalFeedback } from '@/hooks/useInternalFeedback';
import { useGoogleBusinessReviewQueue } from '@/hooks/useGoogleBusinessReviewQueue';
import { useGoogleReviews } from '@/hooks/useGoogleReviews';
import { lerNotaDoCaso } from '@/lib/comentarioInterno';
import { comentariosJaTratados, montarFilaDeRespostas, type ItemDaFila, type OrigemDaResposta } from '@/lib/filaDeRespostas';
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
const PublicacaoOficial = ({
  item,
  rascunhoInicial,
  publicar,
  publicando,
}: {
  item: ItemDaFila;
  rascunhoInicial: string;
  publicar: (id: string, texto: string) => Promise<boolean>;
  publicando: boolean;
}) => {
  const { t } = useOwnerTranslation();
  const [rascunho, setRascunho] = useState(rascunhoInicial);

  const enviar = async () => {
    if (!rascunho.trim()) return;
    if (await publicar(item.idNaFonte, rascunho.trim())) toast.success(t('reviews.google.official.published'));
    else toast.error(t('reviews.google.official.publishError'));
  };

  return (
    <div className="mt-4">
      <label className="block text-sm font-semibold text-slate-900" htmlFor={`resposta-${item.id}`}>
        {t('reviews.google.official.draft')}
      </label>
      <Textarea
        id={`resposta-${item.id}`}
        className="mt-2 min-h-28 resize-y text-sm"
        value={rascunho}
        onChange={(evento) => setRascunho(evento.target.value)}
      />
      <Button
        className="mt-3 w-full rounded-full bg-[#2457D6] hover:bg-[#1d47b0] sm:w-auto"
        disabled={publicando || !rascunho.trim()}
        onClick={() => void enviar()}
      >
        {publicando ? t('reviews.google.official.publishing') : t('reviews.google.official.publish')}
      </Button>
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
}: {
  item: ItemDaFila;
  businessName: string | null;
  businessCountry: string | null;
  resolvendoId: string | null;
  resolverCaso: (id: string, tratado: boolean) => void;
  publicar: (id: string, texto: string) => Promise<boolean>;
  publicando: boolean;
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
          <span className="min-w-0 break-words font-medium text-slate-900">
            {item.autor?.trim() || t('reviews.cases.anonCustomer')}
          </span>
          {data && <span className="text-sm text-gray-500">{data}</span>}
        </div>

        <div className="mt-2">
          <Nota valor={item.nota} />
        </div>

        {item.texto?.trim() && <p className="mt-3 break-words text-sm leading-6 text-gray-700">{item.texto}</p>}

        {item.customer_email && (
          <p className="mt-2 break-words text-xs text-gray-500">
            {t('reviews.cases.contact')}: {item.customer_email}
          </p>
        )}

        <ReplySuggestions
          channel={item.origem === 'comentario-privado' ? 'private' : 'public'}
          rating={item.nota}
          text={item.texto}
          customerName={item.autor}
          customerEmail={item.origem === 'comentario-privado' ? item.customer_email : null}
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
        {(item.origem === 'comentario-privado' || item.link) && (
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
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
  // Mesma porta que o painel usa: sem a variável de ambiente ligada não existe
  // ligação oficial possível, e consultar por ela seria gastar viagem ao banco
  // para receber sempre "desligado".
  const oficiais = useGoogleBusinessReviewQueue(
    import.meta.env.VITE_GOOGLE_BUSINESS_OAUTH_ENABLED === 'true' ? userId : undefined,
  );
  const publicas = useGoogleReviews(userId);

  const fila = useMemo(
    () => montarFilaDeRespostas({
      privados: privados.cases,
      oficiais: oficiais.reviews,
      publicas: publicas.reviews,
    }),
    [privados.cases, oficiais.reviews, publicas.reviews],
  );
  const tratados = useMemo(() => comentariosJaTratados(privados.cases), [privados.cases]);

  const temPublicaSemEstado = fila.some((item) => item.origem === 'google-publico');
  const carregando = privados.loading || oficiais.loading || publicas.loading;

  const atualizar = async () => {
    await privados.refresh();
    // Só se pede ao Google o que o Google pode dar: sincronizar sem ligação
    // oficial, ou reler o perfil público sem Place ID, devolveria um erro que
    // o dono não causou e não pode resolver a partir daqui.
    if (oficiais.connectionStatus === 'connected') await oficiais.syncAll();
    if (publicas.placeInfo?.place_id) await publicas.handleRefresh();
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
            {carregando ? t('reviews.loading') : t('reviews.queue.pending', { count: fila.length })}
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
        Um único estado objetivo, no módulo afetado, como manda a regra de
        apresentação do contrato: a leitura pública do Google não devolve as
        respostas já publicadas, então sobre essas o Binno não sabe dizer se
        ainda esperam. Dizer isto uma vez é mais honesto do que marcar cada
        item com um estado inventado.
      */}
      {temPublicaSemEstado && (
        <p className="mt-3 rounded-lg bg-slate-100 px-3 py-2 text-xs leading-5 text-slate-600">
          {t('reviews.queue.publicUnknownState')}
        </p>
      )}

      {privados.error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{privados.error}</p>
      )}

      <div className="mt-4 space-y-4">
        {carregando && fila.length === 0 && (
          <Card><CardContent className="py-8 text-center text-gray-500">{t('reviews.loading')}</CardContent></Card>
        )}

        {!carregando && fila.length === 0 && (
          <Card>
            <CardContent className="p-5">
              <p className="font-semibold text-slate-950">{t('reviews.queue.emptyTitle')}</p>
              <p className="mt-2 text-sm leading-6 text-gray-600">{t('reviews.queue.emptyBody')}</p>
            </CardContent>
          </Card>
        )}

        {fila.map((item) => (
          <ItemDaFilaCard
            key={item.id}
            item={item}
            businessName={businessName}
            businessCountry={businessCountry}
            resolvendoId={privados.resolvingId}
            resolverCaso={privados.resolveCase}
            publicar={oficiais.publishReply}
            publicando={oficiais.publishing}
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
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
};

export default FilaDeRespostas;
