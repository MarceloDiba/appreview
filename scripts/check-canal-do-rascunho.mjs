#!/usr/bin/env node
// O rascunho do modelo tem dois canais, e as regras deles sao diferentes.
//
// Em publico, prometer reembolso ou refeicao gratis ensina o proximo leitor
// que uma avaliacao de uma estrela vale dinheiro: por isso o canal publico
// recusa reparacao. Em privado, oferecer resolver e a coisa certa a dizer, e o
// molde ja tem uma variante inteira para isso: por isso o canal privado
// PERMITE reparacao, e ganha no lugar a proibicao de trocar seja o que for por
// apagar, mudar ou melhorar uma avaliacao publica, que viola as politicas do
// Google e pode custar a ficha do cliente.
//
// POR QUE ESTE GUARDA NAO PROCURA NOMES
//
// Procurar `PEDIDO_PRIVADO` no arquivo prova que a palavra esta escrita, nao
// que o texto certo e recusado. Vinte e uma levas de assercoes que nao podiam
// falhar sairam deste repositorio nesta semana por causa exactamente disso.
//
// Este guarda EXTRAI as listas de recusa do proprio arquivo da funcao e passa
// texto por elas. Se alguem enfraquecer um padrao, o texto que devia ser
// recusado passa a passar e a assercao fica vermelha. Se alguem apagar a
// diferenca entre os canais, a prova de que a reparacao passa em privado e nao
// passa em publico cai junto.
//
// Cada caso abaixo foi provado vermelho quebrando exactamente a regra que ele
// nomeia, em 01/09/2026.
import { readFileSync } from 'node:fs';

const FUNCAO = 'supabase/functions/sugerir-resposta/index.ts';
const CLIENTE = 'src/lib/sugerirResposta.ts';
const POLITICA = 'src/lib/rascunhoDoModelo.ts';

const fonte = readFileSync(FUNCAO, 'utf8');

const falhas = [];
let verificadas = 0;
const exigir = (rotulo, condicao) => { verificadas += 1; if (!condicao) falhas.push(rotulo); };

// 1. As listas, tiradas do arquivo e executadas.
//
// A extracao vai do primeiro `const` das regras ate ao comentario que abre a
// escolha do modelo. Se o arquivo for reorganizado e o bloco deixar de ser
// encontrado, isto morre em vez de ficar verde por nao ter o que testar.
const inicio = fonte.indexOf('const TRAVESSAO =');
const fim = fonte.indexOf('// Escolhido em 31/08/2026');
if (inicio < 0 || fim < 0 || fim <= inicio) {
  console.error('Canal do rascunho: nao encontrei o bloco de regras em %s. O guarda nao pode provar nada assim.', FUNCAO);
  process.exit(1);
}
const bloco = fonte
  .slice(inicio, fim)
  .replace(/^type .*$/gm, '')
  .replace(/: Regra\[\]/g, '')
  .replace(/: Record<Canal, Regra\[\]>/g, '');

let PROIBIDO;
try {
  PROIBIDO = new Function(`${bloco}\nreturn PROIBIDO;`)();
} catch (erro) {
  console.error('Canal do rascunho: o bloco de regras nao executa (%s).', String(erro).slice(0, 120));
  process.exit(1);
}

const recusa = (canal, texto) => (PROIBIDO[canal] || []).some(({ padrao }) => padrao.test(texto));

exigir('a funcao define os dois canais', Boolean(PROIBIDO?.public) && Boolean(PROIBIDO?.private));

const TRAVESSAO = String.fromCharCode(0x2014);

// 2. O que os DOIS canais recusam sempre.
for (const [canal] of [['public'], ['private']]) {
  exigir(`${canal}: o travessao e recusado, porque e a marca mais reconhecivel de texto gerado`,
    recusa(canal, `Lamento o atraso ${TRAVESSAO} vamos melhorar.`));
  exigir(`${canal}: revelar automacao e recusado, porque quebra a voz do dono`,
    recusa(canal, 'Sou uma inteligencia artificial a responder por este negocio.'));
  exigir(`${canal}: revelar automacao tambem e recusado em ingles`,
    recusa(canal, 'I am an AI assistant replying on behalf of the owner.'));
}

// 3. O que SO o publico recusa: prometer reparacao em nome do dono.
exigir('publico: prometer devolver o valor e recusado (pt)',
  recusa('public', 'Lamento muito. Vamos devolver o valor da refeicao.'));
exigir('publico: prometer desconto e recusado (es)',
  recusa('public', 'Lo siento mucho. Te damos un descuento en tu proxima visita.'));
exigir('publico: prometer reembolso e recusado (en)',
  recusa('public', 'I am sorry. We will issue a full refund for your order.'));

// 4. E a prova que da sentido ao canal privado: o MESMO texto passa em privado.
//
// Se estas quatro ficarem verdes por o privado ter herdado a lista do publico,
// o dono recebe um recado proibido de oferecer o que ele quer oferecer, que e
// a razao inteira de este canal existir.
exigir('privado: oferecer devolver o valor PASSA, porque em privado e a coisa certa (pt)',
  !recusa('private', 'Lamento muito. Vamos devolver o valor da refeicao.'));
exigir('privado: oferecer desconto PASSA (es)',
  !recusa('private', 'Lo siento mucho. Te damos un descuento en tu proxima visita.'));
exigir('privado: oferecer reembolso PASSA (en)',
  !recusa('private', 'I am sorry. We will issue a full refund for your order.'));
exigir('privado: convidar de volta por conta da casa PASSA, que e a variante com-reparacao do molde',
  !recusa('private', 'Gostaria de receber voce de novo, por nossa conta, e mostrar como deveria ter sido.'));

// 5. O que SO o privado recusa: trocar qualquer coisa pela avaliacao publica.
exigir('privado: trocar reparacao por apagar a avaliacao e recusado (pt)',
  recusa('private', 'Oferecemos um jantar se puder apagar a avaliacao que deixou.'));
exigir('privado: pedir para mudar a nota e recusado (pt)',
  recusa('private', 'Depois de resolvermos, pode mudar a sua avaliacao no Google?'));
exigir('privado: a ordem inversa da frase tambem e recusada (pt)',
  recusa('private', 'A avaliacao publica, se quiser retirar depois, fica ao seu criterio.'));
exigir('privado: trocar por mudar a resenha e recusado (es)',
  recusa('private', 'Te invitamos a cenar si puedes cambiar la resena que dejaste.'));
exigir('privado: trocar por apagar a review e recusado (en)',
  recusa('private', 'We will refund you in exchange for deleting the review you left.'));
exigir('privado: pedir para subir a nota e recusado (en)',
  recusa('private', 'Once we fix this, would you consider updating your rating?'));

// 6. E o falso positivo que o corte de pontuacao existe para evitar.
//
// O texto abaixo tem a palavra de avaliacao E um verbo de mudar, mas com um
// ponto final entre os dois: sao duas frases sem relacao, e nao uma troca. A
// primeira versao desta assercao usava um texto SEM palavra de avaliacao
// nenhuma, e por isso ficava verde com qualquer janela, incluindo uma que
// atravessasse pontuacao. Ficava verde tambem com a regra partida, ou seja,
// nao provava coisa nenhuma. Achado ao tentar prova-la vermelha em 01/09/2026.
exigir('privado: um ponto final entre a avaliacao e o verbo separa duas frases, e nao e troca',
  !recusa('private', 'Lamento a avaliacao que teve de deixar. Vou melhorar o turno da noite.'));

// 7. Um recado privado real, dos que o modelo devolveu no teste de 01/09/2026,
// tem de atravessar a lista inteira sem ser recusado. Sem isto, um canal
// apertado de mais entregaria o template sempre e ninguem daria por ela.
exigir('privado: um recado real do modelo atravessa a lista',
  !recusa('private', 'Ola, sinto muito por ter esperado 40 minutos e ter saido sem ser atendido. Gostaria de entender melhor o que aconteceu para que isso nao se repita. Pode dizer-me em que dia e a que horas veio ate ca? Quero fazer o possivel para melhorar.'));

// 8. O canal chega no corpo do pedido e o PADRAO e o publico, que e o canal com
// as regras mais apertadas. Um chamador antigo que nao saiba do campo tem de
// continuar a receber o que recebia.
const escolhaDoCanal = fonte.match(/const canal: Canal = ([^;]+);/);
exigir('a funcao le o canal do corpo do pedido', escolhaDoCanal !== null);
if (escolhaDoCanal) {
  exigir(
    'qualquer valor que nao seja exactamente private cai no publico',
    escolhaDoCanal[1].replace(/\s+/g, ' ').trim() === "corpo.channel === 'private' ? 'private' : 'public'",
  );
}

// 9. Os dois pedidos existem e dizem coisas opostas sobre reparacao. Aqui a
// verificacao e mesmo textual, porque um pedido ao modelo E texto: o que se
// prova e que a instrucao que separa os canais nao foi apagada.
const pedidoPrivado = fonte.slice(fonte.indexOf('const PEDIDO_PRIVADO'), fonte.indexOf('Deno.serve'));
const pedidoPublico = fonte.slice(fonte.indexOf('const PEDIDO_PUBLICO'), fonte.indexOf('const PEDIDO_PRIVADO'));
exigir('o pedido publico continua a proibir prometer reparacao',
  /Never promise a refund, discount, voucher, free item or any compensation/.test(pedidoPublico));
exigir('o pedido privado autoriza oferecer resolver',
  /You MAY offer to fix it/.test(pedidoPrivado));
exigir('o pedido privado proibe negociar a avaliacao publica',
  /NEVER offer anything in exchange for deleting, changing, improving or updating a public review/.test(pedidoPrivado));
exigir('o pedido privado diz ao modelo que isto nao e publicado',
  /not published anywhere/.test(pedidoPrivado));
exigir('os dois pedidos continuam a declarar o idioma antes de escrever',
  /Identify the language/.test(pedidoPublico) && /Identify the language/.test(pedidoPrivado));

// 9b. A variante do portugues segue o pais do NEGOCIO, com a mesma regra do
// molde. Ao provar o canal privado em 01/09/2026, os quatro rascunhos sairam em
// brasileiro para um negocio em Portugal: o modelo escreve na lingua do
// cliente, mas a lingua nao escolhe a variante. Para o piloto, que e em
// Portugal, um recado do dono escrito em brasileiro le-se como escrito por
// outra pessoa.
//
// A regra e EXECUTADA, e nao procurada: extrai-se a funcao do arquivo e
// pergunta-se-lhe por cada pais. Uma condicao invertida, ou um `toUpperCase`
// que fizesse 'br' passar a brasileiro, ficaria verde numa busca por nome.
const inicioVariante = fonte.indexOf('const VARIANTE_DO_PORTUGUES');
const fimVariante = fonte.indexOf('const PEDIDO_PUBLICO');
exigir('a variante do portugues continua a existir e a ser legivel',
  inicioVariante >= 0 && fimVariante > inicioVariante);
if (inicioVariante >= 0 && fimVariante > inicioVariante) {
  const VARIANTE = new Function(
    `${fonte.slice(inicioVariante, fimVariante).replace(/: string \| null/g, '')}\nreturn VARIANTE_DO_PORTUGUES;`,
  )();
  exigir('o pais BR pede portugues do Brasil', /Brazilian Portuguese/.test(VARIANTE('BR')));
  for (const pais of ['PT', 'ES', '', null]) {
    exigir(
      `o pais ${pais === null ? 'ausente' : `"${pais}"`} pede portugues de Portugal`,
      /European Portuguese/.test(VARIANTE(pais)),
    );
  }
  // A mesma exigencia que `check-reply-locale-br` faz ao molde: 'br' minusculo
  // NAO e 'BR'. Duas regras diferentes para a mesma decisao dariam ao dono um
  // molde numa variante e um rascunho noutra, na mesma tela.
  exigir('o pais "br" em minusculas nao vira brasileiro, como no molde',
    /European Portuguese/.test(VARIANTE('br')));
}
exigir('os dois pedidos aplicam a variante do portugues',
  /VARIANTE_DO_PORTUGUES\(pais\)/.test(pedidoPublico) && /VARIANTE_DO_PORTUGUES\(pais\)/.test(pedidoPrivado));

// 10. O canal tem de atravessar o cliente ate a funcao. Sem esta linha, tudo
// acima esta correcto e o painel continua a pedir sempre em publico.
const cliente = readFileSync(CLIENTE, 'utf8');
exigir('o cliente envia o canal no corpo do pedido', /channel: entrada\.channel/.test(cliente));
exigir('o cliente envia o nome de quem escreveu, que o recado privado usa para abrir',
  /customerName: entrada\.customerName/.test(cliente));

const politica = readFileSync(POLITICA, 'utf8');
exigir('a entrada do rascunho carrega o canal', /channel: ReplyChannel/.test(politica));
exigir('o cliente envia o pais do negocio, que escolhe a variante do portugues',
  /businessCountry: entrada\.businessCountry/.test(cliente));
exigir('a entrada do rascunho carrega o pais do negocio', /businessCountry: string \| null/.test(politica));
// A leitura tem de ser DENTRO da entrada de `pedirRascunho`, e nao no arquivo
// inteiro. A primeira versao procurava `businessCountry,` no ficheiro todo e
// ficava verde com a linha apagada do pedido, porque `buildReplySuggestions`
// tem uma propriedade com o mesmo nome umas linhas abaixo. Apanhado ao tentar
// prova-la vermelha em 01/09/2026.
for (const [tela, arquivo] of [
  ['/reviews', 'src/components/dashboard/ReplySuggestions.tsx'],
  ['o cockpit', 'src/components/dashboard/ApprovedCockpitDashboard.tsx'],
]) {
  const entrada = readFileSync(arquivo, 'utf8').match(/pedirRascunho\([\s\S]*?\{([\s\S]*?)\},/);
  exigir(`${tela}: a entrada do pedido continua legivel`, entrada !== null);
  if (entrada) {
    exigir(`${tela} passa o pais do negocio no pedido`, /\n\s*businessCountry,\n/.test(entrada[1]));
  }
}

if (falhas.length) {
  console.error('Canal do rascunho: %d protecao(oes) falharam.\n', falhas.length);
  for (const falha of falhas) console.error(' - %s', falha);
  process.exit(1);
}
console.log(`Canal do rascunho: ${verificadas} protecoes verdes.`);
