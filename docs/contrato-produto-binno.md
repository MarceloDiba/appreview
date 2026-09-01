# Contrato de produto — Binno

**Estado:** aprovado por Marcelo em 20/08/2026.  
**Regra de mudança:** qualquer alteração desta arquitetura, destes comportamentos
ou da prioridade visual exige aprovação explícita de Marcelo. Uma refatoração
técnica não autoriza reduzir, ocultar ou substituir estes elementos.

**Posição consolidada em 20/08/2026:** esta é a base aprovada para evolução.
Novas capacidades entram de forma aditiva; não se troca fila, gráficos, QR,
temas, cartões laterais ou a camada de assessoria por uma tela simplificada.

Este documento é a referência de produto do Binno. `HANDOFF.md` registra o
estado operacional; `ESTADO.md` registra o backlog. Nenhum deles substitui
este contrato.

## 1. Papel do produto

O Binno é o **assessor de reputação no Google** de um pequeno negócio. Ele não
é apenas um gerador de QR nem uma cópia do painel do Google. Deve reduzir o
trabalho de interpretação do gestor, indicar uma prioridade concreta e ajudá-lo
a responder melhor, sempre deixando a decisão e a publicação sob seu controle.

Identidade de produto atual: **Binno**. AppReview permanece apenas como nome
histórico de repositório e documentos legados até uma migração intencional.

## 2. Invariantes não negociáveis

- A avaliação pública é sempre oferecida, qualquer que seja a nota. Nunca
  aplicar review gating, incentivo por nota ou recompensa por avaliação.
- Nunca apresentar dado ilustrativo, inferência ou amostra como dado oficial,
  completo ou real sem identificá-lo corretamente.
- O funil do QR termina em **clicou no Google**. Não afirmar que houve avaliação
  publicada sem uma evidência externa adequada.
- O Binno não publica respostas sozinho. O gestor revisa e decide; uma futura
  publicação via API exige conexão oficial, autorização e confirmação explícita.
- O QR público recebe somente os campos mínimos para apresentar o negócio e os
  destinos de avaliação. Perfil completo, telefone, assinatura e demais links
  do dono nunca podem ficar disponíveis por leitura anônima direta.
- Nome, texto e URL pública de uma avaliação obtidos no piloto Apify ficam por
  até 14 dias e não entram em cache agregado, briefing, WhatsApp, banco de
  auditoria ou perfil do avaliador.

  **Mudança de 31/08/2026, autorizada por Marcelo.** Até esta data eles ficavam
  só no navegador autenticado. A regra nasceu de cautela nossa, não de exigência
  externa, e cobrava um preço que só apareceu quando a coleta passou a rodar
  sozinha: uma coleta feita pelo servidor não tem navegador, então entregava
  números e nenhuma fila. Um cliente pagando pela coleta diária acordaria com os
  gráficos atualizados e a lista de avaliações a responder vazia, que é
  exactamente o que ele comprou.

  A razão para autorizar: estas avaliações já são públicas no Google, qualquer
  pessoa as lê no Maps, então guardá-las não expõe nada que já não esteja
  exposto.

  Passam a viver em `google_reviews_awaiting_reply`, com quatro limites que
  `scripts/check-fila-no-banco.mjs` protege: só as avaliações do próprio dono;
  os mesmos 14 dias, aplicados na limpeza e na leitura; leitura apenas do dono,
  sem política que deixe o navegador escrever; e **Brasil primeiro**, porque
  Portugal trata dado pessoal com regime mais exigente mesmo quando ele é
  público, e vender lá exige rever esta decisão em vez de herdar a resposta
  brasileira.

## 3. Arquitetura aprovada do painel

A navegação principal é uma tela única, sem seletor de abas: Visão geral,
Avaliações e WhatsApp deixaram de ser destinos separados em 30/08/2026 (ver
"Navegação em tela única" abaixo). Não reintroduzir seletor de abas, nem
destinos principais de Fotos, Perguntas ou Boas práticas, sem aprovação.

**Mudança de 31/08/2026, autorizada por Marcelo:** o WhatsApp volta a ser um
destino do menu principal, e só ele. Visão geral e Avaliações continuam onde
estão, e o seletor de abas continua proibido dentro de cada uma delas. A razão
está em "Painel que cabe no celular", abaixo.

A página segue esta ordem, inclusive na primeira dobra. **Aprovado por Marcelo
em 30/08/2026, apenas no celular** (abaixo do ponto de corte `lg`), um bloco
aditivo precede essa ordem: uma faixa-resumo com nota, total de avaliações e
quantas esperam resposta. Ele existe porque no celular a tela única vira um
rolo longo, e o contrato proíbe resolver isso com abas.

**Mudança de 31/08/2026, autorizada por Marcelo.** Até esta data havia um
segundo bloco aditivo ao lado da faixa-resumo, um índice fixo com atalhos para
os módulos. Ele saiu, e a razão está em "Painel que cabe no celular", abaixo.

Regras que a faixa-resumo não pode quebrar, e que têm guarda própria em
`scripts/check-painel-no-celular.mjs`:

- Só existe abaixo de `lg`. No ecrã grande a página aprovada fica intacta.
- A faixa-resumo não repete um módulo nem o dispensa: os cartões abaixo dela
  continuam inteiros.
- Quando a fila de respostas não existe neste aparelho, a faixa diz isso. Nunca
  mostra zero, que afirmaria "nada a responder" sem ter como saber.

A ordem dos módulos vem da regra de "Ordem por decisão", abaixo, e é esta:

**Faixa de Ação**, o que o dono precisa de decidir ou fazer agora:

1. **Radar do Binno**, quando e só quando ele tem alerta.
2. **Comentários internos**, quando há comentário privado sem tratar.
3. **Avaliações no Google**: uma avaliação por vez, comentário, nota, nome
   público quando disponível e resposta sugerida editável.

**Faixa de Mudança**, o que se mexeu desde a última vez:

4. **Volume de avaliações**: leitura em 12 semanas; quedas só quando há
   períodos comparáveis.
5. **Cada nota separada**: curvas não empilhadas de 5 a 1 estrelas, com alerta
   somente quando o histórico sustenta a comparação.
6. **O que mudou na semana**.

**Faixa de Referência**, o que ele consulta em vez de agir:

7. **Reputação no Google**.
8. **Do QR ao Google** e **Temas mais citados**: o primeiro mede intenção; o
   segundo conecta comentários a temas operacionais apenas quando há texto
   suficiente.
9. **Boas práticas**.
10. **Radar do Binno**, quando não há alerta.

**Mudança de 31/08/2026, autorizada por Marcelo.** Até "Ordem por decisão" esta
lista tinha cinco itens e outra sequência: a fila, o volume, as notas, o QR e os
temas, e uma coluna lateral com reputação, boas práticas e o que mudou na
semana. O Radar ficava sempre acima de tudo, com alerta ou sem ele, e a coluna
lateral abria com um **Plano de hoje**, que saiu inteiro no mesmo dia. A razão
das duas coisas está abaixo.

**Mudança de 31/08/2026, autorizada por Marcelo.** A coluna lateral tinha mais
dois cartões, **Resumo no WhatsApp** e **Completude do perfil**, e a página
terminava num item 6, a **Configuração do WhatsApp**. Os dois cartões saíram e
o item 6 virou um destino do menu. As razões, uma a uma, estão em "Painel que
cabe no celular", abaixo.

### Navegação em tela única (decisão de 30/08/2026)

**Aprovado por Marcelo em 30/08/2026**, depois do segundo uso real do
produto. Nas palavras dele: "Temos um submenu que não faz sentido que é
Visão Geral, avaliações (que não tem nada) e WhatsApp. Penso que deveria ser
tudo um só menu."

A aba Avaliações mostrava a fila de resposta pública, que depende da conexão
oficial com o Google, travada na fila de aprovação desde 21/08/2026. Para
toda conta real, a aba abria vazia. Uma aba vazia ensina que o produto tem
menos do que tem, e escondia a configuração do WhatsApp atrás de um clique
sem motivo.

Isto é maior que uma aba vazia: quatro das sete observações do dono naquele
dia eram a mesma causa. O painel foi montado em volta das avaliações do
Google, que ainda não funcionam, e o comentário privado, que é a única coisa
que funciona hoje, foi encaixado nas beiradas. Enquanto o Google não abrir, o
produto que existe é QR na mesa, comentário privado, aviso no WhatsApp, dono
resolve; a tela precisa refletir isso.

**A mudança:** o tipo `CockpitTab`, o estado de aba e o seletor somem de
`src/components/dashboard/ApprovedCockpitDashboard.tsx`. A ordem de 1 a 5
acima não muda de lugar: ela já era o conteúdo da antiga aba Visão geral e
continua a primeira coisa que o dono vê. A antiga aba Avaliações não vira uma
seção própria porque já era, byte a byte, a mesma Fila de respostas do item
1; a aba só duplicava o que a Visão geral já mostrava. A configuração
completa do WhatsApp (item 6) passa de aba para a última seção da página, e
fica sempre renderizada ali, nunca atrás de uma condição de aba.

**Superado em 31/08/2026, autorizado por Marcelo.** Os três parágrafos a
seguir descreviam a configuração do WhatsApp como a última seção desta página,
com âncora `#configuracao-whatsapp`, e nomeavam o cartão **Resumo no WhatsApp**
da coluna lateral. Nada disso existe desde 31/08: a configuração virou destino
próprio (`/whatsapp`) e o cartão saiu. Ficam aqui reescritos em vez de
apagados, porque a decisão de 30/08 que este bloco registra continua de pé e é
ela que explica por que a de 31/08 não é um recuo.

**A ordem segue uma regra:** o que tem prazo vem primeiro (o comentário
privado da exceção abaixo, depois a fila) e o que é leitura vem depois (volume,
notas, QR, temas e a coluna lateral fixada acima). Um comentário privado com
nota baixa expira porque o cliente pode sair do restaurante; uma avaliação
pública pode esperar um dia. A configuração do WhatsApp não expira nunca, e era
por isso que vinha por último; desde 31/08/2026 ela nem sequer está nesta
página, que é a forma mais forte da mesma regra.

**Superado em 31/08/2026, autorizado por Marcelo.** A regra acima é a mesma
intuição que "Ordem por decisão" leva até o fim, e fica escrita porque é dela
que a outra nasce. O que ela não fazia era ordenar o resto: tudo o que não tinha
prazo caía num mesmo balde de "leitura", e dentro desse balde a página
continuava a ser o inventário dos módulos na sequência em que foram
construídos. As três faixas dizem o que a regra do prazo deixava por dizer.

Os cartões que antes trocavam de aba (**Plano de hoje** e **Boas práticas**,
ambos na coluna lateral) agora levam a uma âncora na própria página
(`#fila-de-respostas`) por link nativo, não por clique de estado. Nenhum deles
fica sem destino. O terceiro era o **Resumo no WhatsApp**, que apontava para
`#configuracao-whatsapp`; os dois saíram juntos em 31/08/2026, o cartão e a
âncora, e a asserção que os protegia foi apagada em vez de reapontada.

**Mudança de 31/08/2026, autorizada por Marcelo.** O **Plano de hoje** saiu do
painel em "Ordem por decisão", e a sua asserção foi apagada em vez de
reapontada, pela mesma razão que a do Resumo no WhatsApp. Restam as **Boas
práticas**, que continuam a levar por link nativo à âncora que o próprio texto
promete. O rótulo do botão delas na variante de oportunidade era "Plano de
hoje", nome do cartão que saiu; passou a ser o mesmo rótulo da variante de força
observada, que diz o que o botão faz.

### Exceção aprovada em 30/08/2026: comentários que pedem atenção

Esta é a única exceção à ordem fixa acima, e existe porque o comentário
privado com nota baixa é a única coisa do produto que expira: o cliente ainda
está no restaurante, ou acabou de sair. Uma avaliação no Google pode ser
respondida amanhã sem perda; um comentário privado sem resposta não pode
esperar até o dono abrir a aba certa por conta própria. No primeiro uso real
do produto, o dono recebeu o alerta no WhatsApp de um comentário privado nota
3, abriu o `/dashboard` e não encontrou nada para agir: o comentário existia
em `/reviews`, dentro de uma aba, mas o painel que ele abre primeiro não tinha
superfície nenhuma para isso.

O bloco **Comentários que pedem atenção**
(`src/components/dashboard/PendingCommentsBanner.tsx`) aparece acima da Fila
de respostas somente quando existe pelo menos um caso em
`internal_feedback.is_addressed` diferente de verdadeiro. Um toque leva o
dono direto a `/reviews`, onde o caso pode ser tratado. Sem nenhum comentário
pendente, o bloco não renderiza nada e a Visão geral fica exatamente como a
ordem descrita acima, byte a byte. A exceção não desloca, esconde ou
substitui a Fila de respostas nem qualquer outro módulo desta lista; ela some
sozinha quando deixa de haver algo com prazo.

### Uma fila só para responder (decisão de 30/08/2026)

**Aprovado por Marcelo em 30/08/2026**, na mesma noite da tela única e depois
do segundo uso real. Nas palavras dele: "um lugar só para responder, com as
origens somadas em vez de separadas por aba. O dono não quer escolher entre
'privado' e 'Google': quer a próxima avaliação que precisa de resposta."

A página `/reviews` tinha três origens em superfícies separadas: o comentário
privado do QR (`CasesList`), a fila oficial do Perfil da Empresa
(`GoogleBusinessReviewQueue`) e a leitura pública do Google (`GoogleReviews`).
Duas delas dependem de uma ligação que nenhuma conta real tem hoje, então a
página abria com um convite para conectar e uma lista vazia por cima da única
coisa que funciona, que é o comentário privado. É o mesmo defeito que tirou o
seletor de abas do painel, uma tela adiante: uma superfície vazia ensina ao
dono que o produto tem menos do que tem.

**A mudança:** `src/pages/Reviews.tsx` deixa de ter `Tabs` e passa a renderizar
uma única `FilaDeRespostas`
(`src/components/dashboard/reviews/FilaDeRespostas.tsx`), que soma as três
origens numa lista só, do mais recente para o mais antigo, com a origem escrita
em cada item. A origem aparece porque decide para onde vai a resposta: o
comentário privado responde-se por mensagem directa a quem deixou contacto, a
avaliação do Google responde-se em público, na página do negócio. Ela não
aparece como aba porque o dono não escolhe origem, escolhe o próximo.

Regras que essa fila não pode quebrar, e que têm guarda própria em
`scripts/check-fila-unica.mjs`:

- Sem seletor de abas e sem escolha de origem antes de responder. As três
  superfícies separadas deixam de existir nesta página.
- A ordem inteira vem de `orderPendingCasesByRecency`
  (`src/lib/internalCasePriority.ts`), a mesma função que o bloco "Comentários
  que pedem atenção" da Visão geral usa. `src/lib/filaDeRespostas.ts` converte
  as três origens e devolve o resultado dela; não existe uma segunda ordenação,
  e as duas telas não podem discordar sobre qual é o próximo.
- Um item sem nota nunca desenha a escala de cinco estrelas, seja qual for a
  origem. Cinco estrelas apagadas é exatamente o que uma nota 1 desenha.
- A leitura pública do Google não devolve as respostas que o dono já publicou.
  Esses itens ficam na fila com o estado desconhecido dito uma vez, num único
  estado objetivo no módulo, e nunca com um estado inventado item a item.
- **Todo item tem de poder sair da fila.** Como o Binno não publica resposta
  nenhuma e a leitura pública não devolve as respostas publicadas, a avaliação
  pública só sai quando o próprio dono marca que já respondeu lá
  (`google_public_reviews_answered`, migração de 30/08/2026). O rótulo é na
  primeira pessoa dele, "Já respondi no Google", e nunca pode sugerir que o
  Binno respondeu ou publicou algo. Sem esse caminho, um dono com link do
  Google veria "N esperando resposta" para sempre, o estado vazio nunca
  apareceria, e um número que nunca desce ensina o dono a ignorar o número.
- **A mesma avaliação aparece uma vez só.** Com a ligação oficial ligada, a
  mesma avaliação chega pelas duas portas do Google com identificadores de
  espaços de nomes diferentes. A identidade é reconstruída por autor, nota e
  dia (`chaveDaAvaliacaoDoGoogle`), e a versão oficial é a que fica, por ser a
  única que sabe se já houve resposta.
- **A atribuição ao Google acompanha o conteúdo deles.** A fila mostra nome de
  avaliador e texto de avaliação, e os termos do Google exigem a atribuição
  onde esse conteúdo aparece. Ela fica acima da lista, junto do conteúdo, e o
  aviso de relevância acompanha quando há item vindo da leitura pública, que é
  a porta que devolve as avaliações escolhidas por relevância e não todas.
- **Uma atualização que falha não pode parecer uma que funcionou.** O botão
  Atualizar lê o resultado de cada fonte; quando alguma falha, a tela diz que
  nada foi atualizado, que a lista continua válida e o que fazer a seguir.
  Enquanto a sincronização oficial não termina, a contagem é de uma parte do
  perfil e a tela diz isso.
- Os itens já tratados continuam visíveis, abaixo da fila, como histórico:
  comentário privado resolvido e avaliação pública que o dono marcou. Fila e
  histórico não se misturam.

**Acréscimo de 31/08/2026, autorizado por Marcelo: um cartão de origens acima
da fila.** Duas linhas, "Mensagens privadas: N" e "Comentários no Google: N", e
tocar numa delas abre a mesma fila filtrada por aquela origem.

Isto concilia duas frases do dono que parecem contrárias. Em 30/08: "um lugar
só para responder, com as origens somadas em vez de separadas por aba". Em
31/08, depois de rever o painel no telemóvel: "deveria ter 2 caixas de
entrada". Ele não pediu duas caixas de entrada, pediu saber quanto tem de cada
lado antes de rolar a lista: as duas origens pedem coisas diferentes dele, uma
mensagem directa e um texto público, e a soma escondia essa conta. **Uma fila,
dois atalhos:** o padrão continua a lista inteira, do mais recente para o mais
antigo, e o cartão é um filtro, nunca uma segunda caixa de entrada.

Regras que esse cartão não pode quebrar, com guarda em
`scripts/check-fila-unica.mjs`:

- O padrão é sem filtro. A fila abre inteira, e o filtro é uma escolha que o
  dono faz e desfaz na mesma tela.
- Não é aba. As contagens são atalhos para a única fila que existe, não
  superfícies separadas. A proibição de `Tabs` nesta página continua de pé.
- A contagem de cada origem nasce da mesma fila somada que a lista desenha.
  Uma segunda contagem, lida de outra fonte, voltaria a poder discordar da
  lista, que é o defeito que a fila somada existe para não ter.
- Filtrar não reordena. A ordem continua inteira de
  `orderPendingCasesByRecency`, com o filtro aplicado depois dela.

**O que ficou pelo caminho, de propósito:** a escolha de localização e o título
da localização ligada (`selectLocation`, `locationTitle`) morreram com o cartão
oficial separado e não têm lugar numa fila somada. O convite para ligar o
Perfil da Empresa saiu por decisão anterior, a de 30/08/2026 sobre quem entrega
hoje: ele vive nas Configurações, e um estado vazio não se escreve na voz de
quem espera pelo Google. Os rótulos do botão de sincronizar saíram porque o
Atualizar da fila faz esse trabalho.

**O que não mudou, e por quê:** a Fila de respostas do painel (item 1 da ordem
aprovada acima) continua exatamente onde está, com as avaliações do Google que
a coleta própria traz. Ela e a fila de `/reviews` são duas superfícies do mesmo
conceito, e somar as duas mexeria na primeira dobra aprovada e na exceção dos
comentários que pedem atenção. Fica registrado como decisão pendente do dono,
não como mudança feita por conta própria. O bloco "Comentários que pedem
atenção" continua a levar a `/reviews`, agora à âncora da fila
(`#fila-de-respostas`) em vez de `#casos-internos`.

### Botões que cabem no cartão, no celular (correção de 30/08/2026)

Na Avaliações, no telemóvel do dono, "Atualizar", "Abrir o Google para
responder" e "Marcar como resolvido" saíam para fora do cartão. A causa é a
mesma nos três: uma linha de ação que continuava a ser linha no celular, com
botões que não podem encolher nem quebrar, porque `whitespace-nowrap` vem do
próprio componente `Button`. Um botão nessas condições força a largura mínima
da linha inteira, e a linha passa da caixa. `flex-wrap` não resolve sozinho: a
quebra acontece entre botões, e um botão mais largo do que a caixa transborda
na mesma.

A regra, com guarda em `scripts/check-fila-unica.mjs`: nas telas de resposta,
nenhuma linha de ação é uma linha abaixo de `sm`, e todo botão de ação ocupa a
largura do cartão no celular (`w-full sm:w-auto`). No ecrã grande tudo volta a
ser a linha de sempre.

### Painel que cabe no celular (decisões de 31/08/2026)

**Aprovado por Marcelo em 31/08/2026**, depois de rever o painel no próprio
telemóvel, com a demonstração a um interessado marcada para a quarta-feira
seguinte, num portátil e num telemóvel.

Várias das decisões abaixo contrariam o que este contrato protegia até hoje.
Está correto: elas ficam escritas aqui, com a data e a razão, para serem
deliberadas em vez de acontecerem por descuido. Um documento separado
descrevendo o mesmo painel acabaria por discordar deste, e este projeto já
pagou por isso mais de uma vez.

**O que sai da tela, em todas as versões, e não só no celular:**

- **"O que falta no seu perfil do Google"** (completude do perfil). Sem a
  ligação oficial, o cartão nunca teve o que medir: mostrava um traço e uma
  barra a zero em toda conta real. Uma barra vazia não é um estado neutro, é
  uma acusação sem prova.
- **"Resumo no WhatsApp"**, o cartão da coluna lateral. Ele era um atalho para
  a configuração que agora tem destino próprio no menu, e repetia na lateral
  aquilo que o menu passa a dizer melhor.
- **"Deu resultado?"** (resultado observado). Ele só tinha o que dizer depois
  de o dono marcar uma ação e de chegar uma leitura seguinte, o que nunca
  aconteceu numa conta real. Até lá ocupava um cartão inteiro para dizer que
  ainda não sabe.
- **O índice fixo do celular** (`MobileIndex`), acrescentado horas antes. No
  telemóvel do dono ele aparecia cortado, e o menu principal já faz o trabalho
  de levar a pessoa a cada destino.
- **Os ícones decorativos nos títulos de cartão** (a estrela cintilante, o
  glifo do QR, o balão de mensagem e afins). No celular eles comem largura de
  um texto que já está apertado. Um ícone só fica onde carrega informação que
  o texto não carrega, como a severidade de um alerta.
- **Quatro blocos de texto, por inteiro:** "O que o WhatsApp faz hoje"; a
  opção de notificação "Perfil do Google", com o corpo "Lembretes sobre
  horários, fotos e informações do perfil quando a conexão oficial estiver
  ativa"; "Escolha o que quer receber no seu WhatsApp. Neste piloto..."; e, na
  Avaliações, a frase que explicava que o Google não informa quais avaliações
  já foram respondidas. Os três primeiros explicam uma limitação em vez de
  dizer o que fazer; o quarto pedia ao dono que guardasse na cabeça uma
  limitação de API para poder usar um botão que já se explica sozinho.

Consequência para a secção 4 deste contrato: a lista de avisos que o gestor
escolhe receber passa a ser resumo semanal, avaliações que pedem resposta,
Alertas do Radar e comentário privado. A opção "melhorias do Perfil do Google"
sai da tela. O campo continua a existir no banco e nas preferências, para não
apagar a escolha de quem já a fez; o que sai é a linha que a oferece.

**O Radar passa a ser, no máximo, uma linha.** Ele abria a página e enchia a
primeira dobra sem dizer nada accionável: no estado de acompanhamento eram
quatro linhas de texto a explicar que não havia nada a fazer. Continua a ser a
faixa que abre a página, e continua proibido de inventar uma fragilidade: os
critérios de alerta, oportunidade e força observada da secção "Leitura de
reputação e recomendações" não mudam. O que muda é o tamanho: uma linha, e o
ícone só quando há alerta, porque aí ele carrega a severidade.

**O WhatsApp deixa de aparecer em todas as telas e vira destino do menu
principal.** Isto não reabre o seletor de abas de 30/08/2026, e a diferença
importa: aquilo era um submenu dentro de uma tela, com uma aba que abria vazia;
isto é uma entrada no menu principal, ao lado de Painel, Avaliações, QR Codes e
Configurações, que abre uma tela cheia. A configuração inteira (as
preferências, o número e o teste) muda-se para lá. A ordem de 30/08 dizia que
configuração vem por último porque não tem prazo; ter destino próprio é a forma
mais forte da mesma regra, porque tira a configuração da frente de quem abriu o
painel para responder alguém.

**A ligação do WhatsApp vira um teste só:** "Teste o seu WhatsApp com o Binno e
depois guarde o nosso número." Depois de o teste passar, a tela mostra apenas
que a ligação está ativa e um botão para refazer o teste.

Aqui há um limite honesto, e ele é regra, não detalhe de implementação. O
Binno não tem como perguntar ao WhatsApp se está ligado. O que ele sabe é o
estado da última mensagem de teste em `whatsapp_outbox`: `queued` e `sending`
dizem que a mensagem está na fila; `accepted` diz que a chamada HTTP do
retransmissor ao OpenWA devolveu 2xx com um id de mensagem; `delivered` e
`read` vêm do webhook `message.ack` e dizem que ela chegou; `failed` diz que
falhou. A sessão local do piloto (`useLocalWhatsApp`) só existe em
desenvolvimento e nunca serve de prova em produção; e o backend responder ao
pedido de preferências prova que o backend está de pé, não que exista uma
ligação de WhatsApp.

**Correção de 31/08/2026, na auditoria desta mesma mudança.** A frase acima
dizia que `accepted` significa "o retransmissor entregou ao WhatsApp". Não
significa: significa que o OpenWA respondeu 2xx, e uma sessão despareada que
ainda responda 200 nesse endpoint seria lida como ligação ativa. Ele continua
a contar como prova, e é uma decisão: `delivered` e `read` dependem do webhook
estar registado no servidor, e sem `accepted` uma instalação sem webhook nunca
conseguiria confirmar um teste que funcionou. O risco residual é coberto pela
janela de prova, abaixo.

Então: **a tela só diz "ligação ativa" quando a última mensagem de teste
chegou ao estado `accepted`, `delivered` ou `read`.** Em `queued` ou `sending`
ela diz que a mensagem saiu e que ainda não há confirmação. Em `failed` ela diz
que falhou e oferece repetir. Sem teste nenhum, ela oferece o teste. Nunca
afirma uma ligação que não foi confirmada, que é a mesma regra da secção 2
sobre não apresentar inferência como facto.

**E só enquanto essa prova for recente: sete dias** (`JANELA_DE_PROVA_EM_DIAS`,
decidido em 31/08/2026 na auditoria). "Funcionou uma vez" não é "está de pé
agora": a sessão do OpenWA despareia, e sem janela um `delivered` de há seis
semanas fazia a tela dizer "ligação ativa" para sempre. Sete dias porque é a
cadência do próprio produto, o resumo é semanal: passada uma semana sem
nenhuma confirmação, o Binno não tem observação dessa semana para sustentar a
afirmação. Passado o prazo, a tela diz que o teste já não é recente o bastante
e oferece outro.

**Uma regra só, sem atalho ao lado.** A primeira versão desta tela tinha um
`aceiteLocal ? 'ativa' : ...` antes da função: em `npm run dev`, um OpenWA
local a responder 2xx punha "ligação ativa" na tela sem linha nenhuma na
outbox. Uma regra honesta com um atalho ao lado é o atalho, não a regra. O
estado da tela vem da função e de mais nada.

**E o teste tem de poder ser refeito.** Depois do primeiro teste bem sucedido,
"Refazer o teste" limpava variáveis e recarregava; a linha antiga continuava
lá, o estado voltava a "ativa" e o mesmo painel redesenhava-se. O formulário
ficava inalcançável para sempre, e o guarda exigia esse beco. O botão tem de
devolver o formulário e permitir um teste novo, e quem entra nele com a ligação
ativa tem de conseguir voltar sem testar.

**O último teste é consultado como último teste.** A tela pescava-o de uma
lista de dez entregas de qualquer tipo; dez avisos mais recentes empurravam-no
para fora e um dono com a ligação a funcionar lia "nunca testou". Era um
defeito que piorava quanto mais o produto entregasse. A consulta é filtrada por
`kind = 'test'` no servidor.

O painel não pode regredir para uma primeira dobra composta apenas por nota,
total de avaliações e gráficos genéricos do Google. Fila, resposta sugerida,
forças, fragilidades e próximo passo são o centro do produto.

### Ordem por decisão (decisão de 31/08/2026)

**Aprovado por Marcelo em 31/08/2026**, no mesmo dia em que o painel foi revisto
no telemóvel dele, com a demonstração a um interessado marcada para a quarta
seguinte, num portátil e num telemóvel.

**A regra:** a página começa pelo que muda o dia do dono e termina no que ele
apenas consulta.

Ela substitui a ordem anterior, e é preciso dizer o que essa ordem era, porque
ninguém a tinha decidido: era o inventário dos módulos na sequência em que foram
construídos, escrita para um portátil e depois congelada neste contrato. Cada
correção da semana encurtou a página num cartão, e no dia seguinte ela estava
longa outra vez, porque o problema nunca foi o número de cartões. Era a ordem.

São três faixas:

- **Ação.** O que ele precisa de decidir ou fazer agora: os comentários internos
  à espera, as avaliações do Google à espera de resposta, a reputação no Google,
  e o Radar quando ele tem um alerta de verdade.

  *A reputação subiu da Referência para cá em 01/09/2026, a pedido de Marcelo:
  "suba Reputação no Google para o lado de Avaliações no Google, assim a pessoa
  enxerga as métricas mais importantes de uma só vez". É uma excepção declarada
  à regra desta secção, e não uma revogação dela: a reputação continua a ser
  leitura e não decisão, e está aqui porque é a leitura que o dono quer ver ao
  mesmo tempo que a fila, não porque tenha passado a ser uma acção. Nenhum outro
  módulo de consulta sobe por este precedente sem uma decisão própria.*
- **Mudança.** O que se mexeu desde a última vez: o volume de avaliações, cada
  nota separada, o que mudou na semana. Só quando existe histórico que sustente
  a comparação; sem ele, estes módulos dizem isso e ficam pequenos.
- **Referência.** O que ele consulta em vez de agir: o QR
  para o Google, os temas mais citados, as boas práticas, e o Radar quando ele
  está calmo.

**O Radar muda de faixa conforme o que tem a dizer.** É o mesmo módulo e a mesma
regra de conteúdo: ele nunca inventa uma fragilidade, e quando está calmo diz
isso numa linha. O que muda é o lugar. Um alerta é decisão de hoje e abre a
página; "nada precisa de você agora" é leitura de consulta e fecha. Ocupar a
primeira dobra do telemóvel para dizer que não há nada a fazer é o mesmo defeito
de tamanho que a decisão de "Painel que cabe no celular" já tinha atacado, só
que noutro formato.

**As faixas são declaradas no DOM, não num comentário.** Cada uma é uma
`<section data-faixa="acao|mudanca|referencia">`. Um comentário a dizer onde
começa a Referência desaparece na primeira refatoração sem que nada perceba; um
atributo é uma construção que o guarda lê e que qualquer pessoa vê no inspetor.
Não há rótulo visível de faixa na tela: a ordem é a regra, e um título a dizer
"Ação" acima de um cartão que já diz "Avaliações no Google" é o mesmo tipo de
texto que Marcelo mandou sair do painel no mesmo dia.

**Isto é uma reordenação, não um corte.** Nenhum módulo sai da tela por causa
desta decisão, e nenhum deixa de aparecer numa das duas versões. A do ecrã
grande e a do telemóvel mostram os mesmos módulos na mesma sequência. A coluna
lateral única deixou de existir: cada faixa tem a sua, com os cartões curtos
daquela faixa, para que o portátil não fique com uma coluna de cartões largos e
a ordem continue a mesma nos dois aparelhos. **A lateral por faixa durou um dia:
ver "Faixas sem buraco" abaixo, que a substitui sem tocar na ordem.**

### Faixas sem buraco (decisão de 01/09/2026)

**Estado:** autorizada por Marcelo em 01/09/2026, nas palavras dele: "continuamos
mal estruturados e com espaços vazios".

Isto muda o DESENHO das faixas e não muda a ordem. Ação continua primeiro,
Mudança segunda e Referência última; cada módulo continua na faixa que a decisão
de 31/08/2026 lhe deu; dentro da faixa a sequência continua a mesma, e é essa
sequência que o telemóvel lê. Nenhum módulo saiu, fundiu-se com outro ou trocou
de lugar.

**O que estava errado, medido no ecrã e não deduzido do código.** A lateral por
faixa segurava um único cartão curto: "O que mudou na semana" na Mudança, "Boas
práticas" na Referência. A coluna larga ao lado tinha dois ou três cartões e era
sempre muito mais alta. No portátil, a 1280, o que sobrava do lado direito eram
dois retângulos de fundo vazio de cerca de 340x590 e 340x500. Era isso que ele
estava a ver.

**O que passa a valer.** Cada faixa é a mesma grade de três colunas, e os
cartões emparelham por altura em vez de se empilharem numa lateral: o cartão
largo ocupa duas colunas, o cartão curto ocupa a terceira ao lado dele, e o
cartão que precisa de largura ocupa a linha inteira por baixo. Nenhuma coluna
fica sozinha a segurar a altura da faixa. No telemóvel a grade é uma coluna só,
como já era, e a sequência não muda.

**As faixas alinham ao topo.** Sem isso a grade estica cada cartão até à altura
do vizinho mais alto, e o vazio não desaparece: entra para dentro do cartão. Era
assim que o "Do QR ao Google" ficava com 137px de branco por baixo do último
número. Um cartão com um buraco dentro é pior do que um intervalo entre cartões,
porque o buraco parece conteúdo em falta.

**Um traço separa as faixas, e continua sem haver rótulo.** A regra de não
escrever "Ação" acima de um cartão que já diz o que é continua inteira; o que
entra é um traço, que não escreve nada. Ele existe porque sem ele todos os
intervalos da página mediam quase o mesmo, 24px entre faixas contra 20px entre
cartões da mesma faixa, e a fronteira entre "o que fazer" e "o que mudou" era o
mesmo acontecimento visual que a fronteira entre dois cartões vizinhos. O
intervalo entre faixas passa a ser maior que o intervalo dentro delas, e é essa
diferença, e não o traço sozinho, que faz as três lerem-se como três grupos.

O guarda é `npm run check:faixas-sem-buraco`.

**O "Plano de hoje" sai, em todas as versões.** Nas palavras de Marcelo, ele
"não soma em nada".
Ele lia a mesma `getAdvisorReading` do Radar e escrevia o que já estava na tela:
com o Radar calmo repetia o Radar; com alerta repetia o alerta; nas variantes de
oportunidade e de força observada o corpo dele era, palavra por palavra, o corpo
das Boas práticas, porque os dois cartões liam as mesmas chaves. A única coisa
que era só dele, o botão "Marcar como feito", já não tinha leitor desde que o
"Deu resultado?" saiu, horas antes; ver a linha sobre a marcação em "Camada de
assessoria adicionada".

**Um módulo sem evidência continua presente e encolhe para uma linha.** O padrão
nasceu nos "Temas mais citados" em 31/08/2026 e passa a valer para todo módulo
que possa ficar vazio: em vez de um cartão inteiro com um traço dentro, uma
linha que diz o que aparece ali quando houver algo e o que o dono faz para que
apareça, na voz de "Quem entrega hoje". Isto não é esconder: o título continua
na tela, na faixa dele. Vale para o volume, para cada nota separada, para o que
mudou na semana, para o QR e para as duas metades da reputação que dependem da
amostra. A nota e o total de avaliações nunca encolhem, porque são lidos do
próprio perfil e nunca faltam.

Onde a evidência é parcial, o módulo não encolhe. "Cada nota separada" com
distribuição e sem histórico mostra a percentagem de cada nota, que é evidência
de verdade, e deixa o "antes" em traço. "Do QR ao Google" com zero aberturas
mostra zero, porque zero é uma medida: o QR está na mesa e ninguém o leu. O que
encolhe é a ausência de leitura, não o resultado baixo. **Emendado em
01/09/2026:** evidência parcial continua a abrir o módulo, mas evidência
pequena de mais para ser lida passou a encolher, e a diferença entre as duas
está na secção "Gráfico com amostra pequena" abaixo.

### Primeira dobra do portátil (decisão de 01/09/2026)

**Estado:** autorizada por Marcelo em 01/09/2026, nas palavras dele: "poderia
dividir a tela ao meio e apresentar mais coisas na primeira dobra".

Isto muda o DESENHO da faixa de Ação e não muda a ordem. Ação continua
primeiro, os comentários internos continuam antes da fila de respostas na
sequência do DOM, que é a que o telemóvel lê, e nenhum módulo saiu, fundiu-se
com outro ou trocou de faixa.

**O que estava errado, medido no ecrã.** A faixa de Ação era a única das três
que não usava a largura: era uma pilha, e a 1280 os seus dois cartões ocupavam
a largura toda um debaixo do outro. Na primeira dobra do portátil do dono
cabiam "Comentários internos" e "Avaliações no Google", e mais nada, quando
cabiam quatro módulos.

**O que passa a valer.** A faixa é a mesma grade de três colunas das outras
duas. A repartição segue o que cada cartão tem de deixar ler, e não o tamanho
que calharia ter: a fila de respostas é onde o dono lê uma avaliação inteira e
um rascunho inteiro, e leva duas colunas; a reputação no Google leva a terceira,
ao lado dela. O bloco de comentários internos atravessa a faixa inteira, acima
das duas, porque um comentário privado com nota baixa expira e tem de ser a
primeira coisa que ele vê. No telemóvel continua a ser uma coluna só, e a ordem
é a da decisão: o que expira, o que ele veio fazer, e a leitura por último.

**REVISTO NO MESMO DIA, algumas horas depois.** A versão da manhã punha os
comentários internos na terceira coluna e fazia a fila TROCAR de largura
conforme eles existissem, porque eles desaparecem numa conta em dia e a coluna
ficaria vazia. Com a reputação nessa coluna, que está sempre desenhada, a
coluna deixou de poder ficar vazia e a largura variável deixou de ter o que
resolver: uma largura condicional agora seria pior, porque sem comentário
interno a fila esticaria por cima da reputação. A regra que aquela condicional
servia continua inteira, e é "Faixas sem buraco"; mudou a construção que a
cumpre. Para a faixa poder decidir isto, a leitura de `internal_feedback` subiu
para o painel: é a MESMA leitura
de antes, feita uma vez só, e a lista que decide a largura é a mesma que
desenha o cartão. Nunca podem discordar porque são a mesma lista.

O guarda é `npm run check:faixas-sem-buraco`.

### Gráfico com amostra pequena (decisão de 01/09/2026)

**Estado:** autorizada por Marcelo em 01/09/2026, depois de ver "Cada nota
separada" na conta dele: 100% / 0% / 0% / 0% / 0% e cinco linhas rectas, com
10 avaliações.

**A regra:** um gráfico desenhado a partir de história de menos é ruído com ar
de informação, e encolhe pela mesma regra dos módulos sem evidência.

**O número é 20 avaliações**, e sai de uma conta e não de gosto. Uma
percentagem repartida por cinco notas move-se em degraus de 100/N pontos: com
10 avaliações o degrau é de 10 pontos, e este cartão chama "atenção" a
qualquer descida das 5 estrelas ou subida das notas 1 e 2. Abaixo de 20, o
cartão anuncia a CHEGADA de uma avaliação como se fosse uma mudança do
negócio. A 20 o degrau desce para 5 pontos e as duas janelas de quatro semanas
que ele compara passam a ter conteúdo.

**A base contada é a amostra que o Binno buscou**, a mesma que a nota de rodapé
do cartão já nomeia, e não um total qualquer do perfil. É também o número que o
dono reconhece: ele sabe quantas avaliações tem, não quantas caíram dentro das
últimas oito semanas.

**O módulo continua presente**, como esta secção exige de todos: o título fica
na tela, na faixa dele, e a linha honesta diz quantas avaliações há hoje e a
partir de quantas o gráfico aparece. São duas frases diferentes para dois
motivos diferentes de encolher, porque o que o dono faz a seguir é diferente:
sem leitura nenhuma falta o Binno procurar; com leitura pequena faltam
avaliações, e o que ele faz é pôr o QR na mesa.

O guarda é `npm run check:ordem-por-decisao`.

### Camada de assessoria adicionada

- A fila de respostas, volume, notas, QR, temas, reputação e alteração semanal
  permanecem módulos consolidados. Uma evolução de assessoria não autoriza
  redesenhá-los, fundi-los ou reduzir o seu conteúdo. **Mudança de 31/08/2026:**
  a completude do perfil saiu desta lista porque o cartão saiu do painel, e o
  WhatsApp saiu porque virou destino próprio; ver "Painel que cabe no celular".
- A ausência de uma coleta Apify no navegador **não** autoriza o painel
  autenticado a renderizar a arquitetura legada. Quando só houver resumo já
  confirmado do negócio, o mesmo cockpit aprovado é exibido com `—` nos
  módulos sem evidência; a tela antiga não é um fallback permitido.
  **Mudança de 31/08/2026:** o módulo sem evidência continua presente, mas
  encolhe para uma linha honesta em vez de desenhar um traço num cartão
  inteiro; ver "Ordem por decisão".
- O **Radar do Binno** é uma faixa adicional aos módulos aprovados e permanece
  visível. Com evidência, mostra risco, oportunidade ou força observada; sem
  evidência suficiente, usa um estado curto de acompanhamento e não inventa
  uma fragilidade. **Mudança de 31/08/2026:** essa faixa passa a ser, no
  máximo, uma linha, e o ícone só aparece quando há alerta; ver "Painel que
  cabe no celular". **Mudança de 31/08/2026:** ela deixa de ficar sempre acima
  de tudo e passa a mudar de faixa conforme o que tem a dizer, com alerta em
  Ação e sem alerta em Referência; ver "Ordem por decisão". O **Plano de hoje**
  saiu do painel na mesma decisão, e a frase que o dava como permanente nesta
  linha saiu com ele.
- Esta camada é obrigatoriamente adicional. Ela não pode deslocar, esconder ou
  substituir fila, volume, notas, QR, temas, reputação ou boas práticas.
  **Mudança de 31/08/2026:** o **Resultado observado**, que ficava depois da
  mudança semanal, saiu do painel; ver "Painel que cabe no celular".
- **Marcar uma ação como feita deixou de existir em 31/08/2026**, autorizado
  por Marcelo. A regra era que a marcação fosse um toque local, sem criar caso,
  responsável, prazo ou burocracia, e que a leitura seguinte só pudesse dizer se
  o sinal voltou a aparecer. O botão vivia no **Plano de hoje** e quem lia a
  marcação era o **Resultado observado**; os dois saíram, e desde o primeiro a
  marcação já não tinha leitor nenhum. Fica escrita aqui, e não apagada, porque
  a regra continua a valer no dia em que a marcação voltar a ter para onde ir.
- Uma oportunidade positiva pode complementar Boas práticas com uma expressão
  repetida em elogios reais. Nunca cria uma prova social a partir de texto ou
  nome de avaliador sem aprovação explícita do gestor.

### Fila e resposta sugerida

- Exibir o nome público real retornado pela fonte. Se a fonte não o devolver,
  usar o estado honesto “Cliente sem nome disponível”; nunca inventar um nome.
- Exibir o texto e a nota da avaliação selecionada quando a fonte os devolver.
- **Copiar e abrir esta avaliação** copia o rascunho e abre somente o permalink
  daquela avaliação. Não usar o link geral do negócio como substituto.
- Sem permalink individual, oferecer apenas **Copiar resposta**. O botão não
  pode insinuar que levará ao comentário correto.
- Editar, pular e avançar fazem parte da fila. Marcação local não é confirmação
  de publicação no Google.
- **O rascunho passou a ler a avaliação (decisão de 31/08/2026).** Marcelo, no
  mesmo dia: "a sugestão de resposta dentro do app não reconhece o idioma que
  foi escrito automaticamente e não entende o contexto do que foi dito e gera
  apenas uma resposta padrão". A fila pede o rascunho à função
  `sugerir-resposta`, que lê o texto do cliente. `src/lib/replySuggestions.ts`
  **não saiu**: passou de fonte do rascunho a chão do rascunho. Cinco regras,
  todas presas por `scripts/check-rascunho-que-le.mjs`:
  1. O texto padrão está na caixa no primeiro quadro. Nunca há caixa vazia nem
     roda a girar onde antes havia rascunho.
  2. Qualquer falha fica com o texto padrão: rede, 4xx, 5xx, rascunho recusado
     pela própria função, resposta vazia ou demora. Um modelo quebrado não pode
     quebrar a fila.
  3. O que o dono escreveu ganha de tudo. Uma resposta atrasada do modelo não
     entra por cima do texto dele, nem por cima de uma caixa que ele apagou.
  4. Uma chamada por avaliação, na sessão, guardada por id da avaliação. Uma
     avaliação a que ele volta não é paga de novo, e uma que falhou não é
     repetida a cada volta.
  5. A caixa diz de onde veio o que está nela, em três palavras e sem jargão.
- O Binno continua a não publicar nada em nome do dono. O que sai da função é um
  rascunho que ele lê, edita e cola, exatamente como o texto padrão sempre foi.
- **As duas telas dizem a mesma coisa.** A fila do painel e a fila de `/reviews`
  rascunham resposta para a mesma avaliação, e uma política só decide o que está
  na caixa nas duas (`src/lib/rascunhoDoModelo.ts`). Uma cópia local dessa
  decisão, em qualquer arquivo, é erro de guarda: duas cópias voltariam a poder
  discordar sobre a mesma pessoa, que é a classe de defeito que a fila somada e
  a ordem única já existem para não ter.
- **Em `/reviews`, o rascunho do modelo é um cartão a mais, nunca uma variante
  reescrita.** Aquele painel mostra várias variantes do molde, cada uma com o
  seu título e a sua dica ("Curta e directa", "A escolha segura quando ainda não
  sabe o que correu mal"). Pôr o texto do modelo debaixo desses rótulos seria uma
  etiqueta a mentir sobre o que está na caixa. O cartão do modelo entra à frente,
  com nome próprio, e as variantes ficam intactas por baixo.
- **A recusa da função cobre português, espanhol e inglês.** A função manda o
  modelo responder no idioma do cliente, então uma lista de bloqueio só em
  português deixava passar um *discount*, um *refund*, um *descuento* ou uma
  *devolución*: uma dívida que o dono nunca autorizou, na língua que a defesa não
  lia. Uma quarta língua de cliente entra na lista antes de entrar no resto. A
  lista é um bloqueio, não uma garantia: ela não entende o texto, e a última
  defesa continua a ser o dono ler antes de enviar, que é por que o Binno não
  publica.
- **Copiar não é escrever.** O rascunho guardado por avaliação só existe quando
  o dono escreveu na caixa. Enquanto copiar gravava o que estava no ecrã, um
  toque em "Copiar e abrir avaliação" transformava o texto padrão em autoria
  dele, e a avaliação nunca mais podia ser lida pelo modelo, em nenhuma sessão.
- **Uma avaliação, um identificador.** `idDaFila` monta a chave de toda
  avaliação, em todas as telas. Com duas chaves para a mesma avaliação ela era
  paga duas vezes e rendia dois textos diferentes, para o mesmo cliente, em duas
  telas do mesmo produto.
- **A demonstração pública mostra o produto, não o plano B.** A etiqueta de
  origem é para o dono. Em `binno.pro` e `/demo` não há dono nem modelo, e
  estampar "Texto padrão" ali explicava o nosso plano B a quem devia estar a ver
  o produto a funcionar.
- **O rascunho do modelo tem dois canais, e a diferença é de regras.**
  *Alterado em 01/09/2026, a pedido de Marcelo ("quero que resolva o privado
  também"). Até essa data esta cláusula dizia que o comentário privado não
  passava pelo modelo, e a razão era boa: a função `sugerir-resposta` só sabia
  falar em público, e as regras dela recusam qualquer promessa de reparação.
  Essa recusa é certa em público e errada em privado, onde oferecer resolver é
  exactamente o que o dono quer dizer, e onde o molde já tem uma variante
  inteira para isso (`com-reparacao`). A cláusula não foi relaxada: a função
  ganhou o segundo canal que faltava.*

  `public` é a resposta que o dono publica debaixo da avaliação, para
  desconhecidos lerem. Nela a função **recusa qualquer promessa de reparação**:
  oferecer dinheiro, desconto ou refeição em público ensina o próximo leitor que
  uma avaliação de uma estrela vale dinheiro.

  `private` é o recado directo a quem deixou contacto no formulário do QR, que
  mais ninguém lê. Nela a função **permite oferecer resolver**, e recusa no lugar
  **trocar seja o que for por apagar, mudar ou melhorar uma avaliação pública** —
  a mesma proibição que a dica da variante `com-reparacao` já escrevia ao dono, e
  que passou a ser verificada no texto em vez de confiada ao modelo. Trocar
  reparação por avaliação viola as políticas do Google e pode custar a ficha do
  cliente.

  **A variante do português segue o país do negócio, nos dois canais.** O modelo
  escreve na língua do cliente, mas a língua não escolhe a variante: sem
  instrução, ele cai no português do Brasil. Ao provar o canal privado em
  01/09/2026, os quatro rascunhos saíram em brasileiro para um negócio em
  Portugal, que é onde está o piloto. A regra é a mesma de `resolveContentLocale`
  no molde, de propósito: só `business_country` exactamente `'BR'` vira
  brasileiro; ausente, vazio ou qualquer outro país cai em Portugal. Duas regras
  diferentes para a mesma decisão dariam ao dono um molde numa variante e um
  rascunho noutra, na mesma tela.

  O canal viaja no corpo do pedido, do painel até à função, e o **padrão é
  `public`**: um chamador que não conheça o campo recebe o canal com as regras
  mais apertadas. Fixar o canal num literal no painel ou na fila é proibido — é
  o que mandaria todo comentário privado pela lista do público com tudo o resto
  aparentemente correcto. Guardado por `scripts/check-canal-do-rascunho.mjs`,
  que corre as duas listas lado a lado, e por `check-rascunho-que-le.mjs`, que
  mede quem escolhe o canal.

### Leitura de reputação e recomendações

- O Radar deve responder de modo evidenciado: **o que ajuda o negócio** e **o
  que o deixa mais frágil agora**.
- Uma **fragilidade/alerta** só existe com período comparável, aumento relevante
  de notas baixas e causa repetida nos comentários. Uma **oportunidade** só
  existe com frase repetida em elogios reais. Uma **força observada** pode usar
  somente tema positivo agregado com quantidade de menções. Sem qualquer um
  desses critérios, o Radar informa que segue acompanhando: não inventa risco,
  tendência, causa ou oportunidade.
- Temas recorrentes só viram oportunidade ou alerta com comentários e contexto
  suficientes; comentário → tema → ação operacional.
- Boas práticas aparecem como um box na Visão geral, uma orientação por vez,
  com rotação estável e prioridade para respostas pendentes quando houver
  evidência. Não são uma aba prioritária nem uma lista de explicações longas.
- A mudança semanal não recebe percentual, melhora ou queda quando a fonte não
  permite medir. O estado curto e neutro é preferível a um número inventado.
  **Mudança de 31/08/2026:** a completude do perfil saía nesta mesma regra e
  deixou de existir como cartão, porque um estado neutro permanente ocupava a
  lateral sem nunca ter o que dizer; ver "Painel que cabe no celular".

## 4. WhatsApp

- O telefone preenchido no onboarding (`profiles.phone`) é o destinatário
  inicial tanto das notificações quanto da prévia manual. Uma edição já feita
  pelo gestor nunca é sobrescrita.
- A tela distingue sem ambiguidade: WhatsApp do gestor para avisos e WhatsApp
  próprio/equipa para teste manual; nunca usa o número de um cliente para teste.
- O gestor escolhe o que quer receber: resumo semanal, avaliações que pedem
  resposta, **Alertas do Radar** e comentário privado deixado no QR, além de
  dia, hora e consentimento. **Mudança de 31/08/2026, autorizada por Marcelo:**
  a opção "melhorias do Perfil do Google" saiu da tela, porque prometia
  lembretes que só existiriam com a conexão oficial ligada. O campo continua no
  banco, para não apagar a escolha de quem já a fez; ver "Painel que cabe no
  celular".
- **A ligação do WhatsApp é um teste só** (decisão de 31/08/2026): "Teste o seu
  WhatsApp com o Binno e depois guarde o nosso número." A tela só afirma que a
  ligação está ativa quando a última mensagem de teste chegou a `accepted`,
  `delivered` ou `read` em `whatsapp_outbox`. Em `queued` ou `sending` diz que
  saiu e ainda não há confirmação; em `failed` diz que falhou. Não existe outra
  prova de ligação: a sessão local do piloto só existe em desenvolvimento, e o
  backend responder não prova ligação nenhuma.
- Alertas do Radar comunicam somente anomalia elegível e a causa recorrente
  observada. Forças e boas práticas são mostradas no painel e entram no resumo
  apenas quando o conteúdo correspondente tiver evidência suficiente.
- OpenWA atual é somente um piloto local. Depois de uma **coleta manual**
  iniciada pelo gestor, pode enviar um alerta ao próprio número configurado se
  houver consentimento, sinal elegível e sessão local ligada. Continua sem
  agenda, webhook, retry, importação de conversas ou operação de produção.

## 5. Fontes de dados e integrações

### Apify temporário

- É uma leitura pública experimental limitada, manual, com teto de 50
  avaliações, intervalo mínimo de 24 horas e sem agenda automática.
- Serve para validar a fila, os temas e o painel enquanto a conexão oficial
  estiver em preparação; não se apresenta como conexão oficial do Google.
- A coleta pede os campos públicos de nome e permalink. Aceitar somente campos
  específicos de URL da avaliação (`reviewUrl`, `reviewURL`, `reviewLink` ou
  `reviewUri`); o campo genérico `url` não é um permalink confiável.

### Perfil da Empresa no Google

- A conexão oficial desbloqueia fila completa, estado real das respostas,
  histórico oficial e publicação confirmada. Continua dependente da autorização
  adequada do Google.
- Até isso acontecer, o Binno não deve esconder a limitação nem prometer que
  sincronizou uma fila completa.

### Quem entrega hoje (decisão de 30/08/2026)

A ordem das duas fontes acima está invertida em relação ao que o painel dizia
até esta data, e a inversão é do dono.

- Quem entrega hoje é a coleta própria. Ela traz nome público, texto, link e o
  estado de resposta de cada avaliação, que é tudo o que a fila precisa.
- O Binno nunca publica uma resposta no Google: ele leva a resposta até lá. O
  único valor que a API oficial acrescenta é ler, e a coleta própria já lê.
  Por isso a conexão oficial é um **upgrade** (histórico completo do perfil,
  em vez das mais recentes), nunca um pré-requisito.
- Consequência para o texto do painel: nenhum módulo pode ser escrito na voz de
  quem espera pelo Google. Um estado vazio diz o que aparece ali quando houver
  algo, e o que o dono faz agora para que apareça. A conexão oficial só pode
  ser mencionada como o passo que melhora, nunca como o passo que falta.
- O que continua sendo dito: o teto de 50 avaliações por busca, a retenção de
  14 dias no navegador, a ausência de agenda e o fato de o Binno não publicar
  nada no lugar do dono. Limite real continua escrito; o que sai é o tom de
  pedido de desculpa por existir.

## 6. Regra de apresentação

- Linguagem curta, orientada a decisão e sem blocos de jargão técnico para o
  gestor.
- Oculte explicações repetitivas de coleta, retenção e limitações. Quando uma
  limitação for necessária, use um único estado objetivo no módulo afetado.
- Preservar o layout aprovado: fundo claro, cartões brancos compactos, azul
  `#2457D6` para ações e violeta `#6D43C0` como assinatura. Não trocar os
  gráficos aprovados por barras ou placeholders por conveniência.

## 7. Guarda de regressão

`npm run verify` executa `npm run check:product-contract`. Ele protege os
trechos verificáveis deste contrato: composição consolidada, presença
permanente do Radar, integração do telefone de onboarding,
ação de resposta com permalink individual, coleta de nome público, rejeição
do URL genérico e a única exceção à primeira dobra: o bloco de comentários
que pedem atenção some por completo sem caso sem tratar e, quando existe,
fica antes da fila de respostas. Desde 30/08/2026 também protege a navegação
em tela única: nenhum estado nem seletor de aba no componente, a fila de
respostas aparecendo uma única vez (a antiga aba Avaliações não pode voltar a
duplicá-la), a fila e a configuração do WhatsApp com âncora própria e única
na página, os cartões que antes trocavam de aba linkando para essas âncoras
em vez de chamar um estado que não existe mais, e a configuração do WhatsApp
sempre renderizada, nunca atrás de uma condição de aba. A fila do painel
passou a receber `businessCountry`, e as asserções que casavam a tag inteira
passaram a exigir também essa prop: continuam a contar ocorrências e a exigir
`queue`, `snapshot` e `demo`, e ganharam a garantia de que o país do negócio
chega à resposta sugerida.

**Mudança de 31/08/2026 nos guardas.** As decisões acima apagaram regras que
estes scripts fixavam, e reapontar cada asserção fazia parte da decisão, não
foi um efeito colateral dela. O que mudou, e por quê:

- A asserção da coluna lateral deixou de exigir "Resumo no WhatsApp" e
  "Completude do perfil", porque os dois cartões saíram. Ela passou a exigir
  também que eles NÃO voltem: um cartão removido por decisão volta sozinho na
  próxima refatoração se nada o proibir.
- A asserção do Resultado observado saiu da linha que pedia Radar, Plano e
  Resultado juntos. Radar e Plano continuam exigidos; o Resultado observado
  virou uma proibição, pela mesma razão.
- A asserção da configuração do WhatsApp deixou de exigir que ela esteja no
  painel, porque ela mudou-se para `/whatsapp`. No lugar dela ficam três: o
  painel não renderiza a configuração, a rota existe em `src/App.tsx` protegida
  por autenticação, e o menu principal leva até lá nas duas versões, a de ecrã
  grande e a do celular.
- As asserções da âncora e do link do WhatsApp no painel foram apagadas em vez
  de reapontadas: a âncora deixou de existir, e uma asserção sobre um id que
  ninguém desenha ficaria verde sem proteger nada.
- O guarda do índice do celular
  (`scripts/check-painel-no-celular.mjs`) perdeu as asserções sobre
  `MobileIndex` e `MOBILE_SECTIONS`, pela mesma razão, e ganhou a proibição de
  o índice voltar. A faixa-resumo continua protegida como estava.
- A asserção do único `<nav>` do painel virou a proibição de qualquer `<nav>`
  no painel: o único permitido era o índice do celular, e ele saiu.
- Guardas novos, e cada um deles foi provado vermelho quebrando exatamente a
  regra que nomeia: o Radar cabe numa linha e não desenha o ícone fora do
  alerta; nenhum título de cartão do painel carrega ícone decorativo; os quatro
  blocos de texto removidos não voltam a nenhum dos três catálogos; e a tela do
  WhatsApp só afirma ligação ativa a partir dos estados de entrega que provam
  entrega.

`npm run verify` executa também `npm run check:fila-unica`, que protege a fila
só de `/reviews`: sem abas na página, uma fila só, as três origens somadas pelo
módulo compartilhado, a origem escrita em cada item, a atribuição ao Google
presa à presença de conteúdo do Google, a falha de atualização visível ao dono,
o aviso de sincronização incompleta, o estado de avaliação sem texto, o perfil
do avaliador, e nenhuma linha de ação que seja linha no celular. Esta última é
medida por linha, e não por arquivo: a versão anterior perguntava se o arquivo
tinha alguma linha que empilha, e dois destes arquivos têm duas, então reverter
uma delas passava. `npm run check:shared-case-ordering` passou a provar
a ordem sobre a fila somada, e `npm run check:reply-locale-br` passou a compilar
duas amostras para provar que esquecer o país do negócio é erro de compilação.

Em 31/08/2026 esse mesmo guarda ganhou o cartão de origens: as duas contagens
nascem da fila somada, o filtro começa vazio, filtrar não reordena, e a frase
que explicava que o Google não devolve as respostas já publicadas não pode
voltar a nenhum dos três catálogos.

**Mudança de 31/08/2026 nos guardas, pela ordem por decisão.** Vale aqui a mesma
regra do bloco anterior: reapontar cada asserção fazia parte da decisão. O que
mudou, e por quê:

- `npm run verify` passou a executar `npm run check:ordem-por-decisao`, um
  guarda novo. Ele exige que as três faixas existam na ordem certa, que cada
  módulo esteja na sua, e que cada módulo continue a ser desenhado uma única vez
  (sem esta segunda metade, apagar um módulo deixava a asserção da faixa verde
  por vacuidade). Exige também as duas colocações do Radar a partir do mesmo
  booleano, uma negada, que é o que garante que ele aparece exatamente uma vez;
  que o "Plano de hoje" não deixe restos no código nem nos três catálogos; e que
  cada módulo que pode ficar vazio calcule o vazio a partir da ausência da
  evidência, desenhe a linha honesta nesse ramo e mantenha o corpo pesado fora
  de alcance quando não há o que mostrar.
- A asserção "painel mantém a fila antes das métricas" ficou como estava. Ela
  continua verdadeira por outra razão: a fila é a faixa de Ação e o volume é a
  de Mudança. Quem prova as faixas inteiras é o guarda novo.
- A asserção da coluna lateral deixou de falar em coluna lateral, porque a
  coluna única deixou de existir: os três cartões que ela guardava vivem agora
  em faixas diferentes. O que ela media de verdade era "os três continuam na
  página", e é isso que ela passa a dizer.
- A asserção "Plano de hoje linka para a âncora da fila" foi apagada em vez de
  reapontada. O componente saiu, e ela lia o corpo de um componente ausente como
  string vazia: uma asserção que fica verde sem proteger nada.
- A asserção dos três cartões removidos passou a ser dos quatro, com o "Plano de
  hoje" na lista de proibidos, pela mesma razão dos outros: um cartão removido
  por decisão volta sozinho na próxima refatoração se nada o proibir.
- A asserção "Radar e Plano de hoje são adicionais" perdeu o Plano e ficou só
  com o Radar.
- A asserção "Radar e Plano permanecem visíveis sem alerta severo" foi
  reescrita, porque não conseguia falhar pela regra que dizia proteger: ela
  conferia que uma chamada a `getAdvisorReading` existia em algum lugar do
  arquivo, e essa chamada existe em três componentes. Agora ela lê o corpo do
  Radar e exige que a linha de acompanhamento seja a última alternativa da
  cadeia, sem retorno nulo antes dela. Devolver `null` no estado calmo, que é a
  forma óbvia de o esconder, fica vermelho.

O teste não substitui
revisão de produto: qualquer mudança visual ou de fluxo ainda deve ser
comparada com este documento antes de ser aceita.
