import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// O que acontece no Stripe depois da compra chega ao banco.
//
// POR QUE ESTE GUARDA EXISTE
//
// O webhook procurava o dono do evento SO nos metadados: `metadata.user_id` ou
// `client_reference_id`. Os dois existem apenas quando quem comprou JA TINHA
// CONTA.
//
// Quem compra sem conta — que e TODO CLIENTE NOVO — gera uma assinatura cujos
// metadados dizem apenas `{ market, sem_conta: 1 }`. O dono aparece depois,
// quando `reclamar_compra` liga a compra a conta recem-criada. Sem procurar o
// dono na tabela, todo evento seguinte dessa assinatura era descartado em
// silencio, e a linha ficava congelada no estado em que nasceu.
//
// MEDIDO EM PRODUCAO, 05/09/2026. O Marcelo comprou deslogado com um cupom de
// 100%, a conta nasceu, e o caminho inteiro funcionou em 28 segundos. Ao
// cancelar no Stripe, o `customer.subscription.deleted` chegou, ficou marcado
// como PROCESSADO — e a tabela continuou `active`, com o acesso aberto.
//
// Cancelar nao tirava o acesso. E o mesmo buraco engoliria pagamento falhado,
// assinatura expirada e mudanca de plano: tudo o que acontece DEPOIS da compra,
// para exactamente o publico que o produto quer ter.
//
// A LIGACAO DURAVEL E O `stripe_subscription_id`. Os metadados descrevem o
// momento da compra; a tabela descreve quem e o dono agora.

const raiz = resolve(import.meta.dirname, '..');
const webhook = readFileSync(resolve(raiz, 'supabase/functions/stripe-billing-webhook/index.ts'), 'utf8');

const posProcura = webhook.indexOf('let donoDoEvento = userId;');
const posRamo = webhook.indexOf('if (donoDoEvento && subscriptionId &&');

// O BLOCO DA PROCURA, RECORTADO. A primeira versao deste guarda mediu
// `.eq('stripe_subscription_id', subscriptionId)` no ficheiro inteiro — e essa
// linha ja existia noutro sitio, na leitura do `eligibility_status`. Trocar a
// procura do dono para o cliente do Stripe deixava a regra VERDE por causa da
// outra ocorrencia. Apanhado por mutacao.
const blocoDaProcura = posProcura !== -1 && posRamo > posProcura
  ? webhook.slice(posProcura, posRamo)
  : '';
// E se o recorte vier vazio, o guarda recusa em vez de passar: uma assercao
// sem o que medir devolve verdadeiro, e e a armadilha mais frequente aqui.
if (!blocoDaProcura.trim()) {
  console.error('O cancelamento chega: nao consegui recortar o bloco da procura do dono.');
  console.error('Ou o formato mudou, ou a procura desapareceu — nos dois casos isto nao esta a medir nada.');
  process.exit(1);
}

const requisitos = [
  ['o webhook procura o dono na tabela quando o evento nao o traz',
    /donoDoEvento = string\(assinatura\?\.user_id\)/.test(webhook)],

  // A PROCURA PELO ID DA ASSINATURA, e nao pelo cliente do Stripe: um mesmo
  // cliente pode ter mais do que uma assinatura, e o evento e de uma so.
  ['a procura usa o id da assinatura',
    /\.eq\('stripe_subscription_id', subscriptionId\)/.test(blocoDaProcura)],

  // A ORDEM DECIDE SE O CONSERTO EXISTE. Procurar depois do ramo seria codigo
  // inalcancavel no unico caso que importa.
  ['a procura vem antes do ramo que grava',
    posProcura !== -1 && posRamo !== -1 && posProcura < posRamo],

  // E O RAMO TEM DE USAR O DONO RESOLVIDO. Resolver e continuar a testar o
  // `userId` cru seria o defeito com um passo a mais.
  ['o ramo decide pelo dono resolvido, e nao pelo do evento',
    !/if \(userId && subscriptionId &&/.test(webhook)],
];

const falhas = requisitos.filter(([, ok]) => !ok).map(([rotulo]) => rotulo);
if (falhas.length) {
  console.error(`O cancelamento chega, regra quebrada:\n- ${falhas.join('\n- ')}`);
  process.exit(1);
}

console.log(`O cancelamento chega: ${requisitos.length} regras conferidas.`);
