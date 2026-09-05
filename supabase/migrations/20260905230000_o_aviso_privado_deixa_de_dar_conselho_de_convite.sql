-- O aviso do comentário privado deixa de aconselhar convite, e diz que a
-- resposta já existe.
--
-- DUAS CORRECÇÕES DO MARCELO, sobre o aviso real que ele recebeu.
--
-- A PRIMEIRA: dizia "Abra e o Binno escreve um recado a partir do que ele
-- disse" — futuro, como se ainda fosse acontecer. No momento em que ele lê o
-- aviso a resposta JÁ está escrita.
--
-- A SEGUNDA, E É ONDE ELE ME CORRIGIU BEM DEPOIS DE EU O CORRIGIR A ELE.
--
-- Ele pediu para tirar o convite ao Google apenas das mensagens negativas:
-- "isso não vale a pena para mensagens negativas. Se a pessoa mandou privado,
-- ela ajudou o nosso cliente". O sentimento está certo — pedir a quem acabou de
-- reclamar que publique aquilo é surdo.
--
-- Mas tirar SÓ dos negativos é solicitação selectiva: o produto passaria a
-- coachar o dono a pedir avaliação apenas a quem está contente. É o contrário
-- do que a home promete em "A regra que não muda", e foi exactamente o defeito
-- corrigido em 02/09, quando o aviso convidava só `feedback-praise`.
--
-- A saída é tirar de TODOS. Sem filtro, e sem o conselho estranho. O convite
-- continua onde é honesto: na página do QR, que mostra o caminho para o Google
-- a qualquer nota.
--
-- O QUE SE PERDE: um empurrão para o dono pedir avaliação pública. O que se
-- ganha é o aviso não dizer nada que o produto não faria.

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
  telefone text;
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

    contato := nullif(btrim(replace(coalesce(new.customer_name, ''), '*', '')), '');

    -- SO E TELEFONE SE PARECER TELEFONE. A coluna chama-se `customer_email` por
    -- historia: o campo do formulario ja foi e-mail e hoje e WhatsApp.
    telefone := nullif(btrim(coalesce(new.customer_email, '')), '');
    if telefone is not null
       and position('@' in telefone) = 0
       and length(regexp_replace(telefone, '\D', '', 'g')) >= 10 then
      telefone := regexp_replace(telefone, '\D', '', 'g');
    else
      telefone := null;
    end if;

    if contato is not null or telefone is not null then
      linhas := array_append(linhas, '');
      if contato is not null then
        linhas := array_append(linhas, format('👤 %s', contato));
      end if;
      -- O LINK SOZINHO NA LINHA: colado a outro texto, o WhatsApp nao o
      -- reconhece como endereco e ele deixa de ser clicavel.
      if telefone is not null then
        linhas := array_append(linhas, '💬 Falar com quem escreveu:');
        linhas := array_append(linhas, format('https://wa.me/%s', telefone));
      end if;
    end if;

    linhas := array_append(linhas, '');
    -- A RESPOSTA JA EXISTE quando este aviso e lido. Dizer que o Binno "escreve"
    -- punha no futuro uma coisa que ja aconteceu.
    linhas := array_append(linhas, '✍️ A resposta já está pronta. Abra, leia e envie.');

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
