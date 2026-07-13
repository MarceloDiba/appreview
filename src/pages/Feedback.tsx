import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import FeedbackForm from '@/components/forms/FeedbackForm';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type Rating = 'negative' | 'neutral' | 'positive';

type FeedbackState = {
  id: string;
  name: string;
  userId: string;
  rating: Rating;
  googleReviewUrl: string;
  tripAdvisorUrl: string;
};

const normalizePlatform = (platform: string) => platform.trim().toLowerCase();
const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

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
    if (location.state?.businessName) {
      setLoading(false);
      return;
    }

    const fetchBusinessData = async () => {
      try {
        const qrQuery = supabase
          .from('qr_codes')
          .select('id, name, user_id, slug')
          .eq(isUuid(businessId) ? 'id' : 'slug', businessId);

        const { data: qrData, error: qrError } = await qrQuery.maybeSingle();

        if (qrError) {
          throw qrError;
        }

        if (!qrData) {
          toast.error('Desculpe, não encontramos o negócio especificado.');
          navigate('/');
          return;
        }

        const [{ data: profileData, error: profileError }, { data: linksData, error: linksError }] = await Promise.all([
          supabase.from('profiles').select('business_name').eq('id', qrData.user_id).maybeSingle(),
          supabase.from('platform_links').select('platform, url').eq('user_id', qrData.user_id),
        ]);

        if (profileError) throw profileError;
        if (linksError) throw linksError;

        const normalizedLinks = (linksData || []).map((link) => ({
          platform: normalizePlatform(link.platform),
          url: link.url,
        }));

        const googleLink = normalizedLinks.find((link) => link.platform.includes('google'));
        const tripAdvisorLink = normalizedLinks.find((link) => link.platform.includes('tripadvisor'));

        setBusinessData({
          id: qrData.id,
          name: profileData?.business_name || qrData.name || 'Estabelecimento',
          userId: qrData.user_id,
          rating: 'neutral',
          googleReviewUrl: googleLink?.url || '',
          tripAdvisorUrl: tripAdvisorLink?.url || '',
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
