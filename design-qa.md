# Design QA — painel do assessor de reputação

## Redesign visual — referência compacta enviada por Marcelo

- Verdade visual: `/var/folders/jy/f70jwlvs5pv08dc69m_yfpr40000gn/T/codex-clipboard-e85b1705-8deb-45bd-94d5-7c92f138d85b.png`.
- Implementação do painel: `/Users/marcelodiba/.codex/visualizations/2026/07/31/019fb619-4a08-7671-813d-70bbec4a7d20/appreview-restyle-qa-2026-08-14/01-painel-nova-direcao.png`.
- Implementação da fila: `/Users/marcelodiba/.codex/visualizations/2026/07/31/019fb619-4a08-7671-813d-70bbec4a7d20/appreview-restyle-qa-2026-08-14/02-fila-nova-direcao.png`.
- Comparação conjunta: `/Users/marcelodiba/.codex/visualizations/2026/07/31/019fb619-4a08-7671-813d-70bbec4a7d20/appreview-restyle-qa-2026-08-14/03-comparacao-referencia-painel.png`.
- Rotas: `http://127.0.0.1:4178/demo?view=panel` e `http://127.0.0.1:4178/demo?view=queue`.
- Referência: 2960 × 2864 px. Implementação: 1280 × 1390 px em viewport desktop de 1280 CSS px e densidade 1. A comparação usa `contain` em quadros iguais de 720 × 720 px.
- Estado: painel ilustrativo em pt-BR; conteúdo e fluxos do AppReview preservados. A referência define cores e formatos, não conteúdo.

### Superfícies de fidelidade

- Tipografia: hierarquia sans-serif compacta, pesos médios e textos auxiliares em cinza reproduzem a densidade da referência sem reduzir a legibilidade.
- Espaçamento e layout: fundo neutro, conteúdo principal largo, coluna lateral de 330 px, cartões de raio moderado, bordas finas e sombras discretas seguem a composição aprovada.
- Cores: azul `#2457D6` concentra ações e links; violeta `#6D43C0` fica na marca e assinatura; verde, âmbar e vermelho são exclusivamente semânticos.
- Imagens e ícones: não há fotografia nem ilustração no alvo funcional. A marca existente foi preservada e os ícones vêm da biblioteca já adotada; nenhum SVG ou desenho CSS artesanal foi criado.
- Conteúdo: nenhum texto ou número do anexo foi copiado. Dados demonstrativos continuam marcados como “Exemplo ilustrativo” e o painel real mantém estados honestos.

### Interações, comparação e resultado

- Foram verificados o painel, a entrada para a fila, edição do rascunho, duas respostas simuladas, um adiamento e o encerramento com quatro respondidas e uma deixada para depois.
- A comparação conjunta confirmou a mesma lógica de superfícies, densidade, coluna lateral, azul de ação, estados semânticos e cartões compactos.
- Não há diferenças P0, P1 ou P2 em relação à direção solicitada. A ausência de busca global e de módulos do anexo é intencional: o conteúdo não fazia parte do alvo.
- O navegador integrado continuou sem expor leitura de console ou aplicar viewport móvel nesta sessão; ambos permanecem lacunas de instrumentação P3. O fluxo executou sem erro visível e a verificação técnica é separada.
- Não foi necessário recorte focado adicional: cartões, botões, ícones, rótulos e textos permanecem legíveis na comparação completa e foram inspecionados nas capturas individuais.

final result: passed

## Extensão — caixa de entrada assistida

- Verdade visual: direção aprovada do painel em `/Users/marcelodiba/.codex/generated_images/019fb619-4a08-7671-813d-70bbec4a7d20/exec-69a4632d-cfa8-4316-9536-ca486efe5d2f.png`.
- Implementação inicial da fila: `/Users/marcelodiba/.codex/visualizations/2026/07/31/019fb619-4a08-7671-813d-70bbec4a7d20/appreview-review-queue-qa-2026-08-14/01-fila-inicial.png`.
- Painel com entrada para a fila: `/Users/marcelodiba/.codex/visualizations/2026/07/31/019fb619-4a08-7671-813d-70bbec4a7d20/appreview-review-queue-qa-2026-08-14/02-painel-com-fila.png`.
- Estado concluído: `/Users/marcelodiba/.codex/visualizations/2026/07/31/019fb619-4a08-7671-813d-70bbec4a7d20/appreview-review-queue-qa-2026-08-14/03-fila-concluida.png`.
- Comparação conjunta de direção visual: `/Users/marcelodiba/.codex/visualizations/2026/07/31/019fb619-4a08-7671-813d-70bbec4a7d20/appreview-review-queue-qa-2026-08-14/04-comparacao-painel-fila.png`.
- Rotas verificadas: `http://127.0.0.1:4178/demo?view=panel` e `http://127.0.0.1:4178/demo?view=queue`.
- Viewport e densidade: implementação a 1280 CSS px, densidade 1. Capturas com 1280 × 1487 px para o painel/fila inicial e 1280 × 840 px para o encerramento. A comparação conjunta normaliza referência e implementação em quadros de 720 × 720 px com `contain`.
- Estado: pt-BR, cinco avaliações ilustrativas, três pendentes, duas respondidas e nenhuma chamada externa.

### Superfícies e interações

- Tipografia, espaçamento, índigo, fundo mineral, cartões e estados semânticos preservam o sistema aprovado do painel.
- Nenhum ativo raster novo é necessário. Todos os ícones vêm da biblioteca já usada no produto; não há SVG ou desenho CSS artesanal.
- A entrada no painel reúne as três pendências numa única ação. A fila mantém uma avaliação por vez, rascunho editável e lista lateral com estados claros.
- Foram testados: abertura pelo painel, edição do rascunho, duas respostas simuladas, um adiamento, avanço automático e resumo final de quatro respondidas e uma adiada.
- A estrutura acessível expõe títulos, progressbar, textbox, botões, estados e rótulos de estrelas. As interações concluíram sem erro visível de execução.
- O navegador integrado não expôs leitura de console nesta sessão; isso permanece uma lacuna de instrumentação P3. TypeScript, i18n e build são verificados separadamente.

### Comparação e resultado da extensão

- A referência não desenha uma tela de fila; ela é usada como verdade de linguagem e hierarquia, não como correspondência pixel a pixel do novo estado.
- A inspeção conjunta confirmou continuidade de tipografia, tokens, densidade, cartões e prioridade. Não foram encontrados problemas P0, P1 ou P2 no desktop.
- A captura móvel continua como lacuna P3 da sessão porque o override de viewport do navegador integrado não é aplicado.

final result: passed

## Evidência e estado

- Verdade visual: `/Users/marcelodiba/.codex/generated_images/019fb619-4a08-7671-813d-70bbec4a7d20/exec-69a4632d-cfa8-4316-9536-ca486efe5d2f.png`.
- Implementação, topo do painel: `/Users/marcelodiba/.codex/visualizations/2026/07/31/019fb619-4a08-7671-813d-70bbec4a7d20/appreview-dashboard-qa-2026-08-14/10-painel-hierarquia-final-topo.png`.
- Implementação, recomendações: `/Users/marcelodiba/.codex/visualizations/2026/07/31/019fb619-4a08-7671-813d-70bbec4a7d20/appreview-dashboard-qa-2026-08-14/08-painel-final-recomendacoes-1280.png`.
- Comparação conjunta final: `/Users/marcelodiba/.codex/visualizations/2026/07/31/019fb619-4a08-7671-813d-70bbec4a7d20/appreview-dashboard-qa-2026-08-14/11-comparacao-final-aprovada.png`.
- Rota verificada: `http://127.0.0.1:4178/demo?view=panel`.
- Estado: demonstração autenticada ilustrativa, pt-BR, sem chamadas externas e sem publicação.
- Referência: 1440 × 1024 px. Implementação capturada: 1280 × 720 CSS px, densidade 1. Para a comparação conjunta, ambas foram normalizadas com `contain` em quadros de 720 × 512 px, sem cortar conteúdo.

## Superfícies de fidelidade

- Tipografia: hierarquia, pesos, quebras e densidade preservam a direção aprovada. A implementação usa a família sans-serif já carregada pelo produto.
- Espaçamento e layout: pulso do Google no topo, prioridade e saúde do perfil em duas colunas, funil secundário e WhatsApp planejado seguem a composição. O painel real usa largura máxima de 1280 px.
- Cores e tokens: fundo mineral, texto quase preto, índigo para confiança e ação, verde somente para evolução positiva e âmbar somente para atenção.
- Imagens e ícones: o alvo não exige fotografia. Ícones vêm da biblioteca já usada no produto; nenhum ativo visível foi substituído por desenho CSS ou SVG artesanal. A marca multicolorida do Google não foi reproduzida sem ativo oficial; o produto usa um ícone semântico de estrela.
- Conteúdo: dados demonstrativos recebem “Exemplo ilustrativo”. No painel real, contagem de respostas e idade das fotos não são inventadas: aparecem como dependentes da ligação ao Perfil da Empresa.

## Interações e acessibilidade verificadas

- Copiar resposta muda para o estado “Copiada”.
- “Deixar para depois” mostra um estado reversível; “Voltar para a prioridade” restaura o conteúdo.
- Links de avaliações, configurações, fonte Google e boas práticas têm destinos reais.
- Navegação e estrutura semântica foram inspecionadas por snapshot; títulos, botões, links e rótulo das estrelas estão acessíveis.
- Console do navegador: nenhum erro durante abertura do painel e interações principais.
- A capacidade de viewport do navegador integrado não aplicou o override solicitado de 390 × 844 nesta sessão. A responsividade está implementada por breakpoints e sem larguras fixas críticas, mas a captura visual móvel permanece como teste residual específico.

## Comparação e correções

1. P2 — o funil “Caminho até o Google” aparecia antes da recomendação principal.
   - Impacto: transformava a tela em relatório de aquisição antes de responder “o que fazer agora”.
   - Correção: a ordem passou a ser pulso da reputação → prioridade do assessor → saúde do perfil → funil → WhatsApp planejado.
   - Evidência posterior: `10-painel-hierarquia-final-topo.png` e `11-comparacao-final-aprovada.png`.

## Resultado

Não restam diferenças P0, P1 ou P2 no alvo desktop. A captura móvel é uma lacuna de teste P3 e não altera o alvo visual desktop selecionado.

final result: passed

---

# Design QA — cockpit demonstrativo Binno

Data: 2026-08-17
Escopo: `/demo?view=panel` (visão geral, dados demonstrativos)

## Evidências comparadas

- Referência selecionada: `https://biz-buddy-assist-16.lovable.app`, captura em
  `/private/tmp/biz-buddy-assist-first-fold-current.png`.
- Implementação local: `http://127.0.0.1:4173/demo?view=panel`, captura em
  `/private/tmp/binno-advisor-cockpit-comparable.png`.
- As duas capturas da primeira dobra foram abertas no mesmo input visual desta
  revisão. Ambas têm raster de `2560 × 1440`. A referência informou viewport
  CSS `1280 × 720` em `devicePixelRatio 2`; o navegador local informou
  `2560 × 1440` em `devicePixelRatio 1`. A comparação foi feita pela saída
  raster de igual dimensão, sem atribuir diferença de densidade a um desvio de
  layout.

## Resultado da comparação

### P0 / P1 / P2

Nenhum desvio bloqueante encontrado.

- **Arquitetura e hierarquia:** o Binno preserva a estrutura compacta de duas
  colunas, com alerta de resposta, fila assistida, leitura de assessor, volume
  e coluna de reputação/WhatsApp/prontidão na primeira dobra. A prioridade é
  agir, não apenas consultar a nota do Google.
- **Tipografia e espaçamento:** barra superior, navegação secundária, cartões,
  separadores, espaçamento vertical e CTAs mantêm a mesma leitura limpa e
  densa da referência.
- **Cores e tokens:** base neutra, azul para ação, estados semânticos
  verde/âmbar/vermelho e violeta apenas como assinatura foram mantidos com
  contraste legível.
- **Ícones e imagens:** não há imagens decorativas no alvo. Os ícones usam a
  biblioteca do produto; a linha de volume usa o componente `LineChart` da
  biblioteca já instalada, não um desenho SVG manual.
- **Conteúdo:** Binno substitui a marca e as afirmações não verificáveis da
  referência por dados marcados como demonstrativos. A passagem QR → Google
  mede abertura e clique, mas não atribui individualmente uma avaliação.
  WhatsApp informa que não há conexão nem envio real; respostas são rascunhos
  editáveis e não são publicadas.

## Interações verificadas

- Navegação para **Boas práticas**, **Avaliações** e **WhatsApp**.
- Abertura da fila, preparação de resposta e confirmação visível de que nada
  foi publicado no Google.
- A rota legada `/demo?view=radar` abre a visão geral que contém a leitura de
  forças, fragilidades e temas, em vez de deixar uma tela vazia.
- Console do painel: nenhum erro.

## Notas de iteração futura (P3)

- Quando houver dados oficiais, substituir os exemplos por uma camada de
  origem, período e completude por cartão; sem dados completos, continuar a
  mostrar a limitação em vez de inventar fila ou tendências.
- A tela demonstrativa permanece em português para revisão visual. A versão
  autenticada deve continuar usando os catálogos do painel ao receber estes
  componentes de produto.

## Checklist final

- [x] Referência visual e implementação renderizada comparadas.
- [x] Primeira dobra, navegação e estados de resposta verificados.
- [x] Dados demonstrativos e limites de integração visíveis.
- [x] `npm run verify` concluído com sucesso.

**final result: passed**

---

# QA funcional — canal local de WhatsApp

Data: 2026-08-17
Escopo: painel autenticado local em `/dashboard`, com fonte experimental Apify
e sessão OpenWA temporária em `127.0.0.1`.

## Verificado

- O proxy de desenvolvimento respondeu à sessão `binno-piloto` sem expor a
  chave do OpenWA ao navegador; o estado observado foi `ready`.
- O card da primeira dobra exibe **Canal local conectado** e abre a aba
  WhatsApp sem afirmar agenda ou entrega recorrente.
- A aba mostra número internacional, mensagem editável e uma caixa de
  confirmação; o botão de envio permanece desativado sem esses três requisitos.
- O console do painel não apresentou erros.
- A entrega real do canal foi validada antes pela API local: uma única mensagem
  manual aprovada por Marcelo chegou ao seu próprio número. Esta revisão de UI
  não enviou uma segunda mensagem.

## Limites preservados

- O piloto não persiste destinatário, agenda, preferências, mensagens ou
  conversas no Binno.
- O build de produção não configura proxy nem chama o OpenWA local.
- Uma nova mensagem pelo painel continuará a depender da ação explícita do
  operador no próprio formulário.

**resultado local: aprovado para teste manual; não é integração de produção.**

---

# QA funcional — painel autenticado com leitura Apify

Data: 2026-08-17
Escopo: `/dashboard` do perfil Mania de Petiscos Lisboa, com a fonte pública
experimental e o canal OpenWA local.

## Auditoria executada

- A primeira dobra foi refeita na arquitetura compacta aprovada: alerta e fila
  à esquerda; reputação, WhatsApp, completude e mudança à direita; volume,
  distribuição, QR e temas continuam abaixo.
- A leitura local existente respondeu com origem `apify-experimental`, coleta
  em 15/08/2026, nota pública 4,9, total público 456, amostra sanitizada de
  49 e duas respostas observadas. O painel agora mostra isto como **Google
  lido via Apify**, sem chamar a leitura de ligação oficial.
- A fila individual e a resposta sugerida ficaram explicitamente indisponíveis:
  a amostra não preserva autor, texto, link ou estado de resposta. Não há
  nomes, comentários, tendências, temas ou respostas inventados.
- A aba WhatsApp reconheceu a sessão local `binno-piloto` como pronta; número
  e texto estão editáveis, e o botão de envio ficou desativado até destinatário,
  mensagem e confirmação. Esta auditoria não enviou nova mensagem.
- A aba Google Reviews de Configurações apresenta a preparação honesta da
  ligação oficial, sem botão OAuth que falhe. QR Codes abre com a criação real
  disponível; a cópia foi corrigida para medir apenas abertura e clique, sem
  atribuir uma avaliação ao QR.
- Rotas locais verificadas: `/dashboard`, `/demo?view=panel`,
  `/demo?view=snapshot`, `/review/test`, `/settings` e `/qrcodes` retornaram
  200. Console do painel: sem erro de aplicação.

## Evidência visual e comparação

- Verdade visual atual: `/var/folders/jy/f70jwlvs5pv08dc69m_yfpr40000gn/T/codex-clipboard-9fdd2612-b290-43fd-9d18-ae2a09b2ff83.png`
  (1280 × 1800 px, layout de referência aprovado).
- Implementação renderizada:
  `/private/tmp/binno-dashboard-2026-08-17.png` (viewport CSS 1163 × 654,
  densidade exposta pelo navegador não disponível).
- A inspeção de layout confirmou a grelha desktop de 707,656 px + 340 px,
  separada por 20 px; não há overflow horizontal. Tipografia sans-serif,
  fundo mineral, cartões brancos, azul de ação, violeta de origem e estados
  semânticos seguem a direção visual.
- A comparação conjunta obrigatória não pôde ser concluída: o navegador local
  bloqueou a abertura do ficheiro temporário de comparação por política de URL.
  Não foi usada outra superfície para contornar essa política. Portanto, a
  fidelidade pixel a pixel deste estado autenticado permanece pendente, embora
  o layout e as interações principais tenham sido renderizados e auditados.

## Pendências reais para o teste de ponta a ponta

1. Criar um QR de piloto a partir da conta do Mania e validar o destino no
   telemóvel; isto escreve um registo real e por isso não foi disparado pela
   auditoria.
2. Fazer uma nova coleta Apify somente se for desejado atualizar a fotografia.
   Ela tem custo variável e não é necessária para usar a leitura existente.
3. OAuth/Perfil da Empresa continua bloqueado pela aprovação Basic do Google;
   ele é o único caminho responsável para fila completa, comentários, temas,
   tendência e publicação confirmada de respostas.

final result: blocked

---

# QA funcional — QR público do Mania na rede local

Data: 2026-08-17

- A causa do QR não escaneável foi corrigida: `publicAppOrigin()` usa
  `VITE_PUBLIC_APP_URL` quando definido, e criação a partir de uma origem de
  loopback fica bloqueada para evitar um cartão inválido.
- A prévia LAN foi iniciada em `http://192.168.15.10:4173`; o OpenWA não foi
  encaminhado nessa superfície. O proxy exige agora
  `BINNO_ENABLE_OPENWA_PROXY=true`, e o endpoint LAN não devolveu a sessão.
- Foi criado o QR de teste `Piloto Mania — 17/08`, slug `cc6e12c5`, com URL
  `http://192.168.15.10:4173/review/cc6e12c5`.
- A rota pública renderizou o negócio Mania de Petisco Lisboa e o link Google
  fornecido. Ao abrir o comentário direto, o Google continuou visível; nenhuma
  nota, comentário ou avaliação foi enviada nesta auditoria.
- O único passo humano pendente é escanear este QR a partir de um telemóvel na
  mesma rede Wi-Fi. A ligação oficial do Google continua fora desse teste.
