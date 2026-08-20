import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const dashboard = read('src/components/dashboard/ApprovedCockpitDashboard.tsx');
const dashboardPage = read('src/pages/Dashboard.tsx');
const collector = read('supabase/functions/sync-experimental-apify/index.ts');
const advisorReading = read('src/lib/advisorReading.ts');

const requirements = [
  ['painel mantém a fila antes das métricas', dashboard.indexOf('<ResponseQueue reviews={queue} snapshot={snapshot} />') < dashboard.indexOf('<VolumeCard weeks={history} />')],
  ['painel mantém volume, notas, QR e temas', ['<VolumeCard weeks={history} />', '<RatingTrends weeks={history} snapshot={snapshot} />', '<QrCard funnel={funnel.data} />', '<TopicsCard snapshot={snapshot} />'].every((token) => dashboard.includes(token))],
  ['coluna lateral mantém reputação, WhatsApp, boas práticas, completude e semana', ['<ReputationCard snapshot={snapshot} />', '<WhatsAppCard localWhatsApp={whatsApp}', '<DailyPractice snapshot={snapshot}', '<ProfileCompleteness connected={official.syncComplete} />', '<WeeklyChange weeks={history} />'].every((token) => dashboard.includes(token))],
  ['Radar, Plano de hoje e Resultado observado são adicionais aos módulos aprovados', ['<RadarNow snapshot={snapshot} />', '<TodayPlan snapshot={snapshot}', '<ObservedResult snapshot={snapshot}'].every((token) => dashboard.includes(token))],
  ['Radar e Plano permanecem visíveis sem alerta severo', dashboard.includes('const reading = getAdvisorReading(snapshot);') && !dashboard.includes('if (!alert && !opportunity) return null;')],
  ['assessor só usa força positiva agregada ou critérios de alerta existentes', advisorReading.includes("topic.sentiment === 'positive' && topic.count >= 3") && advisorReading.includes("if (alert)") && advisorReading.includes("return { kind: 'monitor' }")],
  ['dashboard autenticado não retorna ao layout legado quando falta snapshot', dashboardPage.includes('approvedFallbackSnapshot') && !['GoogleOutcomeCard', 'ReputationRadarCard', 'ReputationAdvisorCard', 'ProfileHealthCard'].some((token) => dashboardPage.includes(token))],
  ['telefone do onboarding é reutilizado no WhatsApp', dashboard.includes('onboardingPhone={onboardingPhone}')],
  ['fila oferece copiar e abrir somente com permalink individual', dashboard.includes("selected.reviewUrl ? <Button asChild") && dashboard.includes("copyAndOpenReview")],
  ['fila não inventa nome quando a fonte não o devolve', dashboard.includes("t('dashboard.cockpit.layout.anonymousReviewer')")],
  ['coleta pede nome público', collector.includes("'reviewerName', 'authorName', 'reviewerDisplayName', 'name'")],
  ['coleta aceita somente campos específicos de permalink', collector.includes("['reviewUrl', 'reviewURL', 'reviewLink', 'reviewUri']") && !collector.includes("'reviewUri', 'url'")],
  ['coleta temporária continua sem agenda e com limite explícito', collector.includes("maxReviews: 50") && collector.includes("APIFY_EXPERIMENTAL_COOLDOWN")],
];

const failed = requirements.filter(([, ok]) => !ok).map(([label]) => label);
if (failed.length) {
  console.error(`Contrato de produto Binno violado:\n- ${failed.join('\n- ')}`);
  process.exit(1);
}

console.log(`Contrato de produto Binno verificado: ${requirements.length} proteções ativas.`);
