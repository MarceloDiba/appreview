import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// O canal oficial tem de saber a diferenca entre "aceite" e "entregue".
//
// O QUE ESTE GUARDA PROTEGE
//
// Ate 05/09/2026 o `whatsapp-cloud-webhook` lia apenas `value.messages`. A
// Meta entrega os recibos noutro campo do mesmo corpo, `value.statuses`, e
// ninguem o lia. Medido pela sessao de QA no banco de producao:
//
//   meta-cloud : accepted 3, delivered 0, read 0
//   openwa     : delivered 7      <- o canal ja MORTO confirmava entrega
//
// Nao era so um numero feio. `ESTADOS_QUE_PROVAM_ENTREGA` promete que a tela so
// afirma ligacao ativa com `accepted`, `delivered` ou `read`. Sem recibos,
// `accepted` era o unico estado alcancavel no canal oficial — e `accepted`
// prova apenas que a Meta recebeu o pedido, nao que a mensagem chegou ao
// telemovel do dono. A promessa ficava reduzida a nada sem que a tela mudasse.
//
// COMO ESTE GUARDA VERIFICA
//
// Le o ficheiro da funcao e o modulo do painel. Nao chama a Meta: o que se
// protege aqui e que o codigo LEIA o campo certo, ESCREVA nas duas tabelas e
// NUNCA RECUE um estado — nao a resposta da Meta, que nao e nossa.

const raiz = resolve(import.meta.dirname, '..');
const webhook = readFileSync(
  resolve(raiz, 'supabase/functions/whatsapp-cloud-webhook/index.ts'), 'utf8');
const painel = readFileSync(resolve(raiz, 'src/lib/whatsappConnection.ts'), 'utf8');

const requisitos = [
  // O CAMPO CERTO. `statuses` e onde a Meta poe os recibos; ler `messages` e
  // achar que basta foi exactamente o defeito.
  ['a funcao le os recibos que a Meta manda em value.statuses',
    /valor\.statuses/.test(webhook)],

  // OS TRES ESTADOS QUE IMPORTAM, mapeados a partir do vocabulario da Meta.
  // `sent` da Meta e o nosso `accepted`; sem esta traducao um recibo `sent`
  // nao casaria com nenhum estado nosso e seria descartado em silencio.
  ['o vocabulario da Meta e traduzido para os estados do outbox',
    /sent: 'accepted'/.test(webhook)
    && /delivered: 'delivered'/.test(webhook)
    && /read: 'read'/.test(webhook)],

  // ESCREVE NAS DUAS TABELAS. O historico em `whatsapp_delivery_events` e o
  // estado corrente em `whatsapp_outbox`. So o segundo alimenta a tela; so o
  // primeiro permite perceber depois o que aconteceu.
  ['o recibo entra no historico de entregas',
    /from\('whatsapp_delivery_events'\)[\s\S]{0,120}\.insert\(/.test(webhook)],
  ['o recibo atualiza o estado do outbox',
    /from\('whatsapp_outbox'\)[\s\S]{0,200}\.update\(\{[\s\S]{0,120}status: estado/.test(webhook)],

  // E NUNCA RECUA. A Meta nao garante ordem: um `delivered` atrasado pode
  // chegar depois do `read`. Sem esta comparacao, gravar por cima apagaria a
  // informacao melhor — e a tela passaria a dizer menos do que ja sabia.
  //
  // MEDE A COMPARACAO, e nao a existencia da escada. Uma versao anterior desta
  // assercao procurava so `const ESCADA`, e apagar o `if (!avanca)` deixava-a
  // verde com a escada intacta e inutil.
  ['um recibo atrasado nao faz o estado recuar',
    /const ESCADA = \[/.test(webhook)
    && /novoPasso > agora/.test(webhook)
    && /if \(!avanca\)[\s\S]{0,160}continue;/.test(webhook)],

  // O `failed` E TERMINAL MAS NAO APAGA UMA ENTREGA. Se a mensagem chegou ao
  // telemovel, chegou — um erro posterior nao desfaz isso.
  ['o failed nao apaga uma entrega ja confirmada',
    /agora < ESCADA\.indexOf\('delivered'\)/.test(webhook)],

  // A RAZAO DO GUARDA, medida e nao assumida. Se um dia alguem tirar
  // `delivered` e `read` desta lista, o guarda deixa de proteger o que pensa
  // proteger e tem de dizer isso em vez de continuar verde.
  ['o painel continua a exigir mais do que accepted para provar entrega',
    /ESTADOS_QUE_PROVAM_ENTREGA = \['accepted', 'delivered', 'read'\]/.test(painel)],
];

const falhas = requisitos.filter(([, ok]) => !ok).map(([rotulo]) => rotulo);
if (falhas.length) {
  console.error(`Recibo do WhatsApp com regra quebrada:\n- ${falhas.join('\n- ')}`);
  process.exit(1);
}

console.log(`Recibo do WhatsApp verificado: ${requisitos.length} regras conferidas.`);
