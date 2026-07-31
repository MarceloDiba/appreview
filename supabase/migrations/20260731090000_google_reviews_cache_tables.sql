-- Reproduce and secure the Google Reviews cache tables that already exist in
-- the active project but previously had no versioned migration.

create extension if not exists pgcrypto;

create table if not exists public.external_place_info (
  id uuid primary key default gen_random_uuid(),
  place_id text not null,
  user_id uuid not null,
  place_name text not null,
  average_rating numeric(3, 2) not null default 0,
  total_reviews integer not null default 0,
  last_fetch_time timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (place_id, user_id)
);

create table if not exists public.cached_reviews (
  id uuid primary key default gen_random_uuid(),
  external_place_id uuid not null
    references public.external_place_info(id) on delete cascade,
  review_id text not null,
  author_name text not null,
  author_image text,
  rating integer not null,
  text text,
  "time" timestamptz not null,
  created_at timestamptz not null default now(),
  unique (external_place_id, review_id)
);

-- The active table predates this migration and lacks the user foreign key.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'external_place_info_user_id_fkey'
      and conrelid = 'public.external_place_info'::regclass
  ) then
    alter table public.external_place_info
      add constraint external_place_info_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete cascade;
  end if;
end
$$;

create index if not exists idx_external_place_info_user_id
  on public.external_place_info(user_id);
create index if not exists idx_external_place_info_last_fetch_time
  on public.external_place_info(last_fetch_time);
create index if not exists idx_cached_reviews_external_place_id
  on public.cached_reviews(external_place_id);
create index if not exists idx_cached_reviews_time
  on public.cached_reviews("time" desc);

create or replace function public.set_google_reviews_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_external_place_info_updated_at
  on public.external_place_info;
create trigger set_external_place_info_updated_at
before update on public.external_place_info
for each row execute function public.set_google_reviews_updated_at();

alter table public.external_place_info enable row level security;
alter table public.cached_reviews enable row level security;

drop policy if exists "external_place_info_owner_select"
  on public.external_place_info;
create policy "external_place_info_owner_select"
on public.external_place_info for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "external_place_info_owner_insert"
  on public.external_place_info;
create policy "external_place_info_owner_insert"
on public.external_place_info for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "external_place_info_owner_update"
  on public.external_place_info;
create policy "external_place_info_owner_update"
on public.external_place_info for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "external_place_info_owner_delete"
  on public.external_place_info;
create policy "external_place_info_owner_delete"
on public.external_place_info for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "cached_reviews_owner_select"
  on public.cached_reviews;
create policy "cached_reviews_owner_select"
on public.cached_reviews for select
to authenticated
using (
  exists (
    select 1
    from public.external_place_info place
    where place.id = external_place_id
      and place.user_id = auth.uid()
  )
);

drop policy if exists "cached_reviews_owner_insert"
  on public.cached_reviews;
create policy "cached_reviews_owner_insert"
on public.cached_reviews for insert
to authenticated
with check (
  exists (
    select 1
    from public.external_place_info place
    where place.id = external_place_id
      and place.user_id = auth.uid()
  )
);

drop policy if exists "cached_reviews_owner_delete"
  on public.cached_reviews;
create policy "cached_reviews_owner_delete"
on public.cached_reviews for delete
to authenticated
using (
  exists (
    select 1
    from public.external_place_info place
    where place.id = external_place_id
      and place.user_id = auth.uid()
  )
);

revoke all on table public.external_place_info, public.cached_reviews from anon;
grant select, insert, update, delete
  on table public.external_place_info to authenticated;
grant select, insert, delete
  on table public.cached_reviews to authenticated;
