
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { enUS, pt, ptBR } from 'date-fns/locale';
import { useOwnerTranslation } from '@/i18n/owner/useOwnerTranslation';
import { FunctionsHttpError } from '@supabase/supabase-js';

export interface GoogleReview {
  review_id: string;
  author_name: string;
  author_image?: string | null;
  author_uri?: string | null;
  rating: number;
  text: string;
  time: string;
  google_maps_uri?: string | null;
}

export interface PlaceInfo {
  id: string;
  place_id: string;
  place_name: string;
  average_rating: number;
  total_reviews: number;
  last_fetch_time: string;
}

export const useGoogleReviews = (userId: string) => {
  const { t, i18n } = useOwnerTranslation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reviews, setReviews] = useState<GoogleReview[]>([]);
  const [placeInfo, setPlaceInfo] = useState<PlaceInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const normalizeGoogleReviewsError = useCallback(
    (message: string): string => {
      if (message.includes('PLACE_ID_UNRESOLVED')) {
        return t('reviews.google.placeIdMissing');
      }

      if (
        message.includes('Failed to send a request to the Edge Function') ||
        message.includes('FunctionsFetchError') ||
        message.includes('fetch failed')
      ) {
        return t('reviews.google.autoImportUnavailable');
      }

      return t('reviews.google.genericError');
    },
    [t]
  );

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat(i18n.resolvedLanguage || i18n.language, {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      }).format(date);
    } catch {
      return dateString;
    }
  };

  const formatRelativeTime = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      const locale =
        i18n.resolvedLanguage === 'pt-BR'
          ? ptBR
          : i18n.resolvedLanguage === 'pt-PT'
            ? pt
            : enUS;
      return formatDistanceToNow(date, { addSuffix: true, locale });
    } catch {
      return dateString;
    }
  };

  const fetchGoogleReviews = useCallback(async (placeId?: string) => {
    setRefreshing(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('fetch-google-reviews', {
        body: placeId ? { place_id: placeId } : {}
      });
      
      if (error) {
        if (error instanceof FunctionsHttpError) {
          const responseBody = await error.context.json().catch(() => null);
          if (responseBody?.code === 'PLACE_ID_UNRESOLVED') {
            throw new Error('PLACE_ID_UNRESOLVED');
          }
        }
        throw new Error(error.message);
      }
      
      if (data?.place_info) {
        setPlaceInfo(data.place_info);
        setReviews(data.reviews || []);
      } else {
        throw new Error('No data returned from Google Places API');
      }
    } catch (error) {
      const rawErrorMessage = error instanceof Error ? error.message : 'Error fetching Google reviews';
      const errorMessage = normalizeGoogleReviewsError(rawErrorMessage);
      console.error('Error fetching Google reviews:', errorMessage);
      setError(errorMessage);
      toast.error(t('reviews.google.loadToast'));
    } finally {
      setRefreshing(false);
    }
  }, [normalizeGoogleReviewsError, t]);

  const loadGoogleReviews = useCallback(async () => {
    if (!userId) {
      setError(t('reviews.google.notAuthenticated'));
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // First, check if the user has configured a Google Review link
      const { data: links, error: linksError } = await supabase
        .from('platform_links')
        .select('*')
        .eq('user_id', userId)
        .eq('platform', 'google reviews');
        
      if (linksError) throw new Error(linksError.message);
      
      if (!links || links.length === 0) {
        setError(t('reviews.google.linkMissing'));
        return;
      }
      
      const googleLink = links[0] as (typeof links)[number] & { place_id?: string | null };

      // A Edge Function também resolve links curtos g.page de forma autenticada.
      await fetchGoogleReviews(googleLink.place_id || undefined);
    } catch (error) {
      const rawErrorMessage = error instanceof Error ? error.message : 'Error loading Google reviews';
      const errorMessage = normalizeGoogleReviewsError(rawErrorMessage);
      console.error('Error loading Google reviews:', errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [userId, fetchGoogleReviews, normalizeGoogleReviewsError, t]);

  const handleRefresh = async () => {
    if (!placeInfo?.place_id) {
      toast.error(t('reviews.google.noPlaceId'));
      return;
    }
    
    await fetchGoogleReviews(placeInfo.place_id);
    toast.success(t('reviews.refreshedToast'));
  };

  useEffect(() => {
    loadGoogleReviews();
  }, [loadGoogleReviews]);

  return {
    loading,
    refreshing,
    reviews,
    placeInfo,
    error,
    handleRefresh,
    formatDate,
    formatRelativeTime
  };
};
