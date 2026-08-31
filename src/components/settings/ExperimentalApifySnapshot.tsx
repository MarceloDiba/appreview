import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FlaskConical, LoaderCircle, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { isExperimentalApifySnapshot, saveExperimentalApifySnapshot } from '@/lib/experimentalApifySnapshot';
import type { ExperimentalApifySnapshot as ExperimentalApifySnapshotData } from '@/lib/experimentalApifySnapshot';
import { useOwnerTranslation } from '@/i18n/owner/useOwnerTranslation';

/**
 * Quem decide se a coleta está ativada é o servidor, e só ele.
 *
 * Havia aqui um segundo interruptor, de tempo de compilação, que escondia o
 * cartão inteiro quando desligado. Dois interruptores para a mesma coisa podem
 * discordar em silêncio, e discordaram: em 30/08/2026 o servidor estava ligado
 * e o site publicado não trazia o botão, enquanto o resto do painel mandava o
 * dono vir aqui fazer a coleta. Ele procurou e não achou, porque o botão tinha
 * sido removido do pacote na compilação.
 *
 * Agora o cartão aparece sempre no painel autenticado e a resposta vem de quem
 * sabe: a função devolve `APIFY_EXPERIMENTAL_DISABLED` com uma frase legível
 * quando a coleta não está ativada, e essa frase é mostrada ao dono.
 *
 * A separação em relação à conexão oficial do Google continua valendo: são
 * caminhos diferentes, com segredos diferentes, e um nunca liga o outro.
 */

type ExperimentalApifySnapshotProps = {
  googleReviewUrl?: string;
};

const ExperimentalApifySnapshot = ({ googleReviewUrl }: ExperimentalApifySnapshotProps) => {
  const { t } = useOwnerTranslation();
  const navigate = useNavigate();
  const [collecting, setCollecting] = useState(false);
  // Só em desenvolvimento, e só quando a coleta não está configurada na
  // máquina de quem programa, o cartão oferece a amostra ilustrativa em vez de
  // gastar. Em produção o botão é sempre o de coletar.
  const isLocalPreview = import.meta.env.DEV && import.meta.env.VITE_APIFY_EXPERIMENTAL_ENABLED !== 'true';

  const openLocalSample = () => navigate('/demo?view=snapshot');

  const collectSnapshot = async () => {
    if (!googleReviewUrl) return;
    setCollecting(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-experimental-apify', {
        body: { google_review_url: googleReviewUrl },
      });
      if (error) {
        const detail = await error.context?.json().catch(() => null);
        throw new Error(detail?.error || error.message);
      }

      const snapshot: unknown = data?.snapshot;
      if (!isExperimentalApifySnapshot(snapshot)) {
        throw new Error('Resposta experimental inválida');
      }

      saveExperimentalApifySnapshot(snapshot as ExperimentalApifySnapshotData);
      toast.success(t('settings.apify.snapshotReady'));
      // A real collection belongs in the authenticated product, not in the illustrative demo.
      navigate('/dashboard');
    } catch (collectionError) {
      console.error('Could not collect experimental Apify snapshot:', collectionError);
      toast.error(collectionError instanceof Error ? collectionError.message : t('settings.apify.collectionError'));
    } finally {
      setCollecting(false);
    }
  };

  return (
    <Card className="mb-6 border-violet-200 bg-violet-50/30 shadow-none">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-violet-100 p-2 text-violet-800">
            <FlaskConical className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <CardTitle className="text-lg">{t('settings.apify.title')}</CardTitle>
            <CardDescription className="mt-1 max-w-2xl">{t('settings.apify.description')}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <p className="flex max-w-2xl items-start gap-2 text-xs leading-5 text-slate-600">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-violet-700" aria-hidden="true" />
          {t('settings.apify.safeguard')}
        </p>
        {isLocalPreview ? (
          <Button variant="outline" className="shrink-0 border-violet-300 bg-white" onClick={openLocalSample}>
            {t('settings.apify.openSample')}
          </Button>
        ) : (
          <Button
            className="shrink-0 bg-[#6D43C0] hover:bg-[#5935a3]"
            onClick={collectSnapshot}
            disabled={collecting || !googleReviewUrl}
          >
            {collecting && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
            {collecting ? t('settings.apify.collecting') : t('settings.apify.collect')}
          </Button>
        )}
      </CardContent>
      {!isLocalPreview && !googleReviewUrl && (
        <CardContent className="pt-0 text-xs text-amber-800">{t('settings.apify.linkRequired')}</CardContent>
      )}
    </Card>
  );
};

export default ExperimentalApifySnapshot;
