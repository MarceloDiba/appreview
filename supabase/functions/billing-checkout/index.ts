import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { billingConfig, corsHeaders, createCustomerPortal, createSubscriptionCheckout, json, marketFrom } from '../_shared/billing.ts';

serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const authorization = request.headers.get('Authorization');
  if (!supabaseUrl || !anonKey || !serviceRoleKey || !authorization) return json({ error: 'Authentication required' }, 401);

  const caller = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } });
  const { data: { user }, error: userError } = await caller.auth.getUser();
  if (userError || !user?.email) return json({ error: 'Invalid session' }, 401);

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const action = body.action;
  const admin = createClient(supabaseUrl, serviceRoleKey);

  if (action === 'status') {
    const { data: subscription } = await admin.from('subscriptions')
      .select('status, market, merchant, currency, price_per_month, current_period_end, cancel_at')
      .eq('user_id', user.id).order('updated_at', { ascending: false }).limit(1).maybeSingle();
    return json({ subscription, markets: { br: Boolean(billingConfig('br')), eu: Boolean(billingConfig('eu')) } });
  }

  if (action === 'checkout') {
    const market = marketFrom(body.market);
    if (!market) return json({ error: 'Market invalid' }, 422);
    const config = billingConfig(market);
    if (!config) return json({ error: 'Billing is not available for this market yet.' }, 503);
    const { data: profile } = await admin.from('profiles').select('business_name').eq('id', user.id).maybeSingle();
    const { data: existing } = await admin.from('subscriptions').select('status').eq('user_id', user.id)
      .in('status', ['active', 'trialing', 'past_due']).limit(1).maybeSingle();
    if (existing) return json({ error: 'Subscription already exists.', code: 'already_subscribed' }, 409);
    const appUrl = (Deno.env.get('APP_URL') || '').replace(/\/$/, '');
    if (!appUrl) return json({ error: 'Billing origin is not configured.' }, 503);
    try {
      const session = await createSubscriptionCheckout(config, {
        appUrl,
        userId: user.id,
        email: user.email,
        businessName: profile?.business_name,
      });
      const url = typeof session.url === 'string' ? session.url : null;
      if (!url) return json({ error: 'Checkout session has no URL.' }, 502);
      return json({ url });
    } catch (error) {
      console.error('Stripe checkout error', error instanceof Error ? error.message : 'unknown');
      return json({ error: 'Could not start checkout.' }, 502);
    }
  }

  if (action === 'portal') {
    const { data: subscription } = await admin.from('subscriptions')
      .select('merchant, stripe_customer_id').eq('user_id', user.id).not('stripe_customer_id', 'is', null)
      .order('updated_at', { ascending: false }).limit(1).maybeSingle();
    const market = marketFrom(subscription?.merchant);
    const config = market ? billingConfig(market) : null;
    if (!config || !subscription?.stripe_customer_id) return json({ error: 'Customer portal unavailable.' }, 404);
    const appUrl = (Deno.env.get('APP_URL') || '').replace(/\/$/, '');
    if (!appUrl) return json({ error: 'Billing origin is not configured.' }, 503);
    try {
      const portal = await createCustomerPortal(config, subscription.stripe_customer_id, `${appUrl}/profile`);
      const url = typeof portal.url === 'string' ? portal.url : null;
      if (!url) return json({ error: 'Customer portal has no URL.' }, 502);
      return json({ url });
    } catch (error) {
      console.error('Stripe portal error', error instanceof Error ? error.message : 'unknown');
      return json({ error: 'Could not open customer portal.' }, 502);
    }
  }

  return json({ error: 'Invalid action.' }, 422);
});
