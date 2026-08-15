import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { evaluateReputationRadar, ReputationRadarResult } from '@/lib/reputationRadar';

export type ReputationRadarState =
  | { status: 'loading' }
  | { status: 'needs-connection' }
  | { status: 'sync-incomplete'; locationTitle: string }
  | { status: 'ready'; locationTitle: string; lastSyncedAt: string | null; result: ReputationRadarResult }
  | { status: 'error'; message: string };

export const useReputationRadar = (userId?: string) => {
  const [state, setState] = useState<ReputationRadarState>(userId ? { status: 'loading' } : { status: 'needs-connection' });

  useEffect(() => {
    let active = true;

    if (!userId) {
      setState({ status: 'needs-connection' });
      return () => { active = false; };
    }

    const load = async () => {
      setState({ status: 'loading' });

      const { data: connection, error: connectionError } = await supabase
        .from('google_business_connections')
        .select('status')
        .eq('user_id', userId)
        .maybeSingle();
      if (!active) return;
      if (connectionError) {
        setState({ status: 'error', message: connectionError.message });
        return;
      }
      if (connection?.status !== 'connected') {
        setState({ status: 'needs-connection' });
        return;
      }

      const { data: location, error: locationError } = await supabase
        .from('google_business_locations')
        .select('id, title, last_synced_at, review_sync_completed_at')
        .eq('user_id', userId)
        .eq('is_selected', true)
        .maybeSingle();
      if (!active) return;
      if (locationError) {
        setState({ status: 'error', message: locationError.message });
        return;
      }
      if (!location || !location.review_sync_completed_at) {
        setState({ status: 'sync-incomplete', locationTitle: location?.title || '' });
        return;
      }

      const { data: reviews, error: reviewsError } = await supabase
        .from('google_business_reviews')
        .select('id, rating, comment, review_created_at, review_updated_at, reply_text')
        .eq('location_id', location.id);
      if (!active) return;
      if (reviewsError) {
        setState({ status: 'error', message: reviewsError.message });
        return;
      }

      setState({
        status: 'ready',
        locationTitle: location.title,
        lastSyncedAt: location.last_synced_at,
        result: evaluateReputationRadar((reviews || []).map((review) => ({
          id: review.id,
          rating: review.rating,
          comment: review.comment,
          reviewCreatedAt: review.review_created_at,
          reviewUpdatedAt: review.review_updated_at,
          replyText: review.reply_text,
        }))),
      });
    };

    void load();
    return () => { active = false; };
  }, [userId]);

  return state;
};
