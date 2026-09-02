-- O aviso do comentario privado, escrito para ser lido no telemovel.
--
-- Marcelo, em 01/09/2026, depois de receber um aviso de ensaio: "voce pode
-- editar ela melhor, deixar pontos importantes em negrito, fazer quebra de
-- linha, enviar o link do dash ao final" e "podemos ter emojis pra nos ajudar
-- a organizar a mensagem".
--
-- O QUE MUDA, E O QUE NAO MUDA
--
-- A REGRA de quando avisar nao muda em nada: nota nula nao avisa, nota ate 3
-- avisa e cala-se 5 minutos, nota 4 ou 5 COM texto avisa e cala-se 15 minutos,
-- nota 4 ou 5 sem texto nao avisa. O acumulado desde o ultimo aviso continua a
-- ser contado da mesma forma. So o TEXTO muda.
--
-- TRES CORRECOES ALEM DO PEDIDO
--
-- 1. Acentos. A mensagem dizia "comentarios privados desde o ultimo aviso" e
--    "elogios escritos desde o ultimo aviso", sem acentos, porque foram
--    escritas as pressas no dia do bloqueio do WhatsApp. E o dono que le isto,
--    e amanha e um prospecto que le por cima do ombro dele.
--
-- 2. O asterisco sai do texto do CLIENTE. O negrito do WhatsApp e *assim*, e o
--    Telegram converte os nossos asteriscos em negrito. Um asterisco escrito
--    pelo cliente dentro da citacao emparelharia com os nossos e poria negrito
--    no sitio errado. Tirar o asterisco do que nao e nosso resolve na origem.
--
-- 3. Os emojis sao MARCADORES e nao enfeite: um para a especie do aviso
--    (vermelho para queixa, verde para elogio), um para a citacao, um para o
--    contacto, um para o link. Quem le no telemovel encontra a parte que quer
--    sem ler a mensagem inteira.
create or replace function public.notify_internal_feedback_whatsapp()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
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
  if new.rating is null then
    return new;
  end if;

  -- O asterisco sai aqui, na origem: dentro da citacao ele emparelharia com os
  -- nossos e poria negrito onde nao devia.
  comentario := nullif(btrim(replace(coalesce(new.feedback_text, ''), '*', '')), '');

  if new.rating <= 3 then
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

    select created_at
      into ultimo_aviso
      from public.whatsapp_outbox
     where user_id = new.user_id and kind = especie
     order by created_at desc
     limit 1;

    if ultimo_aviso is not null and ultimo_aviso > now() - janela then
      return new;
    end if;

    if ultimo_aviso is null then
      acumulados := 1;
    elsif especie = 'feedback' then
      select count(*) into acumulados from public.internal_feedback
       where user_id = new.user_id and rating is not null and rating <= 3
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

    -- O CONVITE NAO DEPENDE DA NOTA (02/09/2026).
    --
    -- Ate esta data esta linha so era escrita para `feedback-praise`, ou seja
    -- nota 4 ou 5. Convidar so quem deu nota alta e solicitacao seletiva, e a
    -- politica do Google proibe: perfis apanhados nisso perdem avaliacoes.
    -- Quem deu 3 ou menos tambem e cliente, tambem escreveu, e tambem pode
    -- publicar se quiser.
    --
    -- As duas linhas sao escritas sempre, na mesma ordem, para qualquer nota:
    -- primeiro o que o Binno faz por ele, depois o convite.
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
$$;
