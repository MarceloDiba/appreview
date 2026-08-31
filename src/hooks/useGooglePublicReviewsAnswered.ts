import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useOwnerTranslation } from '@/i18n/owner/useOwnerTranslation';

/**
 * Quais avaliações lidas do perfil público o DONO já respondeu no Google.
 *
 * O Binno não publica nada e a Places API não devolve as respostas que o dono
 * publicou, então esta é a única forma de uma avaliação pública sair da fila.
 * Sem ela, "N esperando resposta" nunca descia para quem tem link do Google
 * configurado, e um número que nunca desce ensina o dono a ignorar o número.
 *
 * Guardado em `google_public_reviews_answered`, com a mesma durabilidade de
 * `internal_feedback.is_addressed`: o dono marca no telemóvel e continua
 * marcado no computador. Marcar insere a linha; desmarcar apaga-a.
 */
export const useGooglePublicReviewsAnswered = (userId: string) => {
  const { t } = useOwnerTranslation();
  const [answered, setAnswered] = useState<string[]>([]);
  const [markingId, setMarkingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabase
      .from('google_public_reviews_answered')
      .select('review_id')
      .eq('user_id', userId);
    if (error) {
      console.error('Could not load answered public reviews:', error.message);
      return;
    }
    setAnswered((data || []).map((linha) => linha.review_id));
  }, [userId]);

  useEffect(() => { void load(); }, [load]);

  const mark = useCallback(async (reviewId: string, respondida: boolean) => {
    setMarkingId(reviewId);
    // A lista local muda primeiro para o item sair da fila no toque, e volta
    // atrás se o banco recusar. Um botão que parece não fazer nada durante a
    // viagem à rede é o defeito que esta fila existe para não repetir.
    const anterior = answered;
    setAnswered((atual) => (respondida ? [...atual, reviewId] : atual.filter((id) => id !== reviewId)));
    try {
      const { error } = respondida
        ? await supabase.from('google_public_reviews_answered').insert({ user_id: userId, review_id: reviewId })
        : await supabase.from('google_public_reviews_answered').delete().eq('user_id', userId).eq('review_id', reviewId);
      if (error) throw error;
      toast.success(respondida ? t('reviews.queue.answeredToast') : t('reviews.queue.unansweredToast'));
    } catch (updateError) {
      console.error('Could not mark public review:', updateError);
      setAnswered(anterior);
      toast.error(t('reviews.cases.updateError'));
    } finally {
      setMarkingId(null);
    }
  }, [answered, t, userId]);

  return { answered, markingId, mark, refresh: load };
};
