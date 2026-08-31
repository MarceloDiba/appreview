import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import FilaDeRespostas, { FILA_ANCHOR_ID } from '@/components/dashboard/reviews/FilaDeRespostas';
import { supabase } from '@/integrations/supabase/client';
import { useOwnerTranslation } from '@/i18n/owner/useOwnerTranslation';

/**
 * A página de Avaliações é uma fila só.
 *
 * Aprovado por Marcelo em 30/08/2026, depois do segundo uso real: "um lugar só
 * para responder, com as origens somadas em vez de separadas por aba". As três
 * abas que existiam aqui (comentário privado, fila oficial do Google e leitura
 * pública do Google) viraram `FilaDeRespostas`, ordenada por recência e com a
 * origem escrita em cada item. Ver `docs/contrato-produto-binno.md`, secção
 * "Uma fila só para responder".
 */
const Reviews = () => {
  const { t } = useOwnerTranslation();
  const location = useLocation();
  const [userId, setUserId] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState('');
  const [businessCountry, setBusinessCountry] = useState('');

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUserId(user.id);
      const { data: profile } = await supabase
        .from('profiles')
        .select('business_name, business_country')
        .eq('id', user.id)
        .maybeSingle();
      if (profile?.business_name) setBusinessName(profile.business_name);
      if (profile?.business_country) setBusinessCountry(profile.business_country);
    };

    void fetchUser();
  }, []);

  // Quem chega pelo bloco "Comentários que pedem atenção" da Visão geral traz
  // `#fila-de-respostas` na URL. Sem isto, o toque cai no topo da página e o
  // dono volta a rolar a tela até achar o caso, exatamente o problema que o
  // bloco existe para evitar.
  //
  // As três origens da fila carregam por hooks próprios e chegam em momentos
  // diferentes. Um scroll disparado num único instante acerta ou erra
  // dependendo de qual delas já respondeu, e numa rede de restaurante lenta,
  // no celular, isto é a regra e não a exceção. Em vez de adivinhar o instante
  // certo, observa-se a altura da página: toda vez que algo acima do alvo muda
  // de tamanho, rola-se de novo. Para quando a altura fica quieta por 400ms
  // (conteúdo assentou) ou depois de 8s (limite para não perseguir um
  // carregamento que nunca termina).
  useEffect(() => {
    if (location.hash !== `#${FILA_ANCHOR_ID}`) return;

    const scrollToTarget = () => {
      document.getElementById(FILA_ANCHOR_ID)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    scrollToTarget();

    if (typeof ResizeObserver === 'undefined') return;

    let settleTimer: number | undefined;
    let stopped = false;

    const stop = () => {
      if (stopped) return;
      stopped = true;
      observer.disconnect();
      if (settleTimer) window.clearTimeout(settleTimer);
    };

    const observer = new ResizeObserver(() => {
      if (stopped) return;
      scrollToTarget();
      if (settleTimer) window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(stop, 400);
    });
    observer.observe(document.body);

    const maxTimer = window.setTimeout(stop, 8000);

    return () => {
      stop();
      window.clearTimeout(maxTimer);
    };
  }, [location.hash]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar userRole="business" businessName={businessName || undefined} />

      <main className="flex-1 pt-20 px-4 pb-8">
        <div className="container mx-auto max-w-3xl">
          <header className="mb-8">
            <h1 className="text-3xl font-bold">{t('reviews.title')}</h1>
            <p className="text-gray-600 mt-1">{t('reviews.subtitle')}</p>
          </header>

          {userId ? (
            <FilaDeRespostas
              userId={userId}
              businessName={businessName || null}
              businessCountry={businessCountry || null}
            />
          ) : (
            <div className="py-8 text-center text-gray-500">{t('reviews.loading')}</div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Reviews;
