
import React from 'react';
import ReviewCard from './ReviewCard';
import { GoogleReview } from '@/hooks/useGoogleReviews';
import { useOwnerTranslation } from '@/i18n/owner/useOwnerTranslation';

interface ReviewsListProps {
  reviews: GoogleReview[];
  formatDate: (dateString: string) => string;
  /** Nome do negócio, para assinar as respostas sugeridas. */
  businessName?: string | null;
  /** `profiles.business_country`, para escolher pt-BR vs. pt-PT na sugestão. */
  businessCountry: string | null;
}

const ReviewsList: React.FC<ReviewsListProps> = ({ reviews, formatDate, businessName, businessCountry }) => {
  const { t } = useOwnerTranslation();
  if (reviews.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        {t('reviews.google.empty')}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <ReviewCard 
          key={review.review_id} 
          review={review} 
          formatDate={formatDate} 
          businessName={businessName}
          businessCountry={businessCountry}
        />
      ))}
    </div>
  );
};

export default ReviewsList;
