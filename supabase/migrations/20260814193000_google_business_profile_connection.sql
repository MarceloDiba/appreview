-- Foundation for the official Google Business Profile connection.
--
-- Places remains useful for a public review link, but it returns only a small
-- subset of reviews and does not expose the owner's reply. These tables keep
-- the OAuth credential out of the public schema and make the complete review
-- inbox possible once the Google project has API approval.

create extension if not exists supabase_vault with schema vault;

create table if not exists public.google_business_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  refresh_token_secret_id uuid,
  status text not null default 'disconnected'
    check (status in ('disconnected', 'connected', 'revoked', 'error')),
  granted_scopes text[] not null default '{}',
  last_synced_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.google_business_oauth_states (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  state_hash text not null unique,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.google_business_locations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_name text not null,
  location_name text not null,
  title text not null,
  store_code text,
  place_id text,
  is_selected boolean not null default false,
  last_synced_at timestamptz,
  review_sync_cursor text,
  review_sync_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, location_name)
);

create unique index if not exists google_business_one_selected_location_per_user
  on public.google_business_locations(user_id)
  where is_selected;

create table if not exists public.google_business_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  location_id uuid not null references public.google_business_locations(id) on delete cascade,
  google_review_name text not null,
  reviewer_name text,
  reviewer_photo_url text,
  is_anonymous boolean not null default false,
  rating integer not null check (rating between 1 and 5),
  comment text,
  review_created_at timestamptz,
  review_updated_at timestamptz,
  reply_text text,
  reply_updated_at timestamptz,
  reply_state text,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (location_id, google_review_name)
);

create index if not exists google_business_reviews_queue_idx
  on public.google_business_reviews(user_id, location_id, reply_text, review_updated_at desc);

create index if not exists google_business_oauth_states_expiry_idx
  on public.google_business_oauth_states(expires_at)
  where consumed_at is null;

create or replace function public.set_google_business_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_google_business_connections_updated_at on public.google_business_connections;
create trigger set_google_business_connections_updated_at
before update on public.google_business_connections
for each row execute function public.set_google_business_updated_at();

drop trigger if exists set_google_business_locations_updated_at on public.google_business_locations;
create trigger set_google_business_locations_updated_at
before update on public.google_business_locations
for each row execute function public.set_google_business_updated_at();

drop trigger if exists set_google_business_reviews_updated_at on public.google_business_reviews;
create trigger set_google_business_reviews_updated_at
before update on public.google_business_reviews
for each row execute function public.set_google_business_updated_at();

-- Only Edge Functions using the service key can store or read a refresh token.
-- The browser can read the connection state, locations and reviews it owns, but
-- it never receives the token or the OAuth state.
create or replace function public.store_google_business_refresh_token(
  p_user_id uuid,
  p_refresh_token text,
  p_granted_scopes text[] default '{}'
)
returns void
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  existing_secret_id uuid;
  next_secret_id uuid;
begin
  if p_refresh_token is null or length(trim(p_refresh_token)) = 0 then
    raise exception 'Refresh token is required';
  end if;

  select refresh_token_secret_id
  into existing_secret_id
  from public.google_business_connections
  where user_id = p_user_id;

  if existing_secret_id is null then
    select vault.create_secret(
      p_refresh_token,
      'google_business_refresh_' || p_user_id::text,
      'Google Business Profile OAuth refresh token'
    ) into next_secret_id;
  else
    perform vault.update_secret(existing_secret_id, p_refresh_token);
    next_secret_id := existing_secret_id;
  end if;

  insert into public.google_business_connections (
    user_id,
    refresh_token_secret_id,
    status,
    granted_scopes,
    last_error
  ) values (
    p_user_id,
    next_secret_id,
    'connected',
    coalesce(p_granted_scopes, '{}'),
    null
  )
  on conflict (user_id) do update set
    refresh_token_secret_id = excluded.refresh_token_secret_id,
    status = 'connected',
    granted_scopes = excluded.granted_scopes,
    last_error = null;
end;
$$;

create or replace function public.read_google_business_refresh_token(p_user_id uuid)
returns text
language sql
security definer
set search_path = public, vault
as $$
  select secrets.decrypted_secret
  from public.google_business_connections connection
  join vault.decrypted_secrets secrets on secrets.id = connection.refresh_token_secret_id
  where connection.user_id = p_user_id
    and connection.status = 'connected'
$$;

revoke all on function public.store_google_business_refresh_token(uuid, text, text[]) from public;
revoke all on function public.read_google_business_refresh_token(uuid) from public;
grant execute on function public.store_google_business_refresh_token(uuid, text, text[]) to service_role;
grant execute on function public.read_google_business_refresh_token(uuid) to service_role;

alter table public.google_business_connections enable row level security;
alter table public.google_business_oauth_states enable row level security;
alter table public.google_business_locations enable row level security;
alter table public.google_business_reviews enable row level security;

create policy "google_business_connection_owner_select"
on public.google_business_connections for select to authenticated
using (auth.uid() = user_id);

create policy "google_business_location_owner_select"
on public.google_business_locations for select to authenticated
using (auth.uid() = user_id);

create policy "google_business_review_owner_select"
on public.google_business_reviews for select to authenticated
using (auth.uid() = user_id);

revoke all on table public.google_business_oauth_states from anon, authenticated;
revoke all on table public.google_business_connections,
  public.google_business_locations,
  public.google_business_reviews from anon;
grant select on table public.google_business_connections,
  public.google_business_locations,
  public.google_business_reviews to authenticated;
