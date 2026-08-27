# Estado do Binno — 20 de agosto de 2026

Backlog vivo. Para contexto, decisões e armadilhas, ler também `HANDOFF.md` e
`AGENTS.md`.

## Prontidão para venda — 27 de agosto de 2026

- [x] Definir cobrança pelo país onde o negócio opera: esse país, salvo em
  `profiles.business_country`, é a fonte comercial. IP, idioma e telefone não
  definem preço.
- [x] Preparar a venda brasileira de R$199/mês na conta live da MDR Propaganda:
  preço `price_1U93b28uAISU0uycpRFXGwOO`, segredos no Supabase e webhook live
  já configurados.
- [~] Publicar a migration `business_country` e as funções de cobrança que
  derivam o mercado no servidor. A ordem é obrigatória: Supabase antes do
  deploy da interface, para não consultar uma coluna inexistente.
- [ ] Abrir e cancelar um Checkout live de teste no Brasil, confirmando o
  webhook, a assinatura gravada e o bloqueio de país divergente.
- [ ] Configurar e testar o Customer Portal da conta brasileira.
- [ ] Manter a Europa indisponível publicamente. Antes de €49/mês, alinhar
  entidade vendedora, termos, privacidade, fiscalidade, catálogo, portal,
  webhook e compra de teste próprios.

- [~] Acompanhar candidatura oficial de Basic access do Google: submetida em
  21/08 pela conta `diba@noadigital.com.br` para o projeto `app-review-505612`.
  Registo Google: **8-5255000041379**. A quota de Account Management segue em
  0 QPM; o estado é em análise até a confirmação do Google por e-mail ou a
  alteração de quota.
- [~] Transformar OpenWA local em entrega operacional intercambiável: a branch
  `codex/openwa-operational-pilot` contém migration, fila, funções e relay
  privado. Em 25/08, a migration e as funções foram aplicadas, o relay HTTPS
  foi iniciado na VPS Hostinger, a sessão `binno-piloto` foi pareada e o
  webhook assinado foi validado. Faltam somente o teste manual autorizado de
  uma mensagem e a evidência de estados reais que o OpenWA reportar.
- [x] Manter Apify como leitura temporária autorizada, com limites e fonte
  explícita, até a Basic API ficar disponível. Ela não é apresentada como
  conexão oficial do Perfil da Empresa.

- [x] Executar o Lote 1 do plano em
  [docs/plano-prontidao-venda-binno.md](docs/plano-prontidao-venda-binno.md):
  [PR #30](https://github.com/MarceloDiba/appreview/pull/30) foi mergeado,
  Vercel está saudável e a migration de QR mínimo foi aplicada no Supabase.
- [~] Aplicar e verificar a fundação oficial do Google: as migrations de
  conexão e snapshots já estão no Supabase, com a função do Vault limitada a
  `service_role`. Em 21/08, a API Business Information está desativada, o
  OAuth está em Teste e não há cliente específico do Binno. Faltam acesso
  Basic/quota, APIs, credenciais, três Edge Functions, localização e a
  sincronização paginada completa.
- [~] Preparar histórico agregado do assessor: a tabela de snapshots por
  localização já está aplicada sem texto ou identidade de avaliador. Alertas,
  Radar e resultado observado continuam dependentes da publicação da função e
  da primeira e segunda leituras oficiais comparáveis.
- [ ] Escolher fornecedor, custo e operação de WhatsApp Business antes de
  transformar as preferências locais em envio de produção.
- [ ] Confirmar cobrança, termos, privacidade, suporte e playbook de piloto
  antes de abrir venda autônoma.

## Contrato de produto — 20 de agosto de 2026

- [x] Reconstruir localmente a página oficial e `/demo` para refletir o Binno
  como assessor de reputação no Google, sem tocar no cockpit autenticado.
  Inclui Monitoramento, WhatsApp, fila, histórico por nota, Radar, perfil e
  conversão a €49/mês. O demo tem um único cenário fictício identificado e
  preserva QR como abertura e clique, sem atribuir avaliação publicada. O
  recorte do topo e o demo usam a mesma composição `ApprovedCockpitDashboard`
  do painel consolidado, em modo demonstrativo sem estado real.
- [ ] Revisar visualmente a página pública local com Marcelo e, se aprovada,
  publicar o PR temático. A publicação continua dependente de autorização
  explícita para merge/deploy.
  O ajuste local de contraste do Radar e a QA responsiva em 390 px, 768 px e
  desktop foram concluídos em 20/08; falta somente a aprovação visual.
- [x] Consolidar as decisões aprovadas no
  [Contrato de produto Binno](docs/contrato-produto-binno.md): papel de
  assessor, arquitetura do painel, fila, QR, WhatsApp, fontes de dados e
  limites de apresentação.
- [x] Adicionar guarda ao `npm run verify` para os itens verificáveis do
  contrato. Qualquer alteração estrutural intencional deve atualizar o contrato
  e receber aprovação explícita de Marcelo antes de ser aceita.
- [x] Adicionar a camada aprovada de assessoria sem substituir os módulos do
  painel: Radar do Binno, Plano de hoje, Resultado observado e oportunidade
  positiva nas Boas práticas.
- [x] Manter Radar do Binno e Plano de hoje visíveis entre coletas: força
  positiva agregada quando houver evidência; estado curto de acompanhamento
  quando não houver alerta nem oportunidade específica. Alertas e WhatsApp
  proativo continuam restritos a anomalias com critério conservador.
- [x] Congelar a composição aprovada como base de evolução: fila, volume,
  leitura por nota, QR, temas, reputação, WhatsApp, boas práticas, completude,
  mudança semanal, Radar, Plano e Resultado. Novos módulos são aditivos e
  dependem de aprovação visual explícita quando alterarem hierarquia.
- [x] Preparar alerta conservador da coleta manual Apify e entrega automática
  **somente** após essa ação explícita, com consentimento, número e OpenWA
  local. Sem agenda, gasto recorrente, retry ou entrega de produção.
- [x] Bloquear por contrato o retorno ao layout legado quando o navegador não
  tiver snapshot Apify: o cockpit aprovado passa a renderizar os fatos já
  confirmados e `—` onde ainda não há leitura.

## Painel aprovado — 18 de agosto de 2026

- [x] Reaplicar no painel autenticado as quatro referências aprovadas: fila
  individual, volume, leitura por nota e cartões laterais de reputação,
  WhatsApp, completude e mudança semanal.
- [x] Reduzir a navegação da visão principal para Visão geral, Avaliações e
  WhatsApp; preservar nesta última as preferências completas de resumo,
  alertas, número, dia, hora, consentimento e teste manual.
- [x] Remover da Visão geral os avisos técnicos e explicações repetidas de
  origem, retenção, coleta e limitações. Onde a fonte não comprova o dado, o
  módulo usa estado neutro, sem tendência ou percentual inventado.
- [x] Preparar a coleta Apify para ler mais variações de nome público/link
  individual e devolver histórico sanitizado de 12 semanas para volume,
  notas e respostas observadas.
- [x] Restaurar a composição visual aprovada, sem substituir gráficos por
  barras quando a fonte ainda não oferece histórico; corrigir a leitura semanal
  para não afirmar mudança inexistente.
- [x] Clarificar o WhatsApp: número do gestor para avisos, número próprio/equipa
  para prévia manual e quatro preferências de conteúdo salvas localmente.
- [x] Reutilizar o telefone salvo no onboarding como padrão dos dois campos de
  WhatsApp, mantendo a edição manual do gestor.
- [x] Corrigir a coleta Compass para ler o nome público (`name`) e a URL direta
  (`reviewUrl`) da avaliação; a nova função está publicada e aguarda a próxima
  coleta permitida para preencher a fila atual.
- [x] Publicar a nova versão da Edge Function no Supabase com autorização.
- [x] Fazer uma coleta manual permitida após o intervalo de 24 h. Em 20/08, a
  leitura do Mania retornou nomes públicos, deep links individuais e histórico
  real para os cartões, sem criar agenda automática.

## Arquitetura do dashboard — 17 de agosto de 2026

- [x] Preparar localmente a fila pública observada para nome público e link
  individual da avaliação, sem foto, ID, perfil, banco de dados ou retenção
  acima de 14 dias no navegador autenticado.
- [x] Corrigir o destino de “Abrir Google”: URL individual da avaliação quando
  a coleta disponibilizar; fallback identificado para o perfil do negócio.
- [x] Reintroduzir **Boas práticas** como box próprio na Visão geral e na aba:
  uma dica por vez, rotação estável e prioridade para resposta quando houver
  evidência na fila.
- [x] A função atualizada foi publicada no Supabase e a coleta manual do Mania
  foi renovada em 20/08: a fila mostra nome público e deep link individual
  quando devolvidos pela fonte; sem link específico, ela oferece somente cópia.

- [x] Reaplicar no painel autenticado a referência compacta aprovada por
  Marcelo: prioridade e fila, volume, notas, QR e temas; reputação, WhatsApp,
  completude e alteração numa coluna lateral.
- [x] Preencher os módulos dessa referência somente com o que a origem já
  permite: volume da amostra (49), distribuição de cada nota, eventos reais do
  QR nos últimos 30 dias e estado explícito para temas sem texto/histórico sem
  segunda leitura. Não há valores ilustrativos no painel autenticado.
- [x] Tornar visíveis na fila parcial os totais observados (49 na amostra, 47
  sem resposta observada e 2 respostas observadas), sem chamar isso de fila
  completa nem atribuir clientes inexistentes.
- [x] Repor a distribuição de estrelas no cartão de reputação e manter tempo
  médio de resposta e novas avaliações em 30 dias com estado explícito quando
  a fonte não disponibilizar datas.
- [x] Criar na aba WhatsApp preferências locais para resumo semanal, alertas,
  número, dia, hora e consentimento, sem programação ou envio automático.
- [~] Confirmar a aprovação Basic do Google no projeto correto **App Review**
  (`app-review-505612`) com `diba@noadigital.com.br`: em 17/08, a conta e o
  projeto foram confirmados no Console, mas a API Business Profile continua
  desativada, não há cliente OAuth e não há sinal de aprovação. Com
  `diba@noadigital.com.br` ativo, a Central OAuth apenas confirma que o app
  está em teste e não exige verificação OAuth; a página da Business Information
  API ainda oferece **Ativar** e informa que, sem acesso GBP, a quota pode ficar
  em zero. Portanto, o estado do protocolo `0-0755000041728` segue **não
  confirmado**, não recusado.
- [x] Reconhecer a amostra existente do Mania como leitura **Apify
  experimental concluída** (4,9, 456, 49, 2 respostas observadas), sem a
  apresentar como ligação oficial nem como falha de leitura.
- [x] Auditar localmente painel, Configurações, QR, rotas de demo e proxy
  OpenWA; `npm run verify` verde e botão de envio manual protegido por
  destinatário, texto e confirmação.
- [x] Corrigir a cópia dos QR Codes para atribuir apenas abertura e clique,
  nunca a avaliação publicada.
- [ ] Criar um QR de piloto a partir da conta do Mania e validar destino,
  idioma e evento no telemóvel; o QR **Piloto Mania — 17/08** (slug
  `cc6e12c5`) foi criado com destino de rede local correto. Falta apenas a
  passagem no telemóvel conectado à mesma rede Wi-Fi.
- [x] Corrigir a origem do QR em prévia local: `VITE_PUBLIC_APP_URL` substitui
  `127.0.0.1` e a criação em loopback é bloqueada para não gerar um cartão que
  só abre no próprio Mac.
- [x] Isolar o proxy OpenWA: ele exige `BINNO_ENABLE_OPENWA_PROXY=true`; a
  prévia LAN do QR não expõe o canal local.
- [ ] Reexecutar QA visual conjunto da referência e painel autenticado numa
  superfície de navegador que permita a comparação; a política atual bloqueou
  o ficheiro temporário de comparação.
- [x] Tornar obrigatória no painel autenticado a ordem aprovada: Prioridade
  agora, Forças e fragilidades, Plano de melhoria do Perfil Google, Métricas
  de apoio e Resumo WhatsApp.
- [x] Quando a origem é a amostra agregada Apify, mostrar a fila e a sugestão
  de resposta como indisponíveis por falta de texto/autoria, sem completar esse
  estado com dados inventados.
- [x] Preparar o modo **fila pública observada** para a próxima leitura Apify:
  texto sem autor somente no navegador autenticado por 14 dias, resposta
  editável/copiável e estados distintos de rascunho, marca do gestor e resposta
  observada. O resumo persistido continua agregado e não identifica avaliadores.
- [x] Preparar briefing WhatsApp a partir da leitura experimental; a entrega
  continua manual e confirmada, sem agenda ou automação.
- [x] Validar uma nova leitura pública manual do Mania via Apify: 49 itens do
  Place ID confirmado, 33 comentários com texto, 49 datas, 2 respostas
  observadas e custo de US$ 0,02945. O resumo local usa apenas agregados
  (11 avaliações nos últimos 30 dias, média de 115,4 h e temas), sem persistir
  texto ou identificadores.
- [x] Corrigir a normalização de links `share.google` antes do actor Apify e
  reaproveitar no painel os agregados reais de temas, datas e resposta.
- [x] Auditar e configurar o proxy OpenWA local: a chave de bootstrap já
  existente foi aplicada somente ao processo de prévia, fora do repositório;
  a sessão `binno-piloto` aparece conectada e o envio continua protegido por
  destinatário, texto e confirmação explícita.
- [x] Cadastrar pelo canal seguro o segredo Apify dedicado, aplicar a migration
  e publicar a função do piloto. A coleta real do Mania em 17/08 concluiu com
  49 avaliações e 2 respostas públicas observadas; a fila com textos fica só
  no navegador autenticado por 14 dias e o banco reteve apenas agregados.
  Mantidos uma coleta bem-sucedida por negócio a cada 24 h e teto de 10
  execuções mensais.
- [x] Limitar o funil do QR a abertura e clique para o Google; avaliação
  publicada não é inferida nem atribuída individualmente.
- [x] Mostrar WhatsApp apenas como resumo futuro condicionado a dados
  suficientes e consentimento; o canal local continua somente manual.
- [ ] Levar a mesma arquitetura para a fila real após OAuth oficial, seleção da
  localização e sincronização paginada completa do Perfil da Empresa.

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

- [x] Consolidar em 17/08 o cockpit demonstrativo Binno no layout/arquitetura
  escolhidos por Marcelo: fila de respostas, leitura de forças e fragilidades,
  volume, boas práticas, Perfil no Google e WhatsApp na mesma visão compacta.
  A demo em `/demo?view=panel` passou em `npm run verify` e em `design-qa.md`;
  permanece local, ilustrativa e sem integrar ou publicar respostas/mensagens.
- [ ] Aprovar visualmente o cockpit demonstrativo e então portar os módulos
  aprovados ao painel autenticado apenas onde houver origem, período e
  completude de dados suficientes.

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

- [x] Renovar a leitura Apify do Mania após corrigir nome público e permalink
  individual; a fila agora mostra os dados devolvidos pela fonte e oferece
  copiar + abrir somente quando há URL específica da avaliação.

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

### WhatsApp temporário — confirmado em 17/08/2026

O piloto local OpenWA, restrito a `127.0.0.1`, confirmou vínculo de um número
de Marcelo e entrega de uma única mensagem manual para esse mesmo número. Não
há webhook, agenda, preferências, importação de conversas, integração com o
Binno ou publicação. A primeira tentativa Baileys falhou; a validação aprovada
ocorreu com `whatsapp-web.js` e Chrome local. Isto é prova de viabilidade
técnica pontual, não prontidão de produção.

O painel autenticado local agora detecta essa sessão por um proxy de
desenvolvimento em `127.0.0.1`, sem expor a chave no navegador. A aba WhatsApp
permite um envio manual, exige destinatário em formato internacional e uma
confirmação por envio. Agenda, automação, webhook e persistência de preferências
continuam fora do escopo. Procedimento em `docs/openwa-local-pilot.md`.

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
  apontando para página inexistente. O slug permanece fixo enquanto o QR estiver
  ativo; o cartão com moldura é o padrão de impressão e o QR puro continua
  disponível para outros materiais.
- O cartão impresso é material do cliente final e permanece trilingue.
- Há cópias locais do macOS com nomes `* 2.ts`/`* 2.tsx`; não pertencem ao git
  e não devem entrar em commits.
- O lint ainda é informativo por causa de dívida herdada do projeto original.
