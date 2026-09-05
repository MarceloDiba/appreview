-- O registo do evento do Stripe passa a dizer o que foi feito com ele.
--
-- O QUE ESTAVA ERRADO, e a sessao de QA apanhou-o em 05/09/2026: `processed_at`
-- mentia nas duas direccoes ao mesmo tempo.
--
-- MENTIA POR OMISSAO. A compra de quem ainda nao tem conta e gravada em
-- `compras_a_reclamar` e o `webhook` devolve ali mesmo — antes de marcar. O
-- evento mais importante que o produto recebe, o dinheiro a entrar de um
-- cliente novo, ficava para sempre com `processed_at` vazio. Quem olhasse a
-- tabela a procura do que encalhou via exactamente a compra que correu bem.
--
-- E MENTIA POR EXCESSO. No fim, a marca era posta sempre, mesmo quando o `if`
-- de dentro nao entrava. Um `customer.subscription.deleted` cujo dono nao fosse
-- encontrado ficava marcado como processado sem nada ter acontecido: foi assim
-- que o cancelamento do Marcelo nao tirou o acesso e nada denunciou.
--
-- UMA MARCA SO NAO CHEGA, porque "recebi" e "fiz alguma coisa" sao perguntas
-- diferentes e a coluna respondia as duas com o mesmo sim. `decisao` guarda a
-- resposta da segunda:
--
--   compra-sem-conta   -> foi para `compras_a_reclamar`, a espera do dono
--   assinatura-gravada -> a linha de `subscriptions` foi escrita
--   sem-dono           -> evento de assinatura sem dono que se encontre
--   ignorado           -> tipo de evento que este servico nao trata
--
-- `sem-dono` e o unico que e avaria, e por isso e o unico que precisa de ser
-- visto. Os outros tres sao estados normais e ficam legiveis sem alarme.
alter table public.billing_webhook_events
  add column if not exists decisao text;

comment on column public.billing_webhook_events.decisao is
  'O que o webhook fez com o evento: compra-sem-conta, assinatura-gravada, sem-dono ou ignorado. Nulo em eventos anteriores a 06/09/2026.';
