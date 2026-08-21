-- Public QR pages need a business name and the review destinations, but never
-- a whole profile, phone number, subscription state or the owner's other links.
-- Keep that small public surface behind one security-definer function.

create or replace function public.get_public_qr_business(p_identifier text)
returns table (
  qr_code_id uuid,
  qr_name text,
  user_id uuid,
  business_name text,
  google_review_url text,
  tripadvisor_review_url text
)
language sql
security definer
set search_path = public
stable
as $$
  with matched_qr as (
    select q.id, q.name, q.user_id
    from public.qr_codes q
    where q.is_active = true
      and (q.slug = p_identifier or q.id::text = p_identifier)
    limit 1
  )
  select
    qr.id as qr_code_id,
    qr.name as qr_name,
    qr.user_id,
    coalesce(profile.business_name, qr.name, 'Estabelecimento') as business_name,
    google.url as google_review_url,
    tripadvisor.url as tripadvisor_review_url
  from matched_qr qr
  left join public.profiles profile on profile.id = qr.user_id
  left join lateral (
    select link.url
    from public.platform_links link
    where link.user_id = qr.user_id
      and lower(link.platform) like '%google%'
    order by link.created_at asc
    limit 1
  ) google on true
  left join lateral (
    select link.url
    from public.platform_links link
    where link.user_id = qr.user_id
      and lower(link.platform) like '%tripadvisor%'
    order by link.created_at asc
    limit 1
  ) tripadvisor on true;
$$;

revoke all on function public.get_public_qr_business(text) from public;
grant execute on function public.get_public_qr_business(text) to anon, authenticated;

-- Direct public reads allowed account discovery and exposed profile columns
-- unrelated to the QR experience. The owner interfaces already authenticate.
drop policy if exists "profiles_select_public" on public.profiles;
drop policy if exists "profiles_owner_select" on public.profiles;
create policy "profiles_owner_select"
on public.profiles for select to authenticated
using (auth.uid() = id);

drop policy if exists "platform_links_select_public" on public.platform_links;
drop policy if exists "platform_links_owner_select" on public.platform_links;
create policy "platform_links_owner_select"
on public.platform_links for select to authenticated
using (auth.uid() = user_id);

drop policy if exists "qr_codes_public_select" on public.qr_codes;
drop policy if exists "qr_codes_owner_select" on public.qr_codes;
create policy "qr_codes_owner_select"
on public.qr_codes for select to authenticated
using (auth.uid() = user_id);
