import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ExternalLink, MessageSquareText } from 'lucide-react';
import { useTranslation } from '@/i18n/useTranslation';
import { trackReviewEvent, type ReviewPlatform } from '@/lib/reviewFunnel';

interface EmojiRatingProps {
  businessName: string;
  businessId: string;
  userId: string;
  externalLinks?: Array<{
    platform: string;
    url: string;
  }>;
}

const platformFor = (platform: string): ReviewPlatform | null => {
  const normalized = platform.toLowerCase();
  if (normalized.includes('google')) return 'google';
  if (normalized.includes('tripadvisor')) return 'tripadvisor';
  return null;
};

const EmojiRating = ({
  businessName,
  businessId,
  userId,
  externalLinks = [],
}: EmojiRatingProps) => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const availableExternalLinks = externalLinks
    .map((link) => ({ ...link, trackedPlatform: platformFor(link.platform) }))
    .filter((link) => Boolean(link.url) && link.trackedPlatform);

  const googleReviewUrl = availableExternalLinks.find(
    (link) => link.trackedPlatform === 'google'
  )?.url;
  const tripAdvisorUrl = availableExternalLinks.find(
    (link) => link.trackedPlatform === 'tripadvisor'
  )?.url;

  const trackPublicClick = (platform: ReviewPlatform) => {
    void trackReviewEvent({
      eventType: 'public_click',
      platform,
      qrCodeId: businessId,
      userId,
    });
  };

  const openPrivateFeedback = () => {
    navigate(`/feedback/${businessId}`, {
      state: {
        rating: 'neutral',
        businessName,
        userId,
        googleReviewUrl,
        tripAdvisorUrl,
      },
    });
  };

  return (
    <Card className="w-full max-w-md mx-auto p-6 shadow-lg border-0 bg-white">
      <div className="text-center mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-gray-800">
          {t('chooserTitle')}
        </h1>
        <p className="text-gray-600 mt-2">
          {t('chooserSubtitle', { business: businessName })}
        </p>
      </div>

      <div className="space-y-3">
        {availableExternalLinks.map((link) => (
          <Button key={`${link.platform}-${link.url}`} asChild className="h-12 w-full text-base">
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackPublicClick(link.trackedPlatform as ReviewPlatform)}
            >
              <span>
                {link.trackedPlatform === 'google'
                  ? t('publicGoogle')
                  : t('publicTripAdvisor')}
              </span>
              <ExternalLink className="ml-2 h-4 w-4" aria-hidden="true" />
            </a>
          </Button>
        ))}

        <Button
          variant="outline"
          className="h-12 w-full text-base"
          onClick={openPrivateFeedback}
        >
          <MessageSquareText className="mr-2 h-4 w-4" aria-hidden="true" />
          {t('privateFeedback')}
        </Button>
      </div>

      <p className="mt-4 text-center text-xs leading-relaxed text-gray-500">
        {t('choicePrivacy')}
      </p>
    </Card>
  );
};

export default EmojiRating;
