# Limpeza de dados de teste — 30/07/2026

Inventário feito no Supabase `tjbznhwdjyabuacrfqie` antes da exclusão. Havia
cinco contas: uma operacional da Noá e quatro explicitamente identificadas por
email, nome e metadados como teste, QA ou smoke.

## Removido

Três contas continham somente dados de teste e foram excluídas por UUID:

- `2842bfe7-dc3f-4fb8-af8a-e47e8e1d3d77`
  (`appreview.teste.1783736987@gmail.com`);
- `57a0f980-d35e-4c6e-bb37-1fcf9194e59d`
  (`claudeqa.1783866473865@gmail.com`);
- `401f4c60-72d3-4652-9f8d-5ae9b6ddb760`
  (`appreview-smoke-1783934591365@mailinator.com`).

A exclusão dessas contas removeu em cascata 3 perfis, 3 identidades de
autenticação, 6 sessões, 6 refresh tokens, 1 vínculo de plataforma, 1 QR e 2
feedbacks internos.

Na conta mista `3869ac92-4320-44cf-b740-68971e861218`, foram removidos somente
registros inequivocamente de teste:

- feedbacks `489cc813-9aa6-4a37-9a8c-8079fe47d618` e
  `c9a08071-64dd-4757-bc12-ab1a481325c3`;
- QRs `6767d8ee-18f4-4e59-87d3-24e8e3b1d7bb` e
  `bcf7ae06-626d-4bed-98ec-b07bd06e1566`;
- vínculo TripAdvisor `74964aac-e0eb-4b43-b797-a8bf59e3e84b`.

Total removido nas tabelas públicas: 3 perfis, 2 vínculos de plataforma, 3 QRs
e 4 feedbacks internos. Nenhuma linha foi removida de `reviews`,
`external_place_info` ou `cached_reviews`.

## Preservado

- A conta operacional da Noá e todos os seus registros.
- A conta mista acima, porque ela também contém dados reais do H5 Texas Burger.
- Nessa conta: 1 vínculo Google, 1 registro do H5 e 5 avaliações reais em cache.

A verificação posterior encontrou zero linhas remanescentes para as três contas
excluídas e zero para os cinco registros de teste removidos da conta mista. Os
sete registros reais do H5 listados acima permaneceram presentes.
