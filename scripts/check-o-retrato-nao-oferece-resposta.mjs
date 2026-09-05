import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// O retrato nao oferece resposta quando a ligacao oficial manda.
//
// POR QUE ESTE GUARDA EXISTE
//
// A lista de avaliacoes da aba Google vem do retrato da Apify: tirado num
// instante, e cego para tudo o que aconteceu depois — inclusive para quem ja
// foi respondido. Ela oferecia "sugerir resposta" em TODAS, respondidas ou nao.
//
// Marcelo apanhou-o em 05/09/2026: "avaliacoes ja respondidas tem os mesmos
// botoes das nao respondidas. Isso faz algum sentido?".
//
// A DECISAO JA EXISTIA, TOMADA NOUTRA TELA. Em 03/09, na fila de `/reviews`,
// ficou escrito em `filaDeRespostas.ts`: "so a oficial devolve a resposta
// publicada, entao so ela pode dizer quem ainda espera". La o retrato sai
// INTEIRO da fila quando a oficial esta completa. Aqui ele ficou a oferecer.
//
// O defeito nao era falta de regra: era uma regra aplicada num sitio e nao no
// outro. E o custo dela e concreto — em 03/09 tres donos apareceram na fila ja
// respondidos, um deles minutos antes, e o produto convidou a responder outra
// vez a mesma pessoa.
//
// O QUE ESTE GUARDA NAO FAZ: nao esconde a lista. Ver o que o Google mostra
// continua util, e para quem ainda nao ligou o Google o retrato e a unica
// fonte que existe — por isso a bandeira e `!temLigacaoOficial` e nao `false`.

const raiz = resolve(import.meta.dirname, '..');
const definicoes = readFileSync(resolve(raiz, 'src/pages/Settings.tsx'), 'utf8');
const lista = readFileSync(resolve(raiz, 'src/components/dashboard/GoogleReviews.tsx'), 'utf8');
const cartao = readFileSync(resolve(raiz, 'src/components/dashboard/reviews/ReviewCard.tsx'), 'utf8');

const requisitos = [
  // A ORIGEM DA BANDEIRA. `!temLigacaoOficial` e o que liga esta tela a decisao
  // de 03/09; um `true` fixo aqui repunha o defeito sem tocar em mais nada.
  ['a tela decide pela ligacao oficial, e nao por um valor fixo',
    /podeSugerirResposta=\{!temLigacaoOficial\}/.test(definicoes)],

  ['a bandeira chega a lista', /podeSugerirResposta/.test(lista)],

  // E O CARTAO TEM DE A OBEDECER. Receber a bandeira e ignora-la e o defeito
  // com mais um passo.
  ['o cartao esconde a sugestao quando a bandeira e falsa',
    /\{podeSugerirResposta && \(\s*<ReplySuggestions/.test(cartao)],

  // O PADRAO E OFERECER. Quem ainda nao ligou o Google so tem o retrato — se o
  // valor por omissao fosse `false`, essa pessoa ficava sem sugestao nenhuma.
  ['por omissao continua a oferecer, para quem ainda nao ligou',
    /podeSugerirResposta = true/.test(cartao)],
];

const falhas = requisitos.filter(([, ok]) => !ok).map(([rotulo]) => rotulo);
if (falhas.length) {
  console.error(`O retrato nao oferece resposta, regra quebrada:\n- ${falhas.join('\n- ')}`);
  process.exit(1);
}

console.log(`O retrato nao oferece resposta: ${requisitos.length} regras conferidas.`);
