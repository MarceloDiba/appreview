# Só usa quem paga — plano de implementação

> **Para quem executa:** cada tarefa termina com um guarda vermelho provado e um
> commit. Nenhuma tarefa entra no `main` sem `npm run verify` verde.

**Objetivo:** o acesso ao Binno passa a depender de pagamento, em vez de apenas
de estar autenticado.

**Arquitetura:** uma função no banco (`tem_acesso`) é a única a decidir, e as
sete portas que gastam dinheiro ou agem no perfil do cliente perguntam a ela. O
cadastro público fecha no servidor; conta nasce só depois de o Stripe confirmar.
Quem perde o acesso vê uma frase com o botão de reativar.

**Stack:** Supabase (Postgres, Edge Functions em Deno), React 19 + Vite,
Stripe.

**Spec:** `docs/superpowers/specs/2026-09-04-so-usa-quem-paga-design.md`

## Restrições globais

- Português brasileiro em tudo que o dono lê. Nunca europeu.
- `billing-checkout` **nunca** verifica acesso. Exigir pagamento para poder
  pagar tranca a porta pelo lado de dentro.
- `past_due` mantém o acesso. Cartão recusado é cliente a resolver.
- Quem cancelou mantém acesso até `current_period_end`.
- `diba@noadigital.com.br` é conta da casa, concessão sem prazo.
- Todo guarda novo entra no `verify` do `package.json`.
- Nenhuma asserção pode ficar verde com `tem_acesso` devolvendo sempre `true`.

---

### Tarefa 1 — `tem_acesso` e as concessões

**Ficheiros:**
- Criar: `supabase/migrations/20260904220000_so_usa_quem_paga.sql`
- Criar: `scripts/check-so-usa-quem-paga.mjs`
- Modificar: `package.json` (script `check:so-usa-quem-paga` e cadeia `verify`)

**Interfaces produzidas:**
- `public.tem_acesso(p_user_id uuid) returns boolean`
- `public.acessos_concedidos (user_id uuid, motivo text, concedido_por uuid,
  concedido_em timestamptz, expira_em timestamptz null)`

- [ ] **Passo 1: escrever a migração**

```sql
create table if not exists public.acessos_concedidos (
  user_id uuid primary key references auth.users(id) on delete cascade,
  motivo text not null,
  concedido_por uuid references auth.users(id) on delete set null,
  concedido_em timestamptz not null default now(),
  expira_em timestamptz
);
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
       and status in ('active', 'trialing', 'past_due')
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
select id, 'Conta da casa — Marcelo Dibá, decidido em 04/09/2026'
  from auth.users where email = 'diba@noadigital.com.br'
on conflict (user_id) do nothing;
```

- [ ] **Passo 2: escrever o guarda que corre a função num Postgres real**

Copiar a moldura de `scripts/check-fila-de-rascunhos.mjs` (`acharBinario`,
`initdb`, `pg_ctl`, `psql`, porta própria `54415`). O roteiro cria seis contas,
uma por caso, e mede `tem_acesso` em cada:

```sql
create or replace function cenario(p_caso text) returns text language plpgsql as $fn$
declare u uuid := gen_random_uuid();
begin
  insert into auth.users values (u);
  if p_caso = 'assinatura-viva' then
    insert into public.subscriptions (user_id, status, current_period_end)
      values (u, 'active', now() + interval '20 days');
  elsif p_caso = 'cartao-falhou' then
    insert into public.subscriptions (user_id, status, current_period_end)
      values (u, 'past_due', now() + interval '20 days');
  elsif p_caso = 'cancelou-mas-pagou' then
    insert into public.subscriptions (user_id, status, current_period_end, cancel_at)
      values (u, 'active', now() + interval '20 days', now() + interval '20 days');
  elsif p_caso = 'periodo-terminou' then
    insert into public.subscriptions (user_id, status, current_period_end)
      values (u, 'canceled', now() - interval '1 day');
  elsif p_caso = 'concessao-sem-prazo' then
    insert into public.acessos_concedidos (user_id, motivo) values (u, 'casa');
  elsif p_caso = 'concessao-expirada' then
    insert into public.acessos_concedidos (user_id, motivo, expira_em)
      values (u, 'temporaria', now() - interval '1 day');
  end if;
  return case when public.tem_acesso(u) then 'passa' else 'recusa' end;
end;
$fn$;
```

Asserções: `assinatura-viva`, `cartao-falhou`, `cancelou-mas-pagou` e
`concessao-sem-prazo` devem devolver `passa`; `sem-nada`, `periodo-terminou` e
`concessao-expirada` devem devolver `recusa`.

- [ ] **Passo 3: provar o guarda vermelho, três vezes**

```
mutação A: tirar 'past_due' da lista           → 'cartao-falhou' vira recusa
mutação B: trocar `current_period_end > now()` por `< now()` → 'assinatura-viva' recusa
mutação C: `tem_acesso` devolve sempre true    → os três casos de recusa passam
```

Ler a saída INTEIRA de cada mutação. Não filtrar com `grep`.

- [ ] **Passo 4: aplicar em produção e verificar**

```bash
npm run verify
```

Aplicar a migração pelo MCP do Supabase. Depois conferir que
`tem_acesso` do `diba@noadigital.com.br` devolve `true` e o de
`falecomdiba@gmail.com` devolve `false`.

- [ ] **Passo 5: commit**

---

### Tarefa 2 — As sete portas perguntam "pagou?"

**Ficheiros:**
- Modificar: `supabase/functions/fetch-google-reviews/index.ts`
- Modificar: `supabase/functions/sugerir-resposta/index.ts`
- Modificar: `supabase/functions/temas-das-avaliacoes/index.ts`
- Modificar: `supabase/functions/sync-experimental-apify/index.ts`
- Modificar: `supabase/functions/whatsapp-notifications/index.ts`
- Modificar: `supabase/functions/sync-google-business-profile/index.ts`
- Modificar: `supabase/functions/start-google-business-oauth/index.ts`
- Criar: `supabase/functions/_shared/acesso.ts`
- Modificar: `scripts/check-so-usa-quem-paga.mjs`

**Interfaces consumidas:** `tem_acesso(p_user_id uuid)` da Tarefa 1.
**Interfaces produzidas:** `exigirAcesso(admin, userId): Promise<boolean>`

- [ ] **Passo 1: escrever o ajudante partilhado**

```ts
// supabase/functions/_shared/acesso.ts
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

/**
 * Quem é o dono decide, e nunca quem chamou.
 *
 * `sugerir-resposta` tem uma porta de trabalhador, usada pelo cron que oferece
 * rascunhos. Essa porta não dispensa esta verificação: um dono sem assinatura
 * não recebe rascunho nem quando é o servidor a pedir.
 */
export const temAcesso = async (admin: SupabaseClient, userId: string) => {
  const { data, error } = await admin.rpc('tem_acesso', { p_user_id: userId });
  if (error) {
    // Falhar FECHADO seria trancar um cliente pagante por um soluço de rede.
    // Falha-se ABERTO e regista-se: o pior caso é uma chamada paga a mais; o
    // outro pior caso é um cliente que pagou e ficou sem produto.
    console.error('tem_acesso falhou, deixando passar: %s', error.message);
    return true;
  }
  return data === true;
};
```

- [ ] **Passo 2: ligar em cada uma das sete**

Padrão, logo depois de a sessão ser confirmada e ANTES de qualquer gasto:

```ts
if (!await temAcesso(admin, user.id)) {
  return jsonResponse({ code: 'SEM_ASSINATURA', error: 'Sua assinatura não está ativa.' }, 402);
}
```

`fetch-google-reviews` usa `jsonResponse`; `sugerir-resposta` usa `json`. Usar
o helper que cada ficheiro já tem.

Em `sugerir-resposta`, a verificação vem depois de descobrir o dono da
avaliação, e usa esse id — não o de quem chamou.

- [ ] **Passo 3: acrescentar as asserções ao guarda**

Ler os sete ficheiros e exigir que cada um importe `temAcesso` e devolva 402.
Exigir também que `billing-checkout` **não** o importe.

- [ ] **Passo 4: provar vermelho**

```
mutação A: tirar a verificação de fetch-google-reviews → guarda vermelho
mutação B: pôr a verificação em billing-checkout       → guarda vermelho
```

- [ ] **Passo 5: implantar as sete e provar em produção**

Criar uma conta sem pagamento pelo endereço de cadastro, bater nas sete portas,
exigir 402 em todas e 200 em `billing-checkout`. Apagar a conta no fim.

- [ ] **Passo 6: commit**

---

### Tarefa 3 — O cadastro público fecha

**Ficheiros:**
- Modificar: `supabase/config.toml` (`enable_signup = false`)
- Modificar: `src/pages/Signup.tsx`
- Modificar: `scripts/check-so-usa-quem-paga.mjs`
- Criar: `~/fechar-o-cadastro.sh` (o Marcelo corre; escrita em produção é
  bloqueada para o agente)

- [ ] **Passo 1: mudar o `config.toml` e escrever o script para ele**

```bash
curl -s -X PATCH -H "Authorization: Bearer $TK" -H "Content-Type: application/json" \
  -d '{"disable_signup":true}' \
  "https://api.supabase.com/v1/projects/tjbznhwdjyabuacrfqie/config/auth"
```

- [ ] **Passo 2: `/signup` deixa de ser um formulário**

Passa a explicar e a mandar para o preço:

```tsx
<h1>A conta do Binno nasce com a assinatura</h1>
<p>Não há cadastro separado: você assina e o acesso é criado na hora.</p>
<Button asChild><Link to="/#pricing">Ver o plano</Link></Button>
<p>Já é cliente? <Link to="/login">Entrar</Link></p>
```

- [ ] **Passo 3: asserções** — `config.toml` sem `enable_signup = true`;
`Signup.tsx` sem `supabase.auth.signUp`.

- [ ] **Passo 4: provar vermelho** repondo `signUp` em `Signup.tsx`.

- [ ] **Passo 5: provar em produção** que um `POST` ao endereço de cadastro é
recusado, depois de o Marcelo correr o script.

- [ ] **Passo 6: commit**

---

### Tarefa 4 — A conta nasce no servidor, depois do pagamento

**Ficheiros:**
- Criar: `supabase/functions/criar-conta-paga/index.ts`
- Modificar: `supabase/config.toml` (`verify_jwt = false`)
- Modificar: `src/pages/BemVindo.tsx`
- Modificar: `scripts/check-portas-das-funcoes.mjs` (declarar a porta nova)

**Interfaces consumidas:** `reclamar_compra(p_user_id, p_email, p_bilhete)`.

- [ ] **Passo 1: escrever a função**

Recebe `{ bilhete, senha }`. Confirma no Stripe que a sessão está paga, cria o
utilizador com `admin.auth.admin.createUser({ email, password, email_confirm: true })`
usando o e-mail da sessão, e chama `reclamar_compra`. Devolve
`{ email }` para a tela poder entrar com a senha que a pessoa acabou de definir.

Recusa se o bilhete não estiver pago, se já tiver sido reclamado, ou se a senha
tiver menos de 8 caracteres.

- [ ] **Passo 2: `/bem-vindo` pede senha em vez de chamar `signUp`**

O botão do Google sai da tela para quem chega com bilhete: com o cadastro
fechado, ele falharia. Continua em `/login` para quem já tem conta.

- [ ] **Passo 3: asserções** — a função confirma o pagamento no Stripe antes de
criar; `BemVindo.tsx` não chama `supabase.auth.signUp`.

- [ ] **Passo 4: provar vermelho** tirando a confirmação no Stripe.

- [ ] **Passo 5: provar de ponta a ponta** com um cupom de 100% e uma sessão
`sem_conta=1`: pagar, criar a conta na tela, e verificar que a assinatura ficou
ligada a ela.

- [ ] **Passo 6: commit**

---

### Tarefa 5 — Quem perde o acesso vê uma frase

**Ficheiros:**
- Criar: `src/components/acesso/PrecisaReativar.tsx`
- Modificar: `src/components/ProtectedRoute.tsx`
- Criar: `src/hooks/useTemAcesso.ts`
- Modificar: `src/i18n/owner/locales/pt-BR.json`, `pt-PT.json`, `en.json`

- [ ] **Passo 1: o hook lê a assinatura pelo `billing-checkout`**

Reaproveita `action: 'status'`, que já devolve a assinatura e nunca verifica
acesso.

- [ ] **Passo 2: `ProtectedRoute` mostra a frase em vez do painel**

Sem sessão continua a mandar para `/login`. **Com** sessão e sem acesso mostra
`PrecisaReativar` — nunca um redireccionamento, que pareceria avaria.

`/profile` é a exceção: continua aberta, porque é onde se reativa.

- [ ] **Passo 3: o texto**

```
Sua assinatura terminou em {{data}}.
Reative para voltar a usar o Binno.
[ Reativar assinatura ]
```

- [ ] **Passo 4: asserções** — `/profile` fora do bloqueio; sem sessão vai para
`/login`; o texto existe nos três idiomas.

- [ ] **Passo 5: provar vermelho** bloqueando também `/profile` (tranca por
dentro) e trocando a frase por um `Navigate`.

- [ ] **Passo 6: commit**

---

### Tarefa 6 — A porta de administrador

**Ficheiros:**
- Criar: `supabase/functions/conceder-acesso/index.ts`
- Modificar: `src/pages/Admin.tsx`
- Modificar: `scripts/check-portas-das-funcoes.mjs`

- [ ] **Passo 1: a função**

Exige sessão **e** pertencer a `admins` — o mesmo padrão de `search-prospects`.
Recebe `{ email, motivo, expira_em? }`. Se o e-mail não tiver conta, cria pelo
servidor e envia convite para definir a senha. Grava em `acessos_concedidos`.

`motivo` é obrigatório e recusa vazio.

- [ ] **Passo 2: o formulário em `/admin`**

Três campos — e-mail, motivo, prazo opcional — e a lista das concessões vivas,
com quem concedeu e quando.

- [ ] **Passo 3: asserções** — a função exige `admins`; recusa motivo vazio;
está declarada em `check-portas-das-funcoes.mjs` como `administrador`.

- [ ] **Passo 4: provar vermelho** trocando `admins` por `profiles` e aceitando
motivo vazio.

- [ ] **Passo 5: provar em produção** concedendo acesso a
`falecomdiba@gmail.com` e verificando que `tem_acesso` passa a `true`.

- [ ] **Passo 6: commit**

---

## Autorrevisão

**Cobertura da spec:** camada 1 → Tarefas 3 e 4. Camada 2 → Tarefas 1 e 2.
Camada 3 → Tarefa 5. Porta de administrador → Tarefa 6. Os oito casos de teste
da spec → Tarefa 1 (casos 1 a 6), Tarefa 2 (caso 7), Tarefa 3 (caso 8).

**Nomes:** `tem_acesso` e `acessos_concedidos` são os mesmos da Tarefa 1 à 6.
`temAcesso` é o ajudante em TypeScript; `tem_acesso` é a função no banco.

**Uma decisão que a spec não fixou e este plano fixa:** quando a chamada a
`tem_acesso` **falha** (rede, banco fora), deixa-se passar. Trancar um cliente
pagante por um soluço é pior do que uma chamada paga a mais. Está escrito no
comentário do ajudante para ninguém "corrigir" isto sem ler o motivo.
