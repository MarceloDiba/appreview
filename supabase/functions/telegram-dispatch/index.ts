import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

/**
 * Envia pelo Telegram o que esta na fila para o canal 'telegram'.
 *
 * ESTE ARQUIVO ESTEVE FORA DO REPOSITORIO ATE 01/09/2026
 *
 * Ele foi criado direto no servidor em 31/08, na pressa do bloqueio do
 * WhatsApp, e ficou a correr sem ninguem poder le-lo, revisa-lo ou saber que
 * existia. Foi recuperado com `get_edge_function` quando Marcelo pediu para
 * melhorar o texto dos avisos. Codigo implantado e nao versionado e uma divida
 * silenciosa: o proximo a procurar por "quem envia ao Telegram" nao encontrava
 * nada, e concluia que o canal nao existia.
 *
 * POR QUE ESTA FUNCAO EXISTE
 *
 * Em 31/08/2026 o WhatsApp bloqueou o numero do piloto. O caminho oficial da
 * Meta exige verificacao de empresa, numero novo e modelos aprovados um a um, e
 * leva dias ou semanas. O Telegram e a ponte para o produto nao ficar sem canal
 * nenhum nesse intervalo.
 *
 * POR QUE AQUI E NAO NO RETRANSMISSOR DA VPS
 *
 * O OpenWA precisava de uma sessao de navegador viva, e por isso de uma
 * maquina. O Telegram e uma chamada HTTP: nao ha sessao, nao ha QR, nao ha nada
 * para cair.
 *
 * O QUE ELA NAO FAZ
 *
 * Nao decide o que enviar, nao escreve mensagem, nao aplica limite de
 * frequencia. Tudo isso vive no gatilho e na fila, e vale igual para os dois
 * canais. Esta funcao pega o que ja foi decidido, FORMATA para o canal, e
 * entrega.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-binno-worker-secret',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

/**
 * O Telegram nao devolve recibo de leitura nem de entrega para o robo: a
 * resposta do `sendMessage` prova que o Telegram aceitou a mensagem, e nada
 * alem. Por isso o estado maximo aqui e `accepted`, nunca `delivered`.
 */
const ESTADO_MAXIMO = 'accepted';

/**
 * O negrito, sem poder perder a mensagem por causa dele.
 *
 * O corpo e escrito UMA vez, com o negrito do WhatsApp (*assim*), e serve os
 * dois canais: o WhatsApp desenha-o nativamente. O Telegram nao, e ate
 * 01/09/2026 esta funcao mandava texto simples de proposito, com o raciocinio
 * escrito no codigo: com Markdown, um caractere solto no texto de uma avaliacao
 * real quebraria a mensagem inteira. O raciocinio estava certo e a conclusao
 * era cara demais, porque Marcelo lia os asteriscos crus na tela.
 *
 * O que resolve e HTML em vez de Markdown, e por esta ordem:
 *
 *   1. ESCAPAR primeiro. `&`, `<` e `>` viram entidades ANTES de qualquer
 *      marca nossa. Assim um cliente que escreva `<b>` ou `&` na avaliacao dele
 *      nao consegue injectar formatacao nenhuma, e o texto dele sai como ele o
 *      escreveu.
 *   2. So depois converter os nossos asteriscos em `<b>`.
 *   3. Numero IMPAR de asteriscos, ou nenhum, devolve `null`: nao ha par para
 *      fechar, e formatar seria adivinhar. Sem formatacao, texto simples.
 *
 * E a rede de seguranca real nao esta aqui: esta no envio, que repete a
 * mensagem em texto simples se o Telegram recusar a formatada. Nenhum aviso se
 * perde por causa de um asterisco.
 */
export const paraHtmlDoTelegram = (texto: string): string | null => {
  const escapado = texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const marcas = (escapado.match(/\*/g) || []).length;
  if (marcas === 0 || marcas % 2 !== 0) return null;
  const comNegrito = escapado.replace(/\*([^*\n]+)\*/g, '<b>$1</b>');
  // Se sobrou algum asterisco, os pares nao fechavam dentro da mesma linha.
  // Melhor texto simples do que negrito a comecar no sitio errado.
  return comNegrito.includes('*') ? null : comNegrito;
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const segredoEsperado = Deno.env.get('BINNO_WORKER_SECRET');
  if (!segredoEsperado || request.headers.get('x-binno-worker-secret') !== segredoEsperado) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN') || '';
  if (!supabaseUrl || !serviceRoleKey) return json({ error: 'Server configuration missing' }, 500);
  if (!botToken) {
    return json({ code: 'TELEGRAM_SEM_TOKEN', error: 'O canal do Telegram ainda nao esta configurado.' }, 503);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);

  const { data: pendentes, error: erroDaReserva } = await admin
    .rpc('claim_whatsapp_outbox_por_canal', { p_provider: 'telegram', batch_size: 10 });
  if (erroDaReserva) return json({ error: erroDaReserva.message }, 500);

  const resultados: Array<Record<string, unknown>> = [];

  for (const linha of (pendentes || []) as Array<Record<string, unknown>>) {
    const userId = linha.user_id as string;
    const corpo = linha.body as string;

    const { data: pref } = await admin
      .from('whatsapp_notification_preferences')
      .select('telegram_chat_id')
      .eq('user_id', userId)
      .maybeSingle();

    const destino = (pref?.telegram_chat_id as string | null | undefined)?.trim();
    if (!destino) {
      await admin.from('whatsapp_outbox').update({
        status: 'failed', last_error_code: 'TELEGRAM_SEM_DESTINO', updated_at: new Date().toISOString(),
      }).eq('id', linha.id as string);
      resultados.push({ id: linha.id, estado: 'sem-destino' });
      continue;
    }

    const enviar = (texto: string, comFormatacao: boolean) => fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: destino,
        text: texto,
        ...(comFormatacao ? { parse_mode: 'HTML' } : {}),
        disable_web_page_preview: true,
      }),
    });

    try {
      const formatado = paraHtmlDoTelegram(corpo);
      let resposta = await enviar(formatado ?? corpo, formatado !== null);
      let corpoDaResposta = await resposta.json().catch(() => ({}));

      // A REDE DE SEGURANCA. Se a formatacao ofender o Telegram por qualquer
      // razao que nao antecipamos, a mensagem sai na mesma, em texto simples.
      // Um aviso feio chega; um aviso perdido nao.
      if (formatado !== null && (!resposta.ok || corpoDaResposta?.ok !== true)) {
        resposta = await enviar(corpo, false);
        corpoDaResposta = await resposta.json().catch(() => ({}));
      }

      if (!resposta.ok || corpoDaResposta?.ok !== true) {
        const codigo = `Telegram ${resposta.status}${corpoDaResposta?.description ? `: ${String(corpoDaResposta.description).slice(0, 80)}` : ''}`;
        await admin.from('whatsapp_outbox').update({
          status: 'failed', last_error_code: codigo.slice(0, 120), updated_at: new Date().toISOString(),
        }).eq('id', linha.id as string);
        resultados.push({ id: linha.id, estado: 'falhou', codigo });
        continue;
      }

      await admin.from('whatsapp_outbox').update({
        status: ESTADO_MAXIMO,
        provider_message_id: String(corpoDaResposta?.result?.message_id ?? ''),
        updated_at: new Date().toISOString(),
      }).eq('id', linha.id as string);
      resultados.push({ id: linha.id, estado: ESTADO_MAXIMO });
    } catch (erro) {
      await admin.from('whatsapp_outbox').update({
        status: 'failed', last_error_code: 'TELEGRAM_INDISPONIVEL', updated_at: new Date().toISOString(),
      }).eq('id', linha.id as string);
      resultados.push({ id: linha.id, estado: 'falhou', codigo: String(erro).slice(0, 80) });
    }
  }

  return json({ enviados: resultados.length, resultados });
});
