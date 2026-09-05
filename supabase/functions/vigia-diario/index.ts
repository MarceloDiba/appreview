/**
 * O VIGIA DIARIO — o que muda sozinho, entre duas passagens de QA.
 *
 * Especificacao: `docs/qa/vigia-diario.md`, escrita pela sessao de QA em
 * 05/09/2026. Quatro medicoes, cada uma com um PASSA sem ambiguidade.
 *
 * NAO E UM VARREDOR DE SEGURANCA. A QA correu o `nuclei` nesse dia — 2.949
 * testes — e ele nao achou nada que a passagem a mao nao tivesse achado. Um
 * scanner generico conhece software de prateleira, e o Binno quase nao tem
 * prateleira. Isto mede outra coisa: o que se estraga sozinho.
 *
 * A REGRA QUE MANDA AQUI: um teste que nao consegue medir GRITA, nunca passa.
 * Se o site nao responder, se o GitHub recusar, se o banco falhar — a medicao
 * vai para `nao_medido` e o aviso sai na mesma. Foi a licao de 05/09, que
 * apareceu cinco vezes com roupas diferentes no mesmo dia: uma verificacao que
 * ficou sem o que medir devolve "tudo bem" em vez de erro.
 */

const SITIO = 'https://binno.pro';
const REPOSITORIO = 'MarceloDiba/appreview';

/**
 * AS PORTAS QUE TEM DE RECUSAR.
 *
 * Bate-se em cada uma com a chave publicavel — a mesma que qualquer visitante
 * baixa no JavaScript — e sem sessao. Recusar e 401, 402, 403, ou 400 de
 * assinatura invalida, que e como os tres webhooks respondem a quem nao traz
 * assinatura da Meta ou do Stripe.
 *
 * `comprar` NAO ESTA NESTA LISTA, e a ausencia e deliberada: ela responde 200
 * com uma URL de checkout, por decisao de produto. Bater nela todos os dias
 * criaria uma sessao de pagamento abandonada por dia num sistema de dinheiro a
 * serio — um efeito colateral que a medicao nao precisa de ter para dizer o que
 * diz. O que se mede aqui e que NENHUMA OUTRA porta devolve 200.
 *
 * O guarda `check-vigia-tem-todas-as-portas` prova que esta lista cobre todas
 * as funcoes do repositorio menos essa. Sem ele, acrescentar uma funcao aberta
 * e esquecer de a listar deixaria o vigia verde — que e a mesma familia de
 * defeito que a regra 1 combate.
 */
const PORTAS = [
  'apify-auto-collect-on-signup',
  'billing-checkout',
  'email-dispatch',
  'estado-do-whatsapp',
  'fetch-google-reviews',
  'google-business-oauth-callback',
  'materialize-whatsapp-notifications',
  'oferecer-rascunhos',
  'publicar-respostas-confirmadas',
  'reclamar-compra',
  'search-prospects',
  'start-google-business-oauth',
  'stripe-billing-webhook',
  'sugerir-resposta',
  'sync-experimental-apify',
  'sync-google-business-profile',
  'telegram-dispatch',
  'temas-das-avaliacoes',
  'vigia-diario',
  'whatsapp-cloud-dispatch',
  'whatsapp-cloud-webhook',
  'whatsapp-notifications',
];

/**
 * OS SEGREDOS QUE NAO PODEM ESTAR NO PACOTE PUBLICADO.
 *
 * Treze padroes mais qualquer JWT. A chave publicavel do Supabase E um JWT e
 * TEM de estar la — por isso ela e retirada do texto antes da procura, e nao
 * excluida do padrao: excluir o padrao apagaria a deteccao de todos os outros.
 */
const PADROES = [
  'sk_live_', 'sk_test_', 'rk_live_', 'whsec_', 'service_role',
  'SUPABASE_SERVICE_ROLE', 'apify_api_', 'sk-proj-', 'BINNO_WORKER_SECRET',
  'TELEGRAM_BOT_TOKEN', 'GOOGLE_OAUTH_CLIENT_SECRET', 'WHATSAPP_CLOUD_API_TOKEN',
];
const CHAVE_DO_GOOGLE = /AIza[0-9A-Za-z_-]{35}/;
const QUALQUER_JWT = /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/;

// A lista conhecida em 06/09/2026, MEDIDA e nao copiada da especificacao — que
// dizia seis e sao sete. As seis do esquema dormente `auditoria_pro` e a
// `get_public_qr_business`, que e a pagina do QR e responde a quem nao tem
// conta, por desenho.
const ABERTAS_CONHECIDAS = [
  'public.auditoria_pro_complete_case',
  'public.auditoria_pro_create_case',
  'public.auditoria_pro_get_case_for_processing',
  'public.auditoria_pro_get_diagnostico',
  'public.auditoria_pro_get_status',
  'public.auditoria_pro_set_status',
  'public.get_public_qr_business',
];

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/** 1. As portas continuam a recusar. */
const medirAsPortas = async (base: string, publicavel: string) => {
  const falhas: string[] = [];
  const naoMedido: string[] = [];
  for (const nome of PORTAS) {
    try {
      const resposta = await fetch(`${base}/functions/v1/${nome}`, {
        method: 'POST',
        headers: {
          apikey: publicavel,
          Authorization: `Bearer ${publicavel}`,
          'Content-Type': 'application/json',
        },
        body: '{}',
      });
      // 404 e 405 tambem nao sao "entrou": nao ha ali nada a fazer sem sessao.
      if (resposta.status === 200) falhas.push(`a porta '${nome}' respondeu 200 a quem nao tem sessao`);
    } catch (erro) {
      naoMedido.push(`nao consegui bater na porta '${nome}': ${erro}`);
    }
  }
  return { falhas, naoMedido };
};

/** O que se procura dentro de um pacote, uma vez por pacote. */
const procurarSegredos = (corpo: string, fonte: string) => {
  const achados: string[] = [];
  for (const padrao of PADROES) {
    if (corpo.includes(padrao)) achados.push(`o pacote ${fonte} contem '${padrao}'`);
  }
  if (CHAVE_DO_GOOGLE.test(corpo)) achados.push(`o pacote ${fonte} contem uma chave do Google`);
  if (QUALQUER_JWT.test(corpo)) achados.push(`o pacote ${fonte} contem um JWT que nao e a chave publicavel`);
  return achados;
};

/** 2. Nenhum segredo no pacote publicado. */
const medirOPacote = async (publicavel: string) => {
  const falhas: string[] = [];
  const naoMedido: string[] = [];
  let pagina: string;
  try {
    const resposta = await fetch(SITIO, { headers: { 'cache-control': 'no-cache' } });
    if (!resposta.ok) {
      naoMedido.push(`o site respondeu ${resposta.status} — nao li o pacote`);
      return { falhas, naoMedido, pagina: '' };
    }
    pagina = await resposta.text();
  } catch (erro) {
    naoMedido.push(`nao consegui abrir ${SITIO}: ${erro}`);
    return { falhas, naoMedido, pagina: '' };
  }

  const fontes = [...pagina.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1]);
  if (!fontes.length) {
    // SEM PACOTE NAO HA MEDICAO. Uma pagina sem script nenhum nao prova que nao
    // ha segredo: prova que nao se leu nada.
    naoMedido.push('a pagina nao trouxe nenhum script — nao havia o que procurar');
    return { falhas, naoMedido, pagina };
  }

  for (const fonte of fontes) {
    const endereco = fonte.startsWith('http') ? fonte : `${SITIO}${fonte.startsWith('/') ? '' : '/'}${fonte}`;
    try {
      const resposta = await fetch(endereco);
      if (!resposta.ok) {
        naoMedido.push(`o pacote ${fonte} respondeu ${resposta.status}`);
        continue;
      }
      // A chave publicavel sai do texto ANTES da procura. Ela e um JWT e tem de
      // estar la; deixa-la enganaria a regra do JWT em todas as corridas.
      const corpo = (await resposta.text()).split(publicavel).join('[chave-publicavel]');
      falhas.push(...procurarSegredos(corpo, fonte));
    } catch (erro) {
      naoMedido.push(`nao consegui ler o pacote ${fonte}: ${erro}`);
    }
  }
  return { falhas, naoMedido, pagina };
};

/** 4. Nenhuma funcao nova chamavel por anonimo. */
const medirAsFuncoesAbertas = async (base: string, servico: string) => {
  const falhas: string[] = [];
  const naoMedido: string[] = [];
  try {
    const resposta = await fetch(`${base}/rest/v1/rpc/funcoes_abertas_a_anonimo`, {
      method: 'POST',
      headers: { apikey: servico, Authorization: `Bearer ${servico}`, 'Content-Type': 'application/json' },
      body: '{}',
    });
    if (!resposta.ok) {
      naoMedido.push(`nao consegui listar as funcoes abertas (${resposta.status})`);
      return { falhas, naoMedido };
    }
    const lista = await resposta.json() as string[];
    for (const nome of lista) {
      if (!ABERTAS_CONHECIDAS.includes(nome)) falhas.push(`'${nome}' passou a ser executavel por anonimo`);
    }
    // SUMIR TAMBEM E MUDANCA. `get_public_qr_business` desaparecer daqui
    // significa a pagina do QR partida para quem nao tem conta.
    for (const nome of ABERTAS_CONHECIDAS) {
      if (!lista.includes(nome)) falhas.push(`'${nome}' deixou de ser executavel por anonimo`);
    }
  } catch (erro) {
    naoMedido.push(`nao consegui listar as funcoes abertas: ${erro}`);
  }
  return { falhas, naoMedido };
};

/** 3. O que esta no ar e o que esta no `main`. */
const medirOQueEstaNoAr = async (pagina: string) => {
  const falhas: string[] = [];
  const naoMedido: string[] = [];
  if (!pagina) {
    naoMedido.push('sem a pagina, nao ha commit publicado para comparar');
    return { falhas, naoMedido };
  }
  const marca = pagina.match(/<meta name="binno-commit" content="([^"]*)"/);
  const publicado = marca?.[1] || '';
  if (!publicado) {
    naoMedido.push('a pagina servida nao traz a etiqueta do commit');
    return { falhas, naoMedido };
  }
  try {
    const resposta = await fetch(`https://api.github.com/repos/${REPOSITORIO}/commits/main`, {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'binno-vigia' },
    });
    if (!resposta.ok) {
      naoMedido.push(`o GitHub respondeu ${resposta.status} — nao sei qual e o main`);
      return { falhas, naoMedido };
    }
    const corpo = await resposta.json() as { sha?: string };
    if (!corpo.sha) {
      naoMedido.push('o GitHub respondeu sem sha');
      return { falhas, naoMedido };
    }
    if (corpo.sha !== publicado) {
      falhas.push(`no ar esta ${publicado.slice(0, 7)} e o main esta em ${corpo.sha.slice(0, 7)}`);
    }
  } catch (erro) {
    naoMedido.push(`nao consegui perguntar ao GitHub: ${erro}`);
  }
  return { falhas, naoMedido };
};

Deno.serve(async (request) => {
  const segredo = Deno.env.get('BINNO_WORKER_SECRET');
  if (!segredo || request.headers.get('x-binno-worker-secret') !== segredo) {
    return json({ error: 'forbidden' }, 403);
  }
  const base = Deno.env.get('SUPABASE_URL') || '';
  const servico = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const publicavel = Deno.env.get('SUPABASE_ANON_KEY') || '';
  if (!base || !servico || !publicavel) return json({ error: 'faltam credenciais do proprio projeto' }, 503);

  const portas = await medirAsPortas(base, publicavel);
  const pacote = await medirOPacote(publicavel);
  const noAr = await medirOQueEstaNoAr(pacote.pagina);

  const abertas = await medirAsFuncoesAbertas(base, servico);

  const falhas = [...portas.falhas, ...pacote.falhas, ...noAr.falhas, ...abertas.falhas];
  const naoMedido = [...portas.naoMedido, ...pacote.naoMedido, ...noAr.naoMedido, ...abertas.naoMedido];

  // A CORRIDA SECA MEDE E NAO REGISTA, para se poder provar o vigia sem
  // acordar ninguem. Sem ela, a unica forma de o experimentar seria mandar um
  // aviso de madrugada a quem nao pediu nenhum.
  if (new URL(request.url).searchParams.get('seco')) {
    return json({ seco: true, falhas, nao_medido: naoMedido });
  }

  const registo = await fetch(`${base}/rest/v1/rpc/registar_vigia`, {
    method: 'POST',
    headers: { apikey: servico, Authorization: `Bearer ${servico}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      p_falhas: falhas,
      p_nao_medido: naoMedido,
      p_detalhe: { portas: PORTAS.length, medido_em: new Date().toISOString() },
    }),
  });
  const resultado = await registo.json().catch(() => ({}));

  return json({ falhas, nao_medido: naoMedido, registo: resultado });
});
