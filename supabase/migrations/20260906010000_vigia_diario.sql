-- O vigia diário: o que muda sozinho, entre duas passagens de QA.
--
-- ESPECIFICACAO: `docs/qa/vigia-diario.md`, escrita pela sessao de QA em
-- 05/09/2026. Aqui esta o lado do banco: guardar o que foi medido e avisar
-- quando muda. As medicoes em si vivem na funcao de borda `vigia-diario`,
-- porque tres das quatro exigem sair para a internet.
--
-- AS TRES REGRAS DA ESPECIFICACAO, e onde cada uma esta:
--
--   1. quem nao consegue medir GRITA, nunca passa -> `nao_medido` e uma coluna
--      separada de `falhas`, e qualquer uma delas basta para avisar. Um vigia
--      que nao conseguiu falar com o site nao pode ficar verde por isso.
--   2. o aviso so sai quando MUDA -> `impressao`, comparada com a da ultima
--      corrida. E um problema que volta avisa outra vez, porque a impressao
--      volta a mudar.
--   3. o aviso vai para onde alguem le -> a mesma fila do aviso diario ao
--      administrador, que `canal_do_aviso` encaminha para o Telegram.

create table if not exists public.vigia_diario (
  id uuid primary key default gen_random_uuid(),
  corrido_em timestamptz not null default now(),
  falhas text[] not null default '{}',
  nao_medido text[] not null default '{}',
  detalhe jsonb not null default '{}'::jsonb,
  -- A IMPRESSAO E O CONJUNTO, ORDENADO. Duas corridas com os mesmos problemas
  -- em ordem diferente tem de dar a mesma impressao, senao o aviso repete-se
  -- todos os dias — que e exactamente o que a regra 2 existe para evitar.
  impressao text not null
);

alter table public.vigia_diario enable row level security;
revoke all on table public.vigia_diario from anon, authenticated;

comment on table public.vigia_diario is
  'Uma linha por corrida do vigia diario. Ver docs/qa/vigia-diario.md.';

/**
 * Guarda a corrida e avisa o administrador so quando o estado muda.
 */
create or replace function public.registar_vigia(
  p_falhas text[],
  p_nao_medido text[],
  p_detalhe jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_impressao text;
  v_anterior text;
  v_corpo text;
  v_linhas text[] := array[]::text[];
  v_id uuid;
  v_admin record;
begin
  v_impressao := md5(
    coalesce(array_to_string((select array_agg(x order by x) from unnest(p_falhas) x), '|'), '')
    || '#' ||
    coalesce(array_to_string((select array_agg(x order by x) from unnest(p_nao_medido) x), '|'), '')
  );

  select impressao into v_anterior
    from public.vigia_diario order by corrido_em desc limit 1;

  insert into public.vigia_diario (falhas, nao_medido, detalhe, impressao)
  values (coalesce(p_falhas, '{}'), coalesce(p_nao_medido, '{}'), coalesce(p_detalhe, '{}'::jsonb), v_impressao)
  returning id into v_id;

  -- NADA MUDOU: nao ha nada a dizer. E o silencio e a resposta certa quando
  -- tudo esta como estava — inclusive quando estava mal e continua mal, porque
  -- o aviso desse dia ja saiu.
  if v_anterior is not distinct from v_impressao then
    return jsonb_build_object('avisou', false, 'impressao', v_impressao, 'id', v_id);
  end if;

  -- VOLTOU AO NORMAL tambem e mudanca, e tambem se diz: quem recebeu o alarme
  -- precisa de saber que acabou, senao fica a olhar para um problema resolvido.
  if array_length(p_falhas, 1) is null and array_length(p_nao_medido, 1) is null then
    v_linhas := array_append(v_linhas, '🟢 *Vigia diário: voltou ao normal*');
    v_linhas := array_append(v_linhas, 'As quatro medições passaram.');
  else
    v_linhas := array_append(v_linhas, '🔴 *Vigia diário*');
    if array_length(p_falhas, 1) is not null then
      v_linhas := array_append(v_linhas, '');
      v_linhas := array_append(v_linhas, '*Falhou:*');
      v_linhas := v_linhas || array(select '• ' || f from unnest(p_falhas) f order by f);
    end if;
    -- NAO CONSEGUIR MEDIR NAO E PASSAR. Vai na mesma mensagem, com outro
    -- titulo, porque a accao e diferente: uma e consertar, a outra e descobrir
    -- porque o vigia ficou cego.
    if array_length(p_nao_medido, 1) is not null then
      v_linhas := array_append(v_linhas, '');
      v_linhas := array_append(v_linhas, '*Não consegui medir:*');
      v_linhas := v_linhas || array(select '• ' || m from unnest(p_nao_medido) m order by m);
    end if;
  end if;

  v_linhas := array_append(v_linhas, '');
  v_linhas := array_append(v_linhas, '👉 https://binno.pro/admin');
  v_corpo := array_to_string(v_linhas, E'\n');

  for v_admin in select a.user_id from public.admins a loop
    insert into public.whatsapp_outbox (user_id, kind, provider, recipient_e164, body, idempotency_key)
    select v_admin.user_id, 'admin-alerta', public.canal_do_aviso(v_admin.user_id),
           w.recipient_e164, v_corpo, 'vigia:' || v_id::text
      from public.whatsapp_notification_preferences w
     where w.user_id = v_admin.user_id
    on conflict (user_id, idempotency_key) do nothing;
  end loop;

  return jsonb_build_object('avisou', true, 'impressao', v_impressao, 'id', v_id);
end;
$$;

revoke all on function public.registar_vigia(text[], text[], jsonb) from public, anon, authenticated;
grant execute on function public.registar_vigia(text[], text[], jsonb) to service_role;

/**
 * As funcoes `security definer` que um anonimo pode executar.
 *
 * A quarta medicao da especificacao. A lista conhecida em 05/09/2026: as cinco
 * do esquema dormente `auditoria_pro` e a `get_public_qr_business`, esta ultima
 * por desenho — e a pagina do QR, que tem de responder a quem nao tem conta.
 *
 * Qualquer nome novo aqui e uma porta que ninguem decidiu abrir.
 */
create or replace function public.funcoes_abertas_a_anonimo()
returns text[]
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(array_agg(n.nspname || '.' || p.proname order by n.nspname, p.proname), '{}')
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname in ('public', 'auditoria_pro')
     and p.prosecdef
     and has_function_privilege('anon', p.oid, 'execute');
$$;

revoke all on function public.funcoes_abertas_a_anonimo() from public, anon, authenticated;
grant execute on function public.funcoes_abertas_a_anonimo() to service_role;

-- A PRIMEIRA CORRIDA NAO TEM COM O QUE COMPARAR, e por isso qualquer resultado
-- lhe parece mudanca. Sem esta condicao, o vigia estreava-se a dizer "voltou ao
-- normal" a quem nunca tinha recebido um alarme — uma mensagem que so confunde.
-- Se a estreia tiver problemas, avisa: ai ha o que dizer.
create or replace function public.registar_vigia(
  p_falhas text[],
  p_nao_medido text[],
  p_detalhe jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_impressao text;
  v_anterior text;
  v_havia_corrida boolean;
  v_corpo text;
  v_linhas text[] := array[]::text[];
  v_id uuid;
  v_admin record;
  v_limpo boolean;
begin
  v_impressao := md5(
    coalesce(array_to_string((select array_agg(x order by x) from unnest(p_falhas) x), '|'), '')
    || '#' ||
    coalesce(array_to_string((select array_agg(x order by x) from unnest(p_nao_medido) x), '|'), '')
  );

  select impressao, true into v_anterior, v_havia_corrida
    from public.vigia_diario order by corrido_em desc limit 1;

  insert into public.vigia_diario (falhas, nao_medido, detalhe, impressao)
  values (coalesce(p_falhas, '{}'), coalesce(p_nao_medido, '{}'), coalesce(p_detalhe, '{}'::jsonb), v_impressao)
  returning id into v_id;

  v_limpo := array_length(p_falhas, 1) is null and array_length(p_nao_medido, 1) is null;

  -- Nada mudou: nada a dizer. Vale tambem quando esta mal e continua mal — o
  -- aviso desse dia ja saiu.
  if coalesce(v_havia_corrida, false) and v_anterior is not distinct from v_impressao then
    return jsonb_build_object('avisou', false, 'impressao', v_impressao, 'id', v_id);
  end if;

  -- Estreia sem problema nenhum tambem nao e noticia.
  if not coalesce(v_havia_corrida, false) and v_limpo then
    return jsonb_build_object('avisou', false, 'estreia', true, 'impressao', v_impressao, 'id', v_id);
  end if;

  if v_limpo then
    v_linhas := array_append(v_linhas, '🟢 *Vigia diário: voltou ao normal*');
    v_linhas := array_append(v_linhas, 'As quatro medições passaram.');
  else
    v_linhas := array_append(v_linhas, '🔴 *Vigia diário*');
    if array_length(p_falhas, 1) is not null then
      v_linhas := array_append(v_linhas, '');
      v_linhas := array_append(v_linhas, '*Falhou:*');
      v_linhas := v_linhas || array(select '• ' || f from unnest(p_falhas) f order by f);
    end if;
    -- Nao conseguir medir nao e passar. Vai na mesma mensagem, com outro
    -- titulo, porque a accao e diferente: uma e consertar, a outra e descobrir
    -- porque o vigia ficou cego.
    if array_length(p_nao_medido, 1) is not null then
      v_linhas := array_append(v_linhas, '');
      v_linhas := array_append(v_linhas, '*Não consegui medir:*');
      v_linhas := v_linhas || array(select '• ' || m from unnest(p_nao_medido) m order by m);
    end if;
  end if;

  v_linhas := array_append(v_linhas, '');
  v_linhas := array_append(v_linhas, '👉 https://binno.pro/admin');
  v_corpo := array_to_string(v_linhas, E'\n');

  for v_admin in select a.user_id from public.admins a loop
    insert into public.whatsapp_outbox (user_id, kind, provider, recipient_e164, body, idempotency_key)
    select v_admin.user_id, 'admin-alerta', public.canal_do_aviso(v_admin.user_id),
           w.recipient_e164, v_corpo, 'vigia:' || v_id::text
      from public.whatsapp_notification_preferences w
     where w.user_id = v_admin.user_id
    on conflict (user_id, idempotency_key) do nothing;
  end loop;

  return jsonb_build_object('avisou', true, 'impressao', v_impressao, 'id', v_id);
end;
$$;

revoke all on function public.registar_vigia(text[], text[], jsonb) from public, anon, authenticated;
grant execute on function public.registar_vigia(text[], text[], jsonb) to service_role;

-- QUEM CHAMA O VIGIA. Mesmo padrao dos outros oito trabalhos: o segredo sai do
-- Vault e nunca de um ficheiro, e o `pg_net` faz o pedido sem bloquear o cron.
create or replace function public.chamar_vigia_diario()
returns void
language plpgsql
security definer
set search_path = public, vault, net
as $$
declare
  v_segredo text;
begin
  select decrypted_secret into v_segredo
    from vault.decrypted_secrets where name = 'binno_worker_secret';
  if v_segredo is null then
    raise warning 'chamar_vigia_diario: sem segredo no Vault';
    return;
  end if;

  perform net.http_post(
    url := 'https://tjbznhwdjyabuacrfqie.supabase.co/functions/v1/vigia-diario',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-binno-worker-secret', v_segredo),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
exception when others then
  raise warning 'chamar_vigia_diario falhou: %', sqlerrm;
end;
$$;

revoke all on function public.chamar_vigia_diario() from public, anon, authenticated;

-- 10:30 UTC e 07:30 no Brasil: meia hora antes do aviso de saude das contas,
-- para os dois chegarem juntos de manha sem se atropelarem na fila.
select cron.schedule('binno-vigia-diario', '30 10 * * *', 'select public.chamar_vigia_diario();');
