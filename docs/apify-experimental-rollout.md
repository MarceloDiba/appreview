# Coleta experimental via Apify

Este recurso existe somente para validar uma fotografia limitada de um Perfil
da Empresa enquanto a conexão oficial do Google aguarda aprovação. Ele não
substitui OAuth, a fila oficial, o Radar real nem a publicação de respostas.

## Coleta automática no cadastro (decisão de 30/08/2026)

Desde 30/08/2026 existe um segundo gatilho, além do botão manual: quando um
negócio novo termina o cadastro com nome e um link do Google válido, o banco
grava um pedido de coleta em `apify_auto_collection_queue`
(`supabase/migrations/20260830190000_coleta_apify_automatica_no_cadastro.sql`).
Uma vez por negócio, para sempre; nunca recorrente. O cadastro
(`src/pages/Onboarding.tsx`) não chama nada disso e não sabe que existe: se a
coleta falhar, o cadastro já terminou sem depender dela.

Quem de fato gasta é `supabase/functions/apify-auto-collect-on-signup`, que
lê essa fila e usa o mesmo núcleo guardado do piloto manual
(`supabase/functions/_shared/experimentalApifyCollection.ts`), respeitando a
mesma janela de 24 horas e o mesmo teto mensal. Alguém ainda precisa agendar a
execução dessa função (pg_cron, Supabase Scheduled Function ou cron externo);
isso é operação, não código.

```text
APIFY_AUTO_COLLECT_ON_SIGNUP_ENABLED=true
```

É o interruptor exclusivo da automação, independente de
`APIFY_EXPERIMENTAL_ENABLED`. Sem ele em `true`, o drenador nunca reivindica
uma linha da fila nem gasta um centavo. Quando o acesso Basic à Business
Profile API for aprovado, a coleta automática se desliga girando este segredo
para `false` (ou removendo-o), sem alterar código.

**Atenção ao teto mensal antes de ligar este interruptor**: automatizar a
coleta no cadastro multiplica o número de execuções por cadastro novo, e
`APIFY_EXPERIMENTAL_MONTHLY_RUN_LIMIT` continua documentado abaixo em 10, valor
posto quando a coleta era só o experimento manual. Subir esse número é decisão
de gasto de Marcelo, feita conscientemente no segredo, nunca no código.

## Limites de produto

- O dono informa um link público do Google; o botão é manual, não há agenda.
- A coleta pede no máximo 50 avaliações, ordenadas pelas mais recentes e com
  origem `google`.
- A coleta solicita o nome público e a URL pública direta da avaliação apenas
  para a fila temporária do navegador autenticado. Foto, ID e perfil do
  avaliador são descartados. Nome, texto e URL expiram em 14 dias, não entram
  em Supabase, exportações ou WhatsApp.
- O resumo persistido contém somente nome/endereço públicos do local, Place ID,
  nota/total públicos, distribuição por estrelas e quantidade de respostas do
  proprietário na amostra.
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
ser desligada. A coleta automática no cadastro se desliga primeiro, girando
`APIFY_AUTO_COLLECT_ON_SIGNUP_ENABLED` para `false`; o piloto manual pode
continuar existindo por mais tempo, controlado por `APIFY_EXPERIMENTAL_ENABLED`.
