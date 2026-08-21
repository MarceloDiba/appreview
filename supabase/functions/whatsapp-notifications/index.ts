import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

const phone = (value: unknown) => typeof value === 'string' && /^\+[1-9]\d{7,14}$/.test(value.replace(/[\s().-]/g, ''))
  ? value.replace(/[\s().-]/g, '')
  : null;

const time = (value: unknown) => typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? value : null;

const preferenceInput = (body: Record<string, unknown>) => {
  const recipient = phone(body.recipient);
  const deliveryTime = time(body.time);
  const day = body.day === 'monday' || body.day === 'friday' ? body.day : null;
  if (!recipient || !deliveryTime || !day) return null;
  return {
    recipient_e164: recipient,
    weekly_enabled: body.weeklyEnabled === true,
    replies_enabled: body.repliesEnabled === true,
    reputation_enabled: body.reputationEnabled === true,
    profile_enabled: body.profileEnabled === true,
    weekly_day: day,
    delivery_time: deliveryTime,
    consented_at: body.consented === true ? new Date().toISOString() : null,
  };
};

serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const authorization = request.headers.get('Authorization');
  if (!authorization || !serviceRoleKey) return json({ error: 'Authentication required' }, 401);

  const caller = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } });
  const { data: { user }, error: userError } = await caller.auth.getUser();
  if (userError || !user) return json({ error: 'Invalid session' }, 401);
  const admin = createClient(supabaseUrl, serviceRoleKey);
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;

  if (body.action === 'get') {
    const [{ data: preferences }, { data: deliveries }] = await Promise.all([
      admin.from('whatsapp_notification_preferences').select('*').eq('user_id', user.id).maybeSingle(),
      admin.from('whatsapp_outbox').select('id, kind, status, recipient_e164, provider_message_id, last_error_code, created_at, updated_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
    ]);
    return json({ preferences, deliveries: deliveries || [] });
  }

  if (body.action === 'save-preferences') {
    const input = preferenceInput(body);
    if (!input) return json({ error: 'Preferências inválidas.' }, 422);
    const { data, error } = await admin.from('whatsapp_notification_preferences')
      .upsert({ user_id: user.id, ...input }, { onConflict: 'user_id' })
      .select('*').single();
    if (error) return json({ error: 'Não foi possível salvar as preferências.' }, 500);
    return json({ preferences: data });
  }

  if (body.action === 'enqueue-test') {
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    if (!message || message.length > 4096) return json({ error: 'Mensagem de teste inválida.' }, 422);
    const recipient = phone(body.recipient);
    if (!recipient) return json({ error: 'Número de WhatsApp inválido.' }, 422);
    const { data: preferences } = await admin.from('whatsapp_notification_preferences')
      .select('consented_at').eq('user_id', user.id).maybeSingle();
    if (!preferences?.consented_at) return json({ error: 'Confirme o recebimento de notificações antes de enviar.' }, 422);
    const key = `test:${crypto.randomUUID()}`;
    const { data, error } = await admin.from('whatsapp_outbox').insert({
      user_id: user.id,
      kind: 'test',
      recipient_e164: recipient,
      body: message,
      idempotency_key: key,
    }).select('id, kind, status, created_at').single();
    if (error) return json({ error: 'Não foi possível colocar a mensagem na fila.' }, 500);
    return json({ delivery: data }, 202);
  }

  return json({ error: 'Ação inválida.' }, 422);
});
