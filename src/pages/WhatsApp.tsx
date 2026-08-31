import { useEffect, useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import { WhatsAppNotificationWorkspace } from '@/components/dashboard/WhatsAppNotificationWorkspace';
import { useLocalWhatsApp } from '@/hooks/useLocalWhatsApp';
import { supabase } from '@/integrations/supabase/client';
import { useOwnerTranslation } from '@/i18n/owner/useOwnerTranslation';

/**
 * O WhatsApp deixa de aparecer em todas as telas e vira destino do menu
 * principal (decisão de Marcelo em 31/08/2026).
 *
 * Isto não reabre o seletor de abas que saiu em 30/08/2026, e a diferença
 * importa: aquilo era um submenu dentro de uma tela, com uma aba que abria
 * vazia; isto é uma entrada do menu principal, ao lado de Painel, Avaliações,
 * QR Codes e Configurações, que abre uma tela cheia.
 *
 * O telefone do onboarding (`profiles.phone`) continua a ser o destinatário
 * inicial, como manda a secção 4 do contrato de produto. A leitura mudou-se
 * para cá com a tela; o painel deixou de a fazer.
 */
const WhatsApp = () => {
  const { t } = useOwnerTranslation();
  const localWhatsApp = useLocalWhatsApp();
  const [businessName, setBusinessName] = useState('');
  const [onboardingPhone, setOnboardingPhone] = useState('');

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !active) return;
      const { data: profile } = await supabase
        .from('profiles')
        .select('business_name, phone')
        .eq('id', user.id)
        .maybeSingle();
      if (!active) return;
      setBusinessName(profile?.business_name || '');
      setOnboardingPhone(profile?.phone || '');
    };
    void load();
    return () => { active = false; };
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-[#f5f7f9]">
      <Navbar userRole="business" businessName={businessName || undefined} />

      <main className="flex-1 px-4 pb-12 pt-20">
        <div className="container mx-auto max-w-3xl">
          <header className="mb-5 py-3">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950">{t('nav.whatsapp')}</h1>
          </header>

          <WhatsAppNotificationWorkspace localWhatsApp={localWhatsApp} onboardingPhone={onboardingPhone} />
        </div>
      </main>
    </div>
  );
};

export default WhatsApp;
