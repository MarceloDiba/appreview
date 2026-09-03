-- A coleta automatica do cadastro passa a ter quem a chame.
--
-- O QUE ESTAVA A ACONTECER, E HA QUANTO TEMPO
--
-- Em 30/08/2026 Marcelo aprovou: "Faca a coleta no apify sempre que cadastrar
-- um novo negocio ate trocarmos pelo google". A fila, o gatilho de banco, o
-- drenador e o interruptor de desligamento foram escritos nesse dia. O
-- AGENDAMENTO nao — e o cabecalho do drenador dizia porque, com todas as
-- letras: "a primeira execucao real e decisao de Marcelo, nao deste codigo".
--
-- A decisao ja existia. O agendamento e que ficou por fazer, e o preco ficou
-- invisivel por dois dias: em 02/09/2026, ao levantar os sinais para a area de
-- administrador, apareceu um pedido de coleta em
-- `apify_auto_collection_queue` com `status = 'queued'` desde 31/08 as 00:07,
-- nunca processado. Nao havia cron, nem gatilho, nem webhook a chamar o
-- drenador — confirmado por `cron.job` e por `pg_trigger`.
--
-- O efeito e o pior possivel para vender: um cliente novo cadastra-se, o
-- pedido entra na fila, e nada acontece. Ele abre o painel e nao ve dado
-- nenhum. As duas coletas que existem sao manuais, feitas pelo painel de
-- configuracao, e e por isso que ninguem tinha tropecado nisto ainda.
--
-- POR QUE DE DOIS EM DOIS MINUTOS
--
-- Porque quem acabou de se cadastrar esta a OLHAR para o ecra. Cinco minutos
-- de painel vazio numa demonstracao a um prospecto e a diferenca entre "isto
-- funciona" e "isto esta partido".
--
-- O que corre a cada dois minutos e uma CONTAGEM na fila. O gasto so acontece
-- quando ha linha para processar, e a fila tem `user_id` como chave primaria:
-- uma coleta por negocio, no total, para sempre. Nao ha laco possivel aqui.
--
-- OS TRES INTERRUPTORES CONTINUAM ONDE ESTAVAM
--
-- Este agendamento nao ganha poder nenhum sobre o gasto. O drenador continua a
-- exigir `APIFY_AUTO_COLLECT_ON_SIGNUP_ENABLED=true`, `APIFY_EXPERIMENTAL_ENABLED=true`
-- e um token do Apify, e sem qualquer um dos tres devolve `processed: 0` sem
-- reivindicar linha nenhuma. Desligar a automacao continua a ser girar um
-- segredo, sem tocar em codigo e sem desagendar nada.
create or replace function public.drenar_coleta_do_cadastro()
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_segredo text;
  v_pendentes integer;
begin
  -- Sem nada na fila, nao ha chamada. Sem esta linha seriam 720 pedidos HTTP
  -- por dia para nao fazer nada — a mesma razao dos outros dois drenadores.
  select count(*) into v_pendentes
    from public.apify_auto_collection_queue
   where status = 'queued';
  if v_pendentes = 0 then
    return;
  end if;

  -- O SEGREDO DO WORKER, E NAO A CHAVE DE SERVICO.
  --
  -- O drenador aceitava so a chave de servico no cabecalho, e era isso que o
  -- tornava impossivel de agendar sem guardar uma copia dessa chave no Vault —
  -- a chave que abre a base de dados inteira, ao alcance de qualquer funcao
  -- `security definer` escrita a seguir. O segredo do worker vale uma coisa
  -- so: "podes correr um drenador".
  select decrypted_secret into v_segredo
    from vault.decrypted_secrets where name = 'binno_worker_secret';
  if v_segredo is null then
    raise warning 'drenar_coleta_do_cadastro: segredo ausente no Vault';
    return;
  end if;

  -- `net.http_post` e nao `extensions.net.http_post`: o pg_net instala-se no
  -- esquema `net`, e o esquema errado faz o `exception when others` abaixo
  -- engolir o erro com o cron a reportar sucesso e a fila congelada.
  perform net.http_post(
    url := 'https://tjbznhwdjyabuacrfqie.supabase.co/functions/v1/apify-auto-collect-on-signup',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-binno-worker-secret', v_segredo
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
exception when others then
  -- A fila da coleta nao tem coluna de erro por linha que sirva aqui: a linha
  -- ainda nem foi reivindicada. O aviso do cron e o unico sitio honesto.
  raise warning 'drenar_coleta_do_cadastro falhou: %', sqlerrm;
end;
$function$;

revoke all on function public.drenar_coleta_do_cadastro() from public, anon, authenticated;

do $$
begin
  perform cron.unschedule('binno-coleta-cadastro');
exception when others then
  null;
end;
$$;

select cron.schedule('binno-coleta-cadastro', '*/2 * * * *', 'select public.drenar_coleta_do_cadastro();');
