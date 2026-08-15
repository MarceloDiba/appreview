# Coleta experimental via Apify

Este recurso existe somente para validar uma fotografia limitada de um Perfil
da Empresa enquanto a conexão oficial do Google aguarda aprovação. Ele não
substitui OAuth, a fila oficial, o Radar real nem a publicação de respostas.

## Limites de produto

- O dono informa um link público do Google; o botão é manual, não há agenda.
- A coleta pede no máximo 50 avaliações, ordenadas pelas mais recentes e com
  origem `google`.
- `personalData: false`; o Binno descarta a resposta bruta e devolve somente
  nome/endereço públicos do local, Place ID, nota/total públicos, distribuição
  por estrelas e quantidade de respostas do proprietário na amostra.
- A tabela de auditoria não guarda avaliadores, textos, fotos, URLs de
  avaliações ou saída bruta. Ela existe para aplicar uma coleta por negócio a
  cada 24 horas e o teto mensal configurado.
- A interface identifica a fonte como **Apify experimental** e nunca apresenta
  a amostra como fila completa ou integração oficial.

## Ativação controlada

Nada é ativado pelo código. Antes de publicar a função, obter autorização
explícita para o teto de gasto e configurar, apenas como segredo de servidor:

```text
APIFY_API_TOKEN=...
APIFY_EXPERIMENTAL_ENABLED=true
APIFY_EXPERIMENTAL_MONTHLY_RUN_LIMIT=10
```

O frontend só mostra o botão de coleta quando o build receber
`VITE_APIFY_EXPERIMENTAL_ENABLED=true`. Sem isso, em desenvolvimento ele mostra
somente a amostra local já autorizada; em produção não mostra esse recurso.

O Actor usado é `compass/google-maps-reviews-scraper`. A página do fornecedor
informa preço a partir de US$ 0,30 por mil avaliações, mas custo efetivo pode
variar; a conta Apify deve manter um limite financeiro próprio além deste
limite por número de execuções.

## Saída para a integração oficial

Quando a Google Business Profile API estiver aprovada e o proprietário concluir
OAuth, a sincronização oficial passa a ser a fonte da fila, do Radar e das
respostas. A coleta Apify deve então ficar restrita a diagnóstico temporário ou
ser desligada.
