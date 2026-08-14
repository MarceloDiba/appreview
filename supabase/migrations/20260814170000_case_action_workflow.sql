-- Turn internal feedback into an operational action queue.
-- Existing rows are preserved and backfilled from the legacy is_addressed flag.

alter table public.internal_feedback
  add column if not exists qr_code_id uuid,
  add column if not exists case_status text not null default 'new',
  add column if not exists responsible_name text,
  add column if not exists resolution_note text,
  add column if not exists resolution_outcome text,
  add column if not exists acknowledged_at timestamptz,
  add column if not exists resolved_at timestamptz;

update public.internal_feedback
set case_status = case when coalesce(is_addressed, false) then 'resolved' else 'new' end,
    resolved_at = case
      when coalesce(is_addressed, false) then coalesce(resolved_at, updated_at, created_at, now())
      else null
    end;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'internal_feedback_qr_code_id_fkey'
  ) then
    alter table public.internal_feedback
      add constraint internal_feedback_qr_code_id_fkey
      foreign key (qr_code_id) references public.qr_codes(id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'internal_feedback_case_status_check'
  ) then
    alter table public.internal_feedback
      add constraint internal_feedback_case_status_check
      check (case_status in ('new', 'in_progress', 'resolved'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'internal_feedback_resolution_outcome_check'
  ) then
    alter table public.internal_feedback
      add constraint internal_feedback_resolution_outcome_check
      check (
        resolution_outcome is null or resolution_outcome in (
          'recovered', 'contacted', 'operational_fix', 'no_response', 'not_applicable'
        )
      );
  end if;
end $$;

create index if not exists idx_internal_feedback_qr_code_id
  on public.internal_feedback(qr_code_id);

create index if not exists idx_internal_feedback_user_status_created
  on public.internal_feedback(user_id, case_status, created_at desc);

create or replace function public.normalize_internal_feedback_case()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  qr_owner uuid;
begin
  if tg_op = 'INSERT' and new.qr_code_id is null then
    raise exception 'QR code is required for new feedback';
  end if;

  if tg_op = 'INSERT' then
    select user_id into qr_owner
    from public.qr_codes
    where id = new.qr_code_id and coalesce(is_active, true);

    if qr_owner is null then
      raise exception 'QR code not found or inactive';
    end if;

    -- Attribution is authoritative: a public client cannot attach a QR from
    -- one business to feedback owned by another business.
    new.user_id := qr_owner;
  end if;

  if new.case_status = 'resolved' then
    new.is_addressed := true;
    new.resolved_at := coalesce(new.resolved_at, now());
  else
    new.is_addressed := false;
    new.resolved_at := null;
    if new.case_status = 'in_progress' then
      new.acknowledged_at := coalesce(new.acknowledged_at, now());
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists normalize_internal_feedback_case_trigger
  on public.internal_feedback;
create trigger normalize_internal_feedback_case_trigger
before insert or update on public.internal_feedback
for each row execute function public.normalize_internal_feedback_case();
