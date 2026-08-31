-- O fuso do resumo passa a seguir o pais do negocio.
--
-- O padrao estava fixo em 'Europe/Lisbon' desde
-- `20260821193000_whatsapp_delivery_outbox.sql`, de quando o piloto era
-- Portugal primeiro. Nada no painel le ou escreve esse campo, entao toda conta
-- nascia em Lisboa e o dono nao tinha como mudar.
--
-- O efeito apareceu em 31/08/2026: Marcelo tem o negocio no Brasil e pediu o
-- resumo as 9 da manha. Recebeu as 5, porque 9h de Lisboa sao 5h de Brasilia.
-- Duas coisas que precisam concordar, o pais e o fuso, guardadas em lugares
-- diferentes e sem ninguem a liga-las.
--
-- Brasil tem mais de um fuso, entao pais nao determina fuso com exatidao. Por
-- isso o campo continua a existir: ele e o valor preciso. O que muda e que o
-- padrao deixa de ser um palpite portugues e passa a nascer do pais.
create or replace function public.fuso_padrao_do_pais(p_pais text)
returns text
language sql
immutable
as $$
  select case upper(coalesce(btrim(p_pais), ''))
    when 'BR' then 'America/Sao_Paulo'
    when 'PT' then 'Europe/Lisbon'
    when 'ES' then 'Europe/Madrid'
    -- Sem pais conhecido, UTC. Um palpite errado entrega o aviso na madrugada
    -- de alguem; UTC ao menos nao finge saber.
    else 'UTC'
  end;
$$;

-- A preferencia nasce com o fuso do pais do dono.
create or replace function public.aplicar_fuso_do_pais()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pais text;
begin
  if new.time_zone is not null and new.time_zone <> 'Europe/Lisbon' then
    return new;
  end if;

  select business_country into v_pais from public.profiles where id = new.user_id;
  new.time_zone := public.fuso_padrao_do_pais(v_pais);
  return new;
exception when others then
  raise warning 'aplicar_fuso_do_pais falhou para %: %', new.user_id, sqlerrm;
  return new;
end;
$$;

drop trigger if exists aplicar_fuso_do_pais_trigger on public.whatsapp_notification_preferences;
create trigger aplicar_fuso_do_pais_trigger
before insert on public.whatsapp_notification_preferences
for each row execute function public.aplicar_fuso_do_pais();

-- As linhas que ja existem e contradizem o pais do dono. So corrige quem esta
-- no padrao antigo: quem escolheu Lisboa de propostio estando em Portugal
-- continua em Lisboa, porque o pais dele diz Lisboa tambem.
update public.whatsapp_notification_preferences w
set time_zone = public.fuso_padrao_do_pais(p.business_country)
from public.profiles p
where p.id = w.user_id
  and w.time_zone = 'Europe/Lisbon'
  and public.fuso_padrao_do_pais(p.business_country) <> 'Europe/Lisbon';
