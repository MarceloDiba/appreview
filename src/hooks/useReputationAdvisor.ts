import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { buildReplySuggestions } from '@/lib/replySuggestions';

export interface AdvisorReview {
  authorName: string;
  rating: number;
  text: string;
  time: string;
  googleMapsUri: string | null;
  suggestedReply: string;
}

export const useReputationAdvisor = (userId?: string) => {
  const [review, setReview] = useState<AdvisorReview | null>(null);
  const [loading, setLoading] = useState(Boolean(userId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    if (!userId) {
      setReview(null);
      setLoading(false);
      return () => {
        active = false;
      };
    }

    const load = async () => {
      setLoading(true);
      setError(null);

      const { data: place, error: placeError } = await supabase
        .from('external_place_info')
        .select('id, place_name')
        .eq('user_id', userId)
        .order('last_fetch_time', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!active) return;
      if (placeError) {
        setError(placeError.message);
        setLoading(false);
        return;
      }

      if (!place) {
        setReview(null);
        setLoading(false);
        return;
      }

      const { data: reviews, error: reviewsError } = await supabase
        .from('cached_reviews')
        .select('author_name, rating, text, time, google_maps_uri')
        .eq('external_place_id', place.id)
        .order('time', { ascending: false })
        .limit(5);

      if (!active) return;
      if (reviewsError) {
        setError(reviewsError.message);
        setLoading(false);
        return;
      }

      const candidates = (reviews || []).filter((item) => item.text?.trim());
      const selected =
        candidates.find((item) => item.rating <= 3) || candidates[0] || null;

      if (!selected) {
        setReview(null);
        setLoading(false);
        return;
      }

      const suggestion = buildReplySuggestions({
        channel: 'public',
        rating: selected.rating,
        text: selected.text,
        customerName: selected.author_name,
        businessName: place.place_name,
      })[0];

      setReview({
        authorName: selected.author_name,
        rating: selected.rating,
        text: selected.text || '',
        time: selected.time,
        googleMapsUri: selected.google_maps_uri,
        suggestedReply: suggestion?.body || '',
      });
      setLoading(false);
    };

    void load();
    return () => {
      active = false;
    };
  }, [userId]);

  return { review, loading, error };
};
