/**
 * Preço do Binno Maps no Brasil, num lugar só.
 *
 * O número aparecia escrito à mão na página pública e no Perfil. Duas cópias do
 * mesmo preço são duas cópias que precisam concordar, e este projeto já pagou
 * esse defeito. Quem muda o preço muda aqui.
 *
 * O valor cobrado de facto é o do `STRIPE_BR_PRICE_ID` no cofre do Supabase.
 * Estas constantes são o que o gestor lê antes de decidir; elas não cobram nada
 * sozinhas e precisam ser mantidas de acordo com o preço ativo na Stripe.
 */

/**
 * Preço cheio, e a referência riscada enquanto o lote promocional durar.
 *
 * Passou de 199 para 129 em 04/09/2026, por decisão do Marcelo ao rever a copy
 * de venda. O preço cheio é uma promessa sobre o futuro — é o que o cliente
 * vai pagar quando o lote acabar —, e por isso tem de bater com o preço que
 * estiver activo na Stripe nesse dia.
 */
export const PRECO_REGULAR_BRL = 129;

/** Preço do lote promocional de fundadores. */
export const PRECO_PROMO_BRL = 99;

/**
 * Vagas do lote. Não é imposta por código: o limite é operacional, feito ao
 * trocar `STRIPE_BR_PRICE_ID` de volta para o preço cheio quando o lote encher.
 */
export const VAGAS_DO_LOTE = 50;

/**
 * Troca `{vagas}`, `{regular}` e `{promo}` num texto de copy.
 *
 * `{regular}` existe porque o preço cheio estava ESCRITO À MÃO nos três idiomas
 * de `marketing.ts` — exactamente a duplicação que o cabeçalho deste ficheiro
 * avisa. Ao mudar de 199 para 129, a constante mudava e as três frases ficavam
 * a dizer 199. Um preço, um sítio.
 *
 * `{promo}` entrou em 04/09/2026 junto com a home nova: a copy da prévia cita o
 * preço promocional onze vezes (banner de lote, CTAs, plano, FAQ), e cada uma
 * dessas citações escrita à mão seria outra cópia para o mesmo guarda apanhar.
 *
 * Substituição GLOBAL, e não da primeira ocorrência: a FAQ cita `{promo}` uma
 * vez no título e outra no corpo, e o banner de lote cita `{regular}` sozinho
 * enquanto o corpo da mesma frase já tinha `{promo}`. Com `String.replace`
 * simples a segunda ocorrência de cada marcador ficava literal na tela — o
 * mesmo defeito que este ficheiro existe para evitar, só que dentro da própria
 * função que evita. `replaceAll` faria o mesmo, mas pede lib ES2021+; o alvo
 * deste projeto é ES2020, e regex com `/g` cobre o mesmo caso sem mudar isso.
 */
export const comVagas = (texto: string) => texto
  .replace(/\{vagas\}/g, String(VAGAS_DO_LOTE))
  .replace(/\{regular\}/g, String(PRECO_REGULAR_BRL))
  .replace(/\{promo\}/g, String(PRECO_PROMO_BRL));
