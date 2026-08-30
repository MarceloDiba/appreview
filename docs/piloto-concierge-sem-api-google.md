# Piloto concierge sem a API Business Profile

Reescrito em 29/08/2026. A versao anterior foi escrita antes de tres mudancas
que alteram o piloto: o WhatsApp passou a entregar mensagem em 29/08, o fluxo do
QR deixou de perguntar satisfacao antes de oferecer o Google em 14/08, e o
mercado passou a ser o Brasil em 28/08.

Objetivo: provar o valor do Binno com um negocio real antes da aprovacao da API
Business Profile, sem inventar dado nem tratar clique como avaliacao publicada.

Material de abordagem: `~/binno/docs/comercial/convite-piloto-brasil.md`.

## A pergunta que este piloto responde

**O dono age quando e avisado?**

Nao e sobre volume de leituras do QR, nem sobre a nota subir. E sobre uma pessoa
receber um aviso no celular e fazer alguma coisa com ele. Se isso acontecer, ha
produto. Se nao acontecer, nenhuma funcionalidade nova conserta.

## O que este piloto valida

- o QR fisico abre o negocio certo, no idioma certo, com os links corretos;
- o cliente pode seguir para o Google sem qualquer filtro pela nota;
- o comentario privado chega ao dono **no WhatsApp dele, na hora**, quando a
  nota e 3 ou menos;
- o dono entende o aviso sem explicacao tecnica e consegue agir;
- aberturas do QR, cliques para o Google e comentarios privados permitem ler o
  uso do caminho, sempre como intencao, nunca como avaliacao publicada.

## O que este piloto nao afirma

- total completo de avaliacoes sem resposta;
- idade da ultima foto, horarios ou dados completos do Perfil da Empresa;
- que um clique no Google virou uma avaliacao;
- que o Binno causou alteracao na nota ou no total do Google;
- publicacao de respostas no Google pelo Binno.

Esses pontos so entram depois da aprovacao Basic, do consentimento OAuth do
titular e da sincronizacao integral da localizacao.

## Preparacao antes de entregar o cartao

1. Obter o aceite do titular para o piloto e para o acesso ao painel.
2. Criar a conta do estabelecimento com o **pais do negocio igual a BR**. Esse
   campo, e nao o telefone, define mercado e idioma do cartao impresso.
3. Cadastrar o **link de avaliacao do Google no formato que abre a caixa de
   estrelas**, tipo `g.page/r/.../review`. O link comum do Maps leva ao perfil e
   o cliente tem que achar o botao sozinho. O titular pega o link certo no
   proprio Perfil da Empresa, em "Pedir avaliacoes".
4. Cadastrar o **WhatsApp do dono** com o consentimento dele, e **enviar uma
   mensagem de teste na frente dele**. A entrega leva alguns segundos. Se nao
   chegar, o piloto nao comeca: o aviso e o produto.
5. Criar o QR **a partir de `binno.pro`**, nunca de uma previa. O endereco fica
   permanente enquanto o QR existir, e o cartao vai para o papel.
6. Registrar a fotografia manual de partida, feita pelo titular no proprio
   Perfil da Empresa: data, nota exibida e total exibido. E referencia manual,
   nao importacao nem chamada a API.
7. Executar o checklist ponta a ponta de `docs/checklist-piloto-e2e.md` antes de
   entregar o cartao.

A migration de metricas ja esta aplicada em producao desde 15/08. Nao ha nada a
publicar antes do piloto.

## Roteiro de sete dias

| Momento | Acao | Evidencia valida |
| --- | --- | --- |
| Dia 0 | Entregar o QR e explicar em uma frase: "leva o cliente ao seu Google, e se alguem reclamar por aqui voce recebe no WhatsApp na hora". Enviar a mensagem de teste na frente dele e confirmar que chegou. | cartao impresso, leitura no celular e uma mensagem recebida |
| Dias 1 a 6 | Deixar o QR no ponto combinado. O dono nao precisa abrir o painel: se houver reclamacao, ele e avisado. | aberturas, cliques e comentarios registrados; nao chamar clique de avaliacao |
| Dia 3 | Conversa curta com o titular: chegou algum aviso? O que voce fez quando chegou? O QR esta acessivel? O link abre o lugar certo? | relato do titular, e a linha correspondente em `whatsapp_outbox` |
| Dia 7 | Comparar a fotografia manual inicial com o Perfil da Empresa atual e revisar o uso no painel. | duas observacoes datadas do proprio Google e os eventos do Binno |

## Criterio de decisao

O piloto e util se o titular consegue, sem explicacao tecnica:

1. dizer para onde o QR leva o cliente;
2. distinguir clique de avaliacao publicada;
3. contar o que fez quando recebeu um aviso;
4. dizer se manteria o QR porque reduz o esforco de acompanhar a reputacao.

O item 3 e o que decide. Os outros tres podem passar e ainda assim o produto nao
servir, se ninguem agir quando avisado.

Nao usar numero minimo inventado como condicao de sucesso. Se nao houver
movimento no periodo, registrar ausencia de uso. Nao concluir que o produto
funcionou nem que falhou.

## Depois da aprovacao do Google

O mesmo estabelecimento pode ser o primeiro a consentir OAuth. A comparacao
passa a incluir sincronizacao paginada, respostas pendentes reais e evidencia de
origem, sem recomecar o piloto.
