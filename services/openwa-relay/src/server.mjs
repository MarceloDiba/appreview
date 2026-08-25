import http from 'node:http';
import { createHmac, timingSafeEqual } from 'node:crypto';

const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'OPENWA_BASE_URL', 'OPENWA_LOCAL_API_KEY', 'OPENWA_SESSION_ID', 'BINNO_WORKER_SECRET', 'OPENWA_WEBHOOK_SECRET'];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) throw new Error(`Missing required variables: ${missing.join(', ')}`);

const config = {
  supabaseUrl: process.env.SUPABASE_URL.replace(/\/$/, ''),
  serviceRole: process.env.SUPABASE_SERVICE_ROLE_KEY,
  openwaUrl: process.env.OPENWA_BASE_URL.replace(/\/$/, ''),
  openwaKey: process.env.OPENWA_LOCAL_API_KEY,
  sessionId: process.env.OPENWA_SESSION_ID,
  workerSecret: process.env.BINNO_WORKER_SECRET,
  webhookSecret: process.env.OPENWA_WEBHOOK_SECRET || '',
  port: Number(process.env.PORT || 8788),
};

const supabase = async (path, init = {}) => {
  const response = await fetch(`${config.supabaseUrl}${path}`, {
    ...init,
    headers: {
      apikey: config.serviceRole,
      Authorization: `Bearer ${config.serviceRole}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  if (!response.ok) throw new Error(`Supabase ${response.status}`);
  return response.status === 204 ? null : response.json().catch(() => null);
};

const updateOutbox = (id, payload) => supabase(`/rest/v1/whatsapp_outbox?id=eq.${encodeURIComponent(id)}`, {
  method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(payload),
});

const addEvent = (outboxId, eventType, providerMessageId, detail) => supabase('/rest/v1/whatsapp_delivery_events', {
  method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ outbox_id: outboxId, provider: 'openwa', event_type: eventType, provider_message_id: providerMessageId || null, detail }),
});

const claim = () => supabase('/rest/v1/rpc/claim_whatsapp_outbox', { method: 'POST', body: JSON.stringify({ batch_size: 10 }) });

const send = async (item) => {
  try {
    const response = await fetch(`${config.openwaUrl}/api/sessions/${encodeURIComponent(config.sessionId)}/messages/send-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': config.openwaKey },
      body: JSON.stringify({ chatId: `${item.recipient_e164.slice(1)}@c.us`, text: item.body, linkPreview: false }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(`OpenWA ${response.status}`);
    const messageId = [payload?.messageId, payload?.id, payload?.message?.id, payload?.data?.id]
      .find((value) => typeof value === 'string') || null;
    await updateOutbox(item.id, { status: 'accepted', provider_message_id: messageId, last_error_code: null });
    await addEvent(item.id, 'accepted', messageId, { source: 'openwa-relay' });
  } catch (error) {
    await updateOutbox(item.id, { status: 'failed', last_error_code: error instanceof Error ? error.message.slice(0, 120) : 'send-failed' });
    await addEvent(item.id, 'failed', null, { source: 'openwa-relay' }).catch(() => {});
  }
};

const materialize = () => fetch(`${config.supabaseUrl}/functions/v1/materialize-whatsapp-notifications`, {
  method: 'POST', headers: { apikey: config.serviceRole, Authorization: `Bearer ${config.serviceRole}`, 'x-binno-worker-secret': config.workerSecret },
}).catch(() => null);

const dispatch = async () => {
  await materialize();
  const items = await claim();
  await Promise.all((items || []).map(send));
};

const runDispatch = () => dispatch().catch((error) => {
  console.error('Binno OpenWA dispatch failed', error instanceof Error ? error.message : error);
});

const statusFromWebhook = (payload, eventHeader) => {
  const state = String(
    payload?.data?.status
    || payload?.status
    || eventHeader
    || payload?.event
    || payload?.type
    || '',
  ).toLowerCase();
  if (state.includes('read')) return 'read';
  if (state.includes('deliver')) return 'delivered';
  if (state.includes('fail')) return 'failed';
  return null;
};

const receiveRawBody = (request) => new Promise((resolve, reject) => {
  const chunks = [];
  let size = 0;
  request.on('data', (chunk) => {
    size += chunk.length;
    if (size > 262144) { request.destroy(); return; }
    chunks.push(chunk);
  });
  request.on('end', () => resolve(Buffer.concat(chunks)));
  request.on('error', reject);
});

const validWebhookSignature = (raw, signature) => {
  if (typeof signature !== 'string' || !config.webhookSecret) return false;
  const expected = `sha256=${createHmac('sha256', config.webhookSecret).update(raw).digest('hex')}`;
  const given = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  return given.length === expectedBuffer.length && timingSafeEqual(given, expectedBuffer);
};

http.createServer(async (request, response) => {
  if (request.method === 'GET' && request.url === '/health') {
    response.writeHead(200, { 'content-type': 'application/json' }); response.end(JSON.stringify({ ok: true })); return;
  }
  if (request.method !== 'POST' || request.url !== '/webhook/openwa') { response.writeHead(404); response.end(); return; }
  try {
    const raw = await receiveRawBody(request);
    const signature = request.headers['x-openwa-signature'];
    if (!validWebhookSignature(raw, signature)) { response.writeHead(401); response.end(); return; }
    const payload = JSON.parse(raw.toString('utf8') || '{}');
    const eventName = request.headers['x-openwa-event'];
    const providerMessageId = [payload?.messageId, payload?.id, payload?.data?.id, payload?.message?.id]
      .find((value) => typeof value === 'string');
    const status = statusFromWebhook(payload, eventName);
    if (typeof providerMessageId === 'string' && status) {
      const rows = await supabase(`/rest/v1/whatsapp_outbox?provider_message_id=eq.${encodeURIComponent(providerMessageId)}&select=id`, { method: 'GET' });
      for (const row of rows || []) {
        await updateOutbox(row.id, { status });
        await addEvent(row.id, status, providerMessageId, { source: 'openwa-webhook' });
      }
    }
    response.writeHead(204); response.end();
  } catch {
    response.writeHead(400); response.end();
  }
}).listen(config.port, '0.0.0.0', () => {
  console.log(`Binno OpenWA relay listening on ${config.port}`);
  runDispatch();
  setInterval(runDispatch, 60_000);
});
