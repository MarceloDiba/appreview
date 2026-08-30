# Checklist do piloto, ponta a ponta

> Reescrito em 30/08/2026 para a execução real na Casa Due, em Aracaju. A
> versão de 30/07/2026 descrevia um produto que não existe mais: pedia para
> esperar os PRs #10 e #13 (os dois já estão em `main` há semanas, mesclados
> como `acbdf1f` e `e664024`), e a tela do QR ainda perguntava a satisfação do
> cliente antes de oferecer a avaliação pública. Isso foi removido: o
> componente da tela do QR se chama `ReviewChooser`
> (`src/components/review-funnel/ReviewChooser.tsx`), renomeado de
> `EmojiRating` justamente porque o nome antigo descrevia o comportamento de
> filtro que não existe mais.

Use este roteiro em produção, no domínio real `binno.pro`, antes de ativar a
Casa Due. Registre a data, a conta usada, o negócio e o slug do QR.

**Regras de segurança, valem sempre:**

- Nunca publique uma avaliação real no perfil do Google da Casa Due durante o
  teste. Pare antes do clique que sai do Binno.
- Nunca use uma conta de cliente real. Use uma conta de teste, criada para
  este roteiro.
- Se algum passo falhar, antes de recarregar a página anote a URL e o horário
  exatos. Recarregar sem anotar apaga a única pista que o console vai
  precisar depois.

Se algum item falhar, pare o piloto desse negócio e registre: etapa, horário,
conta, slug do QR, resultado esperado e resultado observado.

## 1. Conta e configuração inicial

- [ ] Criar uma conta nova (`/signup`), entrar e concluir a configuração
  inicial em `/configuracao`. Essa tela grava `business_name` e
  `business_country` em `profiles` (`src/pages/Onboarding.tsx`), e o país do
  negócio é o dado que decide o idioma do cartão mais adiante. Para a Casa
  Due, `business_country` deve ficar `BR`.
- [ ] Configurar o Google em `/settings` com o negócio correto e confirmar
  que o nome e o link exibidos são os da Casa Due (aba de links externos,
  `src/pages/Settings.tsx`).

## 2. WhatsApp do dono

O aviso automático de comentário com nota baixa depende de duas coisas
gravadas antes do teste: um número de destino e um consentimento salvo. Sem
consentimento, o gatilho do banco devolve sem enviar nada e sem erro visível
(`notify_low_rating_feedback`, em
`supabase/migrations/20260829124017_alerta_imediato_comentario_privado.sql`).

- [ ] Em Configurações, salvar o número de WhatsApp do dono da Casa Due e
  confirmar o consentimento na tela. Isso grava `consented_at` em
  `whatsapp_notification_preferences` (`supabase/functions/whatsapp-notifications/index.ts`).
- [ ] **Confirmar que o aviso de comentário privado está ligado.** O gatilho
  exige três coisas, não duas: número, `consented_at` **e**
  `feedback_enabled`. Basta uma faltar para ele sair sem enviar nada e sem
  erro em lugar nenhum (`if pref is null or pref.consented_at is null or not
  pref.feedback_enabled then return`, linha 36 da migration
  `20260829124017_alerta_imediato_comentario_privado.sql`). O interruptor está
  na aba de WhatsApp do painel. Se o passo 5 não produzir linha nenhuma na
  `whatsapp_outbox`, este é o primeiro lugar a olhar, antes de suspeitar do
  relay ou da VPS.
- [ ] Disparar "enviar mensagem de teste" e confirmar que o painel mostra a
  mensagem "Mensagem na fila para {{recipient}}. A entrega costuma levar
  alguns segundos; o painel atualiza sozinho quando o WhatsApp confirmar."
  Essa chave (`testQueued`) existe nos três idiomas do painel
  (`src/i18n/owner/locales/pt-BR.json`, `pt-PT.json`, `en.json`) e aparece em
  `src/components/dashboard/WhatsAppNotificationWorkspace.tsx`.
- [ ] Confirmar que a mensagem chega no WhatsApp do número salvo em poucos
  segundos, não em até um minuto. O relay varre a fila a cada 10 segundos por
  padrão (`services/openwa-relay/src/server.mjs:17`,
  `dispatchIntervalMs: Number(process.env.BINNO_DISPATCH_INTERVAL_MS || 10_000)`),
  já implantado e medido na VPS: a espera na fila caiu de 54,0 s para 0,5 s
  (`docs/estado-do-piloto-whatsapp.md`). Se a entrega passar de
  aproximadamente um minuto, isso é anormal. Não clique de novo várias vezes:
  confira o estado da linha em `whatsapp_outbox` (mesma tabela do passo 5).

## 3. QR: criar, imprimir, escanear

- [ ] Criar um QR em `/qrcodes`. Como a Casa Due roda em produção
  (`binno.pro`), o aviso de origem não canônica **não deve aparecer**. Se
  aparecer, o ambiente não é o de produção. Pare e corrija o domínio antes
  de imprimir qualquer coisa. (Esse aviso existe para impedir que um QR
  criado numa prévia da Vercel ou numa rede local seja impresso e colado numa
  mesa por engano; ver `isNonCanonicalPublicOrigin` em `src/lib/qr.ts` e a
  confirmação obrigatória em `src/components/dashboard/QRCodeGenerator.tsx`.)
- [ ] Baixar o cartão para impressão e imprimir uma cópia. **Confirmar que o
  texto do cartão sai em português do Brasil** ("Nos avalie no Google",
  "Aponte a câmera do celular para o QR Code"). Isso vem de
  `qrCardCopy('pt-BR')` em `src/lib/businessLocale.ts`, escolhido porque
  `business_country` da Casa Due é `BR`, e o telefone do gestor só decidiria o
  idioma se o país do negócio estivesse vazio.
- [ ] Escanear **o QR impresso** com o celular e confirmar que abre o
  negócio certo.

## 4. Tela do QR: avaliação pública e comentário privado lado a lado

- [ ] Na tela que abre pelo QR, confirmar que a opção de avaliação pública
  (Google) e a opção de comentário privado aparecem **lado a lado, sem
  nenhuma pergunta de satisfação antes**. Não existe mais uma etapa que
  esconda a avaliação pública dependendo da resposta do cliente
  (`ReviewChooser.tsx` oferece as duas sempre; ver também o comentário em
  `src/components/forms/FeedbackForm.tsx` sobre por que esconder a opção
  pública por nota seria "review gating").
- [ ] Escolher a opção de comentário privado. Na tela seguinte, atribuir 3
  estrelas ou menos e enviar um comentário de teste identificável (nome ou
  contato que dê para reconhecer depois). Confirmar que a opção de avaliação
  pública continuou visível e clicável durante todo o fluxo. **Não avance
  para publicar no Google.**
- [ ] Confirmar que a tela de agradecimento aparece e que a opção pública
  segue disponível ali também (o link do Google é levado adiante no estado
  de navegação, não se perde depois do envio).

## 5. O aviso de WhatsApp chega

Este é o passo que a versão de julho não tinha, porque a entrega de WhatsApp
só passou a funcionar de ponta a ponta em 29/08/2026
(`docs/estado-do-piloto-whatsapp.md`).

- [ ] Em poucos segundos (a fila do relay é varrida a cada 10 segundos, ver
  passo 2), o WhatsApp do dono da Casa Due deve receber um aviso começando
  com "Binno" e
  "Comentário privado agora, nota X de 5", com o texto do comentário e o
  contato deixado, se houver. Isso é o gatilho `notify_low_rating_feedback`
  disparando após o `insert` em `internal_feedback` (nota <= 3), que grava
  uma linha em `whatsapp_outbox` com `kind = 'feedback'`.
- [ ] **Evidência a conferir no Supabase**, tabela `whatsapp_outbox`: deve
  existir uma linha nova com `kind = 'feedback'`,
  `idempotency_key = 'feedback:<id do comentário>'`, e `status` avançando de
  `queued` para `sending` e por fim `delivered` (ou pelo menos `accepted`,
  se a confirmação de entrega ainda não tiver voltado). Se `status` ficar
  parado em `queued` por mais de um minuto, o relay não está varrendo a fila.
  Não é falha deste checklist, é assunto para `docs/estado-do-piloto-whatsapp.md`.
- [ ] Enviar um segundo comentário de teste, agora com nota 4 ou 5, e
  confirmar que **nenhuma linha nova aparece em `whatsapp_outbox`** para
  esse comentário. O gatilho só age em nota 3 ou menos; nota 4 é elogio com
  ressalva e fica só no painel.

## 6. Comentários que pedem atenção

- [ ] Voltar à Visão geral do painel (`/dashboard`) e confirmar que o bloco
  **Comentários que pedem atenção**
  (`src/components/dashboard/PendingCommentsBanner.tsx`), acima da fila de
  respostas, aparece com o caso do passo 4 e que um toque no botão leva à
  aba Avaliações com esse caso visível.
- [ ] Confirmar que a lista completa dos casos internos em `/reviews`
  (`src/components/dashboard/cases/CasesList.tsx`) mostra o mesmo comentário,
  a mesma nota, o mesmo negócio e o mesmo estado do caso do passo 4.
- [ ] Marcar o caso como tratado e confirmar que o estado persiste depois de
  atualizar a página (o estado é gravado em `internal_feedback.is_addressed`
  no Supabase, não só na tela) e que o bloco da Visão geral desaparece quando
  não houver mais nenhum caso pendente.

## 7. Encerrar sessão

- [ ] Sair pelo menu do perfil (`signOut`, `src/components/layout/Navbar.tsx`)
  e confirmar que uma rota protegida, como `/dashboard`, volta ao login
  (`src/components/auth/ProtectedRoute.tsx`).

---

## O que ficou de fora, e por quê

- **Item de julho sobre TripAdvisor** não fazia parte do roteiro original;
  não foi adicionado aqui porque não há confirmação de que a Casa Due tenha
  perfil no TripAdvisor configurado. Se tiver, o mesmo passo 4 vale para essa
  opção, que aparece pelo mesmo `ReviewChooser` quando o link existe.
- **O log de execução de 31/07/2026** (Place ID, migração para Place Details
  New, etc.) não foi trazido para este documento porque descreve bugs de uma
  versão do produto que já não existe. A tela de avaliações do Google não
  mudou desde então, mas o restante do produto mudou o bastante para que
  misturar os dois registros confundisse quem for executar hoje. Esse
  histórico continua no controle de versão deste arquivo, se for preciso
  consultá-lo.

## Histórico

A primeira execução completa deste roteiro foi feita por Marcelo em
31/07/2026, contra o produto daquela data (antes do `ReviewChooser`, antes do
WhatsApp funcionar e antes de `business_country` existir). O relato dessa
passagem está preservado no histórico do Git deste arquivo.
