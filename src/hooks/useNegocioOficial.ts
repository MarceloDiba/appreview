import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * O negocio do Google que a ligacao oficial escolheu, se houver.
 *
 * POR QUE ISTO EXISTE
 *
 * Ate 04/09/2026 as Configuracoes pediam ao dono que colasse o link da pagina
 * dele no Google — depois de ele ja ter ligado a conta, que devolve o mesmo
 * identificador vindo do proprio Google. Marcelo reparou duas vezes.
 *
 * O banco ja resolve o essencial: `get_public_qr_business` usa este `place_id`
 * quando nao ha link colado, entao o QR de um cliente novo funciona sem ele
 * colar nada. Isto aqui e para a TELA parar de pedir.
 */
export type NegocioOficial = { titulo: string; placeId: string } | null;

export const useNegocioOficial = (userId?: string) => {
  const [negocio, setNegocio] = useState<NegocioOficial>(null);
  const [lido, setLido] = useState(false);

  useEffect(() => {
    if (!userId) { setNegocio(null); setLido(true); return; }
    let activo = true;
    void supabase
      .from('google_business_locations')
      .select('title, place_id')
      .eq('user_id', userId)
      .eq('is_selected', true)
      .maybeSingle()
      .then(({ data }) => {
        if (!activo) return;
        // Sem `place_id` nao ha o que derivar: a ligacao existe mas nao sabe
        // para onde mandar o cliente, e dizer o contrario seria mentir.
        setNegocio(data?.place_id ? { titulo: data.title || '', placeId: data.place_id } : null);
        setLido(true);
      });
    return () => { activo = false; };
  }, [userId]);

  return { negocio, lido };
};
