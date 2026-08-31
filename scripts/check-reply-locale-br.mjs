import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

// `src/lib/replySuggestions.ts` respondia sempre em português de Portugal
// quando o cliente escrevia em português, mesmo para negócios brasileiros
// ("a limpeza das casas de banho" publicado por um dono em Aracaju, para
// leitores brasileiros). A decisão do dono, registrada no handoff, é que a
// variante do português segue o país do NEGÓCIO (`profiles.business_country`,
// o mesmo campo de `src/lib/businessLocale.ts`), não o idioma detectado no
// texto do cliente: quem publica é o dono, na própria página.
//
// Este guarda prova quatro coisas, na ordem em que quebrariam se alguém
// desfizer a decisão por engano:
// 1. Um negócio português continua a receber exatamente o texto de hoje,
//    contra valores capturados aqui como literais, não contra o próprio
//    módulo: comparar `buildReplySuggestions` com `THEMES`/`GENERIC`
//    importados do mesmo arquivo provaria apenas que o arquivo concorda
//    consigo mesmo, mesmo que ambos tivessem sido alterados juntos.
// 2. Um negócio brasileiro recebe a variante brasileira nos temas, no
//    genérico e nas frases compostas (as que uma tradução literal quebra:
//    "Estou a rever a escala", "casa de banho", "a nossa carta").
// 3. Espanhol e inglês não mudam com o país do negócio.
// 4. País ausente, vazio ou desconhecido (nem 'BR' nem 'PT') cai no
//    português de hoje: um país não identificado nunca vira um
//    brasileirismo indevido, e vice-versa.
//
// TypeScript directo via `--experimental-strip-types` (Node 22.6+), mesma
// convenção de `check-shared-case-ordering.mjs` e `check-whatsapp-field.mjs`:
// importar o módulo real, não reimplementar a lógica aqui.

const modulePath = resolve(process.cwd(), 'src/lib/replySuggestions.ts');
const { buildReplySuggestions } = await import(pathToFileURL(modulePath).href);

// --- 0. Esquecer o país tem de ser erro de compilação. ---
//
// Até 30/08/2026 `businessCountry` era opcional em `ReplySuggestionInput`, e
// quatro das sete chamadas do projeto não o passavam. Esquecer não tinha
// sintoma nenhum em código: a função devolvia português de Portugal e seguia.
// O sintoma aparecia no fim, na tela de um dono brasileiro.
//
// As asserções de comportamento deste arquivo NÃO conseguem provar isso: elas
// importam o módulo com `--experimental-strip-types`, que apaga os tipos, e
// por isso uma chamada sem o campo continua a executar e a devolver português
// de Portugal, exatamente como antes. A única prova possível é compilar.
//
// Duas amostras minúsculas, uma sem o campo e uma com ele, compiladas pelo
// mesmo `tsc` do `npm run verify`. A primeira TEM de falhar nomeando
// `businessCountry`; a segunda TEM de passar. A segunda existe para a
// primeira significar alguma coisa: sem ela, um erro de sintaxe qualquer na
// amostra deixaria este guarda verde afirmando o que não verificou.
const compilarAmostra = (nome, corpo) => {
  const pasta = mkdtempSync(join(tmpdir(), 'binno-guarda-pais-'));
  const arquivo = join(pasta, `${nome}.ts`);
  const moduloRelativo = JSON.stringify(modulePath.replace(/\.ts$/, ''));
  writeFileSync(arquivo, corpo.replace('@MODULO@', moduloRelativo));
  const saida = spawnSync(
    process.execPath,
    [resolve(process.cwd(), 'node_modules/typescript/bin/tsc'),
      '--noEmit', '--skipLibCheck', '--target', 'ES2020',
      '--module', 'ESNext', '--moduleResolution', 'bundler', arquivo],
    { encoding: 'utf8' },
  );
  rmSync(pasta, { recursive: true, force: true });
  return { ok: saida.status === 0, texto: `${saida.stdout || ''}${saida.stderr || ''}` };
};

const semPais = compilarAmostra('sem-pais', `
import { buildReplySuggestions } from @MODULO@;
buildReplySuggestions({ rating: 1, text: 'x', channel: 'public' });
`);

const comPais = compilarAmostra('com-pais', `
import { buildReplySuggestions } from @MODULO@;
buildReplySuggestions({ rating: 1, text: 'x', channel: 'public', businessCountry: 'BR' });
buildReplySuggestions({ rating: 1, text: 'x', channel: 'public', businessCountry: null });
`);

// Texto sem nenhuma palavra-chave de tema, para cair no fallback GENERIC.
const genericText = 'Fiquei muito decepcionado com a visita, não recomendo.';
const limpezaText = 'O banheiro estava muito sujo, péssima experiência.';
const esperaText = 'Demorou muito, esperei quase uma hora pela comida.';
const precoText = 'Achei o preço muito caro pelo que recebi.';
const spanishText = 'La comida estaba muy buena pero el camarero fue grosero, muy mal servicio.';
const englishText = 'The food was cold and the staff were rude, a very bad experience overall.';

const build = (overrides) =>
  buildReplySuggestions({
    rating: 1,
    channel: 'public',
    customerName: 'Maria Silva',
    businessName: 'Padaria Central',
    ...overrides,
  });

// --- 1. Negócio português: byte-idêntico ao texto de hoje (valores
// capturados como literais antes desta mudança, não derivados do módulo). ---
const ptGeneric = build({ text: genericText, businessCountry: 'PT' })[0];
const ptGenericExpectedBody =
  'Olá, Maria,\n\nObrigado por escrever, e lamento que a sua experiência não tenha correspondido ao que esperava. Não é assim que queremos receber quem nos visita.\n\nGostava de perceber melhor o que aconteceu. Se puder falar connosco directamente, resolvemos isto consigo.\n\nPadaria Central';

const ptLimpeza = build({ text: limpezaText, businessCountry: 'PT' })[1];
const ptEspera = build({ text: esperaText, businessCountry: 'PT' })[1];

// --- 2. Negócio brasileiro: variante brasileira. ---
const brGeneric = build({ text: genericText, businessCountry: 'BR' })[0];
const brLimpeza = build({ text: limpezaText, businessCountry: 'BR' })[1];
const brEspera = build({ text: esperaText, businessCountry: 'BR' })[1];
const brPreco = build({ text: precoText, businessCountry: 'BR' })[1];

// --- 3. Espanhol e inglês, com negócio brasileiro e português: inalterados. ---
const esWithBr = build({ text: spanishText, businessCountry: 'BR' })[0];
const esWithPt = build({ text: spanishText, businessCountry: 'PT' })[0];
const enWithBr = build({ text: englishText, businessCountry: 'BR' })[0];
const enWithPt = build({ text: englishText, businessCountry: 'PT' })[0];

// --- 4. País nulo, vazio ou desconhecido: cai no português de hoje. ---
//
// "País ausente" saiu daqui em 30/08/2026 porque deixou de ser uma chamada
// possível: omitir o campo é erro de compilação, provado no bloco 0. O que
// resta é quem não sabe o país e escreve `null` de propósito, e esse caso
// continua a cair no português de Portugal, como sempre caiu.
const nullCountry = build({ text: genericText, businessCountry: null })[0];
const emptyCountry = build({ text: genericText, businessCountry: '' })[0];
const unknownCountry = build({ text: genericText, businessCountry: 'FR' })[0];

const requirements = [
  // 1. Português: byte-idêntico ao texto capturado.
  ['PT: título da variante curta é "Curta e directa" (inalterado)', ptGeneric?.title === 'Curta e directa'],
  ['PT: corpo genérico é byte-idêntico ao texto capturado antes desta mudança', ptGeneric?.body === ptGenericExpectedBody],
  ['PT: tema limpeza continua a mencionar "casas de banho" (texto de hoje)', ptLimpeza?.body.includes('a verificação das casas de banho durante o serviço')],
  ['PT: tema espera continua "Estou a rever a escala" (texto de hoje)', ptEspera?.body.includes('Estou a rever a escala e os tempos de saída da cozinha')],

  // 2. Brasil: variante brasileira nos temas, no genérico e nas frases compostas.
  ['BR: corpo genérico troca "connosco directamente" pela construção brasileira', brGeneric?.body.includes('Se puder falar direto com a gente, resolvemos isso com você') && !brGeneric?.body.includes('connosco')],
  ['BR: corpo genérico nunca repete o texto de Portugal', brGeneric?.body !== ptGenericExpectedBody],
  ['BR: tema limpeza diz "banheiros", nunca "casa de banho"', brLimpeza?.body.includes('a conferência dos banheiros durante o expediente') && !brLimpeza?.body.includes('casa de banho') && !brLimpeza?.body.includes('casas de banho')],
  ['BR: tema espera é "Estou revendo a escala", nunca "Estou a rever"', brEspera?.body.includes('Estou revendo a escala e o tempo de saída da cozinha') && !brEspera?.body.includes('Estou a rever')],
  ['BR: tema preço fala em "cardápio", nunca na "carta" (falso cognato)', brPreco?.body.includes('Vou revisar nosso cardápio') && !brPreco?.body.includes('a nossa carta')],

  // 3. Espanhol e inglês não mudam com o país do negócio.
  ['ES: mesmo corpo com negócio brasileiro ou português', esWithBr?.body === esWithPt?.body],
  ['ES: título continua em espanhol, intocado', esWithBr?.title === 'Corta y directa'],
  ['EN: mesmo corpo com negócio brasileiro ou português', enWithBr?.body === enWithPt?.body],
  ['EN: título continua em inglês, intocado', enWithBr?.title === 'Short and direct'],

  // 0. Esquecer o país é erro de compilação, e escrevê-lo compila.
  ['omitir businessCountry na chamada é erro de compilação, e o erro nomeia o campo',
    !semPais.ok && semPais.texto.includes('businessCountry')],
  ['a amostra que passa o país compila limpa (senão a asserção acima não provaria nada)',
    comPais.ok],

  // 4. País nulo, vazio ou desconhecido cai no português de hoje.
  ['País nulo escrito de propósito: cai no texto de Portugal de hoje', nullCountry?.body === ptGenericExpectedBody],
  ['País vazio: cai no texto de Portugal de hoje', emptyCountry?.body === ptGenericExpectedBody],
  ['País desconhecido (nem BR nem PT): cai no texto de Portugal de hoje', unknownCountry?.body === ptGenericExpectedBody],
];

const failed = requirements.filter(([, ok]) => !ok).map(([label]) => label);
if (failed.length) {
  console.error(`Variante pt-BR das respostas sugeridas quebrada:\n- ${failed.join('\n- ')}`);
  process.exit(1);
}

console.log(`Variante pt-BR das respostas sugeridas verificada: ${requirements.length} regras conferidas.`);
