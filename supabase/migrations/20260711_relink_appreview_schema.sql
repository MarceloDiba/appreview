-- Relink AppReview to the active Supabase project
create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  business_name text,
  first_name text,
  last_name text,
  phone text,
  avatar_url text,
  subscription_plan text,
  subscription_status text,
  subscription_start_date timestamptz,
  subscription_end_date timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.platform_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null,
  display_name text,
  url text not null,
  place_id text,
  business_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.internal_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  customer_name text,
  customer_email text,
  feedback_text text,
  rating integer not null check (rating between 1 and 5),
  is_addressed boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.qr_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  slug text not null,
  redirect_url text not null,
  is_active boolean default true,
  times_scanned integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null,
  external_review_id text,
  customer_name text,
  rating integer not null check (rating between 1 and 5),
  review_text text,
  review_date timestamptz,
  response_text text,
  response_status text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan_name text,
  status text,
  currency text,
  price_per_month numeric,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.admins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  role text default 'admin',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists idx_platform_links_user_platform on public.platform_links(user_id, platform);
create unique index if not exists idx_qr_codes_slug on public.qr_codes(slug);
create unique index if not exists idx_reviews_external_review on public.reviews(platform, external_review_id) where external_review_id is not null;

create index if not exists idx_platform_links_user_id on public.platform_links(user_id);
create index if not exists idx_internal_feedback_user_id on public.internal_feedback(user_id);
create index if not exists idx_qr_codes_user_id on public.qr_codes(user_id);
create index if not exists idx_qr_codes_slug_lookup on public.qr_codes(slug);
create index if not exists idx_reviews_user_id on public.reviews(user_id);
create index if not exists idx_subscriptions_user_id on public.subscriptions(user_id);

create or replace trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create or replace trigger set_platform_links_updated_at
before update on public.platform_links
for each row execute function public.set_updated_at();

create or replace trigger set_internal_feedback_updated_at
before update on public.internal_feedback
for each row execute function public.set_updated_at();

create or replace trigger set_qr_codes_updated_at
before update on public.qr_codes
for each row execute function public.set_updated_at();

create or replace trigger set_reviews_updated_at
before update on public.reviews
for each row execute function public.set_updated_at();

create or replace trigger set_subscriptions_updated_at
before update on public.subscriptions
for each row execute function public.set_updated_at();

create or replace trigger set_admins_updated_at
before update on public.admins
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.platform_links enable row level security;
alter table public.internal_feedback enable row level security;
alter table public.qr_codes enable row level security;
alter table public.reviews enable row level security;
alter table public.subscriptions enable row level security;
alter table public.admins enable row level security;

drop policy if exists "profiles_select_public" on public.profiles;
create policy "profiles_select_public"
on public.profiles for select
using (true);

drop policy if exists "profiles_owner_insert" on public.profiles;
create policy "profiles_owner_insert"
on public.profiles for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "profiles_owner_update" on public.profiles;
create policy "profiles_owner_update"
on public.profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "platform_links_select_public" on public.platform_links;
create policy "platform_links_select_public"
on public.platform_links for select
using (true);

drop policy if exists "platform_links_owner_insert" on public.platform_links;
create policy "platform_links_owner_insert"
on public.platform_links for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "platform_links_owner_update" on public.platform_links;
create policy "platform_links_owner_update"
on public.platform_links for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "platform_links_owner_delete" on public.platform_links;
create policy "platform_links_owner_delete"
on public.platform_links for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "internal_feedback_owner_select" on public.internal_feedback;
create policy "internal_feedback_owner_select"
on public.internal_feedback for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "internal_feedback_public_insert" on public.internal_feedback;
create policy "internal_feedback_public_insert"
on public.internal_feedback for insert
to anon, authenticated
with check (true);

drop policy if exists "internal_feedback_owner_update" on public.internal_feedback;
create policy "internal_feedback_owner_update"
on public.internal_feedback for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "qr_codes_public_select" on public.qr_codes;
create policy "qr_codes_public_select"
on public.qr_codes for select
using (is_active = true or auth.uid() = user_id);

drop policy if exists "qr_codes_owner_insert" on public.qr_codes;
create policy "qr_codes_owner_insert"
on public.qr_codes for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "qr_codes_owner_update" on public.qr_codes;
create policy "qr_codes_owner_update"
on public.qr_codes for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "qr_codes_public_update_scan" on public.qr_codes;
create policy "qr_codes_public_update_scan"
on public.qr_codes for update
to anon, authenticated
using (is_active = true)
with check (is_active = true);

drop policy if exists "qr_codes_owner_delete" on public.qr_codes;
create policy "qr_codes_owner_delete"
on public.qr_codes for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "reviews_owner_select" on public.reviews;
create policy "reviews_owner_select"
on public.reviews for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "reviews_owner_insert" on public.reviews;
create policy "reviews_owner_insert"
on public.reviews for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "reviews_owner_update" on public.reviews;
create policy "reviews_owner_update"
on public.reviews for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "reviews_owner_delete" on public.reviews;
create policy "reviews_owner_delete"
on public.reviews for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "subscriptions_owner_select" on public.subscriptions;
create policy "subscriptions_owner_select"
on public.subscriptions for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "subscriptions_owner_insert" on public.subscriptions;
create policy "subscriptions_owner_insert"
on public.subscriptions for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "subscriptions_owner_update" on public.subscriptions;
create policy "subscriptions_owner_update"
on public.subscriptions for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "admins_owner_select" on public.admins;
create policy "admins_owner_select"
on public.admins for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "admins_owner_insert" on public.admins;
create policy "admins_owner_insert"
on public.admins for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "admins_owner_update" on public.admins;
create policy "admins_owner_update"
on public.admins for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
