-- O aviso do administrador deixa de falar em nomes de coluna.
--
-- A primeira versao mandava a lista de sinais crua: "mensagem_falhou". A pagina
-- traduz cada sinal numa frase e num passo, mas o aviso do Telegram nao — e o
-- aviso e o que chega ao telemovel de alguem que nao e tecnico, as oito da
-- manha. Ler `fila_presa_no_envio` no telemovel nao diz nada a ninguem.
--
-- POR QUE OS ROTULOS EXISTEM NOS DOIS SITIOS
--
-- Ficam aqui em SQL e em `src/lib/saudeDasContas.ts` em TypeScript, porque o
-- aviso e composto no banco e a pagina no navegador. Duas listas da mesma coisa
-- divergem, e a divergencia e invisivel — o Marcelo lia uma frase no telemovel
-- e outra na pagina para o mesmo sinal.
--
-- O que impede isso e uma assercao em `check-area-de-administrador.mjs` que
-- extrai as duas listas e exige que sejam IGUAIS, chave a chave e texto a
-- texto. Acrescentar um sinal num sitio e esquecer o outro fica vermelho.
create or replace function public.rotulo_do_sinal(p_sinal text)
returns text
language sql
immutable
as $function$
  select case p_sinal
    when 'coleta_parada_na_fila' then 'Coleta pedida e parada há mais de 30 minutos'
    when 'nunca_coletou' then 'Cadastrou e nunca coletou'
    when 'mensagem_falhou' then 'Mensagem falhou nas últimas 72 horas'
    when 'fila_presa_no_envio' then 'Mensagem presa no meio do envio'
    when 'fila_parada_na_saida' then 'Mensagem parada na fila há mais de 30 minutos'
    when 'sem_canal_de_aviso' then 'Consentiu receber avisos, mas não tem canal'
    when 'resumo_nao_saiu' then 'Resumo semanal não saiu'
    when 'coleta_antiga' then 'Última coleta há mais de 30 dias'
    -- Um sinal novo que ninguem tenha traduzido sai com o nome cru em vez de
    -- desaparecer: uma linha feia e melhor do que um aviso que esconde um
    -- problema.
    else p_sinal
  end;
$function$;

create or replace function public.avisar_administrador()
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_assinatura text;
  v_ultima text;
  v_travadas integer;
  v_corpo text;
  v_linhas text[] := array[]::text[];
  v_conta record;
  v_admin record;
  v_alerta uuid;
begin
  select coalesce(string_agg(par, ';' order by par), 'sem-sinais'),
         count(*) filter (where gravidade = 'travado')
    into v_assinatura, v_travadas
    from (
      select s.user_id::text || ':' || sinal as par, s.gravidade
        from public.calcular_saude_das_contas() s,
             lateral unnest(s.sinais) as sinal
       where sinal <> 'coleta_antiga'
    ) as pares;

  select assinatura into v_ultima
    from public.admin_health_alerts
   order by enviado_em desc
   limit 1;

  if v_assinatura = coalesce(v_ultima, '') then
    return;
  end if;

  if v_assinatura = 'sem-sinais' then
    v_linhas := array_append(v_linhas, '🟢 *Tudo destravado*');
    v_linhas := array_append(v_linhas, 'Nenhuma conta com sinal de problema agora.');
  else
    v_linhas := array_append(v_linhas, format('🔴 *%s* com sinal de problema',
      case when v_travadas = 1 then '1 conta' else v_travadas::text || ' contas' end));
    for v_conta in
      select s.negocio, s.email_da_conta, s.sinais
        from public.calcular_saude_das_contas() s
       where s.gravidade <> 'ok'
       order by s.gravidade, s.negocio nulls last
    loop
      v_linhas := array_append(v_linhas, '');
      v_linhas := array_append(v_linhas, format('🏪 *%s*', coalesce(v_conta.negocio, v_conta.email_da_conta)));
      -- Uma linha por sinal, em portugues. `coleta_antiga` fica de fora do
      -- aviso: e informacao, e o aviso e para o que trava.
      v_linhas := v_linhas || array(
        select '• ' || public.rotulo_do_sinal(sinal)
          from unnest(v_conta.sinais) as sinal
         where sinal <> 'coleta_antiga'
         order by sinal
      );
    end loop;
  end if;

  v_linhas := array_append(v_linhas, '');
  v_linhas := array_append(v_linhas, '👉 https://binno.pro/admin');
  v_corpo := array_to_string(v_linhas, E'\n');

  insert into public.admin_health_alerts (assinatura, contas_travadas)
  values (v_assinatura, coalesce(v_travadas, 0))
  returning id into v_alerta;

  for v_admin in select a.user_id from public.admins a loop
    insert into public.whatsapp_outbox (user_id, kind, provider, recipient_e164, body, idempotency_key)
    select v_admin.user_id, 'admin-alerta', public.canal_do_aviso(v_admin.user_id),
           w.recipient_e164, v_corpo, 'admin:' || v_alerta::text
      from public.whatsapp_notification_preferences w
     where w.user_id = v_admin.user_id
    on conflict (user_id, idempotency_key) do nothing;
  end loop;
exception when others then
  raise warning 'avisar_administrador falhou: %', sqlerrm;
end;
$function$;

revoke all on function public.avisar_administrador() from public, anon, authenticated;
