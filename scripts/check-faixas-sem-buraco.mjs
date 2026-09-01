#!/usr/bin/env node
// As três faixas do painel, sem buraco e lendo-se como três grupos.
// Decisão de 01/09/2026, autorizada por Marcelo: "continuamos mal estruturados
// e com espaços vazios". Ver "Faixas sem buraco" em
// docs/contrato-produto-binno.md.
//
// Este guarda não repete o `check-ordem-por-decisao`, que prende a ORDEM e a
// PRESENÇA dos módulos. Ele prende as quatro construções que tiram o vazio da
// tela, e cada uma existe porque o defeito que ela impede foi medido no ecrã,
// com o Chrome em 390 e em 1280, antes de ser corrigido:
//
//   1. nenhuma faixa volta à lateral fixa que deixava uma coluna sozinha a
//      segurar a altura;
//   2. as faixas em grade alinham ao topo, senão o vazio entra para dentro dos
//      cartões em vez de sair da página;
//   3. Mudança e Referência abrem com o traço separador, que é o que faz as
//      três faixas serem três grupos e não oito cartões seguidos;
//   4. o intervalo ENTRE faixas é maior que o intervalo DENTRO da faixa, senão
//      o traço é a única coisa a agrupar e o ritmo continua a dizer que está
//      tudo ao mesmo nível.
//
// Uma asserção que não consegue ficar vermelha quebrando a regra que diz
// proteger é pior do que asserção nenhuma, porque parece proteção. As quatro
// abaixo foram provadas vermelhas uma a uma, quebrando exactamente a sua regra.
import { readFileSync } from 'node:fs';

const PAINEL = 'src/components/dashboard/ApprovedCockpitDashboard.tsx';
const CONTRATO = 'docs/contrato-produto-binno.md';

// Comentários podem conter qualquer coisa, inclusive o texto exato que estas
// asserções exigem ou proíbem. Sem os remover, um trecho comentado satisfaz
// qualquer busca, e este ficheiro tem comentários longos que citam as próprias
// classes que o guarda procura.
const semComentarios = (fonte) => fonte
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')
  .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');

const falhas = [];
let verificadas = 0;
const exigir = (condicao, mensagem) => { verificadas += 1; if (!condicao) falhas.push(mensagem); };

const painel = semComentarios(readFileSync(PAINEL, 'utf8'));
const contrato = readFileSync(CONTRATO, 'utf8');

// As faixas, com a `className` de cada uma. É sobre estas quatro strings que
// tudo o resto se mede.
const faixas = new Map(
  [...painel.matchAll(/<section data-faixa="([a-z]+)" className="([^"]*)"/g)]
    .map(([, nome, classes]) => [nome, classes]),
);
exigir(faixas.size === 3, `Esperava três faixas com className em ${PAINEL}, encontrei ${faixas.size}.`);

// ---------------------------------------------------------------------------
// 1. A lateral fixa não volta.
// ---------------------------------------------------------------------------
//
// `lg:grid-cols-[minmax(0,1fr)_340px]` era a construção do defeito: uma coluna
// larga com dois ou três cartões e uma lateral de 340px com UM cartão curto
// dentro. No portátil a lateral acabava muito antes da coluna larga, e o que
// ficava do lado direito eram dois retângulos de fundo vazio, medidos em
// 340x590 na faixa de Mudança e 340x500 na de Referência.
for (const [nome, classes] of faixas) {
  exigir(!/grid-cols-\[minmax\(0,1fr\)_340px\]/.test(classes),
    `A faixa "${nome}" voltou à lateral fixa de 340px. Ela deixa uma coluna sozinha a segurar a altura da faixa, e o resto da lateral fica vazio no portátil.`);
}

// ---------------------------------------------------------------------------
// 2. As faixas em grade alinham ao topo.
// ---------------------------------------------------------------------------
//
// Sem `items-start` a grade estica cada cartão até à altura do vizinho mais
// alto, e o vazio não desaparece: muda de sítio, do fundo da página para dentro
// do cartão. Era assim que o "Do QR ao Google" ficava com 137px de branco por
// baixo do último número. Um cartão com um buraco dentro é pior do que um
// intervalo entre cartões, porque o buraco parece conteúdo em falta.
//
// A condição é "se é grade, então alinha ao topo". A faixa de Ação não é grade,
// e exigir `items-start` dela seria exigir uma classe que não faz nada.
for (const [nome, classes] of faixas) {
  if (!/\bgrid\b/.test(classes)) continue;
  exigir(/\bitems-start\b/.test(classes),
    `A faixa "${nome}" é uma grade e deixou de alinhar ao topo. Sem items-start cada cartão estica até à altura do vizinho mais alto, e o espaço vazio entra para dentro do cartão em vez de sair da página.`);
}

// A grade do QR e dos temas vive dentro da Referência e tem o mesmo problema
// pela mesma razão: o QR tem duas linhas de número e os temas têm etiquetas.
const gradeDoQr = painel.match(/<div id=\{QR_ANCHOR_ID\} className="([^"]*)"/);
exigir(gradeDoQr !== null, 'A grade do QR e dos temas sumiu do painel.');
if (gradeDoQr) {
  exigir(/\bitems-start\b/.test(gradeDoQr[1]),
    'A grade do QR e dos temas deixou de alinhar ao topo, e o "Do QR ao Google" volta a esticar até à altura dos temas com branco por baixo do último número.');
}

// ---------------------------------------------------------------------------
// 3. O traço que separa as faixas.
// ---------------------------------------------------------------------------
//
// Não é rótulo, e é de propósito que não é: o contrato proíbe escrever "Ação"
// acima de um cartão que já diz o que é. Um traço não escreve nada, e é o que
// faz a fronteira entre "o que fazer" e "o que mudou" ser um acontecimento
// visual diferente da fronteira entre dois cartões vizinhos.
//
// A faixa de Ação não leva traço porque abre a página: um traço acima dela
// separá-la-ia do cabeçalho, não do que vem antes.
for (const nome of ['mudanca', 'referencia']) {
  const classes = faixas.get(nome) || '';
  exigir(/\bborder-t\b/.test(classes) && /\bpt-8\b/.test(classes),
    `A faixa "${nome}" perdeu o traço que a separa da faixa anterior. Sem ele as três faixas voltam a ler-se como oito cartões seguidos, que foi o que Marcelo chamou de "mal estruturado".`);
}
exigir(!/\bborder-t\b/.test(faixas.get('acao') || ''),
  'A faixa de Ação ganhou um traço acima. Ela abre a página: ali o traço separa-a do cabeçalho, e não de uma faixa anterior que não existe.');

// ---------------------------------------------------------------------------
// 4. O ritmo: mais espaço entre faixas do que dentro delas.
// ---------------------------------------------------------------------------
//
// Esta é a asserção que mede em vez de reconhecer. Antes de 01/09/2026 o
// contentor tinha `space-y-6` e cada faixa `gap-5`/`space-y-5`: 24px entre
// faixas contra 20px entre cartões da mesma faixa. A 4px de diferença o olho
// não agrupa nada, e a página era uma pilha uniforme.
//
// Comparar os números, e não procurar `space-y-8`, é o que impede o guarda de
// ficar verde quando alguém subir os dois valores juntos.
const contentor = painel.match(/return <div className="space-y-(\d+)[^"]*">\s*<MobileSummary/);
exigir(contentor !== null, 'Não foi possível ler o intervalo entre as faixas no contentor do painel.');
if (contentor) {
  const entreFaixas = Number(contentor[1]);
  for (const [nome, classes] of faixas) {
    const dentro = classes.match(/(?:^|\s)(?:gap|space-y)-(\d+)(?:\s|$)/);
    exigir(dentro !== null, `A faixa "${nome}" não declara o intervalo entre os seus cartões.`);
    if (!dentro) continue;
    exigir(entreFaixas > Number(dentro[1]),
      `A faixa "${nome}" tem um intervalo interno de ${dentro[1]} contra ${entreFaixas} entre faixas. Enquanto os dois forem iguais ou próximos, a fronteira entre duas faixas é o mesmo acontecimento visual que a fronteira entre dois cartões, e as três faixas não se leem como três grupos.`);
  }
}

// ---------------------------------------------------------------------------
// 5. A faixa de Ação usa a largura, e sem abrir buraco (01/09/2026).
// ---------------------------------------------------------------------------
//
// Segunda decisão de 01/09/2026, autorizada por Marcelo: "poderia dividir a
// tela ao meio e apresentar mais coisas na primeira dobra". Ver "Primeira
// dobra do portátil" em docs/contrato-produto-binno.md.
//
// Até esse dia a faixa de Ação era a única das três que não era grade: era uma
// pilha, e a 1280 os seus dois cartões ocupavam a largura toda um debaixo do
// outro. Medido no ecrã: na primeira dobra do portátil cabiam "Comentários
// internos" e "Avaliações no Google", e mais nada.
//
// As regras 1 a 4 acima já valem para ela, porque passou a ser grade e entra
// nos mesmos laços. O que fica aqui é o que só esta faixa tem: a largura da
// fila SEGUE a presença do cartão de contagens, em vez de ser fixa. Uma
// largura fixa de duas colunas devolveria a esta faixa exactamente o defeito
// que a decisão acima tirou das outras duas: um terço de fundo vazio ao lado
// de um cartão alto, sempre que o dono não tiver comentário interno por
// tratar, que é o estado normal de uma conta em dia.
const classesDaFila = painel.match(/<div id=\{QUEUE_ANCHOR_ID\} className=\{`([^`]*)`\}/);
exigir(classesDaFila !== null,
  'A fila de respostas deixou de declarar a largura dela na faixa de Ação. Sem essa expressão a faixa volta a ser uma pilha de cartões à largura toda, e a primeira dobra do portátil volta a mostrar dois módulos onde cabem quatro.');
if (classesDaFila) {
  // As duas larguras E a condição que escolhe entre elas. Procurar só por
  // `lg:col-span-2` deixaria passar uma largura fixa de duas colunas, que é
  // precisamente o buraco.
  exigir(/temComentariosInternos \? 'lg:col-span-2' : 'lg:col-span-3'/.test(classesDaFila[1]),
    'A fila de respostas deixou de trocar de largura conforme existir ou não cartão de comentários internos. Fixa em duas colunas, ela deixa um terço de fundo vazio ao lado sempre que não há comentário por tratar; fixa em três, o cartão volta a empilhar-se por cima dela.');
}

// E a condição tem de nascer da MESMA lista que o cartão desenha. Duas
// leituras do mesmo dado, uma para a largura e outra para o conteúdo, são o
// defeito que `src/lib/internalCasePriority.ts` já regista ter custado a este
// projeto uma vez: elas divergem em silêncio na primeira vez que alguém mexer
// numa delas, e aqui a divergência é uma coluna vazia ou um cartão espremido.
exigir(/const temComentariosInternos = comentariosInternos\.length > 0;/.test(painel),
  'A largura da faixa de Ação deixou de sair da lista de comentários internos. Uma segunda leitura para decidir a largura pode discordar da que desenha o cartão, e o resultado na tela é uma coluna vazia ou um cartão sem espaço.');
exigir(/<PendingCommentsBanner casos=\{comentariosInternos\} \/>/.test(painel),
  'O cartão de comentários internos deixou de receber a mesma lista que decide a largura da fila ao lado dele.');

// ---------------------------------------------------------------------------
// 6. O contrato registra as decisões.
// ---------------------------------------------------------------------------
//
// Uma regra viva no código e morta no documento é a contradição que este
// projeto já pagou mais de uma vez, nos dois sentidos.
exigir(/### Faixas sem buraco \(decisão de 01\/09\/2026\)/.test(contrato),
  `${CONTRATO} deixou de registrar a decisão de 01/09/2026 sobre o desenho das faixas.`);
exigir(/mal estruturados e com espaços vazios/.test(contrato),
  `${CONTRATO} deixou de registrar as palavras de Marcelo que motivaram a mudança.`);
exigir(/### Primeira dobra do portátil \(decisão de 01\/09\/2026\)/.test(contrato),
  `${CONTRATO} deixou de registrar a decisão de 01/09/2026 sobre a faixa de Ação usar a largura.`);
exigir(/dividir a tela ao meio e apresentar mais coisas na primeira dobra/.test(contrato),
  `${CONTRATO} deixou de registrar as palavras de Marcelo que motivaram a primeira dobra do portátil.`);

if (falhas.length) {
  console.error('Faixas sem buraco: %d proteção(ões) falharam.\n', falhas.length);
  for (const falha of falhas) console.error(' - %s', falha);
  process.exit(1);
}
console.log('Faixas sem buraco: %d proteções verdes.', verificadas);
