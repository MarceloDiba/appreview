import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { ExperimentalObservedReview } from '@/lib/experimentalApifySnapshot';

/**
 * Busca a fila de respostas do dono em `google_reviews_awaiting_reply`.
 *
 * Até 31/08/2026 esta lista vivia só no `localStorage` do navegador que fez a
 * coleta. O preço disso só ficou visível quando a coleta passou a rodar
 * sozinha: uma coleta feita pelo servidor não tem navegador, então entregava
 * números e nenhuma fila. Um cliente pagando pela coleta diária acordaria com
 * os gráficos atualizados e a lista de avaliações a responder vazia.
 *
 * A retenção de 14 dias é aplicada nos dois lados: a coleta apaga o que venceu
 * daquele dono a cada gravação, e esta leitura ainda filtra por `expires_at`.
 * O filtro sozinho deixaria a linha morta no banco; a limpeza sozinha deixaria
 * uma janela entre o vencimento e a próxima coleta. As duas juntas fecham as
 * duas pontas.
 */
export type FilaDeRespostasPersistida = {
  items: ExperimentalObservedReview[];
  retentionEndsAt: string | null;
};

export const useFilaDeRespostas = (userId?: string) => {
  const [fila, setFila] = useState<FilaDeRespostasPersistida | null>(null);
  const [loading, setLoading] = useState(Boolean(userId));

  useEffect(() => {
    let active = true;

    if (!userId) {
      setFila(null);
      setLoading(false);
      return () => {
        active = false;
      };
    }

    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('google_reviews_awaiting_reply')
        .select('review_id, rating, comment, published_at, reviewer_name, review_url, response_observed, expires_at')
        .eq('user_id', userId)
        .gt('expires_at', new Date().toISOString())
        .order('published_at', { ascending: false, nullsFirst: false });

      if (!active) return;

      if (error || !data) {
        setFila(null);
        setLoading(false);
        return;
      }

      setFila({
        items: data.map((linha) => ({
          id: linha.review_id as string,
          rating: linha.rating as number,
          comment: linha.comment as string,
          publishedAt: (linha.published_at as string | null) ?? null,
          reviewerName: (linha.reviewer_name as string | null) ?? undefined,
          reviewUrl: (linha.review_url as string | null) ?? undefined,
          responseObserved: Boolean(linha.response_observed),
        })),
        // Todas as linhas de uma coleta carregam o mesmo prazo; a primeira
        // basta para dizer ao dono até quando ele vê esta lista.
        retentionEndsAt: (data[0]?.expires_at as string | undefined) ?? null,
      });
      setLoading(false);
    };

    void load();
    return () => {
      active = false;
    };
  }, [userId]);

  return { fila, loading };
};
