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

/**
 * UM PEDIDO A META, sempre da mesma forma.
 *
 * Cinco chamadas escritas a mao viravam cinco `catch(() => ({}))` e cinco
 * maneiras diferentes de dizer que correu mal. Aqui o token entra uma vez, o
 * corpo volta sempre como objecto, e quem chama so decide o que fazer com o
 * `ok`.
 */
const pedirAMeta = async (caminho: string, token: string, init: RequestInit = {}) => {
  const resposta = await fetch(`https://graph.facebook.com/${VERSAO_DA_API}/${caminho}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init.headers || {}) },
  });
  return { ok: resposta.ok, corpo: await resposta.json().catch(() => ({})) as Record<string, unknown> };
};

/**
 * FORCAR A META A RELER UMA PAGINA.
 *
 * O preview de um link fica guardado do lado da Meta, e o WhatsApp bebe do
 * mesmo poco que o Facebook: uma pagina partilhada antes de ter `og:image`
 * continua a aparecer vazia mesmo depois de a etiqueta existir. Sem isto, a
 * unica saida seria pedir ao Marcelo para partilhar um endereco diferente do
 * que ele quer partilhar.
 */
const relerAPagina = async (endereco: string, token: string) => {
  const { ok, corpo } = await pedirAMeta(
    `?id=${encodeURIComponent(endereco)}&scrape=true`, token, { method: 'POST' },
  );
  return json({ releu: ok, resposta: corpo }, ok ? 200 : 502);
};

/**
 * O QUE O TOKEN PODE, E ONDE A CONTA NAO ESTA.
 *
 * Submeter um modelo exige o id da conta de WhatsApp Business. Em 05/09/2026
 * procurei-o por tres caminhos e os tres falharam, o que fica escrito para
 * ninguem os repetir: `debug_token` prova as permissoes mas nao traz os alvos;
 * `assigned_whatsapp_business_accounts` responde uma lista vazia; e o proprio
 * numero nao tem o campo `whatsapp_business_account` nem a aresta
 * `message_templates`.
 *
 * O id vem no `entry[].id` de cada recibo que a Meta manda ao webhook, e o
 * webhook passou a anota-lo. Isto continua a servir para uma coisa: ver se o
 * token ainda tem `whatsapp_business_management` — sem essa permissao, nem com
 * o id na mao se submete modelo nenhum.
 */
const permissoesDoToken = async (token: string) => {
  const { ok, corpo } = await pedirAMeta(
    `debug_token?input_token=${encodeURIComponent(token)}&access_token=${encodeURIComponent(token)}`,
    token,
  );
  if (!ok) return json({ error: 'meta', detalhe: corpo }, 502);
  const dados = (corpo.data || {}) as Record<string, unknown>;
  return json({
    alvos: dados.granular_scopes ?? [],
    aplicacao: dados.app_id ?? null,
    expira: dados.expires_at ?? null,
  });
};

const listarModelos = async (conta: string, token: string) => {
  const { ok, corpo } = await pedirAMeta(
    `${conta}/message_templates?fields=name,status,language,category,rejected_reason&limit=100`, token,
  );
  return ok ? json({ modelos: corpo }) : json({ error: 'meta', detalhe: corpo }, 502);
};

/**
 * SUBMETER OS TRES, um de cada vez. A resposta de cada um volta inteira — a
 * recusa e que e a informacao util quando a Meta recusa.
 */
const submeterModelos = async (conta: string, token: string) => {
  const resultados = [];
  for (const modelo of MODELOS_APROVADOS) {
    const { ok, corpo } = await pedirAMeta(`${conta}/message_templates`, token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(modelo),
    });
    resultados.push({ modelo: modelo.name, aceite: ok, resposta: corpo });
  }
  return json({ submetidos: resultados });
};

/**
 * A PORTA. So o servidor chama, pelo mesmo segredo que fecha o
 * `whatsapp-cloud-dispatch`. O escalao nao e segredo, mas o caminho para o
 * pedir usa o token da Meta — uma porta aberta aqui seria uma porta para
 * gastar a quota de outra pessoa.
 */
const porteiro = (request: Request) => {
  const token = Deno.env.get('WHATSAPP_CLOUD_API_TOKEN') || '';
  const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID') || '';
  if (!token || !phoneNumberId) {
    return json({ error: 'WhatsApp credentials missing' }, 503);
  }
  const esperado = Deno.env.get('BINNO_WORKER_SECRET');
  if (!esperado || request.headers.get('x-binno-worker-secret') !== esperado) {
    return json({ error: 'forbidden' }, 403);
  }
  return { token, phoneNumberId };
};

Deno.serve(async (request) => {
  // Ou a porta devolve a recusa ja pronta, ou devolve as credenciais. Um dos
  // dois, nunca os dois — e assim quem le nao tem de perguntar qual.
  const porta = porteiro(request);
  if (porta instanceof Response) return porta;
  const { token, phoneNumberId } = porta;

  const url = new URL(request.url);
  const pagina = url.searchParams.get('reler');
  if (pagina) return await relerAPagina(pagina, token);
  if (url.searchParams.get('waba')) return await permissoesDoToken(token);

  // A CONTA, QUANDO NAO E DITA. O `phoneNumberId` e o unico id que este servico
  // conhece de cor; a Meta nao resolve os modelos a partir dele, mas responde
  // com um erro claro, que e melhor do que exigir um id que ninguem tem a mao.
  const conta = url.searchParams.get('conta') || phoneNumberId;
  if (url.searchParams.get('modelos')) return await listarModelos(conta, token);
  if (request.method === 'POST' && url.searchParams.get('criar')) {
    return await submeterModelos(conta, token);
  }

  // OS CAMPOS QUE RESPONDEM A PERGUNTA. `messaging_limit_tier` e o escalao;
  // `quality_rating` e a saude do numero, que e o que faz a Meta baixar o
  // escalao sozinha; `name_status` diz se o nome de exibicao ja saiu de revisao.
  // O ESCALAO PODE VIR DE DOIS SITIOS, e a Meta nao diz qual quando falha: ela
  // simplesmente OMITE o campo que nao sabe servir, e a resposta vem 200 sem
  // ele. Por isso o campo pode ir a parte, num pedido proprio, onde um erro
  // aparece como erro.
  const campos = url.searchParams.get('campos')
    || 'display_phone_number,verified_name,quality_rating,name_status,status';
  const { ok, corpo } = await pedirAMeta(`${phoneNumberId}?fields=${campos}`, token);
  return ok ? json({ numero: corpo }) : json({ error: 'meta', detalhe: corpo }, 502);
});
