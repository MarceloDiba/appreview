-- So o bilhete reclama uma compra. O e-mail deixa de bastar.
--
-- O BURACO QUE ISTO FECHA
--
-- `reclamar_compra` tinha duas vias: o bilhete (o id da sessao do Stripe, que
-- viaja no endereco de retorno) e, na falta dele, o e-mail da conta. Escrevi as
-- duas para que ninguem ficasse pago e sem acesso por perder um link.
--
-- A segunda via nao aguenta. O projecto passou a confirmar contas
-- automaticamente em 04/09 — `mailer_autoconfirm = true` —, porque o envio de
-- e-mail nunca funcionou. Uma conta nova nasce com `email_confirmed_at`
-- preenchido sem que ninguem tenha provado ser dono daquele endereco.
--
-- Logo: quem soubesse o e-mail de um comprador podia criar conta com ele e
-- LEVAR A ASSINATURA. Nao e roubo de dados, e roubo de dinheiro pago por outra
-- pessoa. Achado pela sessao de QA em 05/09.
--
-- O comentario que eu proprio escrevi em `reclamar-compra/index.ts` dizia que
-- "quem decide de quem e a compra e a SESSAO de quem chama". Decide quem
-- RECEBE, e nunca quem tem DIREITO. As duas coisas so coincidem se o e-mail
-- estiver provado, e aqui nao esta.
--
-- O QUE SE PERDE, E POR QUE VALE A PENA
--
-- Quem fechar o navegador antes de criar a conta deixa de se reclamar sozinho.
-- Fica visivel em `compras_a_reclamar` com `reclamada_por` nulo, e o Marcelo
-- concede acesso pela porta de administrador. E chato e recuperavel.
--
-- O outro lado nao e recuperavel: uma assinatura roubada foi paga por alguem
-- que nunca a recebeu. Entre incomodar quem perdeu um link e deixar roubar
-- dinheiro alheio, escolhe-se incomodar.

create or replace function public.reclamar_compra(
  p_user_id uuid,
  p_email text,
  p_bilhete text default null
)
returns text
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_compra public.compras_a_reclamar;
begin
  -- SEM BILHETE, NAO HA RECLAMACAO. `p_email` continua no argumento para nao
  -- partir quem ja chama a funcao, mas nao decide mais nada.
  if p_bilhete is null then
    return null;
  end if;

  select * into v_compra
    from public.compras_a_reclamar
   where reclamada_por is null
     and stripe_session_id = p_bilhete
   limit 1
   for update skip locked;

  if v_compra.stripe_session_id is null then
    return null;
  end if;

  if exists (
    select 1 from public.subscriptions
     where user_id = p_user_id
       and status in ('active', 'trialing', 'past_due', 'pending')
  ) then
    return null;
  end if;

  insert into public.subscriptions (
    user_id, stripe_customer_id, stripe_subscription_id, status,
    market, merchant, stripe_price_id, checkout_session_id, billing_country,
    eligibility_status, plan_name, currency, price_per_month,
    current_period_start, current_period_end
  ) values (
    p_user_id, v_compra.stripe_customer_id, v_compra.stripe_subscription_id, 'active',
    v_compra.market, v_compra.merchant, v_compra.stripe_price_id,
    v_compra.stripe_session_id, v_compra.billing_country,
    'verified', 'Binno', v_compra.currency, v_compra.price_per_month,
    v_compra.current_period_start, v_compra.current_period_end
  );

  update public.compras_a_reclamar
     set reclamada_por = p_user_id, reclamada_em = now()
   where stripe_session_id = v_compra.stripe_session_id;

  return v_compra.stripe_session_id;
end;
$function$;

revoke execute on function public.reclamar_compra(uuid, text, text) from public, anon, authenticated;
grant execute on function public.reclamar_compra(uuid, text, text) to postgres, service_role;
