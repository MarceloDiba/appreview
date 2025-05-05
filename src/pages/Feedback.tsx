
import React from 'react';
import { useParams, useLocation } from 'react-router-dom';
import FeedbackForm from '@/components/forms/FeedbackForm';

interface LocationState {
  rating: 'negative' | 'neutral' | 'positive';
  businessName: string;
}

const Feedback = () => {
  const { businessId = '' } = useParams<{ businessId: string }>();
  const location = useLocation();
  const state = location.state as LocationState;
  
  // If no state is passed, default to negative rating and generic business name
  const rating = state?.rating || 'negative';
  const businessName = state?.businessName || 'Negócio';
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <FeedbackForm
        businessId={businessId}
        businessName={businessName}
        rating={rating}
      />
    </div>
  );
};

export default Feedback;
