
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Angry, Meh, Smile } from 'lucide-react';

type EmojiOption = 'negative' | 'neutral' | 'positive';

interface EmojiRatingProps {
  businessName: string;
  businessId: string;
  googleReviewUrl?: string;
  tripAdvisorUrl?: string;
}

const EmojiRating = ({ 
  businessName, 
  businessId, 
  googleReviewUrl = 'https://g.page/r/review-placeholder', 
  tripAdvisorUrl 
}: EmojiRatingProps) => {
  const navigate = useNavigate();
  
  const handleRating = (rating: EmojiOption) => {
    if (rating === 'negative') {
      // If negative, redirect to internal feedback form
      navigate(`/feedback/${businessId}`, { 
        state: { 
          rating,
          businessName 
        } 
      });
    } else {
      // If positive or neutral, redirect to external site
      // Prefer Google Reviews if available, otherwise TripAdvisor
      const externalUrl = googleReviewUrl || tripAdvisorUrl;
      if (externalUrl) {
        window.open(externalUrl, '_blank');
      } else {
        // Fallback if no external URL is provided
        navigate(`/feedback/${businessId}`, { 
          state: { 
            rating,
            businessName 
          } 
        });
      }
    }
  };
  
  return (
    <Card className="w-full max-w-md mx-auto p-6">
      <div className="text-center mb-8">
        <h2 className="text-xl md:text-2xl font-bold text-gray-800">
          Como foi sua experiência?
        </h2>
        <p className="text-gray-600 mt-2">
          {businessName}
        </p>
      </div>
      
      <div className="flex justify-between gap-2">
        <div 
          className="emoji-button bg-review-negative/10"
          onClick={() => handleRating('negative')}
        >
          <div className="emoji-icon text-review-negative">
            <Angry className="h-16 w-16" />
          </div>
          <span className="emoji-label">Ruim</span>
        </div>
        
        <div 
          className="emoji-button bg-review-neutral/10"
          onClick={() => handleRating('neutral')}
        >
          <div className="emoji-icon text-review-neutral">
            <Meh className="h-16 w-16" />
          </div>
          <span className="emoji-label">Regular</span>
        </div>
        
        <div 
          className="emoji-button bg-review-positive/10"
          onClick={() => handleRating('positive')}
        >
          <div className="emoji-icon text-review-positive">
            <Smile className="h-16 w-16" />
          </div>
          <span className="emoji-label">Bom</span>
        </div>
      </div>
      
      <div className="mt-8 text-center">
        <Button 
          variant="link" 
          className="text-gray-500 text-sm hover:text-primary"
          onClick={() => window.history.back()}
        >
          Voltar
        </Button>
      </div>
    </Card>
  );
};

export default EmojiRating;
