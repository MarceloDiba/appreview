-- A area de administrador: ver quem travou, sem ver dado de terceiros.
--
-- Desenho aprovado por Marcelo em 02/09/2026, escrito em
-- docs/superpowers/specs/2026-09-02-area-de-administrador-design.md.
--
-- POR QUE ISTO EXISTE
--
-- O que quebra no Binno quebra em silencio. Tres casos em tres dias, todos
-- encontrados por acaso a ler o banco a mao: a ponte do Telegram que so existia
-- no servidor, o resumo semanal que nao estava a ACONTECER porque nada o
-- chamava, e a coleta do cadastro morta de duas maneiras. Nenhum deixou alarme.
-- Sem cliente pagante isso e constrangedor; com cinco, e o produto.
--
-- POR QUE O ADMINISTRADOR NAO PASSA PELAS REGRAS DE ACESSO POR LINHA
--
-- No plano inicial afirmei que "ser administrador" e "ser da equipe" eram a
-- mesma pergunta, e que uma peca partilhada servia as duas. A decisao de "so
-- numeros" desmente isso: um funcionario precisa de ver as LINHAS da empresa
-- dele, e o administrador decidiu nao ver conteudo nenhum. Po-lo na mesma peca
-- dar-lhe-ia acesso de linha a tudo, e esconder o conteudo na tela e decoracao,
-- nao fronteira.
--
-- Por isso as 44 politicas de RLS ficam INTOCADAS. O administrador le por
-- agregacao, e a fronteira do que ele ve e a lista de colunas do tipo de
-- retorno abaixo — um dado de terceiros teria de ser escrito ali, a vista.

-- ---------------------------------------------------------------------------
-- 1. O que uma linha da area diz.
-- ---------------------------------------------------------------------------
--
-- `email_da_conta` e o unico dado pessoal aqui, e e do CLIENTE — a pessoa com
-- quem o Marcelo tem contrato — e nao de terceiros. Sem ele a pagina nao
-- consegue dizer de quem esta a falar.
--
-- Nao ha `comentario`, `avaliacao`, `customer_name` nem `customer_email`. Um
-- guarda compara esta lista com uma lista permitida, exactamente para que
-- acrescentar um deles um dia fique vermelho.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'registo_de_saude') then
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
      sinais text[],
      gravidade text
    );
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. O calculo, sem porteiro.
-- ---------------------------------------------------------------------------
--
-- Esta funcao NAO confere quem chama, e isso e de proposito: ela e chamada por
-- duas coisas com naturezas diferentes — a pagina, que tem uma sessao e um
-- `auth.uid()`, e o aviso diario, que corre no `pg_cron` e nao tem sessao
-- nenhuma. Meter o porteiro aqui obrigaria o cron a fingir ser alguem.
--
-- O porteiro esta na funcao publica logo abaixo. Esta e revogada de toda a
-- gente: so `postgres` (o cron) e a chave de servico lhe chegam.
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
      c.ultima as ultima_coleta_em,
      coalesce(c.bem_sucedidas, 0) as coletas,
      s.result_summary,
      -- Tem link do Google plausivel? E o que distingue "ainda nao acabou o
      -- cadastro" de "cadastrou e nunca coletou".
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
  comSinais as (
    select b.*,
      -- `nunca_coletou` so vale depois de o cadastro estar completo E de a conta
      -- ter mais de uma hora: sem a hora, uma conta criada agora mesmo nasce
      -- vermelha enquanto a coleta ainda esta a correr, e a pagina passa a
      -- gritar por causa do funcionamento normal.
      (b.negocio is not null and b.tem_link_do_google and b.coletas = 0
        and b.criada_em < now() - interval '1 hour') as nunca_coletou
      from base b
  )
  select
    s.user_id,
    s.negocio,
    s.email_da_conta,
    s.criada_em,
    nullif((s.result_summary->'business'->>'googleRating'), '')::numeric,
    nullif((s.result_summary->'business'->>'googleReviewCount'), '')::integer,
    nullif((s.result_summary->'sample'->>'reviewCount'), '')::integer,
    s.comentarios_privados::integer,
    s.fila_de_respostas::integer,
    s.ultima_coleta_em,
    case when s.ultima_coleta_em is null then null
         else extract(day from now() - s.ultima_coleta_em)::integer end,
    array_remove(array[
      case when s.coleta_parada_na_fila then 'coleta_parada_na_fila' end,
      case when s.nunca_coletou then 'nunca_coletou' end,
      case when s.mensagem_falhou then 'mensagem_falhou' end,
      case when s.fila_presa_no_envio then 'fila_presa_no_envio' end,
      case when s.fila_parada_na_saida then 'fila_parada_na_saida' end,
      case when s.sem_canal_de_aviso then 'sem_canal_de_aviso' end,
      case when s.resumo_nao_saiu then 'resumo_nao_saiu' end,
      -- INFORMACAO, e nao alarme: hoje nao existe coleta recorrente agendada,
      -- so a do cadastro. Marca-la a vermelho seria alarme falso permanente, e
      -- uma pagina sempre vermelha deixa de ser lida.
      case when s.ultima_coleta_em < now() - interval '30 days' then 'coleta_antiga' end
    ], null),
    case
      when s.coleta_parada_na_fila or s.nunca_coletou or s.mensagem_falhou
        or s.fila_presa_no_envio or s.fila_parada_na_saida or s.sem_canal_de_aviso then 'travado'
      when s.resumo_nao_saiu then 'atencao'
      -- Uma conta cujo unico sinal e `coleta_antiga` fica `ok`: ele viaja na
      -- lista como informacao e nao conta para a gravidade.
      else 'ok'
    end
  from comSinais s
  order by
    case
      when s.coleta_parada_na_fila or s.nunca_coletou or s.mensagem_falhou
        or s.fila_presa_no_envio or s.fila_parada_na_saida or s.sem_canal_de_aviso then 0
      when s.resumo_nao_saiu then 1
      else 2
    end,
    s.negocio nulls last;
$function$;

revoke all on function public.calcular_saude_das_contas() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. A porta, com porteiro.
-- ---------------------------------------------------------------------------
--
-- `raise exception` e nao "devolve lista vazia": uma lista vazia e
-- indistinguivel de "nao ha problemas", e um dia alguem sem permissao ia olhar
-- para um painel tranquilo e concluir que estava tudo bem.
--
-- `anon` fica de fora porque uma sessao anonima nunca tem `auth.uid()`, e
-- deixa-la chamar seria dar a qualquer pessoa um caminho para medir o tempo de
-- resposta da tabela `admins`.
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

-- ---------------------------------------------------------------------------
-- 4. O aviso, e a memoria do que ja foi avisado.
-- ---------------------------------------------------------------------------
--
-- Uma pagina so avisa quem a abre. Com um cliente o Marcelo lembra-se de abrir;
-- com dez, nao. Por isso o aviso vai atras dele, pelo canal que ele ja usa.
--
-- SO QUANDO MUDA. Sem esta regra ele recebe o mesmo aviso todos os dias ate
-- deixar de o ler, e um aviso que se deixa de ler e pior do que nenhum.
--
-- Uma TABELA e nao uma coluna, porque o historico e o que permite responder
-- "desde quando isto esta assim". E de operacao interna, como
-- `experimental_apify_runs`: nenhum papel de navegador lhe chega.
create table if not exists public.admin_health_alerts (
  id uuid primary key default gen_random_uuid(),
  assinatura text not null,
  contas_travadas integer not null default 0,
  enviado_em timestamptz not null default now()
);

alter table public.admin_health_alerts enable row level security;
revoke all on table public.admin_health_alerts from anon, authenticated;

create index if not exists admin_health_alerts_recente_idx
  on public.admin_health_alerts (enviado_em desc);

-- O canal novo na fila. Sem isto o `insert` do aviso e recusado pelo `check` e
-- o aviso desaparece — o mesmo defeito que o Telegram teve em 31/08.
alter table public.whatsapp_outbox
  drop constraint if exists whatsapp_outbox_kind_check;

alter table public.whatsapp_outbox
  add constraint whatsapp_outbox_kind_check
  check (kind = any (array[
    'test'::text, 'alert'::text, 'weekly'::text, 'reply-reminder'::text,
    'profile-reminder'::text, 'feedback'::text, 'feedback-praise'::text,
    'admin-alerta'::text
  ]));

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
  -- A assinatura e a lista ordenada de pares (conta, sinal). Ordenada porque
  -- duas leituras da mesma realidade tem de dar a mesma assinatura, e a ordem
  -- de uma consulta sem `order by` nao e promessa nenhuma.
  select coalesce(string_agg(par, ';' order by par), 'sem-sinais'),
         count(*) filter (where gravidade = 'travado')
    into v_assinatura, v_travadas
    from (
      select s.user_id::text || ':' || sinal as par, s.gravidade
        from public.calcular_saude_das_contas() s,
             lateral unnest(s.sinais) as sinal
       where sinal <> 'coleta_antiga'
    ) as pares;

  -- `coleta_antiga` fica fora da assinatura de proposito: ele muda de valor a
  -- cada dia que passa sem coleta, e sozinho faria a assinatura mudar todos os
  -- dias — que e exactamente o ruido que esta regra existe para evitar.

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
      v_linhas := array_append(v_linhas, format('*%s*', coalesce(v_conta.negocio, v_conta.email_da_conta)));
      v_linhas := array_append(v_linhas, array_to_string(
        array(select sinal from unnest(v_conta.sinais) as sinal where sinal <> 'coleta_antiga'), ', '));
    end loop;
  end if;

  v_linhas := array_append(v_linhas, '');
  v_linhas := array_append(v_linhas, '👉 https://binno.pro/admin');
  v_corpo := array_to_string(v_linhas, E'\n');

  -- O HISTORICO E GRAVADO PRIMEIRO, e a chave de repeticao sai do id dele.
  --
  -- A primeira versao desta funcao montava a chave a partir da assinatura mais a
  -- data: `admin:<hash>:<dia>`. O proprio guarda mostrou o que isso engolia — um
  -- problema resolvido e voltado NO MESMO DIA reproduz a assinatura anterior,
  -- portanto a mesma chave, portanto `do nothing`, portanto o Marcelo nao era
  -- avisado do regresso do problema. A deduplicacao ja e feita acima, ao
  -- comparar com a ultima assinatura; a chave so precisa de impedir que duas
  -- execucoes simultaneas escrevam a mesma linha, e o id serve isso melhor.
  --
  -- Fica uma corrida teorica: duas execucoes ao mesmo tempo podiam passar as
  -- duas pela comparacao e gravar dois avisos iguais. Com um cron diario isso
  -- nao acontece, e o preco de acontecer e uma mensagem repetida — muito abaixo
  -- do preco de calar um problema que voltou.
  insert into public.admin_health_alerts (assinatura, contas_travadas)
  values (v_assinatura, coalesce(v_travadas, 0))
  returning id into v_alerta;

  -- Um aviso por administrador. Hoje ha um; a consulta nao presume isso.
  for v_admin in select a.user_id from public.admins a loop
    insert into public.whatsapp_outbox (user_id, kind, provider, recipient_e164, body, idempotency_key)
    select v_admin.user_id, 'admin-alerta', public.canal_do_aviso(v_admin.user_id),
           w.recipient_e164, v_corpo, 'admin:' || v_alerta::text
      from public.whatsapp_notification_preferences w
     where w.user_id = v_admin.user_id
    on conflict (user_id, idempotency_key) do nothing;
  end loop;
exception when others then
  -- Nunca derruba o cron. O motivo fica no log, que e o unico sitio honesto:
  -- aqui ainda nao ha linha na fila para o carregar.
  raise warning 'avisar_administrador falhou: %', sqlerrm;
end;
$function$;

revoke all on function public.avisar_administrador() from public, anon, authenticated;

-- O `pg_cron` corre em UTC. 11:00 UTC sao 08:00 em America/Sao_Paulo — escrever
-- `0 8 * * *` aqui entregaria o aviso as cinco da manha, e e o tipo de engano
-- que so se descobre a receber a mensagem de madrugada.
do $$
begin
  perform cron.unschedule('binno-saude-das-contas');
exception when others then
  null;
end;
$$;

select cron.schedule('binno-saude-das-contas', '0 11 * * *', 'select public.avisar_administrador();');

-- ---------------------------------------------------------------------------
-- 5. E o Marcelo entra na lista.
-- ---------------------------------------------------------------------------
--
-- Por migracao, e nao por tela. A tabela esta fechada a escrita do navegador
-- desde 31/07/2026, e a migracao que a fechou explica porque: a versao original
-- deixava qualquer pessoa autenticada declarar-se administrador. Virar
-- administrador continua a ser um acto deliberado com rasto em git.
insert into public.admins (user_id, role)
select u.id, 'admin' from auth.users u where u.email = 'diba@noadigital.com.br'
on conflict (user_id) do nothing;
