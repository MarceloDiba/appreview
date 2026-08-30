import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

// Persistência dos agregados da coleta Apify (30/08/2026).
//
// Até aqui uma coleta bem-sucedida devolvia o resultado para o navegador e
// nada chegava ao banco: `google_business_reputation_snapshots` tinha zero
// linhas, e a coleta automática do cadastro, que roda sem navegador nenhum,
// gastava dinheiro e descartava o agregado inteiro.
//
// Ao passar o agregado a existir no banco, duas regras deixam de ser questão
// de disciplina e passam a precisar de guarda:
//
// GUARDA 1: nome do avaliador, texto da avaliação e URL pública da avaliação
// nunca podem virar dado persistido. É o contrato de produto, linhas 39 a 41:
// esses três campos ficam só no navegador autenticado, por até 14 dias.
//
// GUARDA 2: as cinco colunas derivadas de amostra (distribuição por nota,
// não respondidas, últimos 30 dias, tempo médio de resposta, temas) vêm de no
// máximo 50 avaliações no caminho Apify e de todas as avaliações no caminho
// oficial. Um negócio com 400 avaliações grava, na MESMA coluna, uma
// distribuição oito vezes menor que a realidade. Qualquer leitura que compare
// linhas ao longo do tempo sem separar por `source` mostraria a migração de
// Apify para oficial como um salto de resultado do dono. Isso é apresentar
// inferência como dado real, proibido na linha 30 do contrato.

const root = process.cwd();
const read = (path) => readFileSync(resolve(root, path), 'utf8');

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
  'source',
]);

// Vocabulário de identificação. Não entra em payload persistido nem em nome
// de coluna, em nenhuma das duas linguagens.
const IDENTIFICAVEL = /reviewer|author|observed|reviewurl|review_url|reviewlink|permalink|comment|display_name|nome_publico/i;

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

// Recorta a consulta inteira a partir do `.from('<tabela>')` até o `;` que a
// termina. É o que permite exigir coisas DA CONSULTA em vez de procurar uma
// string solta em qualquer lugar do arquivo.
const consultasDaTabela = () => {
  const consultas = [];
  for (const caminho of arquivosTypeScript()) {
    const conteudo = read(caminho);
    const marcador = new RegExp(`\\.from\\((['"])${TABELA}\\1\\)`, 'g');
    let achado = marcador.exec(conteudo);
    while (achado) {
      const fim = conteudo.indexOf(';', achado.index);
      consultas.push({ caminho, trecho: conteudo.slice(achado.index, fim === -1 ? conteudo.length : fim) });
      achado = marcador.exec(conteudo);
    }
  }
  return consultas;
};

// Corpo entre parênteses balanceados a partir do primeiro `(` depois do
// marcador. Balanceado porque os valores do payload têm os seus próprios
// parênteses (`Math.max(...)`, `now.toISOString()`).
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

// Comentário de linha é texto humano: fala de "nome do avaliador" e de
// "comentário" justamente para explicar por que eles não estão ali. Removê-lo
// antes de varrer valores evita reprovar a explicação em vez do código.
const semComentarios = (fonte) => fonte.replace(/\/\/[^\n]*/g, '');

// Chaves definidas no payload: `chave:` no início da linha, mais a forma
// abreviada `chave,`. Comentários começam com `//` e não casam com nenhuma
// das duas.
const chavesDoPayload = (payload) => {
  const chaves = [];
  for (const achado of payload.matchAll(/^[ \t]*([A-Za-z_]\w*)\s*:/gm)) chaves.push(achado[1]);
  for (const achado of payload.matchAll(/^[ \t]*([A-Za-z_]\w*)\s*,\s*$/gm)) chaves.push(achado[1]);
  return chaves;
};

const escritas = consultasDaTabela().filter((consulta) => consulta.trecho.includes('.insert('));
const leituras = consultasDaTabela().filter((consulta) => consulta.trecho.includes('.select('));

const migracoes = readdirSync(resolve(root, 'supabase/migrations'))
  .filter((nome) => nome.endsWith('.sql'))
  .map((nome) => ({ nome, sql: read(`supabase/migrations/${nome}`) }));

// Instruções SQL que tocam a tabela, sem os comentários `--` (que explicam,
// em português, exatamente os campos que não podem entrar).
const instrucoesSqlDaTabela = () => {
  const instrucoes = [];
  for (const { nome, sql } of migracoes) {
    const limpo = sql.replace(/--[^\n]*/g, '');
    let posicao = limpo.indexOf(TABELA);
    while (posicao !== -1) {
      const fim = limpo.indexOf(';', posicao);
      instrucoes.push({ nome, sql: limpo.slice(posicao, fim === -1 ? limpo.length : fim) });
      posicao = limpo.indexOf(TABELA, posicao + TABELA.length);
    }
  }
  return instrucoes;
};

const nucleoDeColeta = read('supabase/functions/_shared/experimentalApifyCollection.ts');
const coletorManual = read('supabase/functions/sync-experimental-apify/index.ts');
const drenadorAutomatico = read('supabase/functions/apify-auto-collect-on-signup/index.ts');
const paginaDoPainel = read('src/pages/Dashboard.tsx');
const leituraDoAgregado = read('src/lib/reputationSnapshotReading.ts');
const cockpitRenderizado = read('src/components/dashboard/ApprovedCockpitDashboard.tsx');
const cockpitIntermediario = read('src/components/dashboard/ExperimentalCockpitDashboard.tsx');

// Trecho entre dois marcadores literais, o segundo procurado a partir do fim
// do primeiro. Isola uma parte do arquivo pelo texto que já a delimita, em vez
// de assumir que uma string só aparece uma vez no arquivo inteiro.
const extrairEntre = (fonte, inicioMarcador, fimMarcador) => {
  const inicio = fonte.indexOf(inicioMarcador);
  if (inicio === -1) return null;
  const fim = fonte.indexOf(fimMarcador, inicio + inicioMarcador.length);
  if (fim === -1) return null;
  return fonte.slice(inicio, fim + fimMarcador.length);
};


const requisitos = [
  // ------------------------------------------------------------------
  // GUARDA 1: campo identificável nunca vira dado persistido.
  // ------------------------------------------------------------------

  // Um guarda sobre "toda escrita" não vale nada se não houver escrita
  // nenhuma: o `every` de uma lista vazia é verdadeiro. E a escrita existir no
  // arquivo também não basta: apagar só a CHAMADA deixa a função de gravação
  // parada ali, sem ninguém a executar, e a coleta volta a gastar dinheiro
  // sem entregar nada. Já aconteceu ao escrever este guarda: a primeira versão
  // continuou verde depois de a chamada ser removida. Por isso a chamada é
  // exigida dentro do trecho que vai da auditoria bem-sucedida até o retorno
  // de sucesso, que é o único ponto em que o agregado existe.
  (() => {
    const rotulo = 'os dois chamadores (piloto manual e drenador do cadastro) coletam pelo núcleo partilhado, e o núcleo grava o agregado no caminho de sucesso, entre a auditoria concluída e o retorno';
    // Contar inserts no repositório não prova nada sobre os chamadores: o
    // núcleo mais o caminho oficial já somam dois sozinhos. Se o drenador
    // automático deixasse de passar pelo núcleo, a coleta automática voltaria
    // a gastar sem persistir e a contagem continuaria a mesma. Por isso os
    // dois arquivos são abertos e a CHAMADA é exigida em cada um.
    const escritaNoNucleo = escritas.some((escrita) => escrita.caminho === 'supabase/functions/_shared/experimentalApifyCollection.ts');
    const manualPassaPeloNucleo = /await runExperimentalApifyCollection\(/.test(coletorManual);
    const automaticoPassaPeloNucleo = /await runExperimentalApifyCollection\(/.test(drenadorAutomatico);
    const caminhoDeSucesso = extrairEntre(nucleoDeColeta, "status: 'succeeded',", 'return { ok: true');
    const chamada = Boolean(caminhoDeSucesso) && /await persistAggregateSnapshot\(\{[^}]*aggregateSnapshot[^}]*\}\)/.test(caminhoDeSucesso);
    return [rotulo, escritaNoNucleo && manualPassaPeloNucleo && automaticoPassaPeloNucleo && chamada];
  })(),

  // O Apify já cobrou quando a gravação acontece. Se ela puder derrubar a
  // coleta, o chamador trata como falha e tenta de novo, gastando de novo. A
  // função de gravação engole a própria falha: registra e segue.
  (() => {
    const rotulo = 'falha ao gravar o agregado é REGISTRADA (as duas formas de falha) e nunca propagada: a coleta já paga não vira coleta falhada';
    const corpo = extrairEntre(nucleoDeColeta, 'const persistAggregateSnapshot = async ({', '\n};');
    if (!corpo) return [rotulo, false];
    // "Registrada" precisa ser verificada, não prometida no rótulo: esvaziar o
    // catch e apagar o console.error deixava a versão anterior deste teste
    // verde, e uma gravação que falha em silêncio é indistinguível de uma que
    // nunca aconteceu. As duas formas de falha são exigidas: o erro devolvido
    // pelo supabase-js e a exceção de rede.
    const erroDevolvidoRegistrado = /if \(error\) console\.error\(/.test(corpo);
    const capturaBloco = extrairEntre(corpo, '} catch (error) {', '\n  }');
    const excecaoRegistrada = Boolean(capturaBloco) && /console\.error\(/.test(capturaBloco);
    const relanca = /throw\b/.test(corpo);
    return [rotulo, erroDevolvidoRegistrado && excecaoRegistrada && !relanca];
  })(),

  (() => {
    const rotulo = 'nenhuma escrita na tabela de agregados usa coluna fora da lista aprovada, e nenhum valor persistido vem de nome, texto ou URL de avaliação';
    const todasValidas = escritas.every(({ trecho }) => {
      const payload = corpoEntreParenteses(trecho, '.insert(');
      if (!payload) return false;
      const chaves = chavesDoPayload(payload);
      if (!chaves.length) return false;
      const somenteAprovadas = chaves.every((chave) => COLUNAS_PERMITIDAS.has(chave));
      const valoresLimpos = !IDENTIFICAVEL.test(semComentarios(payload).replace(/^[ \t]*[A-Za-z_]\w*\s*:/gm, ''));
      return somenteAprovadas && valoresLimpos;
    });
    return [rotulo, todasValidas];
  })(),

  // A coluna não pode nascer por migração, mesmo que nenhum código escreva
  // nela hoje: uma coluna `reviewer_name` existente é um convite.
  ['nenhuma migração cria ou adiciona coluna identificável na tabela de agregados',
    instrucoesSqlDaTabela().every(({ sql }) => !IDENTIFICAVEL.test(sql))],

  // A fila efêmera do navegador (nome público, texto, permalink) é montada só
  // no piloto manual, DEPOIS que o núcleo devolve o agregado. O núcleo, que é
  // quem fala com o banco, não pode sequer conhecê-la.
  ['o núcleo que grava no banco não conhece a fila do navegador: sem nome público, sem permalink, sem lista de avaliações observadas',
    !/observedReviews|reviewerName|reviewUrl|authorName|reviewLink/.test(nucleoDeColeta)],

  // ------------------------------------------------------------------
  // GUARDA 2: leitura que compara ao longo do tempo separa por `source`.
  // ------------------------------------------------------------------

  ['o painel lê o agregado persistido do banco (senão a regra abaixo não teria o que proteger)',
    leituras.some((leitura) => leitura.caminho.startsWith('src/'))],

  // Sem a coluna `source` no SELECT, nenhuma leitura downstream consegue
  // separar uma amostra de 50 de uma contagem completa: a proveniência some
  // antes de qualquer comparação existir.
  ['toda leitura da tabela traz a coluna `source` junto dos números, para que a proveniência nunca chegue anônima ao painel',
    leituras.length > 0 && leituras.every(({ trecho }) => {
      const selecao = corpoEntreParenteses(trecho, '.select(');
      return Boolean(selecao) && /\bsource\b/.test(selecao);
    })],

  // A regra que custa caro: uma leitura de uma linha só não compara nada. A
  // partir da segunda linha existe comparação ao longo do tempo, e aí a
  // consulta precisa estar presa a uma única `source`. Sem isso, a troca de
  // Apify para oficial vira um salto inventado que "o que mudou na semana"
  // leria como resultado do dono.
  ['leitura que devolve mais de uma linha (comparação ao longo do tempo) filtra por `source`; só a leitura de linha única pode não filtrar',
    leituras.length > 0 && leituras.every(({ trecho }) => {
      const linhaUnica = /\.limit\(1\)/.test(trecho) && /\.(maybeSingle|single)\(\)/.test(trecho);
      const filtraPorFonte = /\.eq\(\s*['"]source['"]/.test(trecho);
      return linhaUnica || filtraPorFonte;
    })],

  // ------------------------------------------------------------------
  // GUARDA 3: o painel mostra o retrato mais recente, não o do navegador
  // por definição.
  // ------------------------------------------------------------------

  // A coleta diária no servidor grava só a linha persistida. Com precedência
  // fixa (`navegador || banco`), quem paga por coleta diária continuaria vendo
  // um retrato de dias atrás enquanto os números novos já estariam no banco.
  (() => {
    const rotulo = 'o painel escolhe entre navegador e banco pelo mais recente, e não por precedência fixa: sem `experimentalSnapshot || persistedSnapshot` em lugar nenhum';
    const usaEscolha = /chooseFreshestSnapshot\(experimentalSnapshot, persistedSnapshot\)/.test(paginaDoPainel);
    const semPrecedenciaFixa = !/experimentalSnapshot \|\| persistedSnapshot/.test(paginaDoPainel);
    const renderizaOEscolhido = /snapshot=\{activeSnapshot\}/.test(paginaDoPainel);
    return [rotulo, usaEscolha && semPrecedenciaFixa && renderizaOEscolhido];
  })(),

  // Chamar a função não basta: ela precisa mesmo comparar as duas datas. Uma
  // versão que devolvesse sempre o primeiro argumento teria o mesmo nome e o
  // mesmo ponto de chamada.
  (() => {
    const rotulo = 'a escolha compara de verdade as datas dos dois retratos (`fetchedAt` do navegador contra `captured_at` da linha), e data ilegível no navegador conta como mais antiga, nunca como mais nova';
    const leitorDeData = extrairEntre(leituraDoAgregado, 'const snapshotTime = (', '\n};');
    const leData = Boolean(leitorDeData) && /new Date\(snapshot\.fetchedAt\)\.getTime\(\)/.test(leitorDeData) && /Number\.isFinite/.test(leitorDeData);
    const corpo = extrairEntre(leituraDoAgregado, 'export const chooseFreshestSnapshot = (', '\n};');
    if (!corpo) return [rotulo, false];
    const compara = /browserTime\s*>=\s*persistedTime \? browserSnapshot : persistedSnapshot/.test(corpo);
    const dataIlegivelPerde = /if \(browserTime === null\) return persistedSnapshot;/.test(corpo);
    return [rotulo, leData && compara && dataIlegivelPerde];
  })(),

  // ------------------------------------------------------------------
  // GUARDA 4: amostra nunca aparece como dado completo no painel.
  // ------------------------------------------------------------------

  // Guardar o componente errado seria um teste vazio: `LegacyExperimentalCockpitDashboard`
  // não é renderizado por ninguém. Esta linha prende o guarda ao componente
  // que o painel realmente desenha.
  ['o cockpit guardado é o que o painel realmente renderiza (Dashboard -> ExperimentalCockpitDashboard -> ApprovedCockpitDashboard)',
    /<ExperimentalCockpitDashboard snapshot=/.test(paginaDoPainel)
    && /<ApprovedCockpitDashboard snapshot=\{snapshot\} userId=\{userId\} \/>/.test(cockpitIntermediario)],

  // Contrato de produto, linha 30: amostra não pode aparecer como dado
  // oficial, completo ou real sem estar identificada. Um negócio com 400
  // avaliações mostrava a distribuição de 50 sem nada dizendo isso.
  (() => {
    const rotulo = 'o cockpit renderizado lê a proveniência do retrato e só identifica como amostra o que veio do piloto Apify';
    const corpo = extrairEntre(cockpitRenderizado, 'const SampleSourceNote = ({ snapshot }', '\n};');
    if (!corpo) return [rotulo, false];
    const leAProveniencia = /snapshot\.source !== 'apify-experimental'/.test(corpo);
    const somenteComAmostra = /return null;/.test(corpo);
    const usaAChave = /t\('dashboard\.cockpit\.layout\.sampleSourceNote'/.test(corpo);
    return [rotulo, leAProveniencia && somenteComAmostra && usaAChave];
  })(),

  // A etiqueta tem que estar DENTRO de cada módulo que desenha uma das cinco
  // medidas de amostra: distribuição por nota (reputação e cada nota
  // separada), tempo médio de resposta e novas avaliações de 30 dias
  // (reputação) e temas. Nota e total de avaliações ficam de fora de
  // propósito: são os números do negócio inteiro, mesmo vindos do Apify.
  (() => {
    const rotulo = 'os módulos que desenham medidas de amostra (reputação, cada nota separada, temas) carregam a identificação de proveniência dentro do próprio cartão';
    const modulos = ['const ReputationCard = ({ snapshot }', 'const RatingTrends = ({ weeks, snapshot }', 'const TopicsCard = ({ snapshot }'];
    return [rotulo, modulos.every((marcador) => {
      const corpo = extrairEntre(cockpitRenderizado, marcador, '\n};');
      return Boolean(corpo) && corpo.includes('<SampleSourceNote snapshot={snapshot} />');
    })];
  })(),
];

const reprovados = requisitos.filter(([, ok]) => !ok).map(([rotulo]) => rotulo);
if (reprovados.length) {
  console.error(`Persistência de agregados com regra quebrada:\n- ${reprovados.join('\n- ')}`);
  process.exit(1);
}

console.log(`Persistência de agregados verificada: ${requisitos.length} proteções ativas.`);
