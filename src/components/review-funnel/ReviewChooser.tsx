import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ExternalLink, MessageSquareText } from 'lucide-react';
import { useTranslation } from '@/i18n/useTranslation';
import { trackReviewEvent, type ReviewPlatform } from '@/lib/reviewFunnel';

interface ReviewChooserProps {
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

const ReviewChooser = ({
  businessName,
  businessId,
  userId,
  externalLinks = [],
}: ReviewChooserProps) => {
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
        /**
         * NENHUMA NOTA E ASSUMIDA AQUI.
         *
         * Ate 05/09/2026 esta linha dizia `rating: 'neutral'`, que vale 3, e o
         * formulario abria com tres estrelas acesas sem o cliente ter tocado em
         * nada. Quem escrevia so um elogio ficava gravado com nota 3, e o dono
         * recebia um aviso VERMELHO de reclamacao com o elogio citado por baixo.
         *
         * O modulo `comentarioInterno.ts` ja se recusava a assumir 3 — o
         * comentario dele diz isso com todas as letras. Era este chamador que
         * lhe entregava o 3 pronto, e o guarda media o modulo e nunca esta tela,
         * que e a unica que navega para la.
         *
         * Achado pela sessao de QA em 05/09, medindo o preenchimento das
         * estrelas na tela real do cliente.
         */
        rating: null,
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

export default ReviewChooser;
