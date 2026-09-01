import { supabase } from '@/integrations/supabase/client';
import type { EntradaDosTemas, TemaDoModelo } from '@/lib/temasDoModelo';

/**
 * A viagem até `supabase/functions/temas-das-avaliacoes`, e mais nada.
 *
 * A política de quando pedir e do que mostrar enquanto não chega vive em
 * `src/lib/temasDoModelo.ts`, que não sabe que existe rede. A separação é a
 * mesma de `sugerirResposta.ts` e existe pela mesma razão: a política pode ser
 * provada sem navegador, sem sessão e sem gastar chamada.
 *
 * Toda falha vira a mesma exceção. Para quem chama, `SEM_CHAVE`,
 * `POUCO_TEXTO`, `MODELO_RECUSOU` e um cabo desligado levam à mesma tela: os
 * temas por palavra-chave, ou a linha honesta. O código continua a chegar ao
 * console para quem depurar, e não à tela do dono.
 */
export const pedirTemasAoBinno = async (entrada: EntradaDosTemas): Promise<TemaDoModelo[]> => {
  const { data, error } = await supabase.functions.invoke('temas-das-avaliacoes', {
    body: {
      reviews: entrada.reviews,
      businessName: entrada.businessName,
      idioma: entrada.idioma,
    },
  });

  if (error) {
    console.warn('temas-das-avaliacoes: agrupamento indisponível', error);
    throw error;
  }

  const temas = (data as { temas?: unknown } | null)?.temas;
  if (!Array.isArray(temas)) throw new Error('SEM_TEMAS');
  return temas as TemaDoModelo[];
};
