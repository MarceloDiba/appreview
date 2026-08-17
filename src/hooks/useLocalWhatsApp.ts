import { useCallback, useEffect, useState } from 'react';
import { getLocalWhatsAppSession, isReadyLocalWhatsAppSession, LocalWhatsAppSession } from '@/lib/localWhatsApp';

export type LocalWhatsAppState = {
  status: 'checking' | 'ready' | 'not-connected' | 'unavailable';
  session: LocalWhatsAppSession | null;
  detail: string | null;
  refresh: () => Promise<void>;
};

export const useLocalWhatsApp = (): LocalWhatsAppState => {
  const [status, setStatus] = useState<LocalWhatsAppState['status']>(import.meta.env.DEV ? 'checking' : 'unavailable');
  const [session, setSession] = useState<LocalWhatsAppSession | null>(null);
  const [detail, setDetail] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!import.meta.env.DEV) {
      setSession(null);
      setStatus('unavailable');
      setDetail(null);
      return;
    }

    setStatus('checking');
    setDetail(null);
    try {
      const nextSession = await getLocalWhatsAppSession();
      setSession(nextSession);
      setStatus(isReadyLocalWhatsAppSession(nextSession) ? 'ready' : 'not-connected');
      if (!nextSession) setDetail('A sessão local binno-piloto ainda não foi iniciada.');
      else if (!isReadyLocalWhatsAppSession(nextSession)) setDetail('A sessão local existe, mas ainda não está vinculada ao WhatsApp.');
    } catch (error) {
      setSession(null);
      setStatus('unavailable');
      setDetail(error instanceof Error ? error.message : 'Não foi possível consultar o canal local.');
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { status, session, detail, refresh };
};
