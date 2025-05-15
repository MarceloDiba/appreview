
import React from 'react';
import ReviewCard from './ReviewCard';

interface GoogleReview {
  id: string;
  author_name: string;
  author_image?: string;
  rating: number;
  text: string;
  time: string;
}

interface ReviewsListProps {
  reviews: GoogleReview[];
  formatDate: (dateString: string) => string;
}

const ReviewsList: React.FC<ReviewsListProps> = ({ reviews, formatDate }) => {
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
          key={review.id} 
          review={review} 
          formatDate={formatDate} 
        />
      ))}
    </div>
  );
};

export default ReviewsList;
