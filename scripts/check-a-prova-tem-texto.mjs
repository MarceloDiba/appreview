import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// A imagem que prova o produto nao vai ao ar muda.
//
// POR QUE ESTE GUARDA EXISTE
//
// `prova-avaliacao-google.jpg` e o argumento inteiro da seccao "Isso nao e
// mockup": e um print real do perfil da Noa no Google com a resposta publicada.
// Ate 05/09/2026 ela ia ao ar com `alt=""`, que e a forma de dizer ao leitor de
// ecra "isto e decoracao, ignora".
//
// Nao e decoracao. Quem usa leitor de ecra, ou quem esteja numa ligacao que nao
// traz a imagem, ficava sem a UNICA prova da pagina — e a pagina toda existe
// para provar que o produto e real. Achado pela sessao de QA a medir a home a
// 390px (atrito 23).
//
// A LEGENDA NAO SUBSTITUI O `alt`, e por isso o guarda exige os dois. A legenda
// diz de onde veio o print e quando; o `alt` diz o que se ve nele. Um leitor de
// ecra que so tenha a legenda ouve "print real do perfil no Google" e nao fica a
// saber que ha uma avaliacao com uma resposta publicada por baixo — que e o que
// convence.

const raiz = resolve(import.meta.dirname, '..');
const pagina = readFileSync(resolve(raiz, 'src/pages/Index.tsx'), 'utf8');
const catalogos = readFileSync(resolve(raiz, 'src/i18n/marketing.ts'), 'utf8');

const alts = [...catalogos.matchAll(/imageAlt: (?:'([^']*)'|"([^"]*)")/g)]
  .map(([, a, b]) => a || b);

const requisitos = [
  // MEDE O QUE A ETIQUETA RECEBE, e nao a existencia do atributo. `alt=""` e um
  // `alt` presente e vazio — foi exactamente o defeito.
  ['a imagem da prova recebe um texto alternativo de verdade',
    /prova-avaliacao-google\.jpg[^>]{0,400}alt=\{copy\.prova\.imageAlt\}/.test(pagina)],

  ['nenhuma imagem da home vai ao ar com alt vazio',
    !/<img[^>]{0,400}alt=""/.test(pagina)],

  ['os tres idiomas tem o texto alternativo', alts.length === 3],

  // E ELE TEM DE DESCREVER O QUE SE VE. Um `alt` que repita a legenda nao
  // acrescenta nada a quem nao ve a imagem.
  ['o texto alternativo descreve a avaliacao e a resposta',
    alts.length === 3 && alts.every((a) =>
      a.length > 60
      && /avalia|review/i.test(a)
      && /resposta|reply/i.test(a))],
];

const falhas = requisitos.filter(([, ok]) => !ok).map(([rotulo]) => rotulo);
if (falhas.length) {
  console.error(`A prova tem texto, regra quebrada:\n- ${falhas.join('\n- ')}`);
  process.exit(1);
}

console.log(`A prova tem texto: ${requisitos.length} regras conferidas, ${alts.length} idiomas.`);
