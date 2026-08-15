# Estado do Binno — 15 de agosto de 2026

Backlog vivo. Para contexto, decisões e armadilhas, ler também `HANDOFF.md` e
`AGENTS.md`.

## Marca — 15 de agosto de 2026

- [x] Definir **Binno** como novo nome do produto e adquirir `binno.pro`.
- [x] Aplicar Binno na interface, metadados, documentos vivos e mensagens do
  produto, preservando identificadores técnicos `appreview:*` por
  compatibilidade.
- [ ] Fazer pesquisa e registro marcários antes de divulgação ampla, campanha
  ou mudança do nome no projeto Google Cloud. Domínio adquirido não prova
  disponibilidade de marca.

## Onboarding e QR — 15 de agosto de 2026

- [x] Identificar na passagem do Mania que a ligação oficial ao Google não pode
  ser apresentada como ação disponível antes da aprovação Basic/OAuth.
- [x] Reordenar localmente a configuração: link público do Google obrigatório
  primeiro, dados do negócio e telefone por país depois, QR por último.
- [x] Adicionar telefone internacional com bandeira, código e formatação;
  usar o país do estabelecimento para a cópia do cartão QR.
- [x] Atualizar o cartão QR para convidar a partilhar a experiência e ajudar o
  negócio a melhorar, sem review gating e sem atribuir idioma pela tela do dono.
- [ ] Revisar visualmente o fluxo atualizado no navegador antes de publicar.
- [ ] Aguardar a aprovação Basic do Google para habilitar a conexão oficial,
  a fila completa e o Radar com dados autorizados.

## Teste experimental local — 15 de agosto de 2026

- [x] Recolher manualmente uma amostra limitada e autorizada do perfil público
  **Mania de Petiscos** via Apify: 49 avaliações, custo observado de
  **US$ 0,02945**, sem agenda e sem nova chamada automática.
- [x] Preparar `/demo?view=snapshot` para a leitura local da amostra, com fonte,
  data, limite e ressalva de não ser integração oficial visíveis.
- [x] Manter o arquivo de dados fora do Git, produção, Supabase e cache oficial;
  somente agregados sanitizados, sem dados de avaliadores ou textos.
- [x] Consolidar o onboarding e o snapshot experimental no PR
  [#27](https://github.com/MarceloDiba/appreview/pull/27); CI verde no commit
  `af6a922` (run 99), sem merge ou deploy.
- [x] Preparar localmente a coleta manual via Apify: máximo de 50 avaliações
  Google, descarte de dados de avaliadores, auditoria sanitizada, intervalo de
  24 h por negócio e limite mensal configurável. O botão público e a Edge
  Function continuam desligados por padrão.
- [ ] Cadastrar `APIFY_API_TOKEN` por canal seguro, aplicar a migration e
  configurar a função apenas no servidor antes de ativar o teste Apify em
  ambiente publicado.
- [~] Teto do piloto manual autorizado em 15/08 (recomendação: US$ 5/mês).
  Falta cadastrar `APIFY_API_TOKEN` por canal seguro; sem esse segredo a
  migration, a função e qualquer coleta continuam não publicadas.
- [x] Reorganizar `/demo?view=snapshot` como dashboard da fonte experimental,
  distinguindo fatos públicos observados de fila, Radar e respostas oficiais.
- [x] Levar a mesma leitura experimental ao Painel autenticado durante a
  validação local: o retrato do Mania substitui os cartões vazios apenas quando
  a amostra está disponível, identifica Apify e nunca se apresenta como
  conexão oficial ou fila completa.
- [ ] Aguardar aprovação Basic do Google antes de substituir essa amostra por
  OAuth, seleção de local e sincronização oficial completa.
- [~] Configurar DNS de `binno.pro` no GoDaddy conforme instrução da Vercel.
  Os domínios já estão associados ao projeto, mas ainda aparecem como
  `misconfigured`; não anunciar como site público até a verificação concluir.

## Em validação local — 14 de agosto de 2026

- [x] Reverter a proposta de fila operacional que exigia responsável,
  providência, resultado e datas.
- [x] Remover a pergunta de sentimento antes do acesso público e oferecer Google
  diretamente, mantendo comentário privado opcional e sem review gating.
- [x] Medir passivamente aberturas do QR, cliques para Google/TripAdvisor e
  comentários privados, sem chamar clique de avaliação.
- [x] Preparar snapshots de nota e total reais do Google e um painel de evolução
  com ressalva explícita de não causalidade.
- [x] Reorientar landing, demonstração, dashboard e Avaliações para resultado no
  Google e apoio a respostas.
- [x] `npm run verify` verde localmente.
- [ ] Revisão de Marcelo no produto local antes de qualquer PR/publicação.
- [x] Aplicar a migration `20260814190000_google_outcome_metrics.sql` no
  Supabase: tabelas de eventos do QR e snapshots criadas em 15/08 com RLS e
  políticas verificadas. Não houve chamada manual à API Google.
- [ ] Fazer o merge do PR #24 e confirmar o deploy automático em produção antes
  de iniciar a recolha do piloto concierge.
- [x] Reposicionar localmente a experiência como assessor de reputação, com
  landing e demonstração aprovadas visualmente.
- [x] Criar briefing no painel a partir do cache Google e do gerador
  determinístico de respostas, sem custo externo.
- [ ] Definir provedor, consentimento, frequência e custo antes de implementar
  relatórios ou notas proativas por WhatsApp.
- [x] Redesenhar localmente o painel como assessor: reputação, prioridade do
  dia, saúde do Perfil Google e caminho do QR.
- [x] Fazer o demo reutilizar os mesmos componentes do painel e disponibilizar
  a revisão ilustrativa em `/demo?view=panel`.
- [x] Documentar em `PLANO_FUNCIONAL.md` o caminho até uma versão realmente
  funcional.
- [x] Prototipar localmente uma fila assistida com cinco avaliações do dia,
  edição de resposta, adiamento, avanço item a item e resumo final.
- [x] Ligar a prioridade ilustrativa do painel à fila em `/demo?view=queue`,
  sem publicar respostas ou inventar que o recurso já funciona com o Google.
- [x] Aplicar localmente a direção visual aprovada: painel mais compacto,
  coluna lateral, fundo neutro, azul para ação e violeta como assinatura.
- [x] Levar a mesma paleta, cartões e hierarquia para a fila assistida e validar
  o fluxo completo na demonstração local.
- [x] Construir o Radar de Reputação em `/demo?view=radar`: quatro estados
  ilustrativos (estável, risco, força e oportunidade), uma prioridade por vez e
  evidência, período e fonte visíveis.
- [x] Consolidar o Radar numa única leitura: prioridade no topo e os quatro
  sinais visíveis abaixo, sem depender de abas; a evidência só expande quando
  o gestor quiser aprofundar.
- [x] Preparar o backend local do Radar para a conexão oficial: calcula fila
  real sem resposta e só destaca temas recorrentes com evidência objetiva. Sem
  conexão ou sincronização completa, não estima nem mostra números parciais.
- [ ] Aprovar visualmente o Radar com Marcelo antes de ligar sinais reais do
  Google ou qualquer automação.
- [x] Preparar localmente OAuth, armazenamento cifrado de token, seleção de
  localização, importação paginada e publicação explícita de respostas para o
  Perfil da Empresa no Google. Nada foi aplicado ou chamado remotamente.
- [x] Ligar localmente Configurações → consentimento → escolha da localização →
  fila real, com fallback honesto para o cache público enquanto a conexão não
  existe.
- [~] Criar projeto Google Cloud exclusivo e configuração OAuth externa:
  concluídos em 15/08 no projeto `app-review-505612`; nenhum cliente OAuth,
  segredo, API ou chamada Google foi criado/ativado.
- [~] Acesso Basic às Google Business Profile APIs solicitado em 15/08/2026
  para `app-review-505612`; protocolo Google `0-0755000041728`.
  - Identidade usada: Perfil validado **Noá Agência Digital** e
    `noadigital.com.br`; Marcelo atribuiu gestão a `diba@noadigital.com.br`.
  - O Google indicou previsão dinâmica de 7 a 10 dias úteis. Não ativar APIs,
    criar cliente OAuth, configurar segredos ou publicar o lote antes da
    aprovação explícita.
- [ ] Após aprovação Basic, criar o cliente OAuth Web, aplicar/publicar o lote
  e só então exibir contagem real de respostas pendentes, idade de fotos ou
  dados do perfil.
- [ ] Com consentimento do dono, ligar uma localização piloto e sincronizar até
  ao fim da paginação; só então trocar a fila ilustrativa por dados reais.
- [x] Preparar o piloto concierge de sete dias sem a API Business Profile:
  QR, links públicos, comentário privado opcional e medição de intenção, com
  limites explícitos em `docs/piloto-concierge-sem-api-google.md`.
- [~] PR [#24](https://github.com/MarceloDiba/appreview/pull/24) publicado;
  CI verde no run 84 e preview da Vercel `READY` para `e0402ed`. A migration de
  métricas está aplicada; falta merge/deploy de produção antes de iniciar o
  piloto do Mania.
- [ ] Com o aceite do titular do estabelecimento escolhido, executar o piloto
  concierge sem atribuir ao Binno avaliações que só o Google pode confirmar.
  - Estabelecimento escolhido por Marcelo em 15/08: **Mania de Petiscos**,
    Lisboa. O link curto do Google foi fornecido pelo Marcelo; a confirmação do
    negócio, idioma e destino fica no teste do QR físico, não é inferida do
    encurtador.

## Regra de produto que não pode regredir

O Binno é gestão de reputação para donos de negócio que não sabem de
tecnologia. A avaliação pública é sempre oferecida, qualquer que seja a nota.
Condicionar a opção pública à nota é review gating e é proibido.

## Em produção

Produção: https://appreview-flame.vercel.app

- Review gating corrigido.
- QR code real, gerado localmente, com cartão A6 pronto para imprimir.
- Dashboard e Central de Atenção com dados reais.
- Avaliações reais do Google existentes em cache. Novas importações dependem da
  migração preparada para Place Details (New).
- Sugestões de resposta editáveis, sem publicação automática.
- Termos e Privacidade.
- Dados legais da MDR, lei e foro do Brasil e texto LGPD+RGPD (PR #16). O texto
  está publicado no código, mas continua pendente de revisão jurídica externa.
- Configuração guiada em `/configuracao`.
- Fluxo do cliente em pt-BR, pt-PT e inglês, sem espanhol.
- Painel completo do dono em pt-BR, pt-PT e inglês (PR #15). O merge `6eda1c9`
  chegou à `main` e o deploy automático ficou saudável no Vercel.
- Sem dados demonstrativos à vista do cliente nas telas principais.
- `npm run verify` é o contrato único local e do CI: TypeScript, paridade do
  i18n do painel e build.
- Logout encerra a sessão antes de voltar à página inicial.
- Interfaces falsas de notificações e administração foram removidas.
- Autoatribuição administrativa bloqueada no Supabase.
- Cache do Google com migration versionada, RLS por proprietário e Edge
  Function autenticada, limitada a uma consulta por conta a cada 12 horas.

## Prontidão técnica concluída

- PRs #17, #18, #19 e #20 mergeados em ordem na `main`.
- Deploy automático da Vercel saudável em todos os merges; último commit
  `d13ceb4`.
- Migrations de proteção administrativa e cache registradas no Supabase.
- Edge Function `fetch-google-reviews` ativa na versão 6 com JWT obrigatório e
  resolução autenticada de links curtos `g.page`.
- Nenhuma chamada à API paga do Google foi feita durante o rollout.
- Os dados reais preservados permanecem intactos: 1 vínculo, 1 lugar e 5
  avaliações em cache.
- O reteste confirmou que a resolução do `g.page` e a gravação do Place ID
  funcionam. O 502 seguinte vem da consulta ao endpoint legado; a correção migra
  para Place Details (New) e mantém links obrigatórios de autor e origem.
- A tabela oficial consultada em 31/07/2026 concede 1.000 consultas
  bem-sucedidas/mês sem custo para essa categoria. O cache de 12 h limita dois
  pilotos a cerca de 120/mês; acima do limite, a tarifa publicada é US$ 25 por
  1.000 consultas.

## Antes do piloto

1. Criar uma conta totalmente nova e repetir a configuração inicial; a passagem
   de 31/07 foi feita com a conta existente da Noá.
2. Depois da publicação da migração para Place Details (New), reabrir
   Avaliações do Google e confirmar negócio, média, total, avaliações e links
   individuais de origem.
3. Decidir depois o destino da conta de teste mista preservada: ela contém dados
   reais do H5 e não pode ser apagada em bloco.
4. Revisão jurídica externa do PR #16.

## Limpeza de dados de teste

Concluída com inventário e verificação em 30/07. Foram removidas três contas
puramente de teste e cinco registros E2E/smoke de uma quarta conta. A conta
operacional da Noá e os 7 registros reais do H5 (vínculo, lugar e 5 avaliações
em cache) foram preservados. Evidência completa em
`docs/limpeza-dados-teste-2026-07-30.md`.

## Próximos temas

1. **Notificações:** a interface sem efeito foi removida no PR #18. Para
   reintroduzir, definir eventos, canais, provedor, consentimento e tratamento
   de falhas; só então implementar entrega real e preferências persistidas.
2. **Google self-service:** adicionar busca/autocomplete; hoje é preciso colar
   o link. Não bloqueia o piloto concierge.
3. **Admin:** a rota demonstrativa com usuários, receita e pagamentos
   inventados foi removida e a migration de proteção foi aplicada. Antes de
   criar uma área real, definir quem provisiona administradores e implementar
   autorização no servidor.
4. **Modelo de agência:** permitir que a NOÁ administre vários clientes num
   único lugar. Passa a doer a partir do terceiro cliente.
5. **Stripe:** cobrança real continua manual. Qualquer integração exige
   aprovação por mexer com dinheiro.

## Piloto

H5 Texas Burger — Avenida e Mania de Petiscos, ambos em Lisboa. Marcelo está em
Aracaju até dezembro; o arranque será remoto.

A passagem manual de 31/07 validou QR físico, idioma, nota baixa sem gating,
Central de Atenção, persistência do caso tratado e logout. O primeiro defeito da
importação foi corrigido: o link curto `g.page` agora produz e grava o Place ID.
O reteste encontrou uma segunda falha no endpoint legado da Places API; a
migração para Place Details (New) está preparada. Evidência em
`docs/checklist-piloto-e2e.md`.

## Riscos e armadilhas

- Supabase está em São Paulo e o piloto é português: há transferência
  internacional de dados. A Política de Privacidade declara LGPD+RGPD, mas isso
  não substitui revisão jurídica.
- O endereço do QR não é editável de propósito. A edição manual já causou QR
  apontando para página inexistente.
- O cartão impresso é material do cliente final e permanece trilingue.
- Há cópias locais do macOS com nomes `* 2.ts`/`* 2.tsx`; não pertencem ao git
  e não devem entrar em commits.
- O lint ainda é informativo por causa de dívida herdada do projeto original.
