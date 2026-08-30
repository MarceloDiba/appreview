import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import GoogleReviews from '@/components/dashboard/GoogleReviews';
import GoogleBusinessReviewQueue from '@/components/dashboard/GoogleBusinessReviewQueue';
import CasesList from '@/components/dashboard/cases/CasesList';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useOwnerTranslation } from '@/i18n/owner/useOwnerTranslation';

const casesAnchorId = 'casos-internos';

const Reviews = () => {
  const { t } = useOwnerTranslation();
  const location = useLocation();
  const [userId, setUserId] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState('');

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUserId(user.id);
      const { data: profile } = await supabase
        .from('profiles')
        .select('business_name')
        .eq('id', user.id)
        .maybeSingle();
      if (profile?.business_name) setBusinessName(profile.business_name);
    };

    void fetchUser();
  }, []);

  // Quem chega pelo bloco "Comentários que pedem atenção" da Visão geral traz
  // `#casos-internos` na URL. Sem isto, o toque cai no topo da página, acima
  // da fila do Google e das avaliações públicas, e o dono volta a rolar a
  // tela até achar o caso, exatamente o problema que o bloco existe para
  // evitar. Roda de novo quando `userId` chega porque é o que muda a altura
  // do bloco do Google acima e pode deslocar o alvo do scroll.
  useEffect(() => {
    if (location.hash !== `#${casesAnchorId}`) return;
    const target = document.getElementById(casesAnchorId);
    if (!target) return;
    const raf = requestAnimationFrame(() => {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    return () => cancelAnimationFrame(raf);
  }, [location.hash, userId]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar userRole="business" businessName={businessName || undefined} />

      <main className="flex-1 pt-20 px-4 pb-8">
        <div className="container mx-auto max-w-6xl">
          <header className="mb-8">
            <h1 className="text-3xl font-bold">{t('reviews.title')}</h1>
            <p className="text-gray-600 mt-1">{t('reviews.subtitle')}</p>
          </header>

          <div className="mb-8">
            {userId ? (
              <GoogleBusinessReviewQueue userId={userId} businessName={businessName || undefined} />
            ) : (
              <div className="py-8 text-center text-gray-500">{t('reviews.loading')}</div>
            )}
          </div>

          {userId && <div className="mb-8"><GoogleReviews userId={userId} /></div>}

          <Tabs defaultValue="internal" id={casesAnchorId} className="scroll-mt-24">
            <TabsList className="mb-4">
              <TabsTrigger value="internal">{t('reviews.casesTab')}</TabsTrigger>
            </TabsList>
            <TabsContent value="internal">
              {userId ? (
                <CasesList userId={userId} businessName={businessName || undefined} />
              ) : (
                <div className="py-8 text-center text-gray-500">{t('reviews.loading')}</div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default Reviews;
