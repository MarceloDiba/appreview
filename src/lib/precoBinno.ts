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

/** Preço cheio, e a referência riscada enquanto o lote promocional durar. */
export const PRECO_REGULAR_BRL = 199;

/** Preço do lote promocional de fundadores. */
export const PRECO_PROMO_BRL = 99;

/**
 * Vagas do lote. Não é imposta por código: o limite é operacional, feito ao
 * trocar `STRIPE_BR_PRICE_ID` de volta para o preço cheio quando o lote encher.
 */
export const VAGAS_DO_LOTE = 30;

/** Troca `{vagas}` pelo tamanho do lote num texto de copy. */
export const comVagas = (texto: string) => texto.replace('{vagas}', String(VAGAS_DO_LOTE));
