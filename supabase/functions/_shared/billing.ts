export type BillingMarket = 'br' | 'eu';

export type BillingConfig = {
  market: BillingMarket;
  currency: 'brl' | 'eur';
  priceId: string;
  secretKey: string;
  webhookSecret?: string;
};

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export const json = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

export const marketFrom = (value: unknown): BillingMarket | null =>
  value === 'br' || value === 'eu' ? value : null;

export const billingConfig = (market: BillingMarket): BillingConfig | null => {
  const suffix = market === 'br' ? 'BR' : 'EU';
  const secretKey = Deno.env.get(`STRIPE_${suffix}_SECRET_KEY`)?.trim() || '';
  const priceId = Deno.env.get(`STRIPE_${suffix}_PRICE_ID`)?.trim() || '';
  if (!secretKey || !priceId) return null;
  return {
    market,
    currency: market === 'br' ? 'brl' : 'eur',
    secretKey,
    priceId,
    webhookSecret: Deno.env.get(`STRIPE_${suffix}_WEBHOOK_SECRET`)?.trim() || undefined,
  };
};

const stripeRequest = async (config: BillingConfig, path: string, params: URLSearchParams) => {
  const credentials = btoa(`${config.secretKey}:`);
  const response = await fetch(`https://api.stripe.com${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Stripe-Version': '2026-07-29.dahlia',
    },
    body: params,
  });
  const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) {
    const message = typeof (payload.error as Record<string, unknown> | undefined)?.message === 'string'
      ? (payload.error as Record<string, unknown>).message
      : 'Stripe request failed';
    throw new Error(message);
  }
  return payload;
};

/**
 * The browser never receives a Stripe secret. This server-only client also
 * intentionally leaves payment_method_types absent so Stripe can use the
 * payment methods eligible for each customer and market.
 */
export const createSubscriptionCheckout = async (
  config: BillingConfig,
  input: { appUrl: string; userId: string; email: string; businessName?: string | null },
) => {
  const params = new URLSearchParams({
    mode: 'subscription',
    'line_items[0][price]': config.priceId,
    'line_items[0][quantity]': '1',
    success_url: `${input.appUrl}/profile?billing=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${input.appUrl}/profile?billing=cancelled`,
    client_reference_id: input.userId,
    customer_email: input.email,
    'metadata[user_id]': input.userId,
    'metadata[market]': config.market,
    'subscription_data[metadata][user_id]': input.userId,
    'subscription_data[metadata][market]': config.market,
  });
  if (input.businessName) params.set('metadata[business_name]', input.businessName.slice(0, 500));
  return stripeRequest(config, '/v1/checkout/sessions', params);
};

export const createCustomerPortal = async (
  config: BillingConfig,
  customerId: string,
  returnUrl: string,
) => stripeRequest(config, '/v1/billing_portal/sessions', new URLSearchParams({ customer: customerId, return_url: returnUrl }));

const fromHex = (value: string) => {
  if (!/^[0-9a-f]{64}$/i.test(value)) return null;
  const bytes = new Uint8Array(value.length / 2);
  for (let index = 0; index < value.length; index += 2) bytes[index / 2] = Number.parseInt(value.slice(index, index + 2), 16);
  return bytes;
};

const secureEqual = (left: Uint8Array, right: Uint8Array) => {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index += 1) result |= left[index] ^ right[index];
  return result === 0;
};

const signature = async (secret: string, value: string) => {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value)));
};

/** Verifies Stripe's signed raw payload before JSON is parsed. */
export const verifiedWebhookMarket = async (payload: string, header: string | null): Promise<BillingMarket | null> => {
  if (!header) return null;
  const values = header.split(',').reduce<Record<string, string[]>>((result, part) => {
    const [key, value] = part.split('=', 2);
    if (key && value) (result[key] ||= []).push(value);
    return result;
  }, {});
  const timestamp = values.t?.[0];
  if (!timestamp || !/^\d+$/.test(timestamp)) return null;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return null;
  for (const market of ['br', 'eu'] as const) {
    const config = billingConfig(market);
    if (!config?.webhookSecret) continue;
    const expected = await signature(config.webhookSecret, `${timestamp}.${payload}`);
    const matches = values.v1?.some((candidate) => {
      const received = fromHex(candidate);
      return received ? secureEqual(expected, received) : false;
    });
    if (matches) return market;
  }
  return null;
};
