-- Audit and rate-limit state for the temporary Apify pilot. This table stores
-- no reviewers, review text, photos or raw actor output: only the public URL,
-- request status and sanitised aggregate summary needed to control spending.

create table if not exists public.experimental_apify_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  google_review_url text not null,
  status text not null check (status in ('started', 'succeeded', 'failed')),
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  result_summary jsonb,
  error_code text
);

create index if not exists experimental_apify_runs_rate_limit_idx
  on public.experimental_apify_runs(user_id, google_review_url, requested_at desc);

alter table public.experimental_apify_runs enable row level security;
revoke all on table public.experimental_apify_runs from anon, authenticated;
