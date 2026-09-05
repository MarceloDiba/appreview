
import React from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { useGoogleReviews } from '@/hooks/useGoogleReviews';
import { useAvaliacoesJaRespondidas } from '@/hooks/useAvaliacoesJaRespondidas';
import LoadingState from './reviews/LoadingState';
import ErrorState from './reviews/ErrorState';
import ReviewsHeader from './reviews/ReviewsHeader';
import ReviewsList from './reviews/ReviewsList';
import { useOwnerTranslation } from '@/i18n/owner/useOwnerTranslation';

interface GoogleReviewsProps {
  userId: string;
  /** `profiles.business_country`, para escolher pt-BR vs. pt-PT na sugestão. */
  businessCountry: string | null;
  /**
   * Falso quando a ligação oficial ao Google manda.
   *
   * Esta lista é o retrato da Apify: tirado num instante, e cego para tudo o
   * que aconteceu depois — inclusive para quem já foi respondido. Oferecer
   * "sugerir resposta" a partir dele convida o dono a responder duas vezes.
   */
  podeSugerirResposta?: boolean;
}

const GoogleReviews: React.FC<GoogleReviewsProps> = ({ userId, businessCountry, podeSugerirResposta = true }) => {
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
  const jaRespondidas = useAvaliacoesJaRespondidas(userId);
  
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
          <div className="mb-3 text-xs text-gray-500">
            {t('reviews.google.relevanceNotice')} · {t('reviews.google.attribution')}
          </div>
          <ReviewsList
            jaRespondidas={jaRespondidas}
            podeSugerirResposta={podeSugerirResposta}
            reviews={reviews}
            formatDate={formatDate}
            businessName={placeInfo?.place_name}
            businessCountry={businessCountry}
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
