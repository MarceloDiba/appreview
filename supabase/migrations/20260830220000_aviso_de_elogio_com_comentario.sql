-- O elogio escrito tambem avisa, e nao pode enterrar a reclamacao.
--
-- POR QUE EXISTE
--
-- Ate aqui o aviso no WhatsApp so saia para nota 3 ou menos. Um cliente que deu
-- cinco estrelas e ainda parou para escrever um elogio nao produzia nada, e o
-- dono nunca ficava sabendo. Essa e exatamente a pessoa a quem agradecer e a
-- quem pedir que publique no Google: ela ja escreveu a avaliacao, so escreveu
-- no lugar privado. Cada uma dessas e uma avaliacao publica se perdendo em
-- silencio.
--
-- A REGRA
--
-- Nota 4 ou 5 avisa somente quando veio texto junto. Cinco estrelas sem uma
-- palavra escrita nao da o que fazer: nao ha o que agradecer em concreto, nao
-- ha frase para o dono aproveitar, e avisar disso treinaria o dono a ignorar o
-- aviso. Texto so de espacos nao conta como texto.
--
-- Nota 1 a 3 continua exatamente como estava, inclusive as palavras.
--
-- POR QUE DUAS FILAS E DUAS JANELAS, E NAO UMA SO
--
-- O limite de um aviso a cada cinco minutos olha o ultimo aviso ja enfileirado.
-- Se elogio e reclamacao dividissem o mesmo `kind`, uma sequencia de elogios
-- empurraria a janela para frente e a reclamacao seguinte ficaria calada ate
-- cinco minutos depois. Isso inverteria a prioridade do produto: o aviso existe
-- para o dono agir enquanto o cliente insatisfeito ainda esta na mesa, e um
-- elogio nunca pode custar esse tempo. Pior: bastaria mandar elogios de graca
-- para calar reclamacoes, o que transformaria a protecao contra abuso em
-- ferramenta de abuso.
--
-- Com `kind` proprio, cada especie olha so a propria janela. Nenhuma atrasa a
-- outra, em nenhuma das duas direcoes.
--
-- POR QUE A JANELA DO ELOGIO E DE QUINZE MINUTOS, E NAO DE CINCO
--
-- Os cinco minutos da reclamacao foram escolhidos por causa do relogio do
-- cliente insatisfeito, que vai embora. O elogio nao tem esse relogio: convidar
-- a pessoa a publicar no Google funciona igual daqui a meia hora. Como o atraso
-- nao custa nada aqui, vale usa-lo para conter o abuso.
--
-- Separar as janelas dobraria o teto de mensagens sob ataque, de doze por hora
-- para vinte e quatro. Com quinze minutos no elogio o teto fica em dezesseis
-- por hora, e a reclamacao segue com os mesmos doze de antes. O colapso vale
-- para os dois: passado o intervalo, a proxima mensagem diz quantos se
-- acumularam desde o aviso anterior, entao o atraso nunca vira informacao
-- perdida.
--
-- O NOME DA FUNCAO
--
-- `notify_low_rating_feedback` deixou de descrever o que a funcao faz no dia em
-- que ela passou a avisar tambem sobre nota alta. Fica
-- `notify_internal_feedback_whatsapp`, e a antiga e removida para nao restar no
-- banco uma copia velha da regra esperando para confundir a proxima leitura.

alter table public.whatsapp_outbox
  drop constraint if exists whatsapp_outbox_kind_check;

alter table public.whatsapp_outbox
  add constraint whatsapp_outbox_kind_check
  check (kind = any (array['test','alert','weekly','reply-reminder','profile-reminder','feedback','feedback-praise']));

create or replace function public.notify_internal_feedback_whatsapp()
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
  comentario text;
  ultimo_aviso timestamptz;
  acumulados integer;
  especie text;
  janela interval;
begin
  -- Sem nota nenhuma nao ha o que avisar. Quem escreveu sem avaliar e um
  -- comentario para o painel, e inventar uma nota aqui seria repetir o defeito
  -- que a migracao `20260830210000_nota_opcional_no_comentario.sql` corrigiu.
  if new.rating is null then
    return new;
  end if;

  comentario := nullif(btrim(coalesce(new.feedback_text, '')), '');

  if new.rating <= 3 then
    especie := 'feedback';
    janela := interval '5 minutes';
  elsif comentario is not null then
    especie := 'feedback-praise';
    janela := interval '15 minutes';
  else
    -- Nota alta sem uma palavra escrita: nada a agradecer, nada a citar.
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

    -- A janela e por especie. Um elogio nunca empurra a janela da reclamacao,
    -- nem o contrario.
    select created_at
      into ultimo_aviso
      from public.whatsapp_outbox
     where user_id = new.user_id and kind = especie
     order by created_at desc
     limit 1;

    -- Dentro da janela: o comentario ja esta gravado e aparece no painel. O
    -- aviso espera, e o proximo dira quantos se acumularam.
    if ultimo_aviso is not null and ultimo_aviso > now() - janela then
      return new;
    end if;

    -- So se acumula em relacao a um aviso anterior. Sem aviso anterior nao ha
    -- nada acumulado: contar desde o infinito faria a primeira mensagem de uma
    -- conta nova somar comentarios historicos, que o dono ja viu ou ja tratou.
    if ultimo_aviso is null then
      acumulados := 1;
    elsif especie = 'feedback' then
      select count(*)
        into acumulados
        from public.internal_feedback
       where user_id = new.user_id
         and rating is not null
         and rating <= 3
         and created_at > ultimo_aviso;
    else
      -- O elogio soma pelo mesmo criterio que o fez avisar: nota alta e texto.
      select count(*)
        into acumulados
        from public.internal_feedback
       where user_id = new.user_id
         and rating is not null
         and rating >= 4
         and nullif(btrim(coalesce(feedback_text, '')), '') is not null
         and created_at > ultimo_aviso;
    end if;

    linhas := array_append(linhas, 'Binno');

    if especie = 'feedback' then
      if acumulados > 1 then
        linhas := array_append(linhas, format(
          '%s comentarios privados desde o ultimo aviso. O mais recente tem nota %s de 5.',
          acumulados, new.rating));
      else
        linhas := array_append(linhas, format('Comentário privado agora, nota %s de 5.', new.rating));
      end if;
    else
      if acumulados > 1 then
        linhas := array_append(linhas, format(
          '%s elogios escritos desde o ultimo aviso. O mais recente tem nota %s de 5.',
          acumulados, new.rating));
      else
        linhas := array_append(linhas, format('Elogio agora, nota %s de 5.', new.rating));
      end if;
    end if;

    if comentario is not null then
      linhas := array_append(linhas, '');
      linhas := array_append(linhas, format('"%s"', comentario));
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

    -- A reclamacao e urgente e o dono ja sabe o que fazer com ela. O elogio e
    -- oportunidade, e sem dizer qual e a acao ele vira so uma notificacao boa.
    if especie = 'feedback-praise' then
      linhas := array_append(linhas, 'Agradeça e convide a publicar no Google.');
    end if;

    linhas := array_append(linhas, 'Ver no painel: https://binno.pro/reviews');

    corpo := array_to_string(linhas, E'\n');

    -- A chave carrega a especie: o mesmo comentario nunca gera as duas, mas a
    -- chave fica legivel na fila e nao colide com a do caminho antigo.
    insert into public.whatsapp_outbox (user_id, kind, recipient_e164, body, idempotency_key)
    values (new.user_id, especie, pref.recipient_e164, corpo, especie || ':' || new.id::text)
    on conflict (user_id, idempotency_key) do nothing;

  exception when others then
    -- Aviso é conveniência; o comentário do cliente não se perde por causa dele.
    raise warning 'notify_internal_feedback_whatsapp falhou para %: %', new.id, sqlerrm;
  end;

  return new;
end;
$$;

drop trigger if exists notify_low_rating_feedback_trigger on public.internal_feedback;
drop function if exists public.notify_low_rating_feedback();

create trigger notify_internal_feedback_whatsapp_trigger
after insert on public.internal_feedback
for each row execute function public.notify_internal_feedback_whatsapp();
