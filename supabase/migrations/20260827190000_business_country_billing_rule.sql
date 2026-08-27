-- The country where the business operates is the source of truth for its
-- commercial region. It is intentionally separate from the manager phone.
alter table public.profiles
  add column if not exists business_country text;

alter table public.profiles
  drop constraint if exists profiles_business_country_check;

alter table public.profiles
  add constraint profiles_business_country_check
  check (business_country is null or business_country ~ '^[A-Z]{2}$');
