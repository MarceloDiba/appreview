# Design QA — landing do assessor de reputação

## Evidência

- Verdade visual: `/Users/marcelodiba/.codex/generated_images/019fb619-4a08-7671-813d-70bbec4a7d20/exec-e63483bd-ef28-44bc-9191-24334264efc8.png`
- Implementação final, hero: `/Users/marcelodiba/.codex/visualizations/2026/07/31/019fb619-4a08-7671-813d-70bbec4a7d20/appreview-landing-audit-2026-08-14/11-landing-hero-final-passed.png`
- Implementação, diferenciais: `/Users/marcelodiba/.codex/visualizations/2026/07/31/019fb619-4a08-7671-813d-70bbec4a7d20/appreview-landing-audit-2026-08-14/07-landing-diferenciais.png`
- Implementação, comparação e oferta: `/Users/marcelodiba/.codex/visualizations/2026/07/31/019fb619-4a08-7671-813d-70bbec4a7d20/appreview-landing-audit-2026-08-14/08-landing-comparacao-oferta.png`
- Implementação móvel: `/Users/marcelodiba/.codex/visualizations/2026/07/31/019fb619-4a08-7671-813d-70bbec4a7d20/appreview-landing-audit-2026-08-14/09-landing-mobile.png`
- Comparação lado a lado: `/Users/marcelodiba/.codex/visualizations/2026/07/31/019fb619-4a08-7671-813d-70bbec4a7d20/appreview-landing-audit-2026-08-14/06-comparacao-hero.png`
- Estado: landing pública, tema claro, exemplos ilustrativos.
- Viewport principal: 1440 × 1024 CSS px, densidade 1.
- Referência: 853 × 1844 px, concebida como landing desktop de 1440 px.
- Implementação completa: 1440 × 3094 px. Para a comparação completa foi normalizada para 853 × 1833 px; para o hero, ambas as imagens foram comparadas em 853 × 607 px.

## Superfícies de fidelidade

- Tipografia: família sans-serif, peso, hierarquia e quebras preservam o alvo. O título mantém contraste preto/roxo e boa legibilidade móvel.
- Ritmo e layout: hero em duas colunas, painel dominante, bloco WhatsApp, três diferenciais e comparação Google/AppReview seguem a composição aprovada. O preço permanece depois da narrativa por necessidade comercial.
- Cores: tokens roxos existentes foram preservados; verde aparece somente no conceito planejado de WhatsApp e em estados positivos.
- Imagens e ícones: a referência não exige fotografias ou ilustrações raster. Foram usados os ícones vetoriais já adotados pelo produto e gráfico com a biblioteca Recharts.
- Conteúdo: assessor, priorização e resposta aparecem como valor atual/em construção; WhatsApp e notificações são explicitamente “Recurso planejado”. Exemplos são identificados e não há promessa de publicação automática.

## Interações e acessibilidade verificadas

- CTAs e navegação para demonstração funcionam.
- As três abas da demonstração alternam corretamente.
- Viewport móvel 390 × 844 não apresenta overflow horizontal.
- Console do navegador: nenhum erro durante landing, navegação ou troca de abas.
- Contraste, hierarquia de títulos e rótulos visíveis foram inspecionados. Leitor de tela, navegação completa por teclado e contraste automatizado ainda exigem teste específico e não são inferidos das capturas.

## Histórico de comparação

1. P2 — o texto do hero estava baixo demais em relação ao painel.
   - Correção: alinhamento superior da grade e espaçamento dedicado na coluna de texto.
   - Evidência posterior: `11-landing-hero-final-passed.png`.
2. P2 — a animação do gráfico deixava a linha incompleta na captura e em carregamentos rápidos.
   - Correção: animação desativada no gráfico ilustrativo.
   - Evidência posterior: `11-landing-hero-final-passed.png` mostra a série completa.

## Resultado

Não restam diferenças P0, P1 ou P2. A presença de CTAs e preço abaixo da narrativa é uma extensão comercial intencional. O painel autenticado segue o mesmo conceito com dados reais e resposta determinística; não foi capturado nesta passagem para evitar depender de sessão ou chamada externa.

final result: passed
