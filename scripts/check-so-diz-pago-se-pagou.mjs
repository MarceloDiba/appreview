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
// A ETIQUETA, E NAO A FRASE. Uma versao anterior procurava `Pagamento
// confirmado` em qualquer sitio do ficheiro e encontrava-a no COMENTARIO que
// explica o defeito — o guarda dava vermelho a acusar o texto que documenta o
// conserto. So `>...<` acerta no que o cliente le.
//
// HOJE A FRASE NAO EXISTE EM ETIQUETA NENHUMA, e e essa a regra: a tela nunca
// afirma pagamento, com bilhete ou sem ele. A sessao de QA mostrou que o
// portao sozinho nao chegava — `?compra=cs_live_inventado` bastava para o
// produto afirmar um facto do Stripe a partir de uma string no endereco.
const afirmacao = pagina.indexOf('>Pagamento confirmado<');
// O TRECHO DO CAMINHO SEM BILHETE vai do portao ate ao `return` principal, que
// e onde esse ramo acaba. Uma versao anterior cortava na frase "Pagamento
// confirmado"; quando essa frase deixou de existir, o corte passou a apanhar o
// ficheiro inteiro — incluindo o formulario de cadastro — e o guarda acusou um
// defeito que nao existia. A fronteira tem de ser estrutural, nao textual.
const fimDoPortao = portao === -1 ? -1 : pagina.indexOf('\n  return (', portao);
const semBilhete = portao === -1 || fimDoPortao === -1
  ? '' : pagina.slice(portao, fimDoPortao);

const requisitos = [
  ['existe um portao que depende do bilhete', portao !== -1],

  // SE O TRECHO SAIR VAZIO, O GUARDA MENTE: todas as regras abaixo passariam
  // sem medir nada. Exigir tamanho e o que impede um verde vazio.
  ['o trecho sem bilhete foi mesmo recortado', semBilhete.length > 400],

  // NENHUMA ETIQUETA AFIRMA PAGAMENTO, em caminho nenhum. Um bilhete no
  // endereco prova que alguem escreveu um bilhete no endereco.
  ['a tela nunca afirma que o pagamento foi confirmado', afirmacao === -1],

  // E A CONFIRMACAO, QUANDO CHEGA, VEM DO SERVIDOR. `reclamar-compra` responder
  // com sucesso e a unica coisa nesta pagina que sabe se houve pagamento.
  ['a confirmacao so e dita depois de o servidor responder',
    /data\?\.reclamada[\s\S]{0,600}toast\.success\(/.test(pagina)],

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
