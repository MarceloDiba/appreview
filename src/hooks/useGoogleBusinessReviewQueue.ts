import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type BusinessReview = {
  id: string;
  reviewer_name: string | null;
  rating: number;
  comment: string | null;
  review_updated_at: string | null;
  reply_text: string | null;
};

export const useGoogleBusinessReviewQueue = (userId?: string) => {
  const [loading, setLoading] = useState(Boolean(userId));
  const [syncing, setSyncing] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string | null>(null);
  const [locationTitle, setLocationTitle] = useState<string | null>(null);
  const [syncComplete, setSyncComplete] = useState(false);
  const [reviews, setReviews] = useState<BusinessReview[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const { data: connection, error: connectionError } = await supabase
        .from('google_business_connections')
        .select('status')
        .eq('user_id', userId)
        .maybeSingle();
      if (connectionError) throw connectionError;
      setConnectionStatus(connection?.status || 'disconnected');
      if (connection?.status !== 'connected') {
        setLocationTitle(null);
        setReviews([]);
        return;
      }

      const { data: location, error: locationError } = await supabase
        .from('google_business_locations')
        .select('id, title, review_sync_completed_at')
        .eq('user_id', userId)
        .eq('is_selected', true)
        .maybeSingle();
      if (locationError) throw locationError;
      setLocationTitle(location?.title || null);
      setSyncComplete(Boolean(location?.review_sync_completed_at));
      if (!location) {
        setReviews([]);
        return;
      }

      const { data: importedReviews, error: reviewsError } = await supabase
        .from('google_business_reviews')
        .select('id, reviewer_name, rating, comment, review_updated_at, reply_text')
        .eq('location_id', location.id)
        .is('reply_text', null)
        .order('rating', { ascending: true })
        .order('review_updated_at', { ascending: false });
      if (reviewsError) throw reviewsError;
      setReviews(importedReviews || []);
    } catch (loadError) {
      console.error('Could not load Google Business review queue:', loadError);
      setError(loadError instanceof Error ? loadError.message : 'Could not load Google Business reviews');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { void load(); }, [load]);

  const syncAll = async () => {
    setSyncing(true);
    setError(null);
    try {
      let nextPageToken: string | null | undefined;
      do {
        const { data, error: syncError } = await supabase.functions.invoke('sync-google-business-profile', {
          body: { action: 'sync-reviews', ...(nextPageToken ? { page_token: nextPageToken } : {}) },
        });
        if (syncError) throw syncError;
        nextPageToken = data?.next_page_token;
      } while (nextPageToken);
      await load();
      return true;
    } catch (syncError) {
      console.error('Could not sync Google Business reviews:', syncError);
      setError(syncError instanceof Error ? syncError.message : 'Could not sync Google Business reviews');
      return false;
    } finally {
      setSyncing(false);
    }
  };

  const publishReply = async (reviewId: string, comment: string) => {
    setPublishing(true);
    setError(null);
    try {
      const { error: publishError } = await supabase.functions.invoke('sync-google-business-profile', {
        body: { action: 'publish-reply', review_id: reviewId, comment },
      });
      if (publishError) throw publishError;
      await load();
      return true;
    } catch (publishError) {
      console.error('Could not publish Google reply:', publishError);
      setError(publishError instanceof Error ? publishError.message : 'Could not publish Google reply');
      return false;
    } finally {
      setPublishing(false);
    }
  };

  return { loading, syncing, publishing, connectionStatus, locationTitle, syncComplete, reviews, error, syncAll, publishReply };
};
