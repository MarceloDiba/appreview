#!/usr/bin/env node
// Ordem por decisão: a página começa pelo que muda o dia do dono e termina no
// que ele apenas consulta. Decisão de 31/08/2026, autorizada por Marcelo; ver
// "Ordem por decisão" em docs/contrato-produto-binno.md.
//
// Este guarda protege três coisas que a decisão trouxe, e nada mais:
//
// 1. as três faixas existem, na ordem certa, e cada módulo está na sua;
// 2. nenhum módulo sumiu no caminho: reordenar não é reduzir;
// 3. um módulo sem evidência continua presente e encolhe para uma linha
//    honesta, em vez de gastar uma tela de telemóvel a desenhar um traço.
//
// Cada asserção lê a construção que ela nomeia. Uma asserção que não consegue
// ficar vermelha quebrando a regra que diz proteger é pior do que asserção
// nenhuma, porque parece proteção.
import { readFileSync } from 'node:fs';

const PAINEL = 'src/components/dashboard/ApprovedCockpitDashboard.tsx';
const CONTRATO = 'docs/contrato-produto-binno.md';
const CATALOGOS = ['pt-BR', 'pt-PT', 'en'].map((idioma) => `src/i18n/owner/locales/${idioma}.json`);

// Comentários podem conter qualquer coisa, inclusive o texto exato que estas
// asserções exigem ou proíbem. Sem os remover, um trecho comentado satisfaz
// qualquer busca.
const semComentarios = (fonte) => fonte
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');

// O corpo de `const Nome = ...` até o `;` que fecha a declaração, contando
// chaves e parênteses. Sem isto, "o cartão encolhe sem evidência" seria medido
// no arquivo inteiro, onde há outros cartões com outras regras.
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

const TRACO = String.fromCharCode(0x2014);

const falhas = [];
let verificadas = 0;
const exigir = (condicao, mensagem) => { verificadas += 1; if (!condicao) falhas.push(mensagem); };

const painelBruto = readFileSync(PAINEL, 'utf8');
const painel = semComentarios(painelBruto);
const contrato = readFileSync(CONTRATO, 'utf8');
const catalogos = CATALOGOS.map((caminho) => readFileSync(caminho, 'utf8'));

const corpoDoPainel = corpoDaDeclaracao(painel, 'ApprovedCockpitDashboard') || '';
exigir(corpoDoPainel !== '', `Não foi possível ler o corpo de ApprovedCockpitDashboard em ${PAINEL}.`);

// ---------------------------------------------------------------------------
// 1. As três faixas, na ordem da decisão.
// ---------------------------------------------------------------------------
//
// As faixas são declaradas no DOM e não num comentário. Um comentário a dizer
// "aqui começa a Referência" é apagado por qualquer refatoração sem que nada
// perceba; um `data-faixa` é a construção que o guarda lê e que qualquer pessoa
// vê no inspetor do telemóvel.
const FAIXAS = ['acao', 'mudanca', 'referencia'];
const marcadores = [...corpoDoPainel.matchAll(/<section data-faixa="([a-z]+)"/g)];
exigir(marcadores.map(([, nome]) => nome).join(',') === FAIXAS.join(','),
  `As três faixas da ordem por decisão sumiram, trocaram de ordem ou ganharam companhia. Esperado ${FAIXAS.join(' -> ')}, encontrado: ${marcadores.map(([, nome]) => nome).join(' -> ') || '(nenhuma)'}.`);

// Recorta a região de cada faixa: do seu marcador até o marcador seguinte, e a
// última até o fim do corpo. Sem recortar, "o volume está em Mudança" seria
// apenas "o volume está no arquivo", que é verdade mesmo se ele abrir a página.
const regioes = new Map();
if (marcadores.length === FAIXAS.length) {
  marcadores.forEach((marcador, indice) => {
    const inicio = marcador.index;
    const fim = indice + 1 < marcadores.length ? marcadores[indice + 1].index : corpoDoPainel.length;
    regioes.set(marcador[1], corpoDoPainel.slice(inicio, fim));
  });
}

// O inventário inteiro do painel, módulo a módulo, com a faixa a que a decisão
// o mandou. A faixa-resumo do celular fica de fora de propósito: ela é um bloco
// aditivo que precede as faixas, aprovado em 30/08/2026, e tem guarda próprio em
// `scripts/check-painel-no-celular.mjs`.
const MODULOS = [
  ['acao', '<PendingCommentsBanner userId={userId} />', 'Comentários internos'],
  ['acao', '<ResponseQueue reviews={queue}', 'Avaliações no Google (fila de respostas)'],
  ['mudanca', '<VolumeCard weeks={history} />', 'Volume de avaliações'],
  ['mudanca', '<RatingTrends weeks={history} snapshot={snapshot} />', 'Cada nota separada'],
  ['mudanca', '<WeeklyChange weeks={history} />', 'O que mudou na semana'],
  ['referencia', '<ReputationCard snapshot={snapshot} />', 'Reputação no Google'],
  ['referencia', '<QrCard funnel={funnel.data} />', 'Do QR ao Google'],
  ['referencia', '<TopicsCard snapshot={snapshot} />', 'Temas mais citados'],
  ['referencia', '<DailyPractice snapshot={snapshot} />', 'Boas práticas'],
];

for (const [faixa, marca, nome] of MODULOS) {
  // Duas metades, e as duas são necessárias. A primeira é a regra de não
  // reduzir: o módulo continua desenhado, uma vez e só uma. A segunda é a ordem:
  // ele está na faixa que a decisão lhe deu. Sem a primeira, apagar o módulo
  // deixava a segunda verde por vacuidade.
  const ocorrencias = (corpoDoPainel.match(new RegExp(marca.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
  exigir(ocorrencias === 1,
    `"${nome}" deixou de ser desenhado uma única vez no painel (${ocorrencias} ocorrências). Reordenar a página não autoriza esconder, duplicar ou remover um módulo.`);
  exigir((regioes.get(faixa) || '').includes(marca),
    `"${nome}" saiu da faixa "${faixa}". A página começa pelo que muda o dia do dono e termina no que ele apenas consulta.`);
}

// ---------------------------------------------------------------------------
// 2. O Radar muda de faixa, e nunca some nem aparece duas vezes.
// ---------------------------------------------------------------------------
//
// Com alerta ele é decisão de hoje e abre a página; sem alerta é leitura de
// consulta e fecha. As duas condições saem do MESMO booleano, uma negada, que é
// o que garante "aparece exatamente uma vez, sempre". Duas condições
// independentes (por exemplo `kind === 'alert'` de um lado e `kind !== 'alert'`
// escrito à mão do outro) divergem em silêncio na primeira vez que alguém
// mexer num dos lados.
exigir(/const radarEmAcao = getAdvisorReading\(snapshot\)\.kind === 'alert';/.test(corpoDoPainel),
  'O painel deixou de decidir a faixa do Radar pela leitura dele. Sem esse booleano, "Radar em Ação quando há alerta" vira uma promessa sem construção que a sustente.');
exigir((corpoDoPainel.match(/<RadarNow snapshot=\{snapshot\} \/>/g) || []).length === 2,
  'O Radar deixou de ter as duas colocações da ordem por decisão (Ação com alerta, Referência sem alerta).');
exigir((regioes.get('acao') || '').includes('{radarEmAcao && <RadarNow snapshot={snapshot} />}'),
  'O Radar deixou de abrir a página quando há alerta. Um alerta é decisão de hoje e pertence à faixa de Ação.');
exigir((regioes.get('referencia') || '').includes('{!radarEmAcao && <RadarNow snapshot={snapshot} />}'),
  'O Radar calmo deixou de fechar a página na faixa de Referência. Ou ele sumiu, ou voltou a ocupar a primeira dobra para dizer que não há nada a fazer.');

// ---------------------------------------------------------------------------
// 3. O "Plano de hoje" não volta, e não deixa restos.
// ---------------------------------------------------------------------------
//
// Marcelo mandou-o sair inteiro em 31/08/2026: "não soma em nada". A proibição
// do componente vive no guarda do contrato de produto; aqui ficam os restos que
// o fariam voltar sem ninguém reparar, porque uma chave de texto viva é um
// convite a redesenhar o cartão que a usava.
exigir(!/advisorPilot['"]/.test(painel) && !painel.includes('markAdvisorAction'),
  'O painel voltou a marcar ação do assessor. Quem lia essa marcação era o cartão "Deu resultado?", removido em 31/08/2026: sem leitor, o toque devolve ao dono um botão desativado e mais nada.');
const CHAVES_DO_PLANO = ['"planTitle"', '"planBody"', '"markDone"', '"markedDone"', '"monitorAction"'];
exigir(!CHAVES_DO_PLANO.some((chave) => catalogos.some((catalogo) => catalogo.includes(chave))),
  'Os textos do "Plano de hoje" voltaram a um dos três catálogos. Uma chave apagada de um catálogo só volta pelo outro, e um texto vivo é o começo do cartão de volta.');

// ---------------------------------------------------------------------------
// 4. Sem evidência, o módulo continua presente e encolhe para uma linha.
// ---------------------------------------------------------------------------
//
// O padrão nasceu em 31/08/2026 nos "Temas mais citados" e a ordem por decisão
// generalizou-o. O contrato proíbe esconder um módulo; não obriga a que ele
// ocupe, vazio, o mesmo espaço de quando tem conteúdo.
//
// Cada linha aqui exige três coisas do cartão: que o vazio seja calculado da
// ausência da evidência (e não de uma constante), que a linha honesta seja
// desenhada nesse ramo, e que o corpo pesado fique DEPOIS do `:`, isto é, fora
// de alcance quando não há evidência. Sem a terceira, mover o gráfico para fora
// do ternário passava com o guarda verde, que é exatamente o defeito que este
// painel tinha.
const ENCOLHEM = [
  {
    nome: 'Volume de avaliações',
    componente: 'VolumeCard',
    calculo: 'const semEvidencia = weeks.length === 0;',
    chave: 'dashboard.cockpit.approved.volumeEmpty',
    pesado: '<ResponsiveContainer',
  },
  {
    nome: 'Cada nota separada',
    componente: 'RatingTrends',
    // Distribuição sem histórico é evidência de verdade: a percentagem de cada
    // nota na amostra existe, e é o "antes" que fica em traço. Só encolhe quando
    // faltam as duas.
    calculo: 'const semEvidencia = !hasHistory && !hasDistribution;',
    chave: 'dashboard.cockpit.approved.distributionEmpty',
    pesado: 'divide-y divide-slate-200',
  },
  {
    nome: 'Do QR ao Google',
    componente: 'QrCard',
    // Zero aberturas é evidência: o QR está na mesa e ninguém o leu. Nenhuma
    // leitura de funil é outra coisa. Por isso o portão é a ausência do objeto,
    // e não um total a zero.
    calculo: 'const semEvidencia = funnel === null;',
    chave: 'dashboard.cockpit.approved.qrEmpty',
    pesado: '<dl',
  },
  {
    nome: 'O que mudou na semana',
    componente: 'WeeklyChange',
    calculo: 'const semEvidencia = weeks.length === 0;',
    chave: 'whatsappPilot.weeklyChangeEmpty',
    pesado: '<ResponsiveContainer',
  },
];

for (const { nome, componente, calculo, chave, pesado } of ENCOLHEM) {
  const corpo = corpoDaDeclaracao(painel, componente) || '';
  exigir(corpo !== '', `${componente} sumiu de ${PAINEL}.`);
  if (corpo === '') continue;
  exigir(corpo.includes(calculo),
    `"${nome}" deixou de calcular o vazio a partir da ausência de evidência (esperado: ${calculo}). Um vazio fixo faz o cartão encolher sempre ou nunca, e nos dois casos ele deixa de dizer a verdade.`);
  const ternario = `{semEvidencia ? <p className="mt-2 text-sm text-slate-500">{t('${chave}')}</p> : `;
  const posicao = corpo.indexOf(ternario);
  exigir(posicao !== -1,
    `"${nome}" deixou de encolher para uma linha honesta sem evidência. O módulo continua presente por contrato; o que ele não pode é gastar uma tela de telemóvel a desenhar um traço.`);
  if (posicao === -1) continue;
  const posicaoDoPesado = corpo.indexOf(pesado);
  exigir(posicaoDoPesado > posicao,
    `"${nome}" desenha "${pesado}" fora do ramo com evidência: o corpo pesado voltou a ocupar a tela mesmo quando não há o que mostrar.`);
}

// A reputação encolhe em duas metades separadas, porque tem duas evidências
// diferentes: a distribuição vem da amostra e as duas medidas vêm das datas que
// a busca trouxer. A nota e o total nunca faltam, e por isso o cartão inteiro
// nunca encolhe.
const corpoDaReputacao = corpoDaDeclaracao(painel, 'ReputationCard') || '';
exigir(corpoDaReputacao.includes("<p className=\"mt-2 text-sm text-slate-500\">{t('dashboard.cockpit.approved.reputationBreakdownEmpty')}</p>")
  && !corpoDaReputacao.includes(`<p className="mt-5 text-sm text-slate-500">${TRACO}</p>`),
  'A "Reputação no Google" voltou a desenhar um traço solto no lugar da distribuição por nota. Um traço não diz por que está vazio.');
exigir(corpoDaReputacao.includes('const semMedidas = (replyHours === null || replyHours === undefined) && (last30 === null || last30 === undefined);'),
  'A "Reputação no Google" deixou de calcular a ausência das duas medidas a partir das próprias medidas.');
const ternarioDasMedidas = "{semMedidas ? <p className=\"mt-2 text-sm text-slate-500\">{t('dashboard.cockpit.approved.reputationMetricsEmpty')}</p> : ";
const posicaoDasMedidas = corpoDaReputacao.indexOf(ternarioDasMedidas);
exigir(posicaoDasMedidas !== -1,
  'A "Reputação no Google" voltou a desenhar dois mosaicos com um traço em cada quando a busca não trouxe as datas.');
exigir(posicaoDasMedidas !== -1 && corpoDaReputacao.indexOf('<Metric label=') > posicaoDasMedidas,
  'Os mosaicos de medida da "Reputação no Google" saíram do ramo com evidência e voltam a ocupar a tela vazios.');

// Os "Temas mais citados" são a origem do padrão, de 31/08/2026. A asserção
// existe para que a generalização não deixe o caso original desprotegido: se
// alguém "arrumar" este cartão de volta ao formato antigo, o padrão inteiro
// perde a referência de onde veio.
const corpoDosTemas = corpoDaDeclaracao(painel, 'TopicsCard') || '';
exigir(corpoDosTemas.includes("<p className=\"mt-2 text-sm text-slate-500\">{t('dashboard.cockpit.approved.topicsEmpty')}</p>"),
  'Os "Temas mais citados" perderam a linha honesta de 31/08/2026, que é o padrão que a ordem por decisão generalizou para os outros cartões.');

// ---------------------------------------------------------------------------
// 5. O contrato registra a decisão.
// ---------------------------------------------------------------------------
//
// Uma regra viva no código e morta no documento é a mesma contradição que este
// projeto já pagou mais de uma vez, só que ao contrário.
exigir(/### Ordem por decisão \(decisão de 31\/08\/2026\)/.test(contrato),
  `${CONTRATO} deixou de registrar a ordem por decisão de 31/08/2026.`);
exigir(/não soma em nada/.test(contrato),
  `${CONTRATO} deixou de registrar a razão de Marcelo para tirar o "Plano de hoje".`);

if (falhas.length) {
  console.error('Ordem por decisão: %d proteção(ões) falharam.\n', falhas.length);
  for (const falha of falhas) console.error(' - %s', falha);
  process.exit(1);
}
console.log('Ordem por decisão: %d proteções verdes.', verificadas);
