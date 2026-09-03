import { useCallback, useEffect, useRef, useState } from 'react';
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
 *
 * EXPOE `refresh`. Publicar pelo painel nao muda esta tabela (so o servidor
 * confirma o "1"), mas a tela precisa de reler depois de publicar, senao o
 * aviso continua a dizer "responda 1" sobre uma avaliacao que o proprio dono
 * acabou de responder por aqui. Achado na ronda de correcao 1 de 03/09/2026:
 * o aviso ficava preso na leitura do primeiro carregamento ate a pagina ser
 * recarregada.
 */
export type RespostaAEsperar = {
  id: string;
  reviewId: string;
  rascunho: string;
  expiraEm: string;
};

export const useRespostaAEsperar = (userId?: string) => {
  const [aEsperar, setAEsperar] = useState<RespostaAEsperar | null>(null);
  // Numera cada busca: so o resultado da busca mais recente e aplicado.
  // Precisa disto porque agora ha duas maneiras de disparar uma busca (o
  // efeito de montagem e o `refresh` manual), e podem responder fora de
  // ordem — sem o numero, a busca mais lenta apagaria o resultado da mais
  // rapida, mesmo sendo mais velha.
  const geracaoRef = useRef(0);

  const buscar = useCallback(async () => {
    const minhaGeracao = ++geracaoRef.current;
    if (!userId) {
      setAEsperar(null);
      return;
    }
    const { data } = await supabase
      .from('respostas_a_confirmar')
      .select('id, review_id, rascunho, expira_em')
      .eq('user_id', userId)
      .is('confirmado_em', null)
      .is('recusado_em', null)
      .gt('expira_em', new Date().toISOString())
      .maybeSingle();
    // Uma busca mais nova ja comecou entretanto; esta perdeu a corrida.
    if (minhaGeracao !== geracaoRef.current) return;
    setAEsperar(data ? {
      id: data.id,
      reviewId: data.review_id,
      rascunho: data.rascunho,
      expiraEm: data.expira_em,
    } : null);
  }, [userId]);

  useEffect(() => {
    void buscar();
    // Invalida qualquer busca ainda a caminho ao desmontar, ou quando o
    // dono muda (o `buscar` de cima e recriado com o `userId` novo).
    return () => { geracaoRef.current += 1; };
  }, [buscar]);

  return { aEsperar, refresh: buscar };
};
