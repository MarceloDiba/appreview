-- Regional billing foundation for Binno.
--
-- A subscription is always attached to exactly one merchant account. This is
-- deliberately not a Stripe Connect design: the Brazilian and European sales
-- are separate merchant operations with separate price IDs, invoices and
-- webhook secrets.

alter table public.subscriptions
  add column if not exists market text,
  add column if not exists merchant text,
  add column if not exists stripe_price_id text,
  add column if not exists checkout_session_id text,
  add column if not exists billing_country text,
  add column if not exists eligibility_status text;

alter table public.subscriptions
  drop constraint if exists subscriptions_market_check;

alter table public.subscriptions
  add constraint subscriptions_market_check
  check (market is null or market in ('br', 'eu'));

alter table public.subscriptions
  drop constraint if exists subscriptions_merchant_check;

alter table public.subscriptions
  add constraint subscriptions_merchant_check
  check (merchant is null or merchant in ('br', 'eu'));

alter table public.subscriptions
  drop constraint if exists subscriptions_billing_country_check;

alter table public.subscriptions
  add constraint subscriptions_billing_country_check
  check (billing_country is null or billing_country ~ '^[A-Z]{2}$');

alter table public.subscriptions
  drop constraint if exists subscriptions_eligibility_status_check;

alter table public.subscriptions
  add constraint subscriptions_eligibility_status_check
  check (eligibility_status is null or eligibility_status in ('pending', 'verified', 'mismatch'));

-- A normal unique constraint still permits several NULLs in PostgreSQL, and
-- lets PostgREST address the conflict target used by the webhook reliably.
drop index if exists public.subscriptions_stripe_subscription_id_key;
drop index if exists public.subscriptions_checkout_session_id_key;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.subscriptions'::regclass
      and conname = 'subscriptions_stripe_subscription_id_key'
  ) then
    alter table public.subscriptions
      add constraint subscriptions_stripe_subscription_id_key unique (stripe_subscription_id);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.subscriptions'::regclass
      and conname = 'subscriptions_checkout_session_id_key'
  ) then
    alter table public.subscriptions
      add constraint subscriptions_checkout_session_id_key unique (checkout_session_id);
  end if;
end $$;

create table if not exists public.billing_webhook_events (
  id uuid primary key default gen_random_uuid(),
  merchant text not null check (merchant in ('br', 'eu')),
  stripe_event_id text not null,
  event_type text not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  processing_error text,
  unique (merchant, stripe_event_id)
);

alter table public.billing_webhook_events enable row level security;

-- Webhook events are an operational audit trail. They are never exposed to a
-- customer browser; only the service-role Edge Function writes them.
revoke all on table public.billing_webhook_events from anon, authenticated;
