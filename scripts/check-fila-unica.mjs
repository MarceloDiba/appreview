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
const CONTRATO = 'docs/contrato-produto-binno.md';

const pagina = semComentarios(ler(PAGINA));
const fila = semComentarios(ler(FILA));
const modulo = semComentarios(ler(MODULO));
const bloco = semComentarios(ler(BLOCO));
const sugestoes = semComentarios(ler(SUGESTOES));
const cabecalho = semComentarios(ler(CABECALHO));
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

// A soma tem de ser das TRÊS origens. Conferir só o nome da função deixaria
// passar uma fila que perdeu uma origem pelo caminho.
const chamadaDaSoma = fila.match(/montarFilaDeRespostas\(\{[\s\S]*?\}\)/);
exigir('a fila chama montarFilaDeRespostas', chamadaDaSoma !== null);
if (chamadaDaSoma) {
  for (const [origem, fonte] of [['privados', 'privados.cases'], ['oficiais', 'oficiais.reviews'], ['publicas', 'publicas.reviews']]) {
    exigir(
      `a fila soma a origem "${origem}" (${fonte})`,
      chamadaDaSoma[0].includes(`${origem}: ${fonte}`),
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
  exigir(
    `${caminho}: existe pelo menos uma linha que empilha no celular e vira linha a partir de sm`,
    /flex-col[^"]*sm:flex-row/.test(fonte),
  );
}

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
