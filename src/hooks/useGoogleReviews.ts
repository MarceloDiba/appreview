
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface GoogleReview {
  review_id: string;
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

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    } catch (e) {
      return dateString;
    }
  };

  const formatRelativeTime = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return formatDistanceToNow(date, { addSuffix: true, locale: ptBR });
    } catch (e) {
      return dateString;
    }
  };

  const fetchGoogleReviews = useCallback(async (placeId: string, forceRefresh = false) => {
    setRefreshing(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('fetch-google-reviews', {
        body: { place_id: placeId, user_id: userId, force_refresh: forceRefresh }
      });
      
      if (error) throw new Error(error.message);
      
      if (data?.place_info) {
        setPlaceInfo(data.place_info);
        setReviews(data.reviews || []);
      } else {
        throw new Error('No data returned from Google Places API');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error fetching Google reviews';
      console.error('Error fetching Google reviews:', errorMessage);
      setError(errorMessage);
      toast.error('Erro ao carregar avaliações do Google. Por favor, tente novamente mais tarde.');
    } finally {
      setRefreshing(false);
    }
  }, [userId]);

  const loadGoogleReviews = useCallback(async () => {
    if (!userId) {
      setError('Usuário não autenticado');
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
        setError('Você ainda não configurou um link do Google Reviews. Vá para a aba "Links Externos" para configurar.');
        return;
      }
      
      const googleLink = links[0];
      if (!googleLink.place_id) {
        setError('Link do Google configurado, mas sem Place ID válido. Atualize seu link nas configurações.');
        return;
      }
      
      // If we have a place_id, load reviews
      await fetchGoogleReviews(googleLink.place_id);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error loading Google reviews';
      console.error('Error loading Google reviews:', errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [userId, fetchGoogleReviews]);

  const handleRefresh = async () => {
    if (!placeInfo?.place_id) {
      toast.error('Nenhum Place ID configurado para atualizar');
      return;
    }
    
    await fetchGoogleReviews(placeInfo.place_id, true);
    toast.success('Avaliações atualizadas com sucesso!');
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
