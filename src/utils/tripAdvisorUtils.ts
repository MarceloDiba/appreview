/**
 * O TripAdvisor não tem API aberta de avaliações, por isso a nossa integração é
 * só um link de destino. Mas o link importa: o dono cola a URL da ficha do
 * restaurante, e a ficha **não** é o formulário de escrita — o cliente aterra
 * na lista de avaliações e tem de procurar o botão. Cada clique extra perde
 * gente que já estava disposta a avaliar.
 *
 * O TripAdvisor expõe o formulário directamente em `UserReviewEdit`, com os
 * mesmos identificadores que já vêm na URL da ficha (g = cidade, d = negócio).
 * Aqui derivamos um a partir do outro.
 *
 * Exemplo:
 *   entra  .../Restaurant_Review-g189158-d25808424-Reviews-Mania_de_petiscos-Lisbon…html
 *   sai    .../UserReviewEdit-g189158-d25808424-Mania_de_petiscos-Lisbon…html
 */

const TRIPADVISOR_HOST = /(^|\.)tripadvisor\.[a-z.]+$/i;

/** Páginas de ficha que o TripAdvisor usa por tipo de negócio. */
const LISTING_PAGE_TYPES = [
  'Restaurant_Review',
  'Hotel_Review',
  'Attraction_Review',
  'VacationRentalReview',
  'ShowUserReviews',
];

export const isTripAdvisorUrl = (url: string): boolean => {
  try {
    return TRIPADVISOR_HOST.test(new URL(url).hostname);
  } catch {
    return false;
  }
};

/**
 * Converte a URL da ficha na URL directa de escrever avaliação. Devolve a URL
 * original se não conseguir reconhecer o formato — nunca inventa um link, porque
 * mandar o cliente para uma página inexistente é pior do que um clique extra.
 */
export const toTripAdvisorReviewUrl = (url: string): string => {
  if (!isTripAdvisorUrl(url)) return url;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }

  // Já é o formulário de escrita: só normaliza o domínio.
  if (parsed.pathname.includes('UserReviewEdit')) {
    parsed.hostname = 'www.tripadvisor.com';
    return parsed.toString();
  }

  const geoAndBusiness = parsed.pathname.match(/-(g\d+)-(d\d+)/);
  if (!geoAndBusiness) return url;

  const pageType = LISTING_PAGE_TYPES.find((type) => parsed.pathname.includes(type));
  if (!pageType) return url;

  const rewritten = parsed.pathname
    .replace(pageType, 'UserReviewEdit')
    // A ficha traz um segmento "-Reviews-" que o formulário não usa.
    .replace(/-Reviews-/, '-');

  // O domínio local (.com.br, .es, .fr) fixa o idioma da página. Um turista
  // inglês que tocasse num link .com.br aterrava em português do Brasil; o .com
  // deixa o TripAdvisor escolher pelo navegador de quem clica.
  parsed.hostname = 'www.tripadvisor.com';
  parsed.pathname = rewritten;

  return parsed.toString();
};

/**
 * Ponto único por onde passam todos os links públicos antes de serem mostrados
 * ao cliente. Hoje só o TripAdvisor precisa de tratamento; o Google já entrega
 * URLs que abrem o formulário.
 */
export const toPublicReviewUrl = (url: string): string =>
  isTripAdvisorUrl(url) ? toTripAdvisorReviewUrl(url) : url;
