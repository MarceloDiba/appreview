# Relatório — home nova do binno.pro

Branch: `feat/home-nova-binno` (sem merge, sem push, sem PR — combinado).

## Commits

1. `332e9dd` — Reescreve `src/i18n/marketing.ts` (pt-BR, pt-PT, en) e `src/lib/precoBinno.ts`.
2. `ba0ad95` — Porta `src/pages/Index.tsx`, cria `src/components/marketing/HeroAnimado.tsx`,
   atualiza `src/components/marketing/PublicMarketingNav.tsx` e `src/pages/Demo.tsx`.

## O que mudou de fonte, a meio da tarefa

Comecei pelo material antigo em `.superpowers/home-nova/` (previa-completa.html +
copy-extraida.txt). A meio do trabalho o coordenador interrompeu para substituir a fonte da verdade
por `docs/nova-home-binno.md` + `docs/nova-home-binno.html` (versão de 05/09, com correções de
acessibilidade que o material antigo não tinha). Parei, li o documento novo inteiro e o protótipo
inteiro (evitando o blob base64 da imagem embutida em ambos), e recomecei a partir dele. O conteúdo
de copy acabou sendo o mesmo texto do material antigo — só a estrutura de chaves, os fixes de
acessibilidade e a lista do "o que não pode entrar" vieram exclusivamente do documento novo.

## Estrutura de `marketing.ts`

Segui a tabela da seção 2 do documento à risca, incluindo a decisão de reaproveitar `maps` e
`alerts` com conteúdo novo ("O problema" e os três pilares de "Como funciona") em vez de renomear
essas chaves — é o que o documento pede explicitamente ("Chaves novas: prova, segments, compare,
honest, faq, finalCta"). `demo` e `pricing` também foram mantidos e reescritos.

Onze preços na copy (contei e confirmei) viraram `{promo}`, `{regular}` ou `{vagas}`, substituídos em
render por `comVagas()`. Troquei `comVagas` de `.replace()` simples para regex `/g`, porque a FAQ cita
`{promo}` duas vezes na mesma frase e o banner do lote cita `{regular}` ao lado de `{promo}` na mesma
nota — com `.replace` sem `/g` a segunda ocorrência ficava literal na tela. **Reescrevi também
`scripts/check-um-preco-um-sitio.mjs`**: a assertão antiga procurava o texto exato
`.replace('{regular}', String(PRECO_REGULAR_BRL))` no código-fonte, e passou a ficar vermelha (com
razão) quando troquei para regex. Troquei essa assertiva por uma que importa o módulo real
(`--experimental-strip-types`, mesma técnica de `check-reply-locale-br.mjs`) e executa `comVagas`
contra uma frase com cada marcador repetido duas vezes, comparando o resultado byte a byte. Provei que
fica vermelha revertendo `comVagas` para `.replace` simples (guarda vermelho), depois restaurando
(guarda verde) — não é uma medição vazia.

O nome da cliente real ("Mesquita"), o comentário dela e a resposta do proprietário na animação do
hero **não estão em `marketing.ts`** — são constantes hardcoded em `HeroAnimado.tsx`, comentadas
explicando por quê: é a mesma avaliação real do print em `public/marketing/prova-avaliacao-google.jpg`,
e traduzi-la para inglês/português europeu inventaria uma citação que a cliente nunca escreveu. Só a
interface ao redor (rótulos, botão, confirmação) é traduzida.

## `HeroAnimado.tsx`

Porta a máquina de estados de `hero-animacao.js`/`docs/nova-home-binno.html` para React: fases
`sistema → digitando1 → aviso → enviado → digitando2 → confirmado`, com `useRef` guardando os
timers/interval para limpar no `useEffect` (e antes de reiniciar). `prefers-reduced-motion` pula
direto para `confirmado` com o relógio em `00:21`, sem agendar nenhum timer — replica o comportamento
da prévia. O botão "Publicar no Google" é um `<button>` real (foco/Enter/Espaço nativos, sem precisar
recriar `role="button"`/`tabindex`/`keydown` como a prévia em HTML puro fazia). Extraí `ChatThread` e
`NoticeBubble` como subcomponentes porque o componente principal sozinho batia complexidade 15
(o teto do projeto é 12) — depois de extrair, ficou limpo.

## Acessibilidade (seção 5 do documento)

- Cores de contraste corrigidas onde eu escrevi texto: `#655F7C` (era `#7A7390`) para texto
  secundário, `#A8790A` (era `#F5B301`) para as estrelas amarelas no card do Google do hero.
- Alvos de toque: `min-h-11` (44px) em botões pequenos que criei (replay do hero, gatilhos do
  Accordion da FAQ, botão do menu móvel, links do Sheet).
- Grid `minmax(0,1fr)`: não precisei de nada especial — as classes `grid-cols-*` do Tailwind já
  aplicam `repeat(n, minmax(0,1fr))` por padrão, diferente do CSS puro da prévia.
- Menu móvel: troquei o toggle manual por `Sheet` do shadcn (`src/components/ui/sheet.tsx`, já
  existia no projeto), com os quatro links mais o CTA.
- Imagem: `width={772} height={842} loading="lazy"`, dimensões reais conferidas com `sips`.

## Decisões que tomei sem perguntar (dentro da autonomia combinada)

- **Demonstração usa o `BinnoDemoCockpit` real**, não uma recriação — é literalmente o que o
  documento manda ("usa o BinnoDemoCockpit que já existe. Não recriar."), e não toquei em
  `BinnoDemoCockpit.tsx` nem em `ApprovedCockpitDashboard.tsx`.
- **CTA da navegação e do `/demo` trocaram `<Link to="/signup">` por `BotaoDeComprar`.** A home nova
  promete "sem formulário antes de pagar" em três lugares; um CTA que ainda levasse a um cadastro
  contradiria a própria página. `hero.primary` é usado nos dois lugares (hero e `/demo`), então
  ajustei `Demo.tsx` para chamar `comVagas()` também — senão a página `/demo` mostraria
  `{promo}` literal.
- **`plan.cta` e `hero.primary` são campos independentes com o mesmo texto**, não um reaproveitando o
  outro — é como o documento apresenta (duas seções, cada uma com seu próprio `cta`), evitei inventar
  um acoplamento entre hero e plano que o documento não pede.

## `npm run verify`

Verde, do início ao fim: `tsc --noEmit`, `lint:portao` (69/69 avisos — o teto exato, nenhum aviso novo
meu), todos os ~65 `check:*` (incluindo `check:um-preco-um-sitio` reescrito e `check:marca-e-contacto`,
que dependem diretamente do que mudei) e `vite build` completo. Conferi manualmente no bundle de
produção (`dist/assets/Index-*.js`) que não sobrou nenhum `{promo}`/`{regular}`/`{vagas}` sem
substituir — só aparecem no chunk de dados brutos (`marketing-*.js`), como esperado.

## Não fiz, e por quê

- Não abri PR — combinado que você abre.
- Não toquei em `BinnoDemoCockpit.tsx`, `ApprovedCockpitDashboard.tsx`, nem em nenhum arquivo de
  `supabase/functions/` — fora do escopo, e os 69 avisos de lint pré-existentes vivem lá.
- Não resolvi os dois bloqueios operacionais que `docs/nova-home-binno.md` (seção 8) lista antes de
  publicar: o adaptador da Cloud API do WhatsApp parado desde 03/09, e "cancele quando quiser" nunca
  testado no portal do Stripe. Não são tarefas de código desta página — são decisões/operação que
  precisam de você antes de esta home ir ao ar, exatamente como o documento já registra.
