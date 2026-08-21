-- Server-side delivery state for the temporary OpenWA provider. The browser
-- never talks to OpenWA or holds the provider key; it only configures its own
-- preferences and asks the authenticated edge function to queue a test.

create table if not exists public.whatsapp_notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  recipient_e164 text not null,
  weekly_enabled boolean not null default true,
  replies_enabled boolean not null default true,
  reputation_enabled boolean not null default true,
  profile_enabled boolean not null default true,
  weekly_day text not null default 'monday' check (weekly_day in ('monday', 'friday')),
  delivery_time time not null default '09:00',
  time_zone text not null default 'Europe/Lisbon',
  consented_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (recipient_e164 ~ '^\\+[1-9][0-9]{7,14}$')
);

create table if not exists public.whatsapp_outbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'openwa' check (provider in ('openwa', 'meta-cloud')),
  kind text not null check (kind in ('test', 'alert', 'weekly', 'reply-reminder', 'profile-reminder')),
  status text not null default 'queued' check (status in ('queued', 'sending', 'accepted', 'delivered', 'read', 'failed', 'skipped', 'cancelled')),
  recipient_e164 text not null check (recipient_e164 ~ '^\\+[1-9][0-9]{7,14}$'),
  body text not null check (char_length(body) between 1 and 4096),
  idempotency_key text not null,
  scheduled_at timestamptz not null default now(),
  claimed_at timestamptz,
  provider_message_id text,
  attempts integer not null default 0 check (attempts >= 0),
  last_error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);

create index if not exists whatsapp_outbox_dispatch_idx
  on public.whatsapp_outbox (status, scheduled_at)
  where status = 'queued';

create index if not exists whatsapp_outbox_user_history_idx
  on public.whatsapp_outbox (user_id, created_at desc);

create table if not exists public.whatsapp_delivery_events (
  id uuid primary key default gen_random_uuid(),
  outbox_id uuid not null references public.whatsapp_outbox(id) on delete cascade,
  provider text not null check (provider in ('openwa', 'meta-cloud')),
  event_type text not null check (event_type in ('accepted', 'delivered', 'read', 'failed')),
  provider_message_id text,
  detail jsonb,
  occurred_at timestamptz not null default now()
);

create index if not exists whatsapp_delivery_events_outbox_idx
  on public.whatsapp_delivery_events (outbox_id, occurred_at desc);

create or replace function public.set_whatsapp_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_whatsapp_notification_preferences_updated_at on public.whatsapp_notification_preferences;
create trigger set_whatsapp_notification_preferences_updated_at
before update on public.whatsapp_notification_preferences
for each row execute function public.set_whatsapp_updated_at();

drop trigger if exists set_whatsapp_outbox_updated_at on public.whatsapp_outbox;
create trigger set_whatsapp_outbox_updated_at
before update on public.whatsapp_outbox
for each row execute function public.set_whatsapp_updated_at();

alter table public.whatsapp_notification_preferences enable row level security;
alter table public.whatsapp_outbox enable row level security;
alter table public.whatsapp_delivery_events enable row level security;

revoke all on public.whatsapp_notification_preferences, public.whatsapp_outbox, public.whatsapp_delivery_events from anon, authenticated;

create policy "whatsapp_preferences_owner_select"
on public.whatsapp_notification_preferences for select
to authenticated
using (auth.uid() = user_id);

create policy "whatsapp_outbox_owner_select"
on public.whatsapp_outbox for select
to authenticated
using (auth.uid() = user_id);

create policy "whatsapp_delivery_events_owner_select"
on public.whatsapp_delivery_events for select
to authenticated
using (
  exists (
    select 1 from public.whatsapp_outbox
    where whatsapp_outbox.id = whatsapp_delivery_events.outbox_id
      and whatsapp_outbox.user_id = auth.uid()
  )
);

-- The private relay claims a bounded batch atomically. It is intentionally
-- unavailable to browser roles; only the service-role credential can call it.
create or replace function public.claim_whatsapp_outbox(batch_size integer default 10)
returns setof public.whatsapp_outbox
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with selected as (
    select id
    from public.whatsapp_outbox
    where status = 'queued'
      and scheduled_at <= now()
    order by scheduled_at asc, created_at asc
    for update skip locked
    limit greatest(1, least(batch_size, 25))
  )
  update public.whatsapp_outbox outbox
  set status = 'sending', claimed_at = now(), attempts = outbox.attempts + 1
  from selected
  where outbox.id = selected.id
  returning outbox.*;
end;
$$;

revoke all on function public.claim_whatsapp_outbox(integer) from public, anon, authenticated;
grant execute on function public.claim_whatsapp_outbox(integer) to service_role;
