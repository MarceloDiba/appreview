import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Quem COMECA o ciclo: oferece ao dono o rascunho da proxima avaliacao.
 *
 * POR QUE ESTA FUNCAO EXISTE
 *
 * Ate 04/09/2026 o ciclo inteiro funcionava e ninguem o comecava. As avaliacoes
 * chegavam pela sincronizacao, o rascunho sabia ser montado, a mensagem sabia
 * ser enviada, o "1" sabia ser confirmado e a resposta sabia ser publicada — e
 * NADA chamava `oferecer_rascunho`. As duas mensagens que existiram foram
 * disparadas a mao, numa consulta.
 *
 * AS REGRAS VIVEM NO BANCO, e nao aqui. `proxima_avaliacao_a_oferecer` decide
 * qual e a proxima e se cabe: uma de cada vez (para o "1" nunca ser ambiguo), a
 * mais antiga primeiro (uma avaliacao por responder envelhece mal), e o teto
 * diario so para o que a Meta cobra. Esta funcao so executa.
 *
 * O RASCUNHO E PEDIDO AO MESMO SITIO que o painel usa. Um segundo gerador aqui
 * daria dois textos diferentes para a mesma avaliacao, conforme o caminho — e o
 * dono veria um no WhatsApp e outro na tela.
 *
 * SE O MODELO FALHAR, NAO SE OFERECE NADA. Um rascunho de recuo escrito aqui
 * seria pior do que o silencio: o dono publica no perfil publico dele com um
 * clique, e o que ele recebe tem de ser o que o produto sabe escrever, nao um
 * texto de emergencia que ninguem reviu.
 */
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-binno-worker-secret',
};
const json = (corpo: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

/**
 * O rascunho, pedido ao MESMO sitio que o painel usa.
 *
 * Um segundo gerador aqui daria dois textos diferentes para a mesma avaliacao
 * conforme o caminho, e o dono veria um no telemovel e outro na tela.
 *
 * Devolve nulo quando nao ha texto — e quem chama nao oferece nada. Um rascunho
 * de recuo escrito aqui seria pior do que o silencio: o dono publica no perfil
 * publico dele com um clique, e o que ele recebe tem de ser o que o produto
 * sabe escrever, e nao um texto de emergencia que ninguem reviu.
 */
const pedirRascunho = async (
  admin: ReturnType<typeof createClient>,
  avaliacao: { rating: number; comment: string | null; reviewer_name: string | null },
  perfil: { business_name: string | null; business_country: string | null } | null,
  segredo: string,
): Promise<string | null> => {
  const { data, error } = await admin.functions.invoke('sugerir-resposta', {
    headers: { 'x-binno-worker-secret': segredo },
    body: {
      comment: avaliacao.comment ?? '',
      rating: avaliacao.rating,
      businessName: perfil?.business_name ?? null,
      channel: 'public',
      customerName: avaliacao.reviewer_name ?? null,
      businessCountry: perfil?.business_country ?? null,
    },
  });
  if (error) {
    console.error('sugerir-resposta recusou: %s', error.message);
    return null;
  }
  const texto = (data as { rascunho?: string } | null)?.rascunho;
  return texto && texto.trim() ? texto : null;
};

/**
 * Oferece ao dono o rascunho da proxima avaliacao, se houver e se couber.
 *
 * Fica fora do laco de proposito: cada saida daqui tem nome — `nada-a-oferecer`,
 * `sem-rascunho`, `nao-coube` — e um laco que decide tudo por dentro esconde
 * qual delas aconteceu.
 */
const oferecerAoDono = async (
  admin: ReturnType<typeof createClient>,
  userId: string,
  segredo: string,
): Promise<Record<string, unknown>> => {
  const { data: proxima } = await admin.rpc('proxima_avaliacao_a_oferecer', { p_user_id: userId });
  if (!proxima) return { userId, estado: 'nada-a-oferecer' };

  const { data: avaliacao } = await admin
    .from('google_business_reviews')
    .select('id, rating, comment, reviewer_name')
    .eq('id', proxima)
    .maybeSingle();
  if (!avaliacao) return { userId, estado: 'avaliacao-sumiu' };

  const { data: perfil } = await admin
    .from('profiles')
    .select('business_name, business_country')
    .eq('id', userId)
    .maybeSingle();

  const rascunho = await pedirRascunho(admin, avaliacao, perfil, segredo);
  if (!rascunho) return { userId, estado: 'sem-rascunho' };

  const { data: oferecida, error: erroAoOferecer } = await admin.rpc('oferecer_rascunho', {
    p_user_id: userId, p_review_id: proxima, p_rascunho: rascunho,
  });
  if (erroAoOferecer) {
    console.error('Nao consegui oferecer o rascunho: %s', erroAoOferecer.message);
    return { userId, estado: 'falhou-ao-oferecer', motivo: erroAoOferecer.message };
  }

  // Nulo aqui nao e erro: e a regra a funcionar — ja havia um a espera, ou o
  // dono nao tem destino.
  return { userId, estado: oferecida ? 'oferecido' : 'nao-coube', resposta: oferecida };
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: cors });

  const segredo = Deno.env.get('BINNO_WORKER_SECRET');
  if (!segredo || request.headers.get('x-binno-worker-secret') !== segredo) {
    return json({ error: 'forbidden' }, 403);
  }

  const url = Deno.env.get('SUPABASE_URL') || '';
  const chave = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (!url || !chave) return json({ error: 'Server configuration missing' }, 500);
  const admin = createClient(url, chave);

  // So os donos que ligaram o WhatsApp oficial. Os outros continuam a ser
  // avisados pelo canal deles, e este ciclo nao lhes diz respeito.
  const { data: donos } = await admin
    .from('whatsapp_notification_preferences')
    .select('user_id')
    .eq('whatsapp_oficial_ligado', true);

  const resultados: Array<Record<string, unknown>> = [];
  for (const dono of (donos || [])) {
    resultados.push(await oferecerAoDono(admin, dono.user_id as string, segredo));
  }

  return json({ donos: (donos || []).length, resultados });
});
