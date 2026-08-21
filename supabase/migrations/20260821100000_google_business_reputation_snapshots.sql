-- Immutable aggregate readings for the advisor. Review text and reviewer
-- identity remain in the owner-only review table; this history holds only the
-- measurements necessary to compare reputation over time.

create table if not exists public.google_business_reputation_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  location_id uuid not null references public.google_business_locations(id) on delete cascade,
  captured_at timestamptz not null default now(),
  total_reviews integer not null check (total_reviews >= 0),
  average_rating numeric(2,1) not null check (average_rating between 0 and 5),
  rating_breakdown jsonb not null default '{"1": 0, "2": 0, "3": 0, "4": 0, "5": 0}'::jsonb,
  unanswered_review_count integer not null default 0 check (unanswered_review_count >= 0),
  reviews_last_30_days integer not null default 0 check (reviews_last_30_days >= 0),
  average_response_hours numeric(10,1),
  topics jsonb not null default '[]'::jsonb,
  source text not null default 'official-google' check (source = 'official-google')
);

create index if not exists google_business_reputation_snapshots_location_captured_idx
  on public.google_business_reputation_snapshots(location_id, captured_at desc);

create index if not exists google_business_reputation_snapshots_user_captured_idx
  on public.google_business_reputation_snapshots(user_id, captured_at desc);

alter table public.google_business_reputation_snapshots enable row level security;

drop policy if exists "google_business_reputation_snapshot_owner_select"
  on public.google_business_reputation_snapshots;

create policy "google_business_reputation_snapshot_owner_select"
on public.google_business_reputation_snapshots for select to authenticated
using (auth.uid() = user_id);

revoke all on table public.google_business_reputation_snapshots from anon, authenticated;
grant select on table public.google_business_reputation_snapshots to authenticated;
