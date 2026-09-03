#!/usr/bin/env node
// A traducao que o Google cola nao pode decidir o idioma da resposta.
//
// POR QUE ESTE GUARDA EXISTE
//
// Em 03/09/2026 uma resposta EM INGLES foi publicada no perfil publico real da
// Noa Digital, para um cliente que escreveu em portugues:
//
//     "Marcelo é um profissional ímpar. Merece nota 1000."
//     -> "Hello Daniel, Thank you for the kind words..."
//
// A causa nao era o detector de idioma. Era o texto que lhe chegava: a API do
// Google devolve TODA avaliacao com a traducao inglesa colada ao original,
// separada por "(Translated by Google)". O detector conta palavras, contava
// mais palavras inglesas do que portuguesas, e devolvia `en`.
//
// Este guarda corre as duas pecas juntas — o corte e o detector — porque
// nenhuma das duas, sozinha, mostra o defeito: o detector estava certo, e o
// corte nao existia.
import { readFileSync } from 'node:fs';

const CAMINHO = 'supabase/functions/sync-google-business-profile/index.ts';
const fonte = readFileSync(CAMINHO, 'utf8');

// Recorta a funcao do ficheiro real e corre-a. Procurar o nome dela provaria
// que a linha existe; correr prova que ela corta onde deve.
const inicio = fonte.indexOf('const soOqueOClienteEscreveu');
const fim = fonte.indexOf('const googleError');
if (inicio === -1 || fim <= inicio) {
  console.error('Nao achei `soOqueOClienteEscreveu` no ficheiro. Sem ela, nada abaixo mede o que diz medir.');
  process.exit(1);
}
const corpo = fonte.slice(inicio, fim)
  .replace('const soOqueOClienteEscreveu = (texto: string | null): string | null =>',
           'const soOqueOClienteEscreveu = (texto) =>');
const { soOqueOClienteEscreveu } = await import(
  'data:text/javascript,' + encodeURIComponent(corpo + '\nexport { soOqueOClienteEscreveu };')
);

const { detectReplyLocale } = await import('../src/lib/replySuggestions.ts');

const falhas = [];
let verificadas = 0;
const exigir = (rotulo, condicao) => { verificadas += 1; if (!condicao) falhas.push(rotulo); };

// O texto REAL que estava guardado quando a resposta errada foi publicada.
const DANIEL = 'Marcelo é um profissional ímpar. Merece nota 1000.\n\n(Translated by Google)\nMarcelo is an exceptional professional. He deserves a perfect score of 1000.';
// A outra forma que o Google usa, com a traducao a frente e o original marcado.
const INVERTIDO = '(Translated by Google)\nReady to better serve you.\n\n(Original)\nPronta pra melhor atender';

// 1. O CORTE. As duas formas conhecidas, e o texto sem traducao nenhuma.
exigir(`a traducao colada no fim nao foi cortada: "${soOqueOClienteEscreveu(DANIEL)}"`,
  soOqueOClienteEscreveu(DANIEL) === 'Marcelo é um profissional ímpar. Merece nota 1000.');
exigir(`a forma invertida nao foi tratada: "${soOqueOClienteEscreveu(INVERTIDO)}"`,
  soOqueOClienteEscreveu(INVERTIDO) === 'Pronta pra melhor atender');
exigir('um texto sem traducao foi alterado; so se corta o que o Google colou',
  soOqueOClienteEscreveu('Muito bom, recomendo') === 'Muito bom, recomendo');
exigir('um comentario vazio deixou de ser vazio',
  soOqueOClienteEscreveu(null) === null);
// Cortar nunca pode apagar a avaliacao inteira.
exigir('um texto que e SO traducao ficou vazio; melhor devolver tudo do que perder o que o cliente disse',
  soOqueOClienteEscreveu('(Translated by Google)').length > 0);

// 2. O IDIOMA, que e o que o cliente ve. Esta e a assercao que liga as duas
//    pecas: e aqui que o defeito aparecia.
exigir(`o idioma detectado no texto do Daniel ainda e '${detectReplyLocale(DANIEL)}'; a resposta sairia em ingles outra vez`,
  detectReplyLocale(soOqueOClienteEscreveu(DANIEL)) === 'pt');
exigir('o idioma da forma invertida nao ficou em portugues',
  detectReplyLocale(soOqueOClienteEscreveu(INVERTIDO)) === 'pt');

// 3. O CORTE ESTA NA ENTRADA. Se sair de la, volta a chegar sujo a quem le a
//    coluna — incluindo a funcao SQL do WhatsApp, que nao passa por front.
exigir('o corte deixou de ser aplicado ao guardar o comentario',
  /comment: soOqueOClienteEscreveu\(/.test(fonte));

if (falhas.length) {
  console.error('So o que o cliente escreveu: %d protecao(oes) falharam.\n', falhas.length);
  for (const f of falhas) console.error(' - %s', f);
  process.exit(1);
}
console.log(`So o que o cliente escreveu: ${verificadas} protecoes verdes.`);
