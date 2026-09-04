/**
 * A intenção de assinar, carregada do preço até o checkout.
 *
 * Quem clica no preço da página pública quer comprar, não criar conta. A conta
 * continua obrigatória — a assinatura pertence a um utilizador e o país do
 * negócio é o que decide o preço —, mas até 04/09/2026 a intenção morria no
 * caminho: o botão levava ao cadastro, o cadastro ao login, e o login ao painel
 * ou ao passo a passo. Nenhuma dessas telas levava à cobrança, que só existia
 * em Perfil › Assinatura, para quem soubesse procurar.
 *
 * Estas funções levam a intenção pela cadeia inteira, para que a última porta
 * seja a de pagamento.
 */

const PARAM = 'assinar';

/** A aba de cobrança do Perfil, o destino de quem veio para comprar. */
export const ROTA_ASSINATURA = '/profile?aba=assinatura';

/** Lê a intenção de `location.search`. */
export const querAssinar = (search: string) => new URLSearchParams(search).get(PARAM) === '1';

/** Acrescenta a intenção a uma rota, preservando query string existente. */
export const comIntencao = (rota: string, quer: boolean) =>
  quer ? `${rota}${rota.includes('?') ? '&' : '?'}${PARAM}=1` : rota;
