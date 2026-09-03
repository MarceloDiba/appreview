import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * O que o Binno mandou para o WhatsApp e ainda espera um "1".
 *
 * O painel precisa de o mostrar para o dono nao mandar duas respostas para a
 * mesma avaliacao — uma pelo telemovel e outra pelo painel — e para ele
 * perceber que a mensagem que recebeu ainda esta de pe.
 *
 * So le. A escrita fica com o servidor: a politica de RLS em
 * `respostas_a_confirmar` deixa o dono LER as suas linhas, e revoga
 * insert/update/delete de `anon` e `authenticated` (migracao
 * `20260903200000`). Uma confirmacao vinda do navegador nao provaria que a
 * pessoa respondeu no WhatsApp — e e essa prova que autoriza publicar no
 * perfil publico dela. Este ficheiro nao pode ganhar um `.insert(`, um
 * `.update(` nem um `.upsert(` contra esta tabela; `confirmar_resposta_do_dono`
 * so pode ser chamada a partir do webhook da Meta.
 */
export type RespostaAEsperar = {
  id: string;
  reviewId: string;
  rascunho: string;
  expiraEm: string;
};

export const useRespostaAEsperar = (userId?: string) => {
  const [aEsperar, setAEsperar] = useState<RespostaAEsperar | null>(null);

  useEffect(() => {
    if (!userId) { setAEsperar(null); return; }
    let activo = true;
    void supabase
      .from('respostas_a_confirmar')
      .select('id, review_id, rascunho, expira_em')
      .eq('user_id', userId)
      .is('confirmado_em', null)
      .is('recusado_em', null)
      .gt('expira_em', new Date().toISOString())
      .maybeSingle()
      .then(({ data }) => {
        if (!activo) return;
        setAEsperar(data ? {
          id: data.id,
          reviewId: data.review_id,
          rascunho: data.rascunho,
          expiraEm: data.expira_em,
        } : null);
      });
    return () => { activo = false; };
  }, [userId]);

  return aEsperar;
};
