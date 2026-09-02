import { supabase } from '@/integrations/supabase/client';
import type { PilotNotificationPreferences } from '@/lib/pilotNotificationPreferences';

export type WhatsAppDelivery = {
  id: string;
  kind: 'test' | 'alert' | 'weekly' | 'reply-reminder' | 'profile-reminder';
  status: 'queued' | 'sending' | 'accepted' | 'delivered' | 'read' | 'failed' | 'skipped' | 'cancelled';
  recipient: string;
  providerMessageId?: string | null;
  errorCode?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type WhatsAppDeliveryState = {
  preferences: PilotNotificationPreferences | null;
  /**
   * O e-mail da conta, para a tela poder DIZER para onde o relatório vai.
   * "Vai por e-mail" sem o endereço obriga o dono a confiar sem conferir.
   */
  accountEmail: string | null;
  deliveries: WhatsAppDelivery[];
  /**
   * O último teste do dono, consultado pelo próprio `kind` no servidor.
   *
   * Não sai de `deliveries`: aquela lista tem dez linhas de qualquer tipo, e
   * dez avisos mais recentes escondiam o teste de um dono com a ligação a
   * funcionar. Ver o comentário da ação `get` em
   * `supabase/functions/whatsapp-notifications/index.ts`.
   */
  lastTest: WhatsAppDelivery | null;
  lastFailure: WhatsAppDelivery | null;
};

type WirePreferences = {
  recipient_e164: string;
  weekly_enabled: boolean;
  replies_enabled: boolean;
  reputation_enabled: boolean;
  profile_enabled: boolean;
  feedback_enabled: boolean;
  weekly_day: 'monday' | 'friday';
  delivery_time: string;
  weekly_channel: 'mensagem' | 'email';
  consented_at: string | null;
};

type WireDelivery = {
  id: string;
  kind: WhatsAppDelivery['kind'];
  status: WhatsAppDelivery['status'];
  recipient_e164: string;
  provider_message_id: string | null;
  last_error_code: string | null;
  created_at: string;
  updated_at: string;
};

const toPreferences = (value: WirePreferences | null | undefined): PilotNotificationPreferences | null => value ? {
  weeklyEnabled: value.weekly_enabled,
  repliesEnabled: value.replies_enabled,
  reputationEnabled: value.reputation_enabled,
  profileEnabled: value.profile_enabled,
  feedbackEnabled: value.feedback_enabled,
  recipient: value.recipient_e164,
  day: value.weekly_day,
  time: value.delivery_time.slice(0, 5),
  // Uma conta gravada antes de 02/09/2026 não tem a coluna preenchida na
  // resposta em cache do navegador. Cair em `email` aqui repete o padrão do
  // banco, em vez de deixar o `select` da tela sem valor nenhum e vazio.
  weeklyChannel: value.weekly_channel === 'mensagem' ? 'mensagem' : 'email',
  consented: Boolean(value.consented_at),
} : null;

const toDelivery = (value: WireDelivery): WhatsAppDelivery => ({
  id: value.id,
  kind: value.kind,
  status: value.status,
  recipient: value.recipient_e164,
  providerMessageId: value.provider_message_id,
  errorCode: value.last_error_code,
  createdAt: value.created_at,
  updatedAt: value.updated_at,
});

const invoke = async <T>(body: Record<string, unknown>) => {
  const { data, error } = await supabase.functions.invoke('whatsapp-notifications', { body });
  if (error) {
    const detail = await error.context?.json().catch(() => null);
    throw new Error(detail?.error || error.message);
  }
  return data as T;
};

export const getWhatsAppDeliveryState = async (): Promise<WhatsAppDeliveryState> => {
  const data = await invoke<{ preferences?: WirePreferences | null; deliveries?: WireDelivery[]; last_test?: WireDelivery | null; last_failure?: WireDelivery | null; account_email?: string | null }>({ action: 'get' });
  return {
    preferences: toPreferences(data.preferences),
    accountEmail: data.account_email || null,
    deliveries: (data.deliveries || []).map(toDelivery),
    lastTest: data.last_test ? toDelivery(data.last_test) : null,
    lastFailure: data.last_failure ? toDelivery(data.last_failure) : null,
  };
};

export const saveWhatsAppDeliveryPreferences = async (preferences: PilotNotificationPreferences) => {
  const data = await invoke<{ preferences: WirePreferences }>({ action: 'save-preferences', ...preferences });
  return toPreferences(data.preferences);
};

export const enqueueWhatsAppTest = async ({ recipient, message }: { recipient: string; message: string }) => {
  const data = await invoke<{ delivery: Pick<WireDelivery, 'id' | 'kind' | 'status' | 'created_at'> }>({ action: 'enqueue-test', recipient, message });
  return data.delivery;
};
