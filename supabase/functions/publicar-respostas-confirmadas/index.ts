import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

/**
 * Publica no Google o que o dono confirmou pelo WhatsApp.
 *
 * POR QUE ISTO E UMA FUNCAO A PARTE, E NAO PARTE DO WEBHOOK
 *
 * A Meta espera resposta do webhook em milissegundos e volta a tentar se
 * demorar. Publicar no Google demora mais do que isso. Um webhook lento vira
 * mensagens repetidas, e mensagens repetidas viravam respostas publicadas duas
 * vezes no perfil de um cliente — um estrago publico e visivel.
 *
 * Entao o webhook so MARCA, e isto publica. E o mesmo desenho da fila de envio,
 * pela mesma razao.
 *
 * A PROTECCAO CONTRA PUBLICAR DUAS VEZES
 *
 * `publicado_em` e escrito ANTES da chamada ao Google, e a reserva so pega
 * linhas onde ele e nulo. Se duas execucoes se cruzarem, a segunda nao encontra
 * a linha. Publicar duas vezes no perfil publico de um cliente nao se desfaz
 * pedindo desculpa.
 */

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const VERSAO_DA_API = 'v4';

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const segredoEsperado = Deno.env.get('BINNO_WORKER_SECRET');
  if (!segredoEsperado || request.headers.get('x-binno-worker-secret') !== segredoEsperado) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const clientId = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID') || '';
  const clientSecret = Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET') || '';
  if (!supabaseUrl || !serviceRoleKey) return json({ error: 'Server configuration missing' }, 500);
  if (!clientId || !clientSecret) {
    return json({ code: 'GOOGLE_OAUTH_NOT_CONFIGURED', error: 'A ligacao ao Google nao esta configurada.' }, 503);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);

  const { data: confirmadas } = await admin
    .from('respostas_a_confirmar')
    .select('id, user_id, review_id, rascunho')
    .not('confirmado_em', 'is', null)
    .is('publicado_em', null)
    .is('recusado_em', null)
    .order('confirmado_em', { ascending: true })
    .limit(5);

  const resultados: Array<Record<string, unknown>> = [];

  for (const pedido of (confirmadas || [])) {
    // A MARCA VEM PRIMEIRO. Ver o cabecalho: se duas execucoes se cruzarem, a
    // segunda nao encontra a linha, e ninguem publica duas vezes.
    const { data: reservada } = await admin
      .from('respostas_a_confirmar')
      .update({ publicado_em: new Date().toISOString() })
      .eq('id', pedido.id)
      .is('publicado_em', null)
      .select('id')
      .maybeSingle();
    if (!reservada) continue;

    const falhar = async (motivo: string) => {
      console.error('Publicar resposta confirmada falhou (%s): %s', pedido.id, motivo);
      await admin.from('respostas_a_confirmar')
        .update({ publicado_em: null, recusado_em: new Date().toISOString(), erro: motivo.slice(0, 300) })
        .eq('id', pedido.id);
      resultados.push({ id: pedido.id, estado: 'falhou', motivo });
    };

    const { data: token } = await admin
      .rpc('read_google_business_refresh_token', { p_user_id: pedido.user_id });
    if (!token) { await falhar('sem token do Google'); continue; }

    const respostaDoToken = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: String(token),
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
      }),
    });
    const dadosDoToken = await respostaDoToken.json().catch(() => ({})) as { access_token?: string };
    if (!respostaDoToken.ok || !dadosDoToken.access_token) {
      await falhar('a autorizacao do Google expirou');
      continue;
    }

    const { data: avaliacao } = await admin
      .from('google_business_reviews')
      .select('google_review_name')
      .eq('id', pedido.review_id)
      .maybeSingle();
    if (!avaliacao?.google_review_name) { await falhar('avaliacao nao encontrada'); continue; }

    const publicacao = await fetch(
      `https://mybusiness.googleapis.com/${VERSAO_DA_API}/${avaliacao.google_review_name}/reply`,
      {
        method: 'PUT',
        headers: { Authorization: `Bearer ${dadosDoToken.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: pedido.rascunho }),
      },
    );

    if (!publicacao.ok) {
      // Ler o texto ANTES de tentar JSON: e o que separa "o Google recusou" de
      // "o endereco desapareceu", como a v4 dos locais ensinou em 03/09.
      const texto = await publicacao.text().catch(() => '');
      await falhar(`Google ${publicacao.status}: ${texto.slice(0, 200)}`);
      continue;
    }

    await admin.from('google_business_reviews')
      .update({ reply_text: pedido.rascunho, reply_updated_at: new Date().toISOString() })
      .eq('id', pedido.review_id);
    resultados.push({ id: pedido.id, estado: 'publicada' });
  }

  return json({ publicadas: resultados.length, resultados });
});
