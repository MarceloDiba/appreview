# Spec — Sua posição diante dos concorrentes

**Estado:** desenho aprovado por Marcelo em 28/08/2026. Ainda não implementado.
**Escopo:** Frente 1 do diagnóstico. A Frente 2 (painel multi-negócio da NOÁ)
tem spec própria e não depende desta.
**Referência obrigatória:** [contrato de produto](contrato-produto-binno.md).
Nada aqui autoriza alterar a composição aprovada do painel.

## 1. Problema

O Binno hoje só tem o que dizer depois que avaliações acontecem. No cadastro, o
dono cola o link do Google, recebe um QR e um painel vazio; o valor só aparece
semanas depois. É o ponto mais fraco do produto.

Além disso, "4,6 com 312 avaliações" não significa nada sozinho. O dono não sabe
se isso é bom no bairro dele, nem quanto falta para passar quem está à frente.

Este recurso responde duas perguntas no primeiro minuto de uso, sem depender da
aprovação Basic do Google:

1. Onde eu estou em relação aos negócios parecidos aqui perto?
2. Quanto falta para eu passar quem está na frente?

## 2. Invariantes

- Em nenhum lugar se escreve "sua posição no Google". O que medimos é um
  indicador calculado a partir da Places API, que **não** é o mesmo motor do
  pack local do Google Maps. O rótulo é obrigatório na interface.
- Amostra insuficiente não vira conclusão. Sem dados, estado curto e honesto.
- O módulo é aditivo. Não desloca, esconde nem substitui fila, volume, notas,
  QR, temas, reputação, WhatsApp, boas práticas, completude, Radar, Plano de
  hoje ou Resultado observado.
- Nenhuma chamada paga acontece sem freio: cooldown por negócio e teto mensal
  global com corte automático.

## 3. Experiência

### 3.1 No cadastro

O passo 1 do onboarding (`src/pages/Onboarding.tsx`) já pede o link público do
Google e grava `place_id` em `platform_links`. O diagnóstico roda logo após esse
salvamento, antes de avançar para o passo 2.

Conteúdo do cartão:

- posição na vizinhança e tamanho da amostra ("3º de 18 num raio de 1 km");
- sua nota e seu volume;
- nota e volume de quem lidera;
- a distância em números absolutos ("faltam 168 avaliações para igualar o
  líder");
- uma ligação para o que o produto já faz a respeito: QR e fila de respostas.

O diagnóstico nunca bloqueia o onboarding. Se falhar, expirar ou faltar
`place_id`, o passo 2 segue normalmente e o cartão mostra estado honesto.

### 3.2 No painel

Cartão **Sua posição diante dos concorrentes** na coluna lateral, logo abaixo de
"Reputação no Google", com o mesmo conteúdo e a data da última leitura. Um botão
abre a grelha do mapa em tela própria, para não poluir a Visão geral.

O cartão **não** dispara leitura ao abrir a página: mostra o último retrato
gravado. Uma leitura nova só acontece quando o dono pede, e só se o cooldown já
tiver passado. Abrir o painel nunca gasta dinheiro.

### 3.3 Projeção em meses

A projeção ("no seu ritmo atual você chega em X meses") **não aparece no
primeiro diagnóstico**. Ritmo exige duas leituras no tempo. Regras:

- primeira leitura: só posição e distância absoluta;
- a partir da segunda leitura do mesmo negócio, com pelo menos 21 dias entre
  elas, calcula-se o ritmo e a projeção;
- se o ritmo observado for zero ou negativo, não se projeta nada; informa-se que
  não houve avaliações novas no período.

## 4. Arquitetura

Três peças, com responsabilidade única cada uma.

### 4.1 `src/lib/neighborhood.ts` — cálculo puro

Toda a matemática. Sem rede, sem Supabase, sem React. Recebe a amostra já
normalizada e devolve o retrato. É o único lugar onde as definições da secção 5
existem.

### 4.2 `supabase/functions/diagnose-neighborhood` — benchmark

Edge Function autenticada por JWT, no padrão de `fetch-google-reviews`.

- **Não aceita `place_id` do navegador.** Deriva do `platform_links` do usuário
  autenticado, no servidor. Mesmo princípio já usado na regra de cobrança.
- Chamada 1 — detalhes do próprio negócio.
  Field mask: `id,displayName,location,primaryType,rating,userRatingCount`.
- Chamada 2 — busca por proximidade, mesma categoria primária, raio da secção 6.
  Field mask: `places.id,places.displayName,places.rating,places.userRatingCount`.
- **Nenhuma das duas pede `reviews` ou `photos`**, que reclassificam a chamada
  para a faixa mais cara da tabela.
- Grava o retrato derivado e devolve ao navegador o retrato mais a lista de
  concorrentes do momento, que não é persistida.

### 4.3 `supabase/functions/diagnose-map-grid` — grelha

Função separada, porque é a parte cara e precisa de freio próprio.

- 3×3 pontos, espaçamento da secção 6, centrados no negócio.
- Um termo de busca por execução. O termo padrão deriva do `primaryType` do
  negócio, traduzido para o idioma do painel; o dono pode editá-lo antes de
  rodar. Termo vazio não executa.
- Para cada ponto, uma busca por proximidade; registra-se a posição do nosso
  `place_id` na lista, ou "fora do top 20".
- Devolve os nove pontos com a posição de cada um.

## 5. Definições de cálculo

Estas definições são normativas. Ambiguidade aqui vira número errado na cara do
cliente.

- **Amostra:** negócios devolvidos pela busca por proximidade na categoria
  primária do negócio, dentro do raio, excluindo o próprio. A API devolve no
  máximo 20.
- **Amostra elegível:** os da amostra com `userRatingCount >= 10`. O corte
  existe para que um 5,0 com duas avaliações não lidere a vizinhança.
- **Ordenação:** nota decrescente; empate desfeito por volume decrescente;
  empate restante desfeito por `place_id`, para a ordem ser estável entre
  leituras.
- **Posição:** ordena-se a amostra elegível mais o próprio negócio e toma-se o
  índice dele nessa lista, começando em 1. O próprio negócio entra na ordenação
  mesmo com menos de 10 avaliações; nesse caso a interface diz que ele ainda
  está abaixo do corte usado para os concorrentes.
- **Mediana de nota e mediana de volume:** medianas da amostra elegível, sem o
  próprio negócio.
- **Líder:** primeiro colocado da ordenação, excluindo o próprio.
- **Distância para o líder:** `líder.userRatingCount - nosso.userRatingCount`,
  quando positivo. Se a nossa nota já for maior ou igual à do líder e o volume
  também, não há distância a mostrar.
- **Ritmo mensal:** `(volume_atual - volume_anterior) / dias_entre * 30`,
  calculado entre os dois retratos mais recentes com pelo menos 21 dias de
  intervalo.
- **Projeção em meses:** `distância_para_o_líder / ritmo_mensal`, apenas com
  ritmo positivo. Arredondada para cima.

**Amostra insuficiente:** menos de 5 negócios na amostra elegível. Nesse caso
não há posição, mediana, líder nem projeção — apenas a informação de que a
vizinhança é pequena demais para comparar.

## 6. Parâmetros

Valores iniciais, todos configuráveis por variável de ambiente no servidor:

| Parâmetro | Valor inicial |
|---|---|
| Raio da vizinhança | 1.000 m |
| Corte de volume da amostra elegível | 10 avaliações |
| Tamanho mínimo da amostra elegível | 5 |
| Cooldown do benchmark | 7 dias por negócio |
| Cooldown da grelha | 30 dias por negócio |
| Grelha | 3×3 pontos, espaçamento 500 m |
| Teto mensal global de chamadas Enterprise | 800, com corte automático |

## 7. Modelo de dados

Duas tabelas novas. Padrão do repositório: RLS ligada, leitura só do dono,
escrita só pela função com `service_role`, `revoke` de `anon` e `authenticated`
antes do `grant select`.

### `neighborhood_snapshots`

Guarda **apenas número calculado por nós**, mais o nosso próprio `place_id`:

`id`, `user_id`, `place_id`, `captured_at`, `radius_m`, `category`,
`sample_size`, `eligible_sample_size`, `our_rank`, `our_rating`,
`our_review_count`, `leader_rating`, `leader_review_count`, `median_rating`,
`median_review_count`, `calls_made`, `source` travado em `'places-api'`.

### `neighborhood_grid_runs`

`id`, `user_id`, `place_id`, `captured_at`, `keyword`, `grid_size`,
`spacing_m`, `points` (jsonb com latitude, longitude e posição por ponto),
`calls_made`.

### O que não é guardado

**Nome, nota e contagem de avaliações de concorrentes não são persistidos.**
Eles aparecem na tela no momento do diagnóstico e morrem ali. `leader_rating` e
`leader_review_count` são a única exceção: ficam sem nome, sem `place_id` e sem
qualquer ligação ao negócio de origem, porque são o mínimo necessário para dizer
se a distância aumentou ou diminuiu entre duas leituras.

Dois motivos: os termos do Google limitam o armazenamento de conteúdo do Places,
e o produto já tem essa cultura — os textos do Apify ficam só no navegador
autenticado por 14 dias.

Consequência aceita: alerta do tipo "o concorrente X passou você" não é possível
nesta versão. A comparação no tempo funciona sobre agregado — "você era 3º de
18, agora é 2º de 19".

## 8. Custo

Preços verificados em 28/08/2026 na tabela oficial do Google Maps Platform.
Desde março de 2025 não há mais crédito único de US$200; há limite livre por
SKU. Pedir `rating` ou `userRatingCount` reclassifica a chamada para Enterprise;
pedir `reviews` ou `photos` leva à faixa Atmosphere.

| Operação | Chamadas | Custo aprox. |
|---|---|---|
| Benchmark | 2 | ~R$0,30 |
| Grelha 3×3, um termo | 9 | ~R$1,60 |

Limite livre relevante: 1.000 chamadas Enterprise por mês, compartilhado com o
que o resto do projeto consumir nessa faixa. Por isso o teto inicial é 800, e
não 1.000: deixa folga para o resto do projeto antes de qualquer cobrança.

## 9. Estados honestos

| Situação | O que o módulo mostra |
|---|---|
| Sem `place_id` | pede o link do Google; não estima nada |
| Amostra elegível menor que 5 | vizinhança pequena demais para comparar |
| Sem categoria primária utilizável | não compara; explica por quê |
| Cooldown ativo | data em que a próxima leitura fica disponível |
| Teto mensal atingido | próxima leitura indisponível este mês |
| Falha da API | último retrato conhecido, com a data; nunca número inventado |
| Primeira leitura | posição e distância; sem projeção |

## 10. i18n

Chaves novas sob `neighborhood.*`, adicionadas aos três catálogos
(`pt-BR.json`, `pt-PT.json`, `en.json`). Números, notas e datas localizados,
não apenas rótulos. Nada muda no fluxo do cliente final nem no cartão impresso.

O nome do módulo na interface é **Sua posição diante dos concorrentes**.

## 11. Verificação

- `npm run verify` continua sendo o contrato único.
- Introduz-se o `vitest` para o módulo de cálculo, com `npm test` incorporado ao
  `verify`. Alvo: todas as definições da secção 5, incluindo os casos de
  amostra insuficiente, empate, ritmo zero e ritmo negativo.
- A guarda `scripts/check-binno-product-contract.mjs` passa a verificar que o
  módulo é aditivo e que o rótulo de indicador existe na interface.

## 12. Fora de escopo

Job automático de monitoramento; alerta por nome de concorrente; grelha cheia
7×7 com vários termos; painel multi-negócio da NOÁ; publicação de resposta por
API; diagnóstico público sem cadastro.

## 13. Riscos e pendências

- A busca por proximidade devolve no máximo 20 resultados. Em zona densa, a
  amostra é do raio, não do bairro inteiro. A interface diz o tamanho da
  amostra.
- O indicador não é a posição real no Google Maps. Isso é limitação declarada,
  não defeito a corrigir.
- Preços mudam. A tabela da secção 8 tem data e precisa ser reconferida antes de
  abrir venda autônoma.
- O `fetch-google-reviews` atual pede `reviews` no field mask, o que já coloca
  aquela chamada na faixa mais cara. Fora do escopo desta spec; anotado para
  revisão própria.
