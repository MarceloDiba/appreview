import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ReviewChooser from '@/components/review-funnel/ReviewChooser';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { getQrOpenEventKey, trackReviewEvent } from '@/lib/reviewFunnel';
import { loadPublicQrBusiness } from '@/lib/publicQrBusiness';
import BotaoDeWhatsApp from '@/components/marketing/BotaoDeWhatsApp';
import { getMarketingCopy } from '@/i18n/marketing';
import { detectLocale } from '@/i18n';

type BusinessData = {
  id: string;
  name: string;
  userId: string;
  externalLinks: Array<{
    platform: string;
    url: string;
  }>;
};

import { toPublicReviewUrl } from '@/utils/tripAdvisorUtils';

// A pagina do QR nao tem seletor de idioma: quem a abre e um cliente do
// negocio, no telemovel, e o idioma vem do proprio aparelho. `detectLocale` le
// isso; a pagina de vendas usa o seletor, que aqui nao existe.
const copyDoContacto = getMarketingCopy(detectLocale()).contacto;

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
        const publicBusiness = await loadPublicQrBusiness(businessId);
        if (!publicBusiness) {
          setNotFound(true);
          return;
        }
        const externalLinks = [
          { platform: 'google', url: toPublicReviewUrl(publicBusiness.googleReviewUrl) },
          { platform: 'tripadvisor', url: toPublicReviewUrl(publicBusiness.tripAdvisorUrl) },
        ].filter((link) => Boolean(link.url));

        setBusinessData({
          id: publicBusiness.qrCodeId,
          name: publicBusiness.businessName,
          userId: publicBusiness.userId,
          externalLinks,
        });

        void trackReviewEvent({
          eventKey: getQrOpenEventKey(publicBusiness.qrCodeId),
          eventType: 'qr_open',
          qrCodeId: publicBusiness.qrCodeId,
          userId: publicBusiness.userId,
        });

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
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gray-50 p-4">
      <ReviewChooser
        businessId={businessData.id}
        businessName={businessData.name}
        userId={businessData.userId}
        externalLinks={businessData.externalLinks}
      />
      {/*
        DEPOIS da escolha, e discreto, e as duas coisas sao a mesma decisao.
        Quem abre esta pagina veio avaliar um negocio, e esse clique e o que o
        nosso cliente paga para receber: um botao a competir com ele aqui seria
        o Binno a roubar do proprio cliente. Fica uma linha para quem reparar —
        que e, na pratica, o caminho pelo qual um dono de negocio descobre o
        Binno ao ver o QR de outro.
      */}
      <BotaoDeWhatsApp
        forma="discreto"
        rotulo={`Binno · ${copyDoContacto.rotuloCurto}`}
        mensagem={copyDoContacto.mensagemDoNegocio}
      />
    </div>
  );
};

export default Review;
