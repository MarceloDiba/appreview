
/**
 * Checks whether a URL looks like a Google review/business URL.
 * This accepts review links even when they do not expose a Place ID.
 */
export const isGoogleReviewUrl = (url: string): boolean => {
  if (!url || typeof url !== 'string') return false;

  return [
    /g\.page\/r\//i,
    /g\.page\//i,
    /search\.google\.com\/local\/writereview/i,
    /maps\.google\./i,
    /google\.[^/]+\/maps/i,
  ].some((pattern) => pattern.test(url));
};

/**
 * Extracts a Google Place ID from supported URL formats.
 * Returns null for links that are valid for redirection but do not expose a Place ID.
 * 
 * @param url Google Maps or Business URL
 * @returns Place ID if found, null otherwise
 */
export const extractPlaceIdFromUrl = (url: string): string | null => {
  if (!url || typeof url !== 'string') return null;

  try {
    // 1. placeid=...
    const placeIdMatch = url.match(/[?&]placeid=([^&]+)/i);
    if (placeIdMatch && placeIdMatch[1]) {
      return placeIdMatch[1];
    }

    // 2. place_id=...
    const altPlaceIdMatch = url.match(/[?&]place_id=([^&]+)/i);
    if (altPlaceIdMatch && altPlaceIdMatch[1]) {
      return altPlaceIdMatch[1];
    }

    // 3. cid=...
    const cidMatch = url.match(/[?&]cid=([^&]+)/i);
    if (cidMatch && cidMatch[1]) {
      return `cid:${cidMatch[1]}`;
    }

    return null;
  } catch (error) {
    console.error("Erro ao extrair identificador do link do Google:", error);
    return null;
  }
};

/**
 * Creates a Google Maps URL from a place ID
 * 
 * @param placeId Google Place ID
 * @returns Google Maps URL for the place
 */
export const createGoogleMapsUrl = (placeId: string): string => {
  if (!placeId) return '';
  return `https://www.google.com/maps/place/?q=place_id:${placeId}`;
};

/**
 * Validates a Google Place ID format
 * 
 * @param placeId The place ID to validate
 * @returns boolean indicating if the ID appears to be valid
 */
export const isValidPlaceId = (placeId: string): boolean => {
  if (!placeId) return false;
  
  // Google Place IDs typically start with "ChI" and are alphanumeric
  // This is a basic validation, not comprehensive
  const placeIdRegex = /^(ChI[a-zA-Z0-9_-]+|[a-zA-Z0-9]{20,}|[A-Za-z0-9-]{10,})$/;
  return placeIdRegex.test(placeId);
};

/**
 * Format a Google Places API error message to be user-friendly
 * 
 * @param error Error message or object
 * @returns User-friendly error message
 */
export const formatGooglePlacesError = (error: unknown): string => {
  if (typeof error === 'string') {
    if (error.includes('ZERO_RESULTS')) {
      return 'Não foi possível encontrar o local. Verifique o URL e tente novamente.';
    } else if (error.includes('OVER_QUERY_LIMIT')) {
      return 'Limite de consultas excedido. Tente novamente mais tarde.';
    } else if (error.includes('REQUEST_DENIED')) {
      return 'Acesso negado. Verifique as configurações da API do Google.';
    } else if (error.includes('INVALID_REQUEST')) {
      return 'Solicitação inválida. Verifique o URL e tente novamente.';
    } else {
      return `Erro ao processar a solicitação: ${error}`;
    }
  }
  
  return 'Ocorreu um erro ao processar a solicitação do Google Places.';
};
