import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

/**
 * Liga um pagamento ja feito a conta que a pessoa acabou de criar.
 *
 * Chamada pela tela `/bem-vindo`, logo depois de a pessoa se autenticar. O
 * `bilhete` e o identificador da sessao do Stripe, que veio no endereco de
 * retorno.
 *
 * DUAS VIAS, PORQUE UMA SO FALHA:
 *   com bilhete  — quem acabou de voltar do Stripe. Vale mesmo que tenha
 *                  criado a conta com um email diferente do que deu la.
 *   sem bilhete  — quem perdeu o endereco de retorno e voltou ao site depois.
 *                  A funcao procura pelo email da conta.
 *
 * O bilhete NAO e segredo: viaja num endereco que o navegador da pessoa
 * mostra. Por isso quem decide de quem e a compra e a SESSAO de quem chama, e
 * nunca o bilhete sozinho — sem isto, quem visse o endereco por cima do ombro
 * reclamaria a compra de outra pessoa.
 */

const cabecalhos = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};
const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: cabecalhos });

/**
 * So a forma que o Stripe emite. Recusar o resto aqui poupa a base de dados de
 * receber o que um estranho quiser escrever no endereco.
 */
const bilheteDoPedido = async (pedido: Request): Promise<string | null> => {
  try {
    const corpo = await pedido.json();
    const cru = typeof corpo?.bilhete === 'string' ? corpo.bilhete.trim() : '';
    return /^cs_(live|test)_[A-Za-z0-9_]{10,200}$/.test(cru) ? cru : null;
  } catch {
    return null;
  }
};

/** Quem esta a chamar, segundo a sessao — e nunca segundo o que o corpo diz. */
const quemChama = async (pedido: Request, url: string, anonKey: string) => {
  const autorizacao = pedido.headers.get('Authorization');
  if (!autorizacao) return null;
  const chamador = createClient(url, anonKey, { global: { headers: { Authorization: autorizacao } } });
  const { data: { user }, error } = await chamador.auth.getUser();
  return error || !user ? null : user;
};

serve(async (pedido) => {
  if (pedido.method === 'OPTIONS') return new Response(null, { headers: cabecalhos });
  if (pedido.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const url = Deno.env.get('SUPABASE_URL') || '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (!url || !anonKey || !serviceRoleKey) return json({ error: 'Server configuration missing' }, 500);

  const user = await quemChama(pedido, url, anonKey);
  if (!user) return json({ error: 'Invalid session' }, 401);

  const admin = createClient(url, serviceRoleKey);
  const { data: reclamada, error } = await admin.rpc('reclamar_compra', {
    p_user_id: user.id,
    p_email: user.email ?? null,
    p_bilhete: await bilheteDoPedido(pedido),
  });
  if (error) {
    console.error('reclamar-compra falhou: %s', error.message);
    return json({ error: 'Could not claim purchase.' }, 500);
  }
  return json({ reclamada: Boolean(reclamada) });
});
