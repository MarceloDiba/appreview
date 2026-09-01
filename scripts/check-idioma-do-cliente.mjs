#!/usr/bin/env node
// O seletor de resposta abre no idioma em que o CLIENTE escreveu.
//
// Decisão de 01/09/2026, depois de Marcelo ver na conta dele um comentário
// privado em inglês, "Horrible App, i can't even log in.", com o seletor de
// idioma da resposta aberto em Português.
//
// POR QUE ISTO ACONTECIA, e não é o que parece. A detecção existia e era
// chamada; o que falhava era o vocabulário dela. As três listas eram palavras
// de restaurante ("comida", "atendimento", "staff", "camarero"), e aquele
// comentário não tem nenhuma delas. As três pontuações davam zero, e o zero
// caía em português por regra. O painel não estava a ignorar a detecção: a
// detecção é que estava a dizer "português" com a mesma cara com que diria
// depois de reconhecer alguma coisa.
//
// O QUE ESTE GUARDA PROVA, em três camadas, porque nenhuma delas sozinha
// impede o defeito de voltar:
//
//   1. A detecção acerta em textos que não falam de restaurante, e continua a
//      acertar nos que falam. Importa o módulo real e mede o que ele devolve.
//   2. Cada palavra das listas existe numa língua só. Foi uma palavra
//      partilhada que tornaria a lista maior e a detecção pior, e esta é a
//      única asserção que mede a lista inteira em vez de exemplos dela.
//   3. O painel liga a detecção ao estado inicial do seletor, e o dono
//      continua a poder trocar. Uma detecção certa que ninguém lê, ou um
//      seletor que ninguém pode mudar, são defeitos diferentes com o mesmo
//      sintoma para quem usa.
//
// TypeScript directo via `--experimental-strip-types`, mesma convenção de
// `check-reply-locale-br.mjs`: importar o módulo real, nunca reimplementar a
// regra aqui.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const PAINEL_DE_RESPOSTAS = 'src/components/dashboard/ReplySuggestions.tsx';
const modulePath = resolve(process.cwd(), 'src/lib/replySuggestions.ts');
const { detectReplyLocale } = await import(pathToFileURL(modulePath).href);

const painel = readFileSync(resolve(process.cwd(), PAINEL_DE_RESPOSTAS), 'utf8');

const falhas = [];
let verificadas = 0;
const exigir = (condicao, mensagem) => { verificadas += 1; if (!condicao) falhas.push(mensagem); };

// ---------------------------------------------------------------------------
// 1. A detecção acerta, dentro e fora do vocabulário de restaurante.
// ---------------------------------------------------------------------------
//
// O primeiro caso é o comentário exacto da conta do dono, palavra por palavra,
// e é a razão de este ficheiro existir. Os outros cobrem as três línguas em
// assunto de aplicação (onde a lista antiga cegava) e em assunto de mesa (onde
// ela já acertava, e não pode ter regredido).
const CASOS = [
  ["Horrible App, i can't even log in.", 'en', 'o comentário da conta do dono, em inglês e sem uma palavra de restaurante'],
  ['The app crashed twice and I lost my account, useless.', 'en', 'inglês sobre uma aplicação'],
  ['La aplicacion no funciona, no puedo entrar con mi cuenta desde ayer.', 'es', 'espanhol sobre uma aplicação'],
  ['A aplicacao nao abre, nao consigo entrar na minha conta desde ontem.', 'pt', 'português sobre uma aplicação'],
  ['The food was cold and the staff were rude, a very bad experience overall.', 'en', 'inglês de restaurante, que já acertava'],
  ['La comida estaba muy buena pero el camarero fue grosero, muy mal servicio.', 'es', 'espanhol de restaurante, que já acertava'],
  ['Fiquei muito decepcionado com a visita, não recomendo.', 'pt', 'português de restaurante, que já acertava'],
  // Ortografia sozinha, sem nenhuma palavra das listas. É o desempate que
  // existe para texto acentuado curto, e a única prova de que ele funciona.
  ['¿Señor, otra vez? Jamás.', 'es', 'espanhol identificado só pela ortografia'],
  ['Refeição fraquíssima, reclamação ignorada.', 'pt', 'português identificado só pela ortografia'],
];

for (const [texto, esperado, descricao] of CASOS) {
  const obtido = detectReplyLocale(texto);
  exigir(obtido === esperado,
    `A detecção errou ${descricao}: esperava "${esperado}" e devolveu "${obtido}" para ${JSON.stringify(texto)}.`);
}

// O chão histórico não se mexeu: texto curto demais não é evidência de língua
// nenhuma e continua a cair em português, a língua do piloto e do dono. Sem
// esta linha, alguém poderia "resolver" o problema baixando o mínimo até um
// "Top!" ser classificado por uma letra.
exigir(detectReplyLocale('Top!') === 'pt',
  'Um texto curto demais deixou de cair em português. Doze caracteres é o chão: abaixo dele não há evidência de língua nenhuma, e adivinhar é pior do que assumir a língua do dono.');
exigir(detectReplyLocale(null) === 'pt' && detectReplyLocale('') === 'pt',
  'Texto ausente ou vazio deixou de cair em português.');

// ---------------------------------------------------------------------------
// 2. Nenhuma palavra pontua duas línguas ao mesmo tempo.
// ---------------------------------------------------------------------------
//
// Esta é a regra de entrada da lista, e a única que mede a lista INTEIRA. Ela
// existe porque a correcção de 01/09/2026 foi feita alargando as listas, e o
// alargamento é exactamente o momento em que "so" (o "só" sem acento), "me",
// "no", "porque", "desde" ou "horrible" entram sem ninguém reparar. Uma
// palavra partilhada pontua os dois lados: não desempata nada e ainda afoga o
// sinal das que desempatam.
//
// A lista é lida do ficheiro em vez de exportada de propósito: exportá-la só
// para o guarda seria alargar a superfície pública do módulo por causa de um
// teste.
const fonte = readFileSync(modulePath, 'utf8');
const bloco = fonte.match(/const LOCALE_MARKERS: Record<ReplyLocale, string\[\]> = \{([\s\S]*?)\n\};/);
exigir(bloco !== null, 'LOCALE_MARKERS sumiu de src/lib/replySuggestions.ts, ou mudou de forma.');
if (bloco) {
  const listas = {};
  for (const [, lingua, corpo] of bloco[1].matchAll(/(pt|es|en): \[([\s\S]*?)\n {2}\],/g)) {
    listas[lingua] = [...corpo.matchAll(/'([a-z]+)'/g)].map(([, palavra]) => palavra);
  }
  exigir(Object.keys(listas).length === 3, `Esperava três listas em LOCALE_MARKERS, encontrei ${Object.keys(listas).length}.`);

  const partilhadas = [];
  const linguas = Object.keys(listas);
  for (let i = 0; i < linguas.length; i += 1) {
    for (let j = i + 1; j < linguas.length; j += 1) {
      for (const palavra of listas[linguas[i]]) {
        if (listas[linguas[j]].includes(palavra)) partilhadas.push(`"${palavra}" (${linguas[i]} e ${linguas[j]})`);
      }
    }
  }
  exigir(partilhadas.length === 0,
    `Entraram palavras que existem em mais de uma das três listas: ${partilhadas.join(', ')}. Uma palavra partilhada pontua os dois lados, não desempata nada e afoga o sinal das que desempatam.`);

  // E as listas continuam a ser grandes o suficiente para reconhecer prosa
  // comum. Sem isto, alguém "resolvia" a asserção acima esvaziando as listas:
  // três listas vazias não têm palavra partilhada nenhuma e devolvem português
  // para tudo, que é precisamente o defeito de 01/09/2026 de volta.
  for (const lingua of linguas) {
    exigir(listas[lingua].length >= 40,
      `A lista de "${lingua}" encolheu para ${listas[lingua].length} palavras. Abaixo de umas dezenas de palavras de classe fechada, um comentário que não fale de restaurante volta a não pontuar em lado nenhum e a cair em português por omissão.`);
  }
}

// ---------------------------------------------------------------------------
// 3. O painel abre no que a detecção diz, e o dono pode trocar.
// ---------------------------------------------------------------------------
//
// A detecção certa não chega: até 01/09/2026 ela estava ligada e errada, e
// nada impede o contrário, ela ficar certa e ser desligada. As duas metades
// desta secção são as duas metades da promessa feita ao dono: abre no idioma
// do cliente, e ele manda por cima.
exigir(/useState<ReplyLocale>\(\(\) => detectReplyLocale\(text\)\)/.test(painel),
  `${PAINEL_DE_RESPOSTAS} deixou de abrir o seletor no idioma detectado no texto do cliente. Um valor fixo devolve o defeito de 01/09/2026 inteiro: o comentário em inglês volta a abrir em português.`);
exigir(/onClick=\{\(\) => setLocale\(code\)\}/.test(painel),
  `${PAINEL_DE_RESPOSTAS} deixou de deixar o dono trocar o idioma. A detecção escolhe o primeiro idioma, nunca o último: quem conhece o cliente é ele.`);
exigir(/aria-pressed=\{locale === code\}/.test(painel),
  `${PAINEL_DE_RESPOSTAS} deixou de dizer qual idioma está escolhido. Sem isso o dono não vê em que língua a resposta vai sair, e um leitor de ecrã não vê nada.`);

if (falhas.length) {
  console.error('Idioma do cliente: %d proteção(ões) falharam.\n', falhas.length);
  for (const falha of falhas) console.error(' - %s', falha);
  process.exit(1);
}
console.log('Idioma do cliente: %d proteções verdes.', verificadas);
