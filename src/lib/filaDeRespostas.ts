/**
 * A fila única de respostas da página `/reviews`.
 *
 * Até 30/08/2026 a página tinha abas e três origens separadas: o comentário
 * privado do QR (`CasesList`), a fila oficial do Perfil da Empresa
 * (`GoogleBusinessReviewQueue`) e a leitura pública do Google
 * (`GoogleReviews`). Duas dependem de uma ligação que não existe em nenhuma
 * conta real, então o dono abria a página, escolhia uma aba e encontrava
 * vazio. Nas palavras dele, na noite de 30/08/2026: "um lugar só para
 * responder, com as origens somadas em vez de separadas por aba. O dono não
 * quer escolher entre 'privado' e 'Google': quer a próxima avaliação que
 * precisa de resposta."
 *
 * Este módulo é a soma. Ele não ordena nada por conta própria: converte cada
 * origem para a forma que `orderPendingCasesByRecency` já sabe ordenar e
 * devolve o resultado dela. Duas ordenações que precisam concordar já custaram
 * três rodadas a este projeto (ver o cabeçalho de `internalCasePriority.ts`),
 * e uma fila somada com uma segunda cópia da regra seria a quarta.
 *
 * É um módulo puro, sem `@/` e sem Supabase, e importa o vizinho com a
 * extensão `.ts` escrita, para que `scripts/check-shared-case-ordering.mjs` o
 * carregue direto com `node --experimental-strip-types`, sem passar pelo
 * resolvedor do Vite. É a mesma razão pela qual `internalCasePriority.ts` não
 * importa nada.
 */

import { orderPendingCasesByRecency, type PrioritizableCase } from './internalCasePriority.ts';

/**
 * De onde o item veio. O dono vê isto em cada linha da fila: ele não escolhe
 * a origem antes de responder, mas precisa saber para onde vai a resposta,
 * porque o comentário privado se responde por mensagem directa e a avaliação
 * do Google se responde em público, na página do negócio.
 */
export type OrigemDaResposta = 'comentario-privado' | 'google-oficial' | 'google-publico';

export interface ItemDaFila extends PrioritizableCase {
  origem: OrigemDaResposta;
  /**
   * O identificador dentro da própria fonte. `id` leva o prefixo da origem
   * para ser único na fila somada (e para o desempate por `id` continuar
   * determinístico); as ações que escrevem (marcar um caso como resolvido,
   * publicar a resposta no Google) precisam do identificador original.
   */
  idNaFonte: string;
  autor: string | null;
  texto: string | null;
  /**
   * `null` quando a fonte não devolveu nota. Quem desenha isto nunca pode
   * desenhar a escala de cinco estrelas apagadas: cinco estrelas apagadas é
   * exactamente o que uma nota 1 desenha, e um elogio sem nota apareceria ao
   * dono como a pior avaliação que ele já recebeu.
   */
  nota: number | null;
  /** Permalink individual da avaliação, quando a fonte o devolve. */
  link: string | null;
  /**
   * Perfil público de quem avaliou, quando a fonte o devolve. Existia na
   * lista antiga do Google e voltou com a fila: para o dono, saber se quem
   * reclamou é um avaliador de uma avaliação só ou alguém com histórico muda
   * o peso da reclamação.
   */
  autorUrl: string | null;
}

/** `internal_feedback`, o comentário privado deixado no QR da mesa. */
export interface ComentarioPrivadoDaFila {
  id: string;
  customer_name: string | null;
  customer_email: string | null;
  feedback_text: string | null;
  rating: number | null;
  is_addressed: boolean | null;
  created_at: string | null;
}

/** `google_business_reviews`, a fila do Perfil da Empresa ligado. */
export interface AvaliacaoOficialDaFila {
  id: string;
  reviewer_name: string | null;
  rating: number;
  comment: string | null;
  review_updated_at: string | null;
  reply_text: string | null;
}

/** `cached_reviews`, a leitura pública do perfil do Google. */
export interface AvaliacaoPublicaDaFila {
  review_id: string;
  author_name: string;
  rating: number;
  text: string | null;
  time: string;
  google_maps_uri?: string | null;
  author_uri?: string | null;
}

const doComentarioPrivado = (caso: ComentarioPrivadoDaFila): ItemDaFila => ({
  id: `comentario-privado:${caso.id}`,
  idNaFonte: caso.id,
  origem: 'comentario-privado',
  customer_email: caso.customer_email,
  created_at: caso.created_at,
  is_addressed: caso.is_addressed,
  autor: caso.customer_name,
  texto: caso.feedback_text,
  nota: typeof caso.rating === 'number' ? caso.rating : null,
  link: null,
  autorUrl: null,
});

const daAvaliacaoOficial = (avaliacao: AvaliacaoOficialDaFila): ItemDaFila => ({
  id: `google-oficial:${avaliacao.id}`,
  idNaFonte: avaliacao.id,
  origem: 'google-oficial',
  // Quem avalia no Google não deixa contacto: não há mensagem directa a
  // enviar, a resposta é pública. `null` aqui é o facto, não um vazio.
  customer_email: null,
  created_at: avaliacao.review_updated_at,
  // A ligação oficial devolve a resposta já publicada, então aqui o estado é
  // conhecido: com resposta, o item sai da fila.
  is_addressed: Boolean(avaliacao.reply_text),
  autor: avaliacao.reviewer_name,
  texto: avaliacao.comment,
  nota: avaliacao.rating,
  link: null,
  autorUrl: null,
});

const daAvaliacaoPublica = (avaliacao: AvaliacaoPublicaDaFila, respondida: boolean): ItemDaFila => ({
  id: `google-publico:${avaliacao.review_id}`,
  idNaFonte: avaliacao.review_id,
  origem: 'google-publico',
  customer_email: null,
  created_at: avaliacao.time,
  /**
   * Três estados, e a diferença entre eles importa.
   *
   * `true` quando o DONO marcou que já respondeu no Google. Só ele sabe: o
   * Binno nunca publica resposta nenhuma, e a Places API não devolve as
   * respostas publicadas. Sem esta marcação o item ficava na fila para
   * sempre, e "N esperando resposta" nunca descia, o que ensina o dono a
   * ignorar o número.
   *
   * `null` (e não `false`) enquanto ele não marcou: o Binno NÃO SABE se já
   * foi respondida. `false` seria afirmar que não foi, e o contrato proíbe
   * apresentar inferência como facto. `null` é falsy, então o item fica na
   * fila, que é a escolha certa para quem responde, e a tela diz uma vez só
   * que sobre esta origem o estado não é visível sem ele marcar.
   */
  is_addressed: respondida ? true : null,
  autor: avaliacao.author_name,
  texto: avaliacao.text,
  nota: avaliacao.rating,
  link: avaliacao.google_maps_uri || null,
  autorUrl: avaliacao.author_uri || null,
});

export interface FontesDaFila {
  privados?: ComentarioPrivadoDaFila[];
  oficiais?: AvaliacaoOficialDaFila[];
  publicas?: AvaliacaoPublicaDaFila[];
  /**
   * `review_id` das avaliações públicas que o DONO marcou como já respondidas
   * por ele no Google (`google_public_reviews_answered`). O Binno não publica
   * nada; isto é a palavra do dono sobre o que ele já fez na página dele.
   */
  respondidasNoGoogle?: string[];
}

const semAcentos = (valor: string): string =>
  valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');

const diaDe = (data: string | null): string => {
  if (!data) return '';
  const instante = new Date(data);
  return Number.isNaN(instante.getTime()) ? '' : instante.toISOString().slice(0, 10);
};

/**
 * Identidade de uma avaliação do Google vista pelas duas APIs.
 *
 * A mesma avaliação chega com identificadores diferentes conforme a porta: a
 * Places API devolve o `review_id` dela, o Perfil da Empresa devolve um
 * `accounts/.../reviews/...`. Os dois espaços de nomes não se cruzam, então a
 * identidade tem de ser reconstruída a partir do que as duas devolvem em
 * comum: quem escreveu, que nota deu e em que dia.
 *
 * A chave só serve para REMOVER uma cópia, nunca para criar uma. O pior caso
 * de um falso positivo é o mesmo avaliador ter deixado duas avaliações com a
 * mesma nota no mesmo dia no mesmo negócio, e nesse caso a versão oficial, que
 * é a que sabe se já foi respondida, é a que fica.
 */
export const chaveDaAvaliacaoDoGoogle = (autor: string | null, nota: number, data: string | null): string =>
  `${semAcentos(autor || '')}|${nota}|${diaDe(data)}`;

/**
 * Todos os itens das três origens, já sem duplicados e já com o estado de
 * "tratado" resolvido. Não ordena: quem ordena é `orderPendingCasesByRecency`,
 * chamada uma vez pela fila e uma vez pelo histórico.
 */
export const montarItensDaFila = ({
  privados = [],
  oficiais = [],
  publicas = [],
  respondidasNoGoogle = [],
}: FontesDaFila): ItemDaFila[] => {
  const itensOficiais = oficiais.map(daAvaliacaoOficial);
  // Com a ligação oficial ligada, a mesma avaliação chega pelas duas portas do
  // Google e aparecia duas vezes na fila. A oficial é a que fica: só ela sabe
  // se o dono já respondeu, porque devolve a resposta publicada.
  const jaVistasNoOficial = new Set(
    oficiais.map((avaliacao) => chaveDaAvaliacaoDoGoogle(avaliacao.reviewer_name, avaliacao.rating, avaliacao.review_updated_at)),
  );
  const respondidas = new Set(respondidasNoGoogle);
  const itensPublicos = publicas
    .filter((avaliacao) => !jaVistasNoOficial.has(chaveDaAvaliacaoDoGoogle(avaliacao.author_name, avaliacao.rating, avaliacao.time)))
    .map((avaliacao) => daAvaliacaoPublica(avaliacao, respondidas.has(avaliacao.review_id)));

  return [...privados.map(doComentarioPrivado), ...itensOficiais, ...itensPublicos];
};

/**
 * A fila somada: tudo o que espera resposta, do mais recente para o mais
 * antigo, seja qual for a origem.
 *
 * A ordem inteira vem de `orderPendingCasesByRecency`. Este arquivo não tem
 * ordenação própria de propósito: a única regra de ordem do produto vive num
 * lugar só, e as três telas que a usam (o bloco da Visão geral, esta fila e o
 * histórico) não podem discordar sobre qual é o próximo.
 */
export const montarFilaDeRespostas = (fontes: FontesDaFila): ItemDaFila[] =>
  orderPendingCasesByRecency<ItemDaFila>(montarItensDaFila(fontes));

/**
 * O histórico: o que o dono já tratou, do mais recente para o mais antigo.
 * Comentário privado marcado como resolvido, e avaliação pública que ele
 * marcou como já respondida por ele no Google.
 *
 * Não é fila (não espera nada), mas sumia da tela se a página só mostrasse o
 * pendente, e é onde ele confere o que já resolveu. A ordem sai da mesma
 * função, invertendo o estado antes de a chamar, para não existir uma segunda
 * regra de recência neste arquivo.
 */
export const itensJaTratados = (fontes: FontesDaFila): ItemDaFila[] =>
  orderPendingCasesByRecency<ItemDaFila>(
    montarItensDaFila(fontes)
      .filter((item) => item.is_addressed === true)
      .map((item) => ({ ...item, is_addressed: false })),
  ).map((item) => ({ ...item, is_addressed: true }));
