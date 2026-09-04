import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Copy, ExternalLink, Send } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import type { ExperimentalApifySnapshot } from '@/lib/experimentalApifySnapshot';
import { useOwnerTranslation } from '@/i18n/owner/useOwnerTranslation';
import { buildReplySuggestions } from '@/lib/replySuggestions';
import { Stars } from '@/components/dashboard/Stars';
import OrigemDoRascunho from '@/components/dashboard/OrigemDoRascunho';
import {
  pedirRascunho,
  rascunhoGuardado,
  rascunhoNaTela,
  type ResultadoDoModelo,
} from '@/lib/rascunhoDoModelo';
import { pedirRascunhoAoBinno } from '@/lib/sugerirResposta';

/**
 * A FILA DE RESPOSTAS DO PAINEL, em ficheiro proprio.
 *
 * Extraida de `ApprovedCockpitDashboard.tsx` em 04/09/2026, quando esse
 * ficheiro tinha 952 linhas e o tecto acordado passou a ser 350. O corte e por
 * RESPONSABILIDADE e nao por contagem: isto e uma coisa so — escolher a
 * avaliacao, ver o rascunho, editar, publicar no Google, copiar ou saltar.
 *
 * O ESTADO DO RASCUNHO VEM JUNTO (`ActionState`, `readActions`, a chave de
 * armazenamento) porque nada mais no painel o usava. Deixa-lo para tras seria
 * partir a costura ao meio e criar dois ficheiros que so se leem juntos.
 *
 * `Stars` NAO veio: o resumo do celular e o cartao da reputacao tambem o usam.
 * Ficou em `@/components/dashboard/Stars`.
 *
 * O nome exportado continua `ResponseQueue`, e o sitio onde ela e usada nao
 * mudou de linha: `scripts/check-binno-product-contract.mjs` garante que a fila
 * aparece uma so vez e antes das metricas, e essa regra e sobre o PAINEL.
 */
const formatAge = (value: string | null, locale: string) => value
  ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(value))
  : '—';

export type QueueReview = {
  id: string;
  /**
   * O id CRU da avaliacao, sem o prefixo da fila somada.
   *
   * `id` leva `google-oficial:` a frente, porque e a chave por que se paga o
   * rascunho e ela tem de ser unica entre as tres origens. Publicar no Google
   * precisa do outro: o id da linha em `google_business_reviews`. Mandar o
   * prefixado faz o Google recusar, e o dono ve so "nao deu".
   *
   * Vazio para a fila do piloto Apify, que nao tem publicacao oficial.
   */
  idNaFonte?: string;
  rating: number;
  comment: string;
  publishedAt: string | null;
  reviewerName?: string;
  reviewUrl?: string;
  responseObserved: boolean;
};

/**
 * O que a fila guarda sobre uma avaliaçao, no navegador do dono.
 *
 * `draft` e OPCIONAL de propósito, e a diferença é a regra 3 inteira.
 *
 * Até 31/08/2026 ele era obrigatório, e `copyReply` gravava `{ ...currentAction,
 * copied: true }`: carregar em "Copiar e abrir avaliação" persistia o texto que
 * estivesse no ecrã, que antes da resposta do modelo é o TEXTO PADRÃO. A partir
 * daí a avaliação parecia escrita pelo dono para sempre, o pedido ao modelo
 * deixava de sair, e ela nunca mais podia ser lida. Toda avaliação com que ele
 * ensaiou nascia morta. Achado na auditoria de 31/08/2026.
 *
 * Copiar não é escrever. `draft` só é preenchido pela caixa de texto; copiar
 * escreve apenas `copied`. Assim `draft !== undefined` volta a significar
 * exactamente uma coisa: ele escreveu isto.
 */
type ActionState = { draft?: string; copied?: boolean };

/**
 * A chave subiu para `.v2` em 31/08/2026, com a correcçao acima.
 *
 * O formato antigo gravava "o que estava no ecrã quando ele carregou em
 * copiar", e nada distingue lá dentro um texto que ele escreveu de um texto
 * padrão que ele apenas copiou. Ler essas entradas como autoria manteria mortas
 * exactamente as avaliações que o defeito matou.
 *
 * A chave antiga NÃO é apagada: nada se destrói, e ela continua legível para
 * quem quiser inspeccioná-la. O custo desta decisão é, no pior caso, um
 * rascunho que se volta a gerar numa avaliação ainda por responder.
 */
const actionStorageKey = 'binno.approved-cockpit-actions.v2';

const readActions = (): Record<string, ActionState> => {
  try {
    return JSON.parse(window.localStorage.getItem(actionStorageKey) || '{}') as Record<string, ActionState>;
  } catch {
    return {};
  }
};

/**
 * `paisLido` é uma propriedade e não um estado daqui: quem lê o perfil é o
 * painel, e esta fila só precisa de saber se a leitura já terminou. Sem ela, o
 * pedido do rascunho parte no primeiro quadro com o país ainda a `null`, e o
 * cache prende esse resultado à sessão. Ver `paisLido` no painel.
 */
export const ResponseQueue = ({ reviews, snapshot, demo = false, businessCountry, paisLido, publicar, publicando = false }: { reviews: QueueReview[]; snapshot: ExperimentalApifySnapshot; demo?: boolean; businessCountry: string | null; paisLido: boolean; publicar?: (reviewId: string, comment: string) => Promise<boolean>; publicando?: boolean }) => {
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
  // O rascunho que lê a avaliação, por avaliação, guardado na sessão. Ver
  // `src/lib/rascunhoDoModelo.ts` para as quatro regras e o porquê de cada uma.
  const [doModelo, setDoModelo] = useState<Record<string, ResultadoDoModelo>>({});

  // Uma chamada por avaliação, quando o dono a seleciona. Nunca por tecla nem
  // por quadro: a única dependência que muda por seleção é `selected?.id`, e o
  // cache do módulo cuida das voltas, inclusive depois desta fila remontar.
  //
  // `actions` fica FORA das dependências de propósito. Ele muda a cada letra
  // que o dono escreve, e reagir a isso transformaria uma chamada por avaliação
  // numa por tecla, que é o oposto da regra 4. O valor lido aqui é o do momento
  // da seleção, que é o único momento em que esta decisão se toma.
  useEffect(() => {
    if (demo || !selected) return;
    // Sem texto não há o que ler, e a função devolveria `SEM_COMENTARIO`. O
    // template já responde a uma avaliação que é só nota.
    if (selected.comment.trim().length < 3) return;
    // Esperar pelo país antes de pagar a chamada. Ver `paisLido`: o cache do
    // rascunho é por id e prende o primeiro resultado, por isso um pedido que
    // parta cedo demais não se corrige sozinho quando o perfil chega.
    if (!paisLido) return;
    // Regra 3, aplicada antes de gastar: com rascunho ESCRITO pelo dono nesta
    // avaliação, a resposta do modelo não teria como entrar na tela.
    //
    // A pergunta é por `?.draft`, e não pela existência da entrada. Perguntar
    // pela entrada punha ter copiado ao nível de ter escrito, e uma avaliação
    // que ele copiou uma vez nunca mais era lida. Ver `ActionState`.
    if (actions[selected.id]?.draft !== undefined) return;

    const guardado = rascunhoGuardado(selected.id);
    if (guardado) {
      setDoModelo((atual) => ({ ...atual, [selected.id]: guardado }));
      return;
    }

    let vivo = true;
    setDoModelo((atual) => ({ ...atual, [selected.id]: { origem: 'pedindo' } }));
    void pedirRascunho(
      selected.id,
      // Esta fila e so de avaliacoes do Google (ver `official.reviews` acima),
      // por isso o canal e sempre o publico: o que sair daqui vai ser publicado
      // debaixo da avaliacao, onde prometer reparacao esta proibido.
      {
        comment: selected.comment,
        rating: selected.rating,
        businessName: snapshot.business.name,
        channel: 'public',
        customerName: selected.reviewerName ?? null,
        businessCountry,
      },
      pedirRascunhoAoBinno,
    ).then((resultado) => {
      if (vivo) setDoModelo((atual) => ({ ...atual, [selected.id]: resultado }));
    });
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id, demo, paisLido]);

  // Quem decide o que está na caixa é `rascunhoNaTela`, e não este componente:
  // a ordem das três perguntas É a regra 3, e ela vive num lugar que se prova
  // sem React. O template entra como último argumento, que é o mesmo que dizer
  // que ele é o chão: enquanto o modelo não responde, e se ele nunca responder,
  // é ele que está na tela.
  const naTela = rascunhoNaTela(
    selected ? actions[selected.id]?.draft : undefined,
    selected ? doModelo[selected.id] : undefined,
    suggestion,
  );
  // O que esta guardado desta avaliaçao, que nao e o mesmo que o que esta na
  // tela: na tela pode estar o texto padrao ou o do modelo, e nenhum dos dois e
  // autoria dele.
  const guardado = selected ? actions[selected.id] : undefined;
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
  /*
   * PUBLICAR NO GOOGLE, daqui mesmo.
   *
   * Ate 04/09/2026 este cartao so sabia COPIAR: o dono via o rascunho pronto e
   * tinha de sair do produto para colar. O botao que existia para o levar la
   * apontava para a pagina GERAL de avaliacoes, e nao para aquela — a API v4
   * nao devolve URL por avaliacao, entao esse link nunca poderia acertar.
   *
   * `idNaFonte`, e nunca `id`. O `id` leva o prefixo `google-oficial:` da fila
   * somada; o publicador precisa do id da linha em `google_business_reviews`.
   *
   * SO PARA AVALIACAO OFICIAL, e nunca em demonstracao: isto escreve no perfil
   * publico de alguem e nao se desfaz.
   */
  const podePublicar = !demo && Boolean(publicar) && Boolean(selected?.idNaFonte) && !selected?.responseObserved;
  const publicarNoGoogle = async () => {
    if (!publicar || !selected?.idNaFonte) return;
    const texto = naTela.texto.trim();
    if (!texto) return;
    const foi = await publicar(selected.idNaFonte, texto);
    if (foi) {
      toast.success(t('dashboard.cockpit.approved.published'));
      save({ ...(guardado || {}), copied: true });
    } else {
      toast.error(t('dashboard.cockpit.approved.publishError'));
    }
  };

  const copyReply = async () => {
    try { await navigator.clipboard.writeText(naTela.texto); } catch { /* Keep the editable draft available. */ }
    // Copiar marca que ele copiou, e mais nada. Gravar aqui o texto que estava
    // no ecra transformaria o texto padrao em autoria dele, e a avaliaçao nunca
    // mais poderia ser lida pelo modelo. Ver o cabeçalho de `ActionState`.
    save({ ...(guardado || {}), copied: true });
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
  if (!selected) return <Card className="border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]"><CardContent className="p-4 sm:p-5">
    <h2 className="text-lg font-semibold text-slate-950">{t('dashboard.cockpit.layout.queueTitle')}</h2>
    <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50/60 p-4">
      <p className="font-semibold text-amber-950">{t('dashboard.cockpit.reviews.lockedTitle')}</p>
      <p className="mt-1 text-sm leading-6 text-amber-950">{t('dashboard.cockpit.layout.queueEmptyBody')}</p>
    </div>
    <Button asChild variant="outline" className="mt-4"><Link to="/settings">{t('dashboard.cockpit.reviews.action')}<ChevronRight className="ml-1 h-4 w-4" /></Link></Button>
  </CardContent></Card>;

  return <Card className="overflow-hidden border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]"><CardContent className="p-0">
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4 sm:px-5 sm:pt-5"><h2 className="text-lg font-semibold text-slate-950">{t('dashboard.cockpit.layout.queueTitle')}</h2><span className="text-xs text-slate-500">{t('dashboard.cockpit.approved.queuePosition', { current: index + 1, total: reviews.length })}</span></div>
    <div className="p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-slate-950">{selected.reviewerName || t('dashboard.cockpit.layout.anonymousReviewer')}</p><Stars rating={selected.rating} medium /></div><p className="mt-1 text-xs text-slate-500">{formatAge(selected.publishedAt, i18n.language)}</p></div><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => select(index - 1)} disabled={index === 0}><ChevronLeft className="mr-1 h-4 w-4" />{t('dashboard.cockpit.approved.previous')}</Button><Button variant="outline" size="sm" onClick={() => select(index + 1)} disabled={index >= reviews.length - 1}>{t('dashboard.cockpit.approved.next')}<ChevronRight className="ml-1 h-4 w-4" /></Button></div></div>
      <blockquote className="mt-5 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">“{selected.comment}”</blockquote>
      <div className="mt-5 rounded-xl border border-slate-200 bg-white p-3 sm:p-4"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-[#2457D6]">{t('dashboard.cockpit.layout.replyTitle')}</span>{/*
              A etiqueta existe para o DONO saber se esta a ler o modelo ou o
              texto padrao. Na demonstraçao publica (`binno.pro` e `/demo`) nao
              ha dono nem modelo: e uma ilustraçao do produto a funcionar, e o
              efeito acima nem chega a pedir nada. Estampar "Texto padrao" ali
              explicava ao possivel cliente o nosso plano B, no lugar onde ele
              devia estar a ver o produto.
            */}
            {!demo && <OrigemDoRascunho origem={naTela.origem} />}</div>{editing ? <Textarea value={naTela.texto} onChange={(event) => save({ ...(guardado || {}), draft: event.target.value })} className="mt-3 min-h-28 resize-y text-sm leading-6" /> : <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-700">{naTela.texto}</p>}<div className="mt-4 flex flex-wrap gap-2">{podePublicar && <Button onClick={() => void publicarNoGoogle()} disabled={publicando} className="rounded-full bg-[#2457D6] hover:bg-[#1d47b0]"><Send className="mr-2 h-4 w-4" />{publicando ? t('dashboard.cockpit.approved.publishing') : t('dashboard.cockpit.approved.publishOnGoogle')}</Button>}{selected.reviewUrl ? <Button asChild className="rounded-full bg-[#2457D6] hover:bg-[#1d47b0]"><a href={selected.reviewUrl} target="_blank" rel="noreferrer" onClick={() => void copyReply()}><Copy className="mr-2 h-4 w-4" />{t('dashboard.cockpit.assisted.copyAndOpenReview')}<ExternalLink className="ml-2 h-4 w-4" /></a></Button> : <Button onClick={() => void copyReply()} className="rounded-full bg-[#2457D6] hover:bg-[#1d47b0]"><Copy className="mr-2 h-4 w-4" />{guardado?.copied ? t('dashboard.advisor.copiedButton') : t('dashboard.cockpit.assisted.copy')}</Button>}<Button variant="outline" onClick={() => setEditing((value) => !value)}>{editing ? t('dashboard.cockpit.approved.doneEditing') : t('dashboard.cockpit.approved.edit')}</Button><Button variant="outline" onClick={() => select(Math.min(index + 1, reviews.length - 1))}>{t('dashboard.cockpit.approved.skip')}</Button></div></div>
      <div className="mt-4 flex flex-wrap gap-2">{reviews.slice(0, 8).map((review) => <button key={review.id} type="button" onClick={() => { setSelectedId(review.id); setEditing(false); }} className={`rounded-xl border px-3 py-2 text-left text-xs ${review.id === selected.id ? 'border-[#2457D6] bg-blue-50 text-[#2457D6]' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}><span className="block max-w-32 truncate font-semibold">{review.reviewerName || t('dashboard.cockpit.layout.anonymousReviewer')}</span><Stars rating={review.rating} /></button>)}</div>
    </div>
  </CardContent></Card>;
};