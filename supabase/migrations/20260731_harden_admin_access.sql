-- Admins must be provisioned through a trusted server-side path.
--
-- The original policies allowed any authenticated user to insert a row whose
-- user_id matched auth.uid(), effectively letting that user declare themself an
-- administrator. Keep owner-select only so a future protected route can verify
-- an already provisioned role, but deny client-side writes at both RLS and
-- privilege levels.

drop policy if exists "admins_owner_insert" on public.admins;
drop policy if exists "admins_owner_update" on public.admins;

revoke insert, update, delete on table public.admins from anon, authenticated;
