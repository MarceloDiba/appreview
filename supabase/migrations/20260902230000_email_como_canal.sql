-- O e-mail entra como canal, ao lado do Telegram e do OpenWA.
--
-- POR QUE O E-MAIL, E POR QUE AGORA
--
-- Marcelo, em 02/09/2026, perguntou se deixar o cliente escolher o canal
-- (WhatsApp, Telegram, SMS, e-mail) compensava pela economia. A economia e
-- real e pequena: cerca de 35 mensagens por mes por cliente, o que da algo como
-- R$ 2 a R$ 8 no WhatsApp, ou 1 a 5% de uma mensalidade de R$ 150. Nao e ai que
-- esta o dinheiro.
--
-- As razoes que valem sao outras tres:
--
--   O e-mail FUNCIONA JA. O WhatsApp oficial esta por aprovar e o caminho
--   actual viola os termos da Meta. O e-mail e o unico canal que serve qualquer
--   cliente hoje, sem esperar por ninguem.
--
--   E o formato certo para um RELATORIO: longo, com as barras das notas, os
--   temas e o historico. No WhatsApp isso vira um bloco de texto.
--
--   Aviso urgente e relatorio semanal nao sao a mesma coisa. Um comentario de
--   uma estrela tem de chegar em minutos ao canal que o dono abre; o resumo de
--   segunda pode ser lido ao cafe.
--
-- O SMS ficou de fora de proposito: no Brasil custa mais que uma mensagem de
-- utilidade do WhatsApp e cabe em 160 caracteres sem formatacao. Paga-se mais
-- para entregar pior.
--
-- POR QUE A MESMA FILA, E NAO UM CAMINHO PROPRIO
--
-- A fila existe para dar tentativa repetida, chave de idempotencia,
-- proveniencia, estado de entrega e um drenador por canal. O e-mail merece as
-- cinco coisas. Um caminho proprio duplicaria tudo isso e as duas metades iam a
-- deriva uma da outra na primeira vez que alguem mexesse numa.
--
-- AS TRES MUDANCAS SAO ADITIVAS OU PERMISSIVAS, DE PROPOSITO
--
-- Esta tabela esta viva e a funcionar. Uma restricao mal escrita aqui faria os
-- avisos do dono pararem em silencio, que e exactamente o que nao pode
-- acontecer. Por isso: uma coluna nova que aceita nulo, uma obrigacao que sai,
-- e um valor novo numa lista. Nenhuma linha existente deixa de passar, e
-- nenhuma insercao que hoje funciona passa a falhar.

-- 1. Onde entregar, quando o canal for e-mail.
alter table public.whatsapp_outbox
  add column if not exists recipient_email text;

comment on column public.whatsapp_outbox.recipient_email is
  'O endereço de entrega quando `provider` é `email`. Nulo nos outros canais, que entregam por `recipient_e164`.';

-- 2. O telefone deixa de ser obrigatorio, porque uma linha de e-mail nao tem.
alter table public.whatsapp_outbox
  alter column recipient_e164 drop not null;

-- 3. O canal novo entra na lista. O `check` do repositorio dizia
-- ('openwa', 'meta-cloud') e o de producao ja dizia ('openwa', 'telegram'):
-- esta linha junta os tres que existem de verdade.
alter table public.whatsapp_outbox
  drop constraint if exists whatsapp_outbox_provider_check;

alter table public.whatsapp_outbox
  add constraint whatsapp_outbox_provider_check
  check (provider = any (array['openwa'::text, 'telegram'::text, 'email'::text]));

-- 4. Cada canal exige o seu destino, e so o seu.
--
-- Sem isto, uma linha de e-mail sem endereco ficaria na fila para sempre, e uma
-- linha de Telegram sem telefone passaria a ser aceite. A forma e um `case`
-- porque a regra e diferente por canal, e nao uma condicao unica.
--
-- Todas as linhas que ja existem tem `recipient_e164` e canal `openwa` ou
-- `telegram`, logo passam sem excepcao.
alter table public.whatsapp_outbox
  drop constraint if exists whatsapp_outbox_destino_do_canal;

alter table public.whatsapp_outbox
  add constraint whatsapp_outbox_destino_do_canal
  check (
    case
      when provider = 'email' then recipient_email is not null and recipient_email <> ''
      else recipient_e164 is not null
    end
  );

-- 5. O corpo em HTML, que so o e-mail usa.
--
-- O corpo em texto continua a ser escrito para TODOS os canais e continua a ser
-- o registo que o painel mostra no historico de entregas. O HTML e a mesma
-- coisa noutra forma, e nasce do mesmo compositor, no mesmo instante: e o que
-- impede a nota do WhatsApp e a do e-mail divergirem sem ninguem reparar.
--
-- Aceita nulo porque uma linha de WhatsApp ou de Telegram nao tem HTML nenhum,
-- e o `check` de tamanho fica no corpo de texto, onde ja estava: o HTML nao
-- cabe em 4096 e nao ha razao para o obrigar a caber.
alter table public.whatsapp_outbox
  add column if not exists body_html text;

comment on column public.whatsapp_outbox.body_html is
  'A mesma mensagem em HTML, escrita ao lado do corpo em texto pelo mesmo compositor. Preenchida só quando `provider` é `email`.';

-- 6. O assunto, que so o e-mail tem.
--
-- Ele nasce no mesmo compositor que o corpo, e nao no drenador, porque o
-- assunto e conteudo: e a linha que decide se o dono abre. Recompo-lo na hora
-- do envio obrigaria o drenador a saber ler o retrato da coleta, e havia duas
-- versoes do mesmo texto a envelhecer em separado.
alter table public.whatsapp_outbox
  add column if not exists subject text;

comment on column public.whatsapp_outbox.subject is
  'O assunto do e-mail, escrito pelo mesmo compositor que o corpo. Nulo nos canais que não têm assunto.';

-- 7. O drenador do e-mail encontra o que e dele pelo mesmo indice dos outros.
create index if not exists whatsapp_outbox_email_idx
  on public.whatsapp_outbox (provider, status, scheduled_at)
  where provider = 'email';

-- ---------------------------------------------------------------------------
-- Onde o dono diz que quer o relatorio por e-mail.
-- ---------------------------------------------------------------------------
--
-- `report_email` aceita nulo: nulo significa "usar o e-mail da conta", que e o
-- comportamento da primeira versao. Uma tela para o mudar entra quando houver um
-- segundo cliente a pedi-la; ate la, escrever uma tela seria construir um
-- formulario em vez de um relatorio.
--
-- `weekly_channel` diz por onde o RESUMO sai, e so ele. Os avisos urgentes
-- continuam a seguir `canal_do_aviso`, porque um comentario de uma estrela tem
-- de chegar ao canal que o dono abre em minutos, e nao a uma caixa de entrada.
alter table public.whatsapp_notification_preferences
  add column if not exists report_email text;

--
-- O PADRAO E `email`, E ISSO E DELIBERADO.
--
-- Parece agressivo mudar por baixo de quem ja usa, ate se olhar para o que
-- acontece hoje: o resumo semanal e enfileirado sem canal nenhum, logo cai no
-- `openwa` por omissao, e o numero do piloto esta bloqueado desde 31/08. Ou
-- seja, o resumo por mensagem nao chega a ninguem neste momento. Manter
-- `mensagem` como padrao seria manter toda a gente num canal morto para nao
-- parecer que se mudou alguma coisa.
--
-- Quem quiser o resumo no Telegram poe `mensagem` no painel, e ai ele sai pelo
-- canal que `canal_do_aviso` decidir — que e a segunda correccao deste ramo: o
-- resumo passa a respeitar o canal do dono, em vez de assumir `openwa`.
alter table public.whatsapp_notification_preferences
  add column if not exists weekly_channel text not null default 'email'
  check (weekly_channel in ('mensagem', 'email'));

comment on column public.whatsapp_notification_preferences.weekly_channel is
  'Por onde sai o RESUMO semanal: `mensagem` segue canal_do_aviso (Telegram ou OpenWA), `email` vai para report_email ou para o e-mail da conta. Os avisos urgentes não seguem esta coluna.';


-- ---------------------------------------------------------------------------
-- O empurrao do e-mail, a cada cinco minutos.
-- ---------------------------------------------------------------------------
--
-- POR QUE CINCO E NAO UM
--
-- O drenador do Telegram corre a cada minuto porque o que ele leva sao AVISOS:
-- um comentario de uma estrela tem de chegar enquanto o dono ainda pode fazer
-- alguma coisa. O que sai por e-mail e o RESUMO da semana, que ele le ao cafe
-- de segunda. Quatro minutos de atraso num relatorio semanal nao existem, e um
-- minuto custaria 1440 execucoes por dia para nao fazer nada.
--
-- Tal como o do Telegram, esta funcao so chama a funcao de envio quando ha
-- alguma coisa na fila, e escreve o motivo na propria linha quando nao pode
-- chamar. Uma fila parada sem explicacao foi o que custou uma tarde em 31/08.
create or replace function public.drenar_relatorios_por_email()
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
   where status = 'queued' and provider = 'email' and scheduled_at <= now();
  if v_pendentes = 0 then
    return;
  end if;

  select decrypted_secret into v_segredo
    from vault.decrypted_secrets where name = 'binno_worker_secret';
  if v_segredo is null then
    update public.whatsapp_outbox
       set last_error_code = 'SEM_SEGREDO_NO_VAULT', updated_at = now()
     where status = 'queued' and provider = 'email';
    return;
  end if;

  -- `net.http_post` e nao `extensions.net.http_post`: o pg_net instala-se no
  -- esquema `net`. Escrever o esquema errado faz o `exception when others`
  -- abaixo engolir o erro, e o cron reporta sucesso com a fila congelada.
  perform net.http_post(
    url := 'https://tjbznhwdjyabuacrfqie.supabase.co/functions/v1/email-dispatch',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-binno-worker-secret', v_segredo
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 20000
  );
exception when others then
  update public.whatsapp_outbox
     set last_error_code = left('DRENO: ' || sqlerrm, 120), updated_at = now()
   where status = 'queued' and provider = 'email';
end;
$function$;

do $$
begin
  perform cron.unschedule('binno-email');
exception when others then
  null;
end;
$$;

select cron.schedule('binno-email', '*/5 * * * *', 'select public.drenar_relatorios_por_email();');

-- ---------------------------------------------------------------------------
-- E O RESUMO SEMANAL PASSA A TER QUEM O CHAME.
-- ---------------------------------------------------------------------------
--
-- ISTO NAO ESTAVA PLANEADO, E FOI A PRODUCAO QUE O DISSE.
--
-- Ao conferir o estado real da fila em 02/09/2026, antes de aplicar esta
-- migracao, apareceram tres factos que desmentiam o que se assumia:
--
--   1. `cron.job` tem UM trabalho, `binno-telegram`. Nao ha nenhum a chamar
--      `materialize-whatsapp-notifications`.
--   2. So existe UMA linha `weekly` enfileirada pelo materializador,
--      `weekly:2026-08-31`, entregue a 31/08 as 08:00. Nenhuma depois.
--   3. As duas linhas `weekly` do dia 01/09 sao ensaios manuais — leem-se pela
--      chave, `ensaio-formato-resumo-2026-09-01` e `ensaio-demonstracao-...`.
--
-- Ou seja: o resumo semanal nao estava a falhar. Nao estava a ACONTECER. O
-- codigo que o monta existe, esta implantado e nunca e chamado, e isso e pior
-- do que uma falha, porque uma falha deixa uma linha `failed` que alguem pode
-- ver. Isto nao deixava nada.
--
-- Sem estas linhas, tudo o que este ficheiro faz — o canal de e-mail, o
-- compositor, o drenador — ficaria a espera de um chamador que nao existe.
--
-- POR QUE DE 15 EM 15 MINUTOS
--
-- O materializador nao decide se e hora: ele COMPARA. Para cada dono le o fuso
-- horario, o dia da semana escolhido e a hora escolhida, e so enfileira depois
-- de a hora local ter passado. A chave `weekly:<data local>` garante uma linha
-- por dia por dono, aconteca a chamada uma vez ou noventa e seis.
--
-- Logo o intervalo nao decide SE o resumo sai, decide com que atraso: de hora a
-- hora, um resumo pedido para as 09:00 podia sair as 09:59. Quinze minutos poem
-- o pior caso em catorze, que e o que se pode chamar "de manha".
create or replace function public.chamar_resumo_semanal()
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_segredo text;
begin
  select decrypted_secret into v_segredo
    from vault.decrypted_secrets where name = 'binno_worker_secret';
  if v_segredo is null then
    -- Sem segredo nao ha chamada possivel. Fica dito no log do proprio cron, que
    -- e o unico sitio onde ha o que escrever: aqui ainda nao existe linha
    -- nenhuma na fila para carregar o motivo.
    raise warning 'chamar_resumo_semanal: segredo ausente no Vault';
    return;
  end if;

  perform net.http_post(
    url := 'https://tjbznhwdjyabuacrfqie.supabase.co/functions/v1/materialize-whatsapp-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-binno-worker-secret', v_segredo
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 20000
  );
exception when others then
  raise warning 'chamar_resumo_semanal falhou: %', sqlerrm;
end;
$function$;

do $$
begin
  perform cron.unschedule('binno-resumo-semanal');
exception when others then
  null;
end;
$$;

select cron.schedule('binno-resumo-semanal', '*/15 * * * *', 'select public.chamar_resumo_semanal();');

-- ---------------------------------------------------------------------------
-- QUEM PODE CHAMAR A RESERVA DA FILA.
-- ---------------------------------------------------------------------------
--
-- Encontrado na auditoria deste ramo, em 02/09/2026, e e a MESMA divida da
-- ponte do Telegram vista de outro angulo.
--
-- `claim_whatsapp_outbox_por_canal` e `security definer`: corre com os poderes
-- do dono da base e devolve LINHAS INTEIRAS da fila. No Postgres, `execute`
-- numa funcao nova e concedido a PUBLIC por omissao, e o PostgREST expoe o
-- esquema `public` a `anon` com a chave publicavel. Uma funcao assim, sem
-- revoke, seria chamavel do navegador por qualquer pessoa:
--
--   supabase.rpc('claim_whatsapp_outbox_por_canal', { p_provider: 'email' })
--
-- e devolveria o endereco de e-mail e o corpo do relatorio de TODOS os donos —
-- e ainda deixaria as linhas presas em `sending`, ou seja, apagaria os avisos
-- deles pelo caminho. A `claim_whatsapp_outbox` original ja tinha estas duas
-- linhas em `20260821193000`; a versao por canal, escrita direto no servidor em
-- 31/08, nasceu sem elas no repositorio.
--
-- EM PRODUCAO O BURACO NAO EXISTE: lido em 02/09/2026, o ACL da funcao e
-- `postgres=X | service_role=X`, sem PUBLIC. Quem a criou no servidor revogou.
-- O que faltava era isso estar ESCRITO — quem reconstruisse o Binno a partir
-- destas migracoes ficava com a fila aberta ao navegador, e nenhum guarda dizia
-- nada. Aplicar estas linhas a producao nao muda nada; e para o proximo banco.
revoke all on function public.claim_whatsapp_outbox_por_canal(text, integer) from public, anon, authenticated;
grant execute on function public.claim_whatsapp_outbox_por_canal(text, integer) to service_role;

-- Os dois drenadores sao chamados pelo `cron`, que corre como `postgres`.
-- Ninguem mais precisa deles, e ambos disparam pedidos HTTP com o segredo do
-- worker: deixa-los abertos e dar a qualquer pessoa um botao de esvaziar a fila.
revoke all on function public.drenar_relatorios_por_email() from public, anon, authenticated;
revoke all on function public.chamar_resumo_semanal() from public, anon, authenticated;

-- `canal_do_aviso` continua com `execute` a `anon` desde 31/08. Ela nao
-- devolve dado nenhum de terceiros — so 'telegram' ou 'openwa' para um id que
-- quem pergunta ja teria de conhecer — mas tambem nao ha um so sitio no painel
-- que a chame: quem a usa e o gatilho, que corre como `definer`, e o
-- materializador, que corre com a chave de servico. O que nao e preciso, fecha.
revoke all on function public.canal_do_aviso(uuid) from public, anon, authenticated;
grant execute on function public.canal_do_aviso(uuid) to service_role;
