import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

// O que aparece quando alguem partilha o binno.pro.
//
// POR QUE ESTE GUARDA EXISTE
//
// Em 05/09/2026 o Marcelo partilhou binno.pro no WhatsApp e mandou o print: uma
// caixa cinzenta com "binno.pro" escrito tres vezes e mais nada. Nao havia
// `og:image`. E o `twitter:card` ja dizia `summary_large_image` — a pagina
// prometia uma imagem grande que nao existia.
//
// O SINTOMA E MUDO E CHEGA TARDE. Nada falha na build, nada falha no site: a
// pagina abre perfeita. So se ve o defeito no telemovel de outra pessoa, depois
// de a mensagem ja ter sido enviada — que e o pior momento possivel para uma
// ferramenta que se vende por prospeccao.
//
// COMO VERIFICA
//
// Le o `index.html` e o disco. Nao chama o WhatsApp: o que se protege e que a
// etiqueta exista, que o ficheiro que ela aponta exista de verdade, e que as
// duas coisas concordem em tamanho e formato.

const raiz = resolve(import.meta.dirname, '..');
const html = readFileSync(resolve(raiz, 'index.html'), 'utf8');

const etiqueta = (propriedade) => {
  const achado = html.match(
    new RegExp(`<meta\\s+(?:property|name)="${propriedade}"\\s+content="([^"]*)"`));
  return achado ? achado[1] : null;
};

// Le a largura e a altura do cabecalho IHDR de um PNG. Sao os bytes 16 a 24, e
// existem sempre — um PNG sem IHDR nao e um PNG.
//
// DEVOLVE `null` EM VEZ DE REBENTAR quando o caminho nao e um ficheiro. Uma
// versao anterior chamava `readFileSync` sobre o que viesse: com a etiqueta em
// caminho relativo, o caminho resolvia para a PROPRIA PASTA `public/` e o
// guarda morria com um `EISDIR` e um despejo de pilha. Saia com codigo 1, entao
// tecnicamente apanhava o defeito — mas quem o lesse via um erro de Node e nao
// "a imagem de partilha tem endereco absoluto". Apanhado por mutacao.
const medidasDoPng = (caminho) => {
  if (!caminho || !existsSync(caminho) || !statSync(caminho).isFile()) return null;
  const bytes = readFileSync(caminho);
  return { largura: bytes.readUInt32BE(16), altura: bytes.readUInt32BE(20) };
};

const imagem = etiqueta('og:image');
const caminhoDaImagem = imagem && resolve(raiz, 'public', (imagem.split('binno.pro/')[1] || ''));

const requisitos = [
  ['a pagina declara uma imagem de partilha', Boolean(imagem)],

  // ABSOLUTA, e nao relativa. O WhatsApp e o Facebook buscam a imagem a partir
  // do servidor deles, sem contexto da pagina: um `/binno-preview.png` nao
  // resolve e o preview volta a ficar vazio, com o mesmo sintoma mudo.
  ['a imagem de partilha tem endereco absoluto',
    Boolean(imagem?.startsWith('https://'))],

  // E O FICHEIRO TEM DE EXISTIR. Uma etiqueta a apontar para o nada da
  // exactamente o mesmo resultado que nao ter etiqueta nenhuma.
  ['o ficheiro da imagem de partilha existe em public/',
    Boolean(medidasDoPng(caminhoDaImagem))],

  // O TAMANHO MINIMO QUE AS PLATAFORMAS ACEITAM para o cartao grande e
  // 600x315. Abaixo disso, o WhatsApp encolhe para a miniatura quadrada e a
  // frase deixa de se ler.
  ['a imagem tem pelo menos 600x315', (() => {
    const medidas = medidasDoPng(caminhoDaImagem);
    return Boolean(medidas) && medidas.largura >= 600 && medidas.altura >= 315;
  })()],

  // E AS MEDIDAS DECLARADAS TEM DE BATER COM O FICHEIRO. Declarar 1200x630
  // sobre um ficheiro de outro tamanho faz o WhatsApp reservar o espaco errado
  // e cortar a imagem.
  ['as medidas declaradas batem com o ficheiro', (() => {
    const medidas = medidasDoPng(caminhoDaImagem);
    return Boolean(medidas)
      && etiqueta('og:image:width') === String(medidas.largura)
      && etiqueta('og:image:height') === String(medidas.altura);
  })()],

  // O CARTAO GRANDE SO SE PROMETE SE HOUVER IMAGEM. Era metade do defeito
  // original: `summary_large_image` sem imagem nenhuma.
  ['o cartao grande do Twitter so e prometido com imagem',
    etiqueta('twitter:card') !== 'summary_large_image' || Boolean(etiqueta('twitter:image'))],

  ['a pagina diz qual e o seu proprio endereco',
    Boolean(etiqueta('og:url')?.startsWith('https://binno.pro'))],

  // O ICONE. Os tres ficheiros declarados tem de existir — o `.ico` que o
  // navegador procura sozinho, o PNG grande do atalho no telemovel, e o
  // `apple-touch-icon`, que e o unico que o iPhone le.
  ...['favicon.ico', 'icone-512.png', 'apple-touch-icon.png'].map((ficheiro) => [
    `o icone ${ficheiro} existe e esta declarado`,
    existsSync(resolve(raiz, 'public', ficheiro)) && html.includes(`/${ficheiro}`),
  ]),

  // E NAO PODE SER O DO ANDAIME. O favicon que veio do Lovable tinha 1150
  // bytes e um so tamanho de 16x16; o nosso leva 16 e 32. Medir o numero de
  // tamanhos e mais honesto do que medir bytes, que mudam por compressao.
  ['o icone nao e mais o do andaime', (() => {
    const caminho = resolve(raiz, 'public/favicon.ico');
    if (!existsSync(caminho)) return false;
    return readFileSync(caminho).readUInt16LE(4) >= 2;
  })()],
];

const falhas = requisitos.filter(([, ok]) => !ok).map(([rotulo]) => rotulo);
if (falhas.length) {
  console.error(`O que aparece ao partilhar tem regra quebrada:\n- ${falhas.join('\n- ')}`);
  process.exit(1);
}

console.log(`O que aparece ao partilhar: ${requisitos.length} regras conferidas.`);
