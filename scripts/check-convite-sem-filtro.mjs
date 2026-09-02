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
const { mensagemDoConvite, linkDeWhatsApp } = await import(
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
exigir('um numero com espacos e travessoes tambem e telefone', tipoDoContacto('(79) 99838-0767') === 'telefone');
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
// ---------------------------------------------------------------------------
const analisarTsx = (caminho) => {
  const codigo = readFileSync(caminho, 'utf8');
  const raiz = ts.createSourceFile(caminho, codigo, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
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

const declaracaoPorNome = (raiz, nome) => colher(raiz, (n) =>
  (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === nome) ||
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

// Verdadeiro se algum destes elementos está, directa ou indirectamente,
// condicionado à nota — pelas condições que o envolvem OU por um atributo
// nomeado (o painel só precisa de proteger `linkDeAvaliacao`, que é a
// propriedade que faz o convite desaparecer; `casos` depende de `rating`
// legitimamente, por ser a lista inteira dos comentários, e não deve ser
// verificado).
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

// O cartao desenha o convite: um elemento JSX real, lido na arvore de
// sintaxe. Um comentario nunca satisfaz isto.
const elementosDoConviteNoCartao = elementosJsxComNome(raizDoCartao, 'ConviteParaAvaliar');
exigir('o cartao desenha o convite em cada caso (na arvore de sintaxe — um comentario nao conta)',
  elementosDoConviteNoCartao.length > 0);
// Sem condicional de nota a volta do convite, nem em nenhuma propriedade dele,
// em qualquer grafia — nao so a forma `rating > 3` que a versao anterior
// adivinhava.
exigir('o cartao nao esconde o convite por causa da nota, em nenhuma forma',
  elementosDoConviteNoCartao.length === 0
  || !escondidoPelaNota(raizDoCartao, elementosDoConviteNoCartao, []));

// O painel: quem decide o `linkDeAvaliacao` que o cartao recebe. E a
// alavanca que esconde o convite sem tocar no cartao nem no componente —
// por isso o guarda tem de ler o painel tambem, e nao so os dois ficheiros
// de baixo.
const elementosDoCartaoNoPainel = elementosJsxComNome(raizDoPainel, 'PendingCommentsBanner');
exigir('o painel desenha o cartao de comentarios pendentes (na arvore de sintaxe)',
  elementosDoCartaoNoPainel.length > 0);
exigir('o painel nao condiciona o link de avaliacao do Google (nem o cartao inteiro) a nota do comentario, em nenhuma forma',
  elementosDoCartaoNoPainel.length === 0
  || !escondidoPelaNota(raizDoPainel, elementosDoCartaoNoPainel, ['linkDeAvaliacao']));

for (const idioma of ['pt-PT', 'pt-BR', 'en']) {
  const catalogo = JSON.parse(readFileSync(`src/i18n/owner/locales/${idioma}.json`, 'utf8'));
  for (const chave of ['inviteTitle', 'inviteHint', 'inviteWhatsApp', 'inviteCopy', 'inviteCopied', 'inviteCopyError', 'inviteNoLink']) {
    exigir(`${idioma}.json tem texto para invite.${chave}`,
      typeof catalogo?.invite?.[chave] === 'string' && catalogo.invite[chave].length > 0);
  }
}

if (falhas.length) {
  console.error('Convite sem filtro: %d protecao(oes) falharam.\n', falhas.length);
  for (const falha of falhas) console.error(' - %s', falha);
  process.exit(1);
}
console.log(`Convite sem filtro: ${verificadas} protecoes verdes.`);
