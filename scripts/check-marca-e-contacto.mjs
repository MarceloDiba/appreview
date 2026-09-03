#!/usr/bin/env node
// A marca diz a fase, e o contacto vive num sitio so.
//
// POR QUE ESTE GUARDA EXISTE
//
// Sao dois pedidos de Marcelo de 02/09/2026, na vespera de comecar a
// prospeccao, e os dois partem-se da mesma maneira: por repeticao.
//
// O "Beta" tem de aparecer onde a marca aparece, e a marca era desenhada a mao
// em seis sitios. Um deles fica sempre para tras, e o que fica para tras e o
// menos visitado — que numa prospeccao pode ser exactamente o que o prospecto
// abre. Pior: o "Beta" vai SAIR um dia, e nessa altura tem de sair de uma vez.
//
// O numero de WhatsApp tem o mesmo problema ao contrario: escrito a mao em cada
// pagina, trocar de numero vira uma caca ao `wa.me` pelo repositorio.
//
// E ha uma terceira coisa, que e a que custa dinheiro ao cliente: na pagina do
// QR, o clique que interessa e o de avaliar o negocio. Um botao de contacto a
// competir com ele ali seria o Binno a roubar do proprio cliente. Este guarda
// exige que o botao dessa pagina seja o discreto, e que venha DEPOIS da
// escolha.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const MARCA = 'src/components/marketing/MarcaBinno.tsx';
const BOTAO = 'src/components/marketing/BotaoDeWhatsApp.tsx';
const CONTACTO = 'src/lib/contactoDoBinno.ts';
const VENDAS = 'src/pages/Index.tsx';
const NEGOCIO = 'src/pages/Review.tsx';
const MARKETING = 'src/i18n/marketing.ts';

const semComentarios = (fonte) => fonte
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, ' ')
  .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');

const ler = (caminho) => readFileSync(caminho, 'utf8');

const falhas = [];
let verificadas = 0;
const exigir = (rotulo, condicao) => { verificadas += 1; if (!condicao) falhas.push(rotulo); };

const marca = ler(MARCA);
const marcaExecutavel = semComentarios(marca);
const botao = ler(BOTAO);
const botaoExecutavel = semComentarios(botao);
const contacto = ler(CONTACTO);
const vendas = semComentarios(ler(VENDAS));
const negocio = semComentarios(ler(NEGOCIO));
const marketing = ler(MARKETING);

// 1. O SELO FICA ABAIXO DO NOME, que foi o pedido literal: "inserir o nome Beta
// abaixo da marca do Binno". `flex-col` e o que o poe abaixo; sem ele fica ao
// lado, a competir com o nome do negocio do cliente, que ja se senta a direita
// da marca nas duas barras de navegacao.
exigir('a marca empilha o selo por baixo do nome, e nao ao lado',
  /className=\{`inline-flex flex-col leading-none/.test(marcaExecutavel));
const posicaoDoNome = marcaExecutavel.indexOf('>Binno<');
const posicaoDoSelo = marcaExecutavel.indexOf('>\n        Beta\n      <');
exigir('o nome existe na marca', posicaoDoNome > 0);
exigir('o selo Beta existe na marca', posicaoDoSelo > 0);
exigir('o selo vem DEPOIS do nome na ordem da pagina',
  posicaoDoNome > 0 && posicaoDoSelo > 0 && posicaoDoNome < posicaoDoSelo);
// Quem ouve a pagina precisa de saber que isto e a fase do produto, e nao uma
// palavra solta a seguir ao nome.
exigir('o selo diz a quem ouve a pagina o que ele e',
  /aria-label="Versão beta"/.test(marcaExecutavel));

// 2. A MARCA E DESENHADA NUM SITIO SO. Esta e a assercao que impede o "Beta"
// de ficar para tras numa tela, e que faz ele sair de uma vez quando sair.
const PAGINAS_COM_MARCA = [
  'src/components/marketing/PublicMarketingNav.tsx',
  'src/components/layout/Navbar.tsx',
  'src/pages/Login.tsx',
  'src/pages/Signup.tsx',
  'src/pages/Index.tsx',
  'src/components/marketing/BinnoDemoCockpit.tsx',
];
for (const pagina of PAGINAS_COM_MARCA) {
  exigir(`${pagina} desenha a marca pelo componente partilhado`,
    /<MarcaBinno[\s/>]/.test(semComentarios(ler(pagina))));
}
// E nenhuma delas volta a escrever o nome a mao. `>Binno<` e a forma exacta que
// existia nas seis: um texto que apenas MENCIONE Binno numa frase nao dispara.
//
// A PAGINA DE VENDAS FICA DE FORA DESTA LISTA, e a razao apareceu ao tentar
// por o guarda verde: ela tem um `<p>Binno</p>` que NAO e a marca — e o nome de
// quem envia, dentro da ilustracao de uma conversa de WhatsApp. Por um "Beta"
// ali passaria a dizer que a mensagem foi enviada por "Binno Beta", que nao e
// coisa nenhuma. A marca dela, no rodape, e conferida pela assercao de cima.
const SEM_MARCA_A_MAO = PAGINAS_COM_MARCA.filter((pagina) => pagina !== 'src/pages/Index.tsx');
for (const pagina of SEM_MARCA_A_MAO) {
  exigir(`${pagina} deixou de escrever a marca a mao`,
    !/>Binno<\/(span|p|h1)>/.test(semComentarios(ler(pagina))));
}

// 3. O NUMERO VIVE NUM SITIO SO. Sem isto, trocar para um numero comercial e
// uma caca ao `wa.me` pelo repositorio, e o que sobra esquecido e o menos
// visitado.
const ficheirosDoSrc = [];
const varrer = (dir) => {
  for (const entrada of readdirSync(dir, { withFileTypes: true })) {
    const caminho = join(dir, entrada.name);
    if (entrada.isDirectory()) varrer(caminho);
    else if (/\.(ts|tsx)$/.test(entrada.name)) ficheirosDoSrc.push(caminho);
  }
};
varrer('src');
// Os comentarios sao retirados antes de procurar: `src/lib/convite.ts` CITA um
// numero num comentario para explicar por que um telefone sem indicativo de
// pais nao serve. Esse ficheiro constroi o link para o cliente do NOSSO
// cliente, a partir do numero dele — nao ha numero nosso escrito la.
//
// Sao duas regras, e a primeira versao desta assercao media a errada: ela
// procurava `wa.me/<digitos>` e nao encontrava NADA, porque o modulo de
// contacto monta o link com uma variavel. Zero ficheiros nao e "o numero vive
// num sitio so" — e "esta assercao nao esta a olhar para o numero".
//
// Regra 1: ninguem escreve um numero literal a seguir a `wa.me/`. Zero, sempre.
const comLinkLiteral = ficheirosDoSrc.filter((caminho) => /wa\.me\/\d/.test(semComentarios(readFileSync(caminho, 'utf8'))));
exigir('ninguem escreve um numero direto no link do WhatsApp', comLinkLiteral.length === 0);

// Regra 2: o numero em si aparece num ficheiro so — o modulo de contacto.
const numero = (contacto.match(/export const WHATSAPP_DO_BINNO = '(\d{10,15})';/) || [])[1];
exigir('o numero do Binno esta declarado no modulo de contacto', Boolean(numero));
const comNumero = numero
  ? ficheirosDoSrc.filter((caminho) => semComentarios(readFileSync(caminho, 'utf8')).includes(numero))
  : [];
exigir('o numero do Binno so aparece no modulo de contacto',
  comNumero.length === 1 && comNumero[0].replace(/\\/g, '/') === CONTACTO);
exigir('o modulo de contacto guarda o numero numa constante com nome',
  /export const WHATSAPP_DO_BINNO = '\d{10,15}';/.test(contacto));
// O texto ja escrito na conversa e o que torna a mensagem util: sem ele, a
// primeira resposta tem de ser "quem fala?".
exigir('a conversa ja abre com a origem escrita',
  /encodeURIComponent\(limpa\)/.test(contacto));

// 4. A PAGINA DE VENDAS tem o botao sempre alcancavel. A pergunta que trava uma
// compra aparece a meio da leitura, e nao no fim.
exigir('a pagina de vendas tem o botao flutuante',
  /<BotaoDeWhatsApp forma="flutuante"/.test(vendas));
exigir('o botao da pagina de vendas fica fora do rodape, para acompanhar a pagina toda',
  vendas.indexOf('</footer>') < vendas.indexOf('<BotaoDeWhatsApp forma="flutuante"'));

// 5. A PAGINA DO NEGOCIO nao pode competir com o clique de avaliar. Esta e a
// assercao que protege o dinheiro do CLIENTE, e nao o nosso.
exigir('a pagina do negocio usa a forma discreta, e nao a flutuante',
  /<BotaoDeWhatsApp\s+forma="discreto"/.test(negocio) && !/forma="flutuante"/.test(negocio));
const posicaoDaEscolha = negocio.indexOf('<ReviewChooser');
const posicaoDoContacto = negocio.indexOf('<BotaoDeWhatsApp');
exigir('a escolha de avaliar existe na pagina do negocio', posicaoDaEscolha > 0);
exigir('o contacto vem DEPOIS da escolha de avaliar',
  posicaoDaEscolha > 0 && posicaoDoContacto > posicaoDaEscolha);
// A forma discreta nao pode ganhar `fixed`: um botao fixo no ecra de um cliente
// a avaliar e um botao flutuante com outro nome.
// O corte vai do inicio do ramo ate ao `return` do ramo SEGUINTE (o flutuante),
// encontrado a partir do fim do primeiro. Prender o corte a uma sequencia exacta
// de espacos parte-se com qualquer reformatacao — e um corte que falha devolve
// string vazia, o que deixaria a assercao seguinte verde por vacuidade. Por
// isso ha uma assercao a exigir que o corte tenha acontecido.
const inicioDoDiscreto = botaoExecutavel.indexOf("if (forma === 'discreto')");
const fimDoDiscreto = botaoExecutavel.indexOf('return (', botaoExecutavel.indexOf('}', botaoExecutavel.indexOf('</a>', inicioDoDiscreto)));
const ramoDiscreto = inicioDoDiscreto > 0 && fimDoDiscreto > inicioDoDiscreto
  ? botaoExecutavel.slice(inicioDoDiscreto, fimDoDiscreto)
  : '';
exigir('o ramo discreto foi encontrado, senao nada abaixo prova nada', ramoDiscreto.length > 80);
exigir('a forma discreta nao e fixa no ecra',
  ramoDiscreto.length > 80 && !/fixed/.test(ramoDiscreto));

// 6. OS TRES IDIOMAS. O tipo `MarketingCopy` ja obriga, mas o tipo nao impede
// um texto vazio, e um botao sem rotulo e um botao que ninguem carrega.
const contactos = marketing.match(/contacto: \{ rotulo: '[^']+', rotuloCurto: '[^']+', mensagemDaVenda: '[^']+', mensagemDoNegocio: '[^']+' \}/g) || [];
exigir('os tres idiomas tem os quatro textos de contacto, e nenhum vazio', contactos.length === 3);

if (falhas.length) {
  console.error('Marca e contacto: %d protecao(oes) falharam.\n', falhas.length);
  for (const falha of falhas) console.error(' - %s', falha);
  process.exit(1);
}
console.log(`Marca e contacto: ${verificadas} protecoes verdes.`);
