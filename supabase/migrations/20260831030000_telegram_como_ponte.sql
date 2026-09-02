-- A ponte do Telegram, escrita na receita com um dia de atraso.
--
-- POR QUE ESTE FICHEIRO NASCE COM DATA DE 31/08 E FOI ESCRITO A 02/09
--
-- No dia 31/08/2026 o WhatsApp bloqueou o numero do piloto. O caminho oficial
-- da Meta exige verificacao de empresa, numero novo e modelos aprovados um a
-- um, e leva dias ou semanas. Para o produto nao ficar sem canal nenhum, o
-- Telegram foi montado nessa tarde — e foi montado DIRETO NO SERVIDOR, com
-- pressa, sem passar pelo repositorio.
--
-- O preco disso ficou invisivel por dois dias, porque em producao esta tudo a
-- funcionar. Ele aparece noutro sitio: quem lesse este repositorio nao
-- encontrava a ponte, e quem montasse o Binno do zero a partir destas
-- migracoes ficava com um gatilho a chamar `public.canal_do_aviso`, uma funcao
-- que nao existiria. O proprio `exception when others` do gatilho engoliria o
-- erro, e NENHUM aviso seria enfileirado, em silencio. Foi assim que se
-- descobriu: um guarda tentou correr o gatilho num banco limpo e a fila saiu
-- vazia.
--
-- A data no nome e a data em que estas funcoes passaram a existir no servidor,
-- e nao a data em que este texto foi escrito. Uma migracao ordena-se pelo
-- momento em que a mudanca aconteceu, senao a proxima pessoa a reconstruir o
-- banco recebe as coisas fora de ordem.
--
-- O QUE ESTE FICHEIRO NAO E
--
-- Nao e uma mudanca. Tudo aqui ja existe em producao, palavra por palavra,
-- lido de la com `pg_get_functiondef` em 02/09/2026. E `create or replace` e
-- `if not exists` de propriedade: aplicar isto a producao nao muda nada.

-- O agendamento e a chamada HTTP sao extensoes, e nao vem de origem.
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- ---------------------------------------------------------------------------
-- Onde o Telegram do dono e guardado, e o canal que a fila passa a aceitar.
-- ---------------------------------------------------------------------------
--
-- Estas duas linhas foram descobertas ao tentar correr o guarda contra um banco
-- limpo, em 02/09/2026: nem a coluna nem o valor `telegram` existiam em
-- migracao nenhuma, so em producao. Sao a mesma divida das funcoes abaixo.
--
-- A coluna aceita nulo porque ter Telegram e opcional: quem nao tiver continua
-- a receber pelo caminho antigo, e e isso que `canal_do_aviso` decide.
alter table public.whatsapp_notification_preferences
  add column if not exists telegram_chat_id text;

comment on column public.whatsapp_notification_preferences.telegram_chat_id is
  'O identificador da conversa do dono com o bot. Preenchido quando ele liga o Telegram; nulo quando nao ligou.';

-- O `check` do canal tem de aceitar o valor novo ANTES de alguem o enfileirar,
-- senao o `insert` do gatilho falha e o `exception when others` engole.
alter table public.whatsapp_outbox
  drop constraint if exists whatsapp_outbox_provider_check;

alter table public.whatsapp_outbox
  add constraint whatsapp_outbox_provider_check
  check (provider = any (array['openwa'::text, 'telegram'::text]));

-- ---------------------------------------------------------------------------
-- Por onde sai o aviso deste dono.
-- ---------------------------------------------------------------------------
--
-- O canal e decidido no momento de ENFILEIRAR, e nao no de enviar, porque a
-- fila guarda "isto precisa de sair" e o drenador de cada canal so reserva o
-- que e dele. Ter um `telegram_chat_id` e a prova de que o dono ligou o
-- Telegram; sem ele, o aviso continua a ir pelo caminho antigo.
create or replace function public.canal_do_aviso(p_user_id uuid)
returns text
language sql
stable
security definer
set search_path to 'public'
as $function$
  select case
    when exists (
      select 1 from public.whatsapp_notification_preferences
       where user_id = p_user_id
         and nullif(btrim(coalesce(telegram_chat_id, '')), '') is not null
    ) then 'telegram'
    else 'openwa'
  end;
$function$;

-- ---------------------------------------------------------------------------
-- Cada drenador reserva SO o proprio canal.
-- ---------------------------------------------------------------------------
--
-- Sem o `p_provider`, o retransmissor do OpenWA que estava vivo roubou uma
-- mensagem destinada ao Telegram: os dois liam a mesma fila. `for update skip
-- locked` deixa os dois correr ao mesmo tempo sem se pisarem, e o tecto de 25
-- impede que uma corrida leve a fila inteira e a prenda em `sending` se
-- rebentar a meio.
create or replace function public.claim_whatsapp_outbox_por_canal(p_provider text, batch_size integer default 10)
returns setof public.whatsapp_outbox
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  return query
  with selected as (
    select id
    from public.whatsapp_outbox
    where status = 'queued'
      and provider = p_provider
      and scheduled_at <= now()
    order by scheduled_at asc, created_at asc
    for update skip locked
    limit greatest(1, least(batch_size, 25))
  )
  update public.whatsapp_outbox outbox
  set status = 'sending', claimed_at = now(), attempts = outbox.attempts + 1
  from selected
  where outbox.id = selected.id
  returning outbox.*;
end;
$function$;

-- ---------------------------------------------------------------------------
-- O empurrao, a cada minuto.
-- ---------------------------------------------------------------------------
--
-- Ele so chama a funcao de envio quando ha alguma coisa na fila: sem isso,
-- seriam 1440 chamadas HTTP por dia para nao fazer nada.
--
-- O segredo vem do Vault e nao de uma constante, porque este ficheiro e
-- publico. Sem segredo, o motivo fica escrito na linha que nao saiu, em vez de
-- a fila parar sem explicacao.
--
-- `net.http_post` e nao `extensions.net.http_post`: o pg_net instala-se no
-- esquema `net`. Escrever o esquema errado fazia o `exception when others`
-- abaixo engolir o erro, e o cron reportava sucesso a cada minuto com a fila
-- congelada. Aconteceu em 31/08 e custou uma tarde.
create or replace function public.drenar_avisos_do_telegram()
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_segredo text;
  v_pendentes integer;
begin
  select count(*) into v_pendentes
    from public.whatsapp_outbox
   where status = 'queued' and provider = 'telegram' and scheduled_at <= now();
  if v_pendentes = 0 then
    return;
  end if;

  select decrypted_secret into v_segredo
    from vault.decrypted_secrets where name = 'binno_worker_secret';
  if v_segredo is null then
    update public.whatsapp_outbox
       set last_error_code = 'SEM_SEGREDO_NO_VAULT', updated_at = now()
     where status = 'queued' and provider = 'telegram';
    return;
  end if;

  perform net.http_post(
    url := 'https://tjbznhwdjyabuacrfqie.supabase.co/functions/v1/telegram-dispatch',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-binno-worker-secret', v_segredo
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 20000
  );
exception when others then
  -- Continua sem derrubar quem chamou, mas deixa de ser invisivel: o motivo
  -- fica na linha que nao saiu, onde quem for procurar vai olhar.
  update public.whatsapp_outbox
     set last_error_code = left('DRENO: ' || sqlerrm, 120), updated_at = now()
   where status = 'queued' and provider = 'telegram';
end;
$function$;

-- O agendamento. `unschedule` antes de agendar para o ficheiro poder correr
-- duas vezes sem criar dois trabalhos iguais.
do $$
begin
  perform cron.unschedule('binno-telegram');
exception when others then
  null;
end;
$$;

select cron.schedule('binno-telegram', '* * * * *', 'select public.drenar_avisos_do_telegram();');
