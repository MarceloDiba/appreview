#!/usr/bin/env node
// O convite para avaliar no Google nao pode depender da nota.
//
// Convidar so quem deu 4 ou 5 e solicitacao seletiva, e a politica do Google
// proibe. Ate 02/09/2026 o aviso do comentario privado escrevia "Agradeca e
// convide a publicar no Google" apenas quando `especie = 'feedback-praise'`,
// ou seja, so para nota 4 ou 5. Quem deu 3 ou menos nunca era convidado.
//
// Duas analises independentes de concorrentes apontaram o nao-filtrar como a
// melhor vantagem de venda do Binno. Nao se vende isso enquanto o produto
// sugere o contrario.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const { tipoDoContacto, apenasDigitos } = await import(
  pathToFileURL(resolve(process.cwd(), 'src/lib/contactoDoCliente.ts')).href
);
const { mensagemDoConvite, linkDeWhatsApp, idiomaDoConvite } = await import(
  pathToFileURL(resolve(process.cwd(), 'src/lib/convite.ts')).href
);

const MIGRACAO = 'supabase/migrations/20260902120000_convite_sem_filtro.sql';

const falhas = [];
let verificadas = 0;
const exigir = (rotulo, condicao) => { verificadas += 1; if (!condicao) falhas.push(rotulo); };

const semComentariosSql = (fonte) => fonte.replace(/^\s*--[^\n]*$/gm, '');
const migracao = semComentariosSql(readFileSync(MIGRACAO, 'utf8'));

// O bloco que escreve o convite nao pode estar dentro de um `if` sobre a
// especie. Le-se o corpo entre o fecho do bloco da citacao e o link final.
const inicio = migracao.indexOf("linhas := array_append(linhas, '');\n\n    if especie");
exigir(
  'o convite deixou de estar dentro de um if sobre a especie do aviso',
  inicio === -1,
);
exigir(
  'o convite ao Google continua a existir, para toda a gente',
  /convide a publicar no Google/.test(migracao),
);
exigir(
  'a regra de quando avisar nao mudou: nota ausente continua a nao avisar',
  /if new\.rating is null then\s+return new;/.test(migracao),
);

// ---------------------------------------------------------------------------
// O contacto, CORRIDO. A coluna `internal_feedback.customer_email` guarda
// telefones: cinco das seis linhas reais em 02/09/2026 comecam por "+55". O
// nome da coluna mente, e essa mentira nao pode espalhar-se pelo produto.
// ---------------------------------------------------------------------------
exigir('um numero com indicativo e telefone', tipoDoContacto('+5579998380767') === 'telefone');
// A CLASSIFICACAO nao exige indicativo, e nao e ela que monta o endereco: ela
// so decide se o produto desenha o caminho do telefone ou o do email. Quem
// exige indicativo e `linkDeWhatsApp`, mais abaixo, e ha uma assercao la a
// provar que um numero local NAO vira link.
exigir('um numero local com espacos e travessoes continua a ser classificado como telefone',
  tipoDoContacto('(79) 99838-0767') === 'telefone');
exigir('um endereco de email e email', tipoDoContacto('carol@exemplo.com') === 'email');
exigir('vazio nao e nada', tipoDoContacto('') === 'nenhum');
exigir('nulo nao e nada', tipoDoContacto(null) === 'nenhum');
// Curto demais para ser telefone e sem arroba para ser email.
exigir('lixo curto nao vira telefone', tipoDoContacto('123') === 'nenhum');
exigir('os digitos saem limpos', apenasDigitos('+55 (79) 99838-0767') === '5579998380767');

// ---------------------------------------------------------------------------
// A MENSAGEM. A asserção que sustenta este plano inteiro: ela nao pode mudar
// com a nota, porque a nota nao entra nela.
// ---------------------------------------------------------------------------
const base = { nomeDoCliente: 'Carol', nomeDoNegocio: 'Noá Digital', linkDeAvaliacao: 'https://g.page/r/abc/review', idioma: 'pt-BR' };
exigir('a mensagem nomeia o cliente', mensagemDoConvite(base).includes('Carol'));
exigir('a mensagem nomeia o negocio', mensagemDoConvite(base).includes('Noá Digital'));
exigir('a mensagem leva o link', mensagemDoConvite(base).includes('https://g.page/r/abc/review'));
exigir('a mensagem nao usa travessao', !/[—–]/.test(mensagemDoConvite(base)));
exigir(
  'sem link nao ha convite: devolve vazio em vez de convidar para lado nenhum',
  mensagemDoConvite({ ...base, linkDeAvaliacao: null }) === '',
);
exigir(
  'sem nome, a mensagem abre sem nome em vez de dizer "null"',
  !mensagemDoConvite({ ...base, nomeDoCliente: null }).includes('null'),
);
exigir('o portugues de Portugal e diferente do do Brasil',
  mensagemDoConvite({ ...base, idioma: 'pt-PT' }) !== mensagemDoConvite({ ...base, idioma: 'pt-BR' }));
exigir('o ingles existe', /review|Google/i.test(mensagemDoConvite({ ...base, idioma: 'en' })));

// A LINGUA VEM DO PAIS DO NEGOCIO, e nao da preferencia de painel do dono.
// Regra igual a de `resolveContentLocale` em `src/lib/replySuggestions.ts`:
// so 'BR' exacto vira brasileiro, tudo o resto cai no portugues de Portugal.
exigir('o pais BR escolhe o portugues do Brasil', idiomaDoConvite('BR') === 'pt-BR');
exigir('o pais PT escolhe o portugues de Portugal', idiomaDoConvite('PT') === 'pt-PT');
exigir('sem pais lido, o padrao historico e o portugues de Portugal',
  idiomaDoConvite(null) === 'pt-PT' && idiomaDoConvite(undefined) === 'pt-PT');
exigir('so BR exacto vira brasileiro: minusculas e codigos de tres letras nao',
  idiomaDoConvite('br') === 'pt-PT' && idiomaDoConvite('BRA') === 'pt-PT' && idiomaDoConvite('') === 'pt-PT');

// ---------------------------------------------------------------------------
// O LINK. O Binno nao envia: monta o endereco e o dono toca.
// ---------------------------------------------------------------------------
const msg = mensagemDoConvite(base);
exigir('um telefone vira link de whatsapp',
  linkDeWhatsApp('+5579998380767', msg)?.startsWith('https://wa.me/5579998380767?text=') === true);
exigir('a mensagem vai codificada no link',
  linkDeWhatsApp('+5579998380767', msg)?.includes(encodeURIComponent('Carol')) === true);
exigir('um email nao vira link de whatsapp', linkDeWhatsApp('carol@exemplo.com', msg) === null);
exigir('sem contacto nao ha link', linkDeWhatsApp(null, msg) === null);
exigir('sem mensagem nao ha link', linkDeWhatsApp('+5579998380767', '') === null);

// O INDICATIVO. `wa.me` le o numero como internacional, sempre: sem `+55`, o
// `7` de `79998380767` vira o indicativo da Russia e o dono manda o convite a
// um desconhecido. Foi o que aconteceria com a sexta das seis linhas reais de
// 02/09/2026, a unica escrita sem indicativo.
exigir('um numero LOCAL, sem indicativo, nao vira link de whatsapp',
  linkDeWhatsApp('(79) 99838-0767', msg) === null);
exigir('um numero local escrito so com digitos tambem nao vira link',
  linkDeWhatsApp('79998380767', msg) === null);
exigir('com indicativo e simbolos pelo meio, o link sai com os digitos limpos',
  linkDeWhatsApp('+55 (79) 99838-0767', msg) === `https://wa.me/5579998380767?text=${encodeURIComponent(msg)}`);
exigir('doze algarismos sem o mais ja trazem indicativo, e viram link',
  linkDeWhatsApp('351912345678', msg)?.startsWith('https://wa.me/351912345678?text=') === true);
// Sem link do WhatsApp o cartao mostra so o botao de copiar, o caminho que ja
// existia para o email. A mensagem continua a existir: o que desaparece e o
// botao que abriria a conversa errada.
exigir('sem indicativo a mensagem continua a existir, e so o link e que nao',
  mensagemDoConvite(base) !== '' && linkDeWhatsApp('(79) 99838-0767', msg) === null);

// ---------------------------------------------------------------------------
// O CONVITE NA TELA. Ao lado de cada comentário privado, para toda a nota.
//
// REESCRITO NA RONDA 1 DE CORREÇÃO (02/09/2026). A versão anterior comparava
// texto: uma expressão regular a adivinhar como alguém escreveria "esconder
// pela nota". O revisor provou QUATRO maneiras de esconder o convite pela
// nota com os quatro guardas verdes — três reescritas triviais da condição
// (`!==`, uma variável com outro nome, os operandos trocados) e uma quarta
// pela leitura do link no PAINEL, que o guarda nem chegava a ler. Duas das
// cinco asserções também tinham vácuo: mediam a PRESENÇA da chamada
// (`mensagemDoConvite(` em algum lugar do ficheiro), não o USO do resultado
// dela, e uma delas ficava verdadeira por vacuidade se `interface` deixasse
// de existir no ficheiro.
//
// A partir daqui o guarda lê a ÁRVORE DE SINTAXE (o compilador do TypeScript,
// já uma dependência do projeto) em vez de adivinhar grafias:
//
// - a pergunta "o componente recebe a nota?" lê os MEMBROS do tipo das
//   propriedades — resolvido a partir do componente, seja `interface` ou
//   `type`, sem string-slicing frágil;
// - a pergunta "o cartão esconde o convite pela nota?" sobe a árvore a partir
//   do elemento `<ConviteParaAvaliar>` e do atributo `linkDeAvaliacao` que o
//   PAINEL passa ao cartão, junta o texto de qualquer identificador local que
//   a condição referencie (para apanhar `gostou` e não só `rating` escrito à
//   mão), e recusa QUALQUER grafia de "rating" ou "nota" nessa cadeia — não
//   uma forma específica de comparação;
// - a pergunta "o convite usa a função partilhada?" confirma que o resultado
//   da chamada é referenciado de novo na função, e não apenas atribuído e
//   ignorado.
//
// Um comentário no código nunca satisfaz nenhuma destas perguntas: comentários
// não fazem parte da árvore de sintaxe.
//
// RONDA 2 DE CORREÇÃO (02/09/2026). O revisor achou cinco formas novas de
// esconder o convite, todas verdes. Três eram a MESMA doença que a ronda 1 já
// dizia cobrir — buracos na propagação de valor, não ataques novos — e foram
// fechadas: renomear numa desestruturação (`{ rating: pontos } = highlighted`)
// não expandia `pontos`; uma função auxiliar escrita com `function` (em vez de
// `const nome = () =>`) não era seguida; e o atributo `linkDeAvaliacao` só era
// vigiado dentro do PAINEL, deixando o mesmo ataque aberto se escrito dentro
// do CARTÃO. Fechado também o silêncio no parse: `ts.createSourceFile` nunca
// lança por sintaxe partida, e sem verificar as diagnósticas o guarda
// analisava uma árvore que não representa o ficheiro e dizia que estava tudo
// bem — isso é vacuidade, não protecção.
//
// RONDA 3 DE CORREÇÃO (02/09/2026). A revisão final do ramo achou um TERCEIRO
// buraco, e ele era mais largo do que os dois declarados: o guarda vigiava o
// atributo `linkDeAvaliacao` do cartão e EXCLUÍA de propósito o atributo
// `casos`, com o argumento escrito aqui de que «`casos` depende de `rating`
// legitimamente». Mas `casos` é a lista de onde sai o cliente convidado, e uma
// linha só bastava para o convite desaparecer nas notas baixas com os seis
// guardas verdes e o `tsc` a passar:
//
//   const comentariosInternos = useMemo(
//     () => orderPendingCasesByRecency(internos.cases).filter((caso) => (caso.rating ?? 0) >= 4),
//     [internos.cases],
//   );
//
// Isto é diferente das duas formas abaixo em espécie, e não em grau: aquelas
// exigem código com cara de estar a esconder um componente, e esta parece uma
// afinação inocente da lista, a 200 linhas do convite. Era a forma mais
// provável de o filtro voltar por acidente. `casos` passou a ser vigiado, nos
// dois ficheiros (ver `ATRIBUTOS_VIGIADOS`), e o argumento que dispensava
// vigiá-lo foi apagado.
//
// DUAS FORMAS CONTINUAM DE FORA, DE PROPÓSITO, E É PRECISO SABER QUAIS SÃO.
// Um cabeçalho que diz «estas são as portas abertas» e deixa a mais larga de
// fora é pior do que não declarar nada; estas duas são a lista completa
// DEPOIS de a terceira ter sido tapada:
//
// 1. Esconder por CSS: `<div className={nota >= 4 ? '' : 'hidden'}>` à volta
//    do convite. Este guarda lê expressões condicionais e atributos JSX
//    nomeados — não interpreta classes, nem sabe que "hidden" esconde nada.
// 2. Reatribuir dentro de um `if`: `let x = <ConviteParaAvaliar/>; if (nota <
//    4) x = null;`. Este guarda sobe a árvore a partir do elemento à procura
//    de ternários e `&&`/`||` — não segue um `if` que muda uma variável mais
//    tarde.
//
// Provar estaticamente que um componente React NUNCA desaparece por causa de
// um valor é provar uma propriedade semântica sobre código arbitrário — não é
// possível em geral, e cada ronda de perseguir a próxima grafia dá uma
// sensação de segurança que a ronda seguinte desmente. Este guarda apanha a
// nota a condicionar a renderização do convite ou os atributos dele,
// directamente ou através de variáveis e funções intermédias que a
// referenciem. NÃO apanha esconder por classe CSS num ancestral, nem por
// reatribuição dentro de um `if`. A última defesa continua a ser ler o código
// da vez e olhar para o ecrã — este guarda ajuda, não substitui.
// ---------------------------------------------------------------------------
// Le e analisa um ficheiro. Duas protecoes vivem aqui, e nao mais abaixo,
// porque tudo o resto depende de as duas terem passado:
//
// - E5: um ficheiro em falta ou ilegivel nao pode derrubar o guarda com um
//   stack trace cru do Node por baixo das outras mensagens. Falha alto, com
//   uma linha igual as outras.
// - E2: `ts.createSourceFile` NUNCA lanca por sintaxe partida — o parser do
//   TypeScript e tolerante a erros de proposito, e devolve sempre uma arvore,
//   mesmo quando ela nao representa o ficheiro. `sourceFile.parseDiagnostics`
//   e onde esses erros ficam gravados; sem os ler, um ficheiro com chaves por
//   fechar passava por "arvore vazia o suficiente para nao ter nada a
//   esconder", que e vacuidade, nao protecao.
const analisarTsx = (caminho) => {
  let codigo;
  try {
    codigo = readFileSync(caminho, 'utf8');
  } catch (erro) {
    exigir(`${caminho} existe e foi lido pelo guarda`, false);
    const raizVazia = ts.createSourceFile(caminho, '', ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    return { codigo: '', raiz: raizVazia };
  }
  const raiz = ts.createSourceFile(caminho, codigo, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  exigir(`${caminho} tem sintaxe valida (o guarda nao analisa uma arvore quebrada em silencio)`,
    (raiz.parseDiagnostics?.length ?? 0) === 0);
  return { codigo, raiz };
};

// Percorre a árvore inteira. O `ts.forEachChild` só continua a visitar os
// irmãos seguintes se o callback devolver algo "falsy" — por isso o callback
// aqui NUNCA devolve o array acumulado, só o efeito colateral de o preencher.
const colher = (no, predicado, achados = []) => {
  if (predicado(no)) achados.push(no);
  ts.forEachChild(no, (filho) => { colher(filho, predicado, achados); });
  return achados;
};

// N1 (ronda 2): uma desestruturação com renome — `const { rating: pontos } =
// highlighted;` — declara `pontos` com `name` do tipo `Identifier`, mas o
// `VariableDeclaration` que a contém tem `name` do tipo `ObjectBindingPattern`,
// não `Identifier`. Sem procurar dentro do padrão, `pontos` nunca era
// encontrado, e a cadeia transitiva parava aí — o mesmo ataque, achatado, dava
// verde no cartão E no painel (reabria o C1 fechado na ronda 1).
const declaracaoPorNome = (raiz, nome) => colher(raiz, (n) =>
  (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === nome) ||
  (ts.isBindingElement(n) && ts.isIdentifier(n.name) && n.name.text === nome) ||
  (ts.isFunctionDeclaration(n) && n.name?.text === nome) ||
  (ts.isInterfaceDeclaration(n) && n.name.text === nome) ||
  (ts.isTypeAliasDeclaration(n) && n.name.text === nome),
)[0];

// O tipo das propriedades do componente, seja ele anotado em
// `React.FC<Tipo>`, num parâmetro `(props: Tipo) =>` ou num literal inline.
const tipoDePropsDoComponente = (raiz, nomeDoComponente) => {
  const decl = declaracaoPorNome(raiz, nomeDoComponente);
  if (!decl) return null;
  if (ts.isFunctionDeclaration(decl)) return decl.parameters?.[0]?.type ?? null;
  if (ts.isVariableDeclaration(decl)) {
    if (decl.type && ts.isTypeReferenceNode(decl.type) && decl.type.typeArguments?.length) {
      return decl.type.typeArguments[0];
    }
    const fn = decl.initializer;
    if (fn && (ts.isArrowFunction(fn) || ts.isFunctionExpression(fn))) {
      return fn.parameters?.[0]?.type ?? null;
    }
  }
  return null;
};

// Os membros desse tipo, resolvendo `interface` OU `type X = { ... }` — as
// duas formas válidas em TypeScript, e o guarda anterior só reconhecia uma
// delas (por procurar a palavra `interface` no texto bruto).
const membrosDoTipo = (raiz, noDoTipo) => {
  if (!noDoTipo) return [];
  if (ts.isTypeLiteralNode(noDoTipo)) return [...noDoTipo.members];
  if (ts.isTypeReferenceNode(noDoTipo)) {
    const nome = noDoTipo.typeName.getText(raiz);
    const decl = declaracaoPorNome(raiz, nome);
    if (!decl) return [];
    if (ts.isInterfaceDeclaration(decl)) return [...decl.members];
    if (ts.isTypeAliasDeclaration(decl) && ts.isTypeLiteralNode(decl.type)) return [...decl.type.members];
  }
  return [];
};

// Todas as chamadas a uma função pelo nome dela, na árvore inteira.
const chamadasDe = (raiz, nomeDaFuncao) => colher(raiz, (n) =>
  ts.isCallExpression(n) && n.expression.getText(raiz) === nomeDaFuncao);

// O resultado de pelo menos uma chamada é USADO: atribuído a uma variável que
// é referenciada de novo dentro da mesma função, OU usado directamente numa
// expressão (dentro de JSX, de um template, como argumento de outra função).
// Não conta: uma declaração isolada nunca mais referenciada, nem `void
// chamada(...)`, que descarta o resultado de propósito.
const usaResultadoDaChamada = (raiz, nomeDaFuncao) => {
  const chamadas = chamadasDe(raiz, nomeDaFuncao);
  if (chamadas.length === 0) return false;
  return chamadas.some((chamada) => {
    const pai = chamada.parent;
    if (ts.isVariableDeclaration(pai) && pai.initializer === chamada && ts.isIdentifier(pai.name)) {
      const nomeDaVariavel = pai.name.text;
      let funcaoEnvolvente = pai;
      while (funcaoEnvolvente
        && !ts.isArrowFunction(funcaoEnvolvente)
        && !ts.isFunctionDeclaration(funcaoEnvolvente)
        && !ts.isFunctionExpression(funcaoEnvolvente)) {
        funcaoEnvolvente = funcaoEnvolvente.parent;
      }
      const corpo = funcaoEnvolvente?.body ? funcaoEnvolvente.body.getText(raiz) : '';
      const ocorrencias = (corpo.match(new RegExp(`\\b${nomeDaVariavel}\\b`, 'g')) || []).length;
      // >= 2: a declaração conta uma vez, e precisa de pelo menos mais uma
      // referência depois dela para o resultado ter ido a algum lado.
      return ocorrencias >= 2;
    }
    if (ts.isExpressionStatement(pai)) return false;
    if (pai.kind === ts.SyntaxKind.VoidExpression) return false;
    return true;
  });
};

// O texto de um nó, e o texto de tudo o que qualquer identificador local
// dentro dele referencia (até 6 níveis, cada nome visitado uma única vez).
// É o que permite apanhar `gostou` quando `gostou` foi declarado como
// `(highlighted.rating ?? 0) >= 4`: o guarda não procura "rating" só no sítio
// onde o convite é escondido, procura em toda a cadeia de onde a decisão vem.
const textoTransitivo = (raiz, no, profundidadeMaxima = 6) => {
  const visitados = new Set();
  const pedacos = [];
  const expandir = (atual, profundidade) => {
    if (!atual || profundidade > profundidadeMaxima) return;
    pedacos.push(atual.getText(raiz));
    if (ts.isIdentifier(atual)) {
      if (visitados.has(atual.text)) return;
      visitados.add(atual.text);
      const decl = declaracaoPorNome(raiz, atual.text);
      if (decl && ts.isVariableDeclaration(decl) && decl.initializer) {
        expandir(decl.initializer, profundidade + 1);
      } else if (decl && ts.isBindingElement(decl)) {
        // N1: `pontos` veio de `{ rating: pontos }` — o nome ORIGINAL da
        // propriedade (`rating`) e o que importa, nao o nome local escolhido.
        // `propertyName` existe so quando ha renome; na forma curta
        // `{ rating }` o proprio `name` ja e a chave.
        pedacos.push((decl.propertyName ?? decl.name).getText(raiz));
      } else if (decl && ts.isFunctionDeclaration(decl) && decl.body) {
        // N2: `function podeConvidar(caso) { return (caso.rating ?? 0) >= 4; }`
        // — a mesma funcao escrita como `const podeConvidar = (c) => ...` ja
        // era seguida (e um VariableDeclaration com initializer); faltava so
        // a forma `function`, que guarda a logica no `body` do proprio nome.
        expandir(decl.body, profundidade + 1);
      }
      return;
    }
    ts.forEachChild(atual, (filho) => { expandir(filho, profundidade); });
  };
  expandir(no, 0);
  return pedacos.join(' ');
};

// Qualquer grafia de "rating" ou "nota" na cadeia transitiva de um nó —
// não uma forma específica de comparação. `\bnota\b` evita apanhar palavras
// como "anotação" por engano.
const dependeDeNotaOuRating = (raiz, no) => {
  const texto = textoTransitivo(raiz, no);
  return /rating/i.test(texto) || /\bnota\b/i.test(texto);
};

// As condições (ternário ou `&&`/`||`) que decidem se um elemento JSX chega a
// ser desenhado, subindo a árvore a partir dele até sair da função que o
// contém. Cobre `a && <X/>`, `a ? <X/> : null`, e cadeias `a && b && <X/>`.
const condicoesQueEnvolvem = (elemento) => {
  const condicoes = [];
  let no = ts.isJsxOpeningElement(elemento) ? elemento.parent : elemento;
  let anterior = no;
  no = no.parent;
  while (no) {
    if (ts.isConditionalExpression(no)) {
      if (no.whenTrue === anterior || no.whenFalse === anterior) condicoes.push(no.condition);
    } else if (
      ts.isBinaryExpression(no)
      && (no.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken
        || no.operatorToken.kind === ts.SyntaxKind.BarBarToken)
    ) {
      if (no.right === anterior) condicoes.push(no.left);
    } else if (ts.isArrowFunction(no) || ts.isFunctionDeclaration(no) || ts.isFunctionExpression(no)) {
      break;
    }
    anterior = no;
    no = no.parent;
  }
  return condicoes;
};

// Os elementos `<Tag ...>` ou `<Tag ... />` com este nome, na árvore inteira.
// Comentários não são nós da árvore: um `{/* <Tag /> */}` nunca aparece aqui,
// ao contrário da expressão regular anterior, que lia o ficheiro em bruto.
const elementosJsxComNome = (raiz, nomeDaTag) => colher(raiz, (n) =>
  (ts.isJsxSelfClosingElement(n) && n.tagName.getText(raiz) === nomeDaTag)
  || (ts.isJsxOpeningElement(n) && n.tagName.getText(raiz) === nomeDaTag));

// Os atributos que fazem o convite desaparecer, e que por isso não podem
// depender da nota. São vigiados NOS DOIS ficheiros, com a mesma lista: a
// lição da ronda 2 foi que vigiar um atributo no painel e deixá-lo aberto no
// cartão é a mesma porta com outra maçaneta.
//
// - `linkDeAvaliacao`: sem link não há mensagem, e sem mensagem não há convite.
// - `casos`: é a lista de onde sai o cliente convidado. Filtrá-la por nota
//   («…`.filter((caso) => (caso.rating ?? 0) >= 4)`») faz o convite
//   desaparecer para as notas baixas sem tocar no convite nem no cartão, a 200
//   linhas de distância, com cara de afinação inocente da lista. Até
//   02/09/2026 este guarda EXCLUÍA `casos` de propósito, com o argumento de
//   que ele «depende de `rating` legitimamente». Depende, para ordenar e
//   contar; não depende para escolher quem entra.
const ATRIBUTOS_VIGIADOS = ['linkDeAvaliacao', 'casos'];

// Verdadeiro se algum destes elementos está, directa ou indirectamente,
// condicionado à nota, pelas condições que o envolvem OU por um dos atributos
// vigiados acima.
const escondidoPelaNota = (raiz, elementos, nomesDeAtributosSensiveis) => {
  for (const elemento of elementos) {
    const condicoes = condicoesQueEnvolvem(elemento);
    if (condicoes.some((condicao) => dependeDeNotaOuRating(raiz, condicao))) return true;
    for (const atributo of elemento.attributes.properties) {
      if (!ts.isJsxAttribute(atributo)) continue;
      if (!nomesDeAtributosSensiveis.includes(atributo.name.getText(raiz))) continue;
      if (!atributo.initializer || !ts.isJsxExpression(atributo.initializer) || !atributo.initializer.expression) continue;
      if (dependeDeNotaOuRating(raiz, atributo.initializer.expression)) return true;
    }
  }
  return false;
};

const { codigo: convite, raiz: raizDoConvite } = analisarTsx('src/components/dashboard/ConviteParaAvaliar.tsx');
const { codigo: cartao, raiz: raizDoCartao } = analisarTsx('src/components/dashboard/PendingCommentsBanner.tsx');
const { raiz: raizDoPainel } = analisarTsx('src/components/dashboard/ApprovedCockpitDashboard.tsx');

exigir('o convite na tela usa mensagemDoConvite, e usa o RESULTADO da chamada (nao so a chama e ignora)',
  usaResultadoDaChamada(raizDoConvite, 'mensagemDoConvite'));
exigir('o convite na tela usa linkDeWhatsApp, e usa o RESULTADO da chamada (nao so a chama e ignora)',
  usaResultadoDaChamada(raizDoConvite, 'linkDeWhatsApp'));
// Defesa extra, barata e ainda textual: mesmo usando o resultado partilhado,
// ninguem deveria escrever uma saudacao propria ao lado dele.
exigir('o convite na tela nao escreve uma saudacao a mao, ao lado da mensagem partilhada',
  !/Oi \$\{|Olá \$\{/.test(convite));

// A regra deste plano, na tela: o componente nao recebe a nota, logo nao pode
// esconder-se por causa dela. Le os MEMBROS do tipo das propriedades,
// resolvido a partir do componente (interface OU type, com ou sem `React.FC`).
const tipoDoConvite = tipoDePropsDoComponente(raizDoConvite, 'ConviteParaAvaliar');
const membrosDoConvite = membrosDoTipo(raizDoConvite, tipoDoConvite);
exigir('as propriedades do componente do convite foram lidas na arvore de sintaxe',
  membrosDoConvite.length > 0);
exigir('o componente do convite nao recebe a nota',
  !membrosDoConvite.some((membro) => /rating|nota/i.test(membro.name?.getText(raizDoConvite) || '')));

// ---------------------------------------------------------------------------
// A LINGUA DA MENSAGEM, NA TELA. Quem le a mensagem e o CLIENTE, e por isso
// ela segue o pais do NEGOCIO. `i18n.language` e a preferencia de painel do
// DONO, guardada no navegador e trocavel no seletor: ate 02/09/2026 era dai
// que a variante saia, e um dono brasileiro com o painel em portugues de
// Portugal mandava "Se lhe apetecer, deixe a sua opiniao" a um cliente
// brasileiro. E o defeito de 01/09/2026 outra vez, no mesmo painel, com a
// licao ja escrita ao lado.
//
// Lido na arvore de sintaxe, e transitivamente: nao interessa como a variavel
// se chama, interessa de onde o valor vem.
// ---------------------------------------------------------------------------
exigir('o componente do convite recebe o pais do negocio',
  membrosDoConvite.some((membro) => membro.name?.getText(raizDoConvite) === 'businessCountry'));

const chamadasDaMensagem = chamadasDe(raizDoConvite, 'mensagemDoConvite');
exigir('o guarda encontrou a chamada que monta a mensagem', chamadasDaMensagem.length > 0);
const origemDaMensagem = chamadasDaMensagem.map((c) => textoTransitivo(raizDoConvite, c)).join(' ');
exigir('a lingua da mensagem vem do pais do negocio',
  /businessCountry/.test(origemDaMensagem));
exigir('a lingua da mensagem NAO vem da preferencia de painel do dono',
  !/i18n\.language|resolvedLanguage/.test(origemDaMensagem));

// O valor tem de CHEGAR ate ao convite, e cada elo e um sitio onde ele se pode
// perder em silencio: o painel passa ao cartao, o cartao passa ao convite.
const atributoJsx = (raiz, elemento, nome) => elemento.attributes.properties.find((a) =>
  ts.isJsxAttribute(a) && a.name.getText(raiz) === nome);
const passaOPais = (raiz, elementos) => elementos.length > 0 && elementos.every((elemento) => {
  const atributo = atributoJsx(raiz, elemento, 'businessCountry');
  if (!atributo || !atributo.initializer || !ts.isJsxExpression(atributo.initializer)) return false;
  return /businessCountry/.test(atributo.initializer.expression?.getText(raiz) || '');
});

// O cartao desenha o convite: um elemento JSX real, lido na arvore de
// sintaxe. Um comentario nunca satisfaz isto.
const elementosDoConviteNoCartao = elementosJsxComNome(raizDoCartao, 'ConviteParaAvaliar');
exigir('o cartao desenha o convite ao lado do comentario destacado (na arvore de sintaxe: um comentario nao conta)',
  elementosDoConviteNoCartao.length > 0);
// Sem condicional de nota a volta do convite, nem em nenhuma propriedade dele,
// em qualquer grafia — nao so a forma `rating > 3` que a versao anterior
// adivinhava. `linkDeAvaliacao` e vigiado AQUI TAMBEM (N3, ronda 2): a ronda 1
// so vigiava este atributo no painel, e o mesmo ataque (condicionar
// `linkDeAvaliacao` a nota) escrito dentro do proprio `PendingCommentsBanner`
// ficava verde — a alavanca do C1, tapada num ficheiro e deixada aberta no
// outro.
exigir('o cartao nao esconde o convite por causa da nota, em nenhuma forma',
  elementosDoConviteNoCartao.length === 0
  || !escondidoPelaNota(raizDoCartao, elementosDoConviteNoCartao, ATRIBUTOS_VIGIADOS));
exigir('o cartao passa o pais do negocio ao convite (senao a mensagem sai na lingua do painel do dono)',
  passaOPais(raizDoCartao, elementosDoConviteNoCartao));

// O painel: quem decide o `linkDeAvaliacao` que o cartao recebe. E a
// alavanca que esconde o convite sem tocar no cartao nem no componente —
// por isso o guarda tem de ler o painel tambem, e nao so os dois ficheiros
// de baixo.
const elementosDoCartaoNoPainel = elementosJsxComNome(raizDoPainel, 'PendingCommentsBanner');
exigir('o painel desenha o cartao de comentarios pendentes (na arvore de sintaxe)',
  elementosDoCartaoNoPainel.length > 0);
exigir('o painel nao condiciona a lista de casos, nem o link de avaliacao, nem o cartao inteiro, a nota do comentario, em nenhuma forma',
  elementosDoCartaoNoPainel.length === 0
  || !escondidoPelaNota(raizDoPainel, elementosDoCartaoNoPainel, ATRIBUTOS_VIGIADOS));
exigir('o painel passa o pais do negocio ao cartao, o mesmo que ja passa a fila de respostas',
  passaOPais(raizDoPainel, elementosDoCartaoNoPainel));

// E3 (ronda 2): a chave existir no catalogo nao prova que alguem a use.
// Reverter os dois toasts do I3/M1 de volta para `inviteCopy` deixava o
// guarda verde, porque nada verificava se `inviteCopied`/`inviteCopyError`
// apareciam de facto numa chamada a `t(...)`.
const chavesDeTraducaoUsadas = (raiz) => {
  const chaves = new Set();
  for (const chamada of colher(raiz, (n) => ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === 't')) {
    const primeiroArgumento = chamada.arguments[0];
    if (primeiroArgumento && ts.isStringLiteralLike(primeiroArgumento)) chaves.add(primeiroArgumento.text);
  }
  return chaves;
};
const chavesUsadasNoConvite = chavesDeTraducaoUsadas(raizDoConvite);
exigir('o convite na tela usa invite.inviteCopied ao copiar com sucesso',
  chavesUsadasNoConvite.has('invite.inviteCopied'));
exigir('o convite na tela usa invite.inviteCopyError quando falha a copiar',
  chavesUsadasNoConvite.has('invite.inviteCopyError'));

for (const idioma of ['pt-PT', 'pt-BR', 'en']) {
  const catalogo = JSON.parse(readFileSync(`src/i18n/owner/locales/${idioma}.json`, 'utf8'));
  for (const chave of ['inviteTitle', 'inviteHint', 'inviteWhatsApp', 'inviteCopy', 'inviteCopied', 'inviteCopyError', 'inviteNoLink']) {
    exigir(`${idioma}.json tem texto para invite.${chave}`,
      typeof catalogo?.invite?.[chave] === 'string' && catalogo.invite[chave].length > 0);
  }
}

// ---------------------------------------------------------------------------
// O LINK DE AVALIACAO DO GOOGLE, e o criterio que decide que ele existe.
//
// O painel dizia, num comentario, que usava "o mesmo jeito que `useSetupStatus`
// decide se o negocio ja tem endereco do Google". Nao usava: o `useSetupStatus`
// exige URL nao vazio e o painel aceitava a primeira entrada com "google" na
// plataforma, tivesse ela endereco ou nao. Com uma entrada "Google Reviews" sem
// URL e uma "Google Maps" com URL, o passo a passo dizia ao dono que estava
// completo e o convite dizia-lhe para ligar o link.
//
// Os DOIS lados sao medidos, e nao so o que foi corrigido: um criterio que
// promete ser igual a outro tem de ficar vermelho quando qualquer um dos dois
// se mexer. A declaracao e lida na arvore de sintaxe, e nao no ficheiro em
// bruto, para que um comentario nunca a satisfaca.
// ---------------------------------------------------------------------------
const semEspacos = (texto) => texto.replace(/\s+/g, '');
const declaracaoDoLink = declaracaoPorNome(raizDoPainel, 'linkDeAvaliacaoDoGoogle');
exigir('o guarda encontrou no painel a declaracao do link de avaliacao do Google',
  declaracaoDoLink !== undefined);
const textoDoLink = declaracaoDoLink ? semEspacos(declaracaoDoLink.getText(raizDoPainel)) : '';
exigir('o painel so aceita como link do Google uma entrada com URL nao vazio',
  textoDoLink.includes("platform.toLowerCase().includes('google')&&!!link.url?.trim()"));
const setupStatus = semEspacos(readFileSync('src/hooks/useSetupStatus.ts', 'utf8'));
exigir('useSetupStatus continua a exigir a mesma coisa, e os dois criterios nao podem divergir em silencio',
  setupStatus.includes("platform?.toLowerCase().includes('google')&&!!l.url?.trim()"));

// ---------------------------------------------------------------------------
// O CONTRATO DE PRODUTO. Ele descreve o produto, e por isso nao pode prometer
// no presente uma coisa que nao esta aplicada, nem dizer "sempre" quando o
// convite so existe onde ja havia aviso. As quatro linhas abaixo sao os quatro
// pontos que a revisao final de 02/09/2026 mandou escrever la.
// ---------------------------------------------------------------------------
const contrato = readFileSync('docs/contrato-produto-binno.md', 'utf8');
exigir('o contrato diz "sempre que ha aviso", e nao "sempre"',
  /Passa a ser escrita\s+sempre que há aviso/.test(contrato));
exigir('o contrato diz que a migracao esta escrita e POR APLICAR',
  /Estado da migração do aviso: escrita e por aplicar/.test(contrato)
  && /20260902120000_convite_sem_filtro\.sql/.test(contrato));
exigir('o contrato regista o convite na tela, para qualquer nota',
  /O convite também aparece na tela, para qualquer nota/.test(contrato));
exigir('o contrato regista que o Binno nao envia, o dono toca',
  /O Binno não envia o convite: ele escreve, o dono toca/.test(contrato));

if (falhas.length) {
  console.error('Convite sem filtro: %d protecao(oes) falharam.\n', falhas.length);
  for (const falha of falhas) console.error(' - %s', falha);
  process.exit(1);
}
console.log(`Convite sem filtro: ${verificadas} protecoes verdes.`);
