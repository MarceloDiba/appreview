import { supabase } from '@/integrations/supabase/client';
import type { PilotNotificationPreferences } from '@/lib/pilotNotificationPreferences';
import { maskInternationalPhone } from '@/lib/localWhatsApp';

export type WhatsAppDelivery = {
  id: string;
  kind: 'test' | 'alert' | 'weekly' | 'reply-reminder' | 'profile-reminder';
  status: 'queued' | 'sending' | 'accepted' | 'delivered' | 'read' | 'failed' | 'skipped' | 'cancelled';
  /**
   * Para onde a mensagem foi. NULO numa linha de e-mail, que entrega por
   * `recipient_email` e não tem telefone nenhum — desde 02/09/2026. Quem
   * desenhar isto na tela tem de tratar o nulo: `maskInternationalPhone`
   * chamava `.replace` num nulo e rebentava o cartão de histórico do dono na
   * primeira segunda-feira com relatório por e-mail.
   */
  recipient: string | null;
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
  recipient_e164: string | null;
  recipient_email: string | null;
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
  // Uma resposta antiga em cache do navegador pode não trazer a coluna. Cair em
  // `mensagem` repete o padrão do banco, em vez de deixar o `select` da tela
  // sem valor nenhum e vazio — e é o recuo seguro, porque é o canal que
  // funciona sem configuração nenhuma.
  weeklyChannel: value.weekly_channel === 'email' ? 'email' : 'mensagem',
  consented: Boolean(value.consented_at),
} : null;

/**
 * O destino, como o dono o lê.
 *
 * Um telefone sai mascarado, porque a tela não precisa de o mostrar inteiro e
 * ele fica à vista de quem passar ao lado. Um e-mail sai como está: é o
 * endereço da própria conta, ele já o conhece, e mascará-lo esconderia
 * exatamente a informação que ele veio confirmar.
 *
 * Sem destino nenhum devolve a frase neutra em vez de rebentar. Até 02/09/2026
 * esta função não existia e a tela chamava `maskInternationalPhone` direto:
 * na primeira segunda-feira com relatório por e-mail, `recipient_e164` chega
 * nulo, `.replace` de um nulo levanta `TypeError`, e o cartão de histórico
 * derrubava o render do painel inteiro.
 */
export const destinoLegivel = (destino: string | null | undefined): string => {
  const limpo = (destino || '').trim();
  if (!limpo) return 'número informado';
  return limpo.includes('@') ? limpo : maskInternationalPhone(limpo);
};

const toDelivery = (value: WireDelivery): WhatsAppDelivery => ({
  id: value.id,
  kind: value.kind,
  status: value.status,
  // O e-mail entra como destino visível quando não há telefone: o dono precisa
  // de ver PARA ONDE foi, e "número informado" no lugar de um endereço seria a
  // tela a esconder o que sabe.
  recipient: value.recipient_e164 ?? value.recipient_email ?? null,
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
