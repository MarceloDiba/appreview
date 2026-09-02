-- O convite para avaliar no Google deixa de depender da nota.
--
-- O QUE MUDA. Ate 02/09/2026 o aviso do comentario privado so mandava
-- convidar para o Google quando a especie era 'feedback-praise', ou seja nota
-- 4 ou 5; quem deu 3 ou menos nunca era convidado. Isso e solicitacao
-- seletiva, e a politica do Google proibe: perfis apanhados nisso perdem
-- avaliacoes. Duas analises independentes de concorrentes apontaram o
-- nao-filtrar como a melhor vantagem de venda do Binno, e nao se vende isso
-- enquanto o produto sugere o contrario.
--
-- Onde havia um `if` sobre a especie, a escolher entre "agradeca e convide a
-- publicar no Google" (elogio) e "abra e o Binno escreve um recado" (queixa),
-- passam a ser escritas as DUAS linhas, sempre, na mesma ordem, para qualquer
-- nota: primeiro o que o Binno faz por ele, depois o convite.
--
-- O QUE NAO MUDA. A regra de QUANDO avisar fica intacta: nota nula nao avisa,
-- nota ate 3 avisa e cala-se 5 minutos, nota 4 ou 5 COM texto avisa e cala-se
-- 15 minutos, nota 4 ou 5 sem texto nao avisa. O acumulado desde o ultimo
-- aviso, o colapso, os emojis, o negrito, a citacao, o contacto e o link do
-- painel ficam como estavam. Por isso "sempre" aqui quer dizer "sempre que ha
-- aviso": o convite nao passa a criar avisos onde nao havia, so deixa de
-- faltar nos que ja existiam.
--
-- DE ONDE VEM O CORPO. E o da migracao de 01/09/2026
-- (20260901200000_aviso_com_emoji_e_negrito.sql), palavra por palavra, salvo
-- as sete linhas do `if` acima trocadas por duas. `create or replace function`
-- exige o corpo inteiro, e e por isso que ele aparece aqui repetido; o `diff`
-- entre os dois ficheiros e o unico sitio onde este ramo mexeu no gatilho.
--
-- ESTA MIGRACAO ESTA ESCRITA E POR APLICAR, por decisao do dono do produto.
--
-- Guardada por scripts/check-convite-sem-filtro.mjs (o convite nao esta dentro
-- de um `if` sobre a especie), por scripts/check-aviso-formatado.mjs (o
-- formato do aviso: esse guarda descobre sozinho a ULTIMA migracao que
-- reescreve esta funcao, e desde 02/09/2026 e este ficheiro) e por
-- scripts/check-gatilho-feedback-sql.mjs, que aplica as migracoes e corre o
-- gatilho de verdade num Postgres descartavel.
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
