import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { billingConfig, countryFrom, countryIsEligible, corsHeaders, json, verifiedWebhookMarket } from '../_shared/billing.ts';

type StripeEvent = {
  id?: string;
  type?: string;
  data?: { object?: Record<string, unknown> };
};

const unixToIso = (value: unknown) => typeof value === 'number' && Number.isFinite(value)
  ? new Date(value * 1000).toISOString()
  : null;

const string = (value: unknown) => typeof value === 'string' && value ? value : null;

serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const payload = await request.text();
  const merchant = await verifiedWebhookMarket(payload, request.headers.get('stripe-signature'));
  if (!merchant) return json({ error: 'Invalid Stripe signature.' }, 400);
  const event = JSON.parse(payload) as StripeEvent;
  const eventId = string(event.id);
  const eventType = string(event.type);
  if (!eventId || !eventType) return json({ error: 'Invalid Stripe event.' }, 400);

  const url = Deno.env.get('SUPABASE_URL') || '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (!url || !serviceRoleKey) return json({ error: 'Server unavailable.' }, 503);
  const admin = createClient(url, serviceRoleKey);
  const { error: insertedError } = await admin.from('billing_webhook_events').insert({
    merchant,
    stripe_event_id: eventId,
    event_type: eventType,
  });
  if (insertedError?.code === '23505') return json({ received: true, duplicate: true });
  if (insertedError) return json({ error: 'Could not persist Stripe event.' }, 500);

  try {
    const object = event.data?.object || {};
    const metadata = object.metadata as Record<string, unknown> | undefined;
    const userId = string(metadata?.user_id) || string(object.client_reference_id);
    const subscriptionId = string(object.id)?.startsWith('sub_')
      ? string(object.id)
      : string(object.subscription);
    const customerId = string(object.customer);
    /**
     * A COMPRA DE QUEM AINDA NAO TEM CONTA.
     *
     * `subscriptions.user_id` e `not null`, e de proposito: e a tabela que
     * decide quem tem acesso, e uma linha sem dono ali seria acesso de
     * ninguem. Um pagamento sem conta vai para `compras_a_reclamar`, onde e
     * uma LINHA QUE SE VE — dinheiro recebido de alguem que ainda nao entrou.
     *
     * Vem ANTES do ramo normal porque a marca e a ausencia de `user_id`: sem
     * este bloco, o `if` abaixo nao entra e o evento seria descartado em
     * silencio. Alguem teria pago e nada teria acontecido.
     */
    if (!userId && eventType === 'checkout.session.completed' && string(metadata?.sem_conta) === '1') {
      const detalhes = object.customer_details as Record<string, unknown> | undefined;
      const email = string(detalhes?.email) || string(object.customer_email);
      if (!email) {
        // Sem email nao ha segunda via para reclamar. O bilhete ainda serve,
        // entao a linha e gravada na mesma — o registo perde uma via, nao o
        // dinheiro.
        console.error('checkout sem conta e sem email: %s', string(object.id));
      }
      const endereco = detalhes?.address as Record<string, unknown> | undefined;
      const { error: erroDaCompra } = await admin.from('compras_a_reclamar').upsert({
        stripe_session_id: string(object.id),
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        email: (email || '').toLowerCase() || 'sem-email',
        market: merchant,
        merchant,
        billing_country: countryFrom(endereco?.country),
        currency: string(object.currency),
        price_per_month: typeof object.amount_total === 'number' ? object.amount_total / 100 : null,
      }, { onConflict: 'stripe_session_id' });
      if (erroDaCompra) throw erroDaCompra;
      return json({ received: true, sem_conta: true });
    }

    /*
     * O DONO PODE NAO ESTAR NO EVENTO, E ISSO E O NORMAL PARA UM CLIENTE NOVO.
     *
     * `userId` sai de `metadata.user_id` ou `client_reference_id`, e os dois so
     * existem quando quem comprou JA TINHA CONTA. Quem compra sem conta — que e
     * todo cliente novo — gera uma assinatura com `metadata` a dizer apenas
     * `{ market, sem_conta: 1 }`. O dono aparece depois, quando `reclamar_compra`
     * liga a compra a conta recem-criada.
     *
     * Sem esta procura, TODO evento seguinte dessa assinatura era descartado em
     * silencio: o `if` abaixo nao entrava e a linha ficava congelada no estado
     * em que nasceu.
     *
     * MEDIDO EM PRODUCAO, 05/09/2026: o Marcelo comprou deslogado, a conta
     * nasceu, e ao cancelar no Stripe o `customer.subscription.deleted` chegou,
     * foi marcado como processado — e a tabela continuou `active` com o acesso
     * aberto. Cancelar nao tirava o acesso. Para um produto que so deixa usar
     * quem paga, o inverso disto e o que custa dinheiro; este lado custa
     * confianca, e vale igual.
     *
     * A LIGACAO DURAVEL E O `stripe_subscription_id`, que `reclamar_compra` ja
     * gravou. E ela e mais fiavel do que os metadados: os metadados descrevem o
     * momento da compra, a tabela descreve quem e o dono agora.
     */
    let donoDoEvento = userId;
    if (!donoDoEvento && subscriptionId) {
      const { data: assinatura } = await admin
        .from('subscriptions')
        .select('user_id')
        .eq('stripe_subscription_id', subscriptionId)
        .maybeSingle();
      donoDoEvento = string(assinatura?.user_id);
    }

    if (donoDoEvento && subscriptionId && (eventType.startsWith('customer.subscription.') || eventType === 'checkout.session.completed')) {
      const { data: existing } = await admin.from('subscriptions').select('eligibility_status').eq('stripe_subscription_id', subscriptionId).maybeSingle();
      const status = eventType === 'checkout.session.completed' ? 'pending' : string(object.status);
      const price = ((object.items as Record<string, unknown> | undefined)?.data as Array<Record<string, unknown>> | undefined)?.[0]?.price as Record<string, unknown> | undefined;
      const priceId = string(price?.id);
      const currency = string(price?.currency) || string(object.currency);
      const unitAmount = typeof price?.unit_amount === 'number' ? price.unit_amount / 100 : null;
      const customerDetails = object.customer_details as Record<string, unknown> | undefined;
      const billingAddress = customerDetails?.address as Record<string, unknown> | undefined;
      const billingCountry = countryFrom(billingAddress?.country);
      const config = billingConfig(merchant);
      const { data: profile } = await admin.from('profiles').select('business_country').eq('id', donoDoEvento).maybeSingle();
      const businessCountry = countryFrom(profile?.business_country);
      const eligibilityStatus = eventType === 'checkout.session.completed'
        ? (config && countryIsEligible(config, billingCountry) && billingCountry === businessCountry ? 'verified' : 'mismatch')
        : existing?.eligibility_status || 'pending';
      /**
       * O FIM DO PERIODO MUDOU DE SITIO.
       *
       * O Stripe passou a devolver `current_period_start`/`end` DENTRO de cada
       * item da assinatura, e nao no topo do objeto. Ler so o topo devolve
       * nulo — e foi o que aconteceu na primeira compra real do produto, em
       * 04/09/2026: assinatura activa, e nenhuma data de renovacao em lado
       * nenhum. O dono nao tinha como saber ate quando pagou.
       *
       * Le-se o topo primeiro, para nao partir contas antigas que ainda o
       * tenham, e cai-se para o item.
       */
      const itens = (object.items as Record<string, unknown> | undefined)?.data as Array<Record<string, unknown>> | undefined;
      const primeiroItem = itens?.[0];
      const inicioDoPeriodo = object.current_period_start ?? primeiroItem?.current_period_start;
      const fimDoPeriodo = object.current_period_end ?? primeiroItem?.current_period_end;

      const record: Record<string, unknown> = {
        user_id: donoDoEvento,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        market: merchant,
        merchant,
        stripe_price_id: priceId,
        billing_country: billingCountry,
        eligibility_status: eligibilityStatus,
        plan_name: 'Binno',
        status,
        currency,
        price_per_month: unitAmount,
        current_period_start: unixToIso(inicioDoPeriodo),
        current_period_end: unixToIso(fimDoPeriodo),
        cancel_at: unixToIso(object.cancel_at),
      };

      /**
       * A ELEGIBILIDADE NAO PODE SER REBAIXADA POR UMA CORRIDA.
       *
       * O Stripe entrega `customer.subscription.created` e
       * `checkout.session.completed` ao mesmo tempo, e as duas chamadas correm
       * em paralelo. Na primeira compra real, as duas foram recebidas no mesmo
       * microssegundo: a do checkout calculou `verified`, e a da subscricao —
       * que leu `existing` ANTES de a outra gravar — escreveu `pending` por
       * cima.
       *
       * `pending` nao e um detalhe de registo: o portal do Stripe so abre para
       * `verified` (ver `billing-checkout`, accao `portal`). Ou seja, a corrida
       * deixou o dono SEM CONSEGUIR CANCELAR — a promessa "cancele quando
       * quiser" partida por uma ordem de chegada.
       *
       * So o evento do checkout sabe o pais de cobranca. Os outros deixam esta
       * coluna em paz: quem nao sabe nao escreve.
       */
      if (eventType !== 'checkout.session.completed') delete record.eligibility_status;
      // The Checkout receipt belongs to the subscription too. Do not erase it
      // when Stripe later sends a subscription.updated event.
      if (eventType === 'checkout.session.completed') record.checkout_session_id = string(object.id);
      const { error } = await admin.from('subscriptions').upsert(record, { onConflict: 'stripe_subscription_id' });
      if (error) throw error;

      // E se a subscricao chegou primeiro, a linha nasceu sem elegibilidade
      // nenhuma. Preenche-la aqui, e SO quando esta vazia, fecha o outro lado
      // da corrida sem nunca rebaixar o que o checkout ja tenha decidido.
      if (eventType !== 'checkout.session.completed') {
        await admin.from('subscriptions')
          .update({ eligibility_status: 'pending' })
          .eq('stripe_subscription_id', subscriptionId)
          .is('eligibility_status', null);
      }
      if (eligibilityStatus === 'verified') {
        await admin.from('profiles').update({
          subscription_plan: 'Binno',
          subscription_status: status,
          subscription_start_date: unixToIso(object.current_period_start),
          subscription_end_date: unixToIso(object.current_period_end),
        }).eq('id', donoDoEvento);
      }
    }
    await admin.from('billing_webhook_events').update({ processed_at: new Date().toISOString() }).eq('merchant', merchant).eq('stripe_event_id', eventId);
    return json({ received: true });
  } catch (error) {
    const detail = error instanceof Error ? error.message.slice(0, 500) : 'Unknown processing error';
    console.error('Stripe webhook processing error', detail);
    await admin.from('billing_webhook_events').update({ processing_error: detail }).eq('merchant', merchant).eq('stripe_event_id', eventId);
    return json({ error: 'Webhook processing failed.' }, 500);
  }
});
