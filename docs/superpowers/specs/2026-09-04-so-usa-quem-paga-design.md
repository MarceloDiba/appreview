# Só usa quem paga

**Data:** 04/09/2026 · **Frente:** Assessor · **Decidido com:** Marcelo Dibá

## O problema, medido

Em 04/09/2026 criei uma conta pelo caminho real do produto, sem pagar nada, e
bati em todas as portas com ela. Depois apaguei a conta.

O que ela conseguiu:

| Porta | Resultado | Quem paga |
| --- | --- | --- |
| `fetch-google-reviews` | **executou** e devolveu "Noá Agência Digital", 4,7, 10 avaliações | Google Places, por chamada |
| `sugerir-resposta` | passou pela porta (recusou por falta de texto, não por permissão) | OpenAI |
| `temas-das-avaliacoes` | passou pela porta | OpenAI |
| `sync-experimental-apify` | passou pela porta | Apify, por execução |
| `start-google-business-oauth` | **HTTP 200 com o endereço de autorização** | — |
| `sync-google-business-profile` | passou pela porta | — |
| `whatsapp-notifications` | passou pela porta | Meta, fora da janela de 24h |
| Criar perfil, gravar link do Google, gerar QR | tudo | — |

A primeira linha não é dedução: a chamada correu e os dados voltaram.

O que **não** conseguiu: ler dado de outra conta. `profiles`, `subscriptions`,
`admins` e `google_business_reviews` devolveram zero linhas. O RLS está
correto. **O buraco não é de privacidade — é de cobrança.**

A causa cabe numa frase: **toda porta do Binno pergunta "está logado?", e
nenhuma pergunta "pagou?".**

## O que se decidiu

Palavras do Marcelo, 04/09/2026:

> "Só usa se pagar. Não tem outra porta. Se não pagar não cria a conta."

Três decisões que saem daí:

1. **Conta só nasce depois do pagamento.** Não há cadastro gratuito.
2. **`diba@noadigital.com.br` é conta da casa**, com acesso permanente.
   `falecomdiba@gmail.com` deixa de ter acesso — passa a depender de pagamento
   ou de concessão.
3. **Existe uma porta de administrador** para conceder acesso sem pagamento,
   porque ele vai precisar ceder contas (à ALIS, por exemplo).

## Arquitetura

Três camadas. Nenhuma delas basta sozinha, e a ordem importa: a primeira
fecha a torneira, a segunda protege quem já entrou, a terceira evita que o
produto trate um cliente que atrasou como um invasor.

### Camada 1 — A entrada fecha no servidor, não na tela

Esconder o formulário de cadastro não fecha nada: o endereço de cadastro do
Supabase é público e responde a qualquer um com a chave publicável — que está
impressa no JavaScript do site. Foi assim que a conta-sonda deste teste nasceu,
sem passar pelo site.

Fecha-se desligando `enable_signup` no Supabase Auth. A partir daí, **nenhuma
conta nasce pelo cliente**. Só o servidor cria contas, e só depois de o Stripe
confirmar o pagamento.

**Consequência que não pode ser esquecida:** com o cadastro desligado, entrar
com o Google deixa de funcionar para gente nova — o Supabase recusa criar o
utilizador. A conta passa a nascer com o e-mail que a pessoa deu ao Stripe, e
ela define a senha na tela `/bem-vindo`. Entrar com Google continua a funcionar
para quem já tem conta.

### Camada 2 — Cada porta que gasta pergunta "pagou?"

Fechar a entrada não protege as contas que já existem, nem o próximo buraco que
aparecer. As portas verificam por si.

Uma função no banco decide, e um só lugar decide:

```
tem_acesso(p_user_id uuid) returns boolean
```

Verdadeiro quando existe assinatura viva **ou** concessão viva. Assinatura viva
é `status in ('active','trialing','past_due')` e `current_period_end` no futuro
(ou nulo, para não trancar uma linha que o Stripe ainda não datou).

`past_due` entra de propósito: um cartão que falhou é um cliente a resolver, não
um invasor. Quem cai para `canceled` ou `unpaid` perde o acesso.

As concessões vivem numa tabela própria:

```
acessos_concedidos (
  user_id, motivo, concedido_por, concedido_em, expira_em nullable
)
```

`expira_em` nulo é permanente — é o caso da conta da casa. Uma data permite
ceder acesso por tempo limitado sem ter de lembrar de o retirar.

**Portas que passam a verificar:**

| Função | Por quê |
| --- | --- |
| `fetch-google-reviews` | gasta a chave paga do Google Places |
| `sugerir-resposta` | gasta a OpenAI |
| `temas-das-avaliacoes` | gasta a OpenAI |
| `sync-experimental-apify` | dispara uma execução paga da Apify |
| `whatsapp-notifications` | pode gastar um modelo pago da Meta |
| `sync-google-business-profile` | publica no perfil público de um negócio |
| `start-google-business-oauth` | inicia uma ligação que o produto vai manter |

`sugerir-resposta` tem uma porta de trabalhador, usada pelo cron que oferece
rascunhos. Essa porta **não** dispensa a verificação: quem se verifica é o **dono
da avaliação**, e não quem chamou. Um dono sem assinatura não recebe rascunho
nem quando é o servidor a pedir.

**`billing-checkout` nunca verifica.** É por onde se paga: exigir pagamento para
poder pagar tranca a porta pelo lado de dentro.

### Camada 3 — Quem perde o acesso vê uma frase, não uma tela vazia

Um dono cuja assinatura terminou entra e vê:

> Sua assinatura terminou em 04/10/2026. Reative para voltar a usar o Binno.

Com o botão que leva ao pagamento. Não um erro, não um painel em branco, não um
redireccionamento para o login — que é o que o produto faria hoje e que parece
avaria, não cobrança.

Quem cancelou mantém tudo até ao fim do período pago. `tem_acesso` já o
garante, porque olha para `current_period_end` e não para o pedido de
cancelamento.

### A porta de administrador

Uma secção em `/admin`, visível só para quem está em `admins`: um campo de
e-mail, um campo de motivo, e um botão que concede.

- E-mail que já tem conta → grava a concessão.
- E-mail sem conta → cria a conta pelo servidor e grava a concessão. A pessoa
  recebe um convite para definir a senha.

O motivo é obrigatório. Uma lista de concessões sem motivo, daqui a seis meses,
é uma lista que ninguém sabe se ainda faz sentido.

## Fluxo de dados

**Comprar (o único caminho para uma conta nova):**

```
preço → comprar → Stripe → paga
      → webhook grava em compras_a_reclamar
      → /bem-vindo?compra=<bilhete>
      → criar-conta-paga (servidor): confirma no Stripe, cria a conta,
        liga a compra à conta
      → a pessoa entra
```

**Usar:**

```
tela → função de servidor → tem_acesso(dono)?
                             sim → faz
                             não → 402, e a tela mostra "reative"
```

## O que não muda

- **O RLS.** Está correto e foi conferido neste teste.
- **As páginas públicas do QR e do feedback.** São dos clientes do dono, não do
  dono. Continuam anónimas e abertas.
- **`billing-checkout`.** Continua aberta a qualquer conta autenticada.

## Como se testa

O guarda deste trabalho tem de fazer o que eu fiz à mão hoje: **criar uma conta
sem pagamento e provar que as portas recusam.** Uma asserção que leia o código à
procura de `tem_acesso` fica verde com uma função que devolve sempre `true`.

Mínimo:

1. Conta sem assinatura → cada porta da lista devolve 402.
2. Conta com assinatura `active` → as mesmas portas deixam passar.
3. Conta com assinatura `canceled` mas `current_period_end` no futuro → passa.
4. Conta com assinatura `canceled` e período terminado → recusa.
5. Conta com concessão sem `expira_em` → passa.
6. Conta com concessão expirada → recusa.
7. `billing-checkout` deixa passar em todos os casos acima.
8. O cadastro público está desligado: um `POST` directo ao endereço de cadastro
   do Supabase é recusado.

O caso 3 é o que impede a correcção de ser cruel com quem cancelou e já pagou.
O caso 7 é o que impede a correcção de trancar a porta pelo lado de dentro.

## Riscos

**O maior é trancar por fora.** Um erro em `tem_acesso` que devolva `false` por
engano deixa um cliente pagante sem produto e sem entender porquê. Por isso a
função vive num sítio só, e por isso os casos 2, 3 e 5 do teste existem — eles
medem a passagem, e não apenas a recusa.

**O segundo é o Google.** Desligar o cadastro público muda o comportamento de
"entrar com o Google" para gente nova. Se `criar-conta-paga` falhar, a pessoa
pagou e não consegue entrar — o pior estado possível. A tela `/bem-vindo` já
trata disso: diz que o pagamento está registado e onde falar com o Binno, em vez
de fingir que correu bem.

## Fora de âmbito

- Reembolso automático.
- Planos diferentes ou limites por plano.
- Período de teste gratuito.
- Migrar a conta `falecomdiba@gmail.com`. Ela perde acesso, e o Marcelo concede
  pela porta de administrador se precisar.
