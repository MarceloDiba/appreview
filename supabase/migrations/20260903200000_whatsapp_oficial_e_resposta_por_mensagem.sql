-- O WhatsApp oficial da Meta, e responder a avaliacao pela propria mensagem.
--
-- POR QUE AGORA
--
-- Marcelo quer poder afirmar, na pagina de vendas: "Responda as avaliacoes do
-- Google Maps direto do seu WhatsApp em 1 clique". Hoje a frase e falsa em tres
-- pontos, e este ficheiro trata dos dois primeiros:
--
--   1. Os avisos saem pelo TELEGRAM, nao pelo WhatsApp. O numero do piloto foi
--      bloqueado em 31/08 por padrao de envio automatizado, e o Telegram foi a
--      ponte. Agora existe um numero registado na Cloud API da Meta.
--   2. O Binno so ENVIA. Nao ha caminho de volta: nenhum webhook, nenhuma
--      tabela a guardar o que espera confirmacao. Responder "1" nao tem onde
--      aterrar.
--
-- O terceiro ponto — publicar no Google — ja esta escrito em
-- `sync-google-business-profile`, mas nunca correu uma vez. Nao se afirma aqui.
--
-- A DIFERENCA QUE MUDA O DESENHO: JANELA DE 24 HORAS
--
-- O OpenWA mandava texto livre para quem quisesse, quando quisesse — e foi por
-- isso que o numero foi bloqueado. A Cloud API nao permite: uma mensagem que
-- ABRE conversa exige um modelo aprovado pela Meta, com variaveis fixas. Texto
-- livre so dentro de 24 horas depois de a pessoa ter escrito.
--
-- Isso obriga a saber, por dono, quando ele escreveu pela ultima vez. Sem essa
-- data, cada aviso teria de ser um modelo — e o rascunho da resposta, que e
-- texto que muda a cada avaliacao, nao cabe num modelo.

-- ---------------------------------------------------------------------------
-- 1. O canal novo na fila.
-- ---------------------------------------------------------------------------
alter table public.whatsapp_outbox
  drop constraint if exists whatsapp_outbox_provider_check;

alter table public.whatsapp_outbox
  add constraint whatsapp_outbox_provider_check
  check (provider = any (array['openwa'::text, 'telegram'::text, 'email'::text, 'meta-cloud'::text]));

-- O corpo de um modelo nao e texto: e o nome do modelo mais as variaveis. Uma
-- coluna a parte porque o corpo em texto continua a ser o que o painel mostra
-- no historico, e o que serve os outros canais.
alter table public.whatsapp_outbox
  add column if not exists template_name text;

alter table public.whatsapp_outbox
  add column if not exists template_variables jsonb;

comment on column public.whatsapp_outbox.template_name is
  'O modelo aprovado pela Meta, quando a mensagem abre conversa fora da janela de 24h. Nulo quando é texto livre.';

-- ---------------------------------------------------------------------------
-- 2. Quando o dono escreveu pela ultima vez.
-- ---------------------------------------------------------------------------
--
-- E o que decide entre texto livre e modelo. Sem isto, o Binno teria de assumir
-- o pior caso sempre e mandar modelo para tudo — e o rascunho de uma resposta,
-- que muda a cada avaliacao, nao cabe num modelo de variaveis fixas.
alter table public.whatsapp_notification_preferences
  add column if not exists ultima_mensagem_recebida_em timestamptz;

comment on column public.whatsapp_notification_preferences.ultima_mensagem_recebida_em is
  'Quando o dono escreveu para o Binno pela última vez. Dentro de 24h a Meta permite texto livre; fora, só modelo aprovado.';

create or replace function public.janela_de_texto_livre_aberta(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select coalesce(
    (select ultima_mensagem_recebida_em > now() - interval '24 hours'
       from public.whatsapp_notification_preferences
      where user_id = p_user_id),
    false
  );
$function$;

revoke all on function public.janela_de_texto_livre_aberta(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. O que espera um "1".
-- ---------------------------------------------------------------------------
--
-- Quando o Binno avisa de uma avaliacao e oferece um rascunho, ele precisa de
-- se lembrar do que ofereceu — senao um "1" que chega dez minutos depois nao
-- significa nada.
--
-- POR QUE UMA TABELA E NAO UMA COLUNA NA FILA DE ENVIO: a fila e sobre
-- ENTREGAR uma mensagem, e apaga-se o rasto quando entrega. Isto e sobre uma
-- decisao por tomar, que sobrevive a mensagem, tem prazo proprio e precisa de
-- registo de quem confirmou e quando.
--
-- PRAZO DE 24 HORAS, e nao "para sempre": um "1" respondido tres dias depois
-- quase de certo e sobre outra coisa, e publicar um rascunho velho no perfil
-- publico de alguem e um estrago que nao se desfaz.
create table if not exists public.respostas_a_confirmar (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- A avaliacao no formato do Google, para `sync-google-business-profile` a
  -- encontrar sem traducao pelo meio.
  review_id uuid not null references public.google_business_reviews(id) on delete cascade,
  rascunho text not null check (char_length(rascunho) between 1 and 4096),
  enviado_em timestamptz not null default now(),
  expira_em timestamptz not null default (now() + interval '24 hours'),
  confirmado_em timestamptz,
  publicado_em timestamptz,
  recusado_em timestamptz,
  erro text
);

-- So pode haver UMA a espera por dono. Duas ao mesmo tempo tornam o "1"
-- ambiguo, e a forma de resolver a ambiguidade seria pedir ao dono que
-- escrevesse mais — que e exactamente o contrario de "1 clique".
create unique index if not exists respostas_a_confirmar_uma_por_dono
  on public.respostas_a_confirmar (user_id)
  where confirmado_em is null and recusado_em is null;

create index if not exists respostas_a_confirmar_por_dono_idx
  on public.respostas_a_confirmar (user_id, enviado_em desc);

alter table public.respostas_a_confirmar enable row level security;

-- O dono LE as suas, para o painel poder mostrar "esperando a sua confirmacao
-- no WhatsApp". Escrever e so do servidor: uma confirmacao vinda do navegador
-- nao provaria que a pessoa respondeu no WhatsApp.
drop policy if exists "respostas_a_confirmar_owner_select" on public.respostas_a_confirmar;
create policy "respostas_a_confirmar_owner_select"
  on public.respostas_a_confirmar for select
  using (auth.uid() = user_id);

revoke insert, update, delete on table public.respostas_a_confirmar from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. Quem pega a resposta que o dono confirmou.
-- ---------------------------------------------------------------------------
--
-- O webhook da Meta responde em milissegundos ou a Meta considera a entrega
-- falhada e volta a tentar. Publicar no Google demora mais do que isso. Entao o
-- webhook so MARCA a confirmacao, e quem publica e um drenador — o mesmo
-- desenho da fila de envio, pela mesma razao.
create or replace function public.confirmar_resposta_do_dono(p_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_id uuid;
begin
  update public.respostas_a_confirmar
     set confirmado_em = now()
   where id = (
     select id from public.respostas_a_confirmar
      where user_id = p_user_id
        and confirmado_em is null
        and recusado_em is null
        and expira_em > now()
      order by enviado_em desc
      limit 1
   )
  returning id into v_id;
  return v_id;
end;
$function$;

revoke all on function public.confirmar_resposta_do_dono(uuid) from public, anon, authenticated;

-- O prazo tambem se aplica sozinho: sem isto, uma resposta que expirou fica na
-- tabela a bloquear o indice unico, e o dono nunca mais recebe um rascunho novo.
create or replace function public.recusar_respostas_expiradas()
returns void
language sql
security definer
set search_path to 'public'
as $function$
  update public.respostas_a_confirmar
     set recusado_em = now(), erro = 'prazo de 24 horas esgotado'
   where confirmado_em is null and recusado_em is null and expira_em <= now();
$function$;

revoke all on function public.recusar_respostas_expiradas() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. Os dois empurroes.
-- ---------------------------------------------------------------------------
--
-- O do WhatsApp corre a cada minuto, como o do Telegram, porque leva AVISOS: um
-- comentario de uma estrela tem de chegar enquanto o dono ainda pode agir.
create or replace function public.drenar_whatsapp_oficial()
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
   where status = 'queued' and provider = 'meta-cloud' and scheduled_at <= now();
  if v_pendentes = 0 then
    return;
  end if;

  select decrypted_secret into v_segredo
    from vault.decrypted_secrets where name = 'binno_worker_secret';
  if v_segredo is null then
    update public.whatsapp_outbox
       set last_error_code = 'SEM_SEGREDO_NO_VAULT', updated_at = now()
     where status = 'queued' and provider = 'meta-cloud';
    return;
  end if;

  perform net.http_post(
    url := 'https://tjbznhwdjyabuacrfqie.supabase.co/functions/v1/whatsapp-cloud-dispatch',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-binno-worker-secret', v_segredo),
    body := '{}'::jsonb,
    timeout_milliseconds := 20000
  );
exception when others then
  update public.whatsapp_outbox
     set last_error_code = left('DRENO: ' || sqlerrm, 120), updated_at = now()
   where status = 'queued' and provider = 'meta-cloud';
end;
$function$;

revoke all on function public.drenar_whatsapp_oficial() from public, anon, authenticated;

-- O da publicacao tambem corre a cada minuto: o dono acabou de responder "1" e
-- esta a olhar para o telemovel. Um minuto e a diferenca entre "publicou" e
-- "sera que funcionou?".
--
-- Ele tambem trata dos prazos: sem isso, uma resposta expirada fica a bloquear
-- o indice unico e o dono nunca mais recebe um rascunho novo.
create or replace function public.drenar_respostas_confirmadas()
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_segredo text;
  v_pendentes integer;
begin
  perform public.recusar_respostas_expiradas();

  select count(*) into v_pendentes
    from public.respostas_a_confirmar
   where confirmado_em is not null and publicado_em is null and recusado_em is null;
  if v_pendentes = 0 then
    return;
  end if;

  select decrypted_secret into v_segredo
    from vault.decrypted_secrets where name = 'binno_worker_secret';
  if v_segredo is null then
    raise warning 'drenar_respostas_confirmadas: segredo ausente no Vault';
    return;
  end if;

  perform net.http_post(
    url := 'https://tjbznhwdjyabuacrfqie.supabase.co/functions/v1/publicar-respostas-confirmadas',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-binno-worker-secret', v_segredo),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
exception when others then
  raise warning 'drenar_respostas_confirmadas falhou: %', sqlerrm;
end;
$function$;

revoke all on function public.drenar_respostas_confirmadas() from public, anon, authenticated;

do $$
begin
  perform cron.unschedule('binno-whatsapp-oficial');
exception when others then
  null;
end;
$$;
select cron.schedule('binno-whatsapp-oficial', '* * * * *', 'select public.drenar_whatsapp_oficial();');

do $$
begin
  perform cron.unschedule('binno-publicar-respostas');
exception when others then
  null;
end;
$$;
select cron.schedule('binno-publicar-respostas', '* * * * *', 'select public.drenar_respostas_confirmadas();');
