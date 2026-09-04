#!/usr/bin/env node
// O que um dono deixou no navegador nao pode aparecer ao dono seguinte.
//
// POR QUE ESTE GUARDA EXISTE
//
// Em 04/09/2026 o Marcelo entrou numa conta NOVA, sem nenhuma ligacao ao
// Google, e o painel mostrou-lhe as avaliacoes da Noa: nomes de clientes,
// textos, notas, e um rascunho assinado "Noa Agencia Digital". A conta nova
// tinha ZERO linhas no banco. Os dados vinham do proprio aparelho: as quatro
// chaves do `localStorage` eram literais fixas, sem o dono dentro.
//
// Este guarda CORRE o modulo — nao le o texto dele. Uma assercao sobre o texto
// ficaria verde com a funcao a nao apagar coisa nenhuma.
import { readFileSync, globSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

// Um `localStorage` de mentira, que e o unico ambiente de navegador que este
// modulo precisa. Sem isto o import falha e o guarda nao mede nada.
const guardado = new Map();
globalThis.window = {
  localStorage: {
    getItem: (k) => (guardado.has(k) ? guardado.get(k) : null),
    setItem: (k, v) => guardado.set(k, String(v)),
    removeItem: (k) => guardado.delete(k),
  },
};

const { oAparelhoAgoraEDe, CHAVES_DE_UMA_CONTA } =
  await import(pathToFileURL(new URL('../src/lib/oQueFicaNoAparelho.ts', import.meta.url).pathname).href);

const falhas = [];
let verificadas = 0;
const exigir = (rotulo, condicao) => { verificadas += 1; if (!condicao) falhas.push(rotulo); };

const NOA = '11111111-1111-1111-1111-111111111111';
const OUTRO = '22222222-2222-2222-2222-222222222222';
// Enche as chaves de conta SEM tocar na marca de quem e o aparelho: apagar
// tambem essa marca faria toda a chamada seguinte parecer uma troca de dono, e
// a assercao 4 media outra coisa que nao o que diz medir.
const encher = () => {
  for (const c of CHAVES_DE_UMA_CONTA) guardado.set(c, '{"avaliacoes":"da Noa"}');
};
const aparelhoNovoEmFolha = () => guardado.clear();
const oQueSobrou = () => CHAVES_DE_UMA_CONTA.filter((c) => guardado.has(c));

aparelhoNovoEmFolha();
// 1. O DEFEITO EXACTO DE 04/09. A Noa usa o painel; outra conta entra a
//    seguir; nada da Noa pode continuar la.
encher();
oAparelhoAgoraEDe(NOA);
oAparelhoAgoraEDe(OUTRO);
exigir(`o dono seguinte ainda ve o que era do anterior: ${oQueSobrou().join(', ')}`,
  oQueSobrou().length === 0);

aparelhoNovoEmFolha();
// 2. SAIR TAMBEM APAGA. Terminar a sessao nao pode deixar os dados do negocio
//    a espera do proximo que abrir o navegador.
encher();
oAparelhoAgoraEDe(NOA);
oAparelhoAgoraEDe(null);
exigir(`sair da sessao deixou dados para tras: ${oQueSobrou().join(', ')}`,
  oQueSobrou().length === 0);

aparelhoNovoEmFolha();
// 3. UM APARELHO SEM DONO ESCRITO CONTA COMO DONO DIFERENTE. E este o caso de
//    TODOS os navegadores no primeiro carregamento depois desta correccao: e o
//    que limpa os dados que ja estao la hoje, sem ninguem ter de fazer nada.
encher();
oAparelhoAgoraEDe(NOA);
exigir(`um aparelho sem dono escrito manteve o que ja la estava: ${oQueSobrou().join(', ')}`,
  oQueSobrou().length === 0);

// 4. E O MESMO DONO NAO PERDE O QUE E DELE. Sem esta assercao, uma funcao que
//    apagasse SEMPRE passaria nas tres de cima e tornaria o cache inutil — o
//    dono refazia a busca a cada carregamento de pagina.
oAparelhoAgoraEDe(NOA);
encher();
oAparelhoAgoraEDe(NOA);
exigir(`o mesmo dono perdeu o proprio cache: sobraram ${oQueSobrou().length} de ${CHAVES_DE_UMA_CONTA.length}`,
  oQueSobrou().length === CHAVES_DE_UMA_CONTA.length);

// 5. AS QUATRO CHAVES QUE VAZARAM TEM DE ESTAR NA LISTA. Uma lista que
//    esquecesse uma delas passaria em tudo acima e deixaria essa a vazar.
for (const chave of [
  'binno.experimental-apify-snapshot',
  'binno.approved-cockpit-actions.v2',
  'binno.local-whatsapp-preferences',
  'binno.local-whatsapp-advisor-deliveries',
]) {
  exigir(`'${chave}' saiu da lista do que se apaga ao mudar de dono`,
    CHAVES_DE_UMA_CONTA.includes(chave));
}

// 6. E NENHUMA CHAVE NOVA DE CONTA PODE NASCER FORA DA LISTA. Esta e a que
//    apanha o defeito da PROXIMA vez: quem acrescentar um `localStorage` novo
//    com dados de um negocio tem de o declarar aqui.
const CONHECIDAS_E_DO_APARELHO = new Set([
  'binno.dono-deste-aparelho',
  // Preferencias de quem usa o computador, e nao dados de um negocio.
  'binno.owner-language',
  'binno.owner-locale',
  'vite-ui-theme',
]);
const fonte = readFileSync('src/lib/oQueFicaNoAparelho.ts', 'utf8');
// A VARREDURA E DAQUI, e nao de uma lista passada por fora: um guarda que
// depende de quem o chama para saber onde procurar deixa de procurar no dia em
// que alguem o corre a mao.
const ficheiros = globSync('src/**/*.{ts,tsx}');
if (ficheiros.length < 50) {
  console.error('A varredura achou so %d ficheiros; nao esta a varrer o que diz varrer.', ficheiros.length);
  process.exit(1);
}
const usadas = new Set();
for (const ficheiro of ficheiros) {
  const texto = readFileSync(ficheiro, 'utf8');
  if (!texto.includes('localStorage')) continue;
  for (const achado of texto.matchAll(/'(binno\.[A-Za-z0-9._-]+)'/g)) usadas.add(achado[1]);
}
exigir('a varredura nao achou nenhuma chave binno.* em uso; deixou de medir o que diz medir',
  usadas.size > 0);
const foraDaLista = [...usadas].filter(
  (c) => !CHAVES_DE_UMA_CONTA.includes(c) && !CONHECIDAS_E_DO_APARELHO.has(c) && !fonte.includes(c));
exigir(`ha chave(s) 'binno.*' no navegador que ninguem apaga ao mudar de dono: ${foraDaLista.join(', ')}`,
  foraDaLista.length === 0);

// 7. E ALGUEM TEM DE CHAMAR ISTO. Todas as asserções acima ficam verdes com um
// modulo perfeito que nenhuma tela invoca — foi assim que o defeito viveu ate
// hoje. A limpeza corre no `settle` do `AuthContext`, ANTES de qualquer ecra
// montar, porque montar primeiro e limpar depois ja teria mostrado os dados.
const AUTENTICACAO = readFileSync('src/context/AuthContext.tsx', 'utf8');
exigir('o AuthContext deixou de apagar o que era do dono anterior',
  /oAparelhoAgoraEDe\(currentSession\?\.user\?\.id \?\? null\)/.test(AUTENTICACAO));
exigir('a limpeza deixou de correr ANTES de o utilizador ser posto no ecra',
  AUTENTICACAO.indexOf('oAparelhoAgoraEDe(') < AUTENTICACAO.indexOf('setUser(currentSession?.user ?? null)'));

if (falhas.length) {
  console.error('O aparelho guarda o dono anterior: %d protecao(oes) falharam.\n', falhas.length);
  for (const f of falhas) console.error(' - %s', f);
  process.exit(1);
}
console.log(`O aparelho nao guarda o dono anterior: ${verificadas} protecoes verdes.`);
