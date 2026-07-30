import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SetupState {
  businessName: string | null;
  hasGoogleLink: boolean;
  qrCount: number;
  /** As três coisas sem as quais o produto não funciona no mundo real. */
  isComplete: boolean;
}

const EMPTY: SetupState = {
  businessName: null,
  hasGoogleLink: false,
  qrCount: 0,
  isComplete: false,
};

/**
 * O que falta para este negócio estar realmente a funcionar.
 *
 * São três coisas, e nenhuma é opcional: ter nome (aparece ao cliente e assina
 * as respostas), ter o endereço público do Google (é para onde mandamos quem
 * quer avaliar publicamente) e ter pelo menos um QR code (sem ele ninguém
 * avalia nada e o painel fica vazio para sempre).
 *
 * Serve para levar o dono ao passo a passo em vez de o largar num painel vazio.
 */
export const getSetupState = async (userId: string): Promise<SetupState> => {
  try {
    const [profile, links, qrs] = await Promise.all([
      supabase.from('profiles').select('business_name').eq('id', userId).maybeSingle(),
      supabase.from('platform_links').select('platform, url').eq('user_id', userId),
      supabase.from('qr_codes').select('id').eq('user_id', userId),
    ]);

    const businessName = profile.data?.business_name?.trim() || null;
    const hasGoogleLink = (links.data || []).some(
      (l) => l.platform?.toLowerCase().includes('google') && !!l.url?.trim()
    );
    const qrCount = (qrs.data || []).length;

    return {
      businessName,
      hasGoogleLink,
      qrCount,
      isComplete: !!businessName && hasGoogleLink && qrCount > 0,
    };
  } catch (error) {
    // Falhar aqui não pode bloquear ninguém: no pior caso não mostramos o
    // aviso de configuração e o dono segue para o painel.
    console.error('Erro ao verificar o estado da configuração:', error);
    return EMPTY;
  }
};

export const useSetupStatus = (userId: string | undefined) => {
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<SetupState>(EMPTY);

  const load = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setState(await getSetupState(userId));
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  return { loading, ...state, refresh: load };
};
