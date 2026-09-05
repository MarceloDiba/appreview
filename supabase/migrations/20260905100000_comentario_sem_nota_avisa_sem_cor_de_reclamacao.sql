-- Um comentario sem nota avisa, e nao finge ser reclamacao.
--
-- O QUE ACONTECIA
--
-- A tela do QR mandava `rating: 'neutral'`, que vale 3. Quem escrevia so um
-- elogio ficava gravado com nota 3, e este gatilho mandava um aviso VERMELHO
-- de reclamacao, com o elogio citado por baixo. O dono era avisado de um
-- insatisfeito que nao existia, e a nota media interna era puxada para baixo
-- por notas que ninguem deu.
--
-- A tela foi corrigida no mesmo dia e deixou de assumir nota. Sozinho, esse
-- conserto trocava um defeito por outro: aqui havia
-- `if new.rating is null then return new`, entao um cliente que escrevesse um
-- problema sem dar nota deixava de avisar o dono. De "avisa a mais" para
-- "nao avisa".
--
-- Marcelo escolheu, em 05/09/2026: avisar, sem cor de reclamacao. O aviso diz
-- o que se sabe (houve comentario) e nao inventa o que nao se sabe (a opiniao).

create or replace function public.notify_internal_feedback_whatsapp()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  pref record;
  linhas text[] := array[]::text[];
  contato text;
  corpo text;
  comentario text;
  ultimo_aviso timestamptz;
  acumulados integer;
  especie text;
  janela interval;
begin
  comentario := nullif(btrim(replace(coalesce(new.feedback_text, ''), '*', '')), '');

  if new.rating is null then
    if comentario is null then
      return new;
    end if;
    especie := 'feedback-sem-nota';
    janela := interval '15 minutes';
  elsif new.rating <= 3 then
    especie := 'feedback';
    janela := interval '5 minutes';
  elsif comentario is not null then
    especie := 'feedback-praise';
    janela := interval '15 minutes';
  else
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

    select created_at into ultimo_aviso
      from public.whatsapp_outbox
     where user_id = new.user_id and kind = especie
     order by created_at desc limit 1;

    if ultimo_aviso is not null and ultimo_aviso > now() - janela then
      return new;
    end if;

    if ultimo_aviso is null then
      acumulados := 1;
    elsif especie = 'feedback' then
      select count(*) into acumulados from public.internal_feedback
       where user_id = new.user_id and rating is not null and rating <= 3
         and created_at > ultimo_aviso;
    elsif especie = 'feedback-sem-nota' then
      select count(*) into acumulados from public.internal_feedback
       where user_id = new.user_id and rating is null
         and nullif(btrim(coalesce(feedback_text, '')), '') is not null
         and created_at > ultimo_aviso;
    else
      select count(*) into acumulados from public.internal_feedback
       where user_id = new.user_id and rating is not null and rating >= 4
         and nullif(btrim(coalesce(feedback_text, '')), '') is not null
         and created_at > ultimo_aviso;
    end if;

    if especie = 'feedback' then
      if acumulados > 1 then
        linhas := array_append(linhas, format('🔴 *%s comentários privados* desde o último aviso', acumulados));
        linhas := array_append(linhas, format('O mais recente tem *nota %s de 5*.', new.rating));
      else
        linhas := array_append(linhas, '🔴 *Comentário privado agora*');
        linhas := array_append(linhas, format('Deixou *nota %s de 5*.', new.rating));
      end if;
    elsif especie = 'feedback-sem-nota' then
      -- SEM COR DE JULGAMENTO. Nao e vermelho nem verde porque nao se sabe se
      -- e queixa ou elogio, e dizer qualquer um dos dois seria inventar.
      if acumulados > 1 then
        linhas := array_append(linhas, format('💬 *%s comentários privados* desde o último aviso', acumulados));
        linhas := array_append(linhas, 'Escritos sem nota. Leia para saber o que são.');
      else
        linhas := array_append(linhas, '💬 *Comentário privado agora*');
        linhas := array_append(linhas, 'O cliente escreveu sem dar nota.');
      end if;
    else
      if acumulados > 1 then
        linhas := array_append(linhas, format('🟢 *%s elogios escritos* desde o último aviso', acumulados));
        linhas := array_append(linhas, format('O mais recente tem *nota %s de 5*.', new.rating));
      else
        linhas := array_append(linhas, '🟢 *Elogio agora*');
        linhas := array_append(linhas, format('Deixou *nota %s de 5*.', new.rating));
      end if;
    end if;

    if comentario is not null then
      linhas := array_append(linhas, '');
      linhas := array_append(linhas, format('💬 "%s"', comentario));
    end if;

    contato := nullif(btrim(concat_ws(', ',
      nullif(btrim(replace(coalesce(new.customer_name, ''), '*', '')), ''),
      nullif(btrim(replace(coalesce(new.customer_email, ''), '*', '')), '')
    )), '');

    if contato is not null then
      linhas := array_append(linhas, '');
      linhas := array_append(linhas, format('📱 Contato deixado: %s', contato));
    end if;

    linhas := array_append(linhas, '');
    linhas := array_append(linhas, '✍️ Abra e o Binno escreve um recado a partir do que ele disse.');
    linhas := array_append(linhas, '📣 Depois de responder, convide a publicar no Google. Vale para qualquer nota.');
    linhas := array_append(linhas, '');
    linhas := array_append(linhas, '👉 https://binno.pro/reviews');

    corpo := array_to_string(linhas, E'\n');

    insert into public.whatsapp_outbox (user_id, kind, provider, recipient_e164, body, idempotency_key)
    values (new.user_id, especie, public.canal_do_aviso(new.user_id), pref.recipient_e164, corpo, especie || ':' || new.id::text)
    on conflict (user_id, idempotency_key) do nothing;

  exception when others then
    raise warning 'notify_internal_feedback_whatsapp falhou para %: %', new.id, sqlerrm;
  end;

  return new;
end;
$function$;
