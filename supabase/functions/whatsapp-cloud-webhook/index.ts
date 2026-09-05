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
 * Ela faz tres coisas: anota que o dono escreveu (que e o que abre a janela de
 * 24 horas para texto livre), marca a confirmacao quando o que ele escreveu e
 * um "1", e ANOTA OS RECIBOS DE ENTREGA que a Meta manda em `value.statuses`.
 *
 * O TERCEIRO CHEGOU TARDE, e a falta dele era uma regressao. Ate 05/09/2026
 * esta funcao lia apenas `value.messages`. Consequencia medida pela sessao de
 * QA: no canal oficial o `whatsapp_outbox` nunca passava de `accepted` —
 * 3 aceites, 0 entregues, 0 lidos — enquanto o OpenWA, ja morto, registava
 * `delivered`. O produto nao sabia distinguir "a Meta aceitou a mensagem" de
 * "a mensagem chegou ao telemovel do dono".
 *
 * Isso corroia uma promessa do contrato. `ESTADOS_QUE_PROVAM_ENTREGA` diz que
 * a tela so afirma ligacao ativa com `accepted`, `delivered` ou `read`; sem
 * recibos, `accepted` era o unico estado alcancavel, e `accepted` prova apenas
 * que a Meta recebeu o pedido. O contrato ja registava isto como risco
 * residual — sem os recibos deixava de ser residual e passava a ser o unico
 * estado possivel.
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
/*
 * O QUE CONTA COMO "SIM".
 *
 * Duas formas chegam aqui, porque duas formas saem daqui:
 *
 *   DENTRO da janela de 24 horas sai texto livre, e o dono escreve "1". Sao
 *   dois toques — digitar e enviar.
 *
 *   FORA da janela sai o modelo aprovado, que leva um BOTAO de resposta rapida.
 *   Um toque. Marcelo apanhou isto em 04/09/2026, a ler o proprio produto: "o
 *   botao e 1 toque, digitar 1 e enviar sao 2". Para um produto que promete um
 *   clique, o botao E a promessa.
 *
 * O botao devolve o TEXTO DELE, e nao "1" — por isso "Publicar no Google" tem
 * de estar nesta lista, e tem de bater com o que esta escrito no modelo da
 * Meta. Se alguem renomear o botao la e nao aqui, o dono carrega e nao acontece
 * nada: o pior sintoma possivel, porque parece que o produto ignorou.
 */
const CONFIRMACOES = [
  '1', 'sim', 'ok', 'okay', 'publicar', 'pode', 'publica', 'yes', 'y',
  // O texto exacto do botao do modelo `binno_rascunho_de_resposta`.
  'publicar no google',
];

const ehConfirmacao = (texto: string) => {
  const limpo = texto.trim().toLowerCase().replace(/[.!]+$/, '');
  return CONFIRMACOES.includes(limpo);
};

/**
 * Regista que houve uma batida, e o que se decidiu sobre ela.
 *
 * POR QUE ISTO EXISTE: em 04/09/2026 o dono respondeu no WhatsApp e nada
 * chegou. Havia duas causas possiveis, com accoes opostas — a Meta nao
 * entregou, ou entregou e nos recusamos a assinatura — e os registos das
 * funcoes do Supabase estavam fora do ar. Sem instrumentacao na fronteira, as
 * duas hipoteses sao indistinguiveis: o sintoma e o mesmo.
 *
 * NAO GUARDA O CORPO nem cabecalho nenhum. Guarda que bateram, o que decidimos,
 * e porque. E o suficiente para separar as causas, e nao mais do que isso.
 *
 * Nunca derruba o pedido: um diagnostico que falha nao pode virar o erro que
 * se esta a diagnosticar.
 */
const registarBatida = async (resultado: string, detalhe?: string) => {
  try {
    const url = Deno.env.get('SUPABASE_URL') || '';
    const chave = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    if (!url || !chave) return;
    await fetch(`${url}/rest/v1/whatsapp_webhook_batidas`, {
      method: 'POST',
      headers: {
        apikey: chave,
        Authorization: `Bearer ${chave}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ metodo: 'POST', resultado, detalhe: detalhe || null }),
    });
  } catch (erro) {
    console.error('Nao consegui registar a batida no webhook: %s', erro);
  }
};

/**
 * Diz se dois numeros sao a mesma pessoa, e por que regra.
 *
 * O PROBLEMA E BRASILEIRO. Um telemovel no Brasil e `55` + DDD (2 digitos) + 9
 * digitos, e o primeiro desses nove e um `9` que foi acrescentado a numeracao
 * antiga. A Meta guarda e devolve muitos numeros brasileiros SEM esse `9`, e
 * as duas formas sao a mesma linha.
 *
 * Isto nao e teoria: em 04/09/2026 o proprio numero do Binno apareceu no painel
 * da Meta como `+55 79 9198-6091` enquanto o handoff dizia `+55 79 99198-6091`.
 * O dono nao conseguia mandar mensagem porque estava a marcar um numero que nao
 * existe, e a resposta dele nao era reconhecida pela mesma razao, do outro lado.
 *
 * Compara so digitos, e devolve QUAL regra casou — porque "casou por sorte" e
 * "casou exactamente" pedem confianca diferente de quem le o diagnostico.
 */
/**
 * A forma antiga de um numero brasileiro: a mesma linha, sem o nono digito.
 *
 * Devolve `null` para tudo o que nao seja um telemovel brasileiro com os 13
 * digitos completos. Fora do Brasil, tirar um digito nao devolve outra forma do
 * mesmo numero — devolve o numero de outra pessoa.
 */
const semONonoDigito = (numero: string): string | null =>
  numero.length === 13 && numero.startsWith('55') && numero[4] === '9'
    ? numero.slice(0, 4) + numero.slice(5)
    : null;

const mesmaLinha = (guardado: string, recebido: string): 'exato' | 'nono-digito' | null => {
  const a = (guardado || '').replace(/\D/g, '');
  const b = (recebido || '').replace(/\D/g, '');
  if (!a || !b) return null;
  if (a === b) return 'exato';
  // Nos dois sentidos: tanto faz de que lado veio a forma longa.
  if (semONonoDigito(a) === b) return 'nono-digito';
  if (semONonoDigito(b) === a) return 'nono-digito';
  return null;
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
    await registarBatida('sem-app-secret');
    return json({ error: 'not configured' }, 503);
  }
  if (!await assinaturaConfere(corpo, request.headers.get('x-hub-signature-256'), appSecret)) {
    console.error('Webhook do WhatsApp: assinatura invalida');
    // Distingue "veio sem assinatura" de "veio com uma que nao bate": a
    // primeira e alguem a bisbilhotar o endereco publico, a segunda e a Meta a
    // falar connosco com o segredo de OUTRO app.
    await registarBatida('assinatura-invalida',
      request.headers.get('x-hub-signature-256') ? 'assinatura presente mas nao confere' : 'sem cabecalho de assinatura');
    return json({ error: 'invalid signature' }, 401);
  }
  await registarBatida('aceite');

  const admin = createClient(supabaseUrl, serviceRoleKey);

  let evento: Record<string, unknown>;
  try {
    evento = JSON.parse(corpo);
  } catch {
    console.error('Webhook do WhatsApp: corpo nao e JSON');
    return json({ recebido: true });
  }

  const mensagens: Array<{
    from?: string;
    text?: { body?: string };
    button?: { text?: string; payload?: string };
    // O toque num botao de mensagem `interactive` NAO chega como `button`.
    // Chega assim, e ler so o `button` fazia o toque cair no vazio.
    interactive?: { type?: string; button_reply?: { id?: string; title?: string } };
    type?: string;
  }> = [];
  // OS RECIBOS VEM NO MESMO CORPO, num campo irmao de `messages`. A Meta manda
  // `statuses` numa chamada separada da mensagem, e por isso e facil nao dar
  // por eles: quem so testa "o dono respondeu" nunca ve um.
  const recibos: Array<{
    id?: string;
    status?: string;
    errors?: Array<{ code?: number; title?: string }>;
  }> = [];
  for (const entrada of ((evento.entry || []) as Array<Record<string, unknown>>)) {
    for (const mudanca of ((entrada.changes || []) as Array<Record<string, unknown>>)) {
      const valor = (mudanca.value || {}) as Record<string, unknown>;
      mensagens.push(...((valor.messages || []) as typeof mensagens));
      recibos.push(...((valor.statuses || []) as typeof recibos));
    }
  }

  // O RECIBO NUNCA ANDA PARA TRAS. A Meta nao garante ordem: um `delivered`
  // atrasado pode chegar depois do `read`, e grava-lo por cima apagaria a
  // informacao melhor. Por isso compara-se a posicao antes de escrever.
  //
  // `sent` da Meta e o nosso `accepted` — o despacho ja o escreveu ao receber
  // o 200, entao o recibo `sent` nao acrescenta nada e serve so de registo.
  const ESCADA = ['queued', 'sending', 'accepted', 'delivered', 'read'];
  const DA_META: Record<string, string> = {
    sent: 'accepted', delivered: 'delivered', read: 'read', failed: 'failed',
  };

  for (const recibo of recibos) {
    const idDaMeta = recibo.id;
    const estado = DA_META[recibo.status || ''];
    if (!idDaMeta || !estado) continue;

    const { data: linha } = await admin
      .from('whatsapp_outbox')
      .select('id, status')
      .eq('provider_message_id', idDaMeta)
      .maybeSingle();

    // UM RECIBO SEM DONO NAO E ERRO. Pode ser de uma mensagem enviada por outra
    // ferramenta no mesmo numero, ou de uma linha ja apagada. Anota-se a batida
    // e segue-se, em vez de fazer barulho por algo que nao e nosso.
    if (!linha) {
      await registarBatida('recibo-sem-linha', `${estado} para um id que nao esta no outbox`);
      continue;
    }

    await admin.from('whatsapp_delivery_events').insert({
      outbox_id: linha.id,
      provider: 'meta-cloud',
      event_type: estado === 'failed' ? 'failed' : estado,
      provider_message_id: idDaMeta,
      detail: recibo.errors?.length ? { errors: recibo.errors } : null,
    });

    const agora = ESCADA.indexOf(linha.status as string);
    const novoPasso = ESCADA.indexOf(estado);
    const avanca = estado === 'failed'
      // O `failed` da Meta e terminal e vale mais do que qualquer degrau, MAS
      // nao apaga uma entrega ja confirmada: se chegou ao telemovel, chegou.
      ? agora < ESCADA.indexOf('delivered')
      : novoPasso > agora;

    if (!avanca) {
      await registarBatida('recibo-para-tras', `${linha.status} nao recua para ${estado}`);
      continue;
    }

    await admin.from('whatsapp_outbox').update({
      status: estado,
      last_error_code: estado === 'failed'
        ? `Meta ${recibo.errors?.[0]?.code ?? 'sem codigo'}`
        : null,
      updated_at: new Date().toISOString(),
    }).eq('id', linha.id);

    await registarBatida('recibo-anotado', `${linha.status} -> ${estado}`);
  }

  for (const mensagem of mensagens) {
    const de = mensagem.from?.replace(/\D/g, '');
    if (!de) continue;

    // Do numero para o dono. A Meta manda so digitos; a preferencia guarda com
    // `+`. Comparar os digitos dos dois lados evita depender do formato.
    const { data: donos } = await admin
      .from('whatsapp_notification_preferences')
      .select('user_id, recipient_e164');
    let regra: 'exato' | 'nono-digito' | null = null;
    const dono = (donos || []).find((linha) => {
      const r = mesmaLinha(linha.recipient_e164 || '', de);
      if (r) regra = r;
      return Boolean(r);
    });

    // O ULTIMO QUATRO DIGITOS, e nao o numero. Chega para saber de quem se
    // trata ao depurar, e nao guarda o telefone de ninguem num sitio novo.
    const fim = de.slice(-4);
    if (!dono) {
      console.error('Webhook do WhatsApp: mensagem de um numero que nao e de nenhum dono');
      await registarBatida('sem-dono', `de ****${fim} (${de.length} digitos), nenhum dono casa`);
      continue;
    }
    await registarBatida('dono-encontrado', `****${fim} por ${regra}`);

    // A JANELA ABRE AQUI, e abre para qualquer mensagem — nao so para um "1".
    // E o facto de a pessoa ter escrito que a Meta considera, e e isso que
    // permite ao Binno mandar texto livre nas proximas 24 horas.
    await admin.from('whatsapp_notification_preferences')
      .update({ ultima_mensagem_recebida_em: new Date().toISOString() })
      .eq('user_id', dono.user_id);

    /*
     * O QUE O DONO DISSE, venha por onde vier.
     *
     * `text` quando ele escreveu. `button` quando carregou no botao de resposta
     * rapida do modelo — e ai a Meta manda `type: 'button'` com o texto do
     * botao, e nao um `text.body`. Ler so o primeiro fazia o toque no botao
     * nao ser lido por ninguem.
     *
     * O `payload` vem antes do `text` porque e o que NAO muda quando alguem
     * traduz o rotulo do botao.
     */
    /*
     * TRES FORMAS DE DIZER SIM, e sao mesmo tres coisas diferentes na Meta.
     *
     * `text`        o dono escreveu "1"
     * `button`      tocou no botao de um MODELO (fora da janela de 24h)
     * `interactive` tocou no botao de uma mensagem interactiva (dentro dela)
     *
     * A terceira entrou em 05/09/2026, com o botao no rascunho enviado dentro
     * da janela. Ela chega em `interactive.button_reply`, e NAO em `button` —
     * ler so as duas primeiras faria o toque cair no vazio, que e o pior
     * sintoma que existe: o dono carrega, nada acontece, e conclui que o
     * produto o ignorou. Sem erro nenhum a mostrar.
     *
     * O `id` vem antes do titulo pela mesma razao de sempre: e o que NAO muda
     * quando alguem traduz o rotulo.
     */
    const dito = mensagem.type === 'button'
      ? (mensagem.button?.payload || mensagem.button?.text || '')
      : mensagem.type === 'interactive'
        ? (mensagem.interactive?.button_reply?.id || mensagem.interactive?.button_reply?.title || '')
        : (mensagem.text?.body || '');
    if (!['text', 'button', 'interactive'].includes(mensagem.type || '') || !ehConfirmacao(dito)) continue;

    const { data: confirmada, error } = await admin
      .rpc('confirmar_resposta_do_dono', { p_user_id: dono.user_id });
    if (error) {
      console.error('Webhook do WhatsApp: falha ao confirmar a resposta: %s', error.message);
      continue;
    }
    if (!confirmada) {
      // `dito`, e nao `texto`: `texto` nunca existiu neste ficheiro. Era um
      // ReferenceError a espera do dia em que o dono confirmasse sem haver
      // nada pendente — o pedido inteiro rebentava, a Meta recebia 500 e
      // voltava a tentar o mesmo evento. Nao foi apanhado porque o `tsc` do
      // projeto nao olha para as funcoes do Supabase, que correm em Deno.
      console.error('Webhook do WhatsApp: "%s" recebido sem nada a espera de confirmacao', dito.slice(0, 20));
      continue;
    }
    console.error('Webhook do WhatsApp: resposta %s confirmada pelo dono', confirmada);
  }

  // SEMPRE 200. A Meta volta a tentar quando recebe outra coisa, e uma nova
  // tentativa do mesmo evento significaria confirmar duas vezes. O que corre
  // mal fica no log, nao no codigo de estado.
  return json({ recebido: true });
});
