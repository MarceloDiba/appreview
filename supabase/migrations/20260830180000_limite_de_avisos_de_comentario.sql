-- Um aviso a cada 5 minutos, e o que passar disso e somado em vez de descartado.
--
-- POR QUE EXISTE
--
-- A politica `internal_feedback_public_insert` aceita insert anonimo com
-- `with check (true)`, e `get_public_qr_business` devolve o `user_id` do dono
-- para a pagina publica, que precisa dele para o formulario. Quem escaneia o
-- cartao na mesa fica, portanto, com tudo o que e preciso para inserir
-- comentarios sem limite. Cada um com nota 3 ou menos disparava uma mensagem
-- no WhatsApp do dono. Verificado no banco em 30/08/2026.
--
-- POR QUE INTERVALO MINIMO, E NAO TETO POR HORA
--
-- Um teto de seis por hora, se gasto nos primeiros dez minutos, deixa a setima
-- reclamacao real cinquenta minutos sem avisar. Cinquenta minutos e a janela em
-- que o cliente vai embora. Com intervalo minimo, nenhuma reclamacao real
-- espera mais que cinco minutos, e o ataque cai de centenas de mensagens por
-- hora para no maximo doze.
--
-- POR QUE CINCO MINUTOS
--
-- E o maior atraso que ainda serve a promessa do produto, que e o dono agir
-- enquanto a pessoa esta na mesa ou acabou de sair. Quinze minutos nao serve.
-- Menos que cinco protege pouco mais e faz dois comentarios legitimos seguidos
-- virarem duas mensagens.
--
-- O QUE TORNA O ATRASO ACEITAVEL
--
-- Somar, nao descartar. Passado o intervalo, a proxima mensagem diz quantos
-- comentarios se acumularam desde o aviso anterior. O dono nao perde
-- informacao: a regra de que falha no aviso nunca impede o comentario de ser
-- gravado passa a valer tambem para o aviso, que junta em vez de perder.
--
-- O QUE ISTO NAO RESOLVE
--
-- Nao impede o ataque, limita o estrago. A `whatsapp_outbox` ainda pode receber
-- linhas de quem tiver o slug. Fechar de verdade exigiria amarrar o comentario
-- a um QR realmente escaneado, o que acrescenta atrito a um cliente legitimo, e
-- e decisao maior, para depois de haver cliente pagando.

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
  ultimo_aviso timestamptz;
  acumulados integer;
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

    select created_at
      into ultimo_aviso
      from public.whatsapp_outbox
     where user_id = new.user_id and kind = 'feedback'
     order by created_at desc
     limit 1;

    -- Dentro da janela: o comentario ja esta gravado e aparece no painel. O
    -- aviso espera, e o proximo dira quantos se acumularam.
    if ultimo_aviso is not null and ultimo_aviso > now() - interval '5 minutes' then
      return new;
    end if;

    -- So se acumula em relacao a um aviso anterior. Sem aviso anterior nao ha
    -- nada acumulado: contar desde o infinito faria a primeira mensagem de uma
    -- conta nova somar comentarios historicos, que o dono ja viu ou ja tratou.
    if ultimo_aviso is null then
      acumulados := 1;
    else
      select count(*)
        into acumulados
        from public.internal_feedback
       where user_id = new.user_id
         and rating is not null
         and rating <= 3
         and created_at > ultimo_aviso;
    end if;

    linhas := array_append(linhas, 'Binno');

    if acumulados > 1 then
      linhas := array_append(linhas, format(
        '%s comentarios privados desde o ultimo aviso. O mais recente tem nota %s de 5.',
        acumulados, new.rating));
    else
      linhas := array_append(linhas, format('Comentário privado agora, nota %s de 5.', new.rating));
    end if;

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
    raise warning 'notify_low_rating_feedback falhou para %: %', new.id, sqlerrm;
  end;

  return new;
end;
$$;
