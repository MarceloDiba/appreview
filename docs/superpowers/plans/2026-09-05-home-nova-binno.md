# Home nova do binno.pro, plano de implementação

> **Para agentes:** SUB-SKILL OBRIGATÓRIA: usar `superpowers:subagent-driven-development`
> (recomendado) ou `superpowers:executing-plans` para executar tarefa a tarefa. Os passos usam
> caixinha (`- [ ]`) para marcação.

**Objetivo:** trocar a home pública do binno.pro pela página aprovada em 05/09/2026, que vende o
ciclo "avaliação chega no WhatsApp, você toca uma vez, resposta publicada no Google".

**Arquitetura:** a copy inteira vive em `src/i18n/marketing.ts`, nos três locales, como já vive
hoje. O `Index.tsx` muda de ordem e ganha blocos novos. Só o hero exige componente novo, porque é
uma animação com estado. A demonstração reaproveita o `BinnoDemoCockpit` que já existe.

**Stack:** Vite, React, TypeScript, Tailwind, shadcn/ui, Supabase. Sem dependência nova.

**Spec:** `docs/nova-home-binno.md` (copy final e regras) e `docs/nova-home-binno.html` (protótipo
funcionando, abre no navegador sem build). Ler os dois antes de começar. Onde a spec e este plano
discordarem, vale a spec.

## Restrições globais

Valem em toda tarefa, sem exceção:

- **Sem travessão** em qualquer texto da página. Vírgula, dois-pontos, parênteses ou frase separada.
- **Nenhum claim de ranking, posição no Maps, melhora de nota ou número de clientes.**
- **Nenhum depoimento, logotipo de cliente ou prova social fabricada.** O Binno não tem cliente
  pagante; o print do Google é do perfil da própria Noá Digital.
- **Nenhuma promessa de teste grátis.** Não existe.
- **O Binno nunca publica sozinho.** Toda publicação é um toque humano.
- **Preço:** vem sempre de `src/lib/precoBinno.ts` (`PRECO_PROMO_BRL` 99, `PRECO_REGULAR_BRL` 129,
  `VAGAS_DO_LOTE` 50) através de `comVagas()`. Nunca escrito à mão na copy.
- **Contraste:** cinza pequeno `#655F7C`, estrelas `#A8790A`. Não voltar aos tons antigos.
- **Alvo de toque:** todo controle com no mínimo 44px de altura.
- **Todo `display:grid` leva `grid-template-columns: minmax(0,1fr)` na regra base**, senão o
  conteúdo força a largura e a página ganha rolagem horizontal no celular.
- **Ordem de seções:** a da tabela da seção 2 da spec. Não improvisar.
- `npm run verify` tem de passar (23 checks mais o build) ao fim de cada tarefa.
- **Nada de merge nem deploy.** PR e para.

---

### Tarefa 1: as chaves novas no tipo e nos três locales

**Arquivos:**
- Modificar: `src/i18n/marketing.ts`
- Teste: `npm run check:i18n-owner` (o check que já existe e cobra paridade entre locales)

**Interfaces:**
- Produz: `MarketingCopy` com as chaves `avisos`, `prova`, `segments`, `compare`, `honest`, `faq`,
  `finalCta`. As tarefas 3 a 6 consomem exatamente esses nomes.

- [ ] **Passo 1: acrescentar as chaves ao tipo `MarketingCopy`**

```ts
avisos: {
  eyebrow: string; title: string;
  entregaTitle: string;
  itens: { title: string; body: string }[];
  entregaNote: string;
  temasTitle: string; temasBody: string;
  derrubando: { rotulo: string; tema: string; body: string; frase: string };
  ajudando: { rotulo: string; tema: string; body: string; frase: string };
  temasNote: string;
};
prova: { eyebrow: string; title: string; body: string; legenda: string };
segments: { eyebrow: string; title: string; itens: { title: string; body: string }[] };
compare: { title: string; semLabel: string; comLabel: string; linhas: { sem: string; com: string }[] };
honest: {
  eyebrow: string; title: string; body: string; note: string; link: string;
  regras: { title: string; body: string; permitido: boolean }[];
};
faq: { eyebrow: string; title: string; itens: { pergunta: string; resposta: string }[] };
finalCta: { eyebrow: string; title: string; body: string; cta: string; micro: string };
```

- [ ] **Passo 2: rodar o check e confirmar que ele falha**

Roda: `npm run check:i18n-owner`
Esperado: FALHA, porque `pt-BR`, `pt-PT` e `en` ainda não têm as chaves novas.

- [ ] **Passo 3: preencher `pt-BR` com a copy da seção 3 da spec**

Copiar da spec, não reescrever. Onde a copy cita preço, usar marcador: `'{promo}'` e `'{regular}'`,
resolvidos por `comVagas()` na hora de renderizar, como o `pricing.promoNote` já faz.

- [ ] **Passo 4: traduzir para `pt-PT` e `en`**

`pt-PT` é a mesma copy em português europeu (subscrição, telemóvel, a receber). `en` é tradução
direta. Nenhum dos dois é vendido publicamente hoje, mas o check exige paridade.

- [ ] **Passo 5: rodar o check e confirmar que passa**

Roda: `npm run check:i18n-owner`
Esperado: PASSA.

- [ ] **Passo 6: commit**

```bash
git add src/i18n/marketing.ts
git commit -m "A copy nova da home entra nos tres idiomas"
```

---

### Tarefa 2: o hero interativo

**Arquivos:**
- Criar: `src/components/marketing/HeroConversa.tsx`
- Teste: `src/components/marketing/__tests__/HeroConversa.test.tsx`

**Interfaces:**
- Consome: `copy.hero` da tarefa 1.
- Produz: `<HeroConversa copy={copy} />`, usado pelo `Index.tsx` na tarefa 3.

O comportamento inteiro está no protótipo, em `docs/nova-home-binno.html`, na função `run()`. Ler
antes de escrever.

- [ ] **Passo 1: escrever o teste que falha**

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HeroConversa from '@/components/marketing/HeroConversa';
import { getMarketingCopy } from '@/i18n/marketing';

it('publica a resposta quando o dono toca no botao', async () => {
  render(<HeroConversa copy={getMarketingCopy('pt-BR')} />);
  const botao = await screen.findByRole('button', { name: /publicar no google/i });
  await userEvent.click(botao);
  await waitFor(() => expect(screen.getByText(/resposta do proprietário/i)).toBeVisible());
});
```

- [ ] **Passo 2: rodar e confirmar que falha**

Roda: `npx vitest run src/components/marketing/__tests__/HeroConversa.test.tsx`
Esperado: FALHA com "Cannot find module '@/components/marketing/HeroConversa'".

- [ ] **Passo 3: implementar o componente**

Regras que o teste não cobre e que precisam estar lá:

- A mensagem tem o texto real que o produto manda hoje (spec, seção 4). Se o template do WhatsApp
  mudar, essa copy muda junto.
- O botão do balão é `↩ Publicar no Google`, com `role="button"`, `tabIndex={0}` e resposta a Enter
  e Espaço, porque é uma `div` estilizada como o WhatsApp desenha, não um `<button>` nativo.
- Se ninguém tocar em 9 segundos, a sequência avança sozinha. Quem visita nunca fica olhando uma
  tela parada.
- `prefers-reduced-motion: reduce` pula a animação inteira e mostra o estado final.
- Nenhuma data relativa no card do Google. Só `agora` na resposta do proprietário.
- Limpar os `setTimeout` no `useEffect` de saída, senão o componente escreve em estado desmontado
  quando alguém navega no meio da animação.

- [ ] **Passo 4: rodar e confirmar que passa**

Roda: `npx vitest run src/components/marketing/__tests__/HeroConversa.test.tsx`
Esperado: PASSA.

- [ ] **Passo 5: commit**

```bash
git add src/components/marketing/HeroConversa.tsx src/components/marketing/__tests__/HeroConversa.test.tsx
git commit -m "O hero mostra a avaliacao a chegar e a resposta a publicar"
```

---

### Tarefa 3: hero, problema e pilares no `Index.tsx`

**Arquivos:**
- Modificar: `src/pages/Index.tsx`

**Interfaces:**
- Consome: `HeroConversa` (tarefa 2), `copy.hero`, `copy.maps`, `copy.alerts` (tarefa 1).

- [ ] **Passo 1: trocar o bloco do hero**

Sai o `SalesCockpitPreview` do hero, entra o `HeroConversa`. Sai o bloco dos três números: ele não
existe mais (spec, seção 3, item 1).

- [ ] **Passo 2: a seção do problema**

O que hoje é `maps` vira "O problema": título novo, corpo novo, os três números e o bloco de fonte
com os quatro links. A fonte é obrigatória e visível, não é nota de rodapé escondida.

- [ ] **Passo 3: os três pilares**

Títulos e corpos da spec. O pilar 2 diz "antes de", nunca "em vez de": a versão com "em vez de"
promete impedir avaliação, que é o que o contrato de produto proíbe.

- [ ] **Passo 4: conferir no navegador, em 390px e em 1280px**

Roda: `npm run dev`
Esperado: no celular o telefone do hero aparece na segunda tela. Sem rolagem horizontal em nenhuma
das duas larguras.

- [ ] **Passo 5: commit**

```bash
git add src/pages/Index.tsx
git commit -m "Hero, problema e pilares na ordem nova"
```

---

### Tarefa 4: a seção de avisos e temas

**Arquivos:**
- Modificar: `src/pages/Index.tsx`

**Interfaces:**
- Consome: `copy.avisos` (tarefa 1).

Esta é a seção que o Marcelo pediu em 05/09 e que não existia em nenhuma versão anterior. Duas
colunas: o que chega no WhatsApp, e o que o painel lê.

- [ ] **Passo 1: a coluna dos avisos**

Cinco linhas, cada uma com ícone, título e uma frase. A lista está na spec, seção 3b, com o `kind`
correspondente no banco ao lado. **Não inventar uma sexta linha:** se um aviso não existe na fila,
ele não entra na página.

- [ ] **Passo 2: a coluna dos temas**

Dois cartões, um vermelho e um verde, cada um com rótulo, tema, uma frase de contexto e a frase do
cliente que prova. Fecha com a lista dos sete assuntos que o Binno lê, que são os do `topicLabel`
em `supabase/functions/_shared/experimentalApifyCollection.ts`.

- [ ] **Passo 3: marcar os números como ilustrativos**

Os "3 pessoas" e "7 elogios" são do cenário do Bistrô Horizonte, igual à demonstração. A seção
precisa deixar isso visível do mesmo jeito que a demonstração deixa, com a etiqueta de exemplo.

- [ ] **Passo 4: conferir em 390px**

Roda: `npm run dev`
Esperado: as duas colunas viram uma só, na ordem avisos e depois temas, sem corte.

- [ ] **Passo 5: commit**

```bash
git add src/pages/Index.tsx
git commit -m "A pagina lista o que o Binno avisa e o que o painel le"
```

---

### Tarefa 5: prova, segmentos, demonstração e comparação

**Arquivos:**
- Modificar: `src/pages/Index.tsx`

**Interfaces:**
- Consome: `copy.prova`, `copy.segments`, `copy.demo`, `copy.compare` (tarefa 1),
  `BinnoDemoCockpit` (já existe).

- [ ] **Passo 1: a seção do print**

Imagem em `public/marketing/prova-avaliacao-google.jpg`, que já está no repo. `width={772}`
`height={842}` (a proporção real, senão a página dá um salto ao carregar) e `loading="lazy"`,
porque ela fica abaixo da dobra. Sem a linha do tempo de quatro passos: ela repetia o hero.

- [ ] **Passo 2: os cinco segmentos**

Na ordem da spec: negócio local, gastronomia, saúde e bem-estar, hospedagens, serviços. A ordem foi
decidida pelo Marcelo e não é alfabética nem por tamanho de mercado.

- [ ] **Passo 3: a demonstração dobrada no celular**

O `BinnoDemoCockpit` dentro de um `Collapsible` do shadcn. Abaixo de 900px começa fechado, com o
gatilho `Abrir a demonstração`. A partir de 900px abre sempre e o gatilho some. Ela sozinha ocupava
quase três telas de celular.

- [ ] **Passo 4: a tabela sem e com**

Cinco linhas, texto da spec. No celular vira uma coluna só.

- [ ] **Passo 5: conferir e commitar**

Roda: `npm run dev`

```bash
git add src/pages/Index.tsx
git commit -m "Prova, segmentos, demonstracao dobrada e a tabela sem e com"
```

---

### Tarefa 6: honestidade, plano, FAQ e fechamento

**Arquivos:**
- Modificar: `src/pages/Index.tsx`

**Interfaces:**
- Consome: `copy.honest`, `copy.pricing`, `copy.faq`, `copy.finalCta` (tarefa 1),
  `comVagas`, `PRECO_PROMO_BRL`, `PRECO_REGULAR_BRL` de `src/lib/precoBinno.ts`.

- [ ] **Passo 1: a seção do review gating**

Texto da spec, seção 8. Duas coisas que ela deliberadamente não diz, porque a fonte não sustenta:
não atribui a punição especificamente ao gating, e não cita "abril de 2026" nem "23 verificações".
Não reintroduzir nenhuma das duas.

- [ ] **Passo 2: o plano**

Preço vindo de `precoBinno.ts` via `comVagas()`. "Alertas ilimitados" não entra: existe teto diário
(`20260904160000_teto_diario_de_avisos_que_custam.sql`), e vender ilimitado obrigaria a desfazer a
proteção ou a quebrar a promessa.

- [ ] **Passo 3: a FAQ**

`Accordion` do shadcn, **nenhum item aberto por padrão**. São 160 palavras que só aparecem para
quem quiser. A resposta 3 tem de manter o pré-requisito escrito (conectar o Perfil da Empresa uma
vez): sem ele nada do WhatsApp funciona, e quem comprar sem saber vira suporte no dia seguinte.

- [ ] **Passo 4: o fechamento**

- [ ] **Passo 5: commit**

```bash
git add src/pages/Index.tsx
git commit -m "Review gating, plano, FAQ fechada e o fecho da pagina"
```

---

### Tarefa 7: menu mobile, acessibilidade e o portão de qualidade

**Arquivos:**
- Modificar: `src/components/marketing/PublicMarketingNav.tsx`
- Modificar: `src/index.css` (se algum token de cor precisar mudar)

- [ ] **Passo 1: o menu mobile**

Abaixo de 900px o menu do topo some hoje sem substituto. Entra um `Sheet` do shadcn com os quatro
links mais o CTA. O protótipo resolve isso de forma simplificada, só para a prévia não demonstrar um
padrão quebrado; no código é o `Sheet`.

- [ ] **Passo 2: varrer contraste e alvo de toque**

Todo texto pequeno em `#655F7C` ou mais escuro. Estrelas em `#A8790A`. Todo botão com 44px de altura
mínima, inclusive os pequenos dentro da demonstração.

- [ ] **Passo 3: varrer os grids**

Todo `display:grid` da página com `minmax(0,1fr)` na base. No Tailwind, `grid-cols-[minmax(0,1fr)]`
ou `min-w-0` nos filhos. É o que impede a rolagem horizontal no celular.

- [ ] **Passo 4: medir em quatro larguras**

Roda: `npm run dev` e conferir em 375, 768, 1024 e 1440.
Esperado: `document.documentElement.scrollWidth === clientWidth` em todas.

- [ ] **Passo 5: o portão de qualidade**

Roda: `npm run verify`
Esperado: PASSA, 23 checks mais o build.

- [ ] **Passo 6: commit e PR**

```bash
git add -A
git commit -m "Menu no telemovel, contraste e alvos de toque"
git push -u origin feat/home-nova-binno
gh pr create --title "A home nova do binno.pro" --body "Implementa docs/nova-home-binno.md. Protótipo em docs/nova-home-binno.html. Sem merge: a página pública depende de aprovação do Marcelo."
```

**Não fazer merge e não fazer deploy.** A página pública depende de aprovação explícita do Marcelo,
como o `ESTADO.md` já registra.

---

## O que fica pendente depois do PR

Nenhuma das duas é tarefa deste plano, mas a home não sobe sem elas:

1. **O adaptador da Cloud API.** A página promete aviso no WhatsApp em quatro seções. O OpenWA está
   parado desde 03/09 no número que virou oficial na Cloud API. Enquanto o código não trocar o
   adaptador, a promessa central da home não está no ar.
2. **"Cancele quando quiser" nunca foi testado.** O portal do Stripe está configurado, mas ninguém
   assinou ainda para provar que ele abre.
