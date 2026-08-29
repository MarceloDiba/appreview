-- Interruptor próprio para o alerta imediato de comentário privado, no mesmo
-- padrão dos que já existem (weekly, replies, reputation, profile).
alter table public.whatsapp_notification_preferences
  add column if not exists feedback_enabled boolean not null default true;

-- Alerta imediato quando chega um comentário privado com nota baixa.
--
-- Corte em 3 ou menos numa escala de 5. Nota 4 é elogio com ressalva e é
-- assunto de painel. Nota 1 costuma ser cliente já perdido. A nota 3 é a mais
-- valiosa: é onde o dono ainda consegue mudar o desfecho com um telefonema.
--
-- Regra inegociável: falha ao avisar nunca pode impedir o comentário de ser
-- gravado. O comentário do cliente é o dado; o aviso é conveniência.
create or replace function public.notify_low_rating_feedback()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  pref record;
  linhas text[] := array[]::text[];
  contato text;
  corpo text;
begin
  if new.rating is null or new.rating > 3 then
    return new;
  end if;

  begin
    select recipient_e164, consented_at, feedback_enabled
      into pref
      from public.whatsapp_notification_preferences
     where user_id = new.user_id;

    if pref is null or pref.consented_at is null or not pref.feedback_enabled then
      return new;
    end if;

    linhas := array_append(linhas, 'Binno');
    linhas := array_append(linhas, format('Comentário privado agora, nota %s de 5.', new.rating));

    if nullif(btrim(coalesce(new.feedback_text, '')), '') is not null then
      linhas := array_append(linhas, '');
      linhas := array_append(linhas, format('"%s"', btrim(new.feedback_text)));
    end if;

    contato := nullif(btrim(concat_ws(', ',
      nullif(btrim(coalesce(new.customer_name, '')), ''),
      nullif(btrim(coalesce(new.customer_email, '')), '')
    )), '');

    if contato is not null then
      linhas := array_append(linhas, '');
      linhas := array_append(linhas, format('Contato deixado: %s', contato));
    end if;

    linhas := array_append(linhas, '');
    linhas := array_append(linhas, 'Ver no painel: https://binno.pro/dashboard');

    corpo := array_to_string(linhas, E'\n');

    insert into public.whatsapp_outbox (user_id, kind, recipient_e164, body, idempotency_key)
    values (new.user_id, 'feedback', pref.recipient_e164, corpo, 'feedback:' || new.id::text)
    on conflict (user_id, idempotency_key) do nothing;

  exception when others then
    -- Aviso é conveniência; o comentário do cliente não se perde por causa dele.
    raise warning 'notify_low_rating_feedback falhou para %: %', new.id, sqlerrm;
  end;

  return new;
end;
$$;

drop trigger if exists notify_low_rating_feedback_trigger on public.internal_feedback;

create trigger notify_low_rating_feedback_trigger
after insert on public.internal_feedback
for each row execute function public.notify_low_rating_feedback();
