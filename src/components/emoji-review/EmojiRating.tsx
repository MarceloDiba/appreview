
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ExternalLink, Frown, Meh, Smile } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

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
  const [selectedRating, setSelectedRating] = useState<EmojiOption | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPlatformChooser, setShowPlatformChooser] = useState(false);

  const availableExternalLinks = externalLinks.filter((link) => Boolean(link?.url));

  const openExternalReview = (url: string) => {
    toast.success('Abrindo plataforma de avaliação...');
    window.open(url, '_blank');
    navigate('/thank-you');
  };
  
  const handleRating = async (rating: EmojiOption) => {
    setSelectedRating(rating);
    setIsSubmitting(true);
    
    try {
      // Fetch the actual user_id from platform_links using the businessId
      const { data: linkData, error: linkError } = await supabase
        .from('qr_codes')
        .select('user_id')
        .eq('id', businessId)
        .single();
        
      if (linkError && linkError.code !== 'PGRST116') {
        console.error('Error fetching business info:', linkError);
        // Fallback to using businessId directly as user_id if not found
      }
      
      const userId = linkData?.user_id || businessId;
      
      // Track the click/scan in database by incrementing the times_scanned counter
      try {
        // First get the current count
        const { data: qrData } = await supabase
          .from('qr_codes')
          .select('times_scanned')
          .eq('id', businessId)
          .single();
          
        const currentCount = qrData?.times_scanned || 0;
        
        // Then update with incremented value
        const { error: updateError } = await supabase
          .from('qr_codes')
          .update({ times_scanned: currentCount + 1 })
          .eq('id', businessId);
          
        if (updateError) {
          console.error('Error updating scan count:', updateError);
        }
      } catch (error) {
        console.error('Error incrementing counter:', error);
      }
        
      // Add a small delay to show the selection effect before navigating
      setTimeout(() => {
        if (rating === 'negative') {
          // If negative, redirect to internal feedback form
          setShowPlatformChooser(false);
          navigate(`/feedback/${businessId}`, { 
            state: { 
              rating,
              businessName,
              userId
            } 
          });
        } else {
          if (availableExternalLinks.length === 1) {
            setShowPlatformChooser(false);
            openExternalReview(availableExternalLinks[0].url);
          } else if (availableExternalLinks.length >= 2) {
            setShowPlatformChooser(true);
          } else {
            setShowPlatformChooser(false);
            navigate(`/feedback/${businessId}`, { 
              state: { 
                rating,
                businessName,
                userId
              } 
            });
          }
        }
        setIsSubmitting(false);
      }, 300);
    } catch (error) {
      console.error('Error handling rating:', error);
      setIsSubmitting(false);
      toast.error('Ocorreu um erro ao processar sua avaliação. Tente novamente.');
    }
  };
  
  if (showPlatformChooser) {
    return (
      <Card className="w-full max-w-md mx-auto p-6 shadow-lg border-0 bg-white">
        <div className="text-center mb-6">
          <h2 className="text-xl md:text-2xl font-bold text-gray-800">
            Onde você prefere avaliar?
          </h2>
          <p className="text-gray-600 mt-2">
            Escolha a plataforma para continuar com sua avaliação de {businessName}.
          </p>
        </div>

        <div className="space-y-3">
          {availableExternalLinks.map((link) => (
            <Button
              key={`${link.platform}-${link.url}`}
              className="w-full justify-between h-12 text-base"
              onClick={() => openExternalReview(link.url)}
            >
              <span>{link.platform}</span>
              <ExternalLink className="h-4 w-4" />
            </Button>
          ))}
        </div>

        <div className="mt-6 text-center">
          <Button
            variant="link"
            className="text-gray-500 text-sm hover:text-primary"
            onClick={() => {
              setShowPlatformChooser(false);
              setSelectedRating(null);
            }}
          >
            Voltar e escolher outra opção
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto p-6 shadow-lg border-0 bg-white">
      <div className="text-center mb-8">
        <h2 className="text-xl md:text-2xl font-bold text-gray-800">
          Como foi sua experiência?
        </h2>
        <p className="text-gray-600 mt-2">
          {businessName}
        </p>
      </div>
      
      <div className="flex justify-between gap-4">
        <div 
          className={`emoji-button bg-review-negative/10 ${selectedRating === 'negative' ? 'ring-2 ring-review-negative animate-scale' : ''} ${isSubmitting ? 'opacity-50 pointer-events-none' : ''}`}
          onClick={() => !isSubmitting && handleRating('negative')}
          aria-label="Avaliação negativa"
        >
          <div className="emoji-icon text-review-negative">
            <Frown className="h-12 w-12 md:h-16 md:w-16" />
          </div>
          <span className="emoji-label">Ruim</span>
        </div>
        
        <div 
          className={`emoji-button bg-review-neutral/10 ${selectedRating === 'neutral' ? 'ring-2 ring-review-neutral animate-scale' : ''} ${isSubmitting ? 'opacity-50 pointer-events-none' : ''}`}
          onClick={() => !isSubmitting && handleRating('neutral')}
          aria-label="Avaliação neutra"
        >
          <div className="emoji-icon text-review-neutral">
            <Meh className="h-12 w-12 md:h-16 md:w-16" />
          </div>
          <span className="emoji-label">Regular</span>
        </div>
        
        <div 
          className={`emoji-button bg-review-positive/10 ${selectedRating === 'positive' ? 'ring-2 ring-review-positive animate-scale' : ''} ${isSubmitting ? 'opacity-50 pointer-events-none' : ''}`}
          onClick={() => !isSubmitting && handleRating('positive')}
          aria-label="Avaliação positiva"
        >
          <div className="emoji-icon text-review-positive">
            <Smile className="h-12 w-12 md:h-16 md:w-16" />
          </div>
          <span className="emoji-label">Bom</span>
        </div>
      </div>
      
      <div className="mt-8 text-center">
        <Button 
          variant="link" 
          className="text-gray-500 text-sm hover:text-primary"
          onClick={() => window.history.back()}
          disabled={isSubmitting}
        >
          Voltar
        </Button>
      </div>
    </Card>
  );
};

export default EmojiRating;
