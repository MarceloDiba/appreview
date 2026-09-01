import { supabase } from '@/integrations/supabase/client';
import type { EntradaDoRascunho } from '@/lib/rascunhoDoModelo';

/**
 * A viagem até `supabase/functions/sugerir-resposta`, e mais nada.
 *
 * A política de quando pedir, quantas vezes pedir e o que mostrar enquanto não
 * chega vive em `src/lib/rascunhoDoModelo.ts`, que não sabe que existe rede.
 * Aqui só se sabe falar com a função. A separação existe para a política poder
 * ser provada sem navegador, sem sessão e sem gastar chamada.
 *
 * O CONTRATO COM A FUNÇÃO
 *
 * Ela devolve `{ rascunho }` quando o modelo respondeu E o texto passou pelas
 * verificações dela, que dependem do canal: sem travessão e sem revelar
 * automação nos dois, sem promessa de reparação no público, sem troca por
 * avaliação no privado. Em qualquer outro caso devolve um objeto com
 * `code` e um estado HTTP fora do 2xx, que o cliente do Supabase entrega como
 * `error`.
 *
 * POR QUE TODA FALHA VIRA A MESMA EXCEÇÃO
 *
 * Para quem chama, os códigos não são escolhas diferentes: `SEM_CHAVE`,
 * `MODELO_RECUSOU`, `RASCUNHO_RECUSADO` e um cabo de rede desligado levam
 * exatamente à mesma tela, que é o texto padrão. Distinguir aqui seria dar a
 * `rascunhoDoModelo` uma decisão que ele não tem. O código continua a chegar ao
 * console para quem for depurar, e não à tela do dono.
 */
export const pedirRascunhoAoBinno = async (entrada: EntradaDoRascunho): Promise<string> => {
  const { data, error } = await supabase.functions.invoke('sugerir-resposta', {
    body: {
      comment: entrada.comment,
      rating: entrada.rating,
      businessName: entrada.businessName,
      // O canal escolhe, do lado da função, qual pedido é feito ao modelo e
      // qual lista de recusas é aplicada ao que ele devolver. Sem esta linha
      // tudo o resto está certo e o painel continua a pedir sempre em público,
      // que é o defeito mais silencioso possível: o recado privado chegaria
      // proibido de oferecer o que o dono quer oferecer.
      channel: entrada.channel,
      customerName: entrada.customerName,
    },
  });

  if (error) {
    console.warn('sugerir-resposta: rascunho automático indisponível', error);
    throw error;
  }

  const rascunho = typeof (data as { rascunho?: unknown } | null)?.rascunho === 'string'
    ? ((data as { rascunho: string }).rascunho).trim()
    : '';
  // Vazio não é rascunho. Devolver a string vazia deixaria a caixa do dono em
  // branco, que é a regra 1 quebrada pelo caminho mais silencioso possível.
  if (!rascunho) throw new Error('SEM_RASCUNHO');
  return rascunho;
};
