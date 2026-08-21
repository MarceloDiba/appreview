import http from 'node:http';

const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'OPENWA_BASE_URL', 'OPENWA_LOCAL_API_KEY', 'OPENWA_SESSION_NAME', 'BINNO_WORKER_SECRET'];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) throw new Error(`Missing required variables: ${missing.join(', ')}`);

const config = {
  supabaseUrl: process.env.SUPABASE_URL.replace(/\/$/, ''),
  serviceRole: process.env.SUPABASE_SERVICE_ROLE_KEY,
  openwaUrl: process.env.OPENWA_BASE_URL.replace(/\/$/, ''),
  openwaKey: process.env.OPENWA_LOCAL_API_KEY,
  session: process.env.OPENWA_SESSION_NAME,
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
    const response = await fetch(`${config.openwaUrl}/sessions/${encodeURIComponent(config.session)}/messages/send-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': config.openwaKey },
      body: JSON.stringify({ chatId: `${item.recipient_e164.slice(1)}@c.us`, text: item.body, linkPreview: false }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(`OpenWA ${response.status}`);
    const messageId = typeof payload?.messageId === 'string' ? payload.messageId : null;
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

const statusFromWebhook = (payload) => {
  const event = String(payload?.event || payload?.type || payload?.status || '').toLowerCase();
  if (event.includes('read')) return 'read';
  if (event.includes('deliver')) return 'delivered';
  if (event.includes('fail')) return 'failed';
  return null;
};

const receiveBody = (request) => new Promise((resolve, reject) => {
  let raw = '';
  request.on('data', (chunk) => { raw += chunk; if (raw.length > 262144) request.destroy(); });
  request.on('end', () => { try { resolve(JSON.parse(raw || '{}')); } catch (error) { reject(error); } });
  request.on('error', reject);
});

http.createServer(async (request, response) => {
  if (request.method === 'GET' && request.url === '/health') {
    response.writeHead(200, { 'content-type': 'application/json' }); response.end(JSON.stringify({ ok: true })); return;
  }
  if (request.method !== 'POST' || !request.url?.startsWith('/webhook/openwa/')) { response.writeHead(404); response.end(); return; }
  const providedSecret = request.url.split('/').at(-1);
  if (!config.webhookSecret || providedSecret !== config.webhookSecret) { response.writeHead(401); response.end(); return; }
  try {
    const payload = await receiveBody(request);
    const providerMessageId = payload?.messageId || payload?.id || payload?.data?.id;
    const status = statusFromWebhook(payload);
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
  void dispatch();
  setInterval(() => void dispatch(), 60_000);
});
