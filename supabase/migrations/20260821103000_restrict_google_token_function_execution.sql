-- These security-definer functions access Supabase Vault. Only Edge Functions
-- using the service role may execute them; browser roles must never receive a
-- refresh token, even indirectly.

revoke all on function public.store_google_business_refresh_token(uuid, text, text[])
  from public, anon, authenticated;
revoke all on function public.read_google_business_refresh_token(uuid)
  from public, anon, authenticated;

grant execute on function public.store_google_business_refresh_token(uuid, text, text[])
  to service_role;
grant execute on function public.read_google_business_refresh_token(uuid)
  to service_role;
