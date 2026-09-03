-- O painel de controlo: quem usa, quem esfriou, e quem esta prestes a sair.
--
-- Marcelo, em 03/09/2026, depois de ver a primeira versao da area: "resolve
-- inicialmente, mas queria ter um total de contas ativas, total de contas usada
-- com frequencia, contas com baixo uso (pode ser que aqui possamos intervir com
-- mensagem pra nao perder o cliente). Quero de fato um painel de controle."
--
-- ISTO ERA EXPLICITAMENTE FORA DE ESCOPO, e mudou por decisao dele. O desenho
-- aprovado em 02/09 dizia "nao e painel comercial" e listava isso entre as
-- coisas que ficavam para quando fizessem falta. Fizeram falta no dia seguinte,
-- e a razao e boa: prevenir a perda de um cliente vale mais do que diagnosticar
-- um defeito.
--
-- USO DO DONO E VALOR ENTREGUE SAO COISAS DIFERENTES
--
-- Esta e a distincao que estrutura tudo o que vem abaixo, e e facil de perder:
--
--   USO DO DONO e ele abrir o painel, publicar uma resposta, criar um QR. Sao
--   actos dele.
--
--   VALOR ENTREGUE e o QR ser lido, um comentario privado chegar, uma avaliacao
--   nova aparecer. Sao actos dos clientes DELE, e acontecem quer ele abra o
--   painel quer nao.
--
-- Um cliente pode ter valor entregue alto e uso zero — o QR trabalha sozinho — e
-- esse e exactamente o que cancela, porque nao ve o que esta a ganhar. E outro
-- pode entrar todos os dias e nao receber nada, e esse cancela por outra razao.
-- As duas colunas existem, separadas, porque pedem intervencoes diferentes.
--
-- O QUE NAO ENTRA AQUI
--
-- A fronteira de 02/09 nao muda: nenhum texto de avaliacao, nenhum comentario,
-- nenhum nome ou telefone de terceiros. Tudo o que se acrescenta sao CONTAGENS
-- e DATAS, e a lista permitida do guarda cresce com elas, a mao.

-- As funcoes tem de sair antes do tipo, porque dependem dele.
drop function if exists public.saude_das_contas();
drop function if exists public.calcular_saude_das_contas();
drop type if exists public.registo_de_saude;

create type public.registo_de_saude as (
  user_id uuid,
  negocio text,
  email_da_conta text,
  criada_em timestamptz,
  nota numeric,
  total_de_avaliacoes integer,
  avaliacoes_lidas integer,
  comentarios_privados integer,
  fila_de_respostas integer,
  ultima_coleta_em timestamptz,
  dias_desde_a_coleta integer,
  -- Uso do dono.
  ultimo_acesso timestamptz,
  respostas_publicadas integer,
  ultima_atividade_do_dono timestamptz,
  dias_sem_atividade integer,
  uso text,
  -- Valor entregue ao dono pelos clientes dele.
  visitas_ao_qr_30d integer,
  comentarios_30d integer,
  -- Estado e sinais.
  sinais text[],
  gravidade text
);

create or replace function public.calcular_saude_das_contas()
returns setof public.registo_de_saude
language sql
stable
security definer
set search_path to 'public'
as $function$
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
      -- A ULTIMA VEZ QUE O DONO FEZ ALGUMA COISA. Entrar no painel conta, mas
      -- entrar e sair nao e usar: publicar uma resposta e criar um QR sao actos
      -- com intencao, e por isso entram no mesmo maximo.
      greatest(
        u.last_sign_in_at,
        (select max(a.answered_at) from public.google_public_reviews_answered a where a.user_id = u.id),
        (select max(q.created_at) from public.qr_codes q where q.user_id = u.id)
      ) as ultima_atividade_do_dono,
      -- O QUE OS CLIENTES DELE FIZERAM. Acontece quer ele abra o painel quer
      -- nao, e e a prova de que o produto esta a trabalhar.
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
      -- OS QUATRO ESTADOS DE USO, e os limiares sao juizo de produto e nao
      -- facto. Estao aqui para poderem ser mudados numa linha, e nao espalhados
      -- por uma tela.
      --
      -- 7 dias porque o Binno e um habito semanal: o resumo chega a segunda, e
      -- quem nao aparece numa semana inteira nao chegou a criar o habito.
      -- 21 dias porque tres semanas sem tocar num produto que se paga todo mes
      -- e quando a pergunta "isto serve-me?" aparece sozinha.
      case
        when c.ultima_atividade_do_dono is null then 'nunca_entrou'
        when c.dias_sem_atividade <= 7 then 'ativo'
        when c.dias_sem_atividade <= 21 then 'esfriando'
        else 'sumido'
      end as uso
      from calculada c
  )
  select
    z.user_id,
    z.negocio,
    z.email_da_conta,
    z.criada_em,
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
      case when z.resumo_nao_saiu then 'resumo_nao_saiu' end,
      case when z.ultima_coleta_em < now() - interval '30 days' then 'coleta_antiga' end,
      -- O SINAL COMERCIAL, e ele nao e um defeito: ninguem tem de o consertar,
      -- alguem tem de FALAR com a pessoa. Por isso conta para a lista de sinais
      -- da conta, mas nao para a gravidade tecnica logo abaixo, e nao entra no
      -- aviso diario — que e sobre o que esta partido.
      case when z.uso = 'sumido' or z.uso = 'nunca_entrou' then 'dono_sumido' end
    ], null),
    case
      when z.coleta_parada_na_fila or z.nunca_coletou or z.mensagem_falhou
        or z.fila_presa_no_envio or z.fila_parada_na_saida or z.sem_canal_de_aviso then 'travado'
      when z.resumo_nao_saiu then 'atencao'
      else 'ok'
    end
  from classificada z
  order by
    case
      when z.coleta_parada_na_fila or z.nunca_coletou or z.mensagem_falhou
        or z.fila_presa_no_envio or z.fila_parada_na_saida or z.sem_canal_de_aviso then 0
      when z.resumo_nao_saiu then 1
      -- Depois do que esta partido vem quem esta a escapar: e a ordem em que o
      -- Marcelo precisa de agir.
      when z.uso in ('sumido', 'nunca_entrou') then 2
      when z.uso = 'esfriando' then 3
      else 4
    end,
    z.dias_sem_atividade desc nulls first,
    z.negocio nulls last;
$function$;

revoke all on function public.calcular_saude_das_contas() from public, anon, authenticated;

create or replace function public.saude_das_contas()
returns setof public.registo_de_saude
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
begin
  if not exists (select 1 from public.admins a where a.user_id = auth.uid()) then
    raise exception 'nao autorizado' using errcode = '42501';
  end if;
  return query select * from public.calcular_saude_das_contas();
end;
$function$;

revoke all on function public.saude_das_contas() from public, anon;
grant execute on function public.saude_das_contas() to authenticated;

-- O ROTULO DO SINAL NOVO. O aviso diario nao o manda — ele e sobre o que esta
-- partido, e um cliente a esfriar nao e uma avaria: e uma conversa a ter. Mas o
-- rotulo existe porque a pagina usa a mesma lista, e o guarda exige que as duas
-- sejam iguais.
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
    when 'dono_sumido' then 'O dono não aparece há mais de três semanas'
    else p_sinal
  end;
$function$;
