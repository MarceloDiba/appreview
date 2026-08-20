export type LocalWhatsAppSession = {
  id: string;
  name: string;
  status: string;
  engineLoaded: boolean;
  connectedAt?: string | null;
};

export type LocalWhatsAppSendResult = {
  messageId: string | null;
  sentAt: string;
};

type OpenWaMessageResponse = {
  messageId?: string | null;
  timestamp?: number;
};

const gatewayPath = '/api/openwa';
const pilotSessionName = 'binno-piloto';

const isLocalPilotAvailable = () => import.meta.env.DEV;

const messageFromResponse = async (response: Response) => {
  const payload = await response.json().catch(() => null) as { message?: string; error?: string } | null;
  return payload?.message || payload?.error || `OpenWA respondeu com erro ${response.status}.`;
};

const requestGateway = async <T>(path: string, init?: RequestInit): Promise<T> => {
  if (!isLocalPilotAvailable()) {
    throw new Error('O canal temporário só está disponível no ambiente local.');
  }

  const response = await fetch(`${gatewayPath}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    const detail = await messageFromResponse(response);
    if (response.status === 401) throw new Error('OPENWA_API_KEY_REQUIRED');
    throw new Error(detail);
  }

  if (!response.headers.get('content-type')?.includes('application/json')) {
    throw new Error('OPENWA_PROXY_UNAVAILABLE');
  }

  return response.json() as Promise<T>;
};

export const getLocalWhatsAppSession = async (): Promise<LocalWhatsAppSession | null> => {
  const sessions = await requestGateway<LocalWhatsAppSession[]>('/sessions');
  return sessions.find((session) => session.name === pilotSessionName) || null;
};

export const isReadyLocalWhatsAppSession = (session: LocalWhatsAppSession | null) =>
  Boolean(session && session.status === 'ready' && session.engineLoaded);

export const normalizeInternationalPhone = (value: string) => {
  const normalized = value.replace(/[\s().-]/g, '');
  if (!/^\+[1-9]\d{7,14}$/.test(normalized)) {
    throw new Error('Informe o número com código do país, por exemplo +351 911 056 526.');
  }
  return normalized;
};

export const maskInternationalPhone = (value: string) => {
  const normalized = value.replace(/\D/g, '');
  if (normalized.length < 5) return 'número informado';
  return `+${normalized.slice(0, 3)} ••• ••• ${normalized.slice(-3)}`;
};

export const sendLocalWhatsAppText = async ({
  sessionId,
  phone,
  text,
}: {
  sessionId: string;
  phone: string;
  text: string;
}): Promise<LocalWhatsAppSendResult> => {
  const normalizedPhone = normalizeInternationalPhone(phone);
  const payload = await requestGateway<OpenWaMessageResponse>(`/sessions/${sessionId}/messages/send-text`, {
    method: 'POST',
    body: JSON.stringify({
      chatId: `${normalizedPhone.slice(1)}@c.us`,
      text,
      linkPreview: false,
    }),
  });

  return {
    messageId: payload.messageId || null,
    sentAt: payload.timestamp ? new Date(payload.timestamp * 1000).toISOString() : new Date().toISOString(),
  };
};
