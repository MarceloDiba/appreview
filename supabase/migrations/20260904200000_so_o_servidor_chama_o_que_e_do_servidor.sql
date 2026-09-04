-- Funcoes internas deixam de ser chamaveis de fora.
--
-- O QUE ESTAVA ABERTO
--
-- Toda funcao em `public` nasce com `EXECUTE` para `PUBLIC`, e o PostgREST
-- expoe cada uma delas em `/rest/v1/rpc/<nome>`. Onze funcoes que existem so
-- para gatilhos e para o cron estavam a ser servidas na API publica — algumas
-- sem sequer exigir sessao.
--
-- A pior era `queue_apify_auto_collection_if_ready(p_user_id uuid)`: aceita um
-- `user_id` QUALQUER e podia ser chamada SEM ESTAR AUTENTICADO. Nao vaza dado
-- nenhum, mas enfileira uma coleta paga da Apify em nome de qualquer conta.
-- Quem descobrisse o endereco enchia a fila e a factura.
--
-- Nenhuma destas onze tem um unico chamador no codigo do produto (conferido em
-- `src/`, `supabase/functions/` e `services/`). Sao chamadas por gatilhos e
-- pelo cron, que correm por dentro do banco.
--
-- REVOGAR NAO PARA OS GATILHOS. O PostgreSQL verifica `EXECUTE` sobre a funcao
-- de gatilho quando o gatilho e CRIADO, e nao a cada disparo. Provado num
-- Postgres de verdade antes desta migracao: com `EXECUTE` revogado de `PUBLIC`,
-- a chamada directa devolve "permissao negada" e o gatilho continua a disparar
-- normalmente para o mesmo utilizador.
--
-- FICAM DE FORA, de proposito:
--   `get_public_qr_business` — e a pagina publica do QR code. Tem de ser anon.
--   `saude_das_contas`       — o painel de administracao chama-a, e ela propria
--                              recusa quem nao esta em `admins` com 42501.

do $$
declare
  v_assinatura text;
  v_fechadas integer := 0;
begin
  for v_assinatura in
    select p.oid::regprocedure::text
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in (
         'queue_apify_auto_collection_if_ready',
         'trg_apify_auto_collection_from_profile',
         'trg_apify_auto_collection_from_platform_link',
         'dispensar_rascunho_superado',
         'notify_internal_feedback_whatsapp',
         'handle_new_user_profile',
         'chamar_oferta_de_rascunhos',
         'limpar_batidas_antigas',
         'aplicar_fuso_do_pais',
         'attribute_review_funnel_event',
         'calcular_saude_das_contas'
       )
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', v_assinatura);
    execute format('grant execute on function %s to postgres, service_role', v_assinatura);
    v_fechadas := v_fechadas + 1;
  end loop;

  -- Uma migracao que nao fechasse nada correria verde e nao diria nada. Se o
  -- nome de alguma destas funcoes mudar, isto tem de gritar.
  if v_fechadas < 10 then
    raise exception 'esperava fechar pelo menos 10 funcoes internas, fechei %', v_fechadas;
  end if;
  raise notice 'Funcoes internas fechadas a chamada externa: %', v_fechadas;
end $$;
