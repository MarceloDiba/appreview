
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
const googleApiKey = Deno.env.get('GOOGLE_PLACES_API_KEY') || '';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the place_id from the request
    const { place_id, user_id, force_refresh } = await req.json();
    
    if (!place_id) {
      return new Response(
        JSON.stringify({ error: 'Missing place_id parameter' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Check the last fetch time to see if we need to update the cache
    const { data: placeInfo } = await supabase
      .from('external_place_info')
      .select('*')
      .eq('place_id', place_id)
      .eq('user_id', user_id)
      .maybeSingle();
      
    // If we already have data that's less than 12 hours old and not forcing a refresh, return the cached data
    if (placeInfo?.last_fetch_time && !force_refresh) {
      const lastFetch = new Date(placeInfo.last_fetch_time);
      const now = new Date();
      const hoursSinceLastFetch = (now.getTime() - lastFetch.getTime()) / (1000 * 60 * 60);
      
      // If it's been less than 12 hours, return the cached data
      if (hoursSinceLastFetch < 12) {
        // Fetch cached reviews
        const { data: reviews, error } = await supabase
          .from('cached_reviews')
          .select('*')
          .eq('external_place_id', placeInfo.id)
          .order('time', { ascending: false });
          
        if (error) {
          console.error('Error fetching cached reviews:', error);
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
          
          return new Response(
            JSON.stringify({ 
              place_info: placeInfo, 
              reviews: transformedReviews,
              cached: true 
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // If we need to fetch new data, call the Google Places API
    const fieldsParam = 'name,rating,reviews,user_ratings_total';
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place_id}&fields=${fieldsParam}&key=${googleApiKey}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status !== 'OK') {
      return new Response(
        JSON.stringify({ error: `Google Places API error: ${data.status}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    const placeDetails = data.result;
    
    // Upsert the place info
    const { data: upsertedPlaceInfo, error: placeError } = await supabase
      .from('external_place_info')
      .upsert({
        place_id: place_id,
        user_id: user_id,
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
      return new Response(
        JSON.stringify({ error: 'Failed to store place data' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    // Delete existing cached reviews for this place
    if (upsertedPlaceInfo.id) {
      await supabase
        .from('cached_reviews')
        .delete()
        .eq('external_place_id', upsertedPlaceInfo.id);
    }
    
    // Insert new cached reviews
    const reviews = placeDetails.reviews || [];
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
    return new Response(
      JSON.stringify({
        place_info: upsertedPlaceInfo,
        reviews: transformedReviews,
        cached: false
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error in fetch-google-reviews function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
