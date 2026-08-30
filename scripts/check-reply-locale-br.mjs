import { resolve } from 'node:path';
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

// --- 4. País ausente, vazio ou desconhecido: cai no português de hoje. ---
const noCountry = build({ text: genericText })[0];
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

  // 4. País ausente, vazio ou desconhecido cai no português de hoje.
  ['Sem país informado: cai no texto de Portugal de hoje', noCountry?.body === ptGenericExpectedBody],
  ['País vazio: cai no texto de Portugal de hoje', emptyCountry?.body === ptGenericExpectedBody],
  ['País desconhecido (nem BR nem PT): cai no texto de Portugal de hoje', unknownCountry?.body === ptGenericExpectedBody],
];

const failed = requirements.filter(([, ok]) => !ok).map(([label]) => label);
if (failed.length) {
  console.error(`Variante pt-BR das respostas sugeridas quebrada:\n- ${failed.join('\n- ')}`);
  process.exit(1);
}

console.log(`Variante pt-BR das respostas sugeridas verificada: ${requirements.length} regras conferidas.`);
