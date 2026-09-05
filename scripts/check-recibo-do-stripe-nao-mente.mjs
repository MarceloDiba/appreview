// O registo do evento do Stripe nao pode mentir sobre o que fez.
//
// POR QUE ISTO EXISTE
//
// Em 05/09/2026 a sessao de QA mostrou que `processed_at` mentia nas duas
// direccoes ao mesmo tempo, e cada direccao ja tinha custado alguma coisa:
//
//   - POR OMISSAO: a compra de quem ainda nao tem conta devolvia antes de
//     marcar. A entrada de dinheiro de um cliente novo — o evento mais
//     importante que este servico recebe — ficava para sempre por processar.
//   - POR EXCESSO: a marca era posta no fim, mesmo quando o bloco de dentro nao
//     corria. O cancelamento do Marcelo chegou, nao encontrou dono, nao tirou o
//     acesso, e ficou registado como processado.
//
// O conserto foi juntar as duas coisas num gesto so: `concluir(decisao)` marca
// E diz o que fez. Este guarda existe para que nao volte a haver uma saida com
// exito que escape a ela.
import { readFileSync } from 'node:fs';

const CAMINHO = 'supabase/functions/stripe-billing-webhook/index.ts';
const fonte = readFileSync(CAMINHO, 'utf8');

const falhas = [];
const exigir = (o_que, verdade) => { if (!verdade) falhas.push(o_que); };

// A FATIA E O BLOCO `try`, e nao o ficheiro.
//
// Fora dele ha uma saida legitima que NAO deve marcar: o evento duplicado, que
// ja foi marcado na primeira entrega. Medir o ficheiro inteiro dava-a como
// violacao e obrigaria a afrouxar a regra ate ela nao medir nada.
const inicio = fonte.indexOf('\n  try {\n');
const fim = fonte.indexOf('\n  } catch (error) {');
if (inicio === -1 || fim === -1 || fim <= inicio) {
  console.error('Recibo do Stripe: nao encontrei o bloco try/catch do tratamento.');
  console.error('A fatia e a unidade de medida deste guarda; sem ela nao se mede nada.');
  process.exit(1);
}
const tratamento = fonte.slice(inicio, fim);

// AS DUAS PONTAS DA MENTIRA, cada uma medida por si.
exigir('marcar e dizer o que fez sao o mesmo gesto',
  /const concluir = async \(decisao: string[\s\S]{0,400}?processed_at: new Date\(\)\.toISOString\(\), decisao\b/.test(fonte));

// Toda a saida com exito de dentro do tratamento passa por `concluir`. Um
// `return json({ received: true ...})` cru ali dentro e exactamente o defeito
// que a QA apanhou.
const saidasCruas = tratamento.match(/return json\(\{\s*received: true/g) || [];
exigir('nenhuma saida com exito devolve sem marcar', saidasCruas.length === 0);
exigir('a compra de quem nao tem conta e marcada como tal',
  /return await concluir\('compra-sem-conta'/.test(tratamento));
exigir('a assinatura gravada e marcada como tal',
  /return await concluir\('assinatura-gravada'\)/.test(tratamento));
exigir('o que este servico nao trata fica dito, e nao passa por feito',
  /return await concluir\('ignorado'\)/.test(tratamento));

// O `sem-dono` E A AVARIA, e a unica das quatro decisoes que precisa de ser
// vista. Tem de ser decidido ANTES do ramo que grava, senao um evento de
// assinatura sem dono volta a cair pelo fim.
const posicaoSemDono = tratamento.indexOf("concluir('sem-dono'");
const posicaoDoRamo = tratamento.indexOf('if (donoDoEvento && subscriptionId && eDeAssinatura)');
exigir('o evento de assinatura sem dono tem nome proprio',
  posicaoSemDono !== -1);
exigir('e e decidido antes do ramo que grava a assinatura',
  posicaoSemDono !== -1 && posicaoDoRamo !== -1 && posicaoSemDono < posicaoDoRamo);

// A COLUNA TEM DE EXISTIR NO REPOSITORIO. Foi por uma coluna aplicada em
// producao e ausente da migracao que a especie `feedback-sem-nota` morreu em
// silencio nesta mesma manha; o inverso — codigo que escreve uma coluna que
// nenhuma migracao cria — parte da mesma forma.
const migracoes = readFileSync('supabase/migrations/20260906000000_o_recibo_do_stripe_diz_o_que_fez.sql', 'utf8');
exigir('a coluna que o codigo escreve e criada por uma migracao',
  /alter table public\.billing_webhook_events\s+add column if not exists decisao text;/.test(migracoes));

if (falhas.length) {
  console.error(`Recibo do Stripe: ${falhas.length} protecao(oes) falharam.\n`);
  for (const f of falhas) console.error(` - ${f}`);
  process.exit(1);
}
console.log('Recibo do Stripe: 8 protecoes verdes.');
