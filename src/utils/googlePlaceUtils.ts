
/**
 * Extracts a Google Place ID from various Google URL formats
 * 
 * @param url Google Maps or Business URL
 * @returns Place ID if found, null otherwise
 */
export const extractPlaceIdFromUrl = (url: string): string | null => {
  if (!url) return null;
  
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
  
  return null;
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
