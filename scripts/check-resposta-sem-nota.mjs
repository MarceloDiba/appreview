import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';

// Um comentario sem nota nao pode virar um pedido de desculpa.
//
// O QUE ESTE GUARDA PROTEGE
//
// `sentimentOf` comecava por `if (rating <= 2) return 'negative'`. Em
// JavaScript `null <= 2` e `true`, porque o null vira 0 na comparacao. Ou seja:
// o cliente que escreveu um elogio e nao deu nota nenhuma recebia uma resposta
// redigida como se tivesse dado uma estrela, com pedido de desculpa e oferta de
// reparacao, pronta para o dono copiar e enviar em nome dele.
//
// A REGRA
//
// Nenhuma sugestao pode afirmar nem sugerir uma nota que o cliente nao deu, em
// nenhum dos quatro conteudos (pt-PT, pt-BR, es, en). Sem nota, a resposta e
// guiada so pelo texto: usa o assunto que a pessoa escreveu e nao toma posicao
// sobre a visita ter sido boa ou ma.
//
// Mapear para 'neutral' nao resolveria. O corpo neutro abre com "Obrigado por
// avaliar" e pergunta "o que faltou": afirma uma nota que nao existe e da como
// certo que algo correu mal. Por isso existe um quarto conjunto, `unrated`.
//
// COMO ESTE GUARDA VERIFICA
//
// Em duas frentes:
//
//   1. Regressao, por retrato dourado. `scripts/snapshots/respostas-com-nota.json`
//      guarda a saida de hoje para as notas 1 a 5, nos dois canais e nos quatro
//      conteudos. Qualquer mudanca de palavra numa resposta com nota fica
//      vermelha. O retrato foi gravado a partir do modulo antes desta mudanca.
//
//      Nao se compara contra `git show HEAD:...` de proposito: depois do commit,
//      HEAD passa a ser a versao nova e a comparacao passaria a ser consigo
//      mesma, verde para sempre.
//
//   2. Conteudo, para a nota ausente. Constroi a resposta sem nota nos quatro
//      conteudos e exige que ela nao contenha nenhuma das marcas que afirmam
//      posicao ou nota, e que use o assunto do texto sem usar o "conserto" nem
//      o "elogio" do tema.
//
// Para regravar o retrato de proposito, depois de mudar a copy com nota:
//   node scripts/check-resposta-sem-nota.mjs --gravar

const raiz = process.cwd();
const RESPOSTAS = resolve(raiz, 'src/lib/replySuggestions.ts');
const COMENTARIO = resolve(raiz, 'src/lib/comentarioInterno.ts');
const RETRATO = resolve(raiz, 'scripts/snapshots/respostas-com-nota.json');

const { buildReplySuggestions } = await import(pathToFileURL(RESPOSTAS).href);

// Um texto por conteudo que casa com o tema 'limpeza', o primeiro da lista.
// Serve para provar que a resposta e guiada pelo texto: o assunto do tema tem
// de aparecer, e o "conserto" e o "elogio" do tema nao podem aparecer.
const TEMA = {
  pt: {
    texto: 'A limpeza da casa de banho podia ser melhor.',
    noun: 'a limpeza',
    fix: 'Reforcei a rotina de limpeza e a verificação das casas de banho durante o serviço.',
    praise: 'tenha reparado no cuidado com a limpeza',
  },
  'pt-BR': {
    texto: 'A limpeza do banheiro podia ser melhor.',
    noun: 'a limpeza',
    fix: 'Reforcei a limpeza e a conferência dos banheiros durante o expediente.',
    praise: 'tenha notado o cuidado com a limpeza',
  },
  es: {
    texto: 'La limpieza del bano podria mejorar.',
    noun: 'la limpieza',
    fix: 'He reforzado la rutina de limpieza y la revisión de los baños durante el servicio.',
    praise: 'hayas notado el cuidado con la limpieza',
  },
  en: {
    texto: 'The bathroom cleanliness could be better.',
    noun: 'cleanliness',
    fix: 'We have tightened our cleaning routine and the checks on the washrooms during service.',
    praise: 'you noticed how much care we put into keeping the place clean',
  },
};

/** Como cada conteudo e alcancado: pt-BR so existe com o negocio no Brasil. */
const CONTEUDOS = [
  { conteudo: 'pt', locale: 'pt', businessCountry: null },
  { conteudo: 'pt-BR', locale: 'pt', businessCountry: 'BR' },
  { conteudo: 'es', locale: 'es', businessCountry: null },
  { conteudo: 'en', locale: 'en', businessCountry: null },
];

const CANAIS = ['public', 'private'];

const entrada = (conteudo, canal, rating, comTexto) => ({
  rating,
  text: comTexto ? TEMA[conteudo.conteudo].texto : null,
  customerName: 'Ana Ribeiro',
  businessName: 'Casa do Forno',
  channel: canal,
  locale: conteudo.locale,
  businessCountry: conteudo.businessCountry,
});

/** As combinacoes com nota, que sao as que o retrato dourado congela. */
function casosComNota() {
  const casos = [];
  for (const conteudo of CONTEUDOS) {
    for (const canal of CANAIS) {
      for (const rating of [1, 2, 3, 4, 5]) {
        for (const comTexto of [true, false]) {
          casos.push({
            chave: `${conteudo.conteudo}|${canal}|${rating}|${comTexto ? 'com-texto' : 'sem-texto'}`,
            entrada: entrada(conteudo, canal, rating, comTexto),
          });
        }
      }
    }
  }
  return casos;
}

const gravar = process.argv.includes('--gravar');

if (gravar) {
  const retrato = {};
  for (const caso of casosComNota()) retrato[caso.chave] = buildReplySuggestions(caso.entrada);
  mkdirSync(dirname(RETRATO), { recursive: true });
  // O travessão vai escapado como \\u2014. A copy com nota que este retrato
  // congela é anterior à regra de não usar travessão no repositório, e reproduzi-la
  // aqui traria o caractere de volta num arquivo novo. O escape do JSON guarda
  // exatamente o mesmo texto: `JSON.parse` devolve o travessão, a comparação
  // continua byte a byte, e o arquivo continua legível em português.
  const escapado = JSON.stringify(retrato, null, 2)
    .replace(/\u2014/g, '\\u2014')
    .replace(/\u2013/g, '\\u2013');
  writeFileSync(RETRATO, `${escapado}\n`, 'utf8');
  console.log(`Retrato gravado: ${Object.keys(retrato).length} combinações com nota.`);
  process.exit(0);
}

const { lerNotaDoCaso } = await import(pathToFileURL(COMENTARIO).href);

// A lista de casos de `/reviews` virou a fila única de respostas em
// 30/08/2026 (`docs/contrato-produto-binno.md`, "Uma fila só para responder"):
// o comentário privado passou a aparecer somado às avaliações do Google, numa
// tela só. A regra protegida aqui não mudou nem um pouco, e é a mesma de
// sempre: um item sem nota não pode desenhar a escala de cinco estrelas
// apagadas, porque é isso que uma nota 1 desenha. Só mudou o arquivo onde ela
// vive, e é ele que este guarda passa a ler. Fixar o arquivo antigo deixaria o
// guarda verde num arquivo apagado, ou vermelho por uma mudança aprovada.
const filaDeRespostas = readFileSync(resolve(raiz, 'src/components/dashboard/reviews/FilaDeRespostas.tsx'), 'utf8');
const componenteResposta = readFileSync(
  resolve(raiz, 'src/components/dashboard/ReplySuggestions.tsx'),
  'utf8'
);
const catalogos = ['pt-BR', 'pt-PT', 'en'].map((idioma) => ({
  idioma,
  json: JSON.parse(readFileSync(resolve(raiz, `src/i18n/owner/locales/${idioma}.json`), 'utf8')),
}));

const requisitos = [];
const exigir = (rotulo, condicao) => requisitos.push([rotulo, !!condicao]);

// ---------------------------------------------------------- 1. sem regressao

const retrato = JSON.parse(readFileSync(RETRATO, 'utf8'));
const casos = casosComNota();

exigir('o retrato dourado cobre todas as combinações com nota', Object.keys(retrato).length === casos.length);

const divergentes = casos.filter(
  (caso) => JSON.stringify(buildReplySuggestions(caso.entrada)) !== JSON.stringify(retrato[caso.chave])
);
exigir(
  `as respostas de nota 1 a 5 continuam idênticas ao retrato (${casos.length} combinações)`,
  divergentes.length === 0
);
if (divergentes.length) {
  console.error(`  divergiram: ${divergentes.slice(0, 4).map((d) => d.chave).join(', ')}`);
}

// ------------------------------------------- 2. a nota ausente não vira nota

// Marcas que afirmam posição ou nota. Cada uma sai de uma variante real com
// nota: desculpa (negativa), agradecer a avaliação e perguntar o que faltou
// (neutra), celebrar o elogio (positiva).
const PROIBIDO = {
  pt: ['lamento', 'obrigado por avaliar', 'o que faltou', 'nota do meio', 'fico feliz', 'fico contente', 'pelas suas palavras', 'ter sido mesmo boa'],
  'pt-BR': ['sinto muito', 'obrigado por avaliar', 'o que faltou', 'nota no meio', 'fico feliz', 'fico contente', 'pelas suas palavras', 'ter sido realmente boa'],
  es: ['lamento', 'gracias por tu valoración', 'qué faltó', 'nota intermedia', 'me alegra', 'por tus palabras', 'fuera realmente buena'],
  en: ['i am sorry', 'thank you for the review', 'what was missing', 'middling rating', 'i am glad', 'kind words', 'a good one'],
};

const idsNegativos = { public: ['curta'], private: ['contacto-imediato', 'com-reparacao'] };

for (const conteudo of CONTEUDOS) {
  const nome = conteudo.conteudo;
  const tema = TEMA[nome];

  for (const canal of CANAIS) {
    const semNota = buildReplySuggestions(entrada(conteudo, canal, null, true));
    const rotulo = `${nome}/${canal}`;

    exigir(`${rotulo}: sem nota, o dono recebe alguma sugestão`, semNota.length > 0);

    const tudo = semNota.map((s) => `${s.title}\n${s.hint}\n${s.body}`).join('\n').toLowerCase();

    for (const marca of PROIBIDO[nome]) {
      exigir(`${rotulo}: sem nota, a resposta não diz "${marca}"`, !tudo.includes(marca.toLowerCase()));
    }

    exigir(
      `${rotulo}: sem nota, a resposta não reusa as variantes de nota baixa`,
      !semNota.some((s) => idsNegativos[canal].includes(s.id))
    );

    // Guiada pelo texto: usa o assunto, mas não o conserto nem o elogio do tema,
    // que são afirmações sobre a visita ter corrido mal ou bem.
    exigir(`${rotulo}: sem nota, a resposta fala do assunto que a pessoa escreveu`, tudo.includes(tema.noun.toLowerCase()));
    exigir(`${rotulo}: sem nota, a resposta não promete o conserto do tema`, !tudo.includes(tema.fix.toLowerCase()));
    exigir(`${rotulo}: sem nota, a resposta não celebra o elogio do tema`, !tudo.includes(tema.praise.toLowerCase()));

    // E não é apenas um apelido de uma das faixas com nota.
    for (const rating of [1, 2, 3, 4, 5]) {
      const comNota = buildReplySuggestions(entrada(conteudo, canal, rating, true));
      exigir(
        `${rotulo}: sem nota não produz o mesmo texto da nota ${rating}`,
        JSON.stringify(semNota) !== JSON.stringify(comNota)
      );
    }
  }
}

// A causa raiz, no caso mais perigoso: elogio escrito, nota nenhuma.
const elogioSemNota = buildReplySuggestions({
  rating: null,
  text: 'Tudo impecável, a equipe foi muito atenciosa e a comida estava ótima.',
  customerName: 'Ana',
  businessName: 'Casa do Forno',
  channel: 'private',
  locale: 'pt',
  businessCountry: 'BR',
});
exigir(
  'um elogio sem nota não recebe resposta com pedido de desculpa',
  !elogioSemNota.some((s) => /sinto muito|lamento|desculp/i.test(s.body))
);
exigir(
  'um elogio sem nota não recebe oferta de compensação',
  !elogioSemNota.some((s) => /por nossa conta|compensa/i.test(s.body))
);

// -------------------------------------------- 3. o painel não desenha 5 cinzas

exigir('lerNotaDoCaso: null é ausência de nota', lerNotaDoCaso(null).tipo === 'sem-nota');
exigir('lerNotaDoCaso: undefined é ausência de nota', lerNotaDoCaso(undefined).tipo === 'sem-nota');
exigir('lerNotaDoCaso: NaN é ausência de nota', lerNotaDoCaso(Number.NaN).tipo === 'sem-nota');
exigir('lerNotaDoCaso: 3 é nota 3', lerNotaDoCaso(3).tipo === 'nota' && lerNotaDoCaso(3).valor === 3);
exigir('lerNotaDoCaso: 1 é nota 1', lerNotaDoCaso(1).tipo === 'nota' && lerNotaDoCaso(1).valor === 1);

exigir(
  'a fila de respostas decide as estrelas por lerNotaDoCaso',
  /lerNotaDoCaso\s*\(/.test(filaDeRespostas)
);
exigir(
  'a fila de respostas não compara estrela com a nota crua (null acenderia zero estrelas)',
  !/<=\s*(item\.rating|valor\b|item\.nota)/.test(filaDeRespostas)
);
exigir(
  'a fila de respostas mostra um rótulo de ausência de nota, em vez de uma escala vazia',
  /reviews\.cases\.noRating/.test(filaDeRespostas)
);
// O item sem nota da fila somada pode vir de qualquer origem, e a escala só
// pode ser desenhada depois de `lerNotaDoCaso` dizer que existe nota. Se o
// desenho das estrelas voltar a ficar antes do portão, é porque alguém
// desenhou primeiro e perguntou depois.
exigir(
  'na fila de respostas o portão de ausência de nota vem antes do desenho das estrelas',
  filaDeRespostas.indexOf("reviews.cases.noRating") < filaDeRespostas.indexOf('fill-yellow-400')
);
exigir(
  'ReplySuggestions aceita caso sem nota no seu tipo',
  /rating:\s*number\s*\|\s*null/.test(componenteResposta)
);

for (const { idioma, json } of catalogos) {
  const rotuloSemNota = json?.reviews?.cases?.noRating;
  exigir(`${idioma}: o painel tem texto próprio para "sem nota"`, typeof rotuloSemNota === 'string' && rotuloSemNota.length > 0);
}

// ---------------------------------------------------------------- resultado

const falhas = requisitos.filter(([, ok]) => !ok).map(([rotulo]) => rotulo);
if (falhas.length) {
  console.error(`Resposta sem nota com regra quebrada:\n- ${falhas.join('\n- ')}`);
  process.exit(1);
}

console.log(`Resposta sem nota verificada: ${requisitos.length} regras conferidas.`);
