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
// AS MUTAÇOES QUE PROVARAM CADA VERMELHO
//
// Trinta e nove, uma por caminho de codigo, todas confirmadas vermelhas PELA
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
//
// Duas asserçoes NAO passaram nesta prova na primeira tentativa e foram
// substituidas, nao removidas: `/pedirRascunhoAoBinno/.test(painel)` ficava
// verde com o transporte trocado, porque a linha de import contem o nome; e a
// busca por "travessao" no arquivo da funçao ficava verde com a recusa apagada,
// porque a palavra esta no cabeçalho que a explica. Ver os comentarios nos dois
// lugares.
//
// `scripts/snapshots/` nao entra aqui: nao ha copy nova a congelar.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
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
const TEMPLATE = 'src/lib/replySuggestions.ts';
const FUNCAO = 'supabase/functions/sugerir-resposta/index.ts';

const painel = semComentarios(ler(PAINEL));
const transporte = semComentarios(ler(TRANSPORTE));
const funcao = ler(FUNCAO);

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

  // A etiqueta existe na tela, e diz as tres coisas nos tres idiomas. Sem a
  // metade dos catalogos, apagar as frases deixaria a etiqueta a desenhar a
  // propria chave.
  exigir(
    'regra 5: o painel desenha a etiqueta de origem ao lado do titulo da resposta',
    /<OrigemDoRascunho origem=\{naTela\.origem\} \/>/.test(painel),
  );
  exigir(
    'regra 5: a etiqueta desaparece quando o texto passa a ser do dono, em vez de mentir sobre a origem',
    /if \(origem === 'dono'\) return null;/.test(painel),
  );
  for (const chave of ['draftFromReview', 'draftReading', 'draftStandard']) {
    exigir(
      `regra 5: o painel usa a chave dashboard.cockpit.approved.${chave}`,
      painel.includes(`t('dashboard.cockpit.approved.${chave}')`),
    );
    for (const idioma of ['pt-BR', 'pt-PT', 'en']) {
      const catalogo = JSON.parse(ler(`src/i18n/owner/locales/${idioma}.json`));
      const valor = catalogo?.dashboard?.cockpit?.approved?.[chave];
      exigir(
        `regra 5: ${idioma}.json tem texto para ${chave}`,
        typeof valor === 'string' && valor.trim().length > 0,
      );
    }
  }
}

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
  /draft: naTela\.texto/.test(painel)
  && /const naTela = rascunhoNaTela\(/.test(painel),
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
  ['com rascunho do dono nesta avaliaçao', /if \(actions\[selected\.id\] !== undefined\) return;/],
  ['na demonstraçao publica', /if \(demo \|\| !selected\) return;/],
  ['numa avaliaçao sem texto escrito', /if \(selected\.comment\.trim\(\)\.length < 3\) return;/],
]) {
  exigir(`regra 4: o painel nao gasta chamada ${nome}`, padrao.test(painel));
}

// O efeito nao pode depender de `actions`: ele muda a cada letra que o dono
// escreve. O cache do modulo ja garante o numero de chamadas (provado acima),
// mas depender de `actions` faria a fila reexecutar o efeito por tecla, que e a
// forma literal do que a regra 4 proibe.
exigir(
  'regra 4: o efeito do rascunho depende da avaliaçao selecionada, e nao do que o dono digita',
  /\}, \[selected\?\.id, demo\]\);/.test(painel),
);

// A funçao existe, esta neste repositorio, e continua a recusar o que nao pode
// chegar ao dono. Sem esta linha, apagar as verificaçoes de la deixaria este
// guarda verde com um travessao a caminho da pagina do negocio.
//
// A versao anterior procurava as palavras "travessao", "promessa de reparacao" e
// "revela automacao" no arquivo INTEIRO, comentarios incluidos. Nao conseguia
// falhar: as tres palavras aparecem no cabeçalho que explica cada regra, entao
// apagar as regras de verdade deixava o guarda verde. Passa a ler o codigo sem
// comentarios, e a exigir os PADROES, que sao o que faz a recusa acontecer.
const funcaoSemComentarios = semComentarios(funcao);
for (const [nome, padrao] of [
  ['travessao e meio-risco', /\[\$\{TRAVESSAO\}\$\{MEIO_RISCO\}\]/],
  ['promessa de reparaçao', /reembols\|devolu/],
  ['revelar que e automaçao', /intelig\[e/],
]) {
  exigir(
    `a funçao sugerir-resposta continua a recusar o rascunho que contem ${nome}`,
    padrao.test(funcaoSemComentarios),
  );
}
exigir(
  'a funçao sugerir-resposta continua a devolver o rascunho recusado como erro, em vez de o entregar',
  /RASCUNHO_RECUSADO/.test(funcaoSemComentarios),
);

// ---------------------------------------------------------------------------

if (falhas.length) {
  console.error('Rascunho que le: %d proteçao(oes) falharam.\n', falhas.length);
  for (const falha of falhas) console.error(' - %s', falha);
  process.exit(1);
}
console.log(`Rascunho que le: ${verificadas} proteçoes verdes.`);
