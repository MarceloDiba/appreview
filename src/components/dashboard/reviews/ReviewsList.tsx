
import React from 'react';
import ReviewCard from './ReviewCard';
import { GoogleReview } from '@/hooks/useGoogleReviews';

interface ReviewsListProps {
  reviews: GoogleReview[];
  formatDate: (dateString: string) => string;
  /** Nome do negócio, para assinar as respostas sugeridas. */
  businessName?: string | null;
}

const ReviewsList: React.FC<ReviewsListProps> = ({ reviews, formatDate, businessName }) => {
  if (reviews.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        Nenhuma avaliação encontrada
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
        />
      ))}
    </div>
  );
};

export default ReviewsList;
