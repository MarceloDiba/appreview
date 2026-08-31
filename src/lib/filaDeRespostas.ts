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
});

const daAvaliacaoPublica = (avaliacao: AvaliacaoPublicaDaFila): ItemDaFila => ({
  id: `google-publico:${avaliacao.review_id}`,
  idNaFonte: avaliacao.review_id,
  origem: 'google-publico',
  customer_email: null,
  created_at: avaliacao.time,
  /**
   * `null`, e não `false`: a leitura pública do perfil não devolve as
   * respostas que o dono já publicou, então o Binno NÃO SABE se esta já foi
   * respondida. `false` seria afirmar que não foi, e o contrato de produto
   * proíbe apresentar uma inferência como facto. `null` é falsy, então o item
   * fica na fila, que é a escolha certa para quem responde, e a tela
   * mostra, uma vez só, que sobre esta origem o estado não é visível.
   */
  is_addressed: null,
  autor: avaliacao.author_name,
  texto: avaliacao.text,
  nota: avaliacao.rating,
  link: avaliacao.google_maps_uri || null,
});

export interface FontesDaFila {
  privados?: ComentarioPrivadoDaFila[];
  oficiais?: AvaliacaoOficialDaFila[];
  publicas?: AvaliacaoPublicaDaFila[];
}

/**
 * A fila somada: tudo o que espera resposta, do mais recente para o mais
 * antigo, seja qual for a origem.
 *
 * A ordem inteira vem de `orderPendingCasesByRecency`. Este arquivo não tem
 * `.sort(` nenhum de propósito: a única regra de ordem do produto vive num
 * lugar só, e as três telas que a usam (o bloco da Visão geral, esta fila e a
 * lista de tratados) não podem discordar sobre qual é o próximo.
 */
export const montarFilaDeRespostas = ({ privados = [], oficiais = [], publicas = [] }: FontesDaFila): ItemDaFila[] =>
  orderPendingCasesByRecency<ItemDaFila>([
    ...privados.map(doComentarioPrivado),
    ...oficiais.map(daAvaliacaoOficial),
    ...publicas.map(daAvaliacaoPublica),
  ]);

/**
 * Os comentários privados já tratados, do mais recente para o mais antigo.
 * Não são fila (não esperam nada), mas continuam a ser o histórico que o dono
 * consulta para lembrar o que já resolveu, e sumiam da tela se a página só
 * mostrasse o que está pendente.
 *
 * A ordem sai da mesma função, invertendo o estado antes de a chamar, para não
 * existir uma segunda regra de recência neste arquivo.
 */
export const comentariosJaTratados = (privados: ComentarioPrivadoDaFila[]): ItemDaFila[] =>
  orderPendingCasesByRecency<ItemDaFila>(
    privados.filter((caso) => caso.is_addressed).map((caso) => ({ ...doComentarioPrivado(caso), is_addressed: false })),
  ).map((item) => ({ ...item, is_addressed: true }));
