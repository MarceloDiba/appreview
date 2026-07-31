
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
const googleApiKey = Deno.env.get('GOOGLE_PLACES_API_KEY') || '';
const cacheTtlHours = 12;

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  });

const validPlaceIdPattern = /^(ChI[a-zA-Z0-9_-]+|[a-zA-Z0-9_-]{20,})$/;
const allowedGoogleHosts = new Set([
  'g.page',
  'goo.gl',
  'maps.app.goo.gl',
  'google.com',
  'www.google.com',
  'maps.google.com',
  'search.google.com',
  'google.com.br',
  'www.google.com.br',
  'maps.google.com.br',
  'google.pt',
  'www.google.pt',
  'maps.google.pt',
]);

const extractPlaceId = (value: string): string | null => {
  try {
    const url = new URL(value);
    const placeId = url.searchParams.get('placeid') || url.searchParams.get('place_id');
    if (!placeId) return null;

    const normalized = placeId.trim();
    return validPlaceIdPattern.test(normalized) ? normalized : null;
  } catch {
    return null;
  }
};

const parseAllowedGoogleUrl = (value: string): URL | null => {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || !allowedGoogleHosts.has(url.hostname.toLowerCase())) {
      return null;
    }
    return url;
  } catch {
    return null;
  }
};

/**
 * Links curtos g.page e maps.app.goo.gl não mostram o Place ID ao cliente,
 * mas o próprio redirecionamento do Google normalmente o inclui. Seguir apenas
 * hosts Google explicitamente permitidos evita transformar a função num proxy
 * para endereços arbitrários e não usa a API paga do Places.
 */
const resolvePlaceIdFromGoogleUrl = async (value: string): Promise<string | null> => {
  let currentUrl = value;

  for (let redirectCount = 0; redirectCount <= 5; redirectCount += 1) {
    const parsedUrl = parseAllowedGoogleUrl(currentUrl);
    if (!parsedUrl) return null;

    const directPlaceId = extractPlaceId(parsedUrl.toString());
    if (directPlaceId) return directPlaceId;

    const response = await fetch(parsedUrl, {
      method: 'HEAD',
      redirect: 'manual',
    });
    const location = response.headers.get('location');
    if (!location) return null;

    currentUrl = new URL(location, parsedUrl).toString();
  }

  return null;
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const authorization = req.headers.get('Authorization');
    if (!authorization) {
      return jsonResponse({ error: 'Authentication required' }, 401);
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authorization } },
    });
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return jsonResponse({ error: 'Invalid session' }, 401);
    }

    let payload: Record<string, unknown>;
    try {
      payload = await req.json();
    } catch {
      return jsonResponse({ error: 'Invalid JSON body' }, 400);
    }

    const requestedPlaceId =
      typeof payload?.place_id === 'string' ? payload.place_id.trim() : '';

    if (
      requestedPlaceId &&
      (requestedPlaceId.length > 255 || !validPlaceIdPattern.test(requestedPlaceId))
    ) {
      return jsonResponse({ error: 'Invalid place_id parameter' }, 400);
    }

    // A chamada paga só pode usar o link que o próprio dono configurou.
    const { data: configuredLink, error: linkError } = await supabase
      .from('platform_links')
      .select('id, url, place_id')
      .eq('user_id', user.id)
      .eq('platform', 'google reviews')
      .maybeSingle();

    if (linkError) {
      console.error('Error checking configured Google link:', linkError);
      return jsonResponse({ error: 'Failed to validate Google configuration' }, 500);
    }

    if (!configuredLink) {
      return jsonResponse({ error: 'Google link is not configured for this account' }, 403);
    }

    let placeId =
      typeof configuredLink.place_id === 'string' ? configuredLink.place_id.trim() : '';

    if (placeId && requestedPlaceId && placeId !== requestedPlaceId) {
      return jsonResponse({ error: 'Place ID does not match the configured Google link' }, 403);
    }

    if (!placeId) {
      try {
        placeId = (await resolvePlaceIdFromGoogleUrl(configuredLink.url)) || '';
      } catch (resolutionError) {
        console.error('Error resolving Google Place ID:', resolutionError);
      }

      if (!placeId) {
        return jsonResponse(
          {
            code: 'PLACE_ID_UNRESOLVED',
            error: 'Place ID could not be resolved from the configured Google link',
          },
          422,
        );
      }

      const { error: placeIdUpdateError } = await supabase
        .from('platform_links')
        .update({ place_id: placeId })
        .eq('id', configuredLink.id)
        .eq('user_id', user.id);

      if (placeIdUpdateError) {
        console.error('Error saving resolved Google Place ID:', placeIdUpdateError);
        return jsonResponse({ error: 'Failed to save the resolved Google Place ID' }, 500);
      }
    }

    // Limite por conta, inclusive quando o Place ID é trocado. Sem isso, seria
    // possível alternar links válidos e gerar uma chamada paga a cada pedido.
    const { data: latestFetch, error: latestFetchError } = await supabase
      .from('external_place_info')
      .select('place_id, last_fetch_time')
      .eq('user_id', user.id)
      .not('last_fetch_time', 'is', null)
      .order('last_fetch_time', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestFetchError) {
      console.error('Error checking Google fetch limit:', latestFetchError);
      return jsonResponse({ error: 'Failed to check Google fetch limit' }, 500);
    }

    if (latestFetch?.last_fetch_time && latestFetch.place_id !== placeId) {
      const hoursSinceLatestFetch =
        (Date.now() - new Date(latestFetch.last_fetch_time).getTime()) / (1000 * 60 * 60);

      if (hoursSinceLatestFetch < cacheTtlHours) {
        return jsonResponse({ error: 'Google data can be fetched once every 12 hours' }, 429);
      }
    }

    // Check the last fetch time to see if we need to update the cache
    const { data: placeInfo, error: placeInfoError } = await supabase
      .from('external_place_info')
      .select('*')
      .eq('place_id', placeId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (placeInfoError) {
      console.error('Error checking Google cache:', placeInfoError);
      return jsonResponse({ error: 'Failed to read Google cache' }, 500);
    }

    // O cliente não pode furar o cache: isso impediria controlar chamadas pagas.
    if (placeInfo?.last_fetch_time) {
      const lastFetch = new Date(placeInfo.last_fetch_time);
      const now = new Date();
      const hoursSinceLastFetch = (now.getTime() - lastFetch.getTime()) / (1000 * 60 * 60);
      
      // If it's been less than 12 hours, return the cached data
      if (hoursSinceLastFetch < cacheTtlHours) {
        // Fetch cached reviews
        const { data: reviews, error } = await supabase
          .from('cached_reviews')
          .select('*')
          .eq('external_place_id', placeInfo.id)
          .order('time', { ascending: false });
          
        if (error) {
          console.error('Error fetching cached reviews:', error);
          return jsonResponse({ error: 'Failed to read cached reviews' }, 500);
        } else {
          // Transform the reviews to match the expected format
          const transformedReviews = reviews?.map(review => ({
            review_id: review.review_id,
            author_name: review.author_name,
            author_image: review.author_image,
            rating: review.rating,
            text: review.text,
            time: review.time
          })) || [];
          
          return jsonResponse({
            place_info: placeInfo,
            reviews: transformedReviews,
            cached: true,
          });
        }
      }
    }

    // If we need to fetch new data, call the Google Places API
    if (!googleApiKey) {
      console.error('GOOGLE_PLACES_API_KEY is not configured');
      return jsonResponse({ error: 'Google integration is not configured' }, 500);
    }

    const fieldsParam = 'name,rating,reviews,user_ratings_total';
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=${fieldsParam}&key=${googleApiKey}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status !== 'OK') {
      return jsonResponse({ error: `Google Places API error: ${data.status}` }, 502);
    }
    
    const placeDetails = data.result;

    const { error: businessNameError } = await supabase
      .from('platform_links')
      .update({ business_name: placeDetails.name || null })
      .eq('id', configuredLink.id)
      .eq('user_id', user.id);

    if (businessNameError) {
      console.error('Error saving the Google business name:', businessNameError);
    }
    
    // Upsert the place info
    const { data: upsertedPlaceInfo, error: placeError } = await supabase
      .from('external_place_info')
      .upsert({
        place_id: placeId,
        user_id: user.id,
        place_name: placeDetails.name,
        average_rating: placeDetails.rating || 0,
        total_reviews: placeDetails.user_ratings_total || 0,
        last_fetch_time: new Date().toISOString()
      }, { 
        onConflict: 'place_id,user_id', 
        returning: 'representation' 
      })
      .select()
      .single();
      
    if (placeError) {
      console.error('Error upserting place info:', placeError);
      return jsonResponse({ error: 'Failed to store place data' }, 500);
    }
    
    // Delete existing cached reviews for this place
    if (upsertedPlaceInfo.id) {
      const { error: deleteError } = await supabase
        .from('cached_reviews')
        .delete()
        .eq('external_place_id', upsertedPlaceInfo.id);

      if (deleteError) {
        console.error('Error replacing cached reviews:', deleteError);
        return jsonResponse({ error: 'Failed to replace cached reviews' }, 500);
      }
    }
    
    // Insert new cached reviews
    const reviews = Array.isArray(placeDetails.reviews) ? placeDetails.reviews : [];
    const reviewsToInsert = reviews.map(review => ({
      external_place_id: upsertedPlaceInfo.id,
      review_id: review.time.toString(), // Using timestamp as a unique ID
      author_name: review.author_name,
      author_image: review.profile_photo_url,
      rating: review.rating,
      text: review.text,
      time: new Date(review.time * 1000).toISOString()
    }));
    
    if (reviewsToInsert.length > 0) {
      const { error: reviewsError } = await supabase
        .from('cached_reviews')
        .insert(reviewsToInsert);
        
      if (reviewsError) {
        console.error('Error inserting cached reviews:', reviewsError);
        return jsonResponse({ error: 'Failed to store cached reviews' }, 500);
      }
    }
    
    // Transform the reviews to match the expected format
    const transformedReviews = reviewsToInsert.map(review => ({
      review_id: review.review_id,
      author_name: review.author_name,
      author_image: review.author_image,
      rating: review.rating,
      text: review.text,
      time: review.time
    }));
    
    // Return the place info and reviews
    return jsonResponse({
      place_info: upsertedPlaceInfo,
      reviews: transformedReviews,
      cached: false,
    });
    
  } catch (error) {
    console.error('Error in fetch-google-reviews function:', error);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
});
