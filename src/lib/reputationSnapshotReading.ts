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

const snapshotTime = (snapshot: ExperimentalApifySnapshot | null) => {
  if (!snapshot) return null;
  const parsed = new Date(snapshot.fetchedAt).getTime();
  return Number.isFinite(parsed) ? parsed : null;
};

/**
 * Escolhe o retrato mais recente entre o do navegador e o que veio do banco.
 *
 * A precedência não pode ser fixa. A coleta diária no servidor grava apenas a
 * linha persistida, sem passar por navegador nenhum: com o navegador vencendo
 * sempre, um cliente que paga por coleta diária continuaria vendo um retrato
 * de dias atrás enquanto os números novos já estariam no banco.
 *
 * A comparação é entre o `fetchedAt` do retrato do navegador e o `captured_at`
 * da linha persistida, que `buildSnapshotFromPersistedRow` copia para o
 * `fetchedAt` do retrato que devolve. Empate fica com o navegador: é a mesma
 * coleta dos dois lados, e o lado do navegador ainda traz o histórico semanal
 * que a linha do banco não guarda.
 *
 * Data ausente ou ilegível no navegador conta como mais ANTIGA, nunca como
 * mais nova: na dúvida vence a linha do banco, que sempre tem `captured_at`.
 *
 * A fila de respostas continua vindo do `localStorage` qualquer que seja o
 * vencedor: nome, texto e URL de avaliação nunca foram gravados (contrato de
 * produto, linhas 39 a 41).
 */
export const chooseFreshestSnapshot = (
  browserSnapshot: ExperimentalApifySnapshot | null,
  persistedSnapshot: ExperimentalApifySnapshot | null,
): ExperimentalApifySnapshot | null => {
  if (!browserSnapshot) return persistedSnapshot;
  if (!persistedSnapshot) return browserSnapshot;
  const browserTime = snapshotTime(browserSnapshot);
  const persistedTime = snapshotTime(persistedSnapshot);
  if (browserTime === null) return persistedSnapshot;
  if (persistedTime === null) return browserSnapshot;
  return browserTime >= persistedTime ? browserSnapshot : persistedSnapshot;
};
