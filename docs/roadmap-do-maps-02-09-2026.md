# Roadmap do Binno Maps — 02/09/2026

**Critério de ordem, nas palavras de Marcelo:** «prioridade pro cliente é o que
ajuda a vender e aumentar avaliações».

**De onde vem.** Marcelo trouxe seis concorrentes de fora do Brasil em
01/09/2026: [Weiver](https://www.getweiver.com/) (Canadá),
[GBPPromote](https://gbppromote.com/), [FiveUp](https://www.fiveup-review.io/)
(França), [Starboard-G](https://starboard-g.com/lp.html) (Japão),
[ReviewAutomate](https://reviewautomate.com/) (EUA) e
[Avisora](https://avisora.ca/) (Quebec). Três leituras independentes dos mesmos
seis — a minha, a do Fable e a do ChatGPT — chegaram à mesma conclusão
estrutural, e é a que abre este documento.

---

## O que os seis fazem e o Binno não fazia

**Eles empurram o pedido de avaliação; o Binno esperava que o cliente visse o QR.**

Weiver dispara quando o serviço é marcado como concluído. ReviewAutomate liga-se
à maquininha (Square, Toast, Clover). Avisora dispara quando uma chamada não é
atendida. FiveUp manda por WhatsApp com relance ao segundo dia.

Isto importa mais para o Brasil do que parece: na lista de prospecção de Aracaju,
**veterinário e oficina são 29 dos 68 negócios**, e nenhum dos dois tem balcão
onde um QR seja visto.

**Estado:** resolvido em parte, em 02/09/2026. O convite existe e o dono envia-o
com um toque, do telemóvel dele — sem canal novo, sem API aprovada, sem custo.
Falta o resto, que está nos itens 2 e 3 abaixo.

---

## O que o Binno tem e nenhum dos seis vende

**Não filtra, e isso é argumento de venda.** Weiver, FiveUp e Avisora pedem a
nota primeiro e só mandam ao Google quem deu 4 ou 5. A política do Google proíbe
solicitação seletiva, e perfis apanhados nisso perdem avaliações.

Verificado no código em 02/09: o QR do Binno mostra as duas portas lado a lado,
sem perguntar a nota. Havia um sítio onde o produto filtrava — o aviso ao dono só
mandava convidar quem deu 4 ou 5 — e foi corrigido nesse dia.

**A frase que isto compra:** «avaliações que o Google não vai apagar.»

---

## A ordem

### 1. Relatório semanal por e-mail — DECIDIDO EM 02/09/2026

Aprovado por Marcelo, depois de ele perguntar se deixar o cliente escolher o
canal (WhatsApp, Telegram, SMS, e-mail) valeria a economia.

**A economia é real e pequena:** cerca de 35 mensagens por mês por cliente, o
que dá algo como R$ 2 a R$ 8 no WhatsApp. Sobre uma mensalidade de R$ 150, são
1 a 5%. Não é aí que está o dinheiro.

**As razões que valem:**
- **O e-mail funciona já.** O WhatsApp oficial está por aprovar e o caminho
  actual viola os termos da Meta. O e-mail é o único canal que serve qualquer
  cliente hoje, sem esperar por ninguém.
- **É o formato certo para um relatório.** Longo, com as barras das notas, os
  temas e o histórico. No WhatsApp isso vira um bloco de texto.
- **Aviso urgente e relatório semanal não são a mesma coisa.** Um comentário de
  uma estrela tem de chegar em minutos ao canal que o dono abre. O resumo de
  segunda pode ser lido ao café.

**Não construir SMS.** No Brasil custa mais que uma mensagem de utilidade do
WhatsApp e cabe em 160 caracteres sem formatação: paga-se mais para entregar
pior.

### 2. O convite na fila inteira

Hoje ele aparece só ao lado do comentário mais recente, e não existe em
`/reviews`, que é para onde o botão do próprio cartão manda. Apanhado na revisão
final de 02/09.

### 3. Lembrete do convite

FiveUp faz relance ao segundo dia; ReviewAutomate e Avisora também. Multiplica o
item 2 e exige guardar que o convite foi enviado.

### 4. Alerta de mudança no perfil do Google

GBPPromote vende isto como «proteção de perfil». Qualquer pessoa pode sugerir
uma edição ao horário ou ao telefone de um negócio, e o dono não sabe.

**É o mais barato de todos**, porque a coleta já existe: comparar dois retratos e
avisar quando horário, telefone ou categoria mudarem. Vende segurança, não
marketing — e dono de negócio compra seguro contra estrago mais depressa do que
compra mais avaliações.

### 5. Alerta em avaliação pública baixa

Starboard-G avisa em até 12 horas; ReviewAutomate e Avisora também. O Binno
avisa no comentário privado e **não avisa** numa avaliação pública baixa.
Depende da coleta diária.

### 6. Denúncia de avaliação maliciosa

Só o Starboard-G faz, dos seis. Uma estrela falsa de concorrente é dor real e
comum no Brasil. O Binno já lê as avaliações; detectar padrão suspeito e ajudar
o dono a montar a denúncia é concreto. Ele não remove nada: assiste.

### 7. Aprovar a resposta pela mensagem, sem abrir o painel

Ideia do Fable. Avisora responde sozinha; Starboard e GBPPromote deixam o
rascunho no painel. **Ninguém faz o dono aprovar respondendo «1» na mensagem.**
Cumpre a promessa de não viver dentro do painel de um jeito que não existe no
mercado.

### 8. NFC no balcão

ReviewAutomate vende «review stands»; a Avisora **dá a placa NFC de graça** como
isca. Um objecto no balcão converte mais que um papel, e dar de brinde justifica
cobrar instalação — a mesma lógica já decidida no Binno Web.

### 9. Perguntas e Respostas do perfil

Nenhum dos seis toca nisto. Clientes perguntam no Google, ninguém responde, e o
dono pode semear as perguntas certas. É gratuito e ninguém olha.

### 10. Ler as avaliações dos concorrentes do bairro

GBPPromote rastreia posição, não o que os clientes reclamam do vizinho. «Os seus
três concorrentes são criticados por demora; venda rapidez» é um argumento que
só o Binno daria, e a coleta já existe.

### 11. Aquisição: ferramentas grátis e páginas por segmento

GBPPromote usa gerador de QR e auditoria de perfil como isca de lead. A Avisora
tem página de venda por segmento (restaurante, oficina, clínica, salão). Para
venda por anúncio, as duas baixam o custo por lead — e a segunda liga-se
directamente à lista de Aracaju, onde a procura é veterinário e oficina.

---

## O que não copiar

**Auto-resposta publicada sem o dono.** Todos os seis fazem. O contrato do Binno
diz que ele nunca publica, e isso não é atraso: evita risco de política do Google
e mantém a voz do dono. Vender como diferença, não corrigir como falta.

**Recepcionista de IA e cartão de fidelidade** (Avisora). São outros produtos.

**SMS.** Ver item 1.

**Review gating.** Ver a secção acima. É a nossa vantagem, não uma lacuna.

---

## O que a leitura confirmou que já está certo

- O roteamento do QR (feliz vai ao Google, insatisfeito vai ao privado, sem
  filtro) é o coração do Weiver e do FiveUp.
- A síntese de pontos fortes e fracos do FiveUp é o «Temas mais citados», que
  passou a ler as avaliações em 01/09/2026.
- O relatório semanal enviado sem o dono pedir, que o Starboard-G destaca como o
  que mantém o produto presente, já existe às segundas.

## Preço, para referência

O mercado deles vai de **US$ 29 a US$ 299 por mês** (Weiver 29–59 CAD,
ReviewAutomate 99–299, Avisora 149 CAD, GBPPromote 5,33 por unidade). O Binno
Maps ainda não tem preço anunciado. Um recorrente entre R$ 100 e R$ 200 está
dentro do mercado e não é ousado.
