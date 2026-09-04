-- So usa quem paga.
--
-- O QUE SE MEDIU ANTES DE ESCREVER ISTO
--
-- Em 04/09/2026 criei uma conta pelo caminho real do produto, sem pagar nada, e
-- bati em todas as portas. Uma delas — `fetch-google-reviews` — CORREU e
-- devolveu os dados da Noa Agencia Digital, gastando a chave paga do Google
-- Places. As outras seis passaram pela porta e so recusaram por falta de dados.
--
-- O RLS estava correcto: a conta nao leu dado de ninguem. O buraco nao era de
-- privacidade, era de cobranca. Toda porta perguntava "esta logado?", e nenhuma
-- perguntava "pagou?".
--
-- Esta funcao e a unica a responder essa pergunta, no produto inteiro.

create table if not exists public.acessos_concedidos (
  user_id uuid primary key references auth.users(id) on delete cascade,
  motivo text not null,
  concedido_por uuid references auth.users(id) on delete set null,
  concedido_em timestamptz not null default now(),
  -- Nulo e permanente. Uma data permite ceder por tempo limitado sem ter de
  -- lembrar de retirar depois.
  expira_em timestamptz
);

comment on table public.acessos_concedidos is
  'Contas que usam o Binno sem pagar, por decisao do dono da casa. O motivo e obrigatorio: uma lista de concessoes sem motivo, daqui a seis meses, e uma lista que ninguem sabe se ainda vale.';

alter table public.acessos_concedidos enable row level security;

create or replace function public.tem_acesso(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select exists (
    select 1 from public.subscriptions
     where user_id = p_user_id
       -- `past_due` ENTRA de proposito: um cartao que falhou e um cliente a
       -- resolver, nao um invasor. Quem cai para `canceled` ou `unpaid` perde.
       and status in ('active', 'trialing', 'past_due')
       -- Quem cancelou mantem o que pagou. Olha-se para o fim do periodo, e
       -- nao para o pedido de cancelamento.
       and (current_period_end is null or current_period_end > now())
  ) or exists (
    select 1 from public.acessos_concedidos
     where user_id = p_user_id
       and (expira_em is null or expira_em > now())
  );
$function$;

revoke execute on function public.tem_acesso(uuid) from public, anon, authenticated;
grant execute on function public.tem_acesso(uuid) to postgres, service_role;

insert into public.acessos_concedidos (user_id, motivo)
select id, 'Conta da casa — Marcelo Diba, decidido em 04/09/2026'
  from auth.users where email = 'diba@noadigital.com.br'
on conflict (user_id) do nothing;
