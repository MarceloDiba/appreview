import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

const phone = (value: unknown) => typeof value === 'string' && /^\+[1-9]\d{7,14}$/.test(value.replace(/[\s().-]/g, ''))
  ? value.replace(/[\s().-]/g, '')
  : null;

const time = (value: unknown) => typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? value : null;

/**
 * Dizer apenas "Preferências inválidas" obriga quem usa a adivinhar qual dos
 * três campos está errado. Aconteceu de verdade: o painel tem dois campos de
 * telefone, o do gestor e o do teste, e preencher só o segundo produzia uma
 * recusa que não apontava nada. Cada campo agora responde por si.
 */
const preferenceProblem = (body: Record<string, unknown>): string | null => {
  if (!phone(body.recipient)) return 'Informe o WhatsApp do gestor, no topo do formulário, antes de salvar.';
  if (!time(body.time)) return 'Informe o horário de envio.';
  if (body.day !== 'monday' && body.day !== 'friday') return 'Escolha a frequência de envio.';
  return null;
};

const preferenceInput = (body: Record<string, unknown>) => {
  const recipient = phone(body.recipient);
  const deliveryTime = time(body.time);
  const day = body.day === 'monday' || body.day === 'friday' ? body.day : null;
  if (!recipient || !deliveryTime || !day) return null;
  return {
    recipient_e164: recipient,
    weekly_enabled: body.weeklyEnabled === true,
    replies_enabled: body.repliesEnabled === true,
    reputation_enabled: body.reputationEnabled === true,
    profile_enabled: body.profileEnabled === true,
    feedback_enabled: body.feedbackEnabled === true,
    weekly_day: day,
    delivery_time: deliveryTime,
    // POR ONDE SAI O RESUMO SEMANAL, e so ele.
    //
    // Os avisos urgentes nao passam por aqui: eles seguem `canal_do_aviso`,
    // porque um comentario de uma estrela tem de chegar em minutos ao canal que
    // o dono abre, e nao a uma caixa de entrada. O resumo de segunda le-se ao
    // cafe, e ai o e-mail ganha: as barras por nota, os temas e a comparacao da
    // semana nao cabem numa mensagem de telemovel.
    //
    // Um valor desconhecido cai em `mensagem` em vez de recusar o formulario
    // inteiro: e uma preferencia de apresentacao, e recusar a gravacao das
    // outras seis por causa dela seria desproporcionado. O recuo e `mensagem`
    // desde 02/09/2026 porque e o canal que funciona sem configuracao nenhuma —
    // cair num canal que precisa de uma chave que pode nao existir poria o
    // resumo a espera sem ninguem ter pedido isso.
    weekly_channel: body.weeklyChannel === 'email' ? 'email' : 'mensagem',
    consented_at: body.consented === true ? new Date().toISOString() : null,
  };
};

serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const authorization = request.headers.get('Authorization');
  if (!authorization || !serviceRoleKey) return json({ error: 'Authentication required' }, 401);

  const caller = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } });
  const { data: { user }, error: userError } = await caller.auth.getUser();
  if (userError || !user) return json({ error: 'Invalid session' }, 401);
  const admin = createClient(supabaseUrl, serviceRoleKey);
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;

  // `recipient_email` entra em 02/09/2026: uma linha de e-mail nao tem telefone,
  // e sem esta coluna a tela nao sabe para onde a mensagem foi.
  const COLUNAS_DA_ENTREGA = 'id, kind, status, recipient_e164, recipient_email, provider_message_id, last_error_code, created_at, updated_at';

  if (body.action === 'get') {
    /**
     * Duas consultas, e não uma, porque a tela faz duas perguntas diferentes.
     *
     * `deliveries` é o histórico recente, de qualquer tipo, para a linha "a
     * última mensagem foi...". `last_test` é o estado da ligação, e só o teste
     * do dono responde por ele.
     *
     * Até 31/08/2026 havia só a primeira, e a tela pescava o teste de dentro
     * dela com um `find`. Dez avisos mais recentes empurravam o teste para fora
     * da janela de dez linhas, e um dono com ligação a funcionar via a tela
     * dizer que ele nunca tinha testado. Quanto mais o produto entrega, mais
     * depressa isso acontece: era um defeito que piorava com o uso.
     */
    const [{ data: preferences }, { data: deliveries }, { data: lastTest }, { data: ultimaFalha }] = await Promise.all([
      admin.from('whatsapp_notification_preferences').select('*').eq('user_id', user.id).maybeSingle(),
      admin.from('whatsapp_outbox').select(COLUNAS_DA_ENTREGA).eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
      admin.from('whatsapp_outbox').select(COLUNAS_DA_ENTREGA).eq('user_id', user.id).eq('kind', 'test').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      // A ultima falha, de qualquer especie. Em 31/08/2026 o numero do piloto
      // foi bloqueado: o ultimo teste tinha sido entregue no dia anterior e a
      // tela continuava a dizer "ligacao ativa" enquanto um aviso falhava com
      // OpenWA 409. Um teste de ontem nao prova nada sobre uma mensagem que
      // nao chegou hoje, e a falha pode ser de qualquer tipo de mensagem.
      admin.from('whatsapp_outbox').select(COLUNAS_DA_ENTREGA).eq('user_id', user.id).eq('status', 'failed').order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ]);
    // O e-mail da conta viaja com o resto porque a tela precisa de o MOSTRAR.
    // "Vai por e-mail" sem dizer para qual endereco obriga o dono a confiar sem
    // poder conferir, e o endereco da conta e o unico que ele nunca escolheu.
    return json({
      preferences,
      deliveries: deliveries || [],
      last_test: lastTest || null,
      last_failure: ultimaFalha || null,
      account_email: user.email || null,
    });
  }

  if (body.action === 'save-preferences') {
    const problema = preferenceProblem(body);
    if (problema) return json({ error: problema }, 422);
    const input = preferenceInput(body);
    if (!input) return json({ error: 'Preferências inválidas.' }, 422);
    const { data, error } = await admin.from('whatsapp_notification_preferences')
      .upsert({ user_id: user.id, ...input }, { onConflict: 'user_id' })
      .select('*').single();
    if (error) return json({ error: 'Não foi possível salvar as preferências.' }, 500);
    return json({ preferences: data });
  }

  if (body.action === 'enqueue-test') {
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    if (!message || message.length > 4096) return json({ error: 'Mensagem de teste inválida.' }, 422);
    const recipientInput = typeof body.recipient === 'string' ? body.recipient.trim() : '';
    if (!recipientInput) return json({ error: 'Informe o número de WhatsApp antes de enviar.' }, 422);
    const recipient = phone(body.recipient);
    if (!recipient) return json({ error: 'Número de WhatsApp inválido.' }, 422);
    /**
     * O envio de teste não exige o consentimento contínuo. São coisas diferentes:
     * o consentimento autoriza os envios automáticos e recorrentes; o teste é uma
     * mensagem única, disparada à mão pela pessoa dona da conta, para o número que
     * ela acabou de digitar na própria tela, com confirmação explícita ali.
     * Exigir o consentimento aqui obrigava a salvar as preferências antes de poder
     * testar — um bloco travando o outro, sem ganho de proteção.
     */
    const key = `test:${crypto.randomUUID()}`;
    const { data, error } = await admin.from('whatsapp_outbox').insert({
      user_id: user.id,
      kind: 'test',
      recipient_e164: recipient,
      body: message,
      idempotency_key: key,
    }).select('id, kind, status, created_at').single();
    if (error) return json({ error: 'Não foi possível colocar a mensagem na fila.' }, 500);
    return json({ delivery: data }, 202);
  }

  return json({ error: 'Ação inválida.' }, 422);
});
