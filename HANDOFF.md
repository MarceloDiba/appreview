# AppReview — documento de continuação (handoff)

Estado em 30/07/2026. Serve para retomar o trabalho noutra sessão ou noutra IA
sem redescobrir nada. Leia também `AGENTS.md` (regras) e `ESTADO.md` (backlog).

## Produto e infra

- Gestão de reputação para donos de negócio. QR na mesa → cliente avalia → nota
  baixa vira caso interno; **avaliação pública sempre oferecida** (não gating).
- Stack: Vite + React + TypeScript, shadcn/ui, Tailwind, react-router,
  @tanstack/react-query. Supabase (BD/auth/edge functions). Deploy na Vercel a
  partir do `main`. Preço 49 €/mês.
- Supabase: projeto `tjbznhwdjyabuacrfqie`, região sa-east-1 (São Paulo).
- Produção: https://appreview-flame.vercel.app
- **CI (`.github/workflows/ci.yml`)**: roda `tsc --noEmit`, verificação do i18n
  do painel e build (bloqueantes) + lint (não bloqueante). É a fonte de verdade.

## Já em produção (PRs mergeados)

#6/#8 gating + tripadvisor; #9 QR imprimível + fim de dado falso; #10 sugestões
de resposta; #11 Termos/Privacidade; #12 docs; #13 configuração guiada
(`/configuracao`) + fim dos dados inventados em `/settings` e `/profile` + fix do
spinner eterno de auth; #14 idioma do cliente por região (pt-BR/pt-PT/en, sem
espanhol); #16 dados legais da MDR, lei/foro do Brasil e texto LGPD+RGPD
(continua pendente de revisão jurídica externa).

## PRs abertos

- **#15 — painel do dono multilíngue.** Implementação concluída na branch
  `feat/painel-multilingue`. O PR só deve ficar pronto para revisão após o CI
  deste pacote ficar verde.

## Decisões tomadas (não re-perguntar)

- Idioma: Brasil→pt-BR, Portugal→pt-PT ou inglês, resto→inglês. **Sem espanhol**
  no fluxo do cliente (fica só nas sugestões de resposta, que respondem na língua
  em que o cliente escreveu).
- Legal: entidade brasileira (MDR), lei/foro Brasil, regime duplo LGPD+RGPD,
  revisão jurídica por fora.
- Stripe: integrar **depois** (mexe em dinheiro → só com aval).
- Painel multilíngue: **fazer o painel inteiro num PR** (o #15). Tom do pt-BR já
  aprovado pelo Marcelo.
- i18n do painel: **react-i18next** (JSON por idioma), instância à parte do
  cliente. Ver `AGENTS.md`.
- Decisões técnicas e alterações locais reversíveis podem seguir sem nova
  aprovação depois de apresentado o plano.

## PR #15 — tradução do painel

Branch `feat/painel-multilingue`. Infra pronta: `src/i18n/owner/instance.ts`,
`useOwnerTranslation.ts`, `LanguageSwitcher.tsx`, catálogos em
`src/i18n/owner/locales/{pt-BR,pt-PT,en}.json` (366 chaves no pacote final).

**Traduzido:** Onboarding, Login, Signup, Navbar (só painel/partilhado; admin e
marketing ficam em pt), Dashboard, Central de Atenção, Configurações, Perfil,
Avaliações, casos internos, Google Reviews, QR Codes e interface das sugestões
de resposta.

- Datas, números, médias e percentagens acompanham o idioma escolhido.
- Mensagens e avisos gerados pelos hooks do painel também passam pelo i18n.
- O cartão de mesa impresso permanece trilingue e intocado: é material do
  cliente final, não interface do dono.
- O motor das respostas sugeridas em `src/lib/replySuggestions.ts` permanece
  separado e responde na língua em que o cliente escreveu.
- O antigo marcador visível `Mock Place (validação ignorada)` foi
  neutralizado. Sem autorização para uma chamada potencialmente paga, o painel
  informa apenas que o Place ID foi detetado e ainda não foi verificado.
- `scripts/check-owner-i18n.mjs` verifica paridade dos catálogos, valores vazios
  e resolução das chaves estáticas; o CI executa esse script.

### Verificação do i18n (rodar antes de commitar)

```bash
npx tsc --noEmit -p tsconfig.app.json
npm run check:i18n-owner
```

## Tarefas de fundo já sinalizadas (chips)

- **Logout do Navbar** não deslogava (era `<Link to="/">`). O Marcelo iniciou a
  correção numa sessão à parte; ela editou `Navbar.tsx` no working tree (fica com
  o fix + as traduções). **Não commitar o fix do logout na branch do painel** —
  é da task dele.
- **NotificationSettings não persiste nada** (interruptores e "salvar" que não
  gravam). Sinalizado para implementar de verdade ou remover.

## Armadilhas

- Há ficheiros duplicados do macOS em `src/` (`*  2.tsx`/`* 2.ts`), fora do git.
  Ignorar (os scripts já os saltam).
- O QR impresso e o endereço do QR **não são editáveis de propósito** (era o que
  causava o bug do QR apontar para página inexistente).
- Transferência de dados para o Brasil: agora a empresa é brasileira, mas o
  piloto é português → LGPD+RGPD juntos. Precisa de advogado.

## Piloto

H5 Texas Burger (Avenida) e Mania de Petiscos, ambos em Lisboa. Marcelo no Brasil
(Aracaju) até dezembro → arranque remoto. **Antes do piloto: limpar dados de
teste do banco** (pré-autorizado apagar teste; nunca dado real).

## O que falta além do painel (backlog, sem bloquear piloto)

`/admin` sem ligação ao banco; autocomplete do Google nas definições; limpar
dados de teste; modelo de agência (dói a partir do 3.º cliente); Stripe a sério.
