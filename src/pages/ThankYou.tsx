import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckCircle, ExternalLink } from 'lucide-react';

interface ThankYouState {
  businessName?: string;
  googleReviewUrl?: string;
  tripAdvisorUrl?: string;
}

const ThankYou = () => {
  const location = useLocation();
  const { businessName, googleReviewUrl, tripAdvisorUrl } =
    (location.state as ThankYouState) || {};

  const hasPublicOption = !!googleReviewUrl || !!tripAdvisorUrl;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md mx-auto p-6 shadow-lg border-0">
        <div className="text-center">
          <div className="mx-auto w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="h-6 w-6" />
          </div>

          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Obrigado pelo seu feedback!
          </h1>

          <p className="text-gray-600 mb-6">
            Recebemos o seu relato e ele já está com o responsável
            {businessName ? ` do ${businessName}` : ' do estabelecimento'}.
            Se deixou um contacto, pode esperar retorno em breve.
          </p>
        </div>

        {/*
          The public review option remains available after submitting. Removing it
          here would turn the internal form into a diversion, which is exactly the
          review gating pattern the product must never implement.
        */}
        {hasPublicOption && (
          <div className="border-t border-gray-200 pt-5">
            <p className="text-sm font-medium text-gray-900 text-center">
              Quer deixar também uma avaliação pública?
            </p>
            <div className="mt-3 flex flex-col gap-2">
              {googleReviewUrl && (
                <a
                  href={googleReviewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                  Avaliar no Google
                  <ExternalLink size={14} aria-hidden="true" />
                </a>
              )}
              {tripAdvisorUrl && (
                <a
                  href={tripAdvisorUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                  Avaliar no TripAdvisor
                  <ExternalLink size={14} aria-hidden="true" />
                </a>
              )}
            </div>
          </div>
        )}

        <div className="mt-6 text-center">
          <Button asChild variant="outline">
            <Link to="/">Voltar à página inicial</Link>
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default ThankYou;
