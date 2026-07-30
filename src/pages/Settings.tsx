import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import BusinessInfoSettings, { type BusinessInfo } from '@/components/settings/BusinessInfoSettings';
import ExternalLinksSettings from '@/components/settings/ExternalLinksSettings';
import NotificationSettings from '@/components/settings/NotificationSettings';
import { useExternalLinks } from '@/hooks/useExternalLinks';
import GoogleReviews from '@/components/dashboard/GoogleReviews';
import { supabase } from '@/integrations/supabase/client';

const EMPTY: BusinessInfo = { name: '', ownerName: '', phone: '' };

/**
 * As definições passaram a ler e a gravar o que existe na base de dados.
 *
 * Antes o estado inicial era um "Restaurante Exemplo" inventado com morada em
 * São Paulo, e o botão de guardar só mostrava um aviso de sucesso. O dono
 * apagava campo a campo aquilo que nunca foi dele, e o que escrevia
 * desaparecia ao recarregar a página.
 *
 * Saiu também o separador "Avaliações": eram cinco interruptores que não
 * faziam nada, e o primeiro — "Permitir Avaliações Negativas: se desativado,
 * avaliações negativas serão enviadas apenas para formulário interno" —
 * anunciava exactamente o modelo que é proibido. Ver
 * `src/components/forms/FeedbackForm.tsx`.
 */
const Settings = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;

  const [businessInfo, setBusinessInfo] = useState<BusinessInfo>(EMPTY);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);

  const {
    externalLinks,
    isLoading,
    isValidating,
    handleExternalLinkChange,
    handleExternalLinkCommit,
    handleAddExternalLink,
    handleDeleteExternalLink,
    refreshGooglePlaceData,
    saveExternalLinks,
    refreshLinks,
    error,
  } = useExternalLinks(userId);

  useEffect(() => {
    if (!userId) return;
    let active = true;

    const load = async () => {
      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('business_name, first_name, last_name, phone')
        .eq('id', userId)
        .maybeSingle();

      if (!active) return;

      if (profileError) {
        console.error('Erro ao carregar o perfil:', profileError.message);
      } else if (data) {
        setBusinessInfo({
          name: data.business_name || '',
          ownerName: [data.first_name, data.last_name].filter(Boolean).join(' ').trim(),
          phone: data.phone || '',
        });
      }

    };

    // Falhar a leitura não pode deixar o ecrã preso a carregar.
    load()
      .catch((loadError) => console.error('Erro ao carregar o perfil:', loadError))
      .finally(() => {
        if (active) setLoadingProfile(false);
      });
    return () => {
      active = false;
    };
  }, [userId]);

  const handleBusinessInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setBusinessInfo((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveBusinessInfo = async () => {
    if (!userId) return;
    setSavingProfile(true);

    try {
      const [firstName, ...rest] = businessInfo.ownerName.trim().split(/\s+/);
      const { error: saveError } = await supabase.from('profiles').upsert({
        id: userId,
        business_name: businessInfo.name.trim(),
        first_name: firstName || null,
        last_name: rest.length ? rest.join(' ') : null,
        phone: businessInfo.phone.trim() || null,
        updated_at: new Date().toISOString(),
      });

      if (saveError) throw saveError;
      toast.success('Informações guardadas.');
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Erro ao guardar';
      console.error('Erro ao guardar o perfil:', message);
      toast.error('Não foi possível guardar. Tente novamente.');
    } finally {
      setSavingProfile(false);
    }
  };

  if (authLoading || !userId || loadingProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-t-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar userRole="business" businessName={businessInfo.name || undefined} />

      <main className="flex-1 pt-20 px-4 pb-8">
        <div className="container mx-auto max-w-6xl">
          <header className="mb-8">
            <h1 className="text-3xl font-bold">Configurações</h1>
            <p className="text-gray-600 mt-1">
              Se preferir fazer isto passo a passo,{' '}
              <Link to="/configuracao" className="text-primary underline">
                use a configuração guiada
              </Link>
              .
            </p>
          </header>

          <Tabs defaultValue="business">
            <TabsList className="mb-6">
              <TabsTrigger value="business">O meu negócio</TabsTrigger>
              <TabsTrigger value="external-links">Links Externos</TabsTrigger>
              <TabsTrigger value="notifications">Notificações</TabsTrigger>
              <TabsTrigger value="google-reviews">Google Reviews</TabsTrigger>
            </TabsList>

            <TabsContent value="business">
              <BusinessInfoSettings
                businessInfo={businessInfo}
                onBusinessInfoChange={handleBusinessInfoChange}
                onSaveBusinessInfo={handleSaveBusinessInfo}
                onCancel={() => navigate(-1)}
                saving={savingProfile}
              />
            </TabsContent>

            <TabsContent value="external-links">
              <ExternalLinksSettings
                externalLinks={externalLinks}
                onExternalLinkChange={handleExternalLinkChange}
                onExternalLinkCommit={handleExternalLinkCommit}
                onDeleteExternalLink={handleDeleteExternalLink}
                onAddExternalLink={handleAddExternalLink}
                onSaveExternalLinks={saveExternalLinks}
                onRefreshPlaceData={refreshGooglePlaceData}
                isLoading={isLoading}
                isValidating={isValidating}
                error={error}
                refreshLinks={refreshLinks}
              />
            </TabsContent>

            <TabsContent value="notifications">
              <NotificationSettings />
            </TabsContent>

            <TabsContent value="google-reviews">
              <GoogleReviews userId={userId} />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default Settings;
