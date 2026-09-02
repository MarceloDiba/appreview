import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

/**
 * Entrega por e-mail o que esta na fila para o canal 'email'.
 *
 * POR QUE ESTE CANAL EXISTE
 *
 * Marcelo perguntou em 02/09/2026 se deixar o cliente escolher o canal
 * compensava pela economia. A economia e real e pequena — cerca de 35 mensagens
 * por mes por cliente, algo entre R$ 2 e R$ 8, contra uma mensalidade de R$ 150.
 * Nao e ai que esta o valor.
 *
 * O valor esta em tres coisas:
 *
 *   O e-mail FUNCIONA JA. O WhatsApp oficial esta por aprovar, o caminho actual
 *   viola os termos da Meta, e o numero do piloto foi bloqueado em 31/08. O
 *   e-mail e o unico canal que serve qualquer cliente hoje, sem esperar por
 *   ninguem.
 *
 *   E o formato certo para um RELATORIO: as barras por nota, os temas e a
 *   comparacao da semana nao cabem numa mensagem de telemovel sem virar um
 *   bloco de texto.
 *
 *   Aviso urgente e resumo semanal nao sao a mesma coisa. Um comentario de uma
 *   estrela tem de chegar em minutos ao canal que o dono abre; o resumo de
 *   segunda le-se ao cafe. Por isso este canal so leva o resumo, e os avisos
 *   continuam a seguir `canal_do_aviso`.
 *
 * O QUE ELA NAO FAZ
 *
 * Nao decide o que enviar, nao escreve mensagem, nao escolhe o destinatario.
 * Tudo isso ja foi decidido pelo materializador e esta escrito na linha da fila.
 * Esta funcao pega no que ja foi decidido e entrega — a mesma divisao que o
 * `telegram-dispatch` respeita.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-binno-worker-secret',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

/**
 * O Resend devolve um identificador quando ACEITA a mensagem, e nada mais: a
 * entrega na caixa de entrada acontece depois e chega por webhook, que ainda
 * nao existe. Por isso o estado maximo aqui e `accepted`, nunca `delivered` —
 * a mesma honestidade que o canal do Telegram ja pratica.
 */
const ESTADO_MAXIMO = 'accepted';

/**
 * De quem o relatorio vem.
 *
 * Fica em variavel de ambiente porque o dominio verificado no Resend pode mudar
 * sem que o codigo mude, e porque um remetente errado nao falha: e ACEITE e vai
 * para o spam, que e a falha mais cara de descobrir. O padrao aponta para o
 * dominio da casa.
 */
const REMETENTE_PADRAO = 'Binno <relatorio@binno.pro>';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const segredoEsperado = Deno.env.get('BINNO_WORKER_SECRET');
  if (!segredoEsperado || request.headers.get('x-binno-worker-secret') !== segredoEsperado) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const chaveDoResend = Deno.env.get('RESEND_API_KEY') || '';
  if (!supabaseUrl || !serviceRoleKey) return json({ error: 'Server configuration missing' }, 500);

  /**
   * SEM CHAVE, A FILA ESPERA — E NAO FALHA.
   *
   * Enquanto a conta do Resend nao estiver criada, esta funcao recusa-se a
   * correr e devolve o motivo com nome. As linhas ficam em `queued`: quando a
   * chave chegar, o relatorio da semana sai, com atraso mas inteiro. Marcar
   * `failed` aqui apagaria relatorios por uma configuracao que falta, e o dono
   * nunca saberia que existiram.
   *
   * A reserva das linhas so acontece DEPOIS desta verificacao, de proposito:
   * reservar primeiro poria as linhas em `sending` sem ninguem para as enviar,
   * e elas ficariam presas nesse estado para sempre.
   */
  if (!chaveDoResend) {
    return json({ code: 'RESEND_SEM_CHAVE', error: 'O canal de e-mail ainda nao esta configurado.' }, 503);
  }
  const remetente = Deno.env.get('RESEND_FROM') || REMETENTE_PADRAO;

  const admin = createClient(supabaseUrl, serviceRoleKey);

  const { data: pendentes, error: erroDaReserva } = await admin
    .rpc('claim_whatsapp_outbox_por_canal', { p_provider: 'email', batch_size: 10 });
  if (erroDaReserva) return json({ error: erroDaReserva.message }, 500);

  const resultados: Array<Record<string, unknown>> = [];

  for (const linha of (pendentes || []) as Array<Record<string, unknown>>) {
    const destino = (linha.recipient_email as string | null | undefined)?.trim();
    const corpo = linha.body as string;
    const html = (linha.body_html as string | null | undefined) || null;
    const assunto = ((linha.subject as string | null | undefined) || '').trim() || 'Sua semana no Google';

    if (!destino) {
      await admin.from('whatsapp_outbox').update({
        status: 'failed', last_error_code: 'EMAIL_SEM_DESTINO', updated_at: new Date().toISOString(),
      }).eq('id', linha.id as string);
      resultados.push({ id: linha.id, estado: 'sem-destino' });
      continue;
    }

    try {
      const resposta = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${chaveDoResend}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: remetente,
          to: [destino],
          subject: assunto,
          // As duas versoes viajam juntas. O leitor escolhe: quem bloqueia HTML
          // ve o texto, e nao um e-mail vazio. E o texto e o MESMO conteudo,
          // porque nasceu do mesmo compositor.
          html: html ?? undefined,
          text: corpo,
        }),
      });
      const corpoDaResposta = await resposta.json().catch(() => ({})) as Record<string, unknown>;

      if (!resposta.ok || typeof corpoDaResposta?.id !== 'string') {
        const detalhe = typeof corpoDaResposta?.message === 'string' ? `: ${corpoDaResposta.message.slice(0, 80)}` : '';
        const codigo = `Resend ${resposta.status}${detalhe}`;
        await admin.from('whatsapp_outbox').update({
          status: 'failed', last_error_code: codigo.slice(0, 120), updated_at: new Date().toISOString(),
        }).eq('id', linha.id as string);
        resultados.push({ id: linha.id, estado: 'falhou', codigo });
        continue;
      }

      await admin.from('whatsapp_outbox').update({
        status: ESTADO_MAXIMO,
        provider_message_id: corpoDaResposta.id,
        updated_at: new Date().toISOString(),
      }).eq('id', linha.id as string);
      resultados.push({ id: linha.id, estado: ESTADO_MAXIMO });
    } catch (erro) {
      await admin.from('whatsapp_outbox').update({
        status: 'failed', last_error_code: 'RESEND_INDISPONIVEL', updated_at: new Date().toISOString(),
      }).eq('id', linha.id as string);
      resultados.push({ id: linha.id, estado: 'falhou', codigo: String(erro).slice(0, 80) });
    }
  }

  return json({ enviados: resultados.length, resultados });
});
