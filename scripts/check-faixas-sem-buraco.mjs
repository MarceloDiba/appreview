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

// As COLUNAS ESTREITAS que empilham cartões curtos ao lado de um cartão largo
// têm o mesmo problema pela mesma razão, e desde 01/09/2026 há duas: uma em
// cada faixa em grade que usa este padrão (Reputação e comentários ao lado da
// fila; QR e boas práticas ao lado dos temas). Sem `items-start` o cartão de
// cima estica até à altura do irmão e o branco entra para dentro dele.
//
// Elas são encontradas pela FORMA, e não por um id: qualquer coluna estreita
// nova entra automaticamente nesta regra em vez de nascer desguardada.
// Qualquer coluna estreita que EXISTA tem de alinhar ao topo. Não se exige que
// exista: em 01/09/2026 a da Referência foi desfeita de propósito, porque
// empilhar dois cartões ali era justamente o que criava o buraco de baixo.
const colunasEstreitas = [...painel.matchAll(/<div className="grid ([^"]*lg:col-start-3[^"]*)"/g)];
for (const coluna of colunasEstreitas) {
  exigir(/\bitems-start\b/.test(coluna[1]),
    'Uma coluna estreita de cartões curtos deixou de alinhar ao topo, e o cartão de cima volta a esticar até à altura do irmão com branco por dentro.');
}

// A FAIXA DE REFERÊNCIA, colocada pela ALTURA de cada cartão (01/09/2026).
//
// Medido no ecrã com o retrato da conta do dono: a versão anterior punha os
// temas em duas colunas e empilhava o QR e as boas práticas na terceira, e
// deixava um retângulo de cerca de 1270x400 de fundo vazio. O cartão de temas é
// baixo mesmo cheio (é uma nuvem de etiquetas) e a coluna empilhada era alta.
//
// As três linhas abaixo prendem a colocação que resolve isso. Cada uma sozinha
// deixaria o buraco voltar por uma porta diferente.
const colocacao = (marca) => {
  const achado = painel.match(new RegExp(`<div ([^>]*)><${marca}`));
  return achado ? achado[1] : '';
};
exigir(/lg:col-span-3[^>]*lg:row-start-1|lg:row-start-1[^>]*lg:col-span-3/.test(colocacao('TopicsCard')),
  'Os temas deixaram de ocupar a linha inteira na primeira linha da Referência. Em duas colunas, com a altura que este cartão tem, sobra um retângulo de fundo vazio ao lado do que estiver na terceira.');
exigir(/lg:row-start-2/.test(colocacao('QrCard')) && !/lg:col-span/.test(colocacao('QrCard')),
  'O "Do QR ao Google" saiu da segunda linha da Referência, ou passou a ocupar mais de uma coluna. Ele são duas linhas de número e é o cartão estreito desta linha.');
exigir(/lg:col-span-2/.test(colocacao('DailyPractice')) && /lg:row-start-2/.test(colocacao('DailyPractice')),
  'As "Boas práticas" saíram da segunda linha da Referência, ou deixaram de ocupar as duas colunas ao lado do QR. Empilhadas por baixo do QR, elas devolvem à faixa a coluna alta que o desenho de 01/09 foi tirar.');
// A âncora do QR tem de continuar a existir e a apontar para o cartão do QR, e
// não para a coluna inteira: quem chega por ela vem ver o QR.
const ancoraDoQr = painel.match(/<div id=\{QR_ANCHOR_ID\} className="([^"]*)">\s*<QrCard/);
exigir(ancoraDoQr !== null, 'A âncora do QR deixou de estar no cartão do QR.');
if (ancoraDoQr) {
  exigir(/\bscroll-mt-16\b/.test(ancoraDoQr[1]),
    'A âncora do QR perdeu a margem de rolagem, e quem chega por ela fica com o cartão colado ao topo.');
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
// ALTERADO EM 01/09/2026, e a regra não mudou: continua a ser "a fila nunca
// tem um terço de fundo vazio ao lado". Mudou a construção que a cumpre.
//
// Até esta manhã a fila trocava de largura conforme houvesse ou não comentário
// interno por tratar, porque esse cartão era o único candidato à coluna
// estreita e desaparecia numa conta em dia. Marcelo pediu nesse dia que
// "Reputação no Google" subisse para o lado da fila, e esse cartão está SEMPRE
// desenhado: a coluna estreita deixou de poder ficar vazia, e a largura
// variável deixou de ter o que resolver. Uma largura condicional agora seria
// pior: sem comentário interno, a fila esticava por cima da Reputação.
//
// O que passa a ser exigido é o par: a fila fixa em duas colunas E um cartão
// que está sempre na terceira. Exigir só a largura deixaria passar exactamente
// o buraco antigo.
const classesDaFila = painel.match(/<div id=\{QUEUE_ANCHOR_ID\} className="([^"]*)"/);
exigir(classesDaFila !== null,
  'A fila de respostas deixou de declarar a largura dela na faixa de Ação. Sem essa expressão a faixa volta a ser uma pilha de cartões à largura toda, e a primeira dobra do portátil volta a mostrar dois módulos onde cabem quatro.');
if (classesDaFila) {
  exigir(/\blg:col-span-2\b/.test(classesDaFila[1]),
    'A fila de respostas deixou de ocupar duas colunas na faixa de Ação. À largura toda, ela empurra "Reputação no Google" e "Comentários internos" para baixo da primeira dobra, que é o oposto do que a decisão de 01/09 pediu.');
}
// O conteúdo da faixa de Ação, do `<section>` dela até ao seguinte. Ler o
// painel inteiro deixaria esta asserção verde com a Reputação em qualquer
// outra faixa, que é o buraco que ela existe para impedir.
const inicioDaAcao = painel.indexOf('<section data-faixa="acao"');
const fimDaAcao = painel.indexOf('<section data-faixa="mudanca"');
exigir(inicioDaAcao >= 0 && fimDaAcao > inicioDaAcao, 'A faixa de Ação deixou de ser legível no painel.');
const corpoDaAcao = inicioDaAcao >= 0 && fimDaAcao > inicioDaAcao ? painel.slice(inicioDaAcao, fimDaAcao) : '';
exigir(/<ReputationCard snapshot=\{snapshot\} \/>/.test(corpoDaAcao),
  'A faixa de Ação perdeu o cartão que garante que a coluna estreita nunca fica vazia. Sem ele, a fila fixa em duas colunas deixa um terço de fundo vazio ao lado sempre que não há comentário interno por tratar, que é o estado normal de uma conta em dia.');
// O cartão de comentários é o que PODE desaparecer, e por isso é o que leva o
// `empty:hidden`: sem ele, uma conta em dia paga 16px de branco por cima da
// Reputação. Medido no ecrã em 01/09.
// A caixa que embrulha o cartão de comentários, seja qual for a largura dela:
// o que se exige é o `empty:hidden` E a mesma lista que o painel lê. Prender a
// `className` inteira obrigava a mexer nesta linha a cada mudança de largura,
// e uma asserção que se reescreve a cada mudança deixa de ser lida.
// A regex ganhou `[^>]*` antes do fecho na Tarefa 3 de 'convidar-sem-filtrar'
// (02/09/2026): o cartao passou a receber `nomeDoNegocio` e
// `linkDeAvaliacao` depois de `casos={comentariosInternos}`. A exigencia
// continua a mesma: a MESMA lista do painel, como primeira prop, dentro da
// caixa propria dele.
const caixaDosComentarios = painel.match(/<div className="([^"]*)"><PendingCommentsBanner casos=\{comentariosInternos\}[^>]*\/><\/div>/);
exigir(caixaDosComentarios !== null,
  'O cartão de comentários internos deixou de receber a mesma lista que o painel lê, ou saiu da caixa própria dele.');
if (caixaDosComentarios) {
  exigir(/\bempty:hidden\b/.test(caixaDosComentarios[1]),
    'O cartão de comentários internos deixou de esconder-se quando está vazio. Vazio e visível, ele continua a ser um item da grade e o intervalo dele fica na tela: 16px de branco por cima da fila em toda conta em dia.');
}

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
