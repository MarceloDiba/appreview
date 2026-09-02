import type { ExperimentalApifySnapshot } from '@/lib/experimentalApifySnapshot';
import { getLocalWhatsAppSession, isReadyLocalWhatsAppSession, maskInternationalPhone, sendLocalWhatsAppText } from '@/lib/localWhatsApp';

export type PilotNotificationPreferences = {
  weeklyEnabled: boolean;
  repliesEnabled: boolean;
  reputationEnabled: boolean;
  profileEnabled: boolean;
  feedbackEnabled: boolean;
  recipient: string;
  day: 'monday' | 'friday';
  time: string;
  /**
   * Por onde sai o RESUMO semanal, e só ele. Os avisos urgentes seguem o canal
   * do dono (`canal_do_aviso`), porque um comentário de uma estrela tem de
   * chegar em minutos ao aparelho que ele abre, e não a uma caixa de entrada.
   */
  weeklyChannel: 'mensagem' | 'email';
  consented: boolean;
};

export type PilotNotificationDelivery = {
  status: 'sent' | 'skipped' | 'failed';
  kind: 'alert' | 'weekly';
  detail: string;
  sentAt?: string;
  recipient?: string;
};

const preferenceStorageKey = 'binno.local-whatsapp-preferences';
const deliveryStorageKey = 'binno.local-whatsapp-advisor-deliveries';

export const defaultPilotNotificationPreferences: PilotNotificationPreferences = {
  weeklyEnabled: true,
  repliesEnabled: true,
  reputationEnabled: true,
  profileEnabled: true,
  feedbackEnabled: true,
  recipient: '',
  day: 'monday',
  time: '09:00',
  // O padrão é o e-mail pela mesma razão escrita na migração
  // `20260902230000_email_como_canal.sql`: o resumo por mensagem cai hoje no
  // `openwa`, e o número do piloto está bloqueado desde 31/08. Manter
  // `mensagem` seria manter toda a gente num canal morto.
  weeklyChannel: 'email',
  consented: false,
};

export const readPilotNotificationPreferences = (): PilotNotificationPreferences => {
  try {
    return { ...defaultPilotNotificationPreferences, ...JSON.parse(window.localStorage.getItem(preferenceStorageKey) || '{}') };
  } catch {
    return defaultPilotNotificationPreferences;
  }
};

export const savePilotNotificationPreferences = (preferences: PilotNotificationPreferences) => {
  window.localStorage.setItem(preferenceStorageKey, JSON.stringify(preferences));
};

type DeliveryLog = Record<string, PilotNotificationDelivery>;

const readDeliveryLog = (): DeliveryLog => {
  try {
    return JSON.parse(window.localStorage.getItem(deliveryStorageKey) || '{}') as DeliveryLog;
  } catch {
    return {};
  }
};

export const readLatestPilotNotificationDelivery = (): PilotNotificationDelivery | null => {
  const deliveries = Object.values(readDeliveryLog()).filter((delivery) => delivery.status === 'sent' || delivery.status === 'failed');
  return deliveries.sort((left, right) => (left.sentAt || '').localeCompare(right.sentAt || '')).at(-1) || null;
};

const writeDelivery = (key: string, delivery: PilotNotificationDelivery) => {
  window.localStorage.setItem(deliveryStorageKey, JSON.stringify({ ...readDeliveryLog(), [key]: delivery }));
};

const dateKey = (date: Date) => date.toISOString().slice(0, 10);
const weekKey = (date: Date) => {
  const day = (date.getUTCDay() + 6) % 7;
  const monday = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - day));
  return monday.toISOString().slice(0, 10);
};

const canSend = (preferences: PilotNotificationPreferences) =>
  preferences.consented && Boolean(preferences.recipient.trim());

const send = async (key: string, kind: PilotNotificationDelivery['kind'], message: string, preferences: PilotNotificationPreferences): Promise<PilotNotificationDelivery> => {
  const existing = readDeliveryLog()[key];
  if (existing?.status === 'sent') return existing;
  if (!canSend(preferences)) return { status: 'skipped', kind, detail: 'consent-or-recipient-missing' };

  try {
    const session = await getLocalWhatsAppSession();
    if (!isReadyLocalWhatsAppSession(session)) return { status: 'skipped', kind, detail: 'local-channel-unavailable' };
    const result = await sendLocalWhatsAppText({ sessionId: session.id, phone: preferences.recipient, text: message });
    const delivery: PilotNotificationDelivery = { status: 'sent', kind, detail: 'sent', sentAt: result.sentAt, recipient: maskInternationalPhone(preferences.recipient) };
    writeDelivery(key, delivery);
    return delivery;
  } catch (error) {
    const delivery: PilotNotificationDelivery = { status: 'failed', kind, detail: error instanceof Error ? error.message : 'send-failed' };
    writeDelivery(key, delivery);
    return delivery;
  }
};

/**
 * Runs only after an owner explicitly starts a manual Apify collection in the
 * local pilot. It creates no background schedule and stores no reviewer data.
 */
export const deliverAdvisorPilotAfterCollection = async (
  snapshot: ExperimentalApifySnapshot,
  buildMessage: (kind: PilotNotificationDelivery['kind'], snapshot: ExperimentalApifySnapshot) => string | null,
) => {
  const preferences = readPilotNotificationPreferences();
  const now = new Date();
  const alert = snapshot.sample.advisor?.alert;
  if (alert && preferences.reputationEnabled) {
    const message = buildMessage('alert', snapshot);
    if (message) return send(`alert:${snapshot.business.placeId}:${alert.fingerprint}:${dateKey(now)}`, 'alert', message, preferences);
  }

  const expectedDay = preferences.day === 'monday' ? 1 : 5;
  const reachedConfiguredTime = now.getHours() * 60 + now.getMinutes() >= Number(preferences.time.slice(0, 2)) * 60 + Number(preferences.time.slice(3));
  if (preferences.weeklyEnabled && now.getDay() >= expectedDay && reachedConfiguredTime) {
    const message = buildMessage('weekly', snapshot);
    if (message) return send(`weekly:${snapshot.business.placeId}:${weekKey(now)}`, 'weekly', message, preferences);
  }

  return { status: 'skipped', kind: 'alert' as const, detail: 'no-eligible-advisor-message' };
};
