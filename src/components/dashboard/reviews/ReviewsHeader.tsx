
import React from 'react';
import { RefreshCw, ExternalLink, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CardDescription, CardTitle } from '@/components/ui/card';
import { createGoogleMapsUrl } from '@/utils/googlePlaceUtils';

interface PlaceInfo {
  id: string;
  place_id: string;
  place_name: string;
  average_rating: number;
  total_reviews: number;
  last_fetch_time: string;
}

interface ReviewsHeaderProps {
  placeInfo: PlaceInfo | null;
  refreshing: boolean;
  onRefresh: () => void;
}

const ReviewsHeader: React.FC<ReviewsHeaderProps> = ({ 
  placeInfo, 
  refreshing, 
  onRefresh 
}) => {
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

  return (
    <div className="flex flex-row items-center justify-between">
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
          onClick={onRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>
    </div>
  );
};

export default ReviewsHeader;
