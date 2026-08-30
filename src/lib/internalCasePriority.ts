/**
 * A urgência de um caso interno sem tratar segue uma única regra, usada pelo
 * bloco "Comentários que pedem atenção" da Visão geral
 * (`PendingCommentsBanner.tsx`) e pela lista de casos em `/reviews`
 * (`CasesList.tsx`). As duas telas importam esta função em vez de
 * reimplementar a ordem cada uma à sua maneira: foi exatamente com duas
 * cópias da mesma regra, uma no bloco e outra na lista, que o bloco passou a
 * destacar um caso diferente do primeiro card que o dono via ao chegar.
 *
 * A regra: quem deixou contato vem antes de quem não deixou, porque só o
 * primeiro pode ser resolvido com uma ligação agora; um caso sem contato só
 * pode ser aprendido, não respondido. Dentro de cada grupo, o mais antigo
 * vem primeiro, por ser o mais perto de o cliente ter ido embora.
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
 * Casos sem tratar, do mais urgente para o menos urgente: contato antes de
 * sem contato, e dentro de cada grupo o mais antigo primeiro. Quem consome
 * isto para destacar um único caso usa o item `[0]`; quem consome para uma
 * lista usa o array inteiro.
 */
export const orderPendingCasesByUrgency = <T extends PrioritizableCase>(cases: T[]): T[] => {
  const pending = cases.filter((item) => !item.is_addressed);
  return [...pending].sort((a, b) => {
    const contactRank = (caseHasContact(a) ? 0 : 1) - (caseHasContact(b) ? 0 : 1);
    if (contactRank !== 0) return contactRank;
    return createdAtTime(a) - createdAtTime(b);
  });
};
