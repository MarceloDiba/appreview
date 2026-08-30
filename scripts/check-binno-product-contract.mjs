import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const dashboard = read('src/components/dashboard/ApprovedCockpitDashboard.tsx');
const pendingCommentsBanner = read('src/components/dashboard/PendingCommentsBanner.tsx');
const dashboardPage = read('src/pages/Dashboard.tsx');
const collector = read('supabase/functions/sync-experimental-apify/index.ts');
// A janela de 24h e o teto mensal viraram núcleo partilhado em 30/08/2026
// (decisão de coleta automática no cadastro), para que a coleta automática do
// cadastro não possa, por construção, reimplementar ou contornar o que a
// coleta manual já respeita. As duas asserções abaixo que citam esses limites
// leem o núcleo partilhado, não mais este arquivo.
const collectorCore = read('supabase/functions/_shared/experimentalApifyCollection.ts');
const advisorReading = read('src/lib/advisorReading.ts');
const estilos = read('src/index.css');

// indexOf(A) < indexOf(B) sozinho e cego a A ter sido apagado inteiro: sem A,
// indexOf devolve -1, e -1 e sempre menor que a posicao real de B, entao o
// guarda passa sem checar nada. As duas comparacoes de ordem abaixo exigem
// presenca dos dois lados antes de comparar posicao, para nao depender de um
// guarda vizinho contar as ocorrencias por acidente.
const requirements = [
  ['painel mantém a fila antes das métricas', dashboard.includes('<ResponseQueue reviews={queue} snapshot={snapshot} demo={demo} />') && dashboard.includes('<VolumeCard weeks={history} />') && dashboard.indexOf('<ResponseQueue reviews={queue} snapshot={snapshot} demo={demo} />') < dashboard.indexOf('<VolumeCard weeks={history} />')],
  ['painel mantém volume, notas, QR e temas', ['<VolumeCard weeks={history} />', '<RatingTrends weeks={history} snapshot={snapshot} />', '<QrCard funnel={funnel.data} />', '<TopicsCard snapshot={snapshot} />'].every((token) => dashboard.includes(token))],
  ['coluna lateral mantém reputação, WhatsApp, boas práticas, completude e semana', ['<ReputationCard snapshot={snapshot} />', '<WhatsAppCard localWhatsApp={whatsApp}', '<DailyPractice snapshot={snapshot}', '<ProfileCompleteness connected={official.syncComplete} />', '<WeeklyChange weeks={history} />'].every((token) => dashboard.includes(token))],
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
  // O <nav> era proibido por significar seletor de abas. Em 30/08/2026 o
  // contrato passou a permitir exatamente um: o índice do celular, que é
  // atalho e não navegação. A proibição continua valendo para qualquer outro,
  // e é por isso que a contagem é exata e o único permitido é nomeado.
  ['o único <nav> do painel é o índice do celular aprovado', (dashboard.match(/<nav/g) || []).length === 1 && /const MobileIndex[\s\S]{0,400}<nav/.test(dashboard)],
  ['fila de respostas aparece uma única vez: a antiga aba "Avaliações" não duplica a seção', (dashboard.match(/<ResponseQueue reviews=\{queue\} snapshot=\{snapshot\} demo=\{demo\} \/>/g) || []).length === 1],
  ['fila de respostas, QR/temas e configuração do WhatsApp têm âncora própria e única na página', (dashboard.match(/id=\{QUEUE_ANCHOR_ID\}/g) || []).length === 1 && (dashboard.match(/id=\{QR_ANCHOR_ID\}/g) || []).length === 1 && (dashboard.match(/id=\{WHATSAPP_ANCHOR_ID\}/g) || []).length === 1],
  ['Plano de hoje e Resumo no WhatsApp linkam para a âncora certa em vez de trocar de aba', (dashboard.match(/href=\{`#\$\{QUEUE_ANCHOR_ID\}`\}/g) || []).length >= 1 && (dashboard.match(/href=\{`#\$\{WHATSAPP_ANCHOR_ID\}`\}/g) || []).length === 1],
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
  ['configuração completa do WhatsApp não fica atrás de aba: sempre renderizada na página', dashboard.includes('<WhatsAppNotificationWorkspace localWhatsApp={whatsApp} onboardingPhone={onboardingPhone}') && !dashboard.includes("tab === 'whatsapp'")],
  ['Radar, Plano de hoje e Resultado observado são adicionais aos módulos aprovados', ['<RadarNow snapshot={snapshot} />', '<TodayPlan snapshot={snapshot}', '<ObservedResult snapshot={snapshot}'].every((token) => dashboard.includes(token))],
  ['Radar e Plano permanecem visíveis sem alerta severo', dashboard.includes('const reading = getAdvisorReading(snapshot);') && !dashboard.includes('if (!alert && !opportunity) return null;')],
  ['assessor só usa força positiva agregada ou critérios de alerta existentes', advisorReading.includes("topic.sentiment === 'positive' && topic.count >= 3") && advisorReading.includes("if (alert)") && advisorReading.includes("return { kind: 'monitor' }")],
  ['dashboard autenticado não retorna ao layout legado quando falta snapshot', dashboardPage.includes('approvedFallbackSnapshot') && !['GoogleOutcomeCard', 'ReputationRadarCard', 'ReputationAdvisorCard', 'ProfileHealthCard'].some((token) => dashboardPage.includes(token))],
  ['telefone do onboarding é reutilizado no WhatsApp', dashboard.includes('onboardingPhone={onboardingPhone}')],
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
  ['bloco de comentários pendentes, quando existe, fica antes da fila de respostas na Visão geral', dashboard.includes('<PendingCommentsBanner userId={userId} />') && dashboard.includes('<ResponseQueue reviews={queue} snapshot={snapshot} demo={demo} />') && dashboard.indexOf('<PendingCommentsBanner userId={userId} />') < dashboard.lastIndexOf('<ResponseQueue reviews={queue} snapshot={snapshot} demo={demo} />')],
  ['coleta pede nome público', collector.includes("'reviewerName', 'authorName', 'reviewerDisplayName', 'name'")],
  ['coleta aceita somente campos específicos de permalink', collector.includes("['reviewUrl', 'reviewURL', 'reviewLink', 'reviewUri']") && !collector.includes("'reviewUri', 'url'")],
  ['coleta temporária continua sem agenda e com limite explícito', collectorCore.includes("maxReviews: 50") && collectorCore.includes("APIFY_EXPERIMENTAL_COOLDOWN")],
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
