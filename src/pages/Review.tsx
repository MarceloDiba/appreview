import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import EmojiRating from '@/components/emoji-review/EmojiRating';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

type BusinessData = {
  id: string;
  name: string;
  googleReviewUrl: string;
  tripAdvisorUrl: string;
};

const normalizePlatform = (platform: string) => platform.trim().toLowerCase();
const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const Review = () => {
  const { businessId = '' } = useParams<{ businessId: string }>();
  const [businessData, setBusinessData] = useState<BusinessData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchBusinessData = async () => {
      if (!businessId) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      try {
        const qrQuery = supabase
          .from('qr_codes')
          .select('id, name, user_id, times_scanned, slug')
          .eq(isUuid(businessId) ? 'id' : 'slug', businessId);

        const { data: qrData, error: qrError } = await qrQuery.maybeSingle();

        if (qrError) {
          throw qrError;
        }

        if (!qrData) {
          setNotFound(true);
          return;
        }

        const userId = qrData.user_id;

        const [{ data: profileData, error: profileError }, { data: linksData, error: linksError }] = await Promise.all([
          supabase.from('profiles').select('business_name').eq('id', userId).maybeSingle(),
          supabase.from('platform_links').select('platform, url').eq('user_id', userId),
        ]);

        if (profileError) {
          throw profileError;
        }

        if (linksError) {
          throw linksError;
        }

        const normalizedLinks = (linksData || []).map((link) => ({
          platform: normalizePlatform(link.platform),
          url: link.url,
        }));

        const googleLink = normalizedLinks.find((link) => link.platform.includes('google'));
        const tripAdvisorLink = normalizedLinks.find((link) => link.platform.includes('tripadvisor'));

        setBusinessData({
          id: qrData.id,
          name: profileData?.business_name || qrData.name || 'Estabelecimento',
          googleReviewUrl: googleLink?.url || '',
          tripAdvisorUrl: tripAdvisorLink?.url || '',
        });

        const currentCount = qrData.times_scanned || 0;
        const { error: updateError } = await supabase
          .from('qr_codes')
          .update({ times_scanned: currentCount + 1 })
          .eq('id', qrData.id);

        if (updateError) {
          console.error('Error updating scan count:', updateError);
        }
      } catch (error) {
        console.error('Error loading business data:', error);
        toast.error('Erro ao carregar os dados do estabelecimento.');
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    fetchBusinessData();
  }, [businessId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (notFound || !businessData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md p-6 text-center space-y-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Link de avaliação indisponível</h1>
            <p className="text-sm text-gray-600 mt-2">
              Não encontramos um QR Code ativo para este link.
            </p>
          </div>
          <Button asChild>
            <Link to="/">Voltar para o início</Link>
          </Button>
        </Card>
      </div>
    );
  }

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
