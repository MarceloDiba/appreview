import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// A tela so afirma pagamento se houver prova de pagamento.
//
// POR QUE ESTE GUARDA EXISTE
//
// Ate 05/09/2026 `/bem-vindo` desenhava "Pagamento confirmado" SEMPRE, antes de
// saber se existia compra. Quem abrisse o endereco a mao — ou o guardasse nos
// favoritos depois de comprar, e voltasse la noutro dia — via o produto afirmar
// um pagamento que nao aconteceu, e por baixo um formulario a convidar a criar
// conta.
//
// Duas coisas erradas ao mesmo tempo: MENTIA, e abria uma porta de cadastro que
// a decisao "so usa quem paga" tinha fechado em todo o resto do produto.
//
// Achado pela sessao de QA em 05/09/2026 (quebra 3).
//
// COMO VERIFICA
//
// Exige que a afirmacao esteja depois de um portao que depende do bilhete, e
// que o caminho sem bilhete leve as duas saidas — comprar, para quem nunca
// pagou, e falar connosco, para quem pagou e perdeu o link. A segunda importa
// tanto como a primeira: essa pessoa ja deu dinheiro e nao pode ficar sem porta.

const raiz = resolve(import.meta.dirname, '..');
const pagina = readFileSync(resolve(raiz, 'src/pages/BemVindo.tsx'), 'utf8');

// O portao tem de vir ANTES da afirmacao no ficheiro. Se a afirmacao vier
// primeiro, ela e o `return` que corre — e o portao nunca chega a ser lido.
const portao = pagina.indexOf('if (!bilhete && !user)');
// A ETIQUETA, E NAO A FRASE. A primeira versao procurava `Pagamento
// confirmado` em qualquer sitio do ficheiro e encontrava-a no COMENTARIO que
// explica o defeito, logo no topo — o guarda dava vermelho a acusar o texto que
// documenta o conserto. Medir `>Pagamento confirmado<` acerta na etiqueta que
// o cliente le, que e a unica que afirma alguma coisa.
const afirmacao = pagina.indexOf('>Pagamento confirmado<');
const semBilhete = portao === -1 ? '' : pagina.slice(portao, afirmacao > portao ? afirmacao : undefined);

const requisitos = [
  ['existe um portao que depende do bilhete', portao !== -1],

  // MEDE A ORDEM, e nao a existencia. Um portao escrito depois do `return` que
  // afirma o pagamento e codigo morto, e o guarda tem de saber a diferenca.
  ['o portao vem antes da afirmacao de pagamento',
    portao !== -1 && afirmacao !== -1 && portao < afirmacao],

  ['quem chega sem bilhete nao le que o pagamento foi confirmado',
    !semBilhete.includes('>Pagamento confirmado<')],

  // A SAIDA DE QUEM NUNCA PAGOU.
  ['quem nunca pagou tem por onde comprar', /#plano/.test(semBilhete)],

  // E A SAIDA DE QUEM PAGOU E SE PERDEU. Sem isto, o conserto trocaria uma
  // mentira por uma parede: a pessoa que ja pagou ficaria sem acesso e sem
  // ninguem com quem falar.
  ['quem ja pagou tem por onde falar connosco',
    /linkDoWhatsAppDoBinno\(/.test(semBilhete)],

  // E NAO PODE HAVER CADASTRO NESSE CAMINHO. Era a segunda metade do defeito:
  // a porta de criar conta aberta a quem nao comprou.
  ['o caminho sem bilhete nao oferece criar conta',
    !/BotaoDoGoogle|criarConta/.test(semBilhete)],
];

const falhas = requisitos.filter(([, ok]) => !ok).map(([rotulo]) => rotulo);
if (falhas.length) {
  console.error(`So diz pago se pagou, regra quebrada:\n- ${falhas.join('\n- ')}`);
  process.exit(1);
}

console.log(`So diz pago se pagou: ${requisitos.length} regras conferidas.`);
