import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Todo item do menu da home leva a uma seccao que existe.
//
// POR QUE ESTE GUARDA EXISTE
//
// Em 05/09/2026 o Marcelo abriu a home nova e escreveu: "esta otima, mas
// percebi que os botoes do menu nao funcionam". Um item de menu que aponta para
// uma ancora inexistente NAO DA ERRO NENHUM: o navegador nao encontra o
// destino, nao rola, e nao diz nada. Para quem clica, o site esta partido; para
// quem le o codigo, esta tudo escrito.
//
// E o defeito nasce sozinho. As ancoras vivem em `PublicMarketingNav.tsx` e as
// seccoes em `Index.tsx` — dois ficheiros que ninguem edita ao mesmo tempo.
// Renomear `id="plano"` para `id="precos"` parte o menu sem tocar no menu.
//
// COMO VERIFICA
//
// Recolhe as ancoras que o menu oferece e os `id` que a home declara, e exige
// que cada ancora tenha destino. Nao verifica o contrario: uma seccao sem item
// de menu e uma decisao de edicao, nao um defeito — hoje `problema`, `prova` e
// `avisos` existem de proposito sem estar no menu.

const raiz = resolve(import.meta.dirname, '..');
const menu = readFileSync(resolve(raiz, 'src/components/marketing/PublicMarketingNav.tsx'), 'utf8');
const home = readFileSync(resolve(raiz, 'src/pages/Index.tsx'), 'utf8');

const ancoras = [...menu.matchAll(/href: '\/#([a-z-]+)'/g)].map(([, nome]) => nome);
const seccoes = new Set([...home.matchAll(/id="([a-z-]+)"/g)].map(([, nome]) => nome));

// SE NAO HA ANCORAS, O GUARDA MENTE. Zero ancoras passa em qualquer `every`, e
// um menu reescrito noutro formato deixaria este ficheiro verde a proteger
// nada. E o formato de guarda que este projeto ja apanhou mais vezes.
if (ancoras.length < 3) {
  console.error(`Menu que chega la: so encontrei ${ancoras.length} ancoras em PublicMarketingNav.tsx.`);
  console.error('O menu tem quatro. Ou o formato mudou, ou o caminho esta errado — e o guarda estaria a proteger nada.');
  process.exit(1);
}

const semDestino = ancoras.filter((nome) => !seccoes.has(nome));
if (semDestino.length) {
  console.error('Item de menu que nao leva a lado nenhum:');
  for (const nome of semDestino) {
    console.error(`- '/#${nome}' — nenhuma seccao da home tem id="${nome}"`);
  }
  console.error(`\nSeccoes que existem: ${[...seccoes].sort().join(', ')}`);
  process.exit(1);
}

console.log(`Menu que chega la: ${ancoras.length} itens, todos com seccao (${ancoras.join(', ')}).`);
