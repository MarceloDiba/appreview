import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

/**
 * Entrega pelo WhatsApp oficial da Meta o que esta na fila para 'meta-cloud'.
 *
 * POR QUE ESTE CANAL SUBSTITUI O OPENWA
 *
 * O OpenWA simulava o WhatsApp Web a partir de uma VPS. Funcionava ate deixar
 * de funcionar: em 31/08/2026 a Meta bloqueou o numero do piloto por padrao de
 * envio automatizado, e o produto ficou sem canal nenhum durante uma tarde. O
 * Telegram foi a ponte de emergencia.
 *
 * O numero novo esta registado na Cloud API. O bloqueio deixa de ser um risco
 * que se corre e passa a ser uma regra que se cumpre.
 *
 * A REGRA QUE MUDA TUDO: A JANELA DE 24 HORAS
 *
 * O OpenWA mandava o que quisesse, quando quisesse. A Cloud API nao:
 *
 *   Uma mensagem que ABRE conversa exige um MODELO aprovado pela Meta, com
 *   variaveis fixas. Aprovacao demora horas e o texto nao muda depois.
 *
 *   Texto livre so dentro de 24 horas desde a ultima mensagem do dono.
 *
 * Isto nao e um detalhe de implementacao — muda o produto. O rascunho de uma
 * resposta e texto que muda a cada avaliacao e nao cabe num modelo. Por isso o
 * aviso fora da janela e um modelo curto que CHAMA o dono, e o rascunho
 * completo so vai quando ele responde e abre a janela.
 *
 * O QUE ELA NAO FAZ
 *
 * Nao decide o que enviar nem escreve mensagem. Isso vive no gatilho e na fila,
 * e vale igual para os quatro canais. Esta funcao pega no que ja foi decidido,
 * escolhe a FORMA que a Meta aceita naquele momento, e entrega.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-binno-worker-secret',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

/**
 * A Meta aceita a mensagem e a entrega acontece depois, com recibo por webhook.
 * `accepted` e o maximo honesto aqui, tal como no Telegram e no e-mail.
 */
const ESTADO_MAXIMO = 'accepted';

const VERSAO_DA_API = 'v21.0';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const segredoEsperado = Deno.env.get('BINNO_WORKER_SECRET');
  if (!segredoEsperado || request.headers.get('x-binno-worker-secret') !== segredoEsperado) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const token = Deno.env.get('WHATSAPP_CLOUD_API_TOKEN') || '';
  const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID') || '';
  if (!supabaseUrl || !serviceRoleKey) return json({ error: 'Server configuration missing' }, 500);

  /**
   * SEM CHAVE, A FILA ESPERA — E NAO FALHA.
   *
   * Enquanto o token nao existir, as linhas ficam em `queued` e saem quando ele
   * chegar. Marcar `failed` apagaria avisos por uma configuracao que falta, e o
   * dono nunca saberia que existiram. A reserva so acontece DEPOIS desta
   * verificacao: reservar primeiro deixaria as linhas presas em `sending` sem
   * ninguem para as enviar.
   */
  if (!token || !phoneNumberId) {
    return json({ code: 'WHATSAPP_CLOUD_SEM_CHAVE', error: 'O WhatsApp oficial ainda nao esta configurado.' }, 503);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);

  const { data: pendentes, error: erroDaReserva } = await admin
    .rpc('claim_whatsapp_outbox_por_canal', { p_provider: 'meta-cloud', batch_size: 10 });
  if (erroDaReserva) return json({ error: erroDaReserva.message }, 500);

  const resultados: Array<Record<string, unknown>> = [];

  for (const linha of (pendentes || []) as Array<Record<string, unknown>>) {
    const destino = (linha.recipient_e164 as string | null | undefined)?.replace(/\D/g, '');
    const corpo = linha.body as string;
    const modelo = (linha.template_name as string | null | undefined) || null;
    const variaveis = (linha.template_variables as string[] | null | undefined) || [];

    if (!destino) {
      await admin.from('whatsapp_outbox').update({
        status: 'failed', last_error_code: 'WHATSAPP_SEM_DESTINO', updated_at: new Date().toISOString(),
      }).eq('id', linha.id as string);
      resultados.push({ id: linha.id, estado: 'sem-destino' });
      continue;
    }

    // A JANELA DECIDE A FORMA, e nao quem enfileirou. Entre o momento em que a
    // mensagem entrou na fila e o momento em que sai, o dono pode ter escrito —
    // e ai o texto completo passa a ser possivel. Perguntar aqui, e nao la
    // atras, e o que aproveita essa janela.
    const { data: janelaAberta } = await admin
      .rpc('janela_de_texto_livre_aberta', { p_user_id: linha.user_id as string });

    /*
     * DENTRO DA JANELA, TEXTO LIVRE PERDIA O BOTAO — e o botao E a promessa.
     *
     * Marcelo apanhou-o em 05/09/2026: recebeu o rascunho completo e sem nada
     * para tocar. A janela dele estava aberta por VINTE E QUATRO MINUTOS.
     *
     * O defeito era a escolha ser binaria. Fora da janela ia o modelo, curto e
     * COM botao; dentro ia texto livre, completo e SEM. E o texto livre ganhava
     * sempre que o dono tivesse escrito nas ultimas 24 horas — ou seja, o dono
     * MAIS activo era o que perdia o clique. Ao contrario do que se quer.
     *
     * A Cloud API tem uma terceira forma que ninguem estava a usar: `interactive`
     * com botoes de resposta, permitida dentro da janela, que leva o corpo
     * inteiro E o botao. O limite dela e 1024 caracteres no corpo, contra 4096
     * do texto simples — por isso o texto simples continua a existir, para o
     * rascunho que nao couber. Perder o botao e mau; cortar a resposta do dono a
     * meio e pior.
     *
     * SO PARA O RASCUNHO. Um aviso que nao pede aprovacao nenhuma nao pode
     * ganhar um botao "Publicar no Google" — seria oferecer publicar uma coisa
     * que nao existe. Por isso a condicao olha o modelo, que e o que distingue
     * um rascunho a espera de um aviso qualquer.
     */
    const ehRascunho = modelo === 'binno_rascunho_de_resposta';
    const cabeNoInteractivo = corpo.length <= 1024;

    let mensagem: Record<string, unknown>;
    if (janelaAberta && ehRascunho && cabeNoInteractivo) {
      mensagem = {
        type: 'interactive',
        interactive: {
          type: 'button',
          body: { text: corpo },
          action: {
            buttons: [{
              type: 'reply',
              // O `id` e o que o webhook le primeiro, e esta na lista de
              // confirmacoes; o titulo bate com o do modelo aprovado, para o
              // dono ver sempre o mesmo rotulo venha por onde vier.
              reply: { id: 'publicar', title: 'Publicar no Google' },
            }],
          },
        },
      };
    } else if (janelaAberta || !modelo) {
      mensagem = { type: 'text', text: { body: corpo, preview_url: false } };
    } else {
      mensagem = {
        type: 'template',
        template: {
          name: modelo,
          language: { code: 'pt_BR' },
          components: variaveis.length
            ? [{ type: 'body', parameters: variaveis.map((valor) => ({ type: 'text', text: String(valor) })) }]
            : [],
        },
      };
    }

    try {
      const resposta = await fetch(`https://graph.facebook.com/${VERSAO_DA_API}/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ messaging_product: 'whatsapp', to: destino, ...mensagem }),
      });
      const corpoDaResposta = await resposta.json().catch(() => ({})) as Record<string, unknown>;

      if (!resposta.ok) {
        const erro = (corpoDaResposta.error || {}) as { message?: string; code?: number };
        // O codigo da Meta e o que distingue "modelo por aprovar" de "numero
        // invalido" de "token expirado" — consertos completamente diferentes.
        const codigo = `Meta ${resposta.status}/${erro.code ?? '?'}${erro.message ? `: ${erro.message.slice(0, 70)}` : ''}`;
        console.error('Meta recusou o envio: %s', codigo);
        await admin.from('whatsapp_outbox').update({
          status: 'failed', last_error_code: codigo.slice(0, 120), updated_at: new Date().toISOString(),
        }).eq('id', linha.id as string);
        resultados.push({ id: linha.id, estado: 'falhou', codigo });
        continue;
      }

      const idDaMensagem = ((corpoDaResposta.messages as Array<{ id?: string }> | undefined)?.[0]?.id) || '';
      await admin.from('whatsapp_outbox').update({
        status: ESTADO_MAXIMO,
        provider_message_id: idDaMensagem,
        /*
         * O QUE CUSTOU, marcado por quem sabe.
         *
         * A Meta nao cobra mensagem de servico — texto livre dentro da janela
         * de 24 horas. Cobra o modelo aprovado, que e o unico que passa fora
         * dela. Quem decide a forma e este envio, na hora, porque so aqui se
         * sabe se a janela ainda estava aberta.
         *
         * `cabe_mais_um_aviso` le esta coluna para travar o que custa sem
         * travar o que e gratuito. Sem ela, o teto diario ou nao existe ou cala
         * o produto de graca.
         */
        cobravel: mensagem.type === 'template',
        updated_at: new Date().toISOString(),
      }).eq('id', linha.id as string);
      resultados.push({ id: linha.id, estado: ESTADO_MAXIMO, forma: mensagem.type });
    } catch (erro) {
      await admin.from('whatsapp_outbox').update({
        status: 'failed', last_error_code: 'META_INDISPONIVEL', updated_at: new Date().toISOString(),
      }).eq('id', linha.id as string);
      resultados.push({ id: linha.id, estado: 'falhou', codigo: String(erro).slice(0, 80) });
    }
  }

  return json({ enviados: resultados.length, resultados });
});
