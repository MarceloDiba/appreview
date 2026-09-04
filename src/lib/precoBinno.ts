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
 * Troca `{vagas}` e `{regular}` num texto de copy.
 *
 * `{regular}` existe porque o preço cheio estava ESCRITO À MÃO nos três idiomas
 * de `marketing.ts` — exactamente a duplicação que o cabeçalho deste ficheiro
 * avisa. Ao mudar de 199 para 129, a constante mudava e as três frases ficavam
 * a dizer 199. Um preço, um sítio.
 */
export const comVagas = (texto: string) => texto
  .replace('{vagas}', String(VAGAS_DO_LOTE))
  .replace('{regular}', String(PRECO_REGULAR_BRL));
