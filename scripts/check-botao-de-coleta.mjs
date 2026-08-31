#!/usr/bin/env node
// O botao de coletar precisa existir no site publicado.
//
// Em 30/08/2026 ele nao existia: um interruptor de tempo de compilacao
// (`VITE_APIFY_EXPERIMENTAL_ENABLED`) devolvia `null` no componente inteiro, e
// o Vite removia o cartao do pacote. Enquanto isso o servidor estava ligado e o
// resto do painel mandava o dono ir a Configuracoes coletar. Ele foi, procurou,
// e nao achou nada para clicar.
//
// A regra que estas assercoes protegem: quem decide se a coleta esta ativada e
// o servidor, nunca a compilacao do site.
import { readFileSync } from 'node:fs';

const CARTAO = 'src/components/settings/ExperimentalApifySnapshot.tsx';
const CONFIG = 'src/pages/Settings.tsx';

const semComentarios = (fonte) => fonte
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');

const falhas = [];
const exigir = (condicao, mensagem) => { if (!condicao) falhas.push(mensagem); };

const cartaoBruto = readFileSync(CARTAO, 'utf8');
const cartao = semComentarios(cartaoBruto);
const config = semComentarios(readFileSync(CONFIG, 'utf8'));

// 1. O cartao continua montado na pagina de configuracoes. Sem isto nao ha
// botao, por mais correto que o componente esteja.
exigir(/<ExperimentalApifySnapshot\b/.test(config),
  `O cartao de coleta deixou de ser montado em ${CONFIG}: nao existe botao nenhum para o dono clicar.`);

// 2. Nenhum retorno vazio no corpo do componente. Era assim que o cartao sumia:
// `if (!isExperimentalApifyAvailable && !isLocalPreview) return null;`
const corpo = (() => {
  const inicio = cartao.indexOf('const ExperimentalApifySnapshot =');
  if (inicio === -1) return null;
  return cartao.slice(inicio);
})();
exigir(corpo !== null, `O componente sumiu de ${CARTAO}.`);
if (corpo) {
  exigir(!/\breturn null\b/.test(corpo),
    'O cartao de coleta voltou a poder devolver nada. Um retorno vazio faz o Vite remover o botao do pacote publicado, e o dono fica sem nada para clicar enquanto o resto do painel manda ele vir aqui.');
}

// 3. A variavel de compilacao nao pode voltar a decidir se o cartao aparece.
// Ela pode continuar existindo para a amostra de desenvolvimento, e so.
const usos = [...cartao.matchAll(/VITE_APIFY_EXPERIMENTAL_ENABLED/g)];
exigir(usos.length <= 1,
  `A variavel de compilacao aparece ${usos.length} vezes em ${CARTAO}. Mais de uma sugere que ela voltou a decidir alguma coisa alem da amostra local.`);
for (const uso of usos) {
  const trecho = cartao.slice(Math.max(0, uso.index - 220), uso.index + 120);
  exigir(/import\.meta\.env\.DEV/.test(trecho),
    'A variavel de compilacao voltou a ser lida fora do caminho de desenvolvimento. Em producao quem responde se a coleta esta ativada e o servidor, nao o pacote.');
}

// 4. O erro do servidor precisa chegar ao dono. E o servidor que sabe se a
// coleta esta ativada, e a frase dele e a unica explicacao honesta disponivel.
exigir(/detail\?\.error/.test(cartao) && /toast\.error/.test(cartao),
  'O cartao parou de mostrar a explicacao devolvida pelo servidor. Sem ela, uma coleta recusada vira um botao que nao faz nada.');

// 5. Sem link do Google o botao fica desligado, e o motivo precisa aparecer.
exigir(/disabled=\{[^}]*!googleReviewUrl/.test(cartao),
  'O botao deixou de ficar desligado quando falta o link publico do Google, e passaria a falhar em silencio.');
exigir(/!googleReviewUrl\s*&&/.test(cartao) && /linkRequired/.test(cartao),
  'Sumiu o aviso que explica por que o botao esta desligado quando falta o link do Google.');

if (falhas.length) {
  console.error('Botao de coleta: %d protecao(oes) falharam.\n', falhas.length);
  for (const falha of falhas) console.error(' - %s', falha);
  process.exit(1);
}
console.log('Botao de coleta: 6 protecoes verdes.');
