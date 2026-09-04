#!/usr/bin/env node
// A fila só monta depois de o país do negócio ser conhecido.
//
// POR QUE ESTE GUARDA EXISTE
//
// `userId` e o que faz a fila de respostas montar. Enquanto ele era definido
// ANTES da leitura do perfil, `FilaDeRespostas` montava com `businessCountry`
// vazio — e `PublicacaoOficial` congela o rascunho inicial num `useState` no
// primeiro render, sem voltar atras quando o pais chega.
//
// O resultado era um rascunho em portugues de Portugal na tela de um dono
// brasileiro, publicavel com um clique no perfil publico dele.
//
// E A MESMA FAMILIA do ingles que foi publicado no perfil do Daniel em
// 03/09/2026: o texto sai gramatical, ninguem ve erro nenhum, e so quem conhece
// o cliente repara. Foi apontado na revisao da Task 3 nesse dia e ficou em
// aberto ate 04/09 — este guarda existe para nao ficar outra vez.
import { readFileSync } from 'node:fs';

const CAMINHO = 'src/pages/Reviews.tsx';
const fonte = readFileSync(CAMINHO, 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');

if (fonte.includes('O PAÍS CHEGA ANTES DA FILA')) {
  console.error('O strip de comentarios nao funcionou; as asserções mediriam a explicacao.');
  process.exit(1);
}

const falhas = [];
let verificadas = 0;
const exigir = (rotulo, condicao) => { verificadas += 1; if (!condicao) falhas.push(rotulo); };

// A ORDEM E A REGRA. Nao ha aqui um valor a conferir: ha duas linhas, e qual
// delas vem primeiro decide se o dono ve o portugues certo.
const ondeLeOPerfil = fonte.indexOf("from('profiles')");
const ondeDefineOPais = fonte.indexOf('setBusinessCountry(');
const ondeMontaAFila = fonte.indexOf('setUserId(user.id)');

exigir('nao achei a leitura do perfil; o guarda deixaria de medir o que diz medir',
  ondeLeOPerfil > 0);
exigir('nao achei onde o pais e definido', ondeDefineOPais > 0);
exigir('nao achei onde a fila passa a montar', ondeMontaAFila > 0);

exigir('a fila volta a montar ANTES da leitura do perfil; o rascunho congela na variante errada de portugues',
  ondeMontaAFila > ondeLeOPerfil);
exigir('a fila volta a montar antes de o pais estar definido',
  ondeMontaAFila > ondeDefineOPais);

// E A FILA CONTINUA A RECEBER O PAIS. Sem isto, tudo acima fica verde com a
// prop cortada — a ordem certa a alimentar ninguem.
exigir('a fila deixou de receber o pais do negocio',
  /businessCountry=\{businessCountry \|\| null\}/.test(fonte));

// E O DONO NAO PODE FICAR SEM TELA se a leitura do perfil falhar: `userId` e
// definido fora de qualquer condicao sobre o perfil.
exigir('a fila so monta se o perfil existir; uma leitura falhada deixaria a tela vazia',
  !/if \(profile[^)]*\)\s*setUserId/.test(fonte));

if (falhas.length) {
  console.error('O pais chega antes da fila: %d protecao(oes) falharam.\n', falhas.length);
  for (const f of falhas) console.error(' - %s', f);
  process.exit(1);
}
console.log(`O pais chega antes da fila: ${verificadas} protecoes verdes.`);
