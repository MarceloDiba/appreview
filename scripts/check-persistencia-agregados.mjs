import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

// Persistência dos agregados da coleta Apify (30/08/2026).
//
// Ate aqui uma coleta bem-sucedida devolvia o resultado para o navegador e
// nada chegava ao banco: `google_business_reputation_snapshots` tinha zero
// linhas, e a coleta automática do cadastro, que roda sem navegador nenhum,
// gastava dinheiro e descartava o agregado inteiro.
//
// Cinco regras passaram a precisar de guarda, e todas as asserções abaixo são
// presas ao fluxo de dados que elas nomeiam, nunca a uma substring solta: um
// teste que fica verde com código morto, com uma chamada comentada ou com uma
// prop cujo valor mudou de nome não protege nada. Cada uma foi provada
// vermelha quebrando exatamente a sua regra, incluindo as evasões conhecidas
// (`??` no lugar de `||`, renomear o valor mantendo o nome da prop, comentar a
// chamada, trocar `.insert(` por `.upsert(`).
//
// GUARDA 1: nome do avaliador, texto da avaliação e URL pública da avaliação
// nunca podem virar dado persistido (contrato de produto, linhas 39 a 41).
//
// GUARDA 2: as colunas derivadas de amostra vem de no máximo 50 avaliações no
// caminho Apify e de todas as avaliações no caminho oficial. Leitura que
// compara linhas ao longo do tempo sem separar por `source` inventaria um
// salto de resultado (contrato, linha 30).
//
// GUARDA 3: o painel mostra o agregado mais recente, e não o do navegador por
// definição. A coleta diária no servidor grava só a linha persistida.
//
// GUARDA 4: a fila de respostas vem sempre do `localStorage`, qualquer que
// seja a fonte do agregado, e o histórico semanal só entra quando a amostra
// que o gerou cobre a janela comparada.
//
// GUARDA 5: o cockpit renderizado identifica o que veio de amostra.

const root = process.cwd();
const lerBruto = (caminho) => readFileSync(resolve(root, caminho), 'utf8');

/**
 * Remove comentários de linha e de bloco (inclusive os de JSX, que são blocos
 * dentro de chaves) respeitando literais de string, para que `https://` e o
 * texto de uma chave de traducao não sejam mutilados.
 *
 * Casar contra o texto com comentários deixa passar código comentado: uma
 * chamada dentro de `//` satisfazia a asserção dos chamadores sem existir.
 */
const semComentarios = (fonte) => {
  let saida = '';
  let indice = 0;
  let aspas = null;
  while (indice < fonte.length) {
    const atual = fonte[indice];
    const proximo = fonte[indice + 1];
    if (aspas) {
      if (atual === '\\') {
        saida += atual + (proximo || '');
        indice += 2;
        continue;
      }
      if (atual === aspas) aspas = null;
      saida += atual;
      indice += 1;
      continue;
    }
    if (atual === '"' || atual === "'" || atual === '`') {
      aspas = atual;
      saida += atual;
      indice += 1;
      continue;
    }
    if (atual === '/' && proximo === '/') {
      while (indice < fonte.length && fonte[indice] !== '\n') indice += 1;
      continue;
    }
    if (atual === '/' && proximo === '*') {
      indice += 2;
      while (indice < fonte.length && !(fonte[indice] === '*' && fonte[indice + 1] === '/')) indice += 1;
      indice += 2;
      continue;
    }
    saida += atual;
    indice += 1;
  }
  return saida;
};

const lerCodigo = (caminho) => semComentarios(lerBruto(caminho));
const lerSql = (caminho) => lerBruto(caminho).replace(/--[^\n]*/g, '');

const TABELA = 'google_business_reputation_snapshots';

// Colunas que a tabela aceita. Toda escrita precisa ser um subconjunto disto.
// Uma coluna nova (nome do avaliador, comentário, permalink) reprova aqui
// antes de existir migração para ela.
const COLUNAS_PERMITIDAS = new Set([
  'user_id',
  'location_id',
  'captured_at',
  'total_reviews',
  'average_rating',
  'rating_breakdown',
  'unanswered_review_count',
  'reviews_last_30_days',
  'average_response_hours',
  'topics',
  // ACRESCENTADA EM 02/09/2026, e a razao importa mais do que a coluna.
  //
  // `weekly_history` guarda as semanas do historico: data de inicio, quantas
  // avaliacoes, a divisao por nota e quantas o dono respondeu. Sao contagens e
  // datas. NAO ha nome de avaliador, texto de avaliacao nem link — e esta
  // lista existe exactamente para que essa conferencia seja feita por alguem,
  // uma coluna de cada vez, antes de a coluna existir.
  //
  // Ela entrou porque o historico so vivia no `localStorage` do navegador que
  // coletou: quem trocasse de aparelho, ou recebesse uma coleta feita pelo
  // servidor, via numeros e nenhum grafico. Ver
  // `scripts/check-historico-que-sobrevive.mjs`.
  'weekly_history',
  'source',
]);

// Vocabulario de identificação. Nao entra em payload persistido nem em nome de
// coluna, em nenhuma das duas linguagens.
const IDENTIFICAVEL = /reviewer|author|observed|reviewurl|review_url|reviewlink|permalink|comment|display_name|nome_publico/i;

// Todo verbo que escreve. Trocar `.insert(` por `.upsert(` continuava gravando
// e escapava da versao anterior deste guarda, que só conhecia `.insert(`.
const VERBOS_DE_ESCRITA = ['.insert(', '.upsert(', '.update('];

// ---------------------------------------------------------------------------
// Utilitarios de extração. Todos trabalham sobre texto já sem comentários.
// ---------------------------------------------------------------------------

// Fim da instrução que comeca em `inicio`: o `;` em profundidade zero,
// ignorando `;` dentro de strings, parenteses, chaves ou colchetes.
const fimDaInstrucao = (fonte, inicio) => {
  let profundidade = 0;
  let aspas = null;
  for (let i = inicio; i < fonte.length; i += 1) {
    const atual = fonte[i];
    if (aspas) {
      if (atual === '\\') i += 1;
      else if (atual === aspas) aspas = null;
      continue;
    }
    if (atual === '"' || atual === "'" || atual === '`') aspas = atual;
    else if (atual === '(' || atual === '{' || atual === '[') profundidade += 1;
    else if (atual === ')' || atual === '}' || atual === ']') profundidade -= 1;
    else if (atual === ';' && profundidade === 0) return i;
  }
  return -1;
};

// Expressao atribuída a `const <nome> = ...;`. E o que permite seguir o valor
// que uma prop realmente recebe, em vez de confiar no nome da prop.
const expressaoAtribuida = (fonte, nome) => {
  const marcador = new RegExp(`(?:export )?const ${nome}(?:[^=\\n]*)?=`);
  const achado = fonte.match(marcador);
  if (!achado) return null;
  const inicio = achado.index + achado[0].length;
  const fim = fimDaInstrucao(fonte, inicio);
  return fim === -1 ? null : fonte.slice(inicio, fim).trim();
};

// Instruçao `return ...;` de dentro de um corpo de componente. Uma etiqueta
// que aparece no corpo mas fora do return não e renderizada.
const instrucaoDeRetorno = (corpo) => {
  const achado = corpo.match(/\breturn\s+</);
  if (!achado) return null;
  const fim = fimDaInstrucao(corpo, achado.index);
  return fim === -1 ? null : corpo.slice(achado.index, fim);
};

// Corpo entre parenteses balanceados a partir do primeiro `(` depois do
// marcador. Balanceado porque os valores tem os seus próprios parenteses.
const corpoEntreParenteses = (fonte, marcador) => {
  const inicio = fonte.indexOf(marcador);
  if (inicio === -1) return null;
  const abre = fonte.indexOf('(', inicio);
  if (abre === -1) return null;
  let profundidade = 0;
  for (let i = abre; i < fonte.length; i += 1) {
    if (fonte[i] === '(') profundidade += 1;
    else if (fonte[i] === ')') {
      profundidade -= 1;
      if (profundidade === 0) return fonte.slice(abre + 1, i);
    }
  }
  return null;
};

// Trecho entre dois marcadores literais, o segundo procurado a partir do fim
// do primeiro.
const extrairEntre = (fonte, inicioMarcador, fimMarcador) => {
  const inicio = fonte.indexOf(inicioMarcador);
  if (inicio === -1) return null;
  const fim = fonte.indexOf(fimMarcador, inicio + inicioMarcador.length);
  if (fim === -1) return null;
  return fonte.slice(inicio, fim + fimMarcador.length);
};

// Chaves definidas num payload: `chave:` no inicio da linha, mais a forma
// abreviada `chave,`.
const chavesDoPayload = (payload) => {
  const chaves = [];
  for (const achado of payload.matchAll(/^[ \t]*([A-Za-z_]\w*)\s*:/gm)) chaves.push(achado[1]);
  for (const achado of payload.matchAll(/^[ \t]*([A-Za-z_]\w*)\s*,\s*$/gm)) chaves.push(achado[1]);
  return chaves;
};

// Numero escrito como expressao aritmética de literais (`10 * 60 * 1_000`).
const valorNumerico = (expressao) => {
  if (!expressao || !/^[\d_\s*+-]+$/.test(expressao.trim())) return null;
  const valor = Number(Function(`"use strict"; return (${expressao.replace(/_/g, '')});`)());
  return Number.isFinite(valor) ? valor : null;
};

// ---------------------------------------------------------------------------
// Arquivos
// ---------------------------------------------------------------------------

const arquivosTypeScript = () => {
  const encontrados = [];
  const percorrer = (diretorio) => {
    for (const entrada of readdirSync(resolve(root, diretorio), { withFileTypes: true })) {
      const caminho = `${diretorio}/${entrada.name}`;
      if (entrada.isDirectory()) {
        if (entrada.name !== 'node_modules' && entrada.name !== 'dist') percorrer(caminho);
      } else if (/\.tsx?$/.test(entrada.name)) {
        encontrados.push(caminho);
      }
    }
  };
  percorrer('src');
  percorrer('supabase/functions');
  return encontrados;
};

const nucleoDeColeta = lerCodigo('supabase/functions/_shared/experimentalApifyCollection.ts');
const coletorManual = lerCodigo('supabase/functions/sync-experimental-apify/index.ts');
const drenadorAutomatico = lerCodigo('supabase/functions/apify-auto-collect-on-signup/index.ts');
const paginaDoPainel = lerCodigo('src/pages/Dashboard.tsx');
const leituraDoAgregado = lerCodigo('src/lib/reputationSnapshotReading.ts');
/*
 * O COCKPIT PASSOU A VIVER EM TRES FICHEIROS em 04/09/2026, quando o painel
 * passou o tecto de 350 linhas: o painel, os cartoes de leitura e a nota de
 * amostra. As regras deste guarda sao sobre CADA CARTAO que desenha uma medida
 * derivada da amostra — "a regra e a medida que o cartao le, nao uma lista de
 * nomes" — e por isso tem de ver os tres.
 *
 * Juntar os ficheiros e seguro AQUI porque nenhuma assercao deste guarda e
 * sobre posicao entre cartoes: sao todas sobre o que cada cartao carrega
 * DENTRO do proprio return, e nenhum corpo ficou dividido entre ficheiros.
 */
const cockpitRenderizado = [
  'src/components/dashboard/ApprovedCockpitDashboard.tsx',
  'src/components/dashboard/reputacao/CartoesDeLeitura.tsx',
  'src/components/dashboard/NotaDaAmostra.tsx',
].map(lerCodigo).join('\n');
const cockpitIntermediario = lerCodigo('src/components/dashboard/ExperimentalCockpitDashboard.tsx');

// Recorta a consulta inteira a partir do `.from('<tabela>')` até o `;` que a
// termina, para poder exigir coisas DA CONSULTA em vez de procurar uma string
// solta em qualquer lugar do arquivo.
const consultasDaTabela = () => {
  const consultas = [];
  for (const caminho of arquivosTypeScript()) {
    const conteudo = lerCodigo(caminho);
    const marcador = new RegExp(`\\.from\\((['"])${TABELA}\\1\\)`, 'g');
    let achado = marcador.exec(conteudo);
    while (achado) {
      const fim = fimDaInstrucao(conteudo, achado.index);
      consultas.push({ caminho, trecho: conteudo.slice(achado.index, fim === -1 ? conteudo.length : fim) });
      achado = marcador.exec(conteudo);
    }
  }
  return consultas;
};

const consultas = consultasDaTabela();
const escritas = consultas.filter(({ trecho }) => VERBOS_DE_ESCRITA.some((verbo) => trecho.includes(verbo)));
const leituras = consultas.filter(({ trecho }) => trecho.includes('.select(')
  && !VERBOS_DE_ESCRITA.some((verbo) => trecho.includes(verbo)));

const migracoes = readdirSync(resolve(root, 'supabase/migrations'))
  .filter((nome) => nome.endsWith('.sql'))
  .map((nome) => ({ nome, sql: lerSql(`supabase/migrations/${nome}`) }));

const instrucoesSqlDaTabela = () => {
  const instrucoes = [];
  for (const { nome, sql } of migracoes) {
    let posicao = sql.indexOf(TABELA);
    while (posicao !== -1) {
      const fim = sql.indexOf(';', posicao);
      instrucoes.push({ nome, sql: sql.slice(posicao, fim === -1 ? sql.length : fim) });
      posicao = sql.indexOf(TABELA, posicao + TABELA.length);
    }
  }
  return instrucoes;
};

// Valor da prop `snapshot` que o painel de fato renderiza, seguido até a
// expressao que o produz. Conferir o nome da prop não prova nada: o valor pode
// ser trocado por outro mantendo `snapshot={...}` identico.
const propDoCockpit = paginaDoPainel.match(/<ExperimentalCockpitDashboard\s+snapshot=\{([^}]+)\}/);
const valorRenderizado = propDoCockpit ? propDoCockpit[1].trim() : null;
const expressaoRenderizada = valorRenderizado && /^[A-Za-z_$][\w$]*$/.test(valorRenderizado)
  ? expressaoAtribuida(paginaDoPainel, valorRenderizado)
  : null;

const corpoDaComposicao = expressaoAtribuida(leituraDoAgregado, 'composeCockpitSnapshot');
const corpoDaEscolha = expressaoAtribuida(leituraDoAgregado, 'freshestAggregates');
const corpoDaDataDoNavegador = expressaoAtribuida(leituraDoAgregado, 'browserTimeOf');
const corpoDoCorte = expressaoAtribuida(leituraDoAgregado, 'sampleWasTruncated');

const requisitos = [
  // ------------------------------------------------------------------
  // GUARDA 1: campo identificável nunca vira dado persistido.
  // ------------------------------------------------------------------

  (() => {
    const rotulo = 'os dois chamadores (piloto manual e drenador do cadastro) coletam pelo núcleo partilhado, e o núcleo grava o agregado no caminho de sucesso, entre a auditoria concluída e o retorno';
    // Contar escritas no repositorio não prova nada sobre os chamadores: o
    // núcleo mais o caminho oficial já somam dois sozinhos. Se o drenador
    // automático deixasse de passar pelo núcleo, a coleta automática voltaria
    // a gastar sem persistir e a contagem continuaria a mesma. Os dois
    // arquivos são abertos SEM COMENTARIOS, então uma chamada comentada não
    // satisfaz esta linha.
    const escritaNoNucleo = escritas.some((escrita) => escrita.caminho === 'supabase/functions/_shared/experimentalApifyCollection.ts');
    const manualPassaPeloNucleo = /await runExperimentalApifyCollection\(/.test(coletorManual);
    const automaticoPassaPeloNucleo = /await runExperimentalApifyCollection\(/.test(drenadorAutomatico);
    const caminhoDeSucesso = extrairEntre(nucleoDeColeta, "status: 'succeeded',", 'return { ok: true');
    const chamada = Boolean(caminhoDeSucesso) && /await persistAggregateSnapshot\(\{[^}]*aggregateSnapshot[^}]*\}\)/.test(caminhoDeSucesso);
    return [rotulo, escritaNoNucleo && manualPassaPeloNucleo && automaticoPassaPeloNucleo && chamada];
  })(),

  (() => {
    const rotulo = 'toda escrita na tabela de agregados (insert, upsert ou update) usa apenas colunas da lista aprovada, e nenhum valor persistido vem de nome, texto ou URL de avaliação';
    // `every` de lista vazia e verdadeiro: sem a contagem abaixo, apagar a
    // gravação (ou trocar o verbo por um que este guarda não conhecesse)
    // deixaria esta linha verde sem conferir nada.
    if (!escritas.length) return [rotulo, false];
    const todasValidas = escritas.every(({ trecho }) => {
      const verbo = VERBOS_DE_ESCRITA.find((candidato) => trecho.includes(candidato));
      const payload = corpoEntreParenteses(trecho, verbo);
      if (!payload) return false;
      const chaves = chavesDoPayload(payload);
      if (!chaves.length) return false;
      const somenteAprovadas = chaves.every((chave) => COLUNAS_PERMITIDAS.has(chave));
      const valoresLimpos = !IDENTIFICAVEL.test(payload.replace(/^[ \t]*[A-Za-z_]\w*\s*:/gm, ''));
      return somenteAprovadas && valoresLimpos;
    });
    return [rotulo, todasValidas];
  })(),

  (() => {
    const rotulo = 'nenhuma migração cria ou adiciona coluna identificável na tabela de agregados';
    const instrucoes = instrucoesSqlDaTabela();
    return [rotulo, instrucoes.length > 0 && instrucoes.every(({ sql }) => !IDENTIFICAVEL.test(sql))];
  })(),

  // Esta assercao dizia que o nucleo nao podia conhecer nome, permalink nem a
  // lista de avaliacoes. Em 31/08/2026 Marcelo autorizou guardar a fila no
  // banco, porque uma coleta feita pelo servidor nao tem navegador e entregava
  // numeros sem lista a um cliente que paga. A regra nao foi afrouxada: mudou
  // de fronteira. O que continua proibido, e e o que importa, e um campo
  // identificavel entrar na tabela de AGREGADOS, que existe para medir e nunca
  // para identificar. A fila tem tabela propria, com prazo e leitura so do
  // dono, protegida por `scripts/check-fila-no-banco.mjs`.
  (() => {
    const rotulo = 'a gravação do agregado não escreve nenhum campo identificável, mesmo agora que o núcleo conhece a fila';
    const corpo = expressaoAtribuida(nucleoDeColeta, 'persistAggregateSnapshot');
    if (!corpo) return [rotulo, false];
    return [rotulo, !/reviewer_name|review_url|reviewerName|reviewUrl|observedReviews|comment/.test(corpo)];
  })(),

  (() => {
    const rotulo = 'a fila só é gravada na tabela própria dela, nunca na de agregados';
    const corpo = expressaoAtribuida(nucleoDeColeta, 'persistirFilaDeRespostas');
    if (!corpo) return [rotulo, false];
    return [rotulo,
      /google_reviews_awaiting_reply/.test(corpo)
      && !/google_business_reputation_snapshots/.test(corpo)];
  })(),

  (() => {
    const rotulo = 'falha ao gravar o agregado e REGISTRADA (as duas formas de falha) e nunca propagada: a coleta já paga não vira coleta falhada';
    const corpo = expressaoAtribuida(nucleoDeColeta, 'persistAggregateSnapshot');
    if (!corpo) return [rotulo, false];
    const erroDevolvidoRegistrado = /if \(error\) console\.error\(/.test(corpo);
    const capturaBloco = extrairEntre(corpo, '} catch (error) {', '\n  }');
    const excecaoRegistrada = Boolean(capturaBloco) && /console\.error\(/.test(capturaBloco);
    const relanca = /throw\b/.test(corpo);
    return [rotulo, erroDevolvidoRegistrado && excecaoRegistrada && !relanca];
  })(),

  // ------------------------------------------------------------------
  // GUARDA 2: leitura que compara ao longo do tempo separa por `source`.
  // ------------------------------------------------------------------

  ['o painel le o agregado persistido do banco (senao as duas regras abaixo não teriam o que proteger)',
    leituras.some((leitura) => leitura.caminho.startsWith('src/'))],

  ['toda leitura da tabela traz a coluna `source` junto dos números, para que a proveniência nunca chegue anônima ao painel',
    leituras.length > 0 && leituras.every(({ trecho }) => {
      const selecao = corpoEntreParenteses(trecho, '.select(');
      return Boolean(selecao) && /\bsource\b/.test(selecao);
    })],

  ['leitura que devolve mais de uma linha (comparação ao longo do tempo) filtra por `source`; só a leitura de linha única pode não filtrar',
    leituras.length > 0 && leituras.every(({ trecho }) => {
      const linhaUnica = /\.limit\(1\)/.test(trecho) && /\.(maybeSingle|single)\(\)/.test(trecho);
      const filtraPorFonte = /\.eq\(\s*['"]source['"]/.test(trecho);
      return linhaUnica || filtraPorFonte;
    })],

  // ------------------------------------------------------------------
  // GUARDA 3: o painel desenha a leitura composta, escolhida por data.
  // ------------------------------------------------------------------

  (() => {
    const rotulo = 'o retrato que o painel RENDERIZA e o valor produzido pela composição: a prop e seguida até a expressao que a define, e essa expressao não tem precedência fixa (nem `||`, nem `??`)';
    // Tres substrings independentes (`chamou a composição`, `existe uma prop
    // chamada snapshot`, `não existe ||`) ficavam verdes com uma chamada morta
    // ao lado de um valor calculado com `??`. Aqui o caminho e um só: prop ->
    // nome do valor -> expressao que o produz.
    if (!expressaoRenderizada) return [rotulo, false];
    const compoe = expressaoRenderizada.includes('composeCockpitSnapshot(');
    const semPrecedenciaFixa = !expressaoRenderizada.includes('||') && !expressaoRenderizada.includes('??');
    const tresFontes = ['browserSnapshot: experimentalSnapshot', 'persistedSnapshot', 'fallbackSnapshot: approvedFallbackSnapshot']
      .every((fonte) => expressaoRenderizada.includes(fonte));
    return [rotulo, compoe && semPrecedenciaFixa && tresFontes];
  })(),

  (() => {
    const rotulo = 'a composição escolhe o agregado comparando as duas datas (`fetchedAt` do navegador contra `captured_at` da linha), e data ilegível ou no futuro além da tolerância de relógio perde';
    if (!corpoDaComposicao || !corpoDaEscolha || !corpoDaDataDoNavegador) return [rotulo, false];
    const composicaoUsaAEscolha = /const aggregates = freshestAggregates\(browserSnapshot, persistedSnapshot, now\)/.test(corpoDaComposicao);
    const leAsDuasDatas = /browserTimeOf\(browserSnapshot, now\)/.test(corpoDaEscolha)
      && /persistedTimeOf\(persistedSnapshot\)/.test(corpoDaEscolha);
    const compara = /browserTime > persistedTime \? browserSnapshot : persistedSnapshot/.test(corpoDaEscolha);
    const ilegivelPerde = /if \(browserTime === null\) return persistedSnapshot;/.test(corpoDaEscolha);
    // Sem limite para o futuro, um `fetchedAt` datado de 2099 venceria o banco
    // para sempre. A tolerância existe para o relógio do aparelho, e aceitar
    // uma FAIXA (qualquer coisa até uma hora) deixaria alguém alargá-la de 10
    // para 55 minutos sem que nada reclamasse. O valor fica preso ao
    // documentado, e mudá-lo passa a exigir mudar esta linha junto.
    const futuroPerde = /parsed > now \+ CLOCK_SKEW_TOLERANCE_MS\) return null;/.test(corpoDaDataDoNavegador);
    const toleranciaDeRelogio = valorNumerico(expressaoAtribuida(leituraDoAgregado, 'CLOCK_SKEW_TOLERANCE_MS'));
    const toleranciaPequena = toleranciaDeRelogio === 10 * 60 * 1_000;
    return [rotulo, composicaoUsaAEscolha && leAsDuasDatas && compara && ilegivelPerde && futuroPerde && toleranciaPequena];
  })(),

  // ------------------------------------------------------------------
  // GUARDA 4: fila de respostas e histórico semanal são compostos a parte.
  // ------------------------------------------------------------------

  (() => {
    const rotulo = 'a fila de respostas entra no retorno da composição sem depender de qual agregado venceu, e sai do banco antes do navegador';
    // O defeito que isto guarda: escolher um retrato inteiro fazia a fila
    // sumir da tela quando a linha do banco vencia, que e justamente o caso da
    // coleta diária paga. Essa parte da regra nao mudou.
    //
    // O que mudou em 31/08/2026: a fila deixou de vir SO do navegador e passou
    // a vir do banco quando existir la, porque uma coleta feita pelo servidor
    // nao tem navegador. As duas nao discordam: a do banco ganha sempre que
    // houver. Ver `scripts/check-fila-no-banco.mjs`.
    if (!corpoDaComposicao) return [rotulo, false];
    const atribuicao = expressaoAtribuida(corpoDaComposicao, 'observedReviews');
    const vemDoNavegador = Boolean(atribuicao)
      && atribuicao.includes('filaPersistida')
      && atribuicao.includes('browserSnapshot?.sample.observedReviews')
      && atribuicao.indexOf('filaPersistida') < atribuicao.indexOf('browserSnapshot');
    const naoDependeDoVencedor = Boolean(atribuicao) && !atribuicao.includes('aggregates');
    const entraNoRetorno = /\n\s*observedReviews,\n/.test(corpoDaComposicao);
    // Dois `return` e só: o `null` sem agregado nenhum e o objeto composto.
    // Um terceiro seria um ramo devolvendo retrato sem a fila.
    const semRamoAlternativo = (corpoDaComposicao.match(/\breturn\b/g) || []).length === 2;
    return [rotulo, vemDoNavegador && naoDependeDoVencedor && entraNoRetorno && semRamoAlternativo];
  })(),

  (() => {
    const rotulo = 'histórico semanal só entra quando a amostra que o gerou cobre a janela: no teto do Apify a comparação de varias semanas não afirma queda, e o teto e o mesmo número pedido ao Actor';
    if (!corpoDaComposicao || !corpoDoCorte) return [rotulo, false];
    const portao = /const history = owner && !sampleWasTruncated\(owner\) \? owner\.sample\.insights\?\.history : undefined;/.test(corpoDaComposicao);
    const regraDoTeto = /snapshot\.source === 'apify-experimental' && snapshot\.sample\.reviewCount >= APIFY_SAMPLE_CAP/.test(corpoDoCorte);
    // As duas pontas não se leem: o teto pedido ao Actor esta numa Edge
    // Function em Deno, o teto usado na leitura esta no painel. Divergir faria
    // o portao abrir com a amostra truncada.
    const tetoNoPainel = valorNumerico(expressaoAtribuida(leituraDoAgregado, 'APIFY_SAMPLE_CAP'));
    const tetoDoAtor = nucleoDeColeta.match(/searchParams\.set\('maxItems', '(\d+)'\)/);
    const tetoPedido = nucleoDeColeta.match(/maxReviews: (\d+),/);
    const tetosIguais = tetoNoPainel !== null && tetoDoAtor && tetoPedido
      && Number(tetoDoAtor[1]) === tetoNoPainel && Number(tetoPedido[1]) === tetoNoPainel;
    return [rotulo, portao && regraDoTeto && Boolean(tetosIguais)];
  })(),

  // ------------------------------------------------------------------
  // GUARDA 5: amostra nunca aparece como dado completo no painel.
  // ------------------------------------------------------------------

  (() => {
    const rotulo = 'o cockpit guardado e o que o painel realmente renderiza: o componente intermediario repassa a mesma prop para o cockpit aprovado e e ele o export default';
    // Guardar o componente errado seria um teste vazio:
    // `LegacyExperimentalCockpitDashboard` vive no mesmo arquivo e não e
    // renderizado por ninguem.
    const corpo = expressaoAtribuida(cockpitIntermediario, 'ExperimentalCockpitDashboard');
    if (!corpo) return [rotulo, false];
    const repassa = /<ApprovedCockpitDashboard\s+snapshot=\{snapshot\}/.test(corpo);
    const eODefault = /export default ExperimentalCockpitDashboard;/.test(cockpitIntermediario);
    return [rotulo, Boolean(valorRenderizado) && repassa && eODefault];
  })(),

  (() => {
    const rotulo = 'a identificação de amostra só aparece quando houve corte de verdade, pelo mesmo predicado que decide o histórico semanal, e o portão vem antes do texto';
    // A versão anterior gateava por proveniência: qualquer leitura vinda do
    // Apify levava a etiqueta. Mas a coleta pede no máximo 50 e recebe o que
    // existir, então um negócio com 20 avaliações tem leitura COMPLETA, e
    // dizer "amostra, não o total" ali subestima um dado inteiro na frente de
    // um cliente. O portão passou a ser o corte, não a fonte.
    const corpo = expressaoAtribuida(cockpitRenderizado, 'SampleSourceNote');
    if (!corpo) return [rotulo, false];
    const portao = /if \(!sampleWasTruncated\(snapshot\)\) return null;/.test(corpo);
    const retorno = instrucaoDeRetorno(corpo);
    const usaAChave = Boolean(retorno) && retorno.includes("t('dashboard.cockpit.layout.sampleSourceNote'");
    const portaoAntesDaNota = corpo.indexOf('return null;') < corpo.indexOf("t('dashboard.cockpit.layout.sampleSourceNote'");
    const importaOPredicado = /import \{[^}]*sampleWasTruncated[^}]*\} from '@\/lib\/reputationSnapshotReading';/.test(cockpitRenderizado);
    return [rotulo, portao && usaAChave && portaoAntesDaNota && importaOPredicado];
  })(),

  (() => {
    const rotulo = 'todo cartão que desenha uma medida derivada da amostra carrega a identificação dentro do próprio return: a regra é a medida que o cartão lê, não uma lista de nomes';
    // Listar `ReputationCard`, `RatingTrends` e `TopicsCard` protegia esses
    // três e mais nada: um cartão novo mostrando distribuição ou temas sem a
    // etiqueta passava. Aqui o conjunto é descoberto pela leitura que cada
    // componente faz, então um cartão novo entra na regra sozinho.
    const MEDIDAS_DA_AMOSTRA = ['.sample.ratingBreakdown', 'averageResponseHours', 'reviewsLast30Days', '.insights?.topics'];
    // `export const` tambem: ao sairem para ficheiro proprio em 04/09/2026, os
    // cartoes de leitura passaram a ser exportados. Sem isto a varredura nao
    // via nenhum deles, o conjunto esvaziava e a contagem minima abaixo era a
    // unica coisa entre este guarda e um verde que nao conferia cartao nenhum.
    const componentes = [...cockpitRenderizado.matchAll(/^(?:export )?const ([A-Z][\w]*) = /gm)]
      .map((achado) => achado[1])
      .filter((nome) => nome !== 'SampleSourceNote');
    const comMedidaDeAmostra = [];
    for (const nome of componentes) {
      const corpo = expressaoAtribuida(cockpitRenderizado, nome);
      if (!corpo) continue;
      const retorno = instrucaoDeRetorno(corpo);
      if (!retorno) continue;
      if (MEDIDAS_DA_AMOSTRA.some((medida) => corpo.includes(medida))) comMedidaDeAmostra.push({ nome, retorno });
    }
    // Sem esta contagem, apagar as leituras (ou quebrar a extração) esvaziaria
    // o conjunto e o `every` ficaria verde sem conferir cartão nenhum.
    if (comMedidaDeAmostra.length < 3) return [rotulo, false];
    return [rotulo, comMedidaDeAmostra.every(({ retorno }) => retorno.includes('<SampleSourceNote snapshot={snapshot} />'))];
  })(),

  (() => {
    const rotulo = 'o teto da amostra é comparado num lugar só: a etiqueta do cockpit e o portão do histórico saem do mesmo predicado e não podem discordar';
    // Duas regras que precisam concordar, escritas duas vezes, é o defeito que
    // este projeto já pagou mais de uma vez. Enquanto `APIFY_SAMPLE_CAP` só
    // aparecer na definição e dentro de `sampleWasTruncated`, não existe uma
    // segunda regra para divergir da primeira.
    if (!corpoDoCorte || !corpoDaComposicao) return [rotulo, false];
    const ocorrencias = arquivosTypeScript()
      .filter((caminho) => caminho.startsWith('src/'))
      .reduce((total, caminho) => total + (lerCodigo(caminho).match(/APIFY_SAMPLE_CAP/g) || []).length, 0);
    const definido = /export const APIFY_SAMPLE_CAP = \d+;/.test(leituraDoAgregado);
    const comparadoSoNoPredicado = corpoDoCorte.includes('APIFY_SAMPLE_CAP') && ocorrencias === 2;
    const etiquetaUsaOPredicado = cockpitRenderizado.includes('sampleWasTruncated(snapshot)');
    const historicoUsaOPredicado = corpoDaComposicao.includes('sampleWasTruncated(owner)');
    return [rotulo, definido && comparadoSoNoPredicado && etiquetaUsaOPredicado && historicoUsaOPredicado];
  })(),
];

const reprovados = requisitos.filter(([, ok]) => !ok).map(([rotulo]) => rotulo);
if (reprovados.length) {
  console.error(`Persistência de agregados com regra quebrada:\n- ${reprovados.join('\n- ')}`);
  process.exit(1);
}

console.log(`Persistência de agregados verificada: ${requisitos.length} proteções ativas.`);
