# AppReview — documento de continuação (handoff)

Estado em 31/07/2026. Serve para retomar o trabalho noutra sessão ou noutra IA
sem redescobrir nada. Leia também `AGENTS.md` (regras) e `ESTADO.md` (backlog).

## Frente local de produto — 14/08/2026 (ainda não publicada)

- Branch `codex/gestor-assistente`: a primeira proposta de transformar feedback
  numa fila operacional foi revertida. Decisão de Marcelo: o valor central é
  aumentar e cuidar das avaliações no Google sem criar mais trabalho ao gestor.
- O fluxo do QR passa a oferecer Google/TripAdvisor diretamente, sem perguntar
  antes se a experiência foi boa, neutra ou ruim. O comentário privado continua
  opcional e a avaliação pública nunca é condicionada à nota.
- Nova medição passiva versionada localmente: abertura do QR, clique para a
  plataforma pública e comentário privado. Clique indica intenção, não uma
  avaliação publicada.
- A importação do Google passa a guardar snapshots de nota e quantidade após
  consultas novas. O painel compara a evolução observada no próprio Google sem
  afirmar causalidade do AppReview.
- Dashboard, página de avaliações, landing e demonstração foram reorientados
  para resultado no Google e sugestões de resposta; casos internos ficaram
  secundários.
- Migration local: `20260814190000_google_outcome_metrics.sql`. Ela ainda não foi
  aplicada remotamente. Nenhum deploy, chamada manual ao Google ou custo foi
  gerado nesta frente.
- Verificação local concluída por `npm run verify`. O lint continua não
  bloqueante e falha apenas em cinco erros herdados, fora dos arquivos alterados.
- Direção visual aprovada por Marcelo: “Seu assessor de reputação no Google”. A
  landing e a demonstração agora explicam leitura, priorização e assistência de
  resposta; WhatsApp e alertas aparecem somente como recursos planejados.
- O painel ganhou um briefing local que seleciona uma avaliação escrita do
  cache Google, prioriza nota até 3 e prepara uma resposta determinística e
  editável. Não chama IA nem API externa e não detecta se o gestor respondeu.
- `design-qa.md` registra comparação visual, mobile, interações e resultado
  aprovado. Nenhuma publicação ou integração WhatsApp foi feita.
- O painel local foi redesenhado a partir da direção aprovada em 14/08: pulso
  real do Google, uma prioridade do assessor, saúde do Perfil da Empresa,
  caminho do QR e WhatsApp planejado. O demo reutiliza os mesmos componentes;
  `/demo?view=panel` permite rever a tela sem autenticação e identifica todos os
  dados fictícios.
- Contagem de avaliações sem resposta e idade da última foto continuam
  bloqueadas por integração: Places retorna no máximo cinco avaliações. A
  solução recomendada é OAuth + Business Profile API; até lá, o painel real
  mostra “conecte para medir”, nunca números inventados.
- `PLANO_FUNCIONAL.md` consolida as fases, ferramentas, dependências, critérios
  de funcionamento e gates de custo. Nada foi publicado ou contratado.
- A demonstração local ganhou uma caixa de entrada assistida em
  `/demo?view=queue`: cinco avaliações novas, três pendentes e duas já
  respondidas. O gestor edita a sugestão, simula a resposta ou deixa para
  depois e recebe um resumo ao concluir. A prioridade do painel abre essa
  sessão. Todos os dados são ilustrativos e nenhuma ação chega ao Google.
- Decisão de produto: a fila não cria casos, responsáveis, providências ou
  datas. O estado útil é o do próprio Google — aguardando resposta ou
  respondida — com adiamento apenas para organizar a sessão atual.
- Nova direção visual local aprovada por Marcelo em 14/08: fundo cinza-claro,
  cartões brancos compactos, coluna lateral, azul `#2457D6` para ações e
  violeta `#6D43C0` apenas como assinatura do AppReview. Dashboard e fila foram
  atualizados com essa linguagem sem copiar conteúdo, marca ou dados do anexo.
- A implementação preserva os mesmos dados, estados honestos e fluxo assistido;
  nenhuma integração, publicação ou custo foi acionado nesta mudança visual.
- O Radar de Reputação está pronto para revisão local em `/demo?view=radar`.
  Ele apresenta, sempre como exemplo ilustrativo, quatro estados que poderão
  vir do Perfil da Empresa: situação estável, tema negativo recorrente, força
  reconhecida e uma oportunidade concreta. Cada estado exibe a evidência e o
  período; a prioridade fica no topo, mas o resumo dos quatro sinais aparece
  de uma vez, sem abas. O Radar não cria tarefas. Ainda não lê, calcula nem
  notifica dados reais.
- O cálculo local do Radar foi ligado ao painel real, mas só pode entrar no
  estado `ready` quando a ligação oficial estiver conectada, uma localização
  selecionada e a paginação de avaliações concluída. Nesse ponto, a prioridade
  é a fila real sem resposta; termos recorrentes só viram sinal depois de no
  mínimo duas menções negativas ou três positivas nos últimos 30 dias. O cache
  público limitado nunca é usado para afirmar que a fila está completa.
- A fundação da conexão oficial com o Perfil da Empresa foi preparada localmente
  no mesmo branch: migration `20260814193000_google_business_profile_connection.sql`,
  `start-google-business-oauth`, `google-business-oauth-callback` e
  `sync-google-business-profile`. Ela armazena só o refresh token no Supabase
  Vault, usa state OAuth único e expirável, lista localizações, sincroniza
  avaliações por página e publica uma resposta apenas por ação explícita, com
  leitura de confirmação no Google.
- A nova chamada de Configurações é honesta: inicia o consentimento quando os
  segredos e a Edge Function estiverem publicados; sem essa configuração mostra
  que a conexão oficial ainda não está disponível. Nenhuma credencial OAuth,
  migration, função ou chamada Google foi criada/remota nesta frente.
- `src/pages/Reviews.tsx` já prefere `GoogleBusinessReviewQueue` quando houver
  ligação e localização selecionada. A fila só permite publicar depois de
  editar/confirmar; durante uma sincronização com páginas pendentes, não exibe
  contagem que pareça completa. Sem ligação, mostra a fonte Places já existente
  como leitura limitada.
- O gate que resta é externo: o projeto Google Cloud precisa de aprovação Basic
  para as Business Profile APIs, OAuth Web e consentimento do proprietário.
  Procedimento completo em `docs/google-business-profile-rollout.md`.

### Configuração Google Cloud — 15/08/2026

- Projeto exclusivo criado: **App Review** (`app-review-505612`, número
  `288079352399`) na organização `noadigital.com.br`.
- A configuração OAuth externa foi criada com o nome AppReview, e-mails de
  suporte/contato `diba@noadigital.com.br` e aceite explícito da política pelo
  Marcelo. Ainda não existe cliente OAuth.
- A consola mostrava estimativa acumulada de **R$ 0,00** para 1–15/08; há uma
  conta de faturamento vinculada. Esta é só uma fotografia do console, não uma
  garantia de custo futuro.
- Nenhuma API Business Profile/Places foi ativada e nenhuma chamada ao Google,
  segredo, migration, Edge Function ou dado de cliente foi enviado/remotamente
  nesta etapa.
- O formulário de cliente OAuth Web permanece sem submissão. A candidatura
  **Basic** da Business Profile API foi enviada em 15/08/2026 para o projeto
  `app-review-505612`, protocolo Google `0-0755000041728`.
- Marcelo indicou o Perfil da Empresa da **NOÁ** e `noadigital.com.br` como a
  identidade que representa o AppReview e atribuiu gestão a
  `diba@noadigital.com.br`. O formulário reconheceu **Noá Agência Digital**
  como perfil validado e permitiu o envio. O Google informou previsão de análise
  de **7 a 10 dias úteis**; é informação dinâmica e não significa aprovação.
- Até a resposta do Google, não ativar APIs, criar cliente OAuth, configurar
  segredos no Supabase ou chamar as APIs. O pedido não gerou uso de API nem
  alteração em dados de cliente.

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
- `fetch-google-reviews` está ativa na versão 6, com verificação JWT, usuário
  derivado da sessão e limite de uma consulta ao Google por conta a cada 12 h.
- Nenhuma chamada à API do Google foi feita durante a publicação.

### Reteste da importação Google — 31/07

- A resolução do link `g.page` funcionou: o Place ID real foi gravado na conta
  da Noá. A falha seguinte foi isolada no endpoint legado de Place Details, que
  devolveu 502 pela Edge Function antes de qualquer gravação de cache.
- A correção migra para Place Details (New), usa máscara restrita aos campos que
  o produto mostra e preserva links de autor e da avaliação original.
- Preço oficial consultado em 31/07/2026: o campo `reviews` usa a categoria
  Enterprise + Atmosphere, com 1.000 consultas bem-sucedidas/mês sem custo e
  US$ 25 por 1.000 depois desse limite. Com cache de 12 h e dois pilotos, o teto
  teórico é cerca de 120/mês. Não houve chamada manual à API.

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
- A passagem encontrou um link `g.page` salvo sem Place ID. A versão 6 resolveu
  o redirecionamento e gravou o identificador, mas o reteste expôs uma segunda
  falha: o endpoint legado de Place Details rejeitou a importação. A migração
  para Place Details (New) está preparada; retestar depois de publicada.
- O registo completo está em `docs/checklist-piloto-e2e.md`.
- A limpeza segura está registada em
  `docs/limpeza-dados-teste-2026-07-30.md`. Três contas puramente de teste e
  cinco registros E2E/smoke foram removidos.
- Uma conta de teste mista foi preservada porque contém vínculo, lugar e cache
  reais do H5. Não apagar a conta inteira sem separar ou recriar esses dados.

## O que falta além do piloto (backlog)

Área administrativa real; autocomplete do Google nas definições; sistema real
de notificações; modelo de agência (dói a partir do 3.º cliente); Stripe a sério.
