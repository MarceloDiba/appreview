import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const json = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json' },
});

const localParts = (date: Date, timeZone: string) => {
  try {
    const values = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(date).reduce<Record<string, string>>((parts, part) => ({ ...parts, [part.type]: part.value }), {});
    return { date: `${values.year}-${values.month}-${values.day}`, time: `${values.hour}:${values.minute}`, weekday: values.weekday?.toLowerCase() };
  } catch {
    return null;
  }
};

const isExpectedDay = (weekday: string | undefined, day: string) =>
  (day === 'monday' && weekday === 'mon') || (day === 'friday' && weekday === 'fri');

const messageFromSummary = (summary: Record<string, unknown>) => {
  const business = summary.business as Record<string, unknown> | undefined;
  const sample = summary.sample as Record<string, unknown> | undefined;
  const advisor = sample?.advisor as Record<string, unknown> | undefined;
  const opportunity = advisor?.opportunity as Record<string, unknown> | undefined;
  const name = typeof business?.name === 'string' ? business.name : 'seu negócio';
  const rating = typeof business?.googleRating === 'number' ? business.googleRating.toFixed(1).replace('.', ',') : null;
  const total = typeof business?.googleReviewCount === 'number' ? business.googleReviewCount : null;
  const lines = ['Binno', `Resumo de reputação de ${name}.`];
  if (rating !== null && total !== null) lines.push(`Nota atual: ${rating} com ${total} avaliações.`);
  if (typeof opportunity?.phrase === 'string' && typeof opportunity?.mentions === 'number') lines.push(`Oportunidade observada: “${opportunity.phrase}” apareceu em ${opportunity.mentions} elogios recentes.`);
  lines.push('Abra o painel para ver a leitura e decidir a próxima ação.');
  return lines.join('\n');
};

serve(async (request) => {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const expected = Deno.env.get('BINNO_WORKER_SECRET');
  if (!expected || request.headers.get('x-binno-worker-secret') !== expected) return json({ error: 'Unauthorized' }, 401);
  const url = Deno.env.get('SUPABASE_URL') || '';
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (!url || !key) return json({ error: 'Server configuration missing' }, 500);
  const admin = createClient(url, key);
  const now = new Date();
  const { data: preferences, error } = await admin.from('whatsapp_notification_preferences')
    .select('user_id, recipient_e164, weekly_day, delivery_time, time_zone')
    .eq('weekly_enabled', true).not('consented_at', 'is', null);
  if (error) return json({ error: 'Could not load notification preferences' }, 500);
  let queued = 0;
  for (const preference of preferences || []) {
    const local = localParts(now, preference.time_zone);
    if (!local || !isExpectedDay(local.weekday, preference.weekly_day) || local.time < String(preference.delivery_time).slice(0, 5)) continue;
    const { data: latest } = await admin.from('experimental_apify_runs')
      .select('result_summary').eq('user_id', preference.user_id).eq('status', 'succeeded')
      .order('completed_at', { ascending: false }).limit(1).maybeSingle();
    const summary = latest?.result_summary;
    if (!summary || typeof summary !== 'object' || Array.isArray(summary)) continue;
    const { error: enqueueError } = await admin.from('whatsapp_outbox').upsert({
      user_id: preference.user_id,
      kind: 'weekly',
      recipient_e164: preference.recipient_e164,
      body: messageFromSummary(summary as Record<string, unknown>),
      idempotency_key: `weekly:${local.date}`,
    }, { onConflict: 'user_id,idempotency_key', ignoreDuplicates: true });
    if (!enqueueError) queued += 1;
  }
  return json({ queued, checkedAt: now.toISOString() });
});
