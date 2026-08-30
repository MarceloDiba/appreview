-- O aviso apontava para a pagina que nao mostra o que ele avisa.
--
-- O corpo da mensagem terminava em `https://binno.pro/dashboard`, e o
-- comentario privado nao aparece ali: ele vive em `/reviews`, na aba de casos
-- internos. Descoberto em 30/08/2026 no primeiro uso real, quando o aviso
-- chegou ao celular, o gestor abriu o link e nao encontrou nada.
--
-- Isto corrige so o destino. O painel continuar sem superficie de comentario e
-- um buraco de produto separado, e mexer na composicao da Visao geral altera
-- `docs/contrato-produto-binno.md`, entao depende de decisao do Marcelo.

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
    linhas := array_append(linhas, 'Ver no painel: https://binno.pro/reviews');

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
