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
- Nome, texto e URL pública de uma avaliação obtidos no piloto Apify ficam só
  no navegador autenticado, por até 14 dias. Não entram em cache agregado,
  briefing, WhatsApp, banco de auditoria ou perfil do avaliador.

## 3. Arquitetura aprovada do painel

A navegação principal é restrita a **Visão geral**, **Avaliações** e
**WhatsApp**. Não reintroduzir abas de Fotos, Perguntas ou Boas práticas como
destinos principais sem aprovação.

A Visão geral segue esta ordem, inclusive na primeira dobra:

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
ação de resposta com permalink individual, coleta de nome público e rejeição
do URL genérico. O teste não substitui revisão de produto: qualquer mudança
visual ou de fluxo ainda deve ser comparada com este documento antes de ser
aceita.
