#!/usr/bin/env node
// Protege os dois blocos que o contrato aprovou em 30/08/2026 para o celular:
// a faixa-resumo e o índice fixo. Ver "Arquitetura aprovada do painel" em
// docs/contrato-produto-binno.md.
//
// Cada asserção lê a construção que ela nomeia, não a presença de um texto
// solto. Um guarda que passa depois da regra ser quebrada não protege nada, e
// este repositório já produziu levas inteiras desses nesta semana.
import { readFileSync } from 'node:fs';

const PAINEL = 'src/components/dashboard/ApprovedCockpitDashboard.tsx';
const CONTRATO = 'docs/contrato-produto-binno.md';

// Comentários podem conter qualquer coisa. Sem removê-los, um trecho comentado
// satisfaz qualquer busca por texto.
const semComentarios = (fonte) => fonte
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');

// Extrai o corpo de `const Nome = ...` até o ponto e vírgula que fecha a
// declaração, contando parênteses e chaves.
const corpoDaDeclaracao = (fonte, nome) => {
  const inicio = fonte.indexOf(`const ${nome} =`);
  if (inicio === -1) return null;
  let i = fonte.indexOf('=', inicio) + 1;
  let chaves = 0;
  let parenteses = 0;
  const partida = i;
  for (; i < fonte.length; i += 1) {
    const c = fonte[i];
    if (c === '{') chaves += 1;
    else if (c === '}') chaves -= 1;
    else if (c === '(') parenteses += 1;
    else if (c === ')') parenteses -= 1;
    else if (c === ';' && chaves === 0 && parenteses === 0) break;
  }
  return fonte.slice(partida, i);
};

const falhas = [];
const exigir = (condicao, mensagem) => { if (!condicao) falhas.push(mensagem); };

const painel = semComentarios(readFileSync(PAINEL, 'utf8'));
const contrato = readFileSync(CONTRATO, 'utf8');

// 1 e 2. Os dois blocos existem e são exclusivos do celular. Sem `lg:hidden`
// eles apareceriam também no ecrã grande, deslocando a ordem aprovada, que é
// exatamente o que o contrato proíbe.
for (const nome of ['MobileIndex', 'MobileSummary']) {
  const corpo = corpoDaDeclaracao(painel, nome);
  exigir(corpo !== null, `${nome} sumiu de ${PAINEL}.`);
  if (corpo) {
    exigir(corpo.includes('lg:hidden'),
      `${nome} deixou de ser exclusivo do celular: sem lg:hidden ele aparece no ecrã grande e desloca a ordem aprovada.`);
  }
}

// 3. Todo atalho do índice aponta para um módulo que existe na página. Um id
// órfão vira um atalho que não leva a lugar nenhum.
const listaDeSecoes = corpoDaDeclaracao(painel, 'MOBILE_SECTIONS') || '';
const idsDoIndice = [...listaDeSecoes.matchAll(/id:\s*([A-Z_]+)/g)].map((m) => m[1]);
exigir(idsDoIndice.length >= 4,
  `O índice do celular ficou com ${idsDoIndice.length} atalhos. Abaixo de quatro ele deixa de resolver o rolo longo que motivou o contrato.`);
for (const id of idsDoIndice) {
  exigir(new RegExp(`id=\\{${id}\\}`).test(painel),
    `O atalho ${id} não corresponde a nenhum id na página: o índice levaria a lugar nenhum.`);
}

// 4. Fila ausente e fila vazia não são a mesma coisa. A faixa precisa
// distinguir as duas, senão um segundo aparelho mostra "nenhuma esperando"
// sem ter como saber, que é afirmar o que não se sabe.
const corpoResumo = corpoDaDeclaracao(painel, 'MobileSummary') || '';
exigir(/!\s*queueOnThisDevice/.test(corpoResumo),
  'A faixa-resumo parou de tratar o caso de a fila não existir neste aparelho, e passaria a mostrar zero como se fosse "nada a responder".');

// 5. E a distinção precisa nascer da ausência do retrato, não do seu tamanho.
// `observedReviews.length` seria zero tanto para fila vazia quanto para fila
// ausente, e as duas voltariam a ser indistinguíveis.
const calculo = painel.match(/const queueOnThisDevice = [^;]+;/);
exigir(calculo !== null, 'queueOnThisDevice deixou de ser calculado.');
if (calculo) {
  exigir(/observedReviews\s*!==\s*undefined/.test(calculo[0]),
    'queueOnThisDevice deixou de distinguir fila ausente de fila vazia: sem checar a ausência do retrato, zero avaliações e nenhum retrato viram o mesmo estado.');
}

// 6. A linha de "Cada nota separada" estourava a largura do cartão no celular
// porque proibia a quebra de linha numa grade de três colunas. O texto que
// vazava era o rótulo "atenção".
const linhaDasNotas = painel.match(/grid-cols-\[40px_1fr_auto\][\s\S]{0,1400}?atenção/);
exigir(linhaDasNotas !== null,
  'A linha de "Cada nota separada" perdeu a grade estreita do celular, que é o que a impede de estourar a largura do cartão.');
if (linhaDasNotas) {
  exigir(!/whitespace-nowrap/.test(linhaDasNotas[0]),
    'whitespace-nowrap voltou à linha de "Cada nota separada": no celular ela força a grade além da largura do cartão e o rótulo "atenção" vaza para fora.');
}

// 7. O contrato precisa continuar registrando a exceção. Sem isso o código
// contradiz o documento aprovado.
exigir(/apenas no celular/.test(contrato) && /faixa-resumo/.test(contrato),
  `${CONTRATO} deixou de registrar a exceção do celular aprovada em 30/08/2026.`);

if (falhas.length) {
  console.error('Painel no celular: %d proteção(ões) falharam.\n', falhas.length);
  for (const falha of falhas) console.error(' - %s', falha);
  process.exit(1);
}
console.log('Painel no celular: 7 proteções verdes.');
