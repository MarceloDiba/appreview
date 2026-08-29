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
  deliveries: WhatsAppDelivery[];
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
  const data = await invoke<{ preferences?: WirePreferences | null; deliveries?: WireDelivery[] }>({ action: 'get' });
  return { preferences: toPreferences(data.preferences), deliveries: (data.deliveries || []).map(toDelivery) };
};

export const saveWhatsAppDeliveryPreferences = async (preferences: PilotNotificationPreferences) => {
  const data = await invoke<{ preferences: WirePreferences }>({ action: 'save-preferences', ...preferences });
  return toPreferences(data.preferences);
};

export const enqueueWhatsAppTest = async ({ recipient, message }: { recipient: string; message: string }) => {
  const data = await invoke<{ delivery: Pick<WireDelivery, 'id' | 'kind' | 'status' | 'created_at'> }>({ action: 'enqueue-test', recipient, message });
  return data.delivery;
};
