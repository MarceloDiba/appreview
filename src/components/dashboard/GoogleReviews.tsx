
import React from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { useGoogleReviews } from '@/hooks/useGoogleReviews';
import LoadingState from './reviews/LoadingState';
import ErrorState from './reviews/ErrorState';
import ReviewsHeader from './reviews/ReviewsHeader';
import ReviewsList from './reviews/ReviewsList';
import { useOwnerTranslation } from '@/i18n/owner/useOwnerTranslation';

interface GoogleReviewsProps {
  userId: string;
}

const GoogleReviews: React.FC<GoogleReviewsProps> = ({ userId }) => {
  const { t } = useOwnerTranslation();
  const {
    loading,
    refreshing,
    reviews,
    placeInfo,
    error,
    handleRefresh,
    formatDate
  } = useGoogleReviews(userId);
  
  if (loading) {
    return (
      <Card>
        <LoadingState />
      </Card>
    );
  }
  
  if (error) {
    return (
      <Card>
        <ErrorState error={error} />
      </Card>
    );
  }
  
  return (
    <Card>
      <CardContent className="pt-6">
        <ReviewsHeader 
          placeInfo={placeInfo} 
          refreshing={refreshing} 
          onRefresh={handleRefresh} 
        />
        <div className="mt-6">
          <ReviewsList
            reviews={reviews}
            formatDate={formatDate}
            businessName={placeInfo?.place_name}
          />
        </div>
      </CardContent>
      {placeInfo && placeInfo.last_fetch_time && (
        <CardFooter className="pt-0">
          <div className="text-xs text-gray-400 text-right w-full">
            {t('reviews.google.lastUpdate', { date: formatDate(placeInfo.last_fetch_time) })}
          </div>
        </CardFooter>
      )}
    </Card>
  );
};

export default GoogleReviews;
