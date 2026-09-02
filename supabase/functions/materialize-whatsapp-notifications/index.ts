import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { relatorioSemanal } from '../_shared/relatorioSemanal.ts';

/**
 * Enfileira o resumo semanal de cada dono, no dia e na hora que ele escolheu.
 *
 * O QUE MUDOU EM 02/09/2026
 *
 * Duas coisas, e a segunda so ficou visivel por causa da primeira.
 *
 *   1. O CANAL. Ate esta data o `insert` nao dizia `provider`, e a coluna cai
 *      no padrao `openwa`. Ou seja: o resumo semanal ia sempre pelo WhatsApp,
 *      mesmo para um dono que tinha ligado o Telegram, e mesmo depois de o
 *      numero do piloto ter sido bloqueado em 31/08. O resumo estava a ser
 *      enfileirado todas as semanas e a falhar todas as semanas, em silencio,
 *      porque uma linha `failed` na fila nao acorda ninguem. Agora o canal e
 *      escolhido: `email` quando o dono quer o relatorio por e-mail, e senao o
 *      que `canal_do_aviso` decidir, tal como os avisos urgentes.
 *
 *   2. A COMPOSICAO saiu daqui. Ela vive em `_shared/relatorioSemanal.ts` e
 *      serve os dois formatos a partir do mesmo retrato. Enquanto esteve aqui
 *      dentro so sabia escrever mensagem curta, e o e-mail teria de ter a sua
 *      propria — duas versoes do mesmo relatorio a divergir sem ninguem ver.
 */

const json = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json' },
});

const localParts = (date: Date, timeZone: string) => {
  try {
    const values = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(date).reduce<Record<string, string>>((parts, part) => ({ ...parts, [part.type]: part.value }), {});
    return { date: `${values.year}-${values.month}-${values.day}`, time: `${values.hour}:${values.minute}`, weekday: values.weekday?.toLowerCase() };
  } catch {
    return null;
  }
};

const isExpectedDay = (weekday: string | undefined, day: string) =>
  (day === 'monday' && weekday === 'mon') || (day === 'friday' && weekday === 'fri');

const endereco = (valor: unknown): string | null => {
  if (typeof valor !== 'string') return null;
  const limpo = valor.trim();
  return /^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(limpo) ? limpo : null;
};

serve(async (request) => {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const expected = Deno.env.get('BINNO_WORKER_SECRET');
  if (!expected || request.headers.get('x-binno-worker-secret') !== expected) return json({ error: 'Unauthorized' }, 401);
  const url = Deno.env.get('SUPABASE_URL') || '';
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (!url || !key) return json({ error: 'Server configuration missing' }, 500);
  const admin = createClient(url, key);
  const now = new Date();
  const { data: preferences, error } = await admin.from('whatsapp_notification_preferences')
    .select('user_id, recipient_e164, weekly_day, delivery_time, time_zone, weekly_channel, report_email')
    .eq('weekly_enabled', true).not('consented_at', 'is', null);
  if (error) return json({ error: 'Could not load notification preferences' }, 500);
  let queued = 0;
  const semDestino: string[] = [];
  for (const preference of preferences || []) {
    const local = localParts(now, preference.time_zone);
    if (!local || !isExpectedDay(local.weekday, preference.weekly_day) || local.time < String(preference.delivery_time).slice(0, 5)) continue;
    const { data: latest } = await admin.from('experimental_apify_runs')
      .select('result_summary').eq('user_id', preference.user_id).eq('status', 'succeeded')
      .order('completed_at', { ascending: false }).limit(1).maybeSingle();
    const relatorio = relatorioSemanal(latest?.result_summary);
    // Sem retrato legivel nao ha relatorio. Enfileirar um corpo vazio poria uma
    // mensagem sem conteudo na caixa de entrada do dono, e uma linha `sent` a
    // dizer que correu bem.
    if (!relatorio) continue;

    const porEmail = preference.weekly_channel === 'email';
    let destinoDoEmail: string | null = null;
    if (porEmail) {
      // O endereco combinado no painel ganha; sem ele, vale o e-mail da conta.
      // Resolver AQUI e nao no envio deixa o endereco escrito na propria linha
      // da fila: quem for ver porque e que um relatorio nao chegou ve para onde
      // ele foi, e nao tem de reconstruir a decisao.
      destinoDoEmail = endereco(preference.report_email);
      if (!destinoDoEmail) {
        const { data: conta } = await admin.auth.admin.getUserById(preference.user_id);
        destinoDoEmail = endereco(conta?.user?.email);
      }
      if (!destinoDoEmail) {
        // Fica no log com o dono nomeado. A contagem na resposta HTTP diz que
        // aconteceu; so o log diz a QUEM, que e a unica coisa que permite ir
        // corrigir. Descoberto na auditoria de 02/09/2026.
        console.error('resumo semanal sem destino de e-mail para %s', preference.user_id);
        semDestino.push(preference.user_id);
        continue;
      }
    }

    const canal = porEmail
      ? 'email'
      : (await admin.rpc('canal_do_aviso', { p_user_id: preference.user_id })).data as string || 'openwa';

    const { error: enqueueError } = await admin.from('whatsapp_outbox').upsert({
      user_id: preference.user_id,
      kind: 'weekly',
      provider: canal,
      recipient_e164: porEmail ? null : preference.recipient_e164,
      recipient_email: destinoDoEmail,
      subject: porEmail ? relatorio.assunto : null,
      body: relatorio.texto,
      body_html: porEmail ? relatorio.html : null,
      idempotency_key: `weekly:${local.date}`,
    }, { onConflict: 'user_id,idempotency_key', ignoreDuplicates: true });
    // O ERRO DE ENFILEIRAMENTO DEIXOU DE SER DESCARTADO.
    //
    // Ate 02/09/2026 esta linha era so `if (!enqueueError) queued += 1;`. Um
    // `check` recusado — corpo acima de 4096, canal fora da lista, destino em
    // falta — fazia o resumo desaparecer sem deixar rasto nenhum: nem linha na
    // fila, nem linha no log, nem numero na resposta.
    if (enqueueError) console.error('resumo semanal nao entrou na fila para %s: %s', preference.user_id, enqueueError.message);
    else queued += 1;
  }
  return json({ queued, semDestino: semDestino.length, checkedAt: now.toISOString() });
});
