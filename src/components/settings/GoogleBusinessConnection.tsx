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
