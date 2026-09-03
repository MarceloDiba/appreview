import { useState } from 'react';
import { Building2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useOwnerTranslation } from '@/i18n/owner/useOwnerTranslation';

/**
 * This starts Google OAuth only. Binno never asks for a Google password,
 * and it does not publish a reply as a side effect of this connection.
 *
 * O INTERRUPTOR SAIU EM 03/09/2026.
 *
 * Até essa data este cartão só aparecia atrás de
 * `VITE_GOOGLE_BUSINESS_OAUTH_ENABLED`, uma variável de build do Vite — e era
 * o botão em si que ficava por trás dela, não só um aviso: sem ela, o dono via
 * um cartão a dizer "quando chegar" para sempre, mesmo com o backend já
 * configurado. O Google aprovou o projeto `288079352399` para a Business
 * Profile API nesse dia, e a variável nunca chegou a ser definida no
 * ambiente de build de produção — não há como este código verificar isso, e
 * foi assim que o cartão continuou preso ao "quando chegar" depois de já ter
 * chegado.
 *
 * A protecção certa já existia do lado errado: `startConnection`, abaixo, já
 * trata `GOOGLE_OAUTH_NOT_CONFIGURED` com um aviso claro, porque é o SERVIDOR
 * quem sabe se as três chaves (client id, client secret, redirect uri) estão
 * configuradas — não uma variável de build que pode nunca chegar ao pacote
 * final. O cartão agora confia nessa resposta em vez de tentar adivinhar.
 */
const GoogleBusinessConnection = () => {
  const { t } = useOwnerTranslation();
  const [connecting, setConnecting] = useState(false);

  const startConnection = async () => {
    setConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke('start-google-business-oauth');
      if (error) {
        const response = await error.context?.json().catch(() => null);
        if (response?.code === 'GOOGLE_OAUTH_NOT_CONFIGURED') {
          toast.error(t('settings.googleConnection.unavailable'));
          return;
        }
        throw error;
      }

      if (!data?.authorization_url || typeof data.authorization_url !== 'string') {
        throw new Error('Authorization URL is missing');
      }

      window.location.assign(data.authorization_url);
    } catch (connectionError) {
      console.error('Could not start Google Business Profile connection:', connectionError);
      toast.error(t('settings.googleConnection.startError'));
    } finally {
      setConnecting(false);
    }
  };

  return (
    <Card className="mb-6 border-blue-100 shadow-none">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-blue-50 p-2 text-blue-700">
            <Building2 className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <CardTitle className="text-lg">{t('settings.googleConnection.title')}</CardTitle>
            <CardDescription className="mt-1 max-w-2xl">
              {t('settings.googleConnection.description')}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex max-w-xl items-start gap-2 text-xs leading-5 text-slate-600">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
          {t('settings.googleConnection.consent')}
        </p>
        <Button className="shrink-0 bg-[#2457D6] hover:bg-[#1d47b0]" onClick={startConnection} disabled={connecting}>
          {connecting ? t('settings.googleConnection.connecting') : t('settings.googleConnection.connect')}
        </Button>
      </CardContent>
    </Card>
  );
};

export default GoogleBusinessConnection;
