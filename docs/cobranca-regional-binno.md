# Cobrança regional do Binno

## Modelo aprovado

O Binno vende inicialmente apenas para negócios que operam no Brasil:

| País onde o negócio opera | Preço público | Estado |
| --- | --- | --- |
| Brasil | R$99 por mês no lote de fundadores; R$199 depois | Aberto após a validação final |
| Outros países | Não exibido | Indisponível nesta fase |

### Lote de fundadores — decidido por Marcelo em 03/09/2026

As primeiras 50 assinaturas entram a R$99 por mês para formar base de usuários
e validar o produto. Quem entra no lote mantém R$99 enquanto a assinatura
seguir ativa; quando o lote fechar, novos assinantes pagam R$199.

**O limite é operacional, não é imposto por código.** O `STRIPE_BR_PRICE_ID`
no cofre do Supabase é um segredo único: enquanto apontar para o preço de R$99,
todo checkout novo sai a R$99. Fechar o lote é trocar esse segredo de volta
para o preço de R$199. Não existe contador de vagas na aplicação, e o número de
vagas aparece na página pública a partir de `src/lib/precoBinno.ts`.

O país de operação é preenchido no onboarding ou no Perfil e salvo em
`profiles.business_country`. Ele é a fonte comercial. IP, idioma, localização
do navegador e código do telefone nunca definem o preço ou permitem trocar de
mercado.

Antes de abrir o Checkout, a função server-side lê esse país no perfil e deriva
o único mercado permitido. O Checkout exige endereço de cobrança. No webhook
Stripe assinado, o país efetivo do endereço precisa corresponder ao país onde o
negócio opera. Uma divergência não ativa a assinatura nem libera acesso.

O Checkout hospedado não permite limitar o endereço apenas por este critério.
Por isso, a validação no servidor e no webhook é obrigatória. Caso o endereço
não corresponda, a assinatura fica incompatível e não concede acesso. A regra
de cancelamento ou reembolso desse caso precisa estar definida antes da venda
pública.

Não usar Stripe Connect: isto não é um marketplace. Cada operação é a sua
própria relação comercial, com produto, preço, cliente, fatura, portal e
webhook na respetiva conta.

## Pré-requisitos antes de ativar uma região

1. A entidade que aparece nos Termos e na Privacidade deve ser a mesma que
   vende e recebe naquela conta Stripe.
2. Criar, na conta Stripe brasileira, o produto `Binno` e o preço mensal
   recorrente de R$199, mais o preço de R$99 do lote de fundadores. Os dois
   preços vivem no mesmo produto; o lote é aberto e fechado trocando qual deles
   está em `STRIPE_BR_PRICE_ID`.
3. Configurar o Customer Portal daquela conta, permitindo cancelar e atualizar
   o meio de pagamento conforme a política comercial aprovada.
4. Criar o endpoint de webhook dessa mesma conta:

   `https://tjbznhwdjyabuacrfqie.supabase.co/functions/v1/stripe-billing-webhook`

   Eventos necessários: `checkout.session.completed`,
   `customer.subscription.created`, `customer.subscription.updated` e
   `customer.subscription.deleted`.
5. Guardar os três segredos brasileiros no Supabase, nunca no repositório:

   - `STRIPE_BR_SECRET_KEY`, `STRIPE_BR_PRICE_ID`, `STRIPE_BR_WEBHOOK_SECRET`

6. Definir `APP_URL=https://binno.pro` nos segredos do Supabase.

## Ordem segura de ativação

1. Aplicar a migration `business_country` e publicar as funções
   `billing-checkout` e `stripe-billing-webhook`.
2. Só depois publicar a interface que passa a consultar esse campo.
3. Realizar uma compra de teste no Brasil e conferir que o evento chegou, a assinatura
   foi gravada e o portal abre para o mesmo cliente.
4. Abrir vendas brasileiras somente depois da revisão da entidade legal,
   impostos e textos públicos do Brasil.
5. A Europa só poderá ser desenhada como uma nova operação depois de cumprir
   estes mesmos passos com entidade, catálogo e textos próprios.

## Limites atuais

- O checkout brasileiro não é criado enquanto os três segredos e o Price ID
  brasileiros não existirem.
- A aplicação não cobra, não guarda cartão e não concede acesso apenas por
  voltar da URL de sucesso. O estado vem dos webhooks assinados da Stripe.
- A cobrança não deve ligar uma trava global de acesso aos pilotos já ativos.
  Essa política é uma decisão operacional separada após a primeira validação.
- Impostos automáticos não são ativados sem inscrições fiscais confirmadas.
