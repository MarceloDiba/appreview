
import React, { useEffect, useState } from 'react';
import { Star, RefreshCw, AlertCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { createGoogleMapsUrl } from '@/utils/googlePlaceUtils';

interface GoogleReview {
  id: string;
  author_name: string;
  author_image?: string;
  rating: number;
  text: string;
  time: string;
}

interface PlaceInfo {
  id: string;
  place_id: string;
  place_name: string;
  average_rating: number;
  total_reviews: number;
  last_fetch_time: string;
}

interface GoogleReviewsProps {
  userId: string;
}

const GoogleReviews: React.FC<GoogleReviewsProps> = ({ userId }) => {
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
        .select('place_id, url')
        .eq('user_id', userId)
        .eq('platform', 'google reviews')
        .maybeSingle();
        
      if (linksError) {
        throw new Error('Erro ao buscar informações do Google Reviews');
      }
      
      if (!platformLinks || !platformLinks.place_id) {
        setError('Nenhum ID do Google Places configurado. Por favor, adicione um link válido do Google Reviews nas configurações.');
        setLoading(false);
        return;
      }
      
      // Call the Edge Function to fetch reviews
      const { data, error: fetchError } = await supabase.functions.invoke('fetch-google-reviews', {
        body: {
          place_id: platformLinks.place_id,
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
  
  useEffect(() => {
    if (userId) {
      fetchGoogleReviews();
    }
  }, [userId]);
  
  const handleRefresh = () => {
    setRefreshing(true);
    fetchGoogleReviews(true);
  };
  
  const renderStars = (rating: number) => {
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={16}
            className={star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}
          />
        ))}
      </div>
    );
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
  
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Avaliações do Google</CardTitle>
          <CardDescription>Carregando avaliações...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Avaliações do Google</CardTitle>
          <CardDescription>Erro ao carregar avaliações</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start p-4 rounded-lg bg-amber-50 border border-amber-100">
            <AlertCircle className="h-5 w-5 text-amber-500 mr-3 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-amber-800">Configuração necessária</h4>
              <p className="text-sm text-amber-700 mt-1">{error}</p>
              <Button 
                variant="link" 
                className="p-0 mt-2 text-amber-800"
                onClick={() => window.location.href = '/settings'}
              >
                Ir para Configurações
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Avaliações do Google</CardTitle>
          <CardDescription>
            {placeInfo && (
              <>
                {placeInfo.total_reviews} avaliações · Média: {placeInfo.average_rating.toFixed(1)}
                {renderStars(placeInfo.average_rating)}
              </>
            )}
          </CardDescription>
        </div>
        <div className="flex items-center space-x-2">
          {placeInfo?.place_id && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.open(createGoogleMapsUrl(placeInfo.place_id), '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Ver no Google
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {reviews.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Nenhuma avaliação encontrada
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div key={review.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {review.author_image ? (
                      <img 
                        src={review.author_image} 
                        alt={review.author_name} 
                        className="h-8 w-8 rounded-full mr-2"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-gray-200 mr-2 flex items-center justify-center">
                        {review.author_name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="font-medium">{review.author_name}</div>
                      <div className="text-sm text-gray-500">{formatDate(review.time)}</div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    {renderStars(review.rating)}
                    <Badge className="ml-2" variant="secondary">{review.rating}/5</Badge>
                  </div>
                </div>
                <div className="mt-2 text-gray-700">{review.text}</div>
              </div>
            ))}
          </div>
        )}
        
        {placeInfo && placeInfo.last_fetch_time && (
          <div className="text-xs text-gray-400 text-right mt-4">
            Última atualização: {formatDate(placeInfo.last_fetch_time)}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GoogleReviews;
