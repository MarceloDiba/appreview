import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const dashboard = read('src/components/dashboard/ApprovedCockpitDashboard.tsx');
const pendingCommentsBanner = read('src/components/dashboard/PendingCommentsBanner.tsx');
const dashboardPage = read('src/pages/Dashboard.tsx');
const collector = read('supabase/functions/sync-experimental-apify/index.ts');
// Em 31/08/2026 a montagem da fila saiu do chamador manual para o núcleo
// partilhado, porque vivendo no chamador ela nunca corria na coleta feita pelo
// servidor: o drenador automático chama o núcleo e o dono ficava sem fila. As
// duas regras abaixo passam a ser lidas onde o código passou a morar, e são
// medidas nos dois arquivos somados para que mover de novo não as apague.
const nucleoDaColeta = read('supabase/functions/_shared/experimentalApifyCollection.ts');
const coletaInteira = collector + '\n' + nucleoDaColeta;
// A janela de 24h e o teto mensal viraram núcleo partilhado em 30/08/2026
// (decisão de coleta automática no cadastro), para que a coleta automática do
// cadastro não possa, por construção, reimplementar ou contornar o que a
// coleta manual já respeita. As duas asserções abaixo que citam esses limites
// leem o núcleo partilhado, não mais este arquivo.
const collectorCore = read('supabase/functions/_shared/experimentalApifyCollection.ts');
const advisorReading = read('src/lib/advisorReading.ts');
const estilos = read('src/index.css');
// O WhatsApp saiu do painel em 31/08/2026 e virou destino do menu principal.
// Provar que ele "saiu" exige provar para onde foi: sem isto, apagar a tela
// inteira deixaria o guarda verde.
// Comentários podem conter qualquer coisa, inclusive o texto exato que estas
// asserções proíbem: os comentários desta tela explicam o atalho antigo citando
// `'ativa'`. Sem os remover, o guarda ficaria vermelho com o código certo.
const semComentariosDeArquivo = (fonte) => fonte
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
const rotas = read('src/App.tsx');
const menu = read('src/components/layout/Navbar.tsx');
const telaDoWhatsApp = read('src/pages/WhatsApp.tsx');
const telaDoWhatsAppWorkspace = semComentariosDeArquivo(read('src/components/dashboard/WhatsAppNotificationWorkspace.tsx'));
const catalogos = ['pt-BR', 'pt-PT', 'en'].map((idioma) => read(`src/i18n/owner/locales/${idioma}.json`));

// O corpo de `const Nome = ...` até o `;` que fecha a declaração, contando
// chaves e parênteses. Sem isto, "o Radar não desenha ícone fora do alerta"
// seria medido no arquivo inteiro, onde há outros ícones legítimos.
const corpoDaDeclaracao = (fonte, nome) => {
  const inicio = fonte.indexOf(`const ${nome} =`);
  if (inicio === -1) return null;
  let i = fonte.indexOf('=', inicio) + 1;
  let chaves = 0;
  let parenteses = 0;
  const partida = i;
  for (; i < fonte.length; i += 1) {
    const c = fonte[i];
    if (c === '{') chaves += 1;
    else if (c === '}') chaves -= 1;
    else if (c === '(') parenteses += 1;
    else if (c === ')') parenteses -= 1;
    else if (c === ';' && chaves === 0 && parenteses === 0) break;
  }
  return fonte.slice(partida, i);
};

// Os quatro blocos de texto que Marcelo mandou sair em 31/08/2026. Guardá-los
// pelo texto, e nos três catálogos, é a única forma de a decisão sobreviver:
// uma chave apagada de um catálogo só volta pelo outro.
const TEXTOS_REMOVIDOS_EM_31_08 = [
  'O que o WhatsApp faz hoje',
  'Lembretes sobre horários, fotos e informações do perfil quando a conexão oficial estiver ativa.',
  'Escolha o que quer receber no seu WhatsApp. Neste piloto',
  'o Google não informa quais você já respondeu',
];

// indexOf(A) < indexOf(B) sozinho e cego a A ter sido apagado inteiro: sem A,
// indexOf devolve -1, e -1 e sempre menor que a posicao real de B, entao o
// guarda passa sem checar nada. As duas comparacoes de ordem abaixo exigem
// presenca dos dois lados antes de comparar posicao, para nao depender de um
// guarda vizinho contar as ocorrencias por acidente.
// A fila de respostas do painel ganhou uma prop em 30/08/2026:
// `businessCountry`, o `profiles.business_country` que decide se a resposta
// sugerida sai em português do Brasil ou de Portugal. O campo passou a ser
// obrigatório em `ReplySuggestionInput` justamente porque quatro das sete
// chamadas do projeto o esqueciam em silêncio.
//
// As três asserções abaixo casavam a tag inteira, letra a letra, e por isso
// ficariam vermelhas com a mudança aprovada. Elas passam a casar a tag pelo
// mesmo conteúdo de sempre MAIS a prop nova: continuam a exigir que a fila
// receba `queue`, `snapshot` e `demo` (trocar `queue` por outra coisa continua
// a quebrar), continuam a contar ocorrências (a antiga aba "Avaliações" não
// pode voltar a duplicar a fila) e ganham a exigência de o país do negócio
// chegar à fila.
//
// A primeira versão do guarda do país casava só a declaração do `useState` e a
// string do `select`, e não conseguia falhar pela regra que dizia proteger:
// trocar `setBusinessCountry(data?.business_country || null)` por
// `setBusinessCountry(null)` dava português de Portugal a um dono brasileiro
// com todos os guardas verdes. Agora a cadeia inteira é exigida, elo a elo: a
// leitura no `select`, a ATRIBUIÇÃO do valor lido ao estado, a passagem à fila
// pela prop e o uso na chamada que monta a resposta. Quebrar qualquer elo fica
// vermelho. Só assim a frase "mais apertado do que antes" é verdadeira.
const FILA_DO_PAINEL = /<ResponseQueue reviews=\{queue\} snapshot=\{snapshot\} demo=\{demo\} businessCountry=\{businessCountry\} \/>/g;
// Uma atribuição comentada satisfaria uma busca por texto sem existir.
const semComentarios = (fonte) => fonte
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
const dashboardCodigo = semComentarios(dashboard);
const corpoDoRadar = corpoDaDeclaracao(dashboardCodigo, 'RadarNow') || '';
const filaDoPainel = (fonte) => (fonte.match(FILA_DO_PAINEL) || []);
const posicaoDaFila = (fonte) => {
  const encontrada = filaDoPainel(fonte)[0];
  return encontrada ? fonte.indexOf(encontrada) : -1;
};

const requirements = [
  // A fila continua antes das métricas, mas por outra razão desde a ordem por
  // decisão de 31/08/2026: ela é a faixa de Ação e o volume é a de Mudança. A
  // asserção fica como está porque a regra nova contém a antiga; quem prova as
  // faixas inteiras é `scripts/check-ordem-por-decisao.mjs`.
  ['painel mantém a fila antes das métricas', filaDoPainel(dashboard).length > 0 && dashboard.includes('<VolumeCard weeks={history} />') && posicaoDaFila(dashboard) < dashboard.indexOf('<VolumeCard weeks={history} />')],
  ['painel mantém volume, notas, QR e temas', ['<VolumeCard weeks={history} />', '<RatingTrends weeks={history} snapshot={snapshot} />', '<QrCard funnel={funnel.data} />', '<TopicsCard snapshot={snapshot} />'].every((token) => dashboard.includes(token))],
  // Em 31/08/2026 Marcelo tirou da coluna lateral o "Resumo no WhatsApp" (era
  // atalho para uma tela que ganhou destino próprio) e a "Completude do
  // perfil" (sem a ligação oficial nunca teve o que medir), e tirou da página o
  // "Deu resultado?" (só falava depois de uma leitura seguinte que nunca chegou
  // em conta real). A asserção deixou de os exigir; se parasse aí, os três
  // voltavam sozinhos na próxima refatoração, porque nada os proibiria. Por
  // isso ela tem duas metades: o que fica, e o que não pode voltar.
  //
  // A coluna lateral única deixou de existir com a ordem por decisão de
  // 31/08/2026: os três cartões que ela guardava vivem agora em faixas
  // diferentes (a semana em Mudança, a reputação e as boas práticas em
  // Referência). O que esta linha media de verdade era "os três continuam na
  // página", e é isso que ela passa a dizer; em que faixa cada um está é medido
  // no guarda da ordem.
  ['reputação, boas práticas e semana continuam na página', ['<ReputationCard snapshot={snapshot} />', '<DailyPractice snapshot={snapshot}', '<WeeklyChange weeks={history} />'].every((token) => dashboard.includes(token))],
  // O "Plano de hoje" entrou nesta lista em 31/08/2026, pela mesma razão dos
  // outros três. Nas palavras de Marcelo, "não soma em nada": ele lia a mesma
  // `getAdvisorReading` do Radar e repetia o que já estava na tela, e o único
  // botão que era só dele ("Marcar como feito") ficou sem leitor quando o
  // "Deu resultado?" saiu. Sem esta proibição ele volta na próxima vez que
  // alguém quiser um cartão de "o que fazer hoje" na lateral.
  ['os quatro cartões removidos em 31/08/2026 não voltam ao painel', !['<WhatsAppCard', '<ProfileCompleteness', '<ObservedResult', '<TodayPlan'].some((token) => dashboardCodigo.includes(token))],
  // Decisão de 30/08/2026: a navegação em três abas (Visão geral, Avaliações,
  // WhatsApp) virou uma tela única. A aba Avaliações não sobrevive como seção
  // porque já era, byte a byte, a mesma <ResponseQueue> da Visão geral; a aba
  // só duplicava o que já estava na tela. As quatro linhas abaixo protegem a
  // mudança inteira: sem estado nem seletor de aba, a fila, o QR/temas e a
  // configuração do WhatsApp completo têm âncora própria e permanecem sempre
  // renderizados (nunca atrás de uma condição de aba), e os três cartões que
  // antes trocavam de aba (Plano de hoje, Boas práticas, Resumo no WhatsApp)
  // linkam para essas âncoras em vez de chamar um estado que deixou de existir.
  ['painel vira uma tela única: sem estado de aba e sem seletor', !dashboard.includes('CockpitTab') && !dashboard.includes('setTab(')],
  // O <nav> era proibido por significar seletor de abas. Em 30/08/2026 abriu-se
  // uma exceção de um: o índice do celular, que era atalho e não navegação. Em
  // 31/08/2026 o índice saiu (aparecia cortado no telemóvel do dono, e o menu
  // principal já faz o trabalho), então a exceção não tem mais nada para
  // cobrir e a proibição volta a ser total.
  ['o painel não tem <nav> nenhum: nem seletor de abas, nem índice do celular', (dashboard.match(/<nav/g) || []).length === 0],
  ['fila de respostas aparece uma única vez: a antiga aba "Avaliações" não duplica a seção', filaDoPainel(dashboard).length === 1],
  // O `phone` saiu deste `select` com a configuração do WhatsApp, que se mudou
  // para `/whatsapp` e passou a ler o telefone lá. O país do negócio ficou.
  ['o painel lê profiles.business_country do dono', /select\('business_country'\)/.test(dashboardCodigo)],
  ['o painel ATRIBUI ao estado o país que leu, em vez de um valor fixo', /setBusinessCountry\(data\?\.business_country \|\| null\)/.test(dashboardCodigo)],
  // Em 31/08/2026 a fila do painel passou a pedir o rascunho a
  // `supabase/functions/sugerir-resposta`, que lê o que o cliente escreveu.
  // `buildReplySuggestions` deixou de ser a FONTE do rascunho e passou a ser o
  // CHÃO dele: é o que está na caixa no primeiro quadro e o que fica quando o
  // modelo não responde.
  //
  // Esta asserção não foi enfraquecida por causa disso, foi reapontada. A regra
  // que ela protegia continua inteira, porque o texto do template continua a ser
  // publicável em nome do dono, e um dono brasileiro continua a não poder
  // receber "casa de banho". O que ela ganhou foi a segunda metade, sem a qual
  // ficaria verde com um template calculado e nunca desenhado: o resultado tem
  // de chegar à caixa, e chega como o último argumento de `rascunhoNaTela`, que
  // é a posição do chão. Quem prova a precedência inteira, com o módulo a
  // correr, é `scripts/check-rascunho-que-le.mjs`.
  ['a fila do painel usa o país do negócio na chamada que monta o texto padrão da resposta', /buildReplySuggestions\(\{[^}]*businessCountry[^}]*\}\)/.test(dashboardCodigo)],
  ['o texto padrão da fila do painel continua alcançável: ele chega à caixa do dono como o chão do rascunho do modelo', /rascunhoNaTela\([\s\S]{0,300}?\n\s*suggestion,\n\s*\);/.test(dashboardCodigo) && /<Textarea value=\{naTela\.texto\}/.test(dashboardCodigo)],
  // A âncora do WhatsApp saiu desta linha em vez de ser reapontada: ela deixou
  // de existir com a tela, e uma asserção sobre um id que ninguém desenha fica
  // verde sem proteger nada.
  ['fila de respostas e QR/temas têm âncora própria e única na página', (dashboard.match(/id=\{QUEUE_ANCHOR_ID\}/g) || []).length === 1 && (dashboard.match(/id=\{QR_ANCHOR_ID\}/g) || []).length === 1],
  // A versão anterior desta linha contava ocorrências no arquivo inteiro e
  // pedia "pelo menos uma". Com três componentes a linkar para a mesma âncora,
  // quebrar a de um deles deixava a asserção verde: ela não conseguia falhar
  // pela regra que dizia proteger. Passa a medir DENTRO do corpo de cada
  // componente que promete esse destino.
  //
  // A linha do "Plano de hoje" foi APAGADA em 31/08/2026, em vez de reapontada:
  // o cartão saiu, e uma asserção sobre o corpo de um componente que não existe
  // lê a string vazia e fica verde sem proteger nada. Quem impede o cartão de
  // voltar é a proibição acima.
  ['a faixa-resumo do celular linka para a âncora da fila', /href=\{`#\$\{QUEUE_ANCHOR_ID\}`\}/.test(corpoDaDeclaracao(dashboardCodigo, 'MobileSummary') || '')],
  // A faixa-resumo do celular acrescentou um segundo link para a fila, por isso
  // a contagem acima deixou de ser exata. O que a contagem media de verdade era
  // "ninguém troca de aba": isso agora é medido diretamente, e todo link de
  // âncora tem de apontar para um id que existe na página.
  ['todo link de âncora do painel aponta para um id que existe', [...dashboard.matchAll(/href=\{`#\$\{([A-Z_]+)\}`\}/g)].every(([, id]) => new RegExp(`id=\\{${id}\\}`).test(dashboard))],
  // "Ver QR Codes" tinha o rotulo certo mas o href sempre apontava para a
  // fila (heranca de quando so existia setTab para a aba de avaliacoes,
  // achado no round de correcao de 30/08/2026). Boas praticas agora escolhe
  // o alvo por variante: as tres que falam de avaliacao ou fila apontam para
  // a fila, a que fala de foto/QR aponta para o QR.
  ['Boas práticas linka para a âncora que o próprio texto do CTA promete (fila ou QR)', dashboard.includes('href={`#${practice.target}`}') && (dashboard.match(/target: QUEUE_ANCHOR_ID/g) || []).length === 3 && dashboard.includes('target: QR_ANCHOR_ID')],
  // Decisão de 31/08/2026: o WhatsApp deixa de aparecer em todas as telas e
  // vira destino do menu principal. As três linhas abaixo medem a mudança
  // inteira, e não só metade dela: sai do painel, existe como rota protegida, e
  // o menu leva até lá nas DUAS versões. Sem a terceira, apagar o link do menu
  // do celular (que é onde o dono usa o produto) passava.
  ['a configuração do WhatsApp saiu do painel', !dashboardCodigo.includes('WhatsAppNotificationWorkspace') && !dashboard.includes("tab === 'whatsapp'")],
  ['o WhatsApp é uma rota própria e protegida por autenticação', /<Route path="\/whatsapp" element=\{\s*<ProtectedRoute>\s*<WhatsApp \/>/.test(rotas)],
  ['o menu principal leva ao WhatsApp no ecrã grande e no celular', (menu.match(/to="\/whatsapp"/g) || []).length === 2],
  // O Resultado observado saiu desta linha em 31/08/2026 e virou proibição, na
  // asserção dos quatro cartões removidos, acima. O Plano de hoje saiu no mesmo
  // dia e pelo mesmo caminho, e o que sobra é o Radar.
  ['o Radar é adicional aos módulos aprovados', dashboard.includes('<RadarNow snapshot={snapshot} />')],
  // A versão anterior desta linha conferia que uma chamada a `getAdvisorReading`
  // existia em algum lugar do arquivo e que uma condição antiga não voltava. As
  // duas metades eram cegas ao Radar: a chamada existe em três componentes, e
  // uma condição com outro nome escondia o Radar calmo com o guarda verde.
  //
  // Ela passa a ler o corpo do Radar. Sem alerta, o Radar tem de continuar a
  // desenhar a sua linha: a última alternativa da cadeia é `radarLineMonitor`, e
  // não há retorno nulo nenhum antes dela. Devolver `null` no estado calmo, que
  // é a forma óbvia de o esconder, fica vermelho.
  ['o Radar permanece visível sem alerta severo, com a linha de acompanhamento', corpoDoRadar !== '' && !/return null/.test(corpoDoRadar) && /:\s*t\('dashboard\.advisorPilot\.radarLineMonitor'\)/.test(corpoDoRadar)],
  ['assessor só usa força positiva agregada ou critérios de alerta existentes', advisorReading.includes("topic.sentiment === 'positive' && topic.count >= 3") && advisorReading.includes("if (alert)") && advisorReading.includes("return { kind: 'monitor' }")],
  ['dashboard autenticado não retorna ao layout legado quando falta snapshot', dashboardPage.includes('approvedFallbackSnapshot') && !['GoogleOutcomeCard', 'ReputationRadarCard', 'ReputationAdvisorCard', 'ProfileHealthCard'].some((token) => dashboardPage.includes(token))],
  // A secção 4 do contrato continua a mandar que o telefone do onboarding seja
  // o destinatário inicial. A leitura mudou-se do painel para a tela do
  // WhatsApp junto com ela, então a asserção mudou de arquivo, não de exigência:
  // ela pede a cadeia inteira, do `select` à prop.
  ['telefone do onboarding é reutilizado no WhatsApp', /select\('business_name, phone'\)/.test(telaDoWhatsApp) && /setOnboardingPhone\(profile\?\.phone \|\| ''\)/.test(telaDoWhatsApp) && telaDoWhatsApp.includes('onboardingPhone={onboardingPhone}')],
  ['fila oferece copiar e abrir somente com permalink individual', dashboard.includes("selected.reviewUrl ? <Button asChild") && dashboard.includes("copyAndOpenReview")],
  ['fila não inventa nome quando a fonte não o devolve', dashboard.includes("t('dashboard.cockpit.layout.anonymousReviewer')")],
  // O comentario privado com nota baixa expira: o cliente ainda esta no
  // restaurante, ou acabou de sair. Por isso o contrato abre uma unica
  // excecao a primeira dobra fixada: um bloco de comentarios pendentes acima
  // da fila, que so existe enquanto houver caso sem tratar. As duas linhas
  // abaixo protegem exatamente essa condicional: a primeira exige que o
  // bloco retorne nulo sem caso pendente, a segunda exige que ele fique
  // sempre antes da fila quando existir, sem deslocar a fila da posicao
  // dela quando ele nao existir.
  ['bloco de comentários pendentes some por completo sem caso sem tratar', pendingCommentsBanner.includes('if (pendingOrdered.length === 0) return null;')],
  ['bloco de comentários pendentes, quando existe, fica antes da fila de respostas na Visão geral', dashboard.includes('<PendingCommentsBanner userId={userId} />') && filaDoPainel(dashboard).length > 0 && dashboard.indexOf('<PendingCommentsBanner userId={userId} />') < posicaoDaFila(dashboard)],
  ['coleta pede nome público', coletaInteira.includes("'reviewerName', 'authorName', 'reviewerDisplayName', 'name'")],
  ['coleta aceita somente campos específicos de permalink', coletaInteira.includes("['reviewUrl', 'reviewURL', 'reviewLink', 'reviewUri']") && !coletaInteira.includes("'reviewUri', 'url'")],
  ['coleta temporária continua sem agenda e com limite explícito', collectorCore.includes("maxReviews: 50") && collectorCore.includes("APIFY_EXPERIMENTAL_COOLDOWN")],
  // --------------------------------------------------------------------
  // Decisões de 31/08/2026 que não tinham guarda nenhum antes.
  // --------------------------------------------------------------------

  // O Radar abria a página e enchia a primeira dobra sem dizer nada
  // accionável. Passa a caber numa linha. Medir "é uma linha" pelo que ele
  // NÃO desenha é o que torna a asserção falsificável: devolver um <Card>
  // com título e corpo, como era, fica vermelho.
  ['o Radar cabe numa linha: não volta a ser um cartão com título e corpo', corpoDoRadar !== '' && !corpoDoRadar.includes('<Card')],
  ['o Radar tem uma linha por estado, e nenhuma a mais', (corpoDoRadar.match(/dashboard\.advisorPilot\.radarLine/g) || []).length === 4],
  // O ícone do Radar só existe no alerta, onde carrega a severidade que o
  // texto sozinho não carrega. Fora dele era enfeite a comer largura.
  ['o Radar só desenha ícone quando há alerta, e um só', /urgent \? <AlertTriangle/.test(corpoDoRadar) && (corpoDoRadar.match(/<[A-Z][A-Za-z]*/g) || []).join(' ') === '<AlertTriangle'],

  // Os ícones decorativos nos títulos de cartão comiam largura de um texto já
  // apertado no celular. Ficam só os que carregam informação que o texto não
  // carrega: severidade (AlertTriangle), estado (Info, CheckCircle2) e a
  // estrela da nota. Medir pelo import é o mais apertado que dá: um ícone
  // usado sem import não compila.
  ['nenhum ícone decorativo volta aos títulos de cartão do painel', !['Sparkles', 'QrCode', 'Lightbulb', 'MessageCircle'].some((icone) => new RegExp(`\\b${icone}\\b`).test(dashboard))],

  // Os quatro blocos de texto removidos, nos três catálogos. Uma chave apagada
  // de um catálogo só volta pelo outro, e o check:i18n-owner não repara em
  // texto: ele confere chaves, não frases.
  ['os textos removidos em 31/08/2026 não voltam a nenhum dos três catálogos', !TEXTOS_REMOVIDOS_EM_31_08.some((texto) => catalogos.some((catalogo) => catalogo.includes(texto)))],

  // A tela do WhatsApp não pode afirmar uma ligação que não foi confirmada. O
  // estado vem de `lerEstadoDaLigacao`, e `scripts/check-whatsapp-ligacao.mjs`
  // executa esse módulo estado a estado. Aqui garante-se só que a tela o usa em
  // vez de inventar um booleano próprio.
  // Esta linha conferia o `import`. Apagar todo o USO e manter o import
  // deixava-a verde, que é a mesma falha de fundo do guarda vizinho: medir a
  // presença de um nome em vez do valor que chega à tela. Passa a medir o
  // valor: a expressão inteira tem de ser a chamada ao módulo, e esse valor tem
  // de ser o que decide qual painel se desenha.
  ['a tela do WhatsApp deriva o estado da ligação do módulo, e sem atalho ao lado', /const estadoDaLigacao = lerEstadoDaLigacao\([^;]*\);/.test(telaDoWhatsAppWorkspace)],
  ['o estado da ligação é o que decide o que a tela do WhatsApp desenha', /const mostrandoFormulario = [^;]*estadoDaLigacao[^;]*;/.test(telaDoWhatsAppWorkspace) && /\{mostrandoFormulario \?/.test(telaDoWhatsAppWorkspace)],
  // "ligação ativa" não pode nascer em lado nenhum a não ser de uma comparação
  // com o que o módulo devolveu. Um `? 'ativa' :` ou um `= 'ativa'` aqui é um
  // segundo decisor, e foi exatamente assim que o atalho `aceiteLocal` entrou.
  // Só comparação. Uma atribuição (`= 'ativa'`) ou um ramo de ternário
  // (`? 'ativa' :`) seria um segundo decisor, e foi exatamente assim que o
  // atalho `aceiteLocal` entrou nesta tela.
  ['nenhum atalho na tela do WhatsApp produz "ativa" por conta própria', [...telaDoWhatsAppWorkspace.matchAll(/(.{4})'ativa'/g)].every(([, antes]) => antes === '=== ' || antes === '!== ')],

  // O contrato fixa violeta #6D43C0 como assinatura e azul #2457D6 para acoes,
  // e ate 30/08/2026 nada verificava isso. O token --primary tinha derivado
  // para #6C45BA, que e o violeta que slider, switch, badge e barra de
  // progresso renderizavam. Ninguem notou porque a diferenca e invisivel a
  // olho; uma regra escrita sem guarda deriva em silencio ate deixar de valer.
  //
  // 260.2 49.8% 50.8% e o unico triplo HSL que reproduz #6D43C0 exatamente.
  // Com percentuais inteiros o mais proximo e #6D44C1, que erra dois canais.
  // Contar, nao procurar: o token existe duas vezes, tema claro e escuro, e um
  // `includes` passa achando so a segunda quando alguem quebra a primeira.
  // Este guarda ja nasceu assim e foi corrigido antes de entrar.
  ['o token --primary e o violeta #6D43C0 do contrato, nos dois temas',
    (estilos.match(/--primary: 260\.2 49\.8% 50\.8%;/g) || []).length === 2
    && !/--primary: (?!260\.2 49\.8% 50\.8%;)/.test(estilos)],
];

const failed = requirements.filter(([, ok]) => !ok).map(([label]) => label);
if (failed.length) {
  console.error(`Contrato de produto Binno violado:\n- ${failed.join('\n- ')}`);
  process.exit(1);
}

console.log(`Contrato de produto Binno verificado: ${requirements.length} proteções ativas.`);
