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
const rotas = read('src/App.tsx');
const menu = read('src/components/layout/Navbar.tsx');
const telaDoWhatsApp = read('src/pages/WhatsApp.tsx');
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
  ['painel mantém a fila antes das métricas', filaDoPainel(dashboard).length > 0 && dashboard.includes('<VolumeCard weeks={history} />') && posicaoDaFila(dashboard) < dashboard.indexOf('<VolumeCard weeks={history} />')],
  ['painel mantém volume, notas, QR e temas', ['<VolumeCard weeks={history} />', '<RatingTrends weeks={history} snapshot={snapshot} />', '<QrCard funnel={funnel.data} />', '<TopicsCard snapshot={snapshot} />'].every((token) => dashboard.includes(token))],
  // Em 31/08/2026 Marcelo tirou da coluna lateral o "Resumo no WhatsApp" (era
  // atalho para uma tela que ganhou destino próprio) e a "Completude do
  // perfil" (sem a ligação oficial nunca teve o que medir), e tirou da página o
  // "Deu resultado?" (só falava depois de uma leitura seguinte que nunca chegou
  // em conta real). A asserção deixou de os exigir; se parasse aí, os três
  // voltavam sozinhos na próxima refatoração, porque nada os proibiria. Por
  // isso ela tem duas metades: o que fica, e o que não pode voltar.
  ['coluna lateral mantém reputação, boas práticas e semana', ['<ReputationCard snapshot={snapshot} />', '<DailyPractice snapshot={snapshot}', '<WeeklyChange weeks={history} />'].every((token) => dashboard.includes(token))],
  ['os três cartões removidos em 31/08/2026 não voltam ao painel', !['<WhatsAppCard', '<ProfileCompleteness', '<ObservedResult'].some((token) => dashboardCodigo.includes(token))],
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
  ['a fila do painel usa o país do negócio na chamada que monta a resposta sugerida', /buildReplySuggestions\(\{[^}]*businessCountry[^}]*\}\)/.test(dashboardCodigo)],
  // A âncora do WhatsApp saiu desta linha em vez de ser reapontada: ela deixou
  // de existir com a tela, e uma asserção sobre um id que ninguém desenha fica
  // verde sem proteger nada.
  ['fila de respostas e QR/temas têm âncora própria e única na página', (dashboard.match(/id=\{QUEUE_ANCHOR_ID\}/g) || []).length === 1 && (dashboard.match(/id=\{QR_ANCHOR_ID\}/g) || []).length === 1],
  // A versão anterior desta linha contava ocorrências no arquivo inteiro e
  // pedia "pelo menos uma". Com três componentes a linkar para a mesma âncora,
  // quebrar a de um deles deixava a asserção verde: ela não conseguia falhar
  // pela regra que dizia proteger. Passa a medir DENTRO do corpo de cada
  // componente que promete esse destino.
  ['Plano de hoje linka para a âncora da fila em vez de trocar de aba', /href=\{`#\$\{QUEUE_ANCHOR_ID\}`\}/.test(corpoDaDeclaracao(dashboardCodigo, 'TodayPlan') || '')],
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
  // asserção dos três cartões removidos, acima.
  ['Radar e Plano de hoje são adicionais aos módulos aprovados', ['<RadarNow snapshot={snapshot} />', '<TodayPlan snapshot={snapshot}'].every((token) => dashboard.includes(token))],
  ['Radar e Plano permanecem visíveis sem alerta severo', dashboard.includes('const reading = getAdvisorReading(snapshot);') && !dashboard.includes('if (!alert && !opportunity) return null;')],
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
  ['a tela do WhatsApp lê o estado da ligação do módulo que sabe o que prova entrega', read('src/components/dashboard/WhatsAppNotificationWorkspace.tsx').includes("import { lerEstadoDaLigacao } from '@/lib/whatsappConnection';")],

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
