
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Frown, Meh, Smile } from 'lucide-react';
import { useTranslation } from '@/i18n/useTranslation';

type EmojiOption = 'negative' | 'neutral' | 'positive';

interface EmojiRatingProps {
  businessName: string;
  businessId: string;
  externalLinks?: Array<{
    platform: string;
    url: string;
  }>;
}

const EmojiRating = ({ 
  businessName, 
  businessId, 
  externalLinks = []
}: EmojiRatingProps) => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const normalizedLinks = externalLinks.map((link) => ({
    platform: link.platform.trim().toLowerCase(),
    url: link.url,
  }));
  const googleReviewUrl = normalizedLinks.find((link) => link.platform.includes('google'))?.url || '';
  const tripAdvisorUrl = normalizedLinks.find((link) => link.platform.includes('tripadvisor'))?.url || '';
  
  const handleRating = (rating: EmojiOption) => {
    // Every rating follows the same path and sees the same public destinations.
    // This avoids selective solicitation while still offering private feedback.
    navigate(`/feedback/${businessId}`, {
      state: { rating, businessName, googleReviewUrl, tripAdvisorUrl },
    });
  };

  return (
    <Card className="w-full max-w-md mx-auto p-6 shadow-lg border-0 bg-white">
      <div className="text-center mb-8">
        <h2 className="text-xl md:text-2xl font-bold text-gray-800">
          {t('ratingQuestion')}
        </h2>
        <p className="text-gray-600 mt-2">
          {businessName}
        </p>
      </div>
      
      <div className="flex justify-between gap-4">
        <button
          type="button"
          className="emoji-button bg-review-negative/10"
          onClick={() => handleRating('negative')}
          aria-label={t('ariaRatingBad')}
        >
          <div className="emoji-icon text-review-negative">
            <Frown className="h-12 w-12 md:h-16 md:w-16" />
          </div>
          <span className="emoji-label">{t('ratingBad')}</span>
        </button>
        
        <button
          type="button"
          className="emoji-button bg-review-neutral/10"
          onClick={() => handleRating('neutral')}
          aria-label={t('ariaRatingOk')}
        >
          <div className="emoji-icon text-review-neutral">
            <Meh className="h-12 w-12 md:h-16 md:w-16" />
          </div>
          <span className="emoji-label">{t('ratingOk')}</span>
        </button>
        
        <button
          type="button"
          className="emoji-button bg-review-positive/10"
          onClick={() => handleRating('positive')}
          aria-label={t('ariaRatingGood')}
        >
          <div className="emoji-icon text-review-positive">
            <Smile className="h-12 w-12 md:h-16 md:w-16" />
          </div>
          <span className="emoji-label">{t('ratingGood')}</span>
        </button>
      </div>
      
      <button
        type="button"
        className="mx-auto mt-8 block text-sm text-gray-500 hover:text-primary"
        onClick={() => window.history.back()}
      >
        {t('back')}
      </button>
    </Card>
  );
};

export default EmojiRating;
