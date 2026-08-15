# Piloto concierge sem a API Business Profile

Objetivo: testar o valor do Binno com um negócio real antes da aprovação da
API Business Profile, sem inventar dados nem tratar um clique como avaliação
publicada.

## O que este piloto valida

- o QR físico abre o negócio, o idioma e os links públicos corretos;
- o cliente pode seguir para Google ou TripAdvisor sem qualquer filtro pela nota;
- o comentário privado opcional chega ao dono como sinal para agir;
- o dono entende a prioridade e a sugestão editável sem depender de uma nova
  operação de casos;
- as aberturas do QR, cliques públicos e comentários privados permitem ler o
  uso do caminho — sempre como intenção, não como avaliação publicada.

## O que não afirma

- total completo de avaliações sem resposta;
- idade da última foto, horários ou dados completos do Perfil da Empresa;
- que um clique no Google virou uma avaliação;
- que o Binno causou uma alteração na nota ou no total do Google;
- publicação de respostas no Google pelo Binno.

Esses pontos só entram depois da aprovação Basic, consentimento OAuth do
titular e sincronização integral da localização.

## Preparação antes de abrir ao cliente

1. Escolher um estabelecimento já acompanhado pela agência e obter o aceite do
   seu titular para o piloto e para o acesso ao painel.
2. Criar ou confirmar a conta do estabelecimento, o nome, o link Google e o QR
   físico. Não reutilizar dados de outro cliente.
3. Registar uma fotografia manual de partida, feita pelo titular no próprio
   Perfil da Empresa: data, nota exibida e total exibido. É referência manual,
   não importação nem chamada à API.
4. Aplicar o lote de métricas e publicar a versão que contém
   `review_funnel_events`. Sem a migration, o QR continua a funcionar, mas não
   há medição persistida do caminho.
5. Executar o checklist ponta a ponta em
   `docs/checklist-piloto-e2e.md` antes de entregar o cartão.

## Roteiro de sete dias

| Momento | Ação | Evidência válida |
| --- | --- | --- |
| Dia 0 | Entregar QR e explicar em uma frase: “leva o cliente ao seu perfil no Google; o painel mostra os sinais que merecem atenção”. | cartão impresso e teste de leitura no telemóvel |
| Dias 1–6 | Deixar o QR no ponto combinado. O dono só abre o painel quando houver comentário privado ou no check-in combinado. | aberturas, cliques e comentários registados; não chamar clique de review |
| Dia 3 | Check-in curto com o titular: QR está acessível? O link abre o perfil certo? Alguma resposta precisa de revisão? | relato do titular e qualquer sinal recebido |
| Dia 7 | Comparar a fotografia manual inicial com o Perfil da Empresa atual e rever o uso do QR no painel. | duas observações datadas do próprio Google e eventos do Binno |

## Critério de decisão do piloto

O piloto é útil se o titular consegue, sem explicação técnica extra:

1. identificar para onde o QR leva o cliente;
2. distinguir clique de avaliação publicada;
3. localizar um comentário privado ou uma sugestão de resposta quando existir;
4. dizer se manteria o QR e o briefing porque reduzem o esforço de acompanhar a
   reputação.

Não usar números mínimos inventados como condição de sucesso. Se não houver
movimento no período, registar ausência de uso — não concluir que o produto
funcionou ou falhou.

## Depois da aprovação Google

O mesmo estabelecimento pode ser o primeiro a consentir OAuth. A comparação
passa então a incluir sincronização paginada, respostas pendentes reais e
evidência de origem, sem recomeçar o piloto.
