import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { chaveDaAvaliacaoDoGoogle } from '@/lib/filaDeRespostas';

/**
 * Quais avaliações do retrato já têm resposta publicada no Google.
 *
 * POR QUE ISTO EXISTE
 *
 * A lista da aba Google vem do retrato da Apify, que não sabe se alguém já
 * respondeu — ele foi tirado num instante e é cego para o que veio depois. Em
 * 05/09/2026 isso fez o produto oferecer "sugerir resposta" a quem já tinha
 * sido respondido, e o conserto foi deixar de oferecer quando a ligação oficial
 * está viva.
 *
 * Marcelo, ao ver o conserto: isso evita o dano e não devolve a informação —
 * ele continuava a olhar a lista sem distinguir respondida de não respondida.
 * Pediu para marcar. Isto é o que sabe quais marcar.
 *
 * A CHAVE É A MESMA DA FILA, e isso não é economia: é correcção. As duas
 * fontes não partilham identificador — o retrato traz `review_id` da Apify e o
 * oficial traz o nome do Google. `chaveDaAvaliacaoDoGoogle` junta autor sem
 * acentos, nota e DIA, e é a mesma comparação que `filaDeRespostas` usa para
 * não mostrar a mesma avaliação duas vezes. Se um dia ela mudar, muda nos dois
 * sítios ao mesmo tempo, que é o que se quer.
 *
 * SÓ LÊ. Não sincroniza, não chama o Google, não gasta quota — ao contrário de
 * `useGoogleBusinessReviewQueue`, que faz tudo isso e seria caro de mais para
 * uma marca visual.
 */
export const useAvaliacoesJaRespondidas = (userId: string | undefined) => {
  const [chaves, setChaves] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!userId) {
      setChaves(new Set());
      return;
    }
    let vivo = true;
    void (async () => {
      const { data, error } = await supabase
        .from('google_business_reviews')
        .select('reviewer_name, rating, review_updated_at')
        .eq('user_id', userId)
        .not('reply_text', 'is', null);

      if (!vivo) return;
      if (error) {
        // NÃO INVENTA UM CONJUNTO VAZIO EM SILÊNCIO. Vazio quer dizer "nenhuma
        // respondida", e é indistinguível de "não consegui perguntar". Como
        // aqui o efeito de errar é apenas não marcar, regista-se e segue-se —
        // mas fica escrito, para quem for depurar não procurar no sítio errado.
        console.error('Não consegui saber quais avaliações já foram respondidas:', error.message);
        setChaves(new Set());
        return;
      }

      setChaves(new Set((data || []).map((avaliacao) => chaveDaAvaliacaoDoGoogle(
        avaliacao.reviewer_name,
        avaliacao.rating,
        avaliacao.review_updated_at,
      ))));
    })();
    return () => { vivo = false; };
  }, [userId]);

  return chaves;
};
