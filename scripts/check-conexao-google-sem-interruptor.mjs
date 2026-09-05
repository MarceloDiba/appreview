#!/usr/bin/env node
// A conexão oficial do Google nao pode voltar a depender de uma variavel de
// build que pode nunca chegar ao pacote de producao.
//
// POR QUE ESTE GUARDA EXISTE
//
// Ate 03/09/2026 o cartao de conectar so aparecia atras de
// `VITE_GOOGLE_BUSINESS_OAUTH_ENABLED`, uma variavel do Vite. O Google aprovou
// o projeto para a Business Profile API nesse dia, as tres chaves foram postas
// no Supabase, e o botao continuou desaparecido: a variavel nunca chegou ao
// ambiente de build de producao, e nao ha como o codigo do navegador verificar
// isso — ele so sabe o que foi embrulhado no pacote no momento de compilar.
//
// A protecao certa ja existia do lado errado. `start-google-business-oauth`
// sabe, em tempo real, se as tres chaves estao configuradas, e devolve
// `GOOGLE_OAUTH_NOT_CONFIGURED` quando nao estao — e o cartao ja tratava esse
// erro com um aviso claro. Depender TAMBEM de uma variavel de build era uma
// segunda porta, mais fragil, na frente da primeira.
import { readFileSync, readdirSync } from 'node:fs';

const semComentarios = (fonte) => fonte
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, ' ')
  .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');

const falhas = [];
let verificadas = 0;
const exigir = (rotulo, condicao) => { verificadas += 1; if (!condicao) falhas.push(rotulo); };

// 1. A variavel de build nao pode voltar a decidir se o botao aparece. Isto
// varre TODO o `src`, e nao so os quatro ficheiros de hoje: e o unico jeito de
// apanhar um quinto lugar que a reintroduza amanha.
const ficheiros = [];
const varrer = (dir) => {
  for (const entrada of readdirSync(dir, { withFileTypes: true })) {
    const caminho = `${dir}/${entrada.name}`;
    if (entrada.isDirectory()) varrer(caminho);
    else if (/\.(ts|tsx)$/.test(entrada.name)) ficheiros.push(caminho);
  }
};
varrer('src');
const comAVariavel = ficheiros.filter((caminho) =>
  semComentarios(readFileSync(caminho, 'utf8')).includes('VITE_GOOGLE_BUSINESS_OAUTH_ENABLED'));
exigir('nenhum ficheiro do painel decide pela variavel de build removida',
  comAVariavel.length === 0);

// 2. A protecao real continua no lugar: o cartao trata a recusa do servidor.
// O convite a ligar continua em `GoogleBusinessConnection`; o encadeado que
// vem DEPOIS de ligar vive em `usePreparacaoDoGoogle`. As assercoes de estado
// seguiram o codigo: quem pergunta ao banco se ja esta ligado passou a ser o
// encadeado, porque e ele que decide o que mostrar.
const conexao = semComentarios(readFileSync('src/components/settings/GoogleBusinessConnection.tsx', 'utf8'))
  + semComentarios(readFileSync('src/hooks/usePreparacaoDoGoogle.ts', 'utf8'))
  + semComentarios(readFileSync('src/components/settings/ConexaoDoGoogle.tsx', 'utf8'));
exigir('o cartao continua a tratar GOOGLE_OAUTH_NOT_CONFIGURED, vinda do servidor',
  /GOOGLE_OAUTH_NOT_CONFIGURED/.test(conexao));
exigir('o botao de conectar nao esta atras de condicao nenhuma antes de aparecer',
  !/if \(!\w+\) \{/.test(conexao.slice(0, conexao.indexOf('const startConnection'))));

// 3. Os componentes que passaram a montar sempre continuam seguros SEM a
// conexao existir — cada um tem de saber dizer "nada para mostrar" sozinho,
// porque agora ninguem os impede de correr de fora.
const localizador = semComentarios(readFileSync('src/components/settings/GoogleBusinessLocationPicker.tsx', 'utf8'));
exigir('o seletor de local fica invisivel sozinho quando nao ha conexao',
  /if \(loading \|\| !connected\) return null;/.test(localizador));
const filaOficial = semComentarios(readFileSync('src/hooks/useGoogleBusinessReviewQueue.ts', 'utf8'));
exigir('a fila oficial devolve vazio sozinha quando nao ha conexao, sem lancar erro',
  /if \(connection\?\.status !== 'connected'\) \{/.test(filaOficial));

// ---------------------------------------------------------------------
// 3b. O CARTAO DIZ A VERDADE SOBRE O ESTADO. Marcelo ligou a conta, voltou do
// Google, e a tela continuou a oferecer "Conectar Google" — exactamente o que
// ele acabara de fazer, sem forma de saber se tinha funcionado. A ligacao
// estava gravada; era a tela que nao perguntava.
// ---------------------------------------------------------------------
exigir('o cartao pergunta ao banco se ja esta ligado',
  /\.from\('google_business_connections'\)/.test(conexao)
  && /status === 'connected'/.test(conexao));
// `null` enquanto nao se sabe, e nao `false`: assumir "desligado" antes da
// resposta faz o botao piscar em quem JA esta ligado.
exigir('enquanto nao se sabe, o cartao nao afirma nada',
  /useState<boolean \| null>\(null\)/.test(conexao)
  && /if \(ligado === null\) return null;/.test(conexao));
exigir('quem ja esta ligado ve que esta ligado, e nao um convite a ligar',
  /if \(ligado\) \{/.test(conexao)
  && /googleConnection\.connectedTitle/.test(conexao));
// Reconectar continua possivel: um consentimento pode ser revogado do lado do
// Google sem o Binno saber, e sem este botao a unica saida seria o banco.
exigir('quem ja esta ligado ainda consegue reconectar',
  /googleConnection\.reconnect/.test(conexao));

// ---------------------------------------------------------------------
// 4. AS ABAS: "Links externos" e "Google Reviews" viraram uma so, chamada
// "Google" (pedido de Marcelo, 03/09/2026). As duas falavam da mesma coisa em
// telas diferentes: o link que alimenta a coleta, e o que essa coleta traz de
// volta. Duas assercoes: a estrutura tem so duas abas, e o link vem ANTES da
// conexao dentro da aba unica — porque tudo depende dele primeiro.
// ---------------------------------------------------------------------
const settings = semComentarios(readFileSync('src/pages/Settings.tsx', 'utf8'));
exigir('a pagina de configuracoes tem so duas abas, e nao tres',
  (settings.match(/<TabsTrigger value="/g) || []).length === 2);
exigir('a aba unica chama-se "google", e nao "external-links" nem "google-reviews"',
  /<TabsTrigger value="business">/.test(settings) && /<TabsTrigger value="google">/.test(settings)
  && /<TabsContent value="google">/.test(settings)
  && !/<TabsContent value="external-links">|<TabsContent value="google-reviews">/.test(settings));
// A ORDEM INVERTEU-SE EM 05/09/2026, e a razao antiga expirou em vez de estar
// errada. Ela dizia "o link vem primeiro porque tudo depende dele" — verdade em
// 03/09, quando a ligacao oficial tinha acabado de ser aprovada e o link colado
// a mao era o unico caminho que funcionava.
//
// Hoje a ligacao oficial devolve o `placeId` do proprio Google, e a primeira
// coisa que o dono via ao abrir a aba era um PEDIDO — "cole aqui o seu link" —
// antes de o produto lhe dizer que ja estava ligado e ja sabia o endereco.
// Marcelo apanhou-o duas vezes, a segunda assim: "ele ainda pede link externos,
// nao ja tinhamos falado para eliminar isso".
//
// O que NAO mudou, e continua protegido noutro guarda: o link colado, quando
// existe, continua a mandar. `get_public_qr_business` prefere-o de proposito,
// para nao trocar por baixo o destino de um QR que ja esta impresso numa mesa.
const posicaoDoLink = settings.indexOf('<ExternalLinksSettings');
const posicaoDaConexao = settings.indexOf('<ConexaoDoGoogle');
exigir('o cartao da conexao existe na pagina', posicaoDaConexao > 0);
exigir('a conexao oficial vem antes do link colado a mao, dentro da mesma aba',
  posicaoDoLink > 0 && posicaoDaConexao > 0 && posicaoDaConexao < posicaoDoLink);

// E O FORMULARIO DO LINK RECOLHE-SE PARA QUEM JA LIGOU. Nao desaparece — quem
// colou um endereco curto pode te-lo impresso — mas deixa de interrogar quem
// nao precisa dele. Mede-se o portao e o rotulo, e nao so a palavra `details`:
// um `<details>` sempre aberto nao recolhe nada.
exigir('o formulario do link recolhe-se quando ha ligacao oficial',
  /negocioOficial \? \([\s\S]{0,400}<details/.test(settings)
  && /colarProprio/.test(settings));

if (falhas.length) {
  console.error('Conexao do Google sem interruptor: %d protecao(oes) falharam.\n', falhas.length);
  for (const falha of falhas) console.error(' - %s', falha);
  process.exit(1);
}
console.log(`Conexao do Google sem interruptor: ${verificadas} protecoes verdes.`);
