
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

    const placeId = typeof payload?.place_id === 'string' ? payload.place_id.trim() : '';

    if (!placeId || placeId.length > 255) {
      return jsonResponse({ error: 'Invalid place_id parameter' }, 400);
    }

    // A chamada paga só pode usar o Place ID que o próprio dono configurou.
    const { data: configuredLink, error: linkError } = await supabase
      .from('platform_links')
      .select('id')
      .eq('user_id', user.id)
      .eq('platform', 'google reviews')
      .eq('place_id', placeId)
      .maybeSingle();

    if (linkError) {
      console.error('Error checking configured Google link:', linkError);
      return jsonResponse({ error: 'Failed to validate Google configuration' }, 500);
    }

    if (!configuredLink) {
      return jsonResponse({ error: 'Place ID is not configured for this account' }, 403);
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
