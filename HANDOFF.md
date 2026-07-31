# AppReview — documento de continuação (handoff)

Estado em 31/07/2026. Serve para retomar o trabalho noutra sessão ou noutra IA
sem redescobrir nada. Leia também `AGENTS.md` (regras) e `ESTADO.md` (backlog).

## Produto e infra

- Gestão de reputação para donos de negócio. QR na mesa → cliente avalia → nota
  baixa vira caso interno; **avaliação pública sempre oferecida** (não gating).
- Stack: Vite + React + TypeScript, shadcn/ui, Tailwind, react-router,
  @tanstack/react-query. Supabase (BD/auth/edge functions). Deploy na Vercel a
  partir do `main`. Preço 49 €/mês.
- Supabase: projeto `tjbznhwdjyabuacrfqie`, região sa-east-1 (São Paulo).
- Produção: https://appreview-flame.vercel.app
- **CI (`.github/workflows/ci.yml`)**: `npm run verify` roda TypeScript,
  verificação do i18n e build (bloqueantes) + lint (não bloqueante). É o mesmo
  comando usado localmente e a fonte de verdade.

## Já em produção (PRs mergeados)

#6/#8 gating + tripadvisor; #9 QR imprimível + fim de dado falso; #10 sugestões
de resposta; #11 Termos/Privacidade; #12 docs; #13 configuração guiada
(`/configuracao`) + fim dos dados inventados em `/settings` e `/profile` + fix do
spinner eterno de auth; #14 idioma do cliente por região (pt-BR/pt-PT/en, sem
espanhol); #16 dados legais da MDR, lei/foro do Brasil e texto LGPD+RGPD
(continua pendente de revisão jurídica externa); #15 painel completo do dono em
pt-BR, pt-PT e inglês; #17 prontidão do piloto; #18 remoção das notificações
sem entrega; #19 remoção do admin demonstrativo e proteção do acesso; #20 cache
do Google reproduzível e protegido.

## Rollout de prontidão concluído

- PRs #17–#20 mergeados em ordem na `main`.
- Todos os quatro commits de merge tiveram deploy automático saudável na
  Vercel; o último é `d13ceb4`.
- As migrations `20260731_harden_admin_access` e
  `20260731090000_google_reviews_cache_tables` estão no histórico do Supabase.
- `external_place_info` e `cached_reviews` estão com RLS ativo e políticas por
  proprietário; os dados reais preservados continuam em 1 lugar e 5 avaliações
  em cache.
- `fetch-google-reviews` está ativa na versão 4, com verificação JWT, usuário
  derivado da sessão e limite de uma consulta ao Google por conta a cada 12 h.
- Nenhuma chamada à API do Google foi feita durante a publicação.

## Decisões tomadas (não re-perguntar)

- Idioma: Brasil→pt-BR, Portugal→pt-PT ou inglês, resto→inglês. **Sem espanhol**
  no fluxo do cliente (fica só nas sugestões de resposta, que respondem na língua
  em que o cliente escreveu).
- Legal: entidade brasileira (MDR), lei/foro Brasil, regime duplo LGPD+RGPD,
  revisão jurídica por fora.
- Stripe: integrar **depois** (mexe em dinheiro → só com aval).
- Painel multilíngue: concluído no #15. Tom do pt-BR aprovado pelo Marcelo.
- i18n do painel: **react-i18next** (JSON por idioma), instância à parte do
  cliente. Ver `AGENTS.md`.
- Decisões técnicas e alterações locais reversíveis podem seguir sem nova
  aprovação depois de apresentado o plano.

## PR #15 — tradução do painel (mergeado)

Merge `6eda1c9` confirmado na `main`; o deploy automático desse commit ficou
saudável no Vercel. Infra: `src/i18n/owner/instance.ts`,
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

### Verificação local obrigatória

```bash
npm run verify
```

## Tarefas de fundo já sinalizadas (chips)

- **Logout do Navbar:** em produção; agora chama
  `useAuth().signOut()` antes de voltar para `/`.
- **Notificações:** a aba falsa foi removida em produção. Só reintroduzir com
  motor real de entrega, preferências persistidas e tratamento de falhas.
- **Admin:** a rota com dados inventados foi removida e a migration
  `20260731_harden_admin_access.sql` foi aplicada; clientes não podem mais se
  autoatribuir privilégios.
- **Cache Google:** migration, RLS e Edge Function autenticada estão publicados.
  A opção pública de avaliação continua sempre disponível para qualquer nota.

## Armadilhas

- Há ficheiros duplicados do macOS em `src/` (`*  2.tsx`/`* 2.ts`), fora do git.
  Ignorar (os scripts já os saltam).
- O QR impresso e o endereço do QR **não são editáveis de propósito** (era o que
  causava o bug do QR apontar para página inexistente).
- Transferência de dados para o Brasil: agora a empresa é brasileira, mas o
  piloto é português → LGPD+RGPD juntos. Precisa de advogado.

## Piloto

H5 Texas Burger (Avenida) e Mania de Petiscos, ambos em Lisboa. Marcelo no Brasil
(Aracaju) até dezembro → arranque remoto.

- Marcelo executou em 31/07 a passagem com a conta existente da Noá. Passaram:
  QR físico e idioma, nota baixa mantendo avaliação pública, Central de Atenção,
  persistência do caso tratado e logout.
- Não foi criada uma conta totalmente nova; esse cenário ainda precisa ser
  repetido antes de ativar cada negócio piloto.
- A passagem encontrou um link `g.page` salvo sem Place ID. A correção resolve
  o redirecionamento autenticado do próprio Google, grava o identificador na
  conta e mantém o cache de 12 h. Retestar a aba Avaliações do Google depois da
  publicação.
- O registo completo está em `docs/checklist-piloto-e2e.md`.
- A limpeza segura está registada em
  `docs/limpeza-dados-teste-2026-07-30.md`. Três contas puramente de teste e
  cinco registros E2E/smoke foram removidos.
- Uma conta de teste mista foi preservada porque contém vínculo, lugar e cache
  reais do H5. Não apagar a conta inteira sem separar ou recriar esses dados.

## O que falta além do piloto (backlog)

Área administrativa real; autocomplete do Google nas definições; sistema real
de notificações; modelo de agência (dói a partir do 3.º cliente); Stripe a sério.
