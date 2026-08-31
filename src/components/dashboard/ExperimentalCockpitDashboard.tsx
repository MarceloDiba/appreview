import type { ExperimentalApifySnapshot } from '@/lib/experimentalApifySnapshot';
import ApprovedCockpitDashboard from '@/components/dashboard/ApprovedCockpitDashboard';

/**
 * Passagem para o cockpit aprovado.
 *
 * Este arquivo carregava, ate 30/08/2026, um painel inteiro anterior
 * (`LegacyExperimentalCockpitDashboard` e as duas dezenas de cartoes que so
 * ele usava, entre eles o `WhatsAppWorkspace` exportado): cerca de 250 linhas
 * que nenhum caminho da aplicacao alcancava. O unico consumidor deste modulo e
 * `src/pages/Dashboard.tsx`, que importa o export default; o export default
 * sempre renderizou `ApprovedCockpitDashboard` e nada mais.
 *
 * O codigo morto tinha custo real: era o painel de abas com os textos na voz
 * de quem espera pelo Google, escritos antes da decisao de 30/08/2026 sobre
 * quem entrega hoje. Quem lesse o arquivo procurando o painel encontrava
 * primeiro a versao errada, e duas das sete chamadas de `buildReplySuggestions`
 * do projeto viviam ali, sem pais do negocio, protegidas de qualquer correcao
 * por nunca executarem.
 *
 * O nome fica porque `scripts/check-persistencia-agregados.mjs` prende a ele a
 * prova de que o painel renderizado e o cockpit aprovado, e porque
 * `src/pages/Dashboard.tsx` continua a importa-lo.
 */
const ExperimentalCockpitDashboard = ({ snapshot, userId }: { snapshot: ExperimentalApifySnapshot; userId?: string }) => (
  <ApprovedCockpitDashboard snapshot={snapshot} userId={userId} />
);

export default ExperimentalCockpitDashboard;
