# Snapshot experimental via Apify

Esta rota existe exclusivamente para avaliar localmente a leitura do Binno com
uma fotografia limitada de um perfil público, enquanto a integração oficial
com o Perfil da Empresa no Google aguarda aprovação.

## Limites que não podem ser omitidos

- a fonte é Apify, não uma API oficial do Google;
- a amostra não representa uma fila completa de avaliações nem uma contagem
  completa de respostas pendentes;
- o snapshot não entra em `cached_reviews`, tabelas oficiais ou produção;
- não guardar nomes, fotos, URLs de avaliadores ou textos de avaliações no
  arquivo local;
- cada execução é manual, limitada e sem agenda.

## Como usar localmente

1. Criar `public/experimental-snapshot.json` a partir de um resultado autorizado.
   O arquivo está no `.gitignore` e nunca deve entrar no Git.
2. Incluir apenas a estrutura mínima abaixo, com agregados sanitizados:

```json
{
  "source": "apify-experimental",
  "fetchedAt": "2026-08-15T16:03:00.683Z",
  "business": {
    "name": "Nome do negócio",
    "address": "Endereço público",
    "placeId": "Place ID público",
    "googleRating": 4.9,
    "googleReviewCount": 456
  },
  "sample": {
    "reviewCount": 49,
    "ratingBreakdown": { "1": 0, "2": 0, "3": 0, "4": 0, "5": 49 },
    "ownerRepliesFound": 0
  }
}
```

3. Abrir localmente `/demo?view=snapshot`.

Se o arquivo estiver ausente, a tela mostra um estado vazio explícito. Em
produção, a ausência desse arquivo é obrigatória.
