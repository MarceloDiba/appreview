import type { ExperimentalApifySnapshot } from '@/lib/experimentalApifySnapshot';

/**
 * Leitura do agregado que ficou gravado no banco.
 *
 * O piloto Apify guardava o resultado da coleta só no `localStorage`. O painel
 * enchia num aparelho e ficava vazio em todos os outros, e a coleta automática
 * do cadastro, que roda sem navegador nenhum, não tinha onde entregar o que
 * pagou. Estes agregados existem agora em `google_business_reputation_snapshots`
 * e são o que o painel lê.
 *
 * O que NÃO está aqui é tão importante quanto o que está: nome do avaliador,
 * texto da avaliação e URL pública da avaliação nunca foram gravados, então a
 * fila de respostas continua vindo do navegador autenticado, com a retenção de
 * 14 dias que o contrato de produto define nas linhas 39 a 41.
 */
export type PersistedReputationSnapshotRow = {
  captured_at: string;
  total_reviews: number;
  average_rating: number;
  rating_breakdown: unknown;
  unanswered_review_count: number;
  reviews_last_30_days: number | null;
  average_response_hours: number | null;
  topics: unknown;
  /**
   * Proveniência da linha. `apify-experimental` significa que a distribuição
   * por nota, as não respondidas, os últimos 30 dias, o tempo de resposta e os
   * temas vieram de uma amostra de no máximo 50 avaliações; `official-google`
   * significa que vieram de todas as avaliações do negócio. Os dois valores
   * ocupam as mesmas colunas, e é por isso que comparar linhas ao longo do
   * tempo sem separar por `source` inventaria um salto de resultado.
   */
  source: string;
};

export const APIFY_REPUTATION_SOURCE = 'apify-experimental';

const ratings = ['1', '2', '3', '4', '5'] as const;
const emptyBreakdown = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
const topicIds = ['service', 'wait', 'food', 'cleanliness', 'price', 'atmosphere', 'delivery'];
const sentiments = ['positive', 'negative', 'mixed'];

const numberOrZero = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const numberOrNull = (value: unknown) => {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const readBreakdown = (value: unknown): ExperimentalApifySnapshot['sample']['ratingBreakdown'] => {
  if (!value || typeof value !== 'object') return { ...emptyBreakdown };
  const stored = value as Record<string, unknown>;
  return ratings.reduce((breakdown, rating) => ({
    ...breakdown,
    [rating]: Math.max(0, Math.trunc(numberOrZero(stored[rating]))),
  }), { ...emptyBreakdown });
};

const readTopics = (value: unknown): NonNullable<ExperimentalApifySnapshot['sample']['insights']>['topics'] => {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const topic = item as Record<string, unknown>;
    if (typeof topic.id !== 'string' || !topicIds.includes(topic.id)) return [];
    if (typeof topic.sentiment !== 'string' || !sentiments.includes(topic.sentiment)) return [];
    return [{
      id: topic.id as NonNullable<ExperimentalApifySnapshot['sample']['insights']>['topics'][number]['id'],
      count: Math.max(0, Math.trunc(numberOrZero(topic.count))),
      sentiment: topic.sentiment as 'positive' | 'negative' | 'mixed',
    }];
  });
};

/**
 * Converte uma linha persistida no mesmo retrato que o painel já sabe
 * desenhar. Os módulos que a linha não sustenta ficam sem evidência de
 * propósito: não existe histórico semanal gravado, então volume, cada nota
 * separada e "o que mudou na semana" ficam sem evidência, em vez de mostrar
 * uma curva reconstruída por inferência. O cockpit aprovado continua sendo a única tela
 * do dono autenticado, como o contrato exige nas linhas 137 a 141.
 */
export const buildSnapshotFromPersistedRow = (
  row: PersistedReputationSnapshotRow | null,
  { businessName }: { businessName: string },
): ExperimentalApifySnapshot | null => {
  if (!row) return null;

  const ratingBreakdown = readBreakdown(row.rating_breakdown);
  // A soma da distribuição é o tamanho da leitura que gerou estas colunas: a
  // amostra coletada, no caminho Apify, e o total de avaliações, no caminho
  // oficial. É a mesma base que o campo de não respondidas usa.
  const sampleSize = ratings.reduce((total, rating) => total + ratingBreakdown[rating], 0);
  const unanswered = Math.max(0, Math.trunc(numberOrZero(row.unanswered_review_count)));

  return {
    source: row.source === APIFY_REPUTATION_SOURCE ? 'apify-experimental' : 'owner-dashboard-summary',
    fetchedAt: row.captured_at,
    business: {
      name: businessName,
      address: '',
      placeId: '',
      // Totais do negócio inteiro, não da amostra.
      googleRating: numberOrZero(row.average_rating),
      googleReviewCount: Math.max(0, Math.trunc(numberOrZero(row.total_reviews))),
    },
    sample: {
      reviewCount: sampleSize,
      ratingBreakdown,
      ownerRepliesFound: Math.max(0, sampleSize - unanswered),
      insights: {
        reviewsLast30Days: numberOrNull(row.reviews_last_30_days),
        averageResponseHours: numberOrNull(row.average_response_hours),
        topics: readTopics(row.topics),
      },
    },
  };
};

/**
 * Teto de avaliações que a coleta Apify pede ao Actor. O mesmo número esta em
 * `supabase/functions/_shared/experimentalApifyCollection.ts` (`maxItems` e
 * `maxReviews`), e ali ele já e protegido por
 * `scripts/check-binno-product-contract.mjs`.
 */
export const APIFY_SAMPLE_CAP = 50;

/**
 * Tolerancia de relógio para a data do retrato do navegador. Um retrato com
 * data no futuro além disto não e adiantamento de relógio: é valor editado a
 * mao ou relógio quebrado, e sem este limite ele venceria o banco para sempre.
 */
const CLOCK_SKEW_TOLERANCE_MS = 10 * 60 * 1_000;

const persistedTimeOf = (snapshot: ExperimentalApifySnapshot | null) => {
  if (!snapshot) return null;
  const parsed = new Date(snapshot.fetchedAt).getTime();
  return Number.isFinite(parsed) ? parsed : null;
};

/**
 * Data do retrato do navegador, ou nulo quando não da para confiar nela.
 * Ausente, ilegível ou no futuro além da tolerância de relógio contam todas
 * como nulo, e nulo perde: na dúvida vence a linha do banco, que tem
 * `captured_at` gravado pelo servidor.
 */
const browserTimeOf = (snapshot: ExperimentalApifySnapshot | null, now: number) => {
  const parsed = persistedTimeOf(snapshot);
  if (parsed === null || parsed > now + CLOCK_SKEW_TOLERANCE_MS) return null;
  return parsed;
};

/**
 * Escolhe de onde vem o AGREGADO, e só ele. A coleta diária no servidor grava
 * apenas a linha persistida, sem passar por navegador nenhum: com precedência
 * fixa, quem paga por coleta diária continuaria vendo números de dias atras.
 *
 * A comparação e entre o `fetchedAt` do retrato do navegador e o `captured_at`
 * da linha persistida, que `buildSnapshotFromPersistedRow` copia para o
 * `fetchedAt` do retrato que devolve.
 *
 * Empate deixou de ser um caso especial. Antes o navegador precisava ganhar o
 * empate para não levar junto a fila de respostas e o histórico semanal; agora
 * esses dois são compostos a parte, então empate fica com a linha do banco e
 * nada se perde por causa disso.
 */
const freshestAggregates = (
  browserSnapshot: ExperimentalApifySnapshot | null,
  persistedSnapshot: ExperimentalApifySnapshot | null,
  now: number,
): ExperimentalApifySnapshot | null => {
  if (!browserSnapshot) return persistedSnapshot;
  if (!persistedSnapshot) return browserSnapshot;
  const browserTime = browserTimeOf(browserSnapshot, now);
  const persistedTime = persistedTimeOf(persistedSnapshot);
  if (browserTime === null) return persistedSnapshot;
  if (persistedTime === null) return browserSnapshot;
  return browserTime > persistedTime ? browserSnapshot : persistedSnapshot;
};

const weeklyHistoryOwner = (
  aggregates: ExperimentalApifySnapshot | null,
  browserSnapshot: ExperimentalApifySnapshot | null,
) => [aggregates, browserSnapshot].find((candidato) => candidato?.sample.insights?.history?.weeks?.length) || null;

/**
 * A amostra do Apify são as até 50 avaliações MAIS RECENTES. A coleta pede no
 * máximo 50 e recebe o que existir: um negócio com 20 avaliações recebe as 20,
 * e essa leitura é COMPLETA. Só quando a amostra bate no teto é que houve
 * corte, e só aí as medidas derivadas dela representam parte do perfil.
 *
 * Este é o único lugar do painel que compara a amostra com o teto. As duas
 * regras que dependem disso saem daqui:
 *
 *   - o histórico semanal não entra na leitura quando houve corte, porque as
 *     semanas mais antigas da janela ficam sem as avaliações cortadas e a
 *     comparação mostraria uma queda que é artefato do corte, não do negócio.
 *     Uma observação que falta é aceitável; uma fragilidade inventada não é, e
 *     o contrato já diz isso do Radar;
 *   - a identificação de amostra no cockpit só aparece quando houve corte.
 *     Dizer "amostra, não o total" sobre uma leitura completa subestimaria um
 *     dado inteiro na frente de um cliente.
 *
 * Duas regras que precisam concordar, escritas duas vezes, é o defeito que
 * este projeto já pagou mais de uma vez. Por isso as duas chamam esta função.
 *
 * No caminho oficial a leitura vem de todas as avaliações do negócio, então
 * não existe corte nenhum.
 */
export const sampleWasTruncated = (snapshot: ExperimentalApifySnapshot) =>
  snapshot.source === 'apify-experimental' && snapshot.sample.reviewCount >= APIFY_SAMPLE_CAP;

/**
 * Monta a leitura que o cockpit desenha a partir das três fontes possíveis,
 * em vez de escolher um retrato inteiro entre elas.
 *
 * Escolher um retrato inteiro juntava, num objeto só, coisas com tempos de
 * vida e regras de proveniência diferentes: quando a linha do banco vencia, a
 * fila de respostas sumia da tela, ainda que estivesse intacta no
 * `localStorage`. E o caso da linha do banco vencer e exatamente o da coleta
 * diária, ou seja, quem paga era quem perdia a fila.
 *
 * Composicao:
 *   - o AGREGADO vem da fonte mais recente (navegador ou banco), ou do resumo
 *     neutro do negócio quando não existe nenhuma coleta;
 *   - a FILA DE RESPOSTAS vem sempre do `localStorage`, em todos os ramos,
 *     independente de qual agregado venceu. Nome, texto e URL de avaliação só
 *     existem ali (contrato de produto, linhas 39 a 41);
 *   - o HISTORICO SEMANAL vem de quem o tiver, porque a linha do banco não
 *     guarda semanas, e só quando a amostra que o gerou cobre a janela.
 */
export const composeCockpitSnapshot = ({
  browserSnapshot,
  persistedSnapshot,
  fallbackSnapshot,
  now = Date.now(),
}: {
  browserSnapshot: ExperimentalApifySnapshot | null;
  persistedSnapshot: ExperimentalApifySnapshot | null;
  fallbackSnapshot: ExperimentalApifySnapshot | null;
  now?: number;
}): ExperimentalApifySnapshot | null => {
  const aggregates = freshestAggregates(browserSnapshot, persistedSnapshot, now) || fallbackSnapshot;
  if (!aggregates) return null;

  const observedReviews = browserSnapshot?.sample.observedReviews;
  const owner = weeklyHistoryOwner(aggregates, browserSnapshot);
  const history = owner && !sampleWasTruncated(owner) ? owner.sample.insights?.history : undefined;

  return {
    ...aggregates,
    sample: {
      ...aggregates.sample,
      observedReviews,
      insights: {
        reviewsLast30Days: aggregates.sample.insights?.reviewsLast30Days ?? null,
        averageResponseHours: aggregates.sample.insights?.averageResponseHours ?? null,
        topics: aggregates.sample.insights?.topics || [],
        history,
      },
    },
  };
};
