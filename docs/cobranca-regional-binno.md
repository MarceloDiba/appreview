# Cobrança regional do Binno

## Modelo aprovado

O Binno vende a mesma assinatura mensal em duas operações independentes:

| Mercado escolhido pelo cliente | Preço público | Conta Stripe |
| --- | --- | --- |
| Brasil | R$ 199 por mês | Conta brasileira do vendedor brasileiro |
| Europa | €49 por mês | Conta europeia do vendedor europeu |

O país nunca é decidido apenas por IP. O site pode sugerir um mercado, mas o
cliente escolhe e pode trocar antes do checkout.

Não usar Stripe Connect: isto não é um marketplace. Cada operação é a sua
própria relação comercial, com produto, preço, cliente, fatura, portal e
webhook na respetiva conta.

## Pré-requisitos antes de ativar uma região

1. A entidade que aparece nos Termos e na Privacidade deve ser a mesma que
   vende e recebe naquela conta Stripe.
2. Criar, na conta Stripe daquela região, um produto `Binno` e um preço mensal
   recorrente: R$199 no Brasil ou €49 na Europa.
3. Configurar o Customer Portal daquela conta, permitindo cancelar e atualizar
   o meio de pagamento conforme a política comercial aprovada.
4. Criar o endpoint de webhook dessa mesma conta:

   `https://tjbznhwdjyabuacrfqie.supabase.co/functions/v1/stripe-billing-webhook`

   Eventos necessários: `checkout.session.completed`,
   `customer.subscription.created`, `customer.subscription.updated` e
   `customer.subscription.deleted`.
5. Guardar os três segredos da região no Supabase, nunca no repositório:

   - `STRIPE_BR_SECRET_KEY`, `STRIPE_BR_PRICE_ID`, `STRIPE_BR_WEBHOOK_SECRET`
   - `STRIPE_EU_SECRET_KEY`, `STRIPE_EU_PRICE_ID`, `STRIPE_EU_WEBHOOK_SECRET`

6. Definir `APP_URL=https://binno.pro` nos segredos do Supabase.

## Ordem segura de ativação

1. Aplicar a migration regional e publicar as funções `billing-checkout` e
   `stripe-billing-webhook`.
2. Configurar primeiro os preços e segredos de teste de uma região.
3. Realizar uma compra de teste e conferir que o evento chegou, a assinatura
   foi gravada e o portal abre para o mesmo cliente.
4. Repetir no modo live somente após a revisão da entidade legal, impostos e
   textos públicos daquele mercado.
5. Só então inserir os segredos live. A página de perfil libera o botão apenas
   para os mercados que possuírem chave secreta e Price ID válidos.

## Limites atuais

- O checkout não é criado enquanto os segredos e o Price ID daquele mercado
  não existirem.
- A aplicação não cobra, não guarda cartão e não concede acesso apenas por
  voltar da URL de sucesso. O estado vem dos webhooks assinados da Stripe.
- A cobrança não deve ligar uma trava global de acesso aos pilotos já ativos.
  Essa política é uma decisão operacional separada após a primeira validação.
- Impostos automáticos não são ativados sem inscrições fiscais confirmadas.
