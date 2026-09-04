#!/usr/bin/env node
// O Painel publica no Google, em vez de mandar copiar.
//
// POR QUE ESTE GUARDA EXISTE
//
// Ate 04/09/2026 o cartao "Avaliacoes no Google" do Painel oferecia so
// "Copiar resposta", "Editar" e "Pular". Publicar existia noutra tela. O dono
// via o rascunho pronto, copiava, e tinha de sair do produto para colar.
//
// E o botao que existia para o levar la — "Abrir o Google para responder" —
// levava a uma pagina GERAL de avaliacoes, e nao aquela avaliacao. Nao era
// descuido: a API v4 nao devolve URL por avaliacao, entao esse link nunca
// poderia apontar para o comentario certo. Marcelo reparou nas duas coisas.
//
// Com a publicacao oficial provada (a primeira resposta chegou ao Google pelo
// produto em 03/09/2026), copiar deixou de ser o caminho: e o recuo.
//
// O ERRO QUE ESTE GUARDA EXISTE PARA APANHAR e publicar com o id ERRADO. Os
// itens da fila do Painel levam o id PREFIXADO (`google-oficial:...`, ver
// `idDaFila`), e o publicador precisa do id cru da avaliacao. Mandar o
// prefixado faz o Google recusar — e ja houve neste projecto um defeito da
// mesma familia, com a mesma avaliacao a ser paga duas vezes por causa de duas
// chaves diferentes.
import { readFileSync } from 'node:fs';

/*
 * DOIS FICHEIROS DESDE 04/09/2026, e a divisao nao e arbitraria.
 *
 * A fila saiu do painel para ficheiro proprio quando o painel passou o tecto de
 * 350 linhas. A LIGACAO ao publicador continua no painel — e la que a fila e
 * colocada e alimentada. O COMPORTAMENTO de publicar (que id vai, quando o
 * botao aparece, o clique) foi com o codigo.
 *
 * Cada assercao aponta para o ficheiro onde a regra dela vive. Ler os dois nao
 * afrouxa nada; ler so um deixaria metade das regras sem dono, verde por o
 * codigo ter mudado de sitio.
 */
const CAMINHO = 'src/components/dashboard/ApprovedCockpitDashboard.tsx';
const CAMINHO_DA_FILA = 'src/components/dashboard/reviews/FilaDoPainel.tsx';
const semComentarios = (texto) => texto
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
const fila = semComentarios(readFileSync(CAMINHO_DA_FILA, 'utf8'));
const bruto = readFileSync(CAMINHO, 'utf8');
const fonte = bruto
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');

if (fonte.includes('POR QUE ESTE GUARDA')) {
  console.error('O strip de comentarios nao funcionou; as asserções mediriam a explicacao.');
  process.exit(1);
}

const falhas = [];
let verificadas = 0;
const exigir = (rotulo, condicao) => { verificadas += 1; if (!condicao) falhas.push(rotulo); };

// 1. O PAINEL PUBLICA. Antes disto, so copiava.
// A LIGACAO ao publicador, e nao o NOME da funcao. A primeira versao desta
// assercao procurava `publishReply(` e ficou vermelha por a prop se chamar
// `publicar` — vermelha por um nome, nao por um defeito. O que importa e que a
// fila do Painel esteja ligada ao publicador oficial.
exigir('a fila do Painel nao esta ligada ao publicador oficial; o dono continua a ter de copiar e colar',
  /publicar=\{official\.publishReply\}/.test(fonte));

// 2. COM O ID CRU, e nunca o prefixado. Este e o defeito que se paga caro.
exigir('a fila do Painel nao carrega o id cru da avaliacao; publicar mandaria o id prefixado',
  /idNaFonte/.test(fonte) && /idNaFonte/.test(fila));
exigir('o publicador e chamado sem o id cru da avaliacao',
  /publicar\(selected\.idNaFonte,/.test(fila));
// O prefixado nunca pode chegar la. `selected.id` leva `google-oficial:` a
// frente e o Google recusaria, com o dono a ver apenas "nao deu".
exigir('o id prefixado (`selected.id`) esta a ser passado ao publicador',
  !/publicar\(selected\.id\s*,/.test(fila));
// E publicar so quando ha o que publicar, e nunca em demonstracao.
exigir('publicar nao exige o id cru nem exclui a demonstracao',
  /const podePublicar = !demo && Boolean\(publicar\) && Boolean\(selected\?\.idNaFonte\)/.test(fila));

// 3. SO PUBLICA QUANDO O DONO MANDA. Nunca automatico: e perfil publico e nao
//    se desfaz.
exigir('publicar nao esta preso a um clique do dono',
  /onClick=\{[^}]*publicarNoGoogle/.test(fila) || /onClick=\{\(\) => void publicarNoGoogle/.test(fila));

// 4. O LINK GENERICO SAI quando da para publicar. Mandar o dono a uma pagina
//    geral de avaliacoes, com o rascunho na mao, e pior do que nao mandar.
exigir('o link generico para business.google.com continua no cartao do Painel',
  !/business\.google\.com\/reviews/.test(fonte) && !/business\.google\.com\/reviews/.test(fila));

// 5. COPIAR CONTINUA A EXISTIR, como recuo. Um guarda que so exigisse publicar
//    passaria com o botao de copiar apagado, e quem quer colar noutro sitio
//    ficaria sem saida.
// O BOTAO, e nao a funcao. A primeira versao procurava `copyReply(` e ficava
// verde quando so a declaracao era renomeada — a chamada sobrava e casava. O
// que o dono perde se isto sumir e o BOTAO, entao e o botao que se mede.
exigir('o botao de copiar desapareceu; ele e o recuo de quem quer colar noutro sitio',
  /onClick=\{\(\) => void copyReply\(\)\}/.test(fila)
  && /dashboard\.cockpit\.assisted\.copy/.test(fila));

// 6. AS CHAVES DE TEXTO EXISTEM NOS TRES IDIOMAS.
for (const locale of ['pt-BR', 'pt-PT', 'en']) {
  const d = JSON.parse(readFileSync(`src/i18n/owner/locales/${locale}.json`, 'utf8'));
  const texto = d?.dashboard?.cockpit?.approved?.publishOnGoogle;
  exigir(`${locale}: falta a chave dashboard.cockpit.approved.publishOnGoogle`,
    typeof texto === 'string' && texto.trim().length > 0);
}

// 7. O LINK GENERICO SAI DE ONDE HA PUBLICACAO. Na aba, o rascunho oficial
//    aparecia com um botao "Publicar resposta no Google" E um link "Abrir o
//    Google para responder" que leva a pagina geral de avaliacoes. Dois
//    caminhos, um deles pior, lado a lado.
const sugestoes = readFileSync('src/components/dashboard/ReplySuggestions.tsx', 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
const aba = readFileSync('src/components/dashboard/reviews/FilaDeRespostas.tsx', 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');

exigir('o link generico do Google aparece mesmo quando da para publicar daqui',
  /channel === 'public' && !podePublicarAqui &&/.test(sugestoes));
exigir('a aba nao diz quando da para publicar; o link generico ficaria sempre',
  /podePublicarAqui=\{item\.origem === 'google-oficial'\}/.test(aba));
// E continua a existir para quem NAO tem ligacao oficial: para esses e a unica
// saida. Um guarda que so mandasse esconder passaria com o link apagado.
exigir('o link para o Google foi apagado; quem nao tem ligacao oficial fica sem saida',
  /business\.google\.com\/reviews/.test(sugestoes));

// 8. A CONFIRMACAO DIZ DE QUEM ERA A RESPOSTA.
//
// Quando a avaliacao respondida sai da lista, a SEGUINTE desliza para o mesmo
// lugar, com o mesmo botao e o mesmo aspecto. Uma confirmacao sem nome nao
// distingue "publicou e a lista andou" de "nao aconteceu nada" — Marcelo
// publicou a resposta da Eletrica em 04/09/2026 e concluiu, com razao, que nao
// tinha acontecido nada.
exigir('a confirmacao do Painel nao diz de quem era a resposta',
  /approved\.published', \{[\s\S]{0,120}?autor:/.test(fila));
exigir('a confirmacao da aba nao diz de quem era a resposta',
  /official\.published', \{[\s\S]{0,120}?autor:/.test(aba));
for (const locale of ['pt-BR', 'pt-PT', 'en']) {
  const d = JSON.parse(readFileSync(`src/i18n/owner/locales/${locale}.json`, 'utf8'));
  exigir(`${locale}: a confirmacao do Painel nao usa {{autor}}`,
    (d?.dashboard?.cockpit?.approved?.published || '').includes('{{autor}}'));
  exigir(`${locale}: a confirmacao da aba nao usa {{autor}}`,
    (d?.reviews?.google?.official?.published || '').includes('{{autor}}'));
}

if (falhas.length) {
  console.error('Publicar do Painel: %d protecao(oes) falharam.\n', falhas.length);
  for (const f of falhas) console.error(' - %s', f);
  process.exit(1);
}
console.log(`Publicar do Painel: ${verificadas} protecoes verdes.`);
