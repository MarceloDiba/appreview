
/**
 * Extracts a Google Place ID from various Google URL formats
 * 
 * @param url Google Maps or Business URL
 * @returns Place ID if found, null otherwise
 */
export const extractPlaceIdFromUrl = (url: string): string | null => {
  if (!url || typeof url !== 'string') return null;
  
  try {
    // Try to match place_id parameter in URL
    const placeIdMatch = url.match(/[?&]place_id=([^&]+)/);
    if (placeIdMatch && placeIdMatch[1]) {
      return placeIdMatch[1];
    }
    
    // Try to match place ID in a maps.google.com URL format
    const mapsUrlMatch = url.match(/maps\/(place)\/[^/]+\/([^/]+)/);
    if (mapsUrlMatch && mapsUrlMatch[2]) {
      return mapsUrlMatch[2];
    }
    
    // Try to match CID parameter (sometimes used as an alternative to place_id)
    const cidMatch = url.match(/[?&]cid=(\d+)/);
    if (cidMatch && cidMatch[1]) {
      // Note: This is not actually a place_id, but a CID, which can be used similarly
      return cidMatch[1];
    }
    
    // Try to match g.page URLs
    const gPageMatch = url.match(/g\.page\/([^/?]+)/i);
    if (gPageMatch && gPageMatch[1]) {
      // This isn't a direct place_id but a shortcode that would need to be resolved
      return gPageMatch[1];
    }

    // Try to match g.page/r short URLs
    const gPageReviewMatch = url.match(/g\.page\/r\/([^/?]+)/i);
    if (gPageReviewMatch && gPageReviewMatch[1]) {
      return gPageReviewMatch[1];
    }

    // Try to match simpler google.com/maps URLs with a @location format
    const locationMatch = url.match(/google\.com\/maps\/@([-\d.]+),([-\d.]+)/i);
    if (locationMatch) {
      // This contains latitude and longitude, not a place_id
      // Could be used for reverse geocoding but we return null for now
      return null;
    }
    
    return null;
  } catch (error) {
    console.error("Error parsing Google Maps URL:", error);
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
export const formatGooglePlacesError = (error: any): string => {
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
