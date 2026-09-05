
import React from 'react';
import { Check, ExternalLink, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { GoogleReview } from '@/hooks/useGoogleReviews';
import ReplySuggestions from '@/components/dashboard/ReplySuggestions';
import { idDaFila } from '@/lib/filaDeRespostas';
import { useOwnerTranslation } from '@/i18n/owner/useOwnerTranslation';

interface ReviewCardProps {
  review: GoogleReview;
  formatDate: (dateString: string) => string;
  /**
   * Falso quando a ligação oficial ao Google manda.
   *
   * Este cartão vem do retrato da Apify, tirado num instante e cego para o que
   * aconteceu depois — inclusive para quem já foi respondido. Com a ligação
   * oficial viva, oferecer resposta a partir daqui convida o dono a responder
   * duas vezes a mesma pessoa.
   */
  podeSugerirResposta?: boolean;
  /**
   * Se esta avaliação já tem resposta publicada no Google.
   *
   * O retrato não sabe: ele foi tirado num instante. Quem sabe é a ligação
   * oficial, e a comparação vive em `useAvaliacoesJaRespondidas`. Marcelo pediu
   * a marca depois de o produto ter parado de OFERECER resposta a quem já fora
   * respondido — evitar o dano não lhe devolvia a informação.
   */
  jaRespondida?: boolean;
  /** Usado para assinar a resposta sugerida. */
  businessName?: string | null;
  /** `profiles.business_country`, para escolher pt-BR vs. pt-PT na sugestão. */
  businessCountry: string | null;
}

const ReviewCard: React.FC<ReviewCardProps> = ({ review, formatDate, businessName, businessCountry, podeSugerirResposta = true, jaRespondida = false }) => {
  const { t } = useOwnerTranslation();
  const renderStars = (rating: number) => {
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={16}
            className={star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}
          />
        ))}
      </div>
    );
  };

  const author = (
    <>
      {review.author_image ? (
        <img
          src={review.author_image}
          alt={review.author_name}
          className="h-8 w-8 rounded-full mr-2"
        />
      ) : (
        <div className="h-8 w-8 rounded-full bg-gray-200 mr-2 flex items-center justify-center">
          {review.author_name.charAt(0).toUpperCase()}
        </div>
      )}
      <div>
        <div className="font-medium">{review.author_name}</div>
        <div className="text-sm text-gray-500">{formatDate(review.time)}</div>
      </div>
    </>
  );

  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-center justify-between">
        {review.author_uri ? (
          <a
            className="flex items-center hover:underline"
            href={review.author_uri}
            target="_blank"
            rel="noopener noreferrer"
          >
            {author}
          </a>
        ) : (
          <div className="flex items-center">{author}</div>
        )}
        <div className="flex items-center gap-2">
          {jaRespondida && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800">
              <Check className="h-3 w-3" aria-hidden="true" />
              {t('reviews.google.jaRespondida')}
            </span>
          )}
          {renderStars(review.rating)}
          <Badge className="ml-2" variant="secondary">{review.rating}/5</Badge>
        </div>
      </div>
      <div className="mt-2 text-gray-700">{review.text}</div>

      {review.google_maps_uri && (
        <a
          href={review.google_maps_uri}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center text-sm text-purple-700 hover:underline"
        >
          <ExternalLink className="h-3.5 w-3.5 mr-1" />
          {t('reviews.google.sourceReview')}
        </a>
      )}

      {/*
        O mesmo espaço de identificadores da fila somada
        (`src/lib/filaDeRespostas.ts`, `google-publico:${review_id}`), e não um
        id cru. A mesma avaliação vista aqui e vista na fila de `/reviews` é a
        mesma avaliação: partilhando a chave, ela é lida uma vez e não duas.
      */}
      {podeSugerirResposta && (
      <ReplySuggestions
        reviewId={idDaFila('google-publico', review.review_id)}
        channel="public"
        rating={review.rating}
        text={review.text}
        customerName={review.author_name}
        businessName={businessName}
        businessCountry={businessCountry}
      />
      )}
    </div>
  );
};

export default ReviewCard;
