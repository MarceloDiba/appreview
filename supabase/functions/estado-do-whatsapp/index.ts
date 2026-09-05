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
