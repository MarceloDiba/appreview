#!/usr/bin/env node
// Uma fila só para responder, e botões que cabem no cartão do celular.
//
// Duas decisões de 30/08/2026, registradas em `docs/contrato-produto-binno.md`
// nas secções "Uma fila só para responder" e "Botões que cabem no cartão, no
// celular". As duas vivem na mesma página (`/reviews`), por isso partilham um
// guarda; as secções abaixo estão separadas e cada asserção nomeia a regra que
// protege.
//
// Cada linha aqui foi provada vermelha quebrando exatamente a regra que ela
// nomeia. Uma asserção que não consegue falhar não protege nada, e este
// repositório já produziu levas inteiras dessas nesta semana.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const raiz = process.cwd();
const ler = (caminho) => readFileSync(resolve(raiz, caminho), 'utf8');

// Comentários podem conter qualquer coisa, inclusive o texto exato que este
// guarda proíbe: os comentários destes arquivos explicam o defeito antigo
// citando `flex flex-row` e `whitespace-nowrap`. Sem os remover, o guarda
// ficaria vermelho com o código certo, e um pedaço de código comentado
// satisfaria qualquer busca por texto.
const semComentarios = (fonte) => fonte
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');

const PAGINA = 'src/pages/Reviews.tsx';
const FILA = 'src/components/dashboard/reviews/FilaDeRespostas.tsx';
const MODULO = 'src/lib/filaDeRespostas.ts';
const BLOCO = 'src/components/dashboard/PendingCommentsBanner.tsx';
const SUGESTOES = 'src/components/dashboard/ReplySuggestions.tsx';
const CABECALHO = 'src/components/dashboard/reviews/ReviewsHeader.tsx';
const LEITURA_PUBLICA = 'src/hooks/useGoogleReviews.ts';
const CONTRATO = 'docs/contrato-produto-binno.md';

const pagina = semComentarios(ler(PAGINA));
const fila = semComentarios(ler(FILA));
const modulo = semComentarios(ler(MODULO));
const bloco = semComentarios(ler(BLOCO));
const sugestoes = semComentarios(ler(SUGESTOES));
const cabecalho = semComentarios(ler(CABECALHO));
const leituraPublica = semComentarios(ler(LEITURA_PUBLICA));
const contrato = ler(CONTRATO);

const falhas = [];
let verificadas = 0;
const exigir = (rotulo, condicao) => { verificadas += 1; if (!condicao) falhas.push(rotulo); };

// ---------------------------------------------------------------------------
// 1. Uma fila só, com as origens somadas
// ---------------------------------------------------------------------------

exigir(
  'a página de Avaliações não tem seletor de abas: o dono não escolhe origem antes de responder',
  !/from '@\/components\/ui\/tabs'/.test(pagina) && !/<Tabs/.test(pagina),
);

exigir(
  'a página de Avaliações renderiza exatamente uma fila',
  (pagina.match(/<FilaDeRespostas/g) || []).length === 1
  && pagina.includes("from '@/components/dashboard/reviews/FilaDeRespostas'"),
);

// As três superfícies separadas eram o problema: duas abriam vazias ou com um
// convite para conectar. Se qualquer uma voltar a ser renderizada aqui ao lado
// da fila, as origens voltam a estar separadas na mesma página.
for (const separada of ['GoogleReviews', 'GoogleBusinessReviewQueue', 'CasesList']) {
  exigir(
    `a página de Avaliações não volta a renderizar ${separada} ao lado da fila`,
    !new RegExp(`<${separada}[\\s/>]`).test(pagina),
  );
}

// A soma tem de ser das TRÊS origens, mais a marcação do dono sobre o que ele
// já respondeu no Google. Conferir só o nome da função deixaria passar uma fila
// que perdeu uma origem pelo caminho.
const fontesDaFila = fila.match(/const fontes = useMemo\(\s*\(\) => \(\{([\s\S]*?)\}\)/);
exigir('a fila monta as fontes num lugar só', fontesDaFila !== null);
exigir('a fila e o histórico leem as MESMAS fontes, e não duas listas que podem divergir',
  fila.includes('montarFilaDeRespostas(fontes)') && fila.includes('itensJaTratados(fontes)'));
if (fontesDaFila) {
  for (const [origem, fonte] of [
    ['privados', 'privados.cases'],
    ['oficiais', 'oficiais.reviews'],
    ['publicas', 'publicas.reviews'],
    ['respondidasNoGoogle', 'respondidas.answered'],
  ]) {
    exigir(
      `a fila soma a origem "${origem}" (${fonte})`,
      fontesDaFila[1].includes(`${origem}: ${fonte}`),
    );
  }
}

for (const [origem, hook] of [
  ['comentário privado', 'useInternalFeedback'],
  ['fila oficial do Google', 'useGoogleBusinessReviewQueue'],
  ['leitura pública do Google', 'useGoogleReviews'],
]) {
  exigir(`a fila lê a origem "${origem}" por ${hook}`, new RegExp(`${hook}\\(`).test(fila));
}

exigir(
  'a fila é desenhada uma vez só, e não uma lista por origem',
  (fila.match(/fila\.map\(/g) || []).length === 1,
);

exigir(
  'cada item da fila mostra de onde veio',
  /<Origem origem=\{item\.origem\} \/>/.test(fila),
);

exigir(
  'a fila tem uma âncora única, para onde o bloco de comentários pendentes aponta',
  (fila.match(/id=\{FILA_ANCHOR_ID\}/g) || []).length === 1
  && /FILA_ANCHOR_ID = 'fila-de-respostas'/.test(fila),
);

exigir(
  'o bloco "Comentários que pedem atenção" leva à âncora da fila, não ao topo da página',
  bloco.includes('/reviews#fila-de-respostas'),
);

// A ordem vive num lugar só. Um `.sort(` aqui seria a segunda cópia da regra,
// e é assim que o bloco da Visão geral e a lista passaram a discordar sobre
// qual é o caso mais recente, em 30/08/2026.
exigir(
  'a fila somada não tem ordenação própria',
  !modulo.includes('.sort(') && !fila.includes('.sort('),
);

// A atribuição ao Google não é enfeite: os termos deles exigem-na onde quer
// que o conteúdo de avaliação seja mostrado, e esta fila mostra nome do
// avaliador e texto. Ela desapareceu quando as três superfícies viraram uma, e
// é o tipo de coisa que ninguém repara em falta. Tem de estar presa à presença
// de item do Google, não solta no arquivo.
exigir(
  'a fila mostra a atribuição ao Google quando há item vindo do Google',
  /temItemDoGoogle &&[\s\S]{0,500}reviews\.google\.attribution/.test(fila),
);
exigir(
  'a fila mostra o aviso de relevância quando há item da leitura pública, que é a porta que escolhe por relevância',
  /temItemPublico[\s\S]{0,300}reviews\.google\.relevanceNotice/.test(fila),
);

// As duas asserções acima prendem o desenho ao nome do booleano, e só isso.
// Escrever `const temItemDoGoogle = [...].some(...) && false` deixa as duas
// verdes enquanto a linha de atribuição nunca aparece, que é a falha exata que
// a auditoria de 31/08 demonstrou. Uma linha exigida pelos termos do Google não
// pode depender de um guarda que confere o nome da variável.
//
// Estas duas prendem o cálculo: cada booleano nasce de percorrer a lista real,
// e nenhum aceita um literal que o force a um valor fixo.
for (const nome of ['temItemDoGoogle', 'temItemPublico']) {
  const calculo = fila.match(new RegExp(`const ${nome} = ([^;]+);`));
  exigir(`${nome} deixou de ser calculado na fila.`, calculo !== null);
  if (calculo) {
    const expressao = calculo[1];
    exigir(
      `${nome} deixou de nascer de percorrer a fila e os já tratados, entao pode ficar preso num valor que nao corresponde ao que esta na tela.`,
      /\.some\(/.test(expressao) && /fila/.test(expressao) && /tratados/.test(expressao),
    );
    exigir(
      `${nome} passou a conter um literal booleano, que o prende a um valor fixo e faz a atribuição ao Google desaparecer com o guarda verde.`,
      !/(^|[^A-Za-z.])(false|true)([^A-Za-z]|$)/.test(expressao),
    );
  }
}

// Uma atualização que falha tem de parecer diferente de uma que funcionou e
// não trouxe nada. As três linhas seguintes prendem a cadeia inteira: a
// leitura pública devolve se correu bem, a fila lê esse resultado, e a fila
// desenha o aviso. Sem qualquer uma delas o dono clica, a tela fica igual, e
// ele não tem como saber que quebrou.
exigir(
  `${LEITURA_PUBLICA}: handleRefresh diz a quem chama se a leitura correu bem`,
  /const handleRefresh = async \(\): Promise<boolean>/.test(leituraPublica)
  && /return ok;/.test(leituraPublica),
);
exigir(
  'a fila trata a falha da atualização em vez de a ignorar',
  /!\(await oficiais\.syncAll\(\)\)/.test(fila)
  && /!\(await publicas\.handleRefresh\(\)\)/.test(fila)
  && /setFalhaAoAtualizar\(falhou\)/.test(fila),
);
exigir(
  'a fila mostra ao dono que a atualização falhou, e o que fazer',
  /\(falhaAoAtualizar \|\| oficiais\.error\) &&[\s\S]{0,400}reviews\.queue\.refreshError/.test(fila),
);

// A sincronização oficial pagina o perfil. Enquanto não termina, a contagem é
// de uma parte, e mostrá-la como total é dado incompleto passado por completo.
exigir(
  'a fila avisa quando a sincronização oficial ainda não terminou',
  /!oficiais\.syncComplete &&[\s\S]{0,300}reviews\.google\.official\.incomplete/.test(fila),
);

// Uma avaliação do Google pode ser só a nota. Sem o estado próprio, o cartão
// fica com um buraco e o dono não sabe se o texto não existe ou não carregou.
exigir(
  'um item sem texto escrito diz isso, em vez de deixar um buraco no cartão',
  /reviews\.google\.official\.noComment/.test(fila),
);

// O perfil de quem avaliou existia na lista antiga e voltou com a fila. Só
// quando a fonte o devolve: nunca se inventa um link.
exigir(
  'o autor vira link para o perfil dele somente quando a fonte devolve o link',
  /item\.autorUrl \?/.test(fila),
);

exigir(
  `${CONTRATO} registra a decisão da fila só, com a razão`,
  /Uma fila só para responder \(decisão de 30\/08\/2026\)/.test(contrato)
  && /origens somadas em vez de separadas por aba/.test(contrato),
);

// ---------------------------------------------------------------------------
// 2. Botões que cabem no cartão, no celular
// ---------------------------------------------------------------------------
//
// A causa dos três botões que vazavam era a mesma: uma linha de ação que
// continuava a ser linha no celular, com botões que não podem encolher nem
// quebrar (`whitespace-nowrap` vem do próprio `Button`). Um botão assim fixa a
// largura mínima da linha inteira, e a linha passa da caixa. `flex-wrap` não
// resolve sozinho: a quebra acontece entre botões, e um botão mais largo do
// que a caixa transborda na mesma.
//
// Daí as duas regras: nenhuma destas telas tem linha no celular, e todo botão
// de ação ocupa a largura do cartão até `sm`.

const TELAS_DE_RESPOSTA = [[FILA, fila], [SUGESTOES, sugestoes], [CABECALHO, cabecalho]];

for (const [caminho, fonte] of TELAS_DE_RESPOSTA) {
  exigir(
    `${caminho}: nenhuma linha de ação é linha no celular (todo flex-row tem prefixo de breakpoint)`,
    !/(?<![:\w-])flex-row/.test(fonte),
  );
}

// A asserção anterior a esta era "existe pelo menos uma linha que empilha", por
// arquivo. Não conseguia falhar pela regra que dizia proteger: dois destes
// arquivos têm duas linhas que empilham, então reverter UMA delas para uma
// linha sem quebra deixava a outra a satisfazer o guarda. Foi substituída pela
// leitura por linha, abaixo: cada botão é procurado pela sua própria chave de
// tradução, e o que se mede é a `<div>` que o CONTÉM.
//
// A `<div>` que contém um elemento: percorre o arquivo até ao índice
// empilhando cada `<div ...>` aberta e desempilhando em `</div>`, saltando
// strings para não confundir um `>` dentro de um atributo com o fim da tag. O
// topo da pilha no índice é o contentor.
const divEnvolvente = (fonte, indice) => {
  const pilha = [];
  let i = 0;
  while (i < indice && i < fonte.length) {
    if (fonte.startsWith('</div>', i)) { pilha.pop(); i += 6; continue; }
    if (fonte.startsWith('<div', i)) {
      let j = i + 4;
      let aspas = null;
      while (j < fonte.length) {
        const c = fonte[j];
        if (aspas) { if (c === aspas) aspas = null; }
        else if (c === '"' || c === "'" || c === '`') aspas = c;
        else if (c === '>') break;
        j += 1;
      }
      const tag = fonte.slice(i, j + 1);
      if (!tag.endsWith('/>')) pilha.push(tag);
      i = j + 1;
      continue;
    }
    i += 1;
  }
  return pilha.length ? pilha[pilha.length - 1] : null;
};

const classesDa = (tag) => (tag && tag.match(/className="([^"]*)"/)) ? tag.match(/className="([^"]*)"/)[1] : '';

// Uma caixa é linha no telemóvel quando é `flex` sem `flex-col`. É nessa caixa
// que um botão que não encolhe nem quebra empurra a largura mínima para além
// do cartão. Uma caixa que não é flex (um bloco simples) não tem o problema.
const ehLinhaNoCelular = (classes) =>
  /(^|\s)flex(\s|$)/.test(classes) && !/(^|\s)flex-col(\s|$)/.test(classes);

// O elemento `<Button ...>` que desenha um rótulo: do `<Button` mais próximo
// para trás até a chave de tradução. Prender o botão pela própria chave que
// ele mostra evita medir "existe a classe em algum lugar do arquivo", que
// ficaria verde com a classe no botão errado.
const botaoDoRotulo = (fonte, chave) => {
  const fim = fonte.indexOf(chave);
  if (fim === -1) return null;
  const inicio = fonte.lastIndexOf('<Button', fim);
  if (inicio === -1) return null;
  return fonte.slice(inicio, fim);
};

const BOTOES_LONGOS = [
  [FILA, fila, "t('reviews.refresh')", 'Atualizar, no topo da fila'],
  [FILA, fila, "t('reviews.cases.markResolved')", 'Marcar como resolvido'],
  [FILA, fila, "t('reviews.queue.markAnswered')", 'Já respondi no Google'],
  [FILA, fila, "t('reviews.google.sourceReview')", 'Ver avaliação no Google Maps'],
  [FILA, fila, "t('reviews.google.official.publish')", 'Publicar resposta no Google'],
  [SUGESTOES, sugestoes, "t('reply.copy')", 'Copiar'],
  [SUGESTOES, sugestoes, "t('reply.sendEmail')", 'Enviar por e-mail'],
  [SUGESTOES, sugestoes, "t('reply.openGoogle')", 'Abrir o Google para responder'],
  [CABECALHO, cabecalho, "t('reviews.google.viewOnGoogle')", 'Ver no Google'],
  [CABECALHO, cabecalho, "t('reviews.google.refresh')", 'Atualizar'],
];

for (const [caminho, fonte, chave, nome] of BOTOES_LONGOS) {
  const botao = botaoDoRotulo(fonte, chave);
  exigir(`${caminho}: o botão "${nome}" continua a existir e a usar ${chave}`, botao !== null);
  if (botao) {
    exigir(
      `${caminho}: o botão "${nome}" ocupa a largura do cartão no celular (w-full sm:w-auto)`,
      botao.includes('w-full') && botao.includes('sm:w-auto'),
    );
    const indiceDoBotao = fonte.lastIndexOf('<Button', fonte.indexOf(chave));
    const classesDaLinha = classesDa(divEnvolvente(fonte, indiceDoBotao));
    exigir(
      `${caminho}: a linha que contém o botão "${nome}" empilha no celular, em vez de ser uma linha`,
      !ehLinhaNoCelular(classesDaLinha),
    );
  }
}

exigir(
  `${CONTRATO} registra a correção dos botões que vazavam do cartão`,
  /Botões que cabem no cartão, no celular \(correção de 30\/08\/2026\)/.test(contrato),
);

if (falhas.length) {
  console.error('Fila única de respostas: %d proteção(ões) falharam.\n', falhas.length);
  for (const falha of falhas) console.error(' - %s', falha);
  process.exit(1);
}
console.log(`Fila única de respostas: ${verificadas} proteções verdes.`);
