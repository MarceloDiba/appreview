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

// ---------------------------------------------------------------------------
// A TELA QUE LEVA AO FORMULARIO. Ate 05/09/2026 este guarda media
// `comentarioInterno.ts`, `FeedbackForm.tsx` e `Feedback.tsx`, e NAO media
// `ReviewChooser.tsx` — a unica tela por onde um cliente real chega ao
// formulario.
//
// O modulo recusava-se a assumir 3. O chamador entregava-lhe 3 pronto:
// `state: { rating: 'neutral' }`, escrito a mao, sem o cliente tocar em nada.
// Resultado medido na tela pela sessao de QA: tres estrelas acesas, nota 3
// gravada, e um aviso VERMELHO de reclamacao com o elogio do cliente citado
// por baixo.
//
// A regra vivia num sitio e o chamador que importa nao passava por la.
// ---------------------------------------------------------------------------
const escolha = readFileSync(resolve(raiz, 'src/components/review-funnel/ReviewChooser.tsx'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, ' ');

requisitos.push(
  ['a tela do QR nao assume nota nenhuma ao abrir o comentario privado',
    /rating: null/.test(escolha) && !/rating: 'neutral'/.test(escolha)],
  ['a tela do QR nao assume nota por outro nome',
    !/rating: '(negative|positive)'/.test(escolha)],
);

// E O AVISO TEM DE EXISTIR PARA QUEM ESCREVE SEM NOTA. Sem isto, tirar o 3
// trocaria "avisa a mais" por "nao avisa" — um cliente escreveria um problema
// e o dono nunca saberia. Marcelo escolheu avisar, sem cor de reclamacao.
const gatilho = readFileSync(
  resolve(raiz, 'supabase/migrations/20260905100000_comentario_sem_nota_avisa_sem_cor_de_reclamacao.sql'), 'utf8');
requisitos.push(
  // MEDE O ENCAMINHAMENTO, e nao a palavra. A primeira versao desta assercao
  // procurava `feedback-sem-nota` em qualquer sitio do ficheiro, e a palavra
  // aparece em tres — trocar o encaminhamento por `return new` deixava-a verde.
  // Aqui exige-se a sequencia: rating nulo, com texto, leva a esta especie.
  ['o rating nulo com texto encaminha para o aviso sem nota',
    /if new\.rating is null then[\s\S]{0,220}especie := 'feedback-sem-nota';/.test(gatilho)],
  ['o comentario sem nota nao sai com cor de reclamacao',
    !/🔴[^\n]*sem-nota/.test(gatilho) && /💬 \*Comentário privado agora\*/.test(gatilho)],
  ['sem nota e sem texto nao avisa ninguem', /if comentario is null then\s*\n\s*return new;/.test(gatilho)],
);

// A FRASE QUE CONVIDA A DAR NOTA. Avisar sem nota (acima) resolve o silencio,
// mas paga com avisos que nao sabem dizer se sao queixa ou elogio. A frase
// reduz o numero desses casos sem exigir nota nenhuma: o campo continua
// opcional e quem escreve sem nota continua a ser enviado e a avisar.
//
// O QUE FARIA MUDAR DE IDEIA, escrito aqui porque a decisao foi tomada com
// dados fracos. As 12 linhas que existiam quando se decidiu eram de quem
// testava, nao de cliente pagante. Quando houver clientes reais:
//
//   select count(*) filter (where rating is null)     as sem_nota,
//          count(*) filter (where rating is not null) as com_nota
//     from public.internal_feedback
//    where created_at > <data do primeiro cliente pagante>;
//
// Se `sem_nota` passar a dominar, o aviso neutro virou ruido e a decisao de
// avisar sem nota deve ser revista. Se ficar em minoria, esta encerrada.
const catalogos = readFileSync(resolve(raiz, 'src/i18n/index.ts'), 'utf8');
requisitos.push(
  // MEDE O PORTAO, e nao a existencia da frase. Uma dica que ficasse na tela
  // depois de a pessoa dar nota mentiria — a nota ja foi dada.
  ['a dica das estrelas so aparece enquanto nao ha nota',
    /nota === null && \([\s\S]{0,200}t\('formStarsHint'\)/.test(formulario)],
  // OS TRES CATALOGOS, porque uma chave em falta rende a propria chave na tela.
  ['os tres idiomas tem a dica das estrelas',
    (catalogos.match(/formStarsHint:/g) || []).length === 3],
  // E CADA UMA DAS TRES TEM DE DIZER PARA QUE SERVE A NOTA. A primeira versao
  // desta assercao varria o ficheiro inteiro a procura de UMA frase completa —
  // e com tres catalogos no mesmo ficheiro, esvaziar a do portugues do Brasil
  // (o idioma do mercado principal) deixava-a verde por causa da portuguesa.
  // Apanhado por mutacao. Agora mede-se valor a valor.
  ['as tres dicas dizem que a nota faz o dono ver o recado',
    (catalogos.match(/formStarsHint: '([^']*)'/g) || []).length === 3 &&
    [...catalogos.matchAll(/formStarsHint: '([^']*)'/g)]
      .every(([, frase]) => /\b(nota|rating)\b/i.test(frase) && /\b(dono|owner)\b/i.test(frase))],
);

const falhas = requisitos.filter(([, ok]) => !ok).map(([rotulo]) => rotulo);
if (falhas.length) {
  console.error(`Nota honesta com regra quebrada:\n- ${falhas.join('\n- ')}`);
  process.exit(1);
}

console.log(`Nota honesta verificada: ${requisitos.length} regras conferidas.`);
