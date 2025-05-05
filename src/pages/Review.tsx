
import React from 'react';
import { useParams } from 'react-router-dom';
import EmojiRating from '@/components/emoji-review/EmojiRating';

const Review = () => {
  const { businessId = '' } = useParams<{ businessId: string }>();
  
  // In a real app, you would fetch business data from your backend
  const businessData = {
    id: businessId,
    name: "Restaurante Exemplo",
    googleReviewUrl: "https://g.page/r/review-placeholder",
    tripAdvisorUrl: "https://www.tripadvisor.com/review-placeholder"
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <EmojiRating
        businessId={businessData.id}
        businessName={businessData.name}
        googleReviewUrl={businessData.googleReviewUrl}
        tripAdvisorUrl={businessData.tripAdvisorUrl}
      />
    </div>
  );
};

export default Review;
