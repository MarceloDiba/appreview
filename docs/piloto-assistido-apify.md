# Piloto assistido Apify

Este é o modo temporário do Binno enquanto a API oficial do Perfil da Empresa
do Google não está aprovada. Ele valida o valor do assessoramento sem se
apresentar como conexão oficial.

## O que o piloto faz

1. Uma coleta manual limitada lê até 50 avaliações públicas recentes.
2. O servidor grava apenas URL, data, estado, contagens e temas agregados para
   limite de custo e auditoria.
3. Quando a fonte trouxer texto, a coleta devolve ao navegador autenticado uma
   fila temporária com o **nome público** e a **URL pública da avaliação**. Não
   devolve foto, ID ou perfil do avaliador. Ela expira em 14 dias e não é
   guardada no Supabase.
4. O gestor revisa e altera um rascunho, copia a resposta e abre a avaliação
   pública específica no Google para publicar por conta própria. Se a fonte não
   trouxer URL da avaliação, o Binno abre o perfil público do negócio e deixa
   esse limite claro no botão.
5. O estado local distingue `rascunho`, `copiada`, `marcada pelo gestor` e
   `resposta observada na nova leitura pública`.
6. O briefing pode ser preparado no painel e enviado pelo WhatsApp local apenas
   com destinatário e confirmação explícitos.

## O que o piloto não afirma

- Não é a fila completa do Perfil da Empresa.
- “Marcada pelo gestor” não é confirmação do Google.
- Uma resposta visível numa nova coleta é observação pública, não retorno da
  API oficial.
- Abrir ou clicar no Google pelo QR não significa que uma avaliação foi
  publicada.
- Nenhuma resposta é publicada automaticamente.
- O nome público e o link da avaliação não formam uma fila oficial nem devem
  ser exportados, enviados por WhatsApp ou persistidos fora do navegador do
  titular durante o piloto.

## Passagem real de sete dias

Antes de iniciar, cadastrar `APIFY_API_TOKEN` pelo canal seguro, deixar
`APIFY_EXPERIMENTAL_ENABLED=true` apenas no ambiente de piloto e definir
`APIFY_EXPERIMENTAL_MONTHLY_RUN_LIMIT` que mantenha o teto autorizado.

No dia 1, coletar a linha de base, revisar uma resposta com o gestor e enviar
um briefing manual para o número consentido. Nos dias seguintes, fazer no
máximo uma coleta por negócio a cada 24 horas. No dia 7, comparar as leituras,
o número de respostas copiadas/marcadas e os eventos QR de abertura e clique.

O piloto é aprovado como hipótese de produto somente se o gestor usar a fila ou
o briefing para decidir e agir; a aprovação futura do Google não muda esse
critério, apenas automatiza a fonte e confirma estados.
