import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import FeedbackForm from '@/components/forms/FeedbackForm';
import { toast } from 'sonner';
import { loadPublicQrBusiness } from '@/lib/publicQrBusiness';

type Rating = 'negative' | 'neutral' | 'positive';

type FeedbackState = {
  id: string;
  name: string;
  userId: string;
  rating: Rating;
  googleReviewUrl: string;
  tripAdvisorUrl: string;
};

import { toPublicReviewUrl } from '@/utils/tripAdvisorUtils';

const Feedback = () => {
  const { businessId = '' } = useParams<{ businessId: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const [businessData, setBusinessData] = useState<FeedbackState>({
    id: businessId,
    name: location.state?.businessName || 'Carregando...',
    userId: location.state?.userId || '',
    rating: (location.state?.rating as Rating) || 'neutral',
    googleReviewUrl: location.state?.googleReviewUrl || '',
    tripAdvisorUrl: location.state?.tripAdvisorUrl || '',
  });
  const [loading, setLoading] = useState(!location.state);

  useEffect(() => {
    // The rating screen passes the business name along, but not the public
    // review links. Skipping the fetch on name alone left googleReviewUrl and
    // tripAdvisorUrl empty, so the public review option never rendered for a
    // negative rating — review gating by omission. Only skip when the links
    // are already in hand.
    const hasPublicLinks =
      !!location.state?.googleReviewUrl || !!location.state?.tripAdvisorUrl;
    if (location.state?.businessName && location.state?.userId && hasPublicLinks) {
      setLoading(false);
      return;
    }

    const fetchBusinessData = async () => {
      try {
        const publicBusiness = await loadPublicQrBusiness(businessId);
        if (!publicBusiness) {
          toast.error('Desculpe, não encontramos o negócio especificado.');
          navigate('/');
          return;
        }

        setBusinessData({
          id: publicBusiness.qrCodeId,
          name: location.state?.businessName || publicBusiness.businessName,
          userId: publicBusiness.userId,
          // Keep the rating the customer actually gave. Defaulting to 'neutral'
          // here would record a 3 for someone who tapped "Ruim".
          rating: (location.state?.rating as Rating) || 'neutral',
          googleReviewUrl: toPublicReviewUrl(publicBusiness.googleReviewUrl),
          tripAdvisorUrl: toPublicReviewUrl(publicBusiness.tripAdvisorUrl),
        });
      } catch (error) {
        console.error('Error loading business data:', error);
        toast.error('Erro ao carregar dados do estabelecimento.');
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    fetchBusinessData();
  }, [businessId, location.state, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <FeedbackForm
        businessId={businessData.id}
        businessName={businessData.name}
        userId={businessData.userId}
        rating={businessData.rating}
        googleReviewUrl={businessData.googleReviewUrl}
        tripAdvisorUrl={businessData.tripAdvisorUrl}
      />
    </div>
  );
};

export default Feedback;
