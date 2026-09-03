-- O canal do aviso passa a preferir o WhatsApp oficial.
--
-- POR QUE ESTA MIGRACAO EXISTE
--
-- Ate aqui `canal_do_aviso` devolvia `telegram` para quem tinha `chat_id` e
-- `openwa` para todos os outros. O `openwa` era o recuo de um numero que foi
-- bloqueado em 31/08 e de um retransmissor que ninguem opera: devolve-lo era
-- enfileirar avisos com destino a lado nenhum.
--
-- A ORDEM PASSA A SER: WhatsApp oficial, depois Telegram, e nunca mais OpenWA.
--
-- O oficial vem primeiro porque e o unico canal onde o dono pode responder "1"
-- e a resposta ir parar ao Google. O Telegram continua a servir quem o ligou e
-- ainda nao migrou — e continua a ser, hoje, o unico canal provado.

-- Um interruptor por dono, e nao global: a migracao para a Cloud API acontece
-- cliente a cliente, e o primeiro a mudar nao pode arrastar os outros.
--
-- O `default false` e deliberado e nao e um esquecimento. Enquanto os segredos
-- da Meta nao estiverem postos, uma linha `meta-cloud` fica na fila sem quem a
-- envie — pior do que hoje. O interruptor liga-se por dono DEPOIS de o canal
-- estar provado. Quem liga isto e quem confirmou que o envio chega.
alter table public.whatsapp_notification_preferences
  add column if not exists whatsapp_oficial_ligado boolean not null default false;

comment on column public.whatsapp_notification_preferences.whatsapp_oficial_ligado is
  'Liga o WhatsApp oficial (Meta Cloud API) para este dono. So deve ser ligado depois de um envio de teste chegar de verdade.';

create or replace function public.canal_do_aviso(p_user_id uuid)
returns text
language sql
stable
security definer
set search_path to 'public'
as $function$
  select case
    -- Primeiro o oficial: e onde o dono ja esta, e o unico com caminho de volta.
    when exists (
      select 1 from public.whatsapp_notification_preferences
       where user_id = p_user_id
         and nullif(btrim(coalesce(recipient_e164, '')), '') is not null
         and whatsapp_oficial_ligado
    ) then 'meta-cloud'
    -- Depois o Telegram, que serve quem o ligou.
    when exists (
      select 1 from public.whatsapp_notification_preferences
       where user_id = p_user_id
         and nullif(btrim(coalesce(telegram_chat_id, '')), '') is not null
    ) then 'telegram'
    -- E o recuo tambem e Telegram, de proposito.
    --
    -- Quem cai aqui nao tem canal nenhum. A escolha nao e entre chegar e nao
    -- chegar — e entre falhar a vista e falhar em silencio. Uma linha
    -- `telegram` sem `chat_id` e recusada pelo enviador e fica com o motivo
    -- escrito na propria linha; uma linha `openwa` ficava para sempre em
    -- `queued`, parecendo estar a caminho. Quem avisa o Marcelo destes donos e
    -- o sinal `sem_canal_de_aviso` do painel, nao esta funcao.
    --
    -- Em 03/09/2026, quando isto foi escrito, ZERO donos estavam neste estado.
    else 'telegram'
  end;
$function$;

-- `create or replace` preserva as permissoes, mas repeti-las deixa um banco
-- criado so a partir das migracoes a acabar no mesmo sitio que a producao.
revoke all on function public.canal_do_aviso(uuid) from public, anon, authenticated;
grant execute on function public.canal_do_aviso(uuid) to service_role;
