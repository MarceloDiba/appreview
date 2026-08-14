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
