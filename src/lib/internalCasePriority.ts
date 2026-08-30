/**
 * A ordem de um caso interno sem tratar segue uma única regra, usada pelo
 * bloco "Comentários que pedem atenção" da Visão geral
 * (`PendingCommentsBanner.tsx`) e pela lista de casos em `/reviews`
 * (`CasesList.tsx`). As duas telas importam esta função em vez de
 * reimplementar a ordem cada uma à sua maneira: foi exatamente com duas
 * cópias da mesma regra, uma no bloco e outra na lista, que o bloco passou a
 * destacar um caso diferente do primeiro card que o dono via ao chegar.
 *
 * A regra, decidida em 30/08/2026 (`docs/decisoes-30-08-ordem-e-navegacao.md`,
 * secção 1): o mais recente primeiro. Ninguém abre esta lista para ver a
 * reclamação mais antiga; o dono chega vindo de um aviso sobre um comentário
 * que acabou de entrar e espera encontrá-lo no topo.
 *
 * Isto reverte uma escolha anterior deste mesmo arquivo, em que quem deixara
 * contato vinha sempre antes de quem não deixara. Essa escolha foi tomada por
 * uma razão técnica (fazer o bloco e a lista concordarem sobre qual caso é o
 * primeiro), e estava errada para quem usa: um comentário de ontem com
 * contato passava na frente de um de agora sem contato. O selo de contato
 * continua a aparecer (ver `caseHasContact`), mas parou de reordenar a lista.
 * É a troca que o dono aceitou: ordem previsível vale mais do que priorizar
 * quem é mais fácil de responder.
 *
 * Quando dois casos têm o mesmo `created_at`, o desempate é por `id`, em
 * ordem crescente: sem significado para o dono, só existe para a ordem ser
 * sempre a mesma nas duas telas.
 *
 * Este arquivo não importa nada além do necessário para o tipo, para poder
 * ser carregado direto pelo guarda `scripts/check-shared-case-ordering.mjs`
 * com `node --experimental-strip-types`, sem passar pelo alias `@/` do Vite.
 */

export interface PrioritizableCase {
  id: string;
  customer_email: string | null;
  created_at: string | null;
  is_addressed: boolean | null;
}

/** Um caso deixou uma forma de contato utilizável (hoje, o WhatsApp escrito no formulário público). */
export const caseHasContact = (item: PrioritizableCase): boolean =>
  !!item.customer_email && item.customer_email.trim() !== '';

const createdAtTime = (item: PrioritizableCase): number =>
  item.created_at ? new Date(item.created_at).getTime() : 0;

/**
 * Casos sem tratar, do mais recente para o mais antigo. O contato não entra
 * no critério: um caso com contato mantém o selo, mas não pula a fila por
 * causa dele. Empate de `created_at` desempata por `id` crescente, só para a
 * ordem ser determinística. Quem consome isto para destacar um único caso
 * usa o item `[0]`; quem consome para uma lista usa o array inteiro.
 */
export const orderPendingCasesByRecency = <T extends PrioritizableCase>(cases: T[]): T[] => {
  const pending = cases.filter((item) => !item.is_addressed);
  return [...pending].sort((a, b) => {
    const recency = createdAtTime(b) - createdAtTime(a);
    if (recency !== 0) return recency;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
};
