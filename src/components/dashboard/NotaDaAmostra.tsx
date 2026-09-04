import type { ExperimentalApifySnapshot } from '@/lib/experimentalApifySnapshot';
import { useOwnerTranslation } from '@/i18n/owner/useOwnerTranslation';
import { sampleWasTruncated } from '@/lib/reputationSnapshotReading';

/**
 * A nota de rodape que diz de que amostra saiu o numero acima.
 *
 * Extraida de `ApprovedCockpitDashboard` em 04/09/2026: os cartoes de leitura
 * sairam para ficheiro proprio e o cartao dos temas ficou. Os dois a usam, e
 * mantê-la no painel obrigaria os cartoes a importar dele — um ciclo.
 */
/**
 * Contrato de produto, linha 30: amostra nunca pode aparecer como dado
 * oficial, completo ou real sem estar identificada.
 *
 * No piloto Apify a distribuição por nota, o tempo médio de resposta, as
 * avaliações dos últimos 30 dias e os temas são calculados sobre a amostra
 * coletada. Um negócio com 400 avaliações mostrava a distribuição de 50 sem
 * nada dizendo isso, oito vezes menor que a realidade.
 *
 * A etiqueta aparece exatamente quando houve corte, e não sempre que a leitura
 * veio do Apify. A coleta pede no máximo 50 e recebe o que existir: um negócio
 * com 20 avaliações recebe as 20, e aí a leitura está completa. Chamar isso de
 * amostra subestimaria, na frente de um cliente, um dado que está inteiro. Por
 * isso a condição é a mesma que decide o histórico semanal, e vem da mesma
 * função: `sampleWasTruncated`.
 *
 * A nota e o total de avaliações nunca levam a etiqueta: mesmo vindos do
 * Apify eles são os números do negócio inteiro, lidos do próprio perfil.
 *
 * A etiqueta é aditiva por exigência do contrato: um rodapé discreto dentro do
 * cartão que já existe, sem redesenhar, fundir, esconder ou deslocar módulo
 * nenhum.
 */
export const SampleSourceNote = ({ snapshot }: { snapshot: ExperimentalApifySnapshot }) => {
  const { t } = useOwnerTranslation();
  if (!sampleWasTruncated(snapshot)) return null;
  return <p className="mt-4 text-xs leading-4 text-slate-500">{t('dashboard.cockpit.layout.sampleSourceNote', { sample: snapshot.sample.reviewCount })}</p>;
};

/*
 * Aqui vivia o índice fixo do celular (`MobileIndex`), aprovado em 30/08/2026
 * e removido em 31/08/2026 por decisão de Marcelo, depois de o ver cortado no
 * próprio telemóvel. O menu principal já leva a pessoa a cada destino, e um
 * segundo nível de navegação por cima dele custava a primeira dobra inteira.
 * Ver "Painel que cabe no celular" no contrato de produto.
 */