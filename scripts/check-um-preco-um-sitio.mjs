#!/usr/bin/env node
// O preço cheio existe num sítio só.
//
// POR QUE ESTE GUARDA EXISTE
//
// `precoBinno.ts` já avisava no cabeçalho: "duas cópias do mesmo preço são duas
// cópias que precisam concordar, e este projeto já pagou esse defeito".
//
// E havia SEIS cópias escritas à mão. Em 04/09/2026 o Marcelo decidiu baixar o
// preço cheio de R$199 para R$129; mudar a constante deixaria a página de venda
// e a tela de cobrança a dizer 199, nos três idiomas — um número na copy, outro
// no risco por cima do preço, e um terceiro no Stripe.
//
// Um cliente que vê dois preços na mesma compra não pergunta qual é: desiste.
import { readFileSync, globSync } from 'node:fs';

const falhas = [];
let verificadas = 0;
const exigir = (r, c) => { verificadas += 1; if (!c) falhas.push(r); };

const PRECO = readFileSync('src/lib/precoBinno.ts', 'utf8');
const regular = (PRECO.match(/export const PRECO_REGULAR_BRL = (\d+)/) || [])[1];
const promo = (PRECO.match(/export const PRECO_PROMO_BRL = (\d+)/) || [])[1];

exigir('nao achei o preco cheio; o guarda deixaria de medir o que diz medir', Boolean(regular));
exigir('nao achei o preco promocional', Boolean(promo));
exigir(`o preco cheio (${regular}) nao e maior que o promocional (${promo}); o risco por cima ficaria absurdo`,
  Number(regular) > Number(promo));

// A SUBSTITUICAO TEM DE EXISTIR. Sem `{regular}`, os textos voltam a escrever
// o numero a mao e este guarda nao teria como os apanhar.
exigir('`comVagas` deixou de substituir `{regular}`; a copy voltaria a escrever o preco a mao',
  /\.replace\('\{regular\}', String\(PRECO_REGULAR_BRL\)\)/.test(PRECO));

// E NINGUEM MAIS ESCREVE UM PRECO EM REAIS A MAO, em nenhum idioma.
const ondeProcurar = [
  ...globSync('src/**/*.{ts,tsx}'),
  ...globSync('src/i18n/owner/locales/*.json'),
].filter((f) => !f.endsWith('src/lib/precoBinno.ts'));

exigir(`a varredura achou so ${ondeProcurar.length} ficheiros; deixou de varrer o que diz varrer`,
  ondeProcurar.length > 50);

const escritosAMao = [];
for (const ficheiro of ondeProcurar) {
  const texto = readFileSync(ficheiro, 'utf8')
    // Comentarios contam a HISTORIA do preco ("dizia 'De R$199 por R$199'").
    // Medi-los faria o guarda proibir explicar o proprio defeito.
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
  for (const achado of texto.matchAll(/R\$\s?(\d{2,4})/g)) {
    escritosAMao.push(`${ficheiro}: R$${achado[1]}`);
  }
}
exigir(`ha preco em reais escrito a mao fora de precoBinno.ts: ${escritosAMao.join(' | ')}`,
  escritosAMao.length === 0);

if (falhas.length) {
  console.error('Um preco, um sitio: %d protecao(oes) falharam.\n', falhas.length);
  for (const f of falhas) console.error(' - %s', f);
  process.exit(1);
}
console.log(`Um preco, um sitio: R$${regular} cheio, R$${promo} promocional, ${verificadas} protecoes verdes.`);
