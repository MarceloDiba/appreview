import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { billingConfig, countryFrom, countryIsEligible, corsHeaders, json, verifiedWebhookMarket } from '../_shared/billing.ts';

type StripeEvent = {
  id?: string;
  type?: string;
  data?: { object?: Record<string, unknown> };
};

const unixToIso = (value: unknown) => typeof value === 'number' && Number.isFinite(value)
  ? new Date(value * 1000).toISOString()
  : null;

const string = (value: unknown) => typeof value === 'string' && value ? value : null;

serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const payload = await request.text();
  const merchant = await verifiedWebhookMarket(payload, request.headers.get('stripe-signature'));
  if (!merchant) return json({ error: 'Invalid Stripe signature.' }, 400);
  const event = JSON.parse(payload) as StripeEvent;
  const eventId = string(event.id);
  const eventType = string(event.type);
  if (!eventId || !eventType) return json({ error: 'Invalid Stripe event.' }, 400);

  const url = Deno.env.get('SUPABASE_URL') || '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (!url || !serviceRoleKey) return json({ error: 'Server unavailable.' }, 503);
  const admin = createClient(url, serviceRoleKey);
  const { error: insertedError } = await admin.from('billing_webhook_events').insert({
    merchant,
    stripe_event_id: eventId,
    event_type: eventType,
  });
  if (insertedError?.code === '23505') return json({ received: true, duplicate: true });
  if (insertedError) return json({ error: 'Could not persist Stripe event.' }, 500);

  try {
    const object = event.data?.object || {};
    const metadata = object.metadata as Record<string, unknown> | undefined;
    const userId = string(metadata?.user_id) || string(object.client_reference_id);
    const subscriptionId = string(object.id)?.startsWith('sub_')
      ? string(object.id)
      : string(object.subscription);
    const customerId = string(object.customer);
    if (userId && subscriptionId && (eventType.startsWith('customer.subscription.') || eventType === 'checkout.session.completed')) {
      const { data: existing } = await admin.from('subscriptions').select('eligibility_status').eq('stripe_subscription_id', subscriptionId).maybeSingle();
      const status = eventType === 'checkout.session.completed' ? 'pending' : string(object.status);
      const price = ((object.items as Record<string, unknown> | undefined)?.data as Array<Record<string, unknown>> | undefined)?.[0]?.price as Record<string, unknown> | undefined;
      const priceId = string(price?.id);
      const currency = string(price?.currency) || string(object.currency);
      const unitAmount = typeof price?.unit_amount === 'number' ? price.unit_amount / 100 : null;
      const customerDetails = object.customer_details as Record<string, unknown> | undefined;
      const billingAddress = customerDetails?.address as Record<string, unknown> | undefined;
      const billingCountry = countryFrom(billingAddress?.country);
      const config = billingConfig(merchant);
      const eligibilityStatus = eventType === 'checkout.session.completed'
        ? (config && countryIsEligible(config, billingCountry) ? 'verified' : 'mismatch')
        : existing?.eligibility_status || 'pending';
      const record: Record<string, unknown> = {
        user_id: userId,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        market: merchant,
        merchant,
        stripe_price_id: priceId,
        billing_country: billingCountry,
        eligibility_status: eligibilityStatus,
        plan_name: 'Binno',
        status,
        currency,
        price_per_month: unitAmount,
        current_period_start: unixToIso(object.current_period_start),
        current_period_end: unixToIso(object.current_period_end),
        cancel_at: unixToIso(object.cancel_at),
      };
      // The Checkout receipt belongs to the subscription too. Do not erase it
      // when Stripe later sends a subscription.updated event.
      if (eventType === 'checkout.session.completed') record.checkout_session_id = string(object.id);
      const { error } = await admin.from('subscriptions').upsert(record, { onConflict: 'stripe_subscription_id' });
      if (error) throw error;
      if (eligibilityStatus === 'verified') {
        await admin.from('profiles').update({
          subscription_plan: 'Binno',
          subscription_status: status,
          subscription_start_date: unixToIso(object.current_period_start),
          subscription_end_date: unixToIso(object.current_period_end),
        }).eq('id', userId);
      }
    }
    await admin.from('billing_webhook_events').update({ processed_at: new Date().toISOString() }).eq('merchant', merchant).eq('stripe_event_id', eventId);
    return json({ received: true });
  } catch (error) {
    const detail = error instanceof Error ? error.message.slice(0, 500) : 'Unknown processing error';
    console.error('Stripe webhook processing error', detail);
    await admin.from('billing_webhook_events').update({ processing_error: detail }).eq('merchant', merchant).eq('stripe_event_id', eventId);
    return json({ error: 'Webhook processing failed.' }, 500);
  }
});
