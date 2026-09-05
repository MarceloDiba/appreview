/**
 * O que o formulário do cliente grava em `internal_feedback`, e como a escolha
 * feita na tela anterior vira nota.
 *
 * Isto vive num módulo puro, fora do componente, por um motivo prático: é a
 * única parte deste caminho que dá para verificar sem navegador. O guarda
 * `scripts/check-nota-honesta.mjs` importa estas funções e confere o payload
 * que chega ao Supabase.
 */

/** A escolha feita na tela de avaliação, antes de virar nota de 1 a 5. */
export type Rating = 'negative' | 'neutral' | 'positive';

/**
 * O que vem em `location.state.rating` não é confiável: pode ser undefined
 * (link direto, refresh, voltar do navegador) ou qualquer coisa que tenha
 * ficado no histórico. Um `as Rating` cru deixava passar as duas coisas.
 * Aqui, ou é uma das três escolhas reais, ou não é nada.
 */
export function normalizarRating(valor: unknown): Rating | null {
  if (valor === 'negative' || valor === 'neutral' || valor === 'positive') {
    return valor;
  }
  return null;
}

/**
 * Traduz a escolha da tela anterior para a nota de 1 a 5.
 *
 * Sem escolha, devolve `null`, e não 3.
 *
 * Assumir 3 punha na boca do cliente uma opinião que ele nunca deu: 3 é nota
 * baixa, fica gravada como avaliação dele e dispara o aviso de reclamação no
 * WhatsApp do dono, que era avisado de um cliente insatisfeito inexistente.
 *
 * Assumir 5 seria pior por outro motivo. Marcar a nota boa de antemão empurra
 * o cliente para ela, e empurrar o cliente para a nota boa é da mesma família
 * do review gating que este produto recusa por princípio. Quem não escolheu
 * fica sem nota, e a nota fica em branco até o cliente tocar nas estrelas.
 */
export function notaDoRating(rating: Rating | null): number | null {
  if (rating === 'negative') return 1;
  if (rating === 'neutral') return 3;
  if (rating === 'positive') return 5;
  return null;
}

export interface ComentarioInterno {
  userId: string;
  /** A nota escolhida, de 1 a 5, ou `null` quando o cliente não escolheu. */
  nota: number | null;
  comentario: string;
  nome: string;
  contato: string;
}

export interface ComentarioInternoInsert {
  user_id: string;
  feedback_text: string;
  rating: number | null;
  customer_name: string | null;
  customer_email: string | null;
}

/**
 * Monta a linha de `internal_feedback`.
 *
 * `rating` vai explicitamente como `null` quando não houve escolha, em vez de
 * ficar de fora do payload: a coluna passou a aceitar nulo na migração
 * `20260830210000_nota_opcional_no_comentario.sql`, e o gatilho de aviso no
 * WhatsApp sai cedo quando a nota é nula, então nenhum aviso falso é enviado.
 */
export function comentarioParaGravar(entrada: ComentarioInterno): ComentarioInternoInsert {
  return {
    user_id: entrada.userId,
    feedback_text: entrada.comentario,
    rating: entrada.nota,
    customer_name: entrada.nome || null,
    customer_email: entrada.contato || null,
  };
}

/**
 * Como o painel deve ler a nota de um caso.
 *
 * `null` não é zero nem uma nota ruim: é a ausência de opinião. Desenhar a
 * escala mesmo assim, com as cinco estrelas apagadas, mostra ao dono
 * exatamente o que uma nota 1 mostraria, o que é o oposto da verdade quando o
 * comentário é um elogio. Quem lê tem de ver que não houve nota.
 */
export type LeituraDaNota = { tipo: 'nota'; valor: number } | { tipo: 'sem-nota' };

export function lerNotaDoCaso(rating: number | null | undefined): LeituraDaNota {
  if (typeof rating !== 'number' || Number.isNaN(rating)) {
    return { tipo: 'sem-nota' };
  }
  return { tipo: 'nota', valor: rating };
}

/**
 * O dono a quem o comentário pertence, quando vem do endereço público.
 *
 * A página do QR aceita o identificador do dono pela URL, e o que chega pela
 * URL é texto de quem a escreveu. Sem esta conferência, um `user_id` inválido
 * seguiria para a gravação e o banco recusaria a linha inteira — o cliente
 * veria um erro por um endereço que outra pessoa montou mal.
 *
 * Mora aqui, e não no formulário, porque é o mesmo módulo que monta a linha
 * que este identificador vai preencher.
 */
export function ehIdentificadorDeDono(valor: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(valor);
}
