
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { extractPlaceIdFromUrl } from '@/utils/googlePlaceUtils';

export interface GoogleReview {
  id: string;
  author_name: string;
  author_image?: string;
  rating: number;
  text: string;
  time: string;
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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reviews, setReviews] = useState<GoogleReview[]>([]);
  const [placeInfo, setPlaceInfo] = useState<PlaceInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchGoogleReviews = async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);
      
      // First, get the Google Place ID from platform_links
      const { data: platformLinks, error: linksError } = await supabase
        .from('platform_links')
        .select('url')
        .eq('user_id', userId)
        .eq('platform', 'google reviews')
        .maybeSingle();
        
      if (linksError) {
        throw new Error('Erro ao buscar informações do Google Reviews');
      }
      
      if (!platformLinks) {
        setError('Nenhum link do Google Reviews configurado. Por favor, adicione um link válido do Google Reviews nas configurações.');
        setLoading(false);
        return;
      }
      
      // Extract place_id from URL
      const place_id = platformLinks.url ? extractPlaceIdFromUrl(platformLinks.url) : null;
      
      if (!place_id) {
        setError('Nenhum ID do Google Places detectado no URL configurado. Por favor, verifique se o URL do Google Reviews é válido.');
        setLoading(false);
        return;
      }
      
      // Call the Edge Function to fetch reviews
      const { data, error: fetchError } = await supabase.functions.invoke('fetch-google-reviews', {
        body: {
          place_id: place_id,
          user_id: userId,
          force_refresh: forceRefresh
        }
      });
      
      if (fetchError) {
        throw new Error(`Erro ao buscar avaliações: ${fetchError.message}`);
      }
      
      setPlaceInfo(data.place_info);
      setReviews(data.reviews || []);
      
      // Show toast if we fetched fresh data
      if (!data.cached) {
        toast.success('Avaliações do Google atualizadas com sucesso!');
      }
    } catch (err) {
      console.error('Error fetching Google reviews:', err);
      setError(err instanceof Error ? err.message : 'Erro ao buscar avaliações do Google');
      toast.error('Erro ao buscar avaliações do Google');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchGoogleReviews(true);
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('pt-BR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(date);
    } catch (e) {
      return dateString;
    }
  };

  useEffect(() => {
    if (userId) {
      fetchGoogleReviews();
    }
  }, [userId]);

  return {
    loading,
    refreshing,
    reviews,
    placeInfo,
    error,
    handleRefresh,
    formatDate
  };
};
