import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface GoogleOutcomeData {
  placeName: string;
  averageRating: number;
  totalReviews: number;
  lastUpdatedAt: string;
  qrOpens: number;
  googleClicks: number;
  privateFeedback: number;
  clickThroughRate: number | null;
  reviewGrowth: number | null;
  ratingChange: number | null;
}

export const useGoogleOutcome = (userId?: string) => {
  const [data, setData] = useState<GoogleOutcomeData | null>(null);
  const [loading, setLoading] = useState(Boolean(userId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    if (!userId) {
      setData(null);
      setLoading(false);
      return () => {
        active = false;
      };
    }

    const load = async () => {
      setLoading(true);
      setError(null);

      const since = new Date();
      since.setDate(since.getDate() - 30);

      const placeResult = await supabase
        .from('external_place_info')
        .select('id, place_name, average_rating, total_reviews, last_fetch_time')
        .eq('user_id', userId)
        .order('last_fetch_time', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!active) return;
      if (placeResult.error) {
        console.error('Error loading Google outcome:', placeResult.error);
        setError(placeResult.error.message);
        setLoading(false);
        return;
      }

      const place = placeResult.data;
      if (!place) {
        setData(null);
        setLoading(false);
        return;
      }

      const [eventsResult, snapshotsResult] = await Promise.all([
        supabase
          .from('review_funnel_events')
          .select('event_type, platform')
          .eq('user_id', userId)
          .gte('created_at', since.toISOString()),
        supabase
          .from('google_review_snapshots')
          .select('total_reviews, average_rating, captured_at')
          .eq('user_id', userId)
          .eq('external_place_id', place.id)
          .gte('captured_at', since.toISOString())
          .order('captured_at', { ascending: true }),
      ]);

      if (!active) return;

      const firstError = eventsResult.error || snapshotsResult.error;
      if (firstError) {
        console.error('Error loading Google outcome:', firstError);
        setError(firstError.message);
        setLoading(false);
        return;
      }

      const events = eventsResult.data || [];
      const snapshots = snapshotsResult.data || [];
      const qrOpens = events.filter((event) => event.event_type === 'qr_open').length;
      const googleClicks = events.filter(
        (event) => event.event_type === 'public_click' && event.platform === 'google'
      ).length;
      const privateFeedback = events.filter(
        (event) => event.event_type === 'private_feedback'
      ).length;
      const baseline = snapshots.length >= 2 ? snapshots[0] : null;

      setData({
        placeName: place.place_name,
        averageRating: Number(place.average_rating),
        totalReviews: place.total_reviews,
        lastUpdatedAt: place.last_fetch_time || new Date().toISOString(),
        qrOpens,
        googleClicks,
        privateFeedback,
        clickThroughRate: qrOpens > 0 ? (googleClicks / qrOpens) * 100 : null,
        reviewGrowth: baseline ? place.total_reviews - baseline.total_reviews : null,
        ratingChange: baseline
          ? Number(place.average_rating) - Number(baseline.average_rating)
          : null,
      });
      setLoading(false);
    };

    void load();
    return () => {
      active = false;
    };
  }, [userId]);

  return { data, loading, error };
};
