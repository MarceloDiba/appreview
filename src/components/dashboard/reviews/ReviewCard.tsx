
import React from 'react';
import { Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ReviewCardProps {
  review: {
    id: string;
    author_name: string;
    author_image?: string;
    rating: number;
    text: string;
    time: string;
  };
  formatDate: (dateString: string) => string;
}

const ReviewCard: React.FC<ReviewCardProps> = ({ review, formatDate }) => {
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
    <div className="border rounded-lg p-4">
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
  );
};

export default ReviewCard;
