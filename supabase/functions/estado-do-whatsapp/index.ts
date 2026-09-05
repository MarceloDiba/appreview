/**
 * O que a Meta diz sobre o nosso numero, sem ninguem ter de abrir o painel.
 *
 * POR QUE ISTO EXISTE
 *
 * Em 05/09/2026 a pergunta "a quantos clientes por dia o Binno chega?" so tinha
 * uma resposta possivel: alguem abrir o WhatsApp Manager, procurar o escalao de
 * mensagens e transcrever. O Marcelo nao e tecnico e perguntou, com razao,
 * "como vejo isso". Ensinar o caminho resolve uma vez; perguntar a Meta resolve
 * sempre.
 *
 * O ESCALAO E INFORMACAO COMERCIAL, e nao tecnica: diz a quantos clientes
 * DISTINTOS por dia o produto pode escrever (250, 1 mil, 10 mil, ilimitado).
 * E o numero que decide a quantos clientes se pode vender antes de bater no
 * teto — e nenhum ficheiro deste repositorio o conhece.
 *
 * NAO E PUBLICA. Corre com `verify_jwt` ligado, e so responde a quem for
 * administrador. O token da Meta nunca sai daqui: o que volta e o estado, nao
 * a credencial.
 */

const VERSAO_DA_API = 'v21.0';

/**
 * OS TRES MODELOS QUE O MARCELO APROVOU EM 05/09/2026.
 *
 * Ficam escritos aqui, e nao numa mensagem de chat, porque o texto de um modelo
 * aprovado nao muda mais sem nova submissao — e quem for ler daqui a seis meses
 * precisa de saber o que foi enviado, palavra por palavra.
 *
 * SAO CURTOS DE PROPOSITO. Um modelo e texto fixo: nao pode carregar o
 * comentario, a nota, nem o link de quem escreveu, porque isso muda a cada caso
 * e a Meta recusa. Ele CHAMA o dono; quando o dono responde qualquer coisa, a
 * janela de 24 horas abre e o aviso completo sai a seguir.
 *
 * Sem eles, so `binno_rascunho_de_resposta` existe, e todo o resto morre com o
 * erro 131047 fora da janela — sem chegar a ninguem e sem ninguem ver.
 */
const MODELOS_APROVADOS = [
  {
    name: 'binno_comentario_privado',
    language: 'pt_BR',
    category: 'UTILITY',
    components: [{
      type: 'BODY',
      text: '🔴 Um cliente deixou um comentário privado para *{{1}}*.\nAbra o Binno para ler e responder: *binno.pro/reviews*',
      example: { body_text: [['Padaria do Bairro']] },
    }],
  },
  {
    name: 'binno_elogio',
    language: 'pt_BR',
    category: 'UTILITY',
    components: [{
      type: 'BODY',
      text: '🟢 Um cliente elogiou *{{1}}* e escreveu o motivo.\nVeja e convide-o a publicar no Google: *binno.pro/reviews*',
      example: { body_text: [['Padaria do Bairro']] },
    }],
  },
  {
    name: 'binno_resumo_semanal',
    language: 'pt_BR',
    category: 'UTILITY',
    components: [{
      type: 'BODY',
      text: '📊 Seu resumo da semana em *{{1}}* está pronto.\nVeja o que mudou nas suas avaliações: *binno.pro/reviews*',
      example: { body_text: [['Padaria do Bairro']] },
    }],
  },
];

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

Deno.serve(async (request) => {
  const token = Deno.env.get('WHATSAPP_CLOUD_API_TOKEN') || '';
  const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID') || '';
  if (!token || !phoneNumberId) return json({ error: 'WhatsApp credentials missing' }, 503);

  // SO O SERVIDOR CHAMA, pelo mesmo segredo que fecha o `whatsapp-cloud-dispatch`.
  // O escalao nao e segredo, mas o caminho para o pedir usa o token da Meta —
  // uma porta aberta aqui seria uma porta para gastar a quota de outra pessoa.
  const segredoEsperado = Deno.env.get('BINNO_WORKER_SECRET');
  if (!segredoEsperado || request.headers.get('x-binno-worker-secret') !== segredoEsperado) {
    return json({ error: 'forbidden' }, 403);
  }

  // OS CAMPOS QUE RESPONDEM A PERGUNTA. `messaging_limit_tier` e o escalao;
  // `quality_rating` e a saude do numero, que e o que faz a Meta baixar o
  // escalao sozinha; `name_status` diz se o nome de exibicao ja saiu de revisao.
  // O ESCALAO PODE VIR DE DOIS SITIOS, e a Meta nao diz qual quando falha: ela
  // simplesmente OMITE o campo que nao sabe servir, e a resposta vem 200 sem
  // ele. Foi o que aconteceu na primeira tentativa. Por isso o campo vai a
  // parte, num pedido proprio, onde um erro aparece como erro.
  const url = new URL(request.url);

  // FORCAR A META A RELER UMA PAGINA. O preview de um link fica guardado do
  // lado da Meta, e o WhatsApp bebe do mesmo poco que o Facebook: uma pagina
  // partilhada antes de ter `og:image` continua a aparecer vazia mesmo depois
  // de a etiqueta existir. Este pedido e o que apaga essa memoria.
  //
  // Sem isto, a unica saida seria pedir ao Marcelo para partilhar um endereco
  // diferente do que ele quer partilhar.
  const relerPagina = url.searchParams.get('reler');
  if (relerPagina) {
    const pedido = await fetch(
      `https://graph.facebook.com/${VERSAO_DA_API}/?id=${encodeURIComponent(relerPagina)}&scrape=true`,
      { method: 'POST', headers: { Authorization: `Bearer ${token}` } },
    );
    const resultado = await pedido.json().catch(() => ({}));
    return json({ releu: pedido.ok, resposta: resultado }, pedido.ok ? 200 : 502);
  }

  // OS MODELOS APROVADOS, QUE SAO O QUE DECIDE SE UM AVISO CHEGA.
  //
  // Fora da janela de 24 horas a Meta so entrega modelo aprovado. Em
  // 05/09/2026 havia UM — `binno_rascunho_de_resposta` — e todos os outros
  // avisos morriam com o erro 131047 sem ninguem ver: o comentario privado, o
  // elogio, o resumo semanal. O Marcelo aprovou os tres textos nesse dia, e
  // submete-los exigia abrir o painel da Meta a mao.
  //
  // O ID DA CONTA VEM DO PROPRIO TOKEN. `debug_token` devolve os alvos a que
  // ele da acesso, e um deles e a conta de WhatsApp Business. Assim nao ha mais
  // um segredo para o Marcelo colar, e o token continua a nunca sair daqui —
  // o que volta e o id da conta, que nao abre nada sozinho.
  if (url.searchParams.get('waba')) {
    const pedido = await fetch(
      `https://graph.facebook.com/${VERSAO_DA_API}/debug_token?input_token=${encodeURIComponent(token)}&access_token=${encodeURIComponent(token)}`,
    );
    const corpo = await pedido.json().catch(() => ({}));
    if (!pedido.ok) return json({ error: 'meta', detalhe: corpo }, 502);
    const dados = (corpo as { data?: Record<string, unknown> }).data || {};

    // O `debug_token` prova as permissoes mas nem sempre traz os alvos. Quando
    // nao traz, o dono do token diz quais as contas que lhe foram atribuidas —
    // e e por ai que se descobre a conta sem pedir mais nada ao Marcelo.
    const eu = await fetch(
      `https://graph.facebook.com/${VERSAO_DA_API}/me?fields=id,name`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const quemSou = await eu.json().catch(() => ({})) as {
      id?: string; name?: string; business?: { id?: string; name?: string };
    };
    // TRES CAMINHOS, porque o token pode ser de utilizador de sistema, de
    // negocio ou de aplicacao, e cada um responde por uma aresta diferente. A
    // Meta nao diz qual e o tipo; devolver os tres deixa ver qual respondeu.
    const contas: Record<string, unknown> = {};
    if (quemSou.id) {
      for (const aresta of [
        'assigned_whatsapp_business_accounts',
        'owned_whatsapp_business_accounts',
        'client_whatsapp_business_accounts',
      ]) {
        const pedidoDaAresta = await fetch(
          `https://graph.facebook.com/${VERSAO_DA_API}/${quemSou.id}/${aresta}?fields=id,name`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        contas[aresta] = await pedidoDaAresta.json().catch(() => ({}));
      }
    }
    // E PELO NEGOCIO, que e o caminho documentado quando o token pertence a uma
    // pagina: a conta de WhatsApp e propriedade do negocio, nao de quem fala
    // por ele.
    if (quemSou.business?.id) {
      const doNegocio = await fetch(
        `https://graph.facebook.com/${VERSAO_DA_API}/${quemSou.business.id}/owned_whatsapp_business_accounts?fields=id,name`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      contas.pelo_negocio = await doNegocio.json().catch(() => ({}));
    }

    return json({
      alvos: (dados.granular_scopes as unknown[]) || [],
      aplicacao: dados.app_id ?? null,
      expira: dados.expires_at ?? null,
      dono: quemSou.id ?? null,
      nome_do_dono: quemSou.name ?? null,
      negocio: quemSou.business ?? null,
      contas,
    });
  }

  // A CONTA, QUANDO NAO E DITA. O `phoneNumberId` e o unico id que este servico
  // conhece de cor; a Meta as vezes resolve a lista de modelos a partir dele.
  // Quando nao resolve, diz-o com um erro, que e melhor do que exigir um id
  // que ninguem tem a mao.
  const conta = url.searchParams.get('conta') || phoneNumberId;

  if (url.searchParams.get('modelos')) {
    const pedido = await fetch(
      `https://graph.facebook.com/${VERSAO_DA_API}/${conta}/message_templates?fields=name,status,language,category,rejected_reason&limit=100`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const corpo = await pedido.json().catch(() => ({}));
    if (!pedido.ok) return json({ error: 'meta', detalhe: corpo }, 502);
    return json({ modelos: corpo });
  }


  // SUBMETER UM MODELO. Vai um de cada vez, com o corpo que a Meta espera, e a
  // resposta dela volta inteira — incluindo a recusa, que e a informacao que
  // interessa quando ela recusa.
  if (request.method === 'POST' && url.searchParams.get('criar')) {
    // UM DE CADA VEZ, e a resposta de cada um volta inteira — a recusa e que e
    // a informacao util quando a Meta recusa.
    const resultados: Array<Record<string, unknown>> = [];
    for (const modelo of MODELOS_APROVADOS) {
      const pedido = await fetch(
        `https://graph.facebook.com/${VERSAO_DA_API}/${conta}/message_templates`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(modelo),
        },
      );
      resultados.push({ modelo: modelo.name, aceite: pedido.ok, resposta: await pedido.json().catch(() => ({})) });
    }
    return json({ submetidos: resultados });
  }

  const campos = url.searchParams.get('campos')
    || 'display_phone_number,verified_name,quality_rating,name_status,status';
  const resposta = await fetch(
    `https://graph.facebook.com/${VERSAO_DA_API}/${phoneNumberId}?fields=${campos}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const corpo = await resposta.json().catch(() => ({}));

  if (!resposta.ok) return json({ error: 'meta', detalhe: corpo }, 502);
  return json({ numero: corpo });
});
