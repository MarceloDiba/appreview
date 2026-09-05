import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

// O que e clicavel e partilhado por varias telas tem 44px de altura.
//
// POR QUE ESTE GUARDA EXISTE
//
// 44px e o minimo abaixo do qual um dedo falha o alvo num telemovel. O produto
// inteiro vive no telemovel do dono, entao isto nao e detalhe de acabamento.
//
// MAS A RAZAO DE SER SO OS PARTILHADOS E OUTRA, e e o que interessa. Em
// 05/09/2026 corrigi os alvos de `BemVindo.tsx` — email, senha e botao subiram
// para 44 — e o `BotaoDoGoogle` ficou a 38, no meio deles. Nao foi
// esquecimento de uma tela: e um componente usado por `Login`, `Signup` e
// `BemVindo`, e em cada uma dessas telas ele parece pertencer as outras duas.
//
// A sessao de QA nomeou o padrao: a regra aplicada tela a tela deixa de fora
// exactamente a peca que as telas partilham. Uma passagem por tela nunca a
// apanha, porque ela nao esta em nenhuma.
//
// COMO VERIFICA
//
// Le os componentes de `src/components/auth/`, que sao os partilhados por mais
// de uma tela de entrada, e exige `min-h-11` em cada elemento clicavel. Tailwind
// nao permite medir pixels a partir do ficheiro; `min-h-11` E a declaracao de
// 44px neste projecto, entao e ela que se mede.

const raiz = resolve(import.meta.dirname, '..');
const pasta = resolve(raiz, 'src/components/auth');

const ficheiros = readdirSync(pasta).filter((n) => n.endsWith('.tsx'));

// SE NAO HA FICHEIROS, O GUARDA MENTE. Zero clicaveis passa em qualquer
// `every`, e um caminho errado daria verde eterno. E a terceira vez hoje que
// esta armadilha aparece com roupa diferente, entao ela entra por defeito.
if (ficheiros.length < 1) {
  console.error(`Alvo de toque: nao encontrei componentes em ${pasta}.`);
  process.exit(1);
}

const pequenos = [];
let clicaveisVistos = 0;

for (const nome of ficheiros) {
  const fonte = readFileSync(resolve(pasta, nome), 'utf8');
  // O BLOCO DE ATRIBUTOS NAO SE APANHA COM `[^>]*`. A primeira versao usava
  // isso e parava no `>` da seta de `onClick={() => ...}` — cortava o atributo
  // antes de chegar ao `className`, e acusava de pequeno um botao ja corrigido.
  // Um `>` dentro de uma expressao nao fecha etiqueta nenhuma, entao a leitura
  // avanca ate ao `>` que esta fora de chavetas.
  for (const inicio of [...fonte.matchAll(/<[Bb]utton\b/g)].map((m) => m.index)) {
    let profundidade = 0;
    let fim = inicio;
    while (fim < fonte.length) {
      const c = fonte[fim];
      if (c === '{') profundidade += 1;
      else if (c === '}') profundidade -= 1;
      else if (c === '>' && profundidade === 0) break;
      fim += 1;
    }
    const aberto = fonte.slice(inicio, fim);
    clicaveisVistos += 1;
    if (!/min-h-11/.test(aberto)) {
      pequenos.push(`${nome}: ${aberto.replace(/\s+/g, ' ').slice(0, 90)}…`);
    }
  }
}

if (!clicaveisVistos) {
  console.error('Alvo de toque: nao encontrei nenhum clicavel nos componentes de entrada.');
  console.error('Ou a pasta mudou, ou o formato mudou — de qualquer forma este guarda nao esta a medir nada.');
  process.exit(1);
}

if (pequenos.length) {
  console.error('Clicavel partilhado sem altura de toque (min-h-11 = 44px):');
  for (const linha of pequenos) console.error(`- ${linha}`);
  process.exit(1);
}

console.log(`Alvo de toque partilhado: ${clicaveisVistos} clicaveis em ${ficheiros.length} componentes, todos com 44px.`);
