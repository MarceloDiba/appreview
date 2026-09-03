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
  dispatchIntervalMs: Number(process.env.BINNO_DISPATCH_INTERVAL_MS || 10_000),
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

/**
 * Sem limite de tempo, uma chamada que o OpenWA aceita mas nunca responde
 * prende a mensagem por cinco minutos — o padrao do Node — e so entao vira
 * 'fetch failed', um erro que nao diz nada sobre a causa. Como o lote e
 * enviado em paralelo, uma chamada pendurada atrasa o lote inteiro. Vinte
 * segundos e folgado para um envio de texto e transforma o sintoma em algo
 * legivel: 'TimeoutError' em vez de 'fetch failed'.
 */
const sendTimeoutMs = 20000;

const send = async (item) => {
  try {
    const response = await fetch(`${config.openwaUrl}/api/sessions/${encodeURIComponent(config.sessionId)}/messages/send-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': config.openwaKey },
      body: JSON.stringify({ chatId: `${item.recipient_e164.slice(1)}@c.us`, text: item.body, linkPreview: false }),
      signal: AbortSignal.timeout(sendTimeoutMs),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(`OpenWA ${response.status}`);
    const messageId = [payload?.messageId, payload?.id, payload?.message?.id, payload?.data?.id]
      .find((value) => typeof value === 'string') || null;
    await updateOutbox(item.id, { status: 'accepted', provider_message_id: messageId, last_error_code: null });
    await addEvent(item.id, 'accepted', messageId, { source: 'openwa-relay' });
  } catch (error) {
    const codigo = error instanceof Error
      ? (error.name === 'TimeoutError' ? `sem resposta do OpenWA em ${sendTimeoutMs / 1000}s` : error.message).slice(0, 120)
      : 'send-failed';
    console.error('Binno OpenWA send failed', item.id, codigo);
    await updateOutbox(item.id, { status: 'failed', last_error_code: codigo });
    await addEvent(item.id, 'failed', null, { source: 'openwa-relay' }).catch(() => {});
  }
};

/*
 * A CHAMADA A `materialize-whatsapp-notifications` SAIU DAQUI, em 03/09/2026.
 *
 * Ela estava dentro do laco de despacho, que corre a cada 10 segundos. Isso da
 * 8.640 chamadas por dia a uma funcao que enfileira o resumo SEMANAL de cada
 * dono — um trabalho que nao muda de resultado entre uma volta e a seguinte.
 *
 * E era duplicacao pura: o cron `binno-resumo-semanal` ja chama exactamente a
 * mesma funcao, de 15 em 15 minutos, pelo `chamar_resumo_semanal()`. Sao 96
 * chamadas por dia a fazer o mesmo trabalho que estas 8.640. Nada se perde ao
 * tirar daqui; o agendamento continua a existir, no sitio onde se ve.
 *
 * Medido: 8.679 chamadas por dia no total, contra as 96 do cron. A conta fecha
 * com este laco (6 por minuto x 1440) e explica o resto sozinha.
 *
 * O laco continua, mas so para o que e MESMO deste processo: reclamar a fila do
 * OpenWA e enviar. Agendar nao e trabalho de quem envia.
 */
const dispatch = async () => {
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
  setInterval(runDispatch, config.dispatchIntervalMs);
});
