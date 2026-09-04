import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

/**
 * Este dono pode usar o Binno?
 *
 * POR QUE ISTO EXISTE
 *
 * Em 04/09/2026 criei uma conta pelo caminho real do produto, sem pagar nada, e
 * bati em todas as portas. `fetch-google-reviews` CORREU e devolveu os dados de
 * um negocio real, gastando a chave paga do Google Places. Toda porta do Binno
 * perguntava "esta logado?", e nenhuma perguntava "pagou?".
 *
 * QUEM SE VERIFICA E O DONO, E NUNCA QUEM CHAMOU.
 *
 * `sugerir-resposta` tem uma porta de trabalhador, usada pelo cron que oferece
 * rascunhos. Essa porta nao dispensa esta verificacao: um dono sem assinatura
 * nao recebe rascunho nem quando e o servidor a pedir. Passe sempre o id do
 * DONO da avaliacao.
 */
export const temAcesso = async (admin: SupabaseClient, userId: string) => {
  const { data, error } = await admin.rpc('tem_acesso', { p_user_id: userId });
  if (error) {
    /**
     * FALHA-SE ABERTO, DE PROPOSITO.
     *
     * Se a pergunta nao chega ao banco — rede, banco fora, um deploy a meio —,
     * deixa-se passar e regista-se. O pior caso deste lado e uma chamada paga a
     * mais. O pior caso do outro lado e um cliente que PAGOU ficar sem produto
     * por um solucco, sem entender porque e sem ter o que fazer.
     *
     * Quem vier "corrigir" isto para falhar fechado: leia este comentario
     * primeiro, e depois decida.
     */
    console.error('tem_acesso falhou, deixando passar: %s', error.message);
    return true;
  }
  return data === true;
};
