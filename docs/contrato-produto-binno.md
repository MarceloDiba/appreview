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
- Nome, texto e URL pública de uma avaliação obtidos no piloto Apify ficam só
  no navegador autenticado, por até 14 dias. Não entram em cache agregado,
  briefing, WhatsApp, banco de auditoria ou perfil do avaliador.

## 3. Arquitetura aprovada do painel

A navegação principal é uma tela única, sem seletor de abas: Visão geral,
Avaliações e WhatsApp deixaram de ser destinos separados em 30/08/2026 (ver
"Navegação em tela única" abaixo). Não reintroduzir seletor de abas, nem
destinos principais de Fotos, Perguntas ou Boas práticas, sem aprovação.

A página segue esta ordem, inclusive na primeira dobra:

1. **Fila de respostas** — uma avaliação por vez, comentário, nota, nome público
   quando disponível e resposta sugerida editável.
2. **Volume de avaliações** — leitura em 12 semanas; quedas só quando há períodos
   comparáveis.
3. **Cada nota separada** — curvas não empilhadas de 5 a 1 estrelas, com alerta
   somente quando o histórico sustenta a comparação.
4. **Do QR ao Google** e **Temas mais citados** — o primeiro mede intenção; o
   segundo conecta comentários a temas operacionais apenas quando há texto
   suficiente.
5. Coluna lateral: **Reputação no Google**, **Resumo no WhatsApp**, **Boas
   práticas**, **Completude do perfil** e **O que mudou na semana**.
6. **Configuração do WhatsApp**: notificações e teste manual do piloto, ao fim
   da página porque é configuração, não é prazo nem leitura.

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

**A ordem segue uma regra:** o que tem prazo vem primeiro (o comentário
privado da exceção abaixo, depois a fila), o que é leitura vem no meio
(volume, notas, QR, temas e a coluna lateral fixada acima), e o que é
configuração vem por último (WhatsApp). Um comentário privado com nota baixa
expira porque o cliente pode sair do restaurante; uma avaliação pública pode
esperar um dia; a configuração do WhatsApp não expira nunca.

Os cartões que antes trocavam de aba (**Plano de hoje**, **Boas práticas** e
**Resumo no WhatsApp**, todos na coluna lateral) agora levam a uma âncora na
própria página (`#fila-de-respostas` e `#configuracao-whatsapp`) por link
nativo, não por clique de estado. Nenhum deles fica sem destino.

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

O painel não pode regredir para uma primeira dobra composta apenas por nota,
total de avaliações e gráficos genéricos do Google. Fila, resposta sugerida,
forças, fragilidades e próximo passo são o centro do produto.

### Camada de assessoria adicionada

- A fila de respostas, volume, notas, QR, temas, reputação, WhatsApp,
  completude e alteração semanal permanecem módulos consolidados. Uma evolução
  de assessoria não autoriza redesenhá-los, fundi-los ou reduzir o seu conteúdo.
- A ausência de uma coleta Apify no navegador **não** autoriza o painel
  autenticado a renderizar a arquitetura legada. Quando só houver resumo já
  confirmado do negócio, o mesmo cockpit aprovado é exibido com `—` nos
  módulos sem evidência; a tela antiga não é um fallback permitido.
- O **Radar do Binno** é uma faixa adicional antes desses módulos e permanece
  visível. Com evidência, mostra risco, oportunidade ou força observada; sem
  evidência suficiente, usa um estado curto de acompanhamento e não inventa
  uma fragilidade. O **Plano de hoje** é um cartão adicional na coluna lateral
  e também permanece visível, levando à próxima revisão útil. O **Resultado
  observado** fica após “O que mudou na semana”.
- Esta camada é obrigatoriamente adicional: Radar acima da grade; Plano de hoje
  na coluna lateral; Resultado observado depois da mudança semanal. Eles não
  podem deslocar, esconder ou substituir fila, volume, notas, QR, temas,
  reputação, WhatsApp, boas práticas ou completude.
- Ação marcada pelo gestor é um toque local, não cria caso, responsável, prazo
  ou burocracia. A leitura seguinte só pode dizer que o sinal voltou ou não
  voltou a aparecer; nunca confirma sozinho uma melhoria operacional.
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
- Completude e mudança semanal não recebem percentual, melhora ou queda quando
  a fonte não permite medir. O estado curto e neutro é preferível a um número
  inventado.

## 4. WhatsApp

- O telefone preenchido no onboarding (`profiles.phone`) é o destinatário
  inicial tanto das notificações quanto da prévia manual. Uma edição já feita
  pelo gestor nunca é sobrescrita.
- A tela distingue sem ambiguidade: WhatsApp do gestor para avisos e WhatsApp
  próprio/equipa para teste manual; nunca usa o número de um cliente para teste.
- O gestor escolhe o que quer receber: resumo semanal, avaliações que pedem
  resposta, **Alertas do Radar** e melhorias do Perfil do Google, além de
  dia, hora e consentimento.
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
permanente do Radar/Plano/Resultado, integração do telefone de onboarding,
ação de resposta com permalink individual, coleta de nome público, rejeição
do URL genérico e a única exceção à primeira dobra: o bloco de comentários
que pedem atenção some por completo sem caso sem tratar e, quando existe,
fica antes da fila de respostas. Desde 30/08/2026 também protege a navegação
em tela única: nenhum estado nem seletor de aba no componente, a fila de
respostas aparecendo uma única vez (a antiga aba Avaliações não pode voltar a
duplicá-la), a fila e a configuração do WhatsApp com âncora própria e única
na página, os cartões que antes trocavam de aba linkando para essas âncoras
em vez de chamar um estado que não existe mais, e a configuração do WhatsApp
sempre renderizada, nunca atrás de uma condição de aba. O teste não substitui
revisão de produto: qualquer mudança visual ou de fluxo ainda deve ser
comparada com este documento antes de ser aceita.
