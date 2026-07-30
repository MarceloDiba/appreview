# Estado do AppReview — 30 de julho de 2026

> Actualizado no fim da segunda sessão de 30/07. Os itens 1 a 3 estão em
> produção (PR #9). Os itens 7 e 8 estão escritos e à espera de revisão nos
> PR #10 e #11 — ainda não estão em produção.

Documento de passagem. Quem pegar este projecto lê isto primeiro.

## O que está em produção e verificado

https://appreview-flame.vercel.app

- **Review gating corrigido.** O produto encaminhava nota "Ruim" para um formulário
  interno que dizia "não é publicado", com cadeado, e terminava sem nunca oferecer
  avaliação pública. Corrigido no PR #6 e validado no fluxo real. **A opção pública
  não pode voltar a ser condicionada à nota** — há comentários no código a dizê-lo.
- **Landing** sem métricas inventadas, sem o modelo proibido, preço €49/mês.
- **Dashboard com dados reais** e Central de Atenção (uma prioridade + 4 indicadores,
  calculados só de `internal_feedback`, sem IA e sem dependência externa).
- **Avaliações reais do Google** a funcionar (H5 Texas Burger: 4,8 com 1.585).
- **Fluxo do cliente em PT, ES e EN**, detectado pelo telemóvel do visitante.
- **App 36% mais leve** (666 kB → 425 kB no caminho do cliente).
- **Verificação de tipos obrigatória no CI.** `npm run build` (Vite) NÃO verifica tipos;
  foi o `tsc` que revelou o review gating. Rodar sempre
  `npx tsc --noEmit -p tsconfig.app.json` antes de qualquer deploy.
- **QR code a funcionar de verdade.** A imagem era gerada a partir de um identificador
  fixo da página, antes de o slug existir — o código impresso apontava para uma página
  inexistente. Corrigido no PR #9: grava-se primeiro, desenha-se depois. Geração local
  (biblioteca `qrcode`, sem serviço externo), 1024 px para impressão, e cartão de mesa
  A6 trilingue pronto a imprimir. **O endereço do QR não é editável de propósito** —
  era isso que permitia o erro.
- **Sem dado falso à vista do cliente.** Saíram as avaliações inventadas do `/reviews` e
  o "Restaurante Exemplo" de `/qrcodes` e `/reviews`.

## Infraestrutura

| | |
|---|---|
| Supabase | `tjbznhwdjyabuacrfqie`, região sa-east-1 (São Paulo), activo |
| Vercel | deploy automático do `main` |
| Google Places | chave existe no segredo do Supabase desde 13/07, a funcionar |
| Edge Functions | `fetch-google-reviews` (produto), `search-prospects` (interno, apagar) |

**Pendência conhecida:** o banco está no Brasil e o piloto é em Lisboa — transferência
internacional de dados sob o RGPD. Marcelo decidiu adiar a mudança para a Europa até
o piloto provar. O risco começa no primeiro cliente real que escrever algo. A
transferência passa a estar declarada na Política de Privacidade (PR #11), o que
reduz a exposição mas não a elimina — declarar não é o mesmo que resolver.

## Método de trabalho (acordado 30/07)

Ser económico com tokens. Decisões em lote antes de codar; PRs maiores por tema,
não um por ajuste; verificar com `tsc` + CI (que faz build), sem abrir navegador
a não ser que o Marcelo precise mesmo de ver algo; nada de mexer no dev
server/preview sem necessidade. Este ficheiro é o backlog vivo.

## Em produção (mergeado)

PR #9 (QR + dado falso), #10 (sugestões de resposta), #11 (Termos/Privacidade),
#13 (configuração guiada + fim dos dados inventados), #14 (idioma do cliente por
região: pt-BR/pt-PT/en, sem espanhol). Isto cobre os antigos pontos 4, 7 e 8.

## PRs abertos

- **#15 — painel do dono multilíngue (base).** react-i18next, um JSON por
  idioma em `src/i18n/owner`, seletor de idioma. Só o passo a passo migrado, como
  amostra; **tom do pt-BR aprovado pelo Marcelo.** A seguir: expandir para o
  painel inteiro (ver backlog).
- **#16 — dados legais.** Entidade MDR Propaganda Ltda. ME, CNPJ
  20.927.148/0001-83, sede em Aracaju/SE, pagamento por Stripe. Lei/foro do
  Brasil (Aracaju). Privacidade reescrita para o regime duplo LGPD+RGPD. Tudo
  **por validar com advogado** (o Marcelo valida depois).

## Backlog (decisões já tomadas — é só executar)

1. **Painel multilíngue completo** — traduzir as ~14 telas restantes num PR
   único. Peça mais pesada: `useAttentionInsights` (prosa gerada, com plural).
   Pôr o seletor de idioma no Navbar.
2. **Stripe** — integrar a cobrança a sério. Adiado a pedido do Marcelo, mas
   **vamos precisar**. Mexe em dinheiro: só executar com aval explícito.
3. **Revisão jurídica** dos Termos/Privacidade (LGPD+RGPD, lei/foro). O Marcelo
   trata fora; eu deixei o texto o mais defensável possível.

## Backlog (sem bloquear o piloto — prioridade minha)

- `/admin` sem ligação ao banco (interno, baixa prioridade).
- Autocomplete do Google nas definições (bloqueia self-service, não o concierge).
- **Limpar dados de teste do banco antes do piloto** — é apagar linhas, portanto
  **exige aval** antes de correr.
- Modelo de agência (dói a partir do 3.º cliente).

## O que nunca foi feito e é a coisa mais valiosa que falta

O **teste de ponta a ponta pelo próprio Marcelo**: criar conta, ligar o Google, criar um
QR, escanear com o telemóvel, escrever algo e ver o caso aparecer na Central de Atenção.
Nada foi validado pelos olhos dele — só pelos meus.

## Posicionamento — importante

O produto **não é** resgate de nota baixa. É ferramenta de gestão de reputação para
donos que não sabem de tecnologia, e **serve também quem já tem boa nota**. Não é só
restaurante. Ver `memory/appreview-posicionamento-produto.md`.

## Piloto

H5 Texas Burger – Avenida e Mania de Petiscos, ambos em Lisboa, ambos com acesso de
Gestor do Google já nas mãos do Marcelo. Ele está no Brasil (Aracaju) até dezembro,
portanto o arranque é remoto — os donos imprimem e colocam o QR.

## Armadilhas conhecidas

- A documentação original (`appreview-documentacao-completa.pdf`, 13/07) tem **dois
  erros materiais**: diz que o gating foi corrigido, e não tinha sido; e diz que a
  chave do Google era o bloqueio principal, quando já existia. Não confiar sem verificar.
- A migration `20260712_google_reviews_cache_tables.sql` nunca foi guardada no repo.
  As tabelas existem no banco, a receita para as recriar não existe no código.
- Lint tem 6 erros e 10 avisos herdados do projecto Lovable original. Não bloqueiam.
- Há ficheiros duplicados pelo macOS na árvore (`AttentionCenter 2.tsx`,
  `useAttentionInsights 2.ts`, `i18n/index 2.ts`, `useTranslation 2.ts`,
  `tripAdvisorUtils 2.ts`), fora do git mas dentro de `src/`. O `tsc` compila-os.
  São cópias mortas — vale apagá-las, mas ninguém o fez ainda.
