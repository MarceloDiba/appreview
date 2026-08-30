-- Coleta Apify automática no cadastro (decisão de 30/08/2026, aprovada por
-- Marcelo: "Faça a coleta no apify sempre que cadastrar um novo negócio até
-- trocarmos pelo google, quando o google chegar desativamos.").
--
-- POR QUE UMA FILA, E NÃO UMA CHAMADA DIRETA NO CADASTRO
--
-- Uma chamada disparada pelo navegador no fim do cadastro se perde se o dono
-- fechar a aba antes dela terminar. Aqui o "pedido" de coleta é gravado pelo
-- próprio banco, no mesmo instante em que o negócio passa a ter nome e um
-- link do Google, dentro da transação que o cadastro já precisa de concluir
-- de qualquer forma. Depois disso, um processo separado (fora desta migração,
-- ver supabase/functions/apify-auto-collect-on-signup) lê a fila e só então
-- gasta com o Apify. Uma falha nesse processo nunca pode voltar a tocar o
-- cadastro: eles já não se falam mais a essa altura.
--
-- O QUE É "UM NEGÓCIO NOVO", PRECISAMENTE
--
-- A primeira vez em que a mesma conta (user_id) tem, ao mesmo tempo, um nome
-- de negócio em profiles.business_name e um link do Google plausível em
-- platform_links. user_id é chave primária da fila: a primeira gravação
-- vence para sempre. Reiniciar o cadastro, recarregar a página ou editar o
-- link do Google depois não gera uma segunda coleta, porque o conflito de
-- chave primária descarta silenciosamente qualquer tentativa seguinte.
-- Negócios que já existiam antes desta migração não entram na fila
-- retroativamente: só um INSERT ou UPDATE novo em profiles ou platform_links
-- aciona o gatilho.

create table if not exists public.apify_auto_collection_queue (
  user_id uuid primary key references auth.users(id) on delete cascade,
  google_review_url text not null,
  status text not null default 'queued' check (status in ('queued', 'processing', 'succeeded', 'failed')),
  queued_at timestamptz not null default now(),
  claimed_at timestamptz,
  processed_at timestamptz,
  apify_run_id uuid references public.experimental_apify_runs(id),
  error_code text
);

create index if not exists apify_auto_collection_queue_dispatch_idx
  on public.apify_auto_collection_queue (status, queued_at)
  where status = 'queued';

alter table public.apify_auto_collection_queue enable row level security;

-- Assim como experimental_apify_runs, esta é uma tabela de operação interna:
-- nenhum papel de navegador lê ou escreve aqui, só a service role.
revoke all on table public.apify_auto_collection_queue from anon, authenticated;

-- Filtro barato e conservador: aceita os mesmos domínios do Google que a
-- função de coleta aceita (ver parseGoogleUrl em
-- supabase/functions/_shared/experimentalApifyCollection.ts). Não substitui
-- essa validação completa, que continua sendo a autoridade antes de gastar
-- com o Apify; serve só para não enfileirar lixo óbvio (campo vazio, outra
-- rede social, URL de outro domínio).
create or replace function public.is_public_google_url(p_url text)
returns boolean
language sql
immutable
as $$
  select p_url is not null
    and p_url ~* '^https://(www\.)?(google\.com(\.br|\.pt)?|maps\.google\.com(\.br)?|maps\.google\.pt|g\.page|maps\.app\.goo\.gl|goo\.gl|share\.google)(/|$)';
$$;

-- Núcleo do gatilho: só enfileira quando as duas condições coexistem. Nunca
-- lança para fora: uma falha aqui é conveniência perdida, não pode derrubar
-- o INSERT/UPDATE em profiles ou platform_links que o cadastro depende.
create or replace function public.queue_apify_auto_collection_if_ready(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_name text;
  v_google_url text;
begin
  select business_name into v_business_name
    from public.profiles
   where id = p_user_id;

  if v_business_name is null or btrim(v_business_name) = '' then
    return;
  end if;

  select url into v_google_url
    from public.platform_links
   where user_id = p_user_id
     and platform ilike '%google%'
     and url is not null
     and btrim(url) <> ''
     and public.is_public_google_url(btrim(url))
   order by created_at asc
   limit 1;

  if v_google_url is null then
    return;
  end if;

  insert into public.apify_auto_collection_queue (user_id, google_review_url)
  values (p_user_id, btrim(v_google_url))
  on conflict (user_id) do nothing;
exception when others then
  raise warning 'queue_apify_auto_collection_if_ready falhou para %: %', p_user_id, sqlerrm;
end;
$$;

create or replace function public.trg_apify_auto_collection_from_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.queue_apify_auto_collection_if_ready(new.id);
  return new;
end;
$$;

create or replace function public.trg_apify_auto_collection_from_platform_link()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.platform ilike '%google%' then
    perform public.queue_apify_auto_collection_if_ready(new.user_id);
  end if;
  return new;
end;
$$;

drop trigger if exists apify_auto_collection_from_profile on public.profiles;
create trigger apify_auto_collection_from_profile
after insert or update on public.profiles
for each row execute function public.trg_apify_auto_collection_from_profile();

drop trigger if exists apify_auto_collection_from_platform_link on public.platform_links;
create trigger apify_auto_collection_from_platform_link
after insert or update on public.platform_links
for each row execute function public.trg_apify_auto_collection_from_platform_link();

-- O drenador (apify-auto-collect-on-signup) reivindica um lote atomicamente,
-- no mesmo padrão de claim_whatsapp_outbox: "for update skip locked" evita
-- que duas execuções concorrentes peguem a mesma linha.
create or replace function public.claim_apify_auto_collection(batch_size integer default 5)
returns setof public.apify_auto_collection_queue
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with selected as (
    select user_id
    from public.apify_auto_collection_queue
    where status = 'queued'
    order by queued_at asc
    for update skip locked
    limit greatest(1, least(batch_size, 25))
  )
  update public.apify_auto_collection_queue q
  set status = 'processing', claimed_at = now()
  from selected
  where q.user_id = selected.user_id
  returning q.*;
end;
$$;

revoke all on function public.claim_apify_auto_collection(integer) from public, anon, authenticated;
grant execute on function public.claim_apify_auto_collection(integer) to service_role;
