
import React from 'react';
import { RefreshCw, ExternalLink, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CardDescription, CardTitle } from '@/components/ui/card';
import { createGoogleMapsUrl } from '@/utils/googlePlaceUtils';
import { PlaceInfo } from '@/hooks/useGoogleReviews';
import { useOwnerTranslation } from '@/i18n/owner/useOwnerTranslation';

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
  const { t, i18n } = useOwnerTranslation();
  const numberFormat = new Intl.NumberFormat(i18n.resolvedLanguage || i18n.language);
  const ratingFormat = new Intl.NumberFormat(i18n.resolvedLanguage || i18n.language, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
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
        <CardTitle>{t('reviews.google.title')}</CardTitle>
        <CardDescription>
          {placeInfo && (
            <>
              {t('reviews.google.totalAndAverage', {
                total: numberFormat.format(placeInfo.total_reviews),
                average: ratingFormat.format(placeInfo.average_rating),
              })}
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
            {t('reviews.google.viewOnGoogle')}
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          {t('reviews.google.refresh')}
        </Button>
      </div>
    </div>
  );
};

export default ReviewsHeader;
