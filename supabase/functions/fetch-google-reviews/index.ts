
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { temAcesso } from '../_shared/acesso.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
const googleApiKey = Deno.env.get('GOOGLE_PLACES_API_KEY') || '';
const cacheTtlHours = 12;

interface GooglePlacesReview {
  name?: string;
  rating?: number;
  text?: { text?: string };
  originalText?: { text?: string };
  authorAttribution?: {
    displayName?: string;
    uri?: string;
    photoUri?: string;
  };
  publishTime?: string;
  googleMapsUri?: string;
}

interface GooglePlaceDetailsResponse {
  displayName?: { text?: string };
  rating?: number;
  userRatingCount?: number;
  reviews?: GooglePlacesReview[];
  error?: { status?: string; message?: string };
}

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

    // SO USA QUEM PAGA. Vem antes de tudo o que gasta: esta funcao chama a API
    // paga do Google Places, e foi ela que uma conta sem pagamento correu em
    // 04/09/2026, devolvendo os dados de um negocio real.
    const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '');
    if (!await temAcesso(admin, user.id)) {
      return jsonResponse({ code: 'SEM_ASSINATURA', error: 'Sua assinatura nao esta ativa.' }, 402);
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
            author_uri: review.author_uri,
            rating: review.rating,
            text: review.text || '',
            time: review.time,
            google_maps_uri: review.google_maps_uri,
          })) || [];
          
          return jsonResponse({
            place_info: placeInfo,
            reviews: transformedReviews,
            cached: true,
          });
        }
      }
    }

    // If we need to fetch new data, call Place Details (New). The legacy
    // endpoint rejects projects where the old Places API was not previously
    // enabled. A narrow field mask also makes the billable SKU explicit.
    if (!googleApiKey) {
      console.error('GOOGLE_PLACES_API_KEY is not configured');
      return jsonResponse({ error: 'Google integration is not configured' }, 500);
    }

    const fieldsParam = 'displayName,rating,userRatingCount,reviews';
    const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`;

    const response = await fetch(url, {
      headers: {
        'X-Goog-Api-Key': googleApiKey,
        'X-Goog-FieldMask': fieldsParam,
      },
    });

    // Le o corpo como texto primeiro. Um response.json() que falha caladinho
    // foi o mesmo defeito que custou uma ida e volta inteira em 03/09/2026: o
    // servidor tinha o motivo exato (o corpo da resposta do Google) e ninguem
    // o registava. Ler o texto aqui garante que o motivo vai para o log mesmo
    // quando o corpo nao e JSON (por exemplo, uma pagina de erro em HTML de
    // um endereco desligado pelo Google).
    const bodyText = await response.text().catch(() => '');
    let data: GooglePlaceDetailsResponse = {};
    let corpoInvalido = false;
    try {
      data = JSON.parse(bodyText);
    } catch {
      corpoInvalido = true;
    }

    if (corpoInvalido) {
      console.error(
        'Google recusou em %s: HTTP %s | corpo nao e JSON: %s',
        'buscar detalhes do local', response.status, bodyText.slice(0, 300),
      );
      return jsonResponse({ code: 'GOOGLE_PLACES_ERROR', error: 'Google Places API request failed' }, 502);
    }

    if (!response.ok) {
      console.error(
        'Google recusou em %s: HTTP %s | status %s | %s',
        'buscar detalhes do local', response.status, data.error?.status || '?', data.error?.message || 'sem mensagem',
      );
      return jsonResponse({ code: 'GOOGLE_PLACES_ERROR', error: 'Google Places API request failed' }, 502);
    }

    const placeName = data.displayName?.text?.trim();
    if (!placeName) {
      console.error('Google Places API (New) response has no display name');
      return jsonResponse({ code: 'GOOGLE_PLACES_ERROR', error: 'Google Places API response is incomplete' }, 502);
    }

    const normalizedReviews = (Array.isArray(data.reviews) ? data.reviews : [])
      .flatMap((review) => {
        const authorName = review.authorAttribution?.displayName?.trim();
        if (
          !review.name ||
          typeof review.rating !== 'number' ||
          !review.publishTime ||
          !authorName
        ) {
          return [];
        }

        return [{
          review_id: review.name,
          author_name: authorName,
          author_image: review.authorAttribution?.photoUri || null,
          author_uri: review.authorAttribution?.uri || null,
          rating: review.rating,
          text: review.text?.text || review.originalText?.text || null,
          time: review.publishTime,
          google_maps_uri: review.googleMapsUri || null,
        }];
      });

    const { error: businessNameError } = await supabase
      .from('platform_links')
      .update({ business_name: placeName })
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
        place_name: placeName,
        average_rating: typeof data.rating === 'number' ? data.rating : 0,
        total_reviews: typeof data.userRatingCount === 'number' ? data.userRatingCount : 0,
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

    // Preserve an honest history of Google's own totals. This measures change
    // observed on Google; it does not claim Binno caused that change.
    const { error: snapshotError } = await supabase
      .from('google_review_snapshots')
      .insert({
        external_place_id: upsertedPlaceInfo.id,
        user_id: user.id,
        total_reviews: typeof data.userRatingCount === 'number' ? data.userRatingCount : 0,
        average_rating: typeof data.rating === 'number' ? data.rating : 0,
        captured_at: new Date().toISOString(),
      });

    if (snapshotError) {
      // Metrics must not make review import unavailable during a rolling deploy.
      console.error('Error storing Google review snapshot:', snapshotError);
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
    const reviewsToInsert = normalizedReviews.map(review => ({
      external_place_id: upsertedPlaceInfo.id,
      review_id: review.review_id,
      author_name: review.author_name,
      author_image: review.author_image,
      author_uri: review.author_uri,
      rating: review.rating,
      text: review.text,
      time: review.time,
      google_maps_uri: review.google_maps_uri,
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
      author_uri: review.author_uri,
      rating: review.rating,
      text: review.text || '',
      time: review.time,
      google_maps_uri: review.google_maps_uri,
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
