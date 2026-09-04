-- Quem paga antes de ter conta.
--
-- POR QUE ISTO EXISTE
--
-- Ate 04/09/2026 o caminho de compra era: clicar no preco, preencher CINCO
-- campos de cadastro, atravessar TRES passos de configuracao, e so entao ver a
-- tela de pagamento. Nas palavras do Marcelo: "nao faz sentido eu perder o
-- 'time' ou pedir informacoes pra comprar".
--
-- Agora o botao do preco leva direto ao Stripe. A conta vem depois.
--
-- O RISCO QUE ISTO CRIA, E COMO ELE FICA VISIVEL
--
-- Cobrar antes de existir uma conta cria uma situacao que nao existia:
-- dinheiro recebido sem dono. Alguem paga, fecha o navegador antes de criar a
-- conta, e fica pago sem acesso — o pior estado possivel, pior do que perder a
-- venda.
--
-- `subscriptions.user_id` e `not null`: uma compra sem dono nao cabe la, e
-- afrouxar essa coluna esconderia o problema dentro da tabela que decide quem
-- tem acesso. Esta tabela existe para o contrario: para que uma compra sem
-- dono seja uma LINHA QUE SE VE, e nao um silencio.
--
-- DUAS VIAS PARA RECLAMAR, porque uma so falha:
--   o BILHETE  — o `stripe_session_id` viaja no endereco de retorno do Stripe.
--                Vale mesmo que a pessoa crie a conta com outro email.
--   o EMAIL    — o que a pessoa deu ao Stripe. Vale mesmo que ela perca o
--                endereco de retorno e volte ao site dias depois.

create table if not exists public.compras_a_reclamar (
  stripe_session_id text primary key,
  stripe_customer_id text,
  stripe_subscription_id text,
  -- Guardado em minusculas para a comparacao por email nao falhar por causa de
  -- maiusculas que a pessoa nem sabe que digitou.
  email text not null,
  -- TUDO O QUE `subscriptions` GUARDA, para que uma compra reclamada fique
  -- indistinguivel de uma feita pelo caminho antigo. Faltando `merchant` e
  -- `eligibility_status`, o portal do Stripe recusa abrir — e o portal e por
  -- onde o cliente cancela. Prometer "cancele quando quiser" e entregar uma
  -- assinatura que nao abre o portal seria pior do que nao prometer.
  market text,
  merchant text,
  stripe_price_id text,
  billing_country text,
  currency text,
  price_per_month numeric,
  current_period_start timestamptz,
  current_period_end timestamptz,
  pago_em timestamptz not null default now(),
  reclamada_por uuid references auth.users(id) on delete set null,
  reclamada_em timestamptz
);

comment on table public.compras_a_reclamar is
  'Pagamentos feitos antes de existir conta. Uma linha aqui com reclamada_por '
  'nulo e dinheiro recebido de alguem que ainda nao tem acesso.';

create index if not exists idx_compras_a_reclamar_email
  on public.compras_a_reclamar (email) where reclamada_por is null;

-- NINGUEM LE ISTO PELA API. A tabela guarda o email de quem pagou; expo-la a
-- `anon` daria uma lista de compradores a quem pedisse. So o servidor entra,
-- e o servidor ignora RLS.
alter table public.compras_a_reclamar enable row level security;

/**
 * Liga uma compra ja paga a uma conta.
 *
 * Chamada com o BILHETE (quem acabou de voltar do Stripe) ou sem ele (quem
 * criou conta e pode ter uma compra a espera pelo email). Devolve o id da
 * compra reclamada, ou nulo se nao havia nenhuma.
 */
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
  select * into v_compra
    from public.compras_a_reclamar
   where reclamada_por is null
     and (
       -- O bilhete ganha do email: e a prova de que esta pessoa acabou de
       -- pagar, mesmo que tenha criado a conta com outro endereco.
       (p_bilhete is not null and stripe_session_id = p_bilhete)
       or (p_bilhete is null and p_email is not null and email = lower(p_email))
     )
   order by pago_em asc
   limit 1
   for update skip locked;

  if v_compra.stripe_session_id is null then
    return null;
  end if;

  -- Uma conta com assinatura viva nao pode receber outra por cima: reclamar
  -- duas vezes daria dois pagamentos ao mesmo dono e nenhum ao segundo.
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
    eligibility_status, currency, price_per_month,
    current_period_start, current_period_end
  ) values (
    p_user_id, v_compra.stripe_customer_id, v_compra.stripe_subscription_id, 'active',
    v_compra.market, v_compra.merchant, v_compra.stripe_price_id,
    v_compra.stripe_session_id, v_compra.billing_country,
    -- `verified` porque o Stripe ja cobrou: o pagamento passou, o pais de
    -- cobranca veio do proprio Stripe, e e isso que `eligibility_status`
    -- afirma. Deixar nulo trancaria o portal de cancelamento.
    'verified', v_compra.currency, v_compra.price_per_month,
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
