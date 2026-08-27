# Binno — documento de continuação (handoff)

Estado atualizado em 21/08/2026. Serve para retomar o trabalho noutra sessão ou noutra IA
sem redescobrir nada. Leia também `AGENTS.md` (regras) e `ESTADO.md` (backlog).

## Prontidão para venda — 25/08/2026 (em execução)

### Ajuste de configuração do WhatsApp — 27/08/2026 (verificado localmente; aguarda PR)

- A configuração passa a usar o seletor de país e a máscara internacional já
  existente no onboarding. Números brasileiros antigos de 10 ou 11 dígitos
  são migrados para `+55` ao carregar, evitando o erro de validação no teste.
- A mensagem de teste já vem preenchida, continua editável e não pode mais ser
  substituída pelo briefing automático. As preferências agora são apresentadas
  item a item: nota e total de avaliações, avaliações sem resposta, anomalias de
  reputação e melhorias do Perfil do Google.
- O resumo semanal server-side foi alinhado à escolha correspondente: entrega
  somente nota e total de avaliações; oportunidades, temas e alertas têm
  canais próprios e não são prometidos como parte de um pacote.
- Validação local concluída em 27/08: TypeScript, i18n do painel, guardas de
  produto/QR e build passaram por `npm run verify`.

### Lote OpenWA operacional e candidatura Google — em execução local

- Foi confirmada no projeto Google Cloud `app-review-505612` a presença das
  APIs Business Information e Account Management, mas a quota de Account
  Management permanece em **0 QPM**. Portanto, este projeto ainda não tem
  Basic access aprovado. O formulário oficial de candidatura está aberto na
  conta `diba@noadigital.com.br`. A candidatura foi submetida em 21/08 e tem
  o registo **8-5255000041379**. A reabertura posterior do workflow não trouxe
  o recibo, mas esse identificador confirma a submissão. O estado é **em
  análise**, não aprovado, até o e-mail do Google ou a alteração da quota.
- A função `sync-experimental-apify` segue ativa para o piloto e continua a
  limitar a leitura a 50 itens e uma coleta bem-sucedida a cada 24 horas por
  negócio. Ela é a fonte temporária para fila observada, Radar e métricas da
  amostra enquanto a API oficial não é aprovada.
- A branch `codex/openwa-operational-pilot` prepara a substituição do piloto
  local: fila server-side, preferências e consentimento, outbox idempotente,
  estados `queued` a `read`, funções autenticadas e relay privado em
  `services/openwa-relay`. O painel nunca recebe chave OpenWA. A futura troca
  para Meta Cloud API preservará contrato, UI, fila e histórico.
- A migration `20260821193000_whatsapp_delivery_outbox.sql` e as funções
  `whatsapp-notifications`, `materialize-whatsapp-notifications` e
  `sync-experimental-apify` foram aplicadas/publicadas no Supabase de
  produção em 25/08. A leitura posterior confirmou as três tabelas, RLS e o
  RPC de claim exclusivo do `service_role`. O histórico remoto de migrations
  já era divergente do diretório local, por isso nenhuma reparação global foi
  executada.
- A infraestrutura do relay foi preparada em 21/08 na VPS Hostinger já paga:
  Ubuntu 24.04, 8 GB de RAM, Docker 29.1.3 e Compose 2.40.3 instalados. O
  painel financeiro existente na porta 3000 e o ambiente AppReview em 5183
  foram identificados e preservados. UFW está ativo com SSH, 80, 443 e 3000
  liberados; o OpenWA não terá porta pública própria.
- O DNS `relay.binno.pro` aponta para a VPS e foi confirmado publicamente. Em
  25/08, o stack isolado foi iniciado: OpenWA continua privado, o relay Binno
  está saudável e Caddy fornece HTTPS. A sessão `binno-piloto` foi pareada; o
  webhook HMAC de `message.ack` e `message.failed` foi registado e o teste
  técnico devolveu 204. O relay usa variáveis privadas na VPS, nunca no
  navegador ou repositório.
- A chamada relay -> Supabase foi verificada e retornou fila semanal vazia.
  Não houve criação de item na outbox, disparo, entrega ou leitura de WhatsApp
  nesta implantação. O próximo passo é uma mensagem de teste manual somente
  após a confirmação explícita de Marcelo para o destinatário escolhido.
- O relay foi corrigido localmente para a API atual do OpenWA: usa a sessão por
  UUID, o prefixo `/api` e valida a assinatura HMAC do webhook. Os arquivos de
  implantação estão em `services/openwa-relay/hostinger.compose.yml` e
  `services/openwa-relay/Caddyfile`; `npm run verify` passou em 21/08.

- O plano consolidado por lotes está em
  [docs/plano-prontidao-venda-binno.md](docs/plano-prontidao-venda-binno.md).
  Ele separa a fundação segura, Google oficial, histórico do assessor,
  WhatsApp, cobrança e liberação controlada, com os portões que exigem decisão
  externa ou financeira.
- A página oficial e a demo estão no ar, mas o produto ainda não está pronto
  para venda autônoma: faltam API e credenciais oficiais do Google, WhatsApp
  de produção e cobrança.
- O [PR #30](https://github.com/MarceloDiba/appreview/pull/30) foi mergeado e
  o deploy automático está saudável. As migrations de QR mínimo, conexão do
  Google e snapshots foram aplicadas no projeto Supabase de produção. A
  política pública ampla de `profiles` foi removida; `profiles`,
  `platform_links` e `qr_codes` agora leem apenas pelo dono, exceto a função
  pública limitada do QR. Não alterar o cockpit aprovado neste pacote.
- A migration corretiva `20260821103000_restrict_google_token_function_execution`
  também foi aplicada: apenas `service_role` executa as funções que acessam o
  Vault. A leitura pós-aplicação confirmou `anon=false`,
  `authenticated=false` e `service_role=true` para o token de atualização.
- O mesmo pacote passou a preparar a base do histórico oficial do assessor:
  `google_business_reputation_snapshots` guarda uma leitura agregada por
  localização quando a paginação oficial termina. Não contém comentário,
  nome ou URL de avaliador. A importação da fila segue funcional mesmo se a
  persistência analítica falhar; alertas, Radar e resultado observado só serão
  ativados após leituras oficiais comparáveis.
- Consulta ao projeto `app-review-505612`, em 21/08: a My Business Business
  Information API está desativada; o app OAuth está em publicação **Teste**;
  não existe cliente OAuth específico do Binno. Há um cliente Web de outro
  produto da NOÁ, que não deve ser reutilizado. Não habilitar API, pedir
  acesso/quota, criar cliente ou registrar segredos sem autorização explícita.

> **Contrato vigente:** [docs/contrato-produto-binno.md](docs/contrato-produto-binno.md)
> é a referência aprovada de produto e não pode ser alterado por refatoração ou
> simplificação visual sem nova aprovação explícita de Marcelo.

> **Base visual consolidada em 20/08/2026:** commit local `c62f6f9` tornou
> visível a assessoria na leitura atual sem alterar os blocos aprovados. Toda
> evolução futura é aditiva a esta composição; não há autorização para voltar a
> telas resumidas, remover gráficos ou ocultar Radar/Plano por conveniência.

## Página oficial e demonstração pública — 20/08/2026 (local; aguarda PR)

- A página `/` foi reconstruída como a página oficial de vendas do Binno, com a
  mensagem central **“Seu assessor de reputação no Google.”**. A narrativa
  explica contexto do Maps, monitoramento, WhatsApp, fila assistida, leitura
  por estrela, Radar, plano do perfil e preço de **€49/mês**.
- A rota `/demo` agora contém apenas um cenário fictício marcado em toda a
  interface como **Demonstração ilustrativa**. Ela reutiliza a hierarquia do
  cockpit consolidado: Radar, fila, volume, notas, QR, temas, plano,
  completude e WhatsApp. Não há dados de cliente nem variações públicas por
  query string.
- O demo e o recorte no topo não mantêm mais um cockpit paralelo: ambos
  renderizam `ApprovedCockpitDashboard` em modo demonstrativo, com
  `ILLUSTRATIVE_DEMO_SNAPSHOT` e eventos QR fictícios isolados. Esse modo não
  lê número, preferências, histórico de envio ou ligação OpenWA local.
- Na demonstração, **Usar resposta** copia o rascunho e confirma o estado. A
  mensagem explica que, em conta conectada, o passo abre somente o permalink
  individual da avaliação. Não há publicação automática nem link fictício.
- O conteúdo novo público está em pt-BR, pt-PT e inglês no dicionário leve
  `src/i18n/marketing.ts`. Os textos novos não usam travessão. O painel
  autenticado não foi modificado por este pacote.
- Validação local concluída: desktop e mobile sem overflow horizontal,
  navegação do demo, cópia de resposta, preferências do WhatsApp e
  `npm run verify` verde. Não houve deploy.
- Em 20/08, a seção escura do Radar recebeu a variação de título e texto para
  fundo escuro: o contraste agora é branco/cinza-claro, sem alterar a sua
  hierarquia ou os dois cartões de força e fragilidade. A página oficial foi
  verificada em 390 px, 768 px e desktop, e o `/demo` também em 390 px, todos
  sem rolagem horizontal nem erros de console.
## Radar, Plano de hoje e resultado observado — 20/08/2026

- Marcelo aprovou que o Binno evolua de leitura para assessoria, sem alterar os
  blocos consolidados do painel. A hierarquia agora recebe três módulos
  adicionais: faixa **Radar do Binno**, cartão lateral **Plano de hoje** e
  cartão lateral **Resultado observado**.
- O Radar e o Plano não podem desaparecer só porque uma coleta não atingiu o
  limiar de alerta severo. Com dados reais disponíveis, o painel exibe a força
  agregada mais sustentada (por exemplo, tema positivo e quantidade de
  menções); sem sinal suficiente, mostra apenas o estado curto de
  acompanhamento. Alertas operacionais e mensagens proativas continuam
  dependentes do critério conservador de anomalia.
- A coleta Apify manual passa a calcular um alerta conservador somente quando
  há período comparável, duas ou mais notas baixas recentes e causa recorrente
  em ao menos dois comentários. O resultado também pode propor uma expressão
  positiva repetida em pelo menos três elogios. Nome, texto e URL de avaliador
  continuam fora do resumo persistido e do WhatsApp.
- No piloto local, uma coleta manual elegível pode enviar automaticamente o
  alerta ao WhatsApp do gestor quando número, consentimento e OpenWA local
  estiverem prontos. Não existe agenda, job de fundo, retry ou envio realizado
  por esta implementação sem uma nova coleta iniciada pelo gestor.
- O Dashboard não pode mais voltar para `GoogleOutcomeCard`/
  `ReputationAdvisorCard` quando faltar o snapshot no navegador. A rota deve
  manter o cockpit aprovado e mostrar somente os dados confirmados; ausência
  de fila, distribuição, temas ou histórico é `—`, não um layout alternativo.

## Fechamento de decisões e fila real — 20/08/2026

- O [Contrato de produto Binno](docs/contrato-produto-binno.md) consolida e
  fecha as decisões aprovadas: papel de assessor, ordem e módulos da Visão
  geral, fila assistida, regras de integridade, WhatsApp, QR e fontes de dados.
  É a referência obrigatória para toda continuação.
- `npm run verify` passou a executar `check:product-contract`, com nove guardas
  verificáveis contra regressão: arquitetura do painel, módulos essenciais,
  telefone do onboarding, ação com permalink individual, nome público e coleta
  Apify limitada. O contrato continua sendo a autoridade para decisões que não
  podem ser provadas por uma checagem estática.
- A coleta manual autorizada do Mania foi renovada com sucesso neste dia. A fila
  do navegador autenticado mostrou **32 comentários** com nome público e URLs
  específicas de avaliações, além das métricas agregadas renovadas. Não existe
  agenda nem coleta automática.
- **Copiar e abrir esta avaliação** copia o rascunho e aponta para o permalink
  da avaliação selecionada. O fallback genérico de perfil foi removido: sem
  permalink, a interface oferece somente cópia.

## Painel aprovado e leitura experimental — 18/08/2026 (local; aguarda nova coleta)

- A Visão geral foi refeita segundo as quatro referências aprovadas: **fila de
  respostas**, **volume em 12 semanas**, **cada nota separada**, e a coluna
  lateral com reputação, WhatsApp, boas práticas, completude e alteração da
  semana. A navegação ficou reduzida a Visão geral, Avaliações e WhatsApp.
- A fila mostra um item por vez, resposta sugerida, edição, cópia, avanço e
  seleção rápida. Um link para Google só é exibido quando a leitura devolve a
  URL pública individual; o painel não redireciona mais silenciosamente para
  o perfil do negócio como se fosse a avaliação selecionada.
- A função de coleta passou a aceitar os campos alternativos públicos de nome
  e URL que o actor possa devolver e a produzir uma série sanitizada de 12
  semanas (volume, distribuição por nota e respostas observadas). O resumo
  persistido permanece agregado; nome, texto e URL continuam restritos ao
  navegador autenticado por 14 dias.
- A leitura que está no navegador é anterior a essa alteração e não contém
  nome/URL nem a série agregada. O painel usa os dados atuais que ela comprova
  (49 avaliações, distribuição, temas, fila, 115 h e +11 nos últimos 30 dias)
  e transforma os cartões sem histórico em estado curto e útil, sem afirmar
  queda, tendência ou completude fictícia. A próxima coleta permitida deve
  confirmar os campos do actor e preencher as curvas de 12 semanas.
- `npm run verify` passou. A interação local validou avanço da fila, edição e
  abertura da configuração completa do WhatsApp. A captura visual automática
  da superfície disponível não preserva a escala de desktop da referência;
  `design-qa.md` registra a pendência de comparação visual final.
- A composição visual aprovada foi restaurada sem os atalhos visuais que
  substituíam gráficos por barras. Enquanto a fonte ainda não devolve a série,
  os módulos mantêm as áreas de gráfico e não simulam linhas. “O que mudou na
  semana” agora afirma somente “Nenhuma mudança confirmada nesta semana.”
- A aba WhatsApp passou a separar o **WhatsApp do gestor que receberá os
  avisos** do **WhatsApp para receber a prévia manual**. O gestor escolhe e
  salva localmente os quatro interesses: resumo semanal, avaliações que pedem
  resposta, mudanças na reputação e Perfil do Google. O teste manual continua
  explícito: vai apenas para o próprio gestor ou alguém da equipa, nunca para
  um cliente.
- O telefone salvo no onboarding (`profiles.phone`) preenche ambos os campos
  do WhatsApp por padrão, sem sobrescrever uma edição que o gestor já tenha
  feito. A coleta Compass foi corrigida e publicada para ler o nome público no
  campo `name` e a URL direta no campo `reviewUrl`; a leitura foi renovada em
  20/08 com nomes e permalinks reais.

## Fila assistida identificável e orientação diária — 18/08/2026 (função publicada; coleta pendente)

- A fila pública observada foi preparada para incluir somente o **nome público**
  e a **URL pública da avaliação** que o actor Apify devolver. Ambos ficam
  apenas no navegador autenticado por 14 dias; não entram em Supabase, cache,
  briefing WhatsApp, foto, ID ou perfil do avaliador.
- O botão deixa de tratar o perfil do negócio como se fosse a avaliação: abre
  a URL individual quando existir; sem ela, assume explicitamente o fallback
  para o perfil público do Google.
- O painel autenticado volta a ter **Boas práticas** como um box próprio na
  coluna lateral da Visão geral e na respetiva aba. Mostra uma ação por vez,
  alterna de forma estável no dia e prioriza resposta quando a coleta observou
  texto sem resposta.
- A nova versão da Edge Function foi publicada no projeto Supabase
  `tjbznhwdjyabuacrfqie`. A primeira tentativa de coleta posterior foi
  corretamente bloqueada pelo intervalo de 24 horas da leitura anterior do
  Mania, antes de qualquer chamada ao actor Apify; não houve novo custo. Falta
  executar uma única coleta manual depois desse intervalo para validar nomes,
  links reais e a série histórica. O limite do piloto continua em vigor.

## Piloto assistido — 17/08/2026 (local, não publicado)

### Leitura real Apify validada — 17/08/2026

- Uma coleta manual limitada do **Mania de Petiscos** terminou com sucesso às
  21:58 UTC: 49 avaliações públicas, do mesmo Place ID já associado ao
  piloto, por **US$ 0,02945**. Não foi criada agenda ou nova coleta automática.
- O actor devolveu as estruturas que o modo assistido precisa: nota, texto,
  data de publicação e resposta pública do proprietário. A leitura contém 33
  comentários com texto, 49 datas e 2 respostas observadas. O resumo
  persistível contém apenas agregados: 11 avaliações datadas nos últimos 30
  dias, média observada de resposta de 115,4 h e temas agregados; não guarda
  texto nem identificadores de avaliadores.
- A causa da tentativa anterior que falhou foi corrigida: o actor não aceita
  `share.google` diretamente. A Edge Function agora resolve o redirecionamento
  Google e converte a pesquisa resultante para uma URL Google Maps antes de
  coletar. A tentativa falhada não devolveu avaliações.
- A prévia autenticada foi verificada com a leitura agregada: distribuição,
  temas, novas avaliações e tempo médio aparecem com fonte experimental e
  ressalva de amostra; sem erros no console. A fila temporária com textos será
  exercitada ponta a ponta somente quando a Edge Function receber o segredo
  Apify e for publicada — ela continua fora do fixture local para não expor
  textos em arquivo público.
- O proxy OpenWA também foi auditado. A chave de bootstrap já existente no
  serviço local foi aplicada somente ao processo de prévia, sem a gravar no
  repositório ou a expor. A sessão `binno-piloto` aparece como ligada; o envio
  continua a exigir número, texto e confirmação explícita. Nenhuma mensagem
  foi enviada nesta auditoria.

- A solução aprovada para não esperar a Basic API está implementada localmente:
  uma nova coleta Apify pode devolver uma **fila pública observada** com texto,
  nota e resposta visível, sem nome, foto ou link do avaliador. O servidor
  continua a persistir apenas o resumo agregado de auditoria; os textos ficam
  somente no navegador autenticado e expiram em 14 dias.
- A fila tem rascunho editável e estados explícitos: `rascunho pronto`,
  `resposta copiada`, `marcada pelo gestor` e `resposta observada`. Os dois
  últimos não são confundidos: a marca é informação local do gestor, e a
  observação é leitura pública posterior, não confirmação OAuth.
- O gestor abre o perfil público do Google e publica manualmente. Não há
  automação, publicação via API nem afirmação de fila completa.
- A aba WhatsApp agora prepara o briefing a partir da leitura real; ainda exige
  número, confirmação e envio manual pelo canal local já vinculado. Preferências
  não criam agenda ou disparo recorrente.
- Em 17/08, o token Apify dedicado (expira em 16/09 e permite somente executar
  Actors com os armazenamentos da própria execução) foi guardado no cofre de
  Edge Functions. A migration `20260815195000_experimental_apify_runs` e a
  função autenticada `sync-experimental-apify` estão publicadas no projeto
  Supabase `tjbznhwdjyabuacrfqie`; o teto continua em 10 coletas mensais.
- A primeira coleta ponta a ponta do Mania terminou às 22:44 UTC: 49
  avaliações e 2 respostas públicas observadas. A auditoria persistiu apenas
  esses agregados; a fila com 47 textos fica só no navegador autenticado até
  31/08. Foram testados o rascunho editável, a cópia e a marca local do gestor,
  sem publicar resposta no Google nem enviar mensagem WhatsApp.
- Duas tentativas anteriores falharam antes de produzir dados por uma
  configuração inicial inválida da credencial. A função agora normaliza esse
  diagnóstico, só aplica o intervalo de 24 h após coleta bem-sucedida e usa a
  autenticação aceita pelo endpoint Apify. Elas permanecem apenas como registros
  de auditoria `failed` sem resumo de avaliações.
- Procedimento operacional: `docs/piloto-assistido-apify.md`.

## Correção e auditoria do painel autenticado — 17/08/2026 (local, não publicada)

- Marcelo restabeleceu como referência a composição compacta de duas colunas:
  alerta e fila de respostas, volume, notas, QR e temas à esquerda; reputação
  Google, WhatsApp, completude e alteração à direita. O painel autenticado foi
  aplicado a essa estrutura sem copiar os dados ilustrativos da referência.
- A leitura local do **Mania de Petiscos** agora aparece como **Google lido via
  Apify**: nota pública 4,9, total 456, amostra de 49 e duas respostas
  observadas. Isto corrige o erro de produto que a fazia parecer não lida ou
  não conectada. Continua a não ser OAuth nem uma fila completa.
- Como a amostra sanitizada não contém texto, autor, ligação ou estado de
  resposta, fila, rascunho individual, temas e tendências exibem o limite de
  origem em vez de dados fictícios. O WhatsApp local mostra `ready`, abre o
  formulário de envio manual e mantém o botão bloqueado até confirmação.
- A estrutura aprovada também permanece visível quando a origem é parcial:
  **Volume** mostra as 49 avaliações observadas e a leitura de 15/08; **Cada
  nota separada** mostra 44/2/1/0/2 e respetivos percentuais; **Do QR ao
  Google** lê os eventos reais dos últimos 30 dias; **Temas mais citados**
  mostra explicitamente zero comentários analisáveis porque a coleta não
  trouxe textos; e **O que mudou nesta semana** registra a leitura e os eventos
  sem alegar tendência. Nenhum desses módulos usa números ilustrativos.
- A fila agora também explicita o que a amostra permite medir: 49 avaliações
  observadas, 47 sem resposta observada e 2 respostas observadas. Ela muda
  automaticamente para avaliação individual e sugestão editável quando OAuth,
  localização selecionada e sincronização oficial estiverem ativos. A fonte
  atual não tem autor/texto, portanto ainda não permite atribuir essas 47 a
  clientes específicos.
- O cartão **Reputação no Google** voltou a exibir a distribuição por nota e
  mantém visíveis **tempo médio de resposta** e **novas avaliações em 30 dias**
  com estado de origem: a coleta de 15/08 não trouxe as datas necessárias. A
  próxima coleta experimental já está preparada para derivar, sem armazenar
  texto ou PII, temas agregados, avaliações recentes e tempo médio quando o
  actor efetivamente devolver esses campos.
- A aba **WhatsApp** passou a ter preferências locais de resumo semanal, alertas
  de prioridade, número, dia, hora e consentimento; salvar não agenda nem
  envia mensagem. O teste manual continua separado e exige confirmação.

### Verificação de acesso ao projeto Google — 17/08/2026

- A consulta de leitura ao Console Cloud mostrou que a conta ativa
  `noapropaganda@gmail.com` não possui `resourcemanager.projects.get` para
  `arctic-plasma-478022-q5`. Por isso não foi possível confirmar uma resposta
  da aprovação Basic. A conta que Marcelo informou ter recebido acesso é
  `diba@noadigital.com.br`; a confirmação precisa ser feita com ela ativa no
  Console. Nenhuma permissão foi solicitada ou alterada.
- Auditoria local: `/dashboard`, `/settings`, `/qrcodes`, `/review/test` e as
  rotas de demo responderam; `npm run verify` passou; console do painel sem
  erro. QR ficou com cópia corrigida: mede abertura e clique para o Google, não
  atribui uma avaliação a um QR. Nenhuma coleta Apify, QR, mensagem ou alteração
  em dado real foi disparada nesta revisão.
- A comparação visual pixel a pixel do painel autenticado com o anexo aguarda
  uma superfície permitida pelo navegador; o ficheiro `design-qa.md` regista
  esse bloqueio sem apresentar a revisão como concluída.

### QR real na rede local — 17/08/2026

- A auditoria revelou que um QR criado em `127.0.0.1` nunca poderia ser
  escaneado no telemóvel: esse endereço aponta para o próprio aparelho. Foi
  criada a origem configurável `VITE_PUBLIC_APP_URL` e o modo `npm run dev:lan`.
  A criação em loopback passa a ficar bloqueada com explicação, inclusive no
  onboarding.
- O proxy OpenWA agora só inicia com `BINNO_ENABLE_OPENWA_PROXY=true`; uma
  prévia QR em rede não pode expor por acidente o canal local. A rota
  `/api/openwa/sessions` nessa prévia devolveu apenas o HTML do Vite, não a
  sessão. A porta própria do OpenWA continuou inacessível sem chave (401).
- O QR real de teste **Piloto Mania — 17/08** foi criado na conta do Mania,
  slug `cc6e12c5`, com destino
  `http://192.168.15.10:4173/review/cc6e12c5`. A página pública carregou,
  manteve o link Google `https://share.google/EVRAgOAqOtDa2v8X1` disponível e,
  ao abrir o comentário direto, continuou oferecendo a avaliação pública.
  O QR anterior criado por esta própria auditoria com destino 127.0.0.1 foi
  removido antes do novo; nenhum dos dois QR preexistentes foi alterado.
- Para repetir noutra rede, usar `docs/preview-local-qr.md`; o IP de rede é
  dinâmico e a prévia LAN não substitui publicação validada.

## Arquitetura obrigatória do dashboard — 17/08/2026 (local, não publicada)

- Marcelo rejeitou como referência qualquer primeira dobra que comece pela
  nota, volume ou distribuição. A estrutura aprovada é, nesta ordem:
  **Prioridade agora** (fila e resposta sugerida), **Forças e fragilidades**
  (tema, tendência e evidência), **Plano de melhoria do Perfil Google**
  (impacto, esforço e próxima ação), **Métricas de apoio**, e só então
  **Resumo WhatsApp**.
- O painel autenticado que usa a amostra Apify passou a seguir essa ordem. Como
  a amostra do Mania não contém autores ou textos, a primeira prioridade deixa
  claro que ainda não há fila nem resposta sugerida responsável; ela indica a
  ligação oficial como a ação que desbloqueia ambas. Não foram inventados
  comentários, temas, tendências ou respostas.
- Forças/fragilidades só afirmam o que a origem permite: notas baixas na
  amostra são um sinal para leitura, não uma causa. O QR mede abertura e clique
  até o Google; não atribui avaliação publicada a uma pessoa ou QR.
- O Plano de melhoria usa orientação oficial do Google para dados completos e
  precisos, sem prometer efeito direto de ranking. WhatsApp fica abaixo das
  métricas e não agenda resumo sem dados completos e consentimento.
- Validação local: TypeScript, paridade das três línguas (785 chaves) e build
  passaram. A captura DOM do dashboard autenticado confirmou esta ordem e os
  estados honestos de dados parciais.

## Cockpit demonstrativo Binno — 17/08/2026 (local, não publicado)

- Marcelo escolheu como referência a arquitetura de
  `biz-buddy-assist-16.lovable.app`: painel compacto de duas colunas, prioridade
  de respostas, volume, boas práticas, Perfil no Google e WhatsApp.
- A rota local `http://127.0.0.1:4173/demo?view=panel` agora reproduz essa
  organização com a identidade Binno e sem copiar marca, textos ou promessas
  não sustentadas da referência. A rota legada `?view=radar` abre a mesma visão
  geral, onde forças, fragilidades e temas estão visíveis sem exigir outra aba.
- A primeira dobra prioriza fila de respostas editáveis, forças e fragilidades,
  queda de volume, temas, prontidão do perfil e resumo WhatsApp. Todas as
  métricas são identificadas como demonstrativas; o QR não recebe atribuição
  individual de avaliação, respostas não são publicadas e WhatsApp não envia.
- As abas de Avaliações, Volume, Boas práticas, Perfil no Google e WhatsApp
  possuem estados locais navegáveis. Fila completa, Radar oficial, publicação
  e envio real continuam dependentes da conexão oficial/integrações aprovadas.
- `npm run verify` passou; console sem erro nas interações principais. A
  comparação visual desta referência é histórica; para o painel autenticado
  atual, `design-qa.md` mantém a comparação pixel a pixel como pendente até
  existir uma captura desktop sem distorção.
- O trabalho continua não commitado, não publicado e sem alteração remota. A
  próxima decisão é aprovar visualmente esta direção antes de levar os mesmos
  componentes ao painel autenticado com dados oficiais.

## Onboarding orientado ao Google — 15/08/2026 (PR #27 pronto para revisão)

- A passagem manual do Mania confirmou uma falha de produto: o ecrã oferecia
  “Conectar Google” mesmo sem OAuth oficial disponível, devolvia erro e deixava
  o dono sem saber como avançar.
- O fluxo local passa a começar pelo **link público do Google**, obrigatório
  para criar o QR e enviar qualquer cliente para a página certa. Nome/telefone
  ficam no segundo passo; não há mais “fazer depois” para o Google.
- A ligação oficial (fila completa, Radar e publicação explícita) fica num
  estado de preparação honesto, sem botão que falha. Continua dependente da
  aprovação Basic do Google; não foram criadas APIs, credenciais ou chamadas.
- Telefone passa a ter seletor de país com bandeira e formatação internacional.
  O país persistido no telefone define a cópia do cartão QR: pt-BR para Brasil,
  pt-PT para Portugal e inglês nos demais casos. A tela pública do QR continua
  usando o idioma do telemóvel de quem escaneia.
- O cartão impresso agora diz “Conte como foi a sua experiência” e “A sua
  opinião ajuda-nos a melhorar” em Portugal (equivalentes em pt-BR/en), sem
  filtrar a opção pública por nota.
- O PR [#27](https://github.com/MarceloDiba/appreview/pull/27) consolidou esse
  onboarding e o snapshot experimental. O CI do commit `af6a922` terminou
  verde no run 99; ainda não houve merge nem deploy.

## Teste experimental Apify — 15/08/2026

- Em 20/08, a coleta manual do Mania foi renovada com sucesso. A fila local
  passou a exibir os nomes públicos retornados pela fonte e o link individual
  de cada avaliação. O botão **Copiar e abrir esta avaliação** copia o
  rascunho e aponta somente para esse permalink; quando a fonte não entrega
  permalink, o Binno oferece apenas a cópia e não substitui pelo perfil geral.

- A coleta manual autorizada para **Mania de Petiscos**, Lisboa, terminou às
  16:03 WEST. O limite foi de 49 avaliações e o custo observado foi
  **US$ 0,02945**. Não foi criada agenda nem nova execução automática.
- O arquivo local ignorado `public/experimental-snapshot.json` contém somente
  agregados sanitizados do perfil e da amostra. Não guarda autores, fotos,
  URLs ou textos de avaliações; não entra no Git, Supabase, cache oficial ou
  produção.
- A rota local `/demo?view=snapshot` identifica a fonte Apify, o limite da
  amostra e que não é uma integração oficial do Google. Ela não sugere fila
  completa, pendências reais, Radar real ou publicação de respostas.
- A branch local `codex/apify-experimental-pilot` prepara a coleta manual no
  próprio produto: até 50 avaliações de origem Google, sem dados do avaliador,
  sem agenda, limite de uma coleta por negócio a cada 24 horas e teto mensal
  configurável. A saída é agregada e fica apenas no navegador; a tabela de
  auditoria guarda status e resumo sanitizado, nunca a resposta bruta.
- A função e o botão de produção ficam desligados por padrão. Antes de ativar
  `APIFY_API_TOKEN`, a migration e a Edge Function, é necessário autorizar um
  teto financeiro explícito. Procedimento e variáveis em
  `docs/apify-experimental-rollout.md`.
- Marcelo autorizou em 15/08 o piloto manual com teto recomendado de US$ 5/mês.
  A inspeção do Supabase confirmou que ainda não há `APIFY_API_TOKEN`; nenhuma
  migration, função, segredo ou chamada nova foi publicada. A ligação Composio
  do Apify não revela tokens e o console local não tinha sessão autenticada.
- A leitura em `/demo?view=snapshot` foi redesenhada como dashboard: resumo
  público, distribuição da amostra, força e atenção observadas, respostas
  vistas e uma coluna que separa claramente o que continua bloqueado até OAuth.
- O mesmo snapshot local agora alimenta o **Painel** autenticado durante a
  revisão local. Com a leitura do Mania disponível, o dono vê nota 4,9, total
  de 456, amostra de 49, distribuição e 2 respostas observadas, sempre com a
  fonte Apify e o limite explícitos. A leitura do ficheiro ignorado só ocorre
  em desenvolvimento; em produção o painel só aceita uma coleta experimental
  explicitamente guardada no navegador. Assim não substitui a ligação oficial
  nem mostra a amostra de forma global a outros negócios.
- `binno.pro` e `www.binno.pro` foram vinculados ao projeto Vercel, mas a
  configuração DNS ainda está pendente no registrador GoDaddy. Até o estado
  deixar de ser `misconfigured`, a referência pública continua sendo
  `https://appreview-flame.vercel.app`.

## Marca Binno — 15/08/2026

- Marcelo fechou o nome **Binno** e adquiriu o domínio `binno.pro`.
- A marca substitui AppReview na interface, metadados, textos do produto e
  documentação viva. Registros históricos preservam o nome usado à época.
- Assinatura aprovada: **Seu assessor de reputação.** A promessa é interpretar
  sinais do Google e orientar uma ação concreta, sem prometer ranking nem
  publicar automaticamente pelo gestor.
- `docs/marca-binno.md` é a fonte da base verbal e visual. Identificadores
  técnicos `appreview:*` permanecem por compatibilidade.
- A disponibilidade marcária ainda não foi verificada; a compra do domínio não
  constitui liberação jurídica para divulgação ampla ou alteração do projeto
  Google Cloud.

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
- Migration `20260814190000_google_outcome_metrics.sql` aplicada no Supabase em
  15/08. Ela acrescenta apenas as tabelas versionadas de eventos do funil e
  snapshots; não alterou nem removeu registros existentes. As duas tabelas têm
  RLS ativo e as políticas verificadas. Não houve chamada manual ao Google nem
  custo de API nesta frente.
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
- **Verificação de 17/08:** `diba@noadigital.com.br` tem acesso ao projeto
  correto e o Console ainda mostra a Business Profile API desativada, sem
  cliente OAuth e sem tráfego OAuth. A página de contratos não contém acordo
  relevante. Com `diba@noadigital.com.br` ativo, a Central de verificação
  confirma apenas que o app OAuth está em publicação **Teste**, sem exigir
  verificação OAuth. A página da My Business Business Information API continua
  a mostrar **Ativar** e ressalva que a quota pode ficar em zero até que o
  acesso GBP seja concedido. A aprovação Basic continua **não confirmada**;
  isso não é evidência de recusa.
- Para não adiar a validação comercial, `docs/piloto-concierge-sem-api-google.md`
  define um teste real de sete dias que depende só do QR, links públicos,
  comentário privado opcional e métricas de intenção. Ele não chama clique de
  avaliação, não simula uma fila completa e pode ser continuado pelo mesmo
  estabelecimento depois da aprovação OAuth.
- Marcelo escolheu **Mania de Petiscos**, Lisboa, para esse piloto concierge.
  O link curto Google veio do Marcelo, mas não foi resolvido pelo conector
  público; validar o destino no QR físico antes da entrega e não o usar como
  evidência de Place ID, avaliação ou configuração concluída.
- PR [#24](https://github.com/MarceloDiba/appreview/pull/24) aberto para o lote
  completo do assessor e piloto concierge. O CI do commit `e0402ed` terminou
  verde (run 84), e o preview da Vercel desse mesmo commit está `READY`.
  A migration de métricas já está aplicada no Supabase; ainda não houve merge,
  deploy de produção, chamada Google ou automação WhatsApp.

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

### WhatsApp temporário — validação local (17/08/2026)

- OpenWA foi executado somente em `127.0.0.1`, fora do repositório e sem
  webhook, agendamento, importação de conversas ou integração publicada.
- A primeira tentativa via Baileys não concluiu o vínculo. O piloto foi
  recriado com `whatsapp-web.js` e o Chrome local; o vínculo foi confirmado
  pelo estado `ready` da sessão.
- Uma única mensagem manual aprovada por Marcelo foi enviada ao próprio número
  e recebida. Isso valida vínculo e envio pontual, não notificações do Binno,
  entrega recorrente, consentimento, agendamento ou operação de produção.
- Não usar OpenWA como base de produção sem decisão explícita sobre provedor,
  número dedicado, preferências, logs, falhas e risco operacional.
- O painel autenticado local ganhou a aba **WhatsApp** funcional para o piloto:
  detecta somente a sessão local `binno-piloto`, não expõe a chave ao navegador,
  pede número internacional e confirmação explícita a cada envio. Não oferece
  agenda, webhook ou histórico persistido. Ver `docs/openwa-local-pilot.md`.

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
