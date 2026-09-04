-- O link do Google deixa de ser pedido a quem ja ligou a conta.
--
-- POR QUE ESTA MIGRACAO EXISTE
--
-- A pagina publica do QR manda o cliente para o Google usando um link que o
-- DONO colou a mao em Configuracoes. Desde 03/09/2026 a ligacao oficial existe
-- e devolve o `placeId` do proprio Google, guardado em
-- `google_business_locations.place_id` — o mesmo identificador que estava a ser
-- extraido do link colado.
--
-- Continuar a pedir e pedir o que ja se sabe. Marcelo apanhou isto duas vezes:
-- "os links externos e Google Reviews deveriam ser um so", e depois
-- "conectado, mas mantem o link externo".
--
-- A ORDEM E DELIBERADA, e e a que NAO REGRIDE: o link manual continua a mandar
-- quando existe. Um dono que colou um `g.page` curto escolheu aquele endereco,
-- pode te-lo impresso, e trocar-lho por baixo mudaria o destino de um QR que ja
-- esta numa mesa. O oficial entra apenas onde nao ha manual — que e o caso de
-- todo cliente novo daqui para a frente.
--
-- O ENDERECO DERIVADO e o `writereview` do proprio Google, que abre a caixa de
-- avaliacao ja no sitio certo. E o que o Google documenta para este fim.

create or replace function public.get_public_qr_business(p_identifier text)
returns table (
  qr_code_id uuid,
  qr_name text,
  user_id uuid,
  business_name text,
  google_review_url text,
  tripadvisor_review_url text
)
language sql
stable
security definer
set search_path to 'public'
as $function$
  with matched_qr as (
    select q.id, q.name, q.user_id
    from public.qr_codes q
    where q.is_active = true
      and (q.slug = p_identifier or q.id::text = p_identifier)
    limit 1
  )
  select
    qr.id as qr_code_id,
    qr.name as qr_name,
    qr.user_id,
    coalesce(profile.business_name, qr.name, 'Estabelecimento') as business_name,
    coalesce(google.url, oficial.url) as google_review_url,
    tripadvisor.url as tripadvisor_review_url
  from matched_qr qr
  left join public.profiles profile on profile.id = qr.user_id
  left join lateral (
    select link.url
    from public.platform_links link
    where link.user_id = qr.user_id
      and lower(link.platform) like '%google%'
      and nullif(btrim(coalesce(link.url, '')), '') is not null
    order by link.created_at asc
    limit 1
  ) google on true
  -- O recuo: a ligacao oficial. So entra quando nao ha link colado.
  left join lateral (
    select 'https://search.google.com/local/writereview?placeid=' || local.place_id as url
    from public.google_business_locations local
    where local.user_id = qr.user_id
      and local.is_selected
      and nullif(btrim(coalesce(local.place_id, '')), '') is not null
    limit 1
  ) oficial on true
  left join lateral (
    select link.url
    from public.platform_links link
    where link.user_id = qr.user_id
      and lower(link.platform) like '%tripadvisor%'
    order by link.created_at asc
    limit 1
  ) tripadvisor on true;
$function$;
