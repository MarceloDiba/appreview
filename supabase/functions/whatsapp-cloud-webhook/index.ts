import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

/**
 * O caminho de VOLTA: o Binno passa a escutar.
 *
 * ATE 03/09/2026 O BINNO SO FALAVA. Nao havia webhook nenhum — o produto
 * mandava avisos e nao tinha como saber que alguem respondeu. "Responda 1 para
 * publicar" nao tinha onde aterrar.
 *
 * O QUE ESTA FUNCAO FAZ, E O QUE ELA DELIBERADAMENTE NAO FAZ
 *
 * Ela faz duas coisas e mais nenhuma: anota que o dono escreveu (que e o que
 * abre a janela de 24 horas para texto livre) e marca a confirmacao quando o
 * que ele escreveu e um "1".
 *
 * Ela NAO publica no Google. A Meta espera resposta em milissegundos e volta a
 * tentar se demorar — e uma chamada ao Google demora mais do que isso. Um
 * webhook lento vira mensagens repetidas, e mensagens repetidas viram respostas
 * publicadas duas vezes no perfil de um cliente. Publicar e trabalho do
 * drenador, que tem tempo.
 *
 * SEGURANCA: ESTE ENDERECO E PUBLICO
 *
 * A Meta chama-o sem sessao, entao `verify_jwt` esta desligado e qualquer pessoa
 * na internet lhe pode bater. Duas trancas:
 *
 *   O `hub.verify_token` no GET, que e como a Meta prova que o registo do
 *   webhook e nosso.
 *
 *   A assinatura `X-Hub-Signature-256` no POST, que prova que o corpo veio
 *   mesmo da Meta e nao de alguem que descobriu o endereco. Sem ela, qualquer
 *   pessoa podia enviar um "1" em nome de um dono e publicar um rascunho no
 *   perfil publico dele.
 */

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/**
 * Confere a assinatura da Meta em tempo constante.
 *
 * Comparar com `===` deixaria escapar o tempo de comparacao, e o tempo diz
 * quantos caracteres iniciais estao certos — o suficiente para adivinhar a
 * assinatura byte a byte. `timingSafeEqual` nao existe no Deno padrao, entao a
 * comparacao e feita com OR acumulado, que percorre sempre o comprimento todo.
 */
const assinaturaConfere = async (corpo: string, cabecalho: string | null, segredo: string) => {
  if (!cabecalho?.startsWith('sha256=')) return false;
  const chave = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(segredo),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const assinado = await crypto.subtle.sign('HMAC', chave, new TextEncoder().encode(corpo));
  const esperado = Array.from(new Uint8Array(assinado))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
  const recebido = cabecalho.slice('sha256='.length);
  if (recebido.length !== esperado.length) return false;
  let diferenca = 0;
  for (let i = 0; i < esperado.length; i += 1) {
    diferenca |= esperado.charCodeAt(i) ^ recebido.charCodeAt(i);
  }
  return diferenca === 0;
};

/**
 * O que conta como "sim".
 *
 * "1" e o que a mensagem pede, mas quem le no telemovel responde o que lhe sai.
 * Aceitar so "1" faria o produto ignorar uma pessoa que claramente disse sim, e
 * essa pessoa concluiria que o Binno nao funciona. Aceitar QUALQUER COISA seria
 * pior: publicaria no perfil publico dela por engano.
 *
 * A lista e curta e literal de proposito. Nada de "parece um sim".
 */
const CONFIRMACOES = ['1', 'sim', 'ok', 'okay', 'publicar', 'pode', 'publica', 'yes', 'y'];

const ehConfirmacao = (texto: string) => {
  const limpo = texto.trim().toLowerCase().replace(/[.!]+$/, '');
  return CONFIRMACOES.includes(limpo);
};

Deno.serve(async (request) => {
  const verifyToken = Deno.env.get('WHATSAPP_WEBHOOK_VERIFY_TOKEN') || '';
  const appSecret = Deno.env.get('WHATSAPP_APP_SECRET') || '';
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

  // O aperto de mao do registo. A Meta chama uma vez, com o token que o Marcelo
  // escreveu no painel dela, e espera de volta o `challenge` em texto puro.
  if (request.method === 'GET') {
    const url = new URL(request.url);
    if (!verifyToken) {
      console.error('Webhook do WhatsApp: WHATSAPP_WEBHOOK_VERIFY_TOKEN nao configurado');
      return new Response('not configured', { status: 503 });
    }
    if (url.searchParams.get('hub.mode') === 'subscribe'
      && url.searchParams.get('hub.verify_token') === verifyToken) {
      return new Response(url.searchParams.get('hub.challenge') || '', { status: 200 });
    }
    console.error('Webhook do WhatsApp: verificacao recusada (token nao confere)');
    return new Response('forbidden', { status: 403 });
  }

  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  if (!supabaseUrl || !serviceRoleKey) return json({ error: 'Server configuration missing' }, 500);

  const corpo = await request.text();

  if (!appSecret) {
    console.error('Webhook do WhatsApp: WHATSAPP_APP_SECRET nao configurado, pedido recusado');
    return json({ error: 'not configured' }, 503);
  }
  if (!await assinaturaConfere(corpo, request.headers.get('x-hub-signature-256'), appSecret)) {
    console.error('Webhook do WhatsApp: assinatura invalida');
    return json({ error: 'invalid signature' }, 401);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);

  let evento: Record<string, unknown>;
  try {
    evento = JSON.parse(corpo);
  } catch {
    console.error('Webhook do WhatsApp: corpo nao e JSON');
    return json({ recebido: true });
  }

  const mensagens: Array<{ from?: string; text?: { body?: string }; type?: string }> = [];
  for (const entrada of ((evento.entry || []) as Array<Record<string, unknown>>)) {
    for (const mudanca of ((entrada.changes || []) as Array<Record<string, unknown>>)) {
      const valor = (mudanca.value || {}) as Record<string, unknown>;
      mensagens.push(...((valor.messages || []) as typeof mensagens));
    }
  }

  for (const mensagem of mensagens) {
    const de = mensagem.from?.replace(/\D/g, '');
    if (!de) continue;

    // Do numero para o dono. A Meta manda so digitos; a preferencia guarda com
    // `+`. Comparar os digitos dos dois lados evita depender do formato.
    const { data: donos } = await admin
      .from('whatsapp_notification_preferences')
      .select('user_id, recipient_e164');
    const dono = (donos || []).find((linha) =>
      (linha.recipient_e164 || '').replace(/\D/g, '') === de);

    if (!dono) {
      console.error('Webhook do WhatsApp: mensagem de um numero que nao e de nenhum dono');
      continue;
    }

    // A JANELA ABRE AQUI, e abre para qualquer mensagem — nao so para um "1".
    // E o facto de a pessoa ter escrito que a Meta considera, e e isso que
    // permite ao Binno mandar texto livre nas proximas 24 horas.
    await admin.from('whatsapp_notification_preferences')
      .update({ ultima_mensagem_recebida_em: new Date().toISOString() })
      .eq('user_id', dono.user_id);

    const texto = mensagem.text?.body || '';
    if (mensagem.type !== 'text' || !ehConfirmacao(texto)) continue;

    const { data: confirmada, error } = await admin
      .rpc('confirmar_resposta_do_dono', { p_user_id: dono.user_id });
    if (error) {
      console.error('Webhook do WhatsApp: falha ao confirmar a resposta: %s', error.message);
      continue;
    }
    if (!confirmada) {
      console.error('Webhook do WhatsApp: "%s" recebido sem nada a espera de confirmacao', texto.slice(0, 20));
      continue;
    }
    console.error('Webhook do WhatsApp: resposta %s confirmada pelo dono', confirmada);
  }

  // SEMPRE 200. A Meta volta a tentar quando recebe outra coisa, e uma nova
  // tentativa do mesmo evento significaria confirmar duas vezes. O que corre
  // mal fica no log, nao no codigo de estado.
  return json({ recebido: true });
});
