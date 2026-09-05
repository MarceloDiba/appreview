#!/usr/bin/env node
// As paginas legais tem de ser legiveis por um robo.
//
// POR QUE ESTE GUARDA EXISTE
//
// Em 04/09/2026 a Meta recusou publicar o app do WhatsApp com "URL de Politica
// de Privacidade valido" em falta. O endereco devolvia 200 e a pagina abria
// perfeitamente num navegador — mas `binno.pro` e uma aplicacao de pagina
// unica: o HTML entregue nao continha UMA palavra da politica, porque o texto
// so aparece depois de o JavaScript correr. O robo da Meta nao corre JavaScript.
//
// O sintoma era o pior tipo: "esta la, eu estou a ver" para um humano, e
// "nao existe" para quem decide.
//
// NESSE MESMO DIA, ao preparar a verificacao do Google, os TERMOS mostraram o
// defeito identico — `binno.pro/termos` devolvia 200 com zero palavras. Tinha-se
// consertado a politica e deixado o vizinho igual, porque o guarda so olhava
// para um dos dois. Agora olha para os dois.
//
// A PAGINA ESTATICA E GERADA A PARTIR DO COMPONENTE, e nao escrita a parte.
// Duas politicas divergiriam sem ninguem ver, e a que o robo le — a que vale
// como compromisso legal perante a Meta e perante a lei — seria a errada.
import { existsSync, readFileSync } from 'node:fs';

const falhas = [];
let verificadas = 0;
const exigir = (rotulo, condicao) => { verificadas += 1; if (!condicao) falhas.push(rotulo); };

// 1. A GERACAO CORRE NA BUILD. Sem isto, a pagina estatica nao chega ao ar.
const pacote = JSON.parse(readFileSync('package.json', 'utf8'));
exigir('a build deixou de gerar as paginas legais estaticas; o robo voltaria a ler a casca vazia',
  /gerar-paginas-legais\.mjs/.test(pacote.scripts.build || ''));

// 2. E O SCRIPT GERA A PARTIR DO COMPONENTE, e nao de um texto proprio.
const gerador = readFileSync('scripts/prerender/legais.tsx', 'utf8');
exigir('a pagina estatica deixou de sair do componente da politica; sao duas politicas a divergir',
  /from '@\/pages\/Privacy'/.test(gerador) && /renderToStaticMarkup/.test(gerador));
exigir('a pagina estatica dos termos deixou de sair do componente dos termos',
  /from '@\/pages\/Terms'/.test(gerador));

// 3. O FICHEIRO GERADO TEM POLITICA DENTRO. Se a build correu, ele existe — e
//    se existir vazio e pior do que nao existir, porque parece resolvido.
const destino = 'dist/privacidade.html';
if (existsSync(destino)) {
  const html = readFileSync(destino, 'utf8');
  exigir(`a politica gerada tem so ${html.length} caracteres; nao e uma politica`,
    html.length > 5000);
  for (const termo of ['dados', 'LGPD', 'WhatsApp', 'Supabase']) {
    exigir(`a politica gerada nao menciona "${termo}"`, new RegExp(termo, 'i').test(html));
  }
  // O texto tem de estar no HTML servido, e nao atras de um script.
  exigir('o texto da politica nao esta no HTML entregue; e isso que o robo nao consegue ler',
    /Pol[íi]tica de Privacidade<\/h1>|<h1[^>]*>\s*Pol[íi]tica/i.test(html));
} else {
  // Nao falha: `dist/` so existe depois da build, e este guarda corre antes
  // dela na cadeia. Mas diz, para ninguem ler o verde como prova.
  console.error('  (nota: dist/privacidade.html ainda nao existe; as asserções sobre o conteudo correm depois da build)');
}

// 3b. E OS TERMOS TAMBEM. O Google exige os dois enderecos na verificacao do
//     app, e um deles vazio recusa o pedido inteiro.
const termos = 'dist/termos.html';
// A AUSENCIA TEM DE FALAR. Se a politica gerada existe, a build correu — e uns
// termos em falta nesse ponto sao um defeito, nao "ainda nao chegou a vez".
// Sem esta linha, apagar os termos do gerador deixava o guarda VERDE, so com
// menos asserções a correr: exactamente o vazio que ele existe para apanhar.
if (existsSync(destino)) {
  exigir('a politica foi gerada e os termos nao; o Google recebe um dos dois enderecos vazio',
    existsSync(termos));
}
if (existsSync(termos)) {
  const html = readFileSync(termos, 'utf8');
  exigir(`os termos gerados tem so ${html.length} caracteres; nao sao uns termos`,
    html.length > 4000);
  exigir('o texto dos termos nao esta no HTML entregue; e isso que o robo nao consegue ler',
    /Termos de Servi[çc]o<\/h1>|<h1[^>]*>\s*Termos/i.test(html));
  // A CLAUSULA QUE NAO PODE DESAPARECER. `Terms.tsx` diz no cabecalho que a
  // proibicao de filtrar avaliacoes e a linha que o codigo tambem defende. Uns
  // termos sem ela, servidos ao Google, descreveriam outro produto.
  exigir('os termos gerados nao proibem filtrar avaliacoes',
    /filtrar avalia/i.test(html));
  // E NAO PODE SER A POLITICA DENTRO DO FICHEIRO ERRADO. Um molde que recebesse
  // o corpo trocado passaria em tamanho e deixaria o Google a ler a politica
  // como se fossem os termos.
  exigir('o ficheiro dos termos contem a politica de privacidade; os corpos foram trocados',
    !/Pol[íi]tica de Privacidade<\/h1>/i.test(html));
}

// 4. A POLITICA DESCREVE O QUE O PRODUTO FAZ HOJE. Uma politica que nao fala do
//    WhatsApp e do Google descreve um produto que ja nao existe — e e ela que a
//    Meta le para rever o caso de uso.
// ESPACOS COLAPSADOS ANTES DE MEDIR. O JSX quebra frases a meio para caber na
// largura do ficheiro, e uma frase partida em duas linhas nao casa com uma
// expressao regular escrita de seguida. Aconteceu logo a primeira vez, com
// "sem essa\n  confirmação": a promessa estava la e a assercao dizia que nao.
const fonte = readFileSync('src/pages/Privacy.tsx', 'utf8').replace(/\s+/g, ' ');
exigir('a politica nao fala do WhatsApp do dono, que e por onde o rascunho viaja',
  /WhatsApp do dono/i.test(fonte));
exigir('a politica nao fala das respostas a espera de confirmacao',
  /Respostas à espera de confirmação/i.test(fonte));
exigir('a politica nao promete que nada e publicado sem confirmacao',
  /sem essa confirmação/i.test(fonte));
const legal = readFileSync('src/lib/legal.ts', 'utf8');
exigir('a lista de subcontratantes nao inclui a Meta, que trata as mensagens',
  /WhatsApp Business Cloud API/.test(legal));
exigir('a lista de subcontratantes nao inclui a API do Google que PUBLICA a resposta',
  /Business Profile API/.test(legal));

// 5. O ENDERECO QUE O ROBO ABRE TEM DE CHEGAR AO FICHEIRO GERADO.
//
// Esta assercao existe porque as outras dezanove ficaram VERDES enquanto
// `binno.pro/privacidade` servia 1054 bytes sem uma palavra da politica. Elas
// mediam `dist/privacidade.html`, que estava perfeito, e nunca o endereco que
// os links do produto apontam — todos sem `.html`.
//
// O `vercel.json` tinha um coringa `/(.*) -> /index.html` que engolia tudo
// antes de chegar aos ficheiros gerados. Consertou-se a geracao e nao o
// caminho, que e a mesma metade do defeito que fez a Meta recusar o app.
//
// Mede-se a CONFIGURACAO, e nao a rede: um guarda que faz pedidos ao vivo fica
// vermelho quando a Vercel espirra, e verde quando o computador esta offline —
// os dois piores dias para se acreditar num guarda.
const VERCEL = JSON.parse(readFileSync('vercel.json', 'utf8'));
const regras = VERCEL.rewrites || [];

// A VERCEL RECUSA CAMPO QUE NAO CONHECE, e derruba a build inteira por causa
// disso. Em 05/09/2026 escrevi um `_comentario` neste ficheiro para explicar
// por que a ordem das regras importa; quatro deploys seguidos falharam com
// "should NOT have additional property `_comentario`", e a home nova ficou
// dezenas de minutos fora do ar enquanto eu dizia ao Marcelo que estava no ar.
//
// O `verify` ficou VERDE o tempo todo: ele lia o JSON e nunca perguntou se a
// Vercel o aceitaria. A explicacao mudou-se para este guarda, que e onde ela
// devia estar desde o inicio — aqui ninguem a executa.
const CAMPOS_QUE_A_VERCEL_ACEITA = new Set([
  'buildCommand', 'cleanUrls', 'crons', 'devCommand', 'framework', 'functions',
  'headers', 'ignoreCommand', 'images', 'installCommand', 'outputDirectory',
  'public', 'redirects', 'regions', 'rewrites', 'trailingSlash', '$schema',
]);
const desconhecidos = Object.keys(VERCEL).filter((k) => !CAMPOS_QUE_A_VERCEL_ACEITA.has(k));
exigir(`o vercel.json tem campo(s) que a Vercel nao conhece e vao derrubar a build: ${desconhecidos.join(', ')}`,
  desconhecidos.length === 0);
const coringa = regras.findIndex((r) => r.source === '/(.*)');

for (const [endereco, ficheiro] of [['/privacidade', '/privacidade.html'], ['/termos', '/termos.html']]) {
  const posicao = regras.findIndex((r) => r.source === endereco && r.destination === ficheiro);
  exigir(`'${endereco}' nao aponta para '${ficheiro}'; o robo abre a casca vazia da aplicacao`,
    posicao !== -1);
  // A ORDEM E A REGRA. Depois do coringa, a regra existe e nunca corre.
  exigir(`'${endereco}' vem DEPOIS do coringa; o coringa engole-o antes`,
    posicao !== -1 && (coringa === -1 || posicao < coringa));
}

if (falhas.length) {
  console.error('Paginas legais que o robo le: %d protecao(oes) falharam.\n', falhas.length);
  for (const f of falhas) console.error(' - %s', f);
  process.exit(1);
}
console.log(`Paginas legais que o robo le: ${verificadas} protecoes verdes.`);
