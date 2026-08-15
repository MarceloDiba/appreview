-- Passive, honest measurement of the path from AppReview QR to Google.
-- A click is not a published review; Google totals are stored separately.

create table if not exists public.review_funnel_events (
  id uuid primary key default gen_random_uuid(),
  event_key text not null unique,
  qr_code_id uuid not null references public.qr_codes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (event_type in ('qr_open', 'public_click', 'private_feedback')),
  platform text check (platform is null or platform in ('google', 'tripadvisor')),
  constraint review_funnel_platform_matches_event check (
    (event_type = 'public_click' and platform is not null)
    or (event_type <> 'public_click' and platform is null)
  ),
  created_at timestamptz not null default now()
);

create table if not exists public.google_review_snapshots (
  id uuid primary key default gen_random_uuid(),
  external_place_id uuid not null references public.external_place_info(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  total_reviews integer not null check (total_reviews >= 0),
  average_rating numeric(2,1) not null check (average_rating between 0 and 5),
  captured_at timestamptz not null default now()
);

create index if not exists idx_review_funnel_user_created
  on public.review_funnel_events(user_id, created_at desc);
create index if not exists idx_google_snapshots_user_captured
  on public.google_review_snapshots(user_id, captured_at desc);

alter table public.review_funnel_events enable row level security;
alter table public.google_review_snapshots enable row level security;

create or replace function public.attribute_review_funnel_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  qr_owner uuid;
begin
  select user_id into qr_owner
  from public.qr_codes
  where id = new.qr_code_id and coalesce(is_active, true);

  if qr_owner is null then
    raise exception 'QR code not found or inactive';
  end if;

  new.user_id := qr_owner;
  return new;
end;
$$;

drop trigger if exists attribute_review_funnel_event_trigger
  on public.review_funnel_events;
create trigger attribute_review_funnel_event_trigger
before insert on public.review_funnel_events
for each row execute function public.attribute_review_funnel_event();

drop policy if exists "review_funnel_public_insert" on public.review_funnel_events;
create policy "review_funnel_public_insert"
on public.review_funnel_events for insert
to anon, authenticated
with check (true);

drop policy if exists "review_funnel_owner_select" on public.review_funnel_events;
create policy "review_funnel_owner_select"
on public.review_funnel_events for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "google_snapshots_owner_select" on public.google_review_snapshots;
create policy "google_snapshots_owner_select"
on public.google_review_snapshots for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "google_snapshots_owner_insert" on public.google_review_snapshots;
create policy "google_snapshots_owner_insert"
on public.google_review_snapshots for insert
to authenticated
with check (auth.uid() = user_id);
