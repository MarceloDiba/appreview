-- Ensure every auth user gets a matching public profile row
create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    business_name,
    first_name,
    created_at,
    updated_at
  )
  values (
    new.id,
    nullif(trim(new.raw_user_meta_data ->> 'businessName'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
    now(),
    now()
  )
  on conflict (id) do update
    set business_name = coalesce(public.profiles.business_name, excluded.business_name),
        first_name = coalesce(public.profiles.first_name, excluded.first_name),
        updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
after insert on auth.users
for each row execute function public.handle_new_user_profile();

insert into public.profiles (
  id,
  business_name,
  first_name,
  created_at,
  updated_at
)
select
  u.id,
  nullif(trim(u.raw_user_meta_data ->> 'businessName'), ''),
  nullif(trim(u.raw_user_meta_data ->> 'name'), ''),
  coalesce(u.created_at, now()),
  now()
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
on conflict (id) do nothing;
