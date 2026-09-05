-- A ligação com o Google deixa de cair sem ninguém saber.
--
-- O QUE ESTAVA ERRADO
--
-- `calcular_saude_das_contas()` não tocava uma única vez em
-- `google_business_connections`. O aviso diário ao administrador — que existe,
-- corre às 11h e lista tudo o que está travado — era cego para a única
-- integração de que o produto inteiro depende.
--
-- E não há nada que a verifique sozinha. `sync-google-business-profile` só é
-- chamada pelo navegador, a partir de três sítios do painel; nenhum `cron.job`
-- lhe toca. Confirmado na lista de tarefas agendadas: oito activas, nenhuma
-- delas do Google.
--
-- A CADEIA COMPLETA, medida e não suposta:
--
--   1. o app do Google está em modo Teste, e nesse modo a autorização morre
--      ao fim de 7 dias
--   2. quando morre, nada corre — porque nada corre sozinho
--   3. logo, nada escreve `status = 'revoked'`, que é a linha 243 da função
--      de sincronização e o único sítio do sistema que o faria
--   4. o dono só descobre quando abre o painel, e aí vê "sem ligação"
--
-- O passo 4 é o que dói. O produto vende "não precisa abrir o painel" — e a
-- falha esconde-se exactamente no sítio onde ele promete que ninguém precisa
-- de olhar. Um cliente pagante fica dias sem receber avaliação nova, e a
-- única pessoa que podia agir não é avisada.
--
-- DOIS SINAIS, E A DIFERENÇA ENTRE ELES IMPORTA
--
-- `ligacao_do_google_caiu` é o estado já partido: existe ligação e ela não
-- está `connected`. É `travado`, ao lado de "mensagem falhou" — porque para o
-- cliente é a mesma coisa, o produto parou.
--
-- `google_sem_sincronizar` é o estado que ANTECEDE o partido: continua a
-- dizer `connected`, mas há mais de três dias que ninguém confirma. Como nada
-- corre sozinho, "connected" só prova que ninguém tentou desde a última vez —
-- é a mesma família do `accepted` do WhatsApp, um estado que afirma mais do
-- que sabe. Três dias dá folga dentro dos sete antes de a autorização morrer.
-- Fica em `atencao`, e não em `travado`, porque ainda não partiu nada.
--
-- NÃO INVENTA UM SINAL PARA QUEM NUNCA LIGOU. Uma conta sem linha nenhuma em
-- `google_business_connections` é alguém a meio da configuração, e isso já é
-- coberto por `nunca_coletou` e por `dono_sumido`. Marcar isso como avaria
-- encheria o aviso de ruído e ensinaria a ignorá-lo.

create or replace function public.calcular_saude_das_contas()
returns setof registo_de_saude
language sql
security definer
stable
set search_path = public
as $$
  with coleta as (
    select r.user_id,
           max(r.completed_at) filter (where r.status = 'succeeded') as ultima,
           count(*) filter (where r.status = 'succeeded') as bem_sucedidas
      from public.experimental_apify_runs r
     group by r.user_id
  ),
  ultimo_retrato as (
    select distinct on (r.user_id) r.user_id, r.result_summary
      from public.experimental_apify_runs r
     where r.status = 'succeeded'
     order by r.user_id, r.completed_at desc
  ),
  base as (
    select
      u.id as user_id,
      nullif(btrim(coalesce(p.business_name, '')), '') as negocio,
      u.email::text as email_da_conta,
      u.created_at as criada_em,
      u.last_sign_in_at as ultimo_acesso,
      c.ultima as ultima_coleta_em,
      coalesce(c.bem_sucedidas, 0) as coletas,
      s.result_summary,
      (select count(*) from public.google_public_reviews_answered a where a.user_id = u.id) as respostas_publicadas,
      greatest(
        u.last_sign_in_at,
        (select max(a.answered_at) from public.google_public_reviews_answered a where a.user_id = u.id),
        (select max(q.created_at) from public.qr_codes q where q.user_id = u.id)
      ) as ultima_atividade_do_dono,
      (select count(*) from public.review_funnel_events e
        where e.user_id = u.id and e.event_type = 'qr_open'
          and e.created_at > now() - interval '30 days') as visitas_ao_qr_30d,
      (select count(*) from public.internal_feedback f
        where f.user_id = u.id and f.created_at > now() - interval '30 days') as comentarios_30d,
      exists (
        select 1 from public.platform_links l
         where l.user_id = u.id and public.is_public_google_url(l.url)
      ) as tem_link_do_google,
      exists (
        select 1 from public.apify_auto_collection_queue q
         where q.user_id = u.id and q.status = 'queued'
           and q.queued_at < now() - interval '30 minutes'
      ) as coleta_parada_na_fila,
      exists (
        select 1 from public.whatsapp_outbox o
         where o.user_id = u.id and o.status = 'failed'
           and o.created_at > now() - interval '72 hours'
      ) as mensagem_falhou,
      exists (
        select 1 from public.whatsapp_outbox o
         where o.user_id = u.id and o.status = 'sending'
           and o.claimed_at < now() - interval '15 minutes'
      ) as fila_presa_no_envio,
      exists (
        select 1 from public.whatsapp_outbox o
         where o.user_id = u.id and o.status = 'queued'
           and o.scheduled_at < now() - interval '30 minutes'
      ) as fila_parada_na_saida,
      exists (
        select 1 from public.whatsapp_notification_preferences w
         where w.user_id = u.id and w.consented_at is not null
           and nullif(btrim(coalesce(w.telegram_chat_id, '')), '') is null
      ) as sem_canal_de_aviso,
      exists (
        select 1 from public.whatsapp_notification_preferences w
         where w.user_id = u.id and w.consented_at is not null and w.weekly_enabled
           and not exists (
             select 1 from public.whatsapp_outbox o
              where o.user_id = u.id and o.kind = 'weekly'
                and o.created_at > now() - interval '7 days'
           )
      ) as resumo_nao_saiu,
      -- A LIGAÇÃO JÁ PARTIDA. Só conta para quem TEM ligação: a ausência de
      -- linha é quem ainda não ligou, e isso não é avaria.
      exists (
        select 1 from public.google_business_connections g
         where g.user_id = u.id and g.status is distinct from 'connected'
      ) as ligacao_do_google_caiu,
      -- E A QUE AINDA DIZ ESTAR VIVA SEM NINGUÉM CONFIRMAR. Como nada corre
      -- sozinho, `connected` só prova que ninguém tentou desde a última vez.
      exists (
        select 1 from public.google_business_connections g
         where g.user_id = u.id and g.status = 'connected'
           and (g.last_synced_at is null or g.last_synced_at < now() - interval '3 days')
      ) as google_sem_sincronizar,
      (select count(*) from public.internal_feedback f where f.user_id = u.id) as comentarios_privados,
      (select count(*) from public.google_reviews_awaiting_reply w
        where w.user_id = u.id and w.expires_at > now()) as fila_de_respostas
    from auth.users u
    left join public.profiles p on p.id = u.id
    left join coleta c on c.user_id = u.id
    left join ultimo_retrato s on s.user_id = u.id
  ),
  calculada as (
    select b.*,
      (b.negocio is not null and b.tem_link_do_google and b.coletas = 0
        and b.criada_em < now() - interval '1 hour') as nunca_coletou,
      case when b.ultima_atividade_do_dono is null then null
           else extract(day from now() - b.ultima_atividade_do_dono)::integer end as dias_sem_atividade
      from base b
  ),
  classificada as (
    select c.*,
      case
        when c.ultima_atividade_do_dono is null then 'nunca_entrou'
        when c.dias_sem_atividade <= 7 then 'ativo'
        when c.dias_sem_atividade <= 21 then 'esfriando'
        else 'sumido'
      end as uso
      from calculada c
  )
  select
    z.user_id, z.negocio, z.email_da_conta, z.criada_em,
    nullif((z.result_summary->'business'->>'googleRating'), '')::numeric,
    nullif((z.result_summary->'business'->>'googleReviewCount'), '')::integer,
    nullif((z.result_summary->'sample'->>'reviewCount'), '')::integer,
    z.comentarios_privados::integer,
    z.fila_de_respostas::integer,
    z.ultima_coleta_em,
    case when z.ultima_coleta_em is null then null
         else extract(day from now() - z.ultima_coleta_em)::integer end,
    z.ultimo_acesso,
    z.respostas_publicadas::integer,
    z.ultima_atividade_do_dono,
    z.dias_sem_atividade,
    z.uso,
    z.visitas_ao_qr_30d::integer,
    z.comentarios_30d::integer,
    array_remove(array[
      case when z.coleta_parada_na_fila then 'coleta_parada_na_fila' end,
      case when z.nunca_coletou then 'nunca_coletou' end,
      case when z.mensagem_falhou then 'mensagem_falhou' end,
      case when z.fila_presa_no_envio then 'fila_presa_no_envio' end,
      case when z.fila_parada_na_saida then 'fila_parada_na_saida' end,
      case when z.sem_canal_de_aviso then 'sem_canal_de_aviso' end,
      case when z.ligacao_do_google_caiu then 'ligacao_do_google_caiu' end,
      case when z.google_sem_sincronizar then 'google_sem_sincronizar' end,
      case when z.resumo_nao_saiu then 'resumo_nao_saiu' end,
      case when z.ultima_coleta_em < now() - interval '30 days' then 'coleta_antiga' end,
      case when z.uso = 'sumido' or z.uso = 'nunca_entrou' then 'dono_sumido' end
    ], null),
    case
      when z.coleta_parada_na_fila or z.nunca_coletou or z.mensagem_falhou
        or z.fila_presa_no_envio or z.fila_parada_na_saida or z.sem_canal_de_aviso
        or z.ligacao_do_google_caiu then 'travado'
      when z.resumo_nao_saiu or z.google_sem_sincronizar then 'atencao'
      else 'ok'
    end
  from classificada z
  order by
    case
      when z.coleta_parada_na_fila or z.nunca_coletou or z.mensagem_falhou
        or z.fila_presa_no_envio or z.fila_parada_na_saida or z.sem_canal_de_aviso
        or z.ligacao_do_google_caiu then 0
      when z.resumo_nao_saiu or z.google_sem_sincronizar then 1
      when z.uso in ('sumido', 'nunca_entrou') then 2
      when z.uso = 'esfriando' then 3
      else 4
    end,
    z.dias_sem_atividade desc nulls first,
    z.negocio nulls last;
$$;

-- O RÓTULO DIZ O QUE FAZER, e não só o que aconteceu. Quem lê isto no
-- telemóvel às 11h precisa de saber se age agora ou se pode esperar.
create or replace function public.rotulo_do_sinal(p_sinal text)
returns text
language sql
immutable
as $$
  select case p_sinal
    when 'coleta_parada_na_fila' then 'Coleta pedida e parada há mais de 30 minutos'
    when 'nunca_coletou' then 'Cadastrou e nunca coletou'
    when 'mensagem_falhou' then 'Mensagem falhou nas últimas 72 horas'
    when 'fila_presa_no_envio' then 'Mensagem presa no meio do envio'
    when 'fila_parada_na_saida' then 'Mensagem parada na fila há mais de 30 minutos'
    when 'sem_canal_de_aviso' then 'Consentiu receber avisos, mas não tem canal'
    when 'ligacao_do_google_caiu' then 'A ligação com o Google caiu — reconectar com o dono'
    when 'google_sem_sincronizar' then 'Google sem sincronizar há mais de 3 dias — pode estar a expirar'
    when 'resumo_nao_saiu' then 'Resumo semanal não saiu'
    when 'coleta_antiga' then 'Última coleta há mais de 30 dias'
    when 'dono_sumido' then 'O dono não aparece há mais de três semanas'
    else p_sinal
  end;
$$;
