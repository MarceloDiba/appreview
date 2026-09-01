#!/usr/bin/env node
// O rascunho que le a avaliacao, e o texto padrao que continua por baixo dele.
//
// O QUE MUDOU EM 31/08/2026
//
// A fila do painel deixou de mostrar so o texto de `src/lib/replySuggestions.ts`
// e passou a pedir um rascunho a `supabase/functions/sugerir-resposta`, que le o
// que o cliente escreveu. Marcelo, sobre o texto antigo: "nao reconhece o idioma
// que foi escrito automaticamente e nao entende o contexto do que foi dito e
// gera apenas uma resposta padrao".
//
// O template NAO saiu. Ele passou de fonte do rascunho a chao do rascunho: e o
// que esta na tela no primeiro quadro e o que fica quando o modelo nao responde.
// Este guarda protege as quatro regras da troca, e a quinta, que e o dono saber
// qual dos dois esta a ler.
//
// COMO ESTE GUARDA VERIFICA
//
// A politica de verdade vive em `src/lib/rascunhoDoModelo.ts`, sem React e sem
// rede, exatamente para poder ser executada aqui. A maior parte das asserçoes
// abaixo CORRE o modulo com um transporte de mentira e confere o resultado; as
// estruturais existem so para provar que a tela usa mesmo essa politica em vez
// de tomar uma segunda decisao por conta propria.
//
// AS DUAS TELAS
//
// A fila do painel (`ApprovedCockpitDashboard`) e a fila de `/reviews`
// (`ReplySuggestions`, dentro de `FilaDeRespostas`) rascunham resposta para a
// mesma avaliaçao. Uma politica so decide o que esta na caixa nas duas, e a
// secçao "As duas telas dizem a MESMA coisa" prende isso: uma copia local de
// `rascunhoNaTela` ou da etiqueta, em qualquer arquivo de `src/`, fica
// vermelha, mesmo num arquivo que ainda nao existe.
//
// O que difere em `/reviews` esta na sua propria secçao: o painel de la mostra
// varias variantes do molde, e o comentario privado nao passa pelo modelo.
//
// AS MUTAÇOES QUE PROVARAM CADA VERMELHO
//
// Setenta e tres, uma por caminho de codigo, todas confirmadas vermelhas PELA
// asserçao que nomeiam e todas revertidas depois. Onde uma asserçao e gerada em
// laço (as seis falhas da regra 2, as tres chaves nos tres catalogos), foi
// provado um membro por caminho, que e provar o gerador.
//
//   regra 1  devolver vazio no lugar do template, com e sem pedido em curso;
//            impedir o modelo de entrar; fazer `buildReplySuggestions` devolver
//            lista vazia.
//   regra 2  transformar rejeiçao, estouro e resposta vazia em rascunho bom;
//            tirar o `setTimeout` do limite; apagar o caminho feliz.
//   regra 3  trocar a ordem das perguntas em `rascunhoNaTela`; ler o texto do
//            dono por falsidade em vez de por `undefined`; apagar a pergunta
//            pelo dono; passar `undefined` no lugar dele no painel.
//   regra 4  nao guardar nada; nao guardar a falha; ignorar o pedido em voo;
//            perder o id no cache; por `actions` nas dependencias do efeito;
//            apagar cada um dos tres portoes de custo do painel.
//   regra 5  trocar cada uma das quatro origens; apagar a etiqueta do painel;
//            apagar o portao que a esconde no texto do dono; trocar cada uma
//            das tres chaves; apagar uma frase de um catalogo.
//   ligaçao  fazer a caixa ler `suggestion` em vez de `naTela.texto`; tirar o
//            template da ultima posiçao; apagar a chamada ao template; passar
//            outro transporte; apontar o transporte a outra funçao; apagar cada
//            recusa da funçao e o codigo `RASCUNHO_RECUSADO`.
//   o par    apontar CADA UMA das duas telas para uma copia local de
//            `rascunhoNaTela`; apagar o import da politica; apagar o import da
//            etiqueta; escrever uma etiqueta local; chamar a funçao por fora da
//            porta partilhada.
//   funcao   apagar a entrada de espanhol e a de ingles da lista de recusa;
//            neutralizar uma palavra de cada idioma; fazer a lista recusar
//            tudo (nenhum rascunho chegaria ao dono); apagar a advertencia de
//            que ela e uma lista de bloqueio.
//   copiar   voltar a gravar o texto do ecra como autoria; voltar a tornar
//            `draft` obrigatorio; voltar a ler o formato antigo do localStorage.
//   id       passar o id cru das linhas oficiais e do piloto; montar o id a
//            mao noutro arquivo.
//   demo     estampar a etiqueta na demonstraçao publica.
//   /reviews por o texto do modelo debaixo do titulo de uma variante do molde;
//            dar o resultado do modelo as variantes; por o idioma na chave do
//            cartao do modelo; mandar o comentario privado ao modelo; apagar o
//            portao do `open`, o do texto curto, o `reviewId` obrigatorio, o id
//            que a fila passa e o prefixo do id da leitura publica.
//
// ASSERÇOES QUE JA ESTIVERAM VERDES COM A REGRA QUEBRADA
//
// Cinco, e ficam escritas porque a forma delas repete-se:
//
//   `/pedirRascunhoAoBinno/.test(painel)`  ficava verde com o transporte
//     trocado: a LINHA DE IMPORT contem o nome. Passou a medir o argumento.
//   a busca por "travessao" no arquivo da funçao  ficava verde com a recusa
//     apagada: a palavra esta no comentario que a explica. Passou a correr a
//     lista.
//   "o cartao do modelo e ADICIONAL"  media so as variantes do molde, e ficava
//     verde com o cartao do modelo a usar `suggestions[0].title`, que e a regra
//     que ela nomeia a ser quebrada. Passou a medir dentro do cartao do modelo.
//   "o comentario privado nao e mandado a funçao publica"  guardava so o portao
//     DENTRO do painel, e ficava verde com a fila reescrita para
//     `channel="public"`. Passou a medir o chamador, que e quem decide.
//   "a funçao recusa a segunda forma de reparaçao em es"  usava a palavra
//     "reembolso", que a entrada PORTUGUESA tambem apanha: apagar o espanhol
//     deixava-a verde. Passou a usar uma palavra so do espanhol, e a comparar o
//     motivo em vez de conferir apenas que houve recusa.
//
// A licao comum: medir a metade da regra que e facil de escrever deixa a outra
// metade sem guarda nenhum. As quatro primeiras foram achadas por auditoria; a
// quinta pela propria prova de mutaçao, que e para o que ela serve.
//
// `scripts/snapshots/` nao entra aqui: nao ha copy nova a congelar.

import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const raiz = process.cwd();
const ler = (caminho) => readFileSync(resolve(raiz, caminho), 'utf8');

// Comentarios podem conter o texto exato que uma asserçao procura ou proibe: os
// comentarios do painel citam `actions[selected.id]` e `rascunhoNaTela` ao
// explicar as regras. Sem os remover, apagar o codigo e deixar o comentario
// deixaria este guarda verde.
const semComentarios = (fonte) => fonte
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');

const POLITICA = 'src/lib/rascunhoDoModelo.ts';
const TRANSPORTE = 'src/lib/sugerirResposta.ts';
const PAINEL = 'src/components/dashboard/ApprovedCockpitDashboard.tsx';
const SUGESTOES = 'src/components/dashboard/ReplySuggestions.tsx';
const FILA = 'src/components/dashboard/reviews/FilaDeRespostas.tsx';
const CARTAO_PUBLICO = 'src/components/dashboard/reviews/ReviewCard.tsx';
const ETIQUETA = 'src/components/dashboard/OrigemDoRascunho.tsx';
const TEMPLATE = 'src/lib/replySuggestions.ts';
const FUNCAO = 'supabase/functions/sugerir-resposta/index.ts';

const painel = semComentarios(ler(PAINEL));
const sugestoes = semComentarios(ler(SUGESTOES));
const fila = semComentarios(ler(FILA));
const cartaoPublico = semComentarios(ler(CARTAO_PUBLICO));
const etiqueta = semComentarios(ler(ETIQUETA));
const transporte = semComentarios(ler(TRANSPORTE));
const funcao = ler(FUNCAO);

/**
 * As telas que rascunham resposta. Sao as que tem de concordar sobre a mesma
 * avaliacao, e por isso sao medidas em conjunto e nunca uma a uma.
 */
const SUPERFICIES = [
  ['a fila do painel', PAINEL, painel],
  ['a fila de /reviews', SUGESTOES, sugestoes],
];

const {
  rascunhoNaTela,
  pedirRascunho,
  rascunhoGuardado,
  esquecerRascunhos,
} = await import(pathToFileURL(resolve(raiz, POLITICA)).href);

const { buildReplySuggestions } = await import(pathToFileURL(resolve(raiz, TEMPLATE)).href);

const falhas = [];
let verificadas = 0;
const exigir = (rotulo, condicao) => { verificadas += 1; if (!condicao) falhas.push(rotulo); };

const TEMPLATE_NA_TELA = 'TEXTO PADRAO DO BINNO';
const entrada = { comment: 'A comida demorou muito e chegou fria.', rating: 2, businessName: 'Casa do Forno' };

/**
 * Um transporte de mentira que conta quantas vezes foi chamado. Sem a contagem,
 * a regra 4 nao teria como ser medida: um cache que nunca guarda nada devolve
 * exatamente o mesmo resultado que um que guarda.
 */
const transportador = (comportamento) => {
  const contador = { chamadas: 0 };
  const pedir = (dados) => {
    contador.chamadas += 1;
    return comportamento(dados);
  };
  return { pedir, contador };
};

/** Uma promessa que nunca resolve, para representar uma resposta que nao chega. */
const nuncaResolve = () => new Promise(() => {});
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// Regra 1: alguma coisa util esta sempre na tela
// ---------------------------------------------------------------------------
//
// O dono nunca pode olhar para uma caixa vazia nem para uma roda a girar onde
// antes havia rascunho. O template entra no primeiro quadro e so sai quando ha
// algo melhor para por no lugar.

{
  const semNada = rascunhoNaTela(undefined, undefined, TEMPLATE_NA_TELA);
  exigir(
    'regra 1: antes de qualquer resposta do modelo, o texto padrao ja esta na caixa',
    semNada.texto === TEMPLATE_NA_TELA,
  );

  const pedindo = rascunhoNaTela(undefined, { origem: 'pedindo' }, TEMPLATE_NA_TELA);
  exigir(
    'regra 1: com o pedido em curso, a caixa continua com o texto padrao, e nao vazia',
    pedindo.texto === TEMPLATE_NA_TELA,
  );

  const pronto = rascunhoNaTela(undefined, { origem: 'modelo', texto: 'RESPOSTA QUE LEU' }, TEMPLATE_NA_TELA);
  exigir(
    'regra 1: quando o modelo responde, o texto dele substitui o padrao',
    pronto.texto === 'RESPOSTA QUE LEU',
  );

  // Sem esta, "sempre ha texto" poderia ser satisfeito por uma funçao que
  // devolve o template para sempre e nunca deixa o modelo entrar.
  exigir(
    'regra 1: as tres situaçoes acima nao sao todas o mesmo texto',
    semNada.texto === pedindo.texto && pronto.texto !== semNada.texto,
  );

  // O template continua a existir e a ser alcançavel: e o mesmo modulo de
  // sempre, chamado com o pais do negocio, e devolve texto de verdade.
  const doTemplate = buildReplySuggestions({
    rating: 2, text: 'A comida demorou muito', customerName: 'Ana',
    businessName: 'Casa do Forno', businessCountry: 'BR', channel: 'public',
  })[0];
  exigir(
    'regra 1: o texto padrao continua a existir e a sair do mesmo modulo de sempre',
    typeof doTemplate?.body === 'string' && doTemplate.body.trim().length > 0,
  );
}

// ---------------------------------------------------------------------------
// Regra 2: qualquer falha fica com o template
// ---------------------------------------------------------------------------
//
// Erro de rede, 4xx, 5xx, rascunho recusado, resposta vazia e demora: tudo cai
// no mesmo lugar. Um modelo quebrado nao pode quebrar a fila.

for (const [nome, comportamento] of [
  ['a rede cai (promessa rejeitada)', () => Promise.reject(new Error('Failed to fetch'))],
  ['a funçao devolve 4xx (o cliente do Supabase entrega erro)', () => Promise.reject(new Error('FunctionsHttpError: 422'))],
  ['a funçao devolve 5xx', () => Promise.reject(new Error('FunctionsHttpError: 500'))],
  ['o transporte estoura antes de devolver promessa', () => { throw new Error('undefined is not a function'); }],
  ['o modelo devolve vazio', () => Promise.resolve('')],
  ['o modelo devolve so espaço em branco', () => Promise.resolve('   \n  ')],
]) {
  esquecerRascunhos();
  const { pedir } = transportador(comportamento);
  const resultado = await pedirRascunho('avaliacao-falha', entrada, pedir);
  exigir(
    `regra 2: quando ${nome}, o resultado e o texto padrao e nao uma exceçao`,
    resultado.origem === 'template',
  );
  exigir(
    `regra 2: quando ${nome}, a caixa do dono fica com o texto padrao`,
    rascunhoNaTela(undefined, resultado, TEMPLATE_NA_TELA).texto === TEMPLATE_NA_TELA,
  );
}

{
  // A resposta lenta. O template ja esta na tela, entao o limite nao existe
  // para o proteger: existe para o pedido fechar em vez de ficar em voo para
  // sempre, com a etiqueta presa em "lendo a avaliaçao".
  //
  // A corrida contra um relogio mais longo e o que torna esta asserçao capaz de
  // falhar: sem o limite, `pedirRascunho` nunca resolveria e um `await` seco
  // penduraria o guarda em vez de o deixar vermelho.
  esquecerRascunhos();
  const { pedir } = transportador(nuncaResolve);
  const corrida = await Promise.race([
    pedirRascunho('avaliacao-lenta', entrada, pedir, 30),
    espera(1500).then(() => 'PENDURADO'),
  ]);
  exigir(
    'regra 2: uma resposta que nunca chega fecha no texto padrao, em vez de ficar pendurada',
    corrida !== 'PENDURADO' && corrida.origem === 'template',
  );
}

{
  // E a prova de que o caminho feliz nao foi apagado junto: sem ela, tudo
  // acima ficaria verde com uma funçao que devolve `template` sempre.
  esquecerRascunhos();
  const { pedir } = transportador(() => Promise.resolve('  Obrigado por avisar sobre a demora.  '));
  const resultado = await pedirRascunho('avaliacao-feliz', entrada, pedir);
  exigir(
    'regra 2: quando o modelo responde de verdade, o rascunho dele chega, aparado',
    resultado.origem === 'modelo' && resultado.texto === 'Obrigado por avisar sobre a demora.',
  );
}

// ---------------------------------------------------------------------------
// Regra 3: o que o dono escreveu ganha de tudo
// ---------------------------------------------------------------------------
//
// A regra e estrutural, e nao uma corrida de tempo: `rascunhoNaTela` pergunta
// pelo texto do dono ANTES de olhar para o modelo, entao uma resposta atrasada
// nao tem por onde entrar.

{
  const comDono = rascunhoNaTela('O QUE ELE ESCREVEU', { origem: 'modelo', texto: 'RESPOSTA ATRASADA' }, TEMPLATE_NA_TELA);
  exigir(
    'regra 3: uma resposta atrasada do modelo nao substitui o texto que o dono escreveu',
    comDono.texto === 'O QUE ELE ESCREVEU',
  );
  exigir(
    'regra 3: a tela sabe que o texto e do dono, e nao o credita ao modelo',
    comDono.origem === 'dono',
  );

  // O caso que uma leitura por falsidade (`doDono ||`) perde: o dono apagou a
  // caixa ate ficar vazia. Isso e uma decisao dele, e continua a ser o texto
  // dele; devolver o modelo aqui seria escrever por cima de um apagamento.
  const donoVazio = rascunhoNaTela('', { origem: 'modelo', texto: 'RESPOSTA ATRASADA' }, TEMPLATE_NA_TELA);
  exigir(
    'regra 3: a caixa que o dono apagou continua vazia, em vez de ser repovoada pelo modelo',
    donoVazio.texto === '' && donoVazio.origem === 'dono',
  );

  exigir(
    'regra 3: o texto do dono tambem ganha do texto padrao',
    rascunhoNaTela('O QUE ELE ESCREVEU', undefined, TEMPLATE_NA_TELA).texto === 'O QUE ELE ESCREVEU',
  );
}

// ---------------------------------------------------------------------------
// Regra 4: uma chamada por avaliaçao, na sessao
// ---------------------------------------------------------------------------

{
  esquecerRascunhos();
  const { pedir, contador } = transportador(() => Promise.resolve('rascunho'));
  for (let i = 0; i < 5; i += 1) await pedirRascunho('avaliacao-A', entrada, pedir);
  exigir(
    'regra 4: cinco visitas a mesma avaliaçao pagam uma chamada so',
    contador.chamadas === 1,
  );

  // A volta: o dono passa a outra avaliaçao e regressa a esta.
  await pedirRascunho('avaliacao-B', entrada, pedir);
  await pedirRascunho('avaliacao-A', entrada, pedir);
  exigir(
    'regra 4: voltar a uma avaliaçao ja lida nao paga de novo',
    contador.chamadas === 2,
  );
  exigir(
    'regra 4: avaliaçoes diferentes sao pagas em separado (senao o cache estaria a ignorar o id)',
    rascunhoGuardado('avaliacao-A') !== undefined && rascunhoGuardado('avaliacao-B') !== undefined,
  );
}

{
  // Dois quadros seguidos antes de a primeira resposta chegar. Um cache que so
  // guarda depois de resolver deixaria passar duas chamadas aqui.
  esquecerRascunhos();
  let libertar;
  const { pedir, contador } = transportador(() => new Promise((r) => { libertar = r; }));
  const primeira = pedirRascunho('avaliacao-C', entrada, pedir);
  const segunda = pedirRascunho('avaliacao-C', entrada, pedir);
  libertar('rascunho');
  await Promise.all([primeira, segunda]);
  exigir(
    'regra 4: dois pedidos concorrentes da mesma avaliaçao viram uma chamada so',
    contador.chamadas === 1,
  );
}

{
  // A falha tambem e guardada. Sem isto, uma avaliaçao que falhou seria
  // repedida a cada volta do dono, que e uma chamada por render com outro nome.
  esquecerRascunhos();
  const { pedir, contador } = transportador(() => Promise.reject(new Error('cai')));
  await pedirRascunho('avaliacao-D', entrada, pedir);
  await pedirRascunho('avaliacao-D', entrada, pedir);
  await pedirRascunho('avaliacao-D', entrada, pedir);
  exigir(
    'regra 4: uma avaliaçao que falhou nao e repedida a cada volta',
    contador.chamadas === 1,
  );
}

// ---------------------------------------------------------------------------
// Regra 5: o dono sabe se esta a ler o modelo ou o texto padrao
// ---------------------------------------------------------------------------

{
  const origens = [
    ['dono', rascunhoNaTela('meu texto', undefined, TEMPLATE_NA_TELA).origem],
    ['modelo', rascunhoNaTela(undefined, { origem: 'modelo', texto: 'x' }, TEMPLATE_NA_TELA).origem],
    ['pedindo', rascunhoNaTela(undefined, { origem: 'pedindo' }, TEMPLATE_NA_TELA).origem],
    ['template', rascunhoNaTela(undefined, { origem: 'template' }, TEMPLATE_NA_TELA).origem],
  ];
  for (const [esperada, obtida] of origens) {
    exigir(`regra 5: a tela sabe dizer que a origem e "${esperada}"`, obtida === esperada);
  }
  exigir(
    'regra 5: as quatro origens sao distintas entre si',
    new Set(origens.map(([, o]) => o)).size === 4,
  );

  // A etiqueta existe nas DUAS telas, sai de um arquivo so, e diz as tres
  // coisas nos tres idiomas. Sem a metade dos catalogos, apagar as frases
  // deixaria a etiqueta a desenhar a propria chave.
  exigir(
    'regra 5: a etiqueta desaparece quando o texto passa a ser do dono, em vez de mentir sobre a origem',
    /if \(origem === 'dono'\) return null;/.test(etiqueta),
  );
  for (const [nome, , fonte] of SUPERFICIES) {
    exigir(
      `regra 5: ${nome} desenha a etiqueta de origem, e a origem vem de rascunhoNaTela`,
      /<OrigemDoRascunho origem=\{naTela\.origem\} \/>/.test(fonte),
    );
  }
  for (const chave of ['draftFromReview', 'draftReading', 'draftStandard']) {
    exigir(
      `regra 5: a etiqueta partilhada usa a chave reply.${chave}`,
      etiqueta.includes(`t('reply.${chave}')`),
    );
    for (const idioma of ['pt-BR', 'pt-PT', 'en']) {
      const catalogo = JSON.parse(ler(`src/i18n/owner/locales/${idioma}.json`));
      const valor = catalogo?.reply?.[chave];
      exigir(
        `regra 5: ${idioma}.json tem texto para reply.${chave}`,
        typeof valor === 'string' && valor.trim().length > 0,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// As duas telas dizem a MESMA coisa sobre a MESMA avaliacao
// ---------------------------------------------------------------------------
//
// A fila do painel e a fila de `/reviews` rascunham resposta para a mesma
// avaliacao. Enquanto cada uma tivesse a sua decisao sobre qual texto esta na
// caixa, elas podiam divergir sem que ninguem reparasse: o dono lia uma coisa
// no painel e outra em `/reviews`, sobre a mesma pessoa. Duas politicas a
// decidir a mesma coisa e a classe de defeito que este projeto ja pagou varias
// vezes, e aqui seria pior, porque as duas copias ficariam a discordar.
//
// A regra: existe UMA politica, e as duas telas usam-na.

for (const [nome, , fonte] of SUPERFICIES) {
  exigir(
    `${nome} decide o texto pela politica partilhada (${POLITICA}), e nao por uma copia propria`,
    new RegExp(`import \\{[\\s\\S]*?rascunhoNaTela[\\s\\S]*?\\} from '@/lib/rascunhoDoModelo'`).test(fonte)
    && /rascunhoNaTela\(/.test(fonte),
  );
  exigir(
    `${nome} pede o rascunho pela mesma porta partilhada, e nao por uma chamada propria`,
    /pedirRascunho\(/.test(fonte) && !/functions\.invoke\(/.test(fonte),
  );
  // A etiqueta tambem e uma so. Duas telas com frases proprias voltariam a
  // poder dizer coisas diferentes sobre a mesma avaliacao, que e o mesmo
  // defeito noutro lugar.
  exigir(
    `${nome} usa a etiqueta de origem partilhada, e nao uma frase propria`,
    new RegExp(`from '@/components/dashboard/OrigemDoRascunho'`).test(fonte),
  );
}

// E a rede de seguranca que apanha uma tela que ainda nem existe: as duas
// pecas partilhadas tem de estar definidas UMA vez em todo o `src/`. Uma copia
// local em qualquer arquivo, com ou sem import, fica vermelha aqui.
const arquivosDeSrc = [];
const varrer = (pasta) => {
  for (const entrada of readdirSync(pasta, { withFileTypes: true })) {
    const caminho = join(pasta, entrada.name);
    if (entrada.isDirectory()) varrer(caminho);
    else if (/\.(ts|tsx)$/.test(entrada.name)) arquivosDeSrc.push(caminho);
  }
};
varrer(resolve(raiz, 'src'));

const quemDefine = (nome) => arquivosDeSrc.filter((caminho) =>
  new RegExp(`(const|function)\\s+${nome}\\b\\s*[=(:]`).test(semComentarios(readFileSync(caminho, 'utf8'))));

for (const [nome, esperado] of [['rascunhoNaTela', POLITICA], ['OrigemDoRascunho', ETIQUETA]]) {
  const definem = quemDefine(nome);
  exigir(
    `${nome} e definido uma unica vez em src/ (uma copia local faria as telas divergirem)`,
    definem.length === 1 && definem[0].endsWith(esperado.split('/').pop()),
  );
  if (definem.length !== 1) {
    console.error(`  ${nome} definido em: ${definem.map((c) => c.replace(`${raiz}/`, '')).join(', ')}`);
  }
}

// ---------------------------------------------------------------------------
// A fila de /reviews: o que e diferente la, e por que
// ---------------------------------------------------------------------------
//
// Aquele painel mostra VARIAS variantes do molde, e nao um rascunho so. Duas
// decisoes de 31/08/2026, ambas presas aqui.

// 1. O rascunho do modelo entra como um cartao A MAIS, a frente das variantes.
//    Reescrever o corpo de uma variante deixaria o titulo e a dica dela a
//    descrever um texto que o molde nao produziu: "Curta e directa" por cima de
//    um paragrafo que pode nao ser nem curto nem directo.
exigir(
  '/reviews: as variantes do molde entram inteiras, com o titulo e a dica delas',
  /\.\.\.suggestions\.map\(\(suggestion\) => \(\{/.test(sugestoes)
  && /title: suggestion\.title,/.test(sugestoes)
  && /hint: suggestion\.hint,/.test(sugestoes)
  && /padrao: suggestion\.body,/.test(sugestoes),
);

// A METADE QUE FALTAVA, e que a auditoria de 31/08/2026 encontrou.
//
// A asserçao acima mede so as variantes do molde. Ela ficava verde com o cartao
// do modelo a usar `suggestions[0].title` e `suggestions[0].hint`, que e
// exatamente a regra que ela diz proteger a ser quebrada: o texto do modelo
// desenhado debaixo de "Curta e directa", um rotulo do molde a descrever um
// paragrafo que o molde nao escreveu. O cabeçalho deste guarda chegou a
// afirmar que essa mutaçao tinha ficado vermelha; nao tinha.
//
// Passa a medir DENTRO do cartao do modelo: ele tem de ter nome proprio.
const cartaoDoModelo = sugestoes.match(/\{\s*id: 'do-modelo',[\s\S]*?\n\s*\}\]/);
exigir('/reviews: o cartao do modelo deixou de existir.', cartaoDoModelo !== null);
if (cartaoDoModelo) {
  // Desde 01/09/2026 o rotulo segue o CANAL: chamar "Resposta a esta avaliaçao"
  // a um recado privado seria a mesma etiqueta a mentir que esta secçao existe
  // para impedir, so que noutra direcçao. Exige-se as duas chaves, e continua a
  // exigir-se que nenhuma venha do molde.
  exigir(
    '/reviews: o cartao do modelo tem nome proprio, e nao o titulo de uma variante do molde',
    /title: t\(channel === 'private' \? 'reply\.modelTitlePrivate' : 'reply\.modelTitle'\),/.test(cartaoDoModelo[0])
    && !/title: suggestions\[0\]/.test(cartaoDoModelo[0]),
  );
  exigir(
    '/reviews: o cartao do modelo tem dica propria, e nao a dica de uma variante do molde',
    /hint: t\(channel === 'private' \? 'reply\.modelHintPrivate' : 'reply\.modelHint'\),/.test(cartaoDoModelo[0])
    && !/hint: suggestions\[0\]/.test(cartaoDoModelo[0]),
  );
}
// As duas chaves do cartao do modelo nao tinham asserçao nenhuma, enquanto as
// tres da etiqueta tinham nos tres catalogos. Uma chave sem texto desenha-se a
// si propria na tela do dono.
for (const chave of ['modelTitle', 'modelHint']) {
  for (const idioma of ['pt-BR', 'pt-PT', 'en']) {
    const catalogo = JSON.parse(ler(`src/i18n/owner/locales/${idioma}.json`));
    const valor = catalogo?.reply?.[chave];
    exigir(
      `/reviews: ${idioma}.json tem texto para reply.${chave}`,
      typeof valor === 'string' && valor.trim().length > 0,
    );
  }
}
// A metade que faz a regra valer: nenhuma variante do molde recebe o texto do
// modelo. Exatamente um cartao carrega o resultado do modelo, e e o dele.
exigir(
  '/reviews: nenhuma variante do molde recebe o rascunho do modelo',
  /doModelo: undefined as ResultadoDoModelo \| undefined,/.test(sugestoes),
);
exigir(
  '/reviews: exatamente um cartao carrega o resultado do modelo',
  (sugestoes.match(/^\s*doModelo,$/gm) || []).length === 1,
);

// 2. A gaveta onde a edicao do dono e guardada NAO leva o idioma no cartao do
//    modelo. Se a chave mudasse quando o modelo chega, o texto que o dono ja
//    tinha escrito ficaria noutra gaveta e a caixa encher-se-ia sozinha, que e
//    a regra 3 quebrada pelo relogio em vez de pela precedencia.
const chaveDoModelo = sugestoes.match(/chave: `([^`]*)`,/);
exigir('/reviews: o cartao do modelo deixou de ter chave propria.', chaveDoModelo !== null);
if (chaveDoModelo) {
  exigir(
    '/reviews: a chave do cartao do modelo nao depende do selector de idioma',
    chaveDoModelo[1] === 'modelo:${reviewId}',
  );
}

// 3. O comentario privado TAMBEM e pedido ao modelo, desde 01/09/2026, e o que
//    o torna seguro nao e um portao neste componente: e o canal viajar ate a
//    funçao, que tem uma lista de recusa por canal.
//
//    Ate esse dia havia aqui um portao (`if (channel !== 'public') return;`) e
//    ele estava certo enquanto a funçao so sabia falar em publico. Marcelo
//    pediu o privado nesse dia; a funçao ganhou dois canais, e o portao deixou
//    de proteger o que quer que fosse. Apaga-lo sem por nada no lugar deixaria
//    o comentario privado a ser pedido pela lista do publico, que e o defeito
//    que o portao existia para impedir. Por isso as duas asserçoes abaixo.
exigir(
  '/reviews: o painel deixou de recusar o comentario privado',
  !/if \(channel !== 'public'\) return;/.test(sugestoes),
);
// O `channel` tem de ir no corpo do pedido, e tem de ser O DA PROPRIEDADE. Um
// literal aqui (`channel: 'public'`) deixaria este componente com um aspecto
// perfeitamente correcto e mandaria todo comentario privado do QR pela lista
// do publico, que e a mesma classe de defeito que a auditoria de 31/08
// encontrou no chamador: quem obedece nao prova quem manda.
const entradaDoPedido = sugestoes.match(/void pedirRascunho\(\s*reviewId,\s*\{([\s\S]*?)\},/);
exigir('/reviews: a entrada do pedido continua legivel', entradaDoPedido !== null);
if (entradaDoPedido) {
  exigir(
    '/reviews: o painel manda o canal que recebeu, e nao um canal fixo',
    /\n\s*channel,\n/.test(entradaDoPedido[1]) && !/channel: '(public|private)'/.test(entradaDoPedido[1]),
  );
  exigir(
    '/reviews: o painel manda o nome de quem escreveu, que o recado privado usa para abrir',
    /customerName: customerName \?\? null,/.test(entradaDoPedido[1]),
  );
}
// A METADE QUE FALTAVA, e que a auditoria de 31/08/2026 encontrou.
//
// A asserçao acima guarda so o portao DENTRO do painel. Quem decide o canal e o
// chamador: reescrever a fila para `channel="public"` mandava todo comentario
// privado do QR para a funçao afinada para o publico, com o portao intacto e
// todas as asserçoes verdes. Um portao que obedece nao prova quem manda.
exigir(
  '/reviews: a fila decide o canal pela ORIGEM do item, e nao por um literal',
  /channel=\{item\.origem === 'comentario-privado' \? 'private' : 'public'\}/.test(fila),
);
exigir(
  '/reviews: a fila nao fixa o canal num literal, o que mandaria o comentario privado ao publico',
  !/channel="(public|private)"/.test(fila),
);

// 4. Uma chamada por avaliacao, e so quando o dono ABRE o painel. Pedir no
//    desenho de cada cartao pagaria pela fila inteira sempre que a pagina abre.
exigir(
  '/reviews: o rascunho e pedido ao abrir o painel, e nao no desenho de cada cartao da fila',
  /useEffect\(\(\) => \{\s*if \(!open\) return;/.test(sugestoes),
);
exigir(
  '/reviews: uma avaliacao sem texto escrito nao gasta chamada',
  /if \(comentario\.length < 3\) return;/.test(sugestoes),
);

// 5. O id da avaliacao chega de fora, e e obrigatorio. Enquanto `businessCountry`
//    era opcional, quatro das sete chamadas do projeto esqueciam-no e o
//    sintoma so aparecia na tela do dono. Um `reviewId` esquecido faria duas
//    avaliacoes partilharem o mesmo rascunho, que e pior: o dono leria a
//    resposta de outra pessoa. Esquecer passa a ser erro de compilacao.
exigir(
  '/reviews: reviewId e obrigatorio no tipo, e nao um campo que se pode esquecer',
  /\n  reviewId: string;/.test(sugestoes),
);
exigir(
  '/reviews: a fila somada passa o id do item, que ja leva o prefixo da origem',
  /reviewId=\{item\.id\}/.test(fila),
);
// A leitura publica do Google (Definicoes) mostra as MESMAS avaliacoes que a
// fila. Partilhando o espaco de identificadores, a mesma avaliacao e lida uma
// vez, e nao uma vez por tela.
exigir(
  'a leitura publica usa o mesmo espaco de identificadores da fila somada',
  /reviewId=\{idDaFila\('google-publico', review\.review_id\)\}/.test(cartaoPublico),
);

// ---------------------------------------------------------------------------
// Copiar nao e escrever (correçao de 31/08/2026)
// ---------------------------------------------------------------------------
//
// `copyReply` gravava `{ ...currentAction, copied: true }`, e `currentAction.draft`
// era o que estivesse no ecra. Carregar em "Copiar e abrir avaliaçao" ANTES da
// resposta do modelo persistia o TEXTO PADRAO como se fosse autoria do dono, no
// estado e no localStorage. O portao do efeito passava a tratar a avaliaçao como
// escrita para sempre, e ela nunca mais podia ser lida, em nenhuma sessao
// seguinte. Toda avaliaçao com que o dono ensaiou nascia morta.

const corpoDoCopiar = painel.match(/const copyReply = async \(\) => \{([\s\S]*?)\n  \};/);
exigir('a fila do painel deixou de ter copyReply.', corpoDoCopiar !== null);
if (corpoDoCopiar) {
  exigir(
    'copiar marca apenas que o dono copiou',
    /copied: true/.test(corpoDoCopiar[1]),
  );
  exigir(
    'copiar NAO grava rascunho: gravar o que esta no ecra tornaria o texto padrao autoria do dono',
    !/draft/.test(corpoDoCopiar[1]),
  );
}
// Se `draft` voltasse a ser obrigatorio, `save({ copied: true })` deixaria de
// compilar e a correcçao seria desfeita para o fazer compilar de novo.
exigir(
  'o rascunho guardado e opcional: so existe quando o dono escreveu',
  /type ActionState = \{ draft\?: string; copied\?: boolean \};/.test(painel),
);
// O formato antigo nao distingue copiado de escrito. Le-lo manteria mortas
// exatamente as avaliaçoes que o defeito matou.
exigir(
  'a fila do painel deixou de ler o formato antigo, que nao distingue copiado de escrito',
  /binno\.approved-cockpit-actions\.v2/.test(painel),
);

// ---------------------------------------------------------------------------
// Uma avaliaçao, um identificador (correçao de 31/08/2026)
// ---------------------------------------------------------------------------
//
// A fila somada e a leitura publica usavam `google-oficial:`/`google-publico:`;
// a fila do painel passava o `review.id` cru, das MESMAS linhas de
// `useGoogleBusinessReviewQueue`. Uma avaliaçao, duas chaves: paga duas vezes, e
// com `temperature` 0.4 dois textos diferentes para o mesmo cliente em duas
// telas do mesmo produto.

exigir(
  'a fila do painel poe as avaliaçoes oficiais no espaco de identificadores partilhado',
  /idDaFila\('google-oficial', review\.id\)/.test(painel),
);
exigir(
  'a fila do painel poe o piloto Apify no espaco partilhado, com fonte propria',
  /idDaFila\('piloto-apify', review\.id\)/.test(painel),
);
// A rede que apanha o proximo: ninguem volta a escrever este id a mao, em
// arquivo nenhum. `idDaFila` monta `${fonte}:${idNaFonte}`, que nao casa aqui.
const MOLDE_A_MAO = /`(comentario-privado|google-oficial|google-publico|piloto-apify):\$\{/;
const aMao = arquivosDeSrc.filter((caminho) => MOLDE_A_MAO.test(semComentarios(readFileSync(caminho, 'utf8'))));
exigir(
  'ninguem monta o identificador de avaliaçao a mao: ele sai todo de idDaFila',
  aMao.length === 0,
);
if (aMao.length) console.error(`  montam a mao: ${aMao.map((c) => c.replace(`${raiz}/`, '')).join(', ')}`);

// ---------------------------------------------------------------------------
// A demonstraçao publica mostra o produto, nao o nosso plano B
// ---------------------------------------------------------------------------
//
// A etiqueta era estampada sem condiçao, e `BinnoDemoCockpit` desenha esta
// mesma fila em `binno.pro` e em `/demo`. Sem dono e sem modelo, ela dizia
// "Texto padrao" ao possivel cliente, no lugar onde ele devia estar a ver o
// produto a funcionar.
exigir(
  'a etiqueta de origem nao aparece na demonstraçao publica',
  /\{!demo && <OrigemDoRascunho origem=\{naTela\.origem\} \/>\}/.test(painel),
);

// ---------------------------------------------------------------------------
// A tela usa mesmo esta politica, em vez de decidir por conta propria
// ---------------------------------------------------------------------------
//
// As asserçoes acima provam a politica. Estas provam que ela esta ligada: sem
// elas, tudo ficaria verde com um modulo perfeito que ninguem chama.

// A versao anterior desta linha era `/pedirRascunhoAoBinno/.test(painel)`, e nao
// conseguia falhar pela regra que dizia proteger: trocar o argumento por um
// `() => Promise.resolve('')` no efeito deixava o guarda verde, porque a LINHA
// DE IMPORT continuava a conter o nome. Passa a medir o lugar onde o transporte
// e mesmo usado, que e o terceiro argumento de `pedirRascunho`.
exigir(
  'a fila do painel entrega o transporte real a pedirRascunho, e nao so o importa',
  /void pedirRascunho\([\s\S]{0,300}?\n\s*pedirRascunhoAoBinno,\n\s*\)\.then\(/.test(painel),
);
exigir(
  'o transporte fala mesmo com a funçao sugerir-resposta',
  /supabase\.functions\.invoke\('sugerir-resposta'/.test(transporte),
);

exigir(
  'o que esta na caixa e o que `rascunhoNaTela` decidiu, e nao uma segunda decisao escrita no painel',
  /const naTela = rascunhoNaTela\(/.test(painel)
  && /<Textarea value=\{naTela\.texto\}/.test(painel)
  && />\{naTela\.texto\}<\/p>/.test(painel),
);

// O template entra como ULTIMO argumento, que e a posiçao do chao: e o que
// `rascunhoNaTela` devolve quando nao ha nada melhor. Passa-lo noutra posiçao
// trocaria a precedencia sem mudar nenhuma das outras asserçoes.
const chamadaNaTela = painel.match(/const naTela = rascunhoNaTela\(([\s\S]*?)\n\s*\);/);
exigir('a chamada a rascunhoNaTela deixou de existir no painel.', chamadaNaTela !== null);
if (chamadaNaTela) {
  const argumentos = chamadaNaTela[1].split('\n').map((linha) => linha.trim()).filter(Boolean);
  exigir(
    'no painel, o texto do dono e o PRIMEIRO argumento de rascunhoNaTela (a precedencia da regra 3)',
    /^selected \? actions\[selected\.id\]\?\.draft : undefined,$/.test(argumentos[0] || ''),
  );
  exigir(
    'no painel, o texto padrao e o ULTIMO argumento de rascunhoNaTela (a posiçao do chao)',
    /^suggestion,$/.test(argumentos[argumentos.length - 1] || ''),
  );
}

// `suggestion` continua a nascer do template, com o pais do negocio. Esta e a
// metade "o template continua alcançavel" da regra 1, medida no painel.
exigir(
  'no painel, o texto padrao continua a sair de buildReplySuggestions com o pais do negocio',
  /const baseSuggestion = selected \? buildReplySuggestions\(\{[^}]*businessCountry[^}]*\}\)/.test(painel),
);

// Custo: nao se pede o que nao pode entrar na tela. Com rascunho do dono, com a
// demonstraçao publica, ou com uma avaliaçao que e so nota, a chamada nao sai.
for (const [nome, padrao] of [
  ['com rascunho ESCRITO pelo dono nesta avaliaçao', /if \(actions\[selected\.id\]\?\.draft !== undefined\) return;/],
  ['na demonstraçao publica', /if \(demo \|\| !selected\) return;/],
  ['numa avaliaçao sem texto escrito', /if \(selected\.comment\.trim\(\)\.length < 3\) return;/],
]) {
  exigir(`regra 4: o painel nao gasta chamada ${nome}`, padrao.test(painel));
}

// O efeito nao pode depender de `actions`: ele muda a cada letra que o dono
// escreve. O cache do modulo ja garante o numero de chamadas (provado acima),
// mas depender de `actions` faria a fila reexecutar o efeito por tecla, que e a
// forma literal do que a regra 4 proibe.
// `paisLido` entrou nas dependencias em 01/09/2026: o pedido passou a esperar
// pela leitura do perfil, e sem a dependencia o efeito nunca reexecutava quando
// ela chegava. A REGRA e a mesma, e continua a ser o que se prende aqui: o
// efeito nao pode depender de `actions`, que muda a cada letra que o dono
// escreve. As duas metades sao precisas: a lista exacta, e a ausencia de
// `actions` nela.
exigir(
  'regra 4: o efeito do rascunho depende da avaliaçao selecionada, e nao do que o dono digita',
  /\}, \[selected\?\.id, demo, paisLido\]\);/.test(painel)
  && !/\}, \[[^\]]*\bactions\b[^\]]*\]\);/.test(painel),
);

// ---------------------------------------------------------------------------
// A recusa da funçao, EXECUTADA, e em cada idioma que o produto atende
// ---------------------------------------------------------------------------
//
// A versao anterior procurava pedaços da expressao como texto. Isso nao provava
// que ela recusa coisa nenhuma: prova-se que a linha existe, nao que ela apanha
// o que devia. E nao teria apanhado o defeito que a auditoria de 31/08/2026
// encontrou, que era a lista existir e falar so portugues enquanto o pedido
// manda o modelo responder na lingua do cliente.
//
// Agora a lista e extraida do arquivo e CORRIDA contra rascunhos de verdade.

// Desde 01/09/2026 a funçao tem DOIS canais, e a lista de recusa deixou de ser
// um array solto para ser um por canal. As sondas abaixo sao todas do canal
// PUBLICO, que e o que esta secçao sempre guardou: a resposta que o dono
// publica debaixo da avaliaçao, onde prometer reparaçao esta proibido.
//
// O canal privado inverte essa proibiçao de proposito (em privado, oferecer
// resolver e a coisa certa) e ganha outra no lugar. Quem guarda a diferença
// entre os dois e `scripts/check-canal-do-rascunho.mjs`, que corre as duas
// listas lado a lado. Aqui exige-se apenas que a do publico continue inteira.
const inicioDasRegras = funcao.indexOf('const TRAVESSAO =');
const fimDasRegras = funcao.indexOf('// Escolhido em 31/08/2026');
exigir(
  'a lista de recusa da funçao continua a existir e a ser legivel',
  inicioDasRegras >= 0 && fimDasRegras > inicioDasRegras,
);

if (inicioDasRegras >= 0 && fimDasRegras > inicioDasRegras) {
  const TRAVESSAO = String.fromCharCode(0x2014);
  const bloco = funcao
    .slice(inicioDasRegras, fimDasRegras)
    .replace(/^type .*$/gm, '')
    .replace(/: Regra\[\]/g, '')
    .replace(/: Record<Canal, Regra\[\]>/g, '');
  const PROIBIDO = new Function(`${bloco}\nreturn PROIBIDO.public;`)();
  const recusa = (texto) => (PROIBIDO.find(({ padrao }) => padrao.test(texto)) || {}).motivo || null;

  // Uma promessa de reparaçao por idioma. Cada sonda foi escolhida para ser
  // apanhada SO pela entrada do seu idioma: se fosse apanhada por outra, apagar
  // a entrada que ela nomeia deixaria esta asserçao verde.
  for (const [idioma, sonda] of [
    ['pt', 'Peço desculpa. Na próxima visita a sobremesa fica por nossa conta. Casa do Forno'],
    ['es', 'Lamento la espera. Le ofrecemos un descuento en su próxima visita. Casa do Forno'],
    ['en', 'I am sorry about the wait. Your next dessert is on the house. Casa do Forno'],
  ]) {
    exigir(
      `a funçao recusa promessa de reparaçao escrita em ${idioma}`,
      recusa(sonda) === `promessa de reparacao (${idioma})`,
    );
  }

  // Mais uma por idioma, com outra palavra, para a asserçao nao ficar presa a
  // uma unica expressao dentro da entrada.
  //
  // A sonda espanhola dizia "reembolso", e essa palavra tambem esta na entrada
  // portuguesa (`reembols`): neutralizar o espanhol deixava a asserçao verde,
  // porque o portugues apanhava a frase. Passou a "obsequio", que so existe na
  // entrada espanhola. E o motivo passou a ser comparado em vez de se conferir
  // apenas que houve recusa, que era o que escondia a sobreposiçao.
  for (const [idioma, sonda] of [
    ['pt', 'Vamos fazer a devolução do valor da refeição. Casa do Forno'],
    ['es', 'Le enviaremos un obsequio por las molestias. Casa do Forno'],
    ['en', 'We will send you a voucher for your next visit. Casa do Forno'],
  ]) {
    exigir(
      `a funçao recusa a segunda forma de reparaçao em ${idioma}`,
      recusa(sonda) === `promessa de reparacao (${idioma})`,
    );
  }

  // O contraprova: um rascunho bom NAO e recusado. Sem isto, uma expressao que
  // apanhasse tudo deixaria as seis asserçoes acima verdes e a funçao inutil,
  // porque nenhum rascunho chegaria ao dono.
  for (const [idioma, sonda] of [
    ['pt', 'Obrigado por escrever. Já revi o tempo de espera com a equipa e ajustámos a escala. Casa do Forno'],
    ['es', 'Gracias por escribir. Ya he revisado los tiempos con el equipo y hemos ajustado los turnos. Casa do Forno'],
    ['en', 'Thank you for writing. I went through the wait times with the team and changed the rota. Please feel free to ask for me next time. Casa do Forno'],
  ]) {
    exigir(`uma resposta boa em ${idioma} continua a passar, em vez de ser recusada`, recusa(sonda) === null);
  }

  exigir(
    'a funçao recusa o travessao, que e a marca mais reconhecivel de texto gerado',
    recusa(`Obrigado pela visita ${TRAVESSAO} volte sempre.`) === 'travessao',
  );
  for (const [idioma, sonda] of [
    ['pt', 'Sou uma inteligência artificial a responder por este negócio.'],
    ['es', 'Soy un asistente virtual del negocio.'],
    ['en', 'I am an AI writing on behalf of the business.'],
  ]) {
    exigir(`a funçao recusa revelar automaçao em ${idioma}`, recusa(sonda) === 'revela automacao');
  }
}

exigir(
  'a funçao continua a devolver o rascunho recusado como erro, em vez de o entregar',
  /RASCUNHO_RECUSADO/.test(semComentarios(funcao)),
);

// A assercao acima conferia so que o codigo de erro existia no arquivo. Apagar
// o laco inteiro que aplica a lista deixava as 114 verdes, com a correcao
// principal da rodada completamente desguardada: as expressoes eram provadas a
// correr, mas nada provava que elas eram aplicadas ao que o modelo devolveu.
// Achado pela auditoria de 31/08/2026. Rodar a regra nao prova que a regra esta
// ligada.
exigir(
  'a funçao deixou de PERCORRER a lista de proibicoes sobre o rascunho do modelo',
  // `PROIBIDO[canal]` e nao `PROIBIDO`: desde 01/09/2026 a lista aplicada
  // depende do canal. E o texto conferido e `paraConferir`, que e o rascunho
  // sem o nome do negocio: a auditoria do mesmo dia mostrou que um cliente
  // chamado "Cinco Estrelas" era recusado por se assinar, e o pedido MANDA
  // assinar. O que continua a ser exigido e o mesmo, e e o que a auditoria de
  // 31/08 apanhou em falta: que a lista seja PERCORRIDA sobre o rascunho, e
  // nao apenas definida.
  /for \(const \{ padrao, motivo \} of PROIBIDO\[canal\]\)[\s\S]{0,200}padrao\.test\(paraConferir\)/.test(semComentarios(funcao)),
);

// Lido COM comentarios de proposito: o que se exige aqui e a advertencia, e ela
// e um comentario. Quem ler a lista a seguir tem de ler primeiro que ela e uma
// lista de bloqueio, e nao uma garantia: um rascunho que prometa reparaçao por
// outras palavras passa inteiro, e a ultima defesa continua a ser o dono ler
// antes de enviar.
exigir(
  'a funçao diz, onde a lista vive, que e uma lista de bloqueio e nao uma garantia',
  /LISTA DE BLOQUEIO, NAO UMA GARANTIA/.test(funcao)
  && /nao substitui a ultima defesa/.test(funcao),
);

// ---------------------------------------------------------------------------

if (falhas.length) {
  console.error('Rascunho que le: %d proteçao(oes) falharam.\n', falhas.length);
  for (const falha of falhas) console.error(' - %s', falha);
  process.exit(1);
}
console.log(`Rascunho que le: ${verificadas} proteçoes verdes.`);
