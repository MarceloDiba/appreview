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
let verificadas = 0;
const exigir = (condicao, mensagem) => { verificadas += 1; if (!condicao) falhas.push(mensagem); };

const painel = semComentarios(readFileSync(PAINEL, 'utf8'));
// OS CARTOES DE LEITURA sairam do painel em 04/09/2026, quando ele passou o
// tecto de 350 linhas. `MobileSummary` e a faixa do celular ficaram; a linha
// de "Cada nota separada" foi com eles. Cada assercao le o ficheiro onde a
// regra dela vive.
const CARTOES = 'src/components/dashboard/reputacao/CartoesDeLeitura.tsx';
const cartoes = semComentarios(readFileSync(CARTOES, 'utf8'));
const contrato = readFileSync(CONTRATO, 'utf8');

// 1. A faixa-resumo existe e é exclusiva do celular. Sem `lg:hidden` ela
// apareceria também no ecrã grande, deslocando a ordem aprovada, que é
// exatamente o que o contrato proíbe.
const corpoDaFaixa = corpoDaDeclaracao(painel, 'MobileSummary');
exigir(corpoDaFaixa !== null, `MobileSummary sumiu de ${PAINEL}.`);
if (corpoDaFaixa) {
  exigir(corpoDaFaixa.includes('lg:hidden'),
    'MobileSummary deixou de ser exclusivo do celular: sem lg:hidden ele aparece no ecrã grande e desloca a ordem aprovada.');
}

// 2. O índice fixo do celular saiu em 31/08/2026, por decisão de Marcelo:
// aparecia cortado no telemóvel dele, e o menu principal já leva a pessoa a
// cada destino. As três asserções que o protegiam (existe, é exclusivo do
// celular, cada atalho aponta para um id real) foram APAGADAS em vez de
// reapontadas, porque o módulo que elas mediam deixou de existir e uma
// asserção sobre código ausente fica verde sem proteger nada.
//
// No lugar delas fica a proibição de ele voltar. Sem isto, o índice regressa na
// próxima vez que alguém tentar resolver o rolo longo do celular, que é
// exatamente como ele nasceu.
exigir(!/MobileIndex|MOBILE_SECTIONS/.test(painel),
  'O índice fixo do celular voltou ao painel. Ele saiu em 31/08/2026 porque aparecia cortado no telemóvel do dono e duplicava o menu principal.');

// 4. Fila ausente e fila vazia não são a mesma coisa. A faixa precisa
// distinguir as duas, senão um segundo aparelho mostra "nenhuma esperando"
// sem ter como saber, que é afirmar o que não se sabe.
const corpoResumo = corpoDaDeclaracao(painel, 'MobileSummary') || '';
exigir(/!\s*temFila/.test(corpoResumo),
  'A faixa-resumo parou de distinguir fila ausente de fila vazia, e passaria a mostrar zero como se fosse "nada a responder".');

// 5. E a distinção precisa nascer da ausência do retrato, não do seu tamanho.
// `observedReviews.length` seria zero tanto para fila vazia quanto para fila
// ausente, e as duas voltariam a ser indistinguíveis.
const calculo = painel.match(/const temFila = [^;]+;/);
exigir(calculo !== null, 'temFila deixou de ser calculado.');
if (calculo) {
  exigir(/observedReviews\s*!==\s*undefined/.test(calculo[0]),
    'temFila deixou de distinguir fila ausente de fila vazia: sem checar a ausência do retrato, zero avaliações e nenhum retrato viram o mesmo estado.');
}

// 6. A linha de "Cada nota separada" estourava a largura do cartão no celular
// porque proibia a quebra de linha numa grade de três colunas. O texto que
// vazava era o rótulo "atenção".
//
// Em 30/08/2026 esse rótulo saiu do JSX e foi para os catálogos do painel,
// junto com os outros textos que estavam fixos aqui em pt-BR. A âncora do
// guarda acompanha: em vez do texto traduzido, ela fixa a chave que o desenha.
// A força é a mesma, e um pouco maior: apagar a chave do JSX quebra este
// guarda, e apagá-la dos catálogos quebra o check:i18n-owner.
//
// **Reapontado em 01/09/2026.** A âncora era `grid-cols-[40px_1fr_auto]`, e a
// terceira coluna deixou de ser `auto` nesse dia. O motivo está no ecrã, não no
// código: `auto` mede-se pelo conteúdo DA PRÓPRIA LINHA, e o conteúdo muda de
// linha para linha, porque só algumas levam o rótulo "atenção". As cinco linhas
// ficavam com cinco terceiras colunas de larguras diferentes, e portanto com
// cinco gráficos de larguras diferentes: as mesmas 12 semanas desenhadas em
// cinco escalas horizontais, empilhadas, como se fossem comparáveis. Uma
// largura fixa faz as cinco partilharem a mesma escala.
//
// A asserção foi reapontada e não apagada: a regra que ela protege (a linha
// cabe na largura do cartão no telemóvel) continua viva, e é a construção que
// a cumpre que mudou.
const linhaDasNotas = cartoes.match(/grid-cols-\[32px_minmax\(0,1fr\)_104px\][\s\S]{0,1400}?approved\.ratingsAttention/);
exigir(linhaDasNotas !== null,
  'A linha de "Cada nota separada" perdeu a grade estreita do celular, ou perdeu o rótulo de atenção que ela precisa caber, que é o que a impede de estourar a largura do cartão.');
if (linhaDasNotas) {
  exigir(!/whitespace-nowrap/.test(linhaDasNotas[0]),
    'whitespace-nowrap voltou à linha de "Cada nota separada": no celular ela força a grade além da largura do cartão e o rótulo "atenção" vaza para fora.');
  // A coluna do número não pode voltar a `auto` em nenhum dos dois tamanhos. É
  // esta asserção, e não a âncora acima, que impede o defeito de voltar por
  // baixo: alguém pode reescrever a grade do telemóvel mantendo o token que a
  // âncora procura e devolver `auto` ao `sm:`, e os gráficos do portátil
  // voltavam a ter cinco larguras.
  exigir(!/grid-cols-\[[^\]]*_auto\]/.test(linhaDasNotas[0]),
    'A coluna do número em "Cada nota separada" voltou a ser `auto`. Ela mede-se pelo conteúdo da própria linha, e como só algumas linhas levam o rótulo "atenção", os cinco gráficos ficam com cinco larguras e desenham as mesmas 12 semanas em cinco escalas diferentes.');
}

// 7. O contrato precisa continuar registrando a exceção. Sem isso o código
// contradiz o documento aprovado.
exigir(/apenas no celular/.test(contrato) && /faixa-resumo/.test(contrato),
  `${CONTRATO} deixou de registrar a exceção do celular aprovada em 30/08/2026.`);

// 8. E precisa registrar também a remoção do índice, com a data. Uma regra
// apagada do código e viva no documento é a mesma contradição, ao contrário.
exigir(/Painel que cabe no celular \(decisões de 31\/08\/2026\)/.test(contrato),
  `${CONTRATO} deixou de registrar as decisões de 31/08/2026 que tiraram o índice do celular.`);

if (falhas.length) {
  console.error('Painel no celular: %d proteção(ões) falharam.\n', falhas.length);
  for (const falha of falhas) console.error(' - %s', falha);
  process.exit(1);
}
console.log('Painel no celular: %d proteções verdes.', verificadas);
