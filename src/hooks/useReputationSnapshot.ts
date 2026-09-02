import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { PersistedReputationSnapshotRow } from '@/lib/reputationSnapshotReading';

/**
 * Busca o agregado mais recente do negócio em
 * `google_business_reputation_snapshots`. É o que faz o painel encher em
 * qualquer aparelho do dono, e não só naquele que pediu a coleta.
 *
 * A consulta traz uma linha só, e traz a coluna `source` junto dos números.
 * Uma leitura de linha única não compara nada, então não precisa filtrar por
 * proveniência; a partir do momento em que alguma leitura devolver mais de uma
 * linha, ela passa a comparar amostra de 50 com contagem completa na mesma
 * coluna, e aí precisa ficar presa a uma única `source`. Sem `source` no
 * SELECT nem daria para fazer essa separação: a proveniência chegaria anônima
 * ao painel. `scripts/check-persistencia-agregados.mjs` reprova as duas
 * quebras.
 */
export const useReputationSnapshot = (userId?: string) => {
  const [row, setRow] = useState<PersistedReputationSnapshotRow | null>(null);
  const [loading, setLoading] = useState(Boolean(userId));

  useEffect(() => {
    let active = true;

    if (!userId) {
      setRow(null);
      setLoading(false);
      return () => {
        active = false;
      };
    }

    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('google_business_reputation_snapshots')
        .select('captured_at, total_reviews, average_rating, rating_breakdown, unanswered_review_count, reviews_last_30_days, average_response_hours, topics, weekly_history, source')
        .eq('user_id', userId)
        .order('captured_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!active) return;
      if (error) {
        console.error('Erro ao ler o agregado de reputação:', error);
        setRow(null);
      } else {
        setRow((data as PersistedReputationSnapshotRow) || null);
      }
      setLoading(false);
    };

    void load();
    return () => {
      active = false;
    };
  }, [userId]);

  return { row, loading };
};
