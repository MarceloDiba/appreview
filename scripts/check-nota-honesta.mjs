import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// A nota que ninguem deu nao pode virar nota 3.
//
// O QUE ESTE GUARDA PROTEGE
//
// `Feedback.tsx` assumia `'neutral'` quando a pessoa chegava ao formulario sem
// ter escolhido nada (link direto, refresh, voltar do navegador). `'neutral'`
// virava nota 3 no formulario, 3 e nota baixa, e nota baixa dispara o aviso de
// reclamacao no WhatsApp do dono. O dono era avisado de um cliente insatisfeito
// que nunca disse nada, e o banco guardava como opiniao do cliente uma nota que
// ele nao deu.
//
// COMO ESTE GUARDA VERIFICA
//
// A decisao que importa (o que vai para a coluna `rating`) mora em
// `src/lib/comentarioInterno.ts`, num modulo puro, justamente para poder ser
// verificada de verdade. O guarda importa esse modulo e confere o payload que
// chega ao Supabase, incluindo o caso em que nao houve nota. O Node roda
// TypeScript direto com `--experimental-strip-types`, no mesmo padrao do
// `check-whatsapp-field.mjs`.
//
// As duas ultimas secoes leem o texto de `Feedback.tsx` e `FeedbackForm.tsx`.
// Sao necessarias porque o modulo puro pode estar correto e mesmo assim nao ser
// usado: sem elas o guarda ficaria verde com a tela voltando a inventar a nota.
// Este repositorio nao tem renderizador de React, entao esta e a fronteira do
// que da para verificar sem abrir navegador.

const raiz = process.cwd();
const modulePath = resolve(raiz, 'src/lib/comentarioInterno.ts');
const { normalizarRating, notaDoRating, comentarioParaGravar } = await import(
  pathToFileURL(modulePath).href
);

const paginaFeedback = readFileSync(resolve(raiz, 'src/pages/Feedback.tsx'), 'utf8');
const formulario = readFileSync(resolve(raiz, 'src/components/forms/FeedbackForm.tsx'), 'utf8');

const USUARIO = '3f1a9c2e-6b4d-4a8f-9c1e-2d7b5a0f8e34';

// Quem chegou sem escolher nada.
const semNota = comentarioParaGravar({
  userId: USUARIO,
  nota: notaDoRating(normalizarRating(undefined)),
  comentario: 'A sobremesa demorou, mas o resto foi otimo.',
  nome: '',
  contato: '',
});

// Quem escolheu "Ruim" na tela anterior.
const comNotaBaixa = comentarioParaGravar({
  userId: USUARIO,
  nota: notaDoRating(normalizarRating('negative')),
  comentario: 'Fila enorme.',
  nome: 'Ana',
  contato: '+5511961234567',
});

// Quem escolheu "Bom" na tela anterior.
const comNotaAlta = comentarioParaGravar({
  userId: USUARIO,
  nota: notaDoRating(normalizarRating('positive')),
  comentario: 'Atendimento impecavel.',
  nome: '',
  contato: '',
});

// Quem clicou nas estrelas dentro do proprio formulario.
const escolhidaNoFormulario = comentarioParaGravar({
  userId: USUARIO,
  nota: 4,
  comentario: 'Muito bom.',
  nome: '',
  contato: '',
});

const requisitos = [
  // A regra central: sem escolha, nao ha nota.
  ['sem nota escolhida, o rating gravado e null', semNota.rating === null],
  ['sem nota escolhida, o rating nao e 3', semNota.rating !== 3],
  ['sem nota escolhida, o rating nao e 0 nem NaN', !Number.isNaN(semNota.rating) && semNota.rating !== 0],
  ['a coluna rating vai explicitamente no payload, nao fica de fora', 'rating' in semNota],
  ['sem nota escolhida, o comentario continua sendo gravado', semNota.feedback_text === 'A sobremesa demorou, mas o resto foi otimo.'],

  // O caminho de quem escolheu nao pode regredir.
  ['"negative" continua gravando nota 1', comNotaBaixa.rating === 1],
  ['"neutral" continua gravando nota 3', notaDoRating(normalizarRating('neutral')) === 3],
  ['"positive" continua gravando nota 5', comNotaAlta.rating === 5],
  ['a nota clicada nas estrelas do formulario e respeitada', escolhidaNoFormulario.rating === 4],

  // Um valor estranho vindo do histórico do navegador nao vira nota.
  ['rating desconhecido no state nao vira nota', notaDoRating(normalizarRating('otimo')) === null],
  ['rating nulo no state nao vira nota', notaDoRating(normalizarRating(null)) === null],
  ['rating numerico no state nao vira nota', notaDoRating(normalizarRating(3)) === null],
  ['normalizarRating devolve o proprio valor quando ele e valido', normalizarRating('neutral') === 'neutral'],
  // Sem estas duas, `normalizarRating` podia passar a devolver qualquer texto
  // que `notaDoRating` ainda assim daria null, e o guarda nao veria nada. A
  // escolha invalida tem de morrer na fronteira, nao mais adiante por sorte.
  ['normalizarRating recusa um texto que nao e escolha', normalizarRating('otimo') === null],
  ['normalizarRating recusa um numero', normalizarRating(3) === null],

  // O resto do payload nao pode ter mudado de forma.
  ['nome vazio vira null, nao string vazia', semNota.customer_name === null],
  ['contato vazio vira null, nao string vazia', semNota.customer_email === null],
  ['nome preenchido e preservado', comNotaBaixa.customer_name === 'Ana'],
  ['contato preenchido e preservado', comNotaBaixa.customer_email === '+5511961234567'],
  ['o user_id vai no payload', comNotaBaixa.user_id === USUARIO],

  // O modulo tem de estar de fato ligado nas telas, senao ele so existe.
  ['Feedback.tsx nao inventa mais o rating "neutral"', !/['"]neutral['"]/.test(paginaFeedback)],
  ['Feedback.tsx passa o rating pelo normalizador do modulo', /normalizarRating\s*\(/.test(paginaFeedback)],
  ['FeedbackForm.tsx monta o insert com comentarioParaGravar', /comentarioParaGravar\s*\(/.test(formulario)],
  ['FeedbackForm.tsx nao semeia mais a nota com um literal 1, 3 ou 5', !/notaInterna/.test(formulario)],
  ['FeedbackForm.tsx nao converte a nota com parseInt (parseInt de vazio e NaN)', !/parseInt\s*\(/.test(formulario)],
];

const falhas = requisitos.filter(([, ok]) => !ok).map(([rotulo]) => rotulo);
if (falhas.length) {
  console.error(`Nota honesta com regra quebrada:\n- ${falhas.join('\n- ')}`);
  process.exit(1);
}

console.log(`Nota honesta verificada: ${requisitos.length} regras conferidas.`);
