import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { billingConfig, billingReady, createCheckoutSemConta } from '../_shared/billing.ts';

/**
 * Comprar sem ter conta.
 *
 * POR QUE ESTA PORTA EXISTE ABERTA
 *
 * Ate 04/09/2026 o caminho de compra era: clicar no preco, preencher CINCO
 * campos de cadastro, atravessar TRES passos de configuracao, e so entao ver a
 * tela de pagamento. Nove interacoes antes de a pessoa poder pagar R$99.
 *
 * O Marcelo tentou comprar o proprio produto e nao conseguiu. Nas palavras
 * dele: "nao faz sentido eu perder o 'time' ou pedir informacoes pra comprar.
 * O botao deve levar para a pagina de compra quem estiver deslogado. Simples
 * como isso."
 *
 * Entao esta funcao nao pede nada. Nem sessao, nem email, nem pais. Devolve o
 * endereco do Stripe e sai da frente. Quem pede o email e o Stripe, na propria
 * tela de pagamento; o pais vem do endereco de cobranca do cartao.
 *
 * O QUE ELA NAO FAZ, E POR QUE ISSO E SEGURO
 *
 * Nao escreve nada em base de dados, nao aceita valor, preco, moeda nem
 * qualquer campo do pedido: o corpo e ignorado por inteiro. O preco vem do
 * segredo do servidor. Um estranho que chame isto mil vezes cria mil sessoes
 * de pagamento vazias no Stripe — que nao custam nada, nao cobram ninguem e
 * expiram sozinhas. Nao ha aqui superficie para abusar.
 *
 * O unico mercado e o Brasil. Quando houver um segundo, este e o sitio onde a
 * escolha entra — e nao antes, porque decidir mercado sem cliente e adivinhar.
 */

const cabecalhos = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: cabecalhos });

serve(async (pedido) => {
  if (pedido.method === 'OPTIONS') return new Response(null, { headers: cabecalhos });
  if (pedido.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const appUrl = (Deno.env.get('APP_URL') || '').replace(/\/$/, '');
  if (!appUrl) return json({ error: 'Billing origin is not configured.' }, 503);

  const config = billingConfig('br');
  if (!config || !billingReady('br')) return json({ error: 'Billing is not available yet.' }, 503);

  try {
    const sessao = await createCheckoutSemConta(config, { appUrl });
    const url = typeof sessao.url === 'string' ? sessao.url : null;
    if (!url) return json({ error: 'Checkout session has no URL.' }, 502);
    return json({ url });
  } catch (erro) {
    // A mensagem do Stripe pode conter identificadores da conta. Fica no
    // registo do servidor; quem chamou recebe so que nao deu.
    console.error('comprar: falha ao criar a sessao', erro instanceof Error ? erro.message : 'desconhecido');
    return json({ error: 'Could not start checkout.' }, 502);
  }
});
