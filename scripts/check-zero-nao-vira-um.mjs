#!/usr/bin/env node
// Uma fila vazia nao pode dizer que tem uma coisa dentro.
//
// POR QUE ESTE GUARDA EXISTE
//
// Em 05/09/2026 a sessao de QA abriu uma conta recem-criada, sem dado nenhum, e
// a tela dizia ao mesmo tempo:
//
//     1 esperando resposta          <- o cracha
//     Nada esperando resposta agora <- o estado vazio, logo abaixo
//
// O codigo estava certo: passava `count: 0`. O defeito estava no catalogo, e a
// causa e contraintuitiva:
//
//     Intl.PluralRules('pt-BR').select(0)  ->  'one'
//     Intl.PluralRules('pt-PT').select(0)  ->  'other'
//     Intl.PluralRules('en').select(0)     ->  'other'
//
// EM PORTUGUES DO BRASIL, ZERO E SINGULAR. Entao zero escolhe a forma `_one`, e
// essa forma tinha o numero ESCRITO A MAO: "1 esperando resposta". Em pt-PT e
// em ingles o mesmo codigo escolhia `_other` e imprimia "0".
//
// O defeito so existia na lingua do mercado principal, que e a razao de ninguem
// o ter visto em dois meses.
//
// Eram quatro chaves em cada catalogo, nao uma.
import { readFileSync, globSync } from 'node:fs';

const falhas = [];
let verificadas = 0;
const exigir = (r, c) => { verificadas += 1; if (!c) falhas.push(r); };

// A REGRA DE PLURAL E MEDIDA, e nao assumida. Se um dia o Intl mudar de ideia
// sobre o portugues do Brasil, este guarda diz porque deixou de fazer sentido,
// em vez de passar a proteger contra nada.
exigir('zero deixou de ser singular em pt-BR; a razao deste guarda mudou, releia o cabecalho',
  new Intl.PluralRules('pt-BR').select(0) === 'one');

const catalogos = globSync('src/i18n/owner/locales/*.json');
exigir(`achei ${catalogos.length} catalogos; a varredura deixou de varrer o que diz varrer`,
  catalogos.length >= 3);

const achatar = (objeto, prefixo = '') => Object.entries(objeto).flatMap(([chave, valor]) => {
  const caminho = prefixo ? `${prefixo}.${chave}` : chave;
  return typeof valor === 'object' && valor !== null
    ? achatar(valor, caminho)
    : [[caminho, String(valor)]];
});

for (const ficheiro of catalogos) {
  const plano = Object.fromEntries(achatar(JSON.parse(readFileSync(ficheiro, 'utf8'))));
  const nome = ficheiro.split('/').pop();

  for (const [chave, texto] of Object.entries(plano)) {
    if (!chave.endsWith('_one')) continue;
    const outro = plano[`${chave.slice(0, -4)}_other`];
    // So interessa quando a forma plural IMPRIME a contagem. Uma chave cujo
    // plural tambem nao a imprime nao esta a mentir sobre numero nenhum.
    if (!outro || !outro.includes('{{count}}')) continue;
    exigir(`${nome}: '${chave}' nao imprime {{count}} e o plural imprime — em pt-BR o zero cai aqui e mente: "${texto.slice(0, 46)}"`,
      texto.includes('{{count}}'));
  }
}

if (falhas.length) {
  console.error('Zero nao vira um: %d protecao(oes) falharam.\n', falhas.length);
  for (const f of falhas) console.error(' - %s', f);
  process.exit(1);
}
console.log(`Zero nao vira um: ${verificadas} protecoes verdes nos ${catalogos.length} catalogos.`);
