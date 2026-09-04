#!/usr/bin/env node
// Quem deu só estrelas não disse nada, e a resposta não pode fingir que disse.
//
// POR QUE ESTE GUARDA EXISTE
//
// Em 03/09/2026 o painel sugeriu isto para uma avaliacao de 4 estrelas SEM
// comentario nenhum, de LailsonSantos:
//
//     "Muito obrigado pelas suas palavras. Fico feliz em saber que tenha
//      gostado da visita."
//
// Duas invencoes numa frase: nao houve palavras, e ninguem falou em visita.
// Publicado na pagina do negocio, e o dono a agradecer em publico por algo que
// nao aconteceu — e quem escreveu a avaliacao e a primeira pessoa a notar.
//
// ELE CORRE O GERADOR, e nao le o ficheiro. A pergunta e o que sai para um
// comentario vazio, e isso so se sabe pedindo. Uma expressao regular sobre os
// textos provaria que certas frases existem no ficheiro — e elas EXISTEM, e
// devem existir, para quem escreveu de verdade.
const { buildReplySuggestions } = await import('../src/lib/replySuggestions.ts');

const falhas = [];
let verificadas = 0;
const exigir = (rotulo, condicao) => { verificadas += 1; if (!condicao) falhas.push(rotulo); };

// As palavras que so se podem dizer a quem escreveu alguma coisa. Cada uma
// destas, numa resposta a quem deu so estrelas, e uma afirmacao falsa.
const INVENCOES = {
  pt: [/suas palavras/i, /pelo que escreveu/i, /gostado da visita/i, /o que (?:nos )?contou/i],
  es: [/tus palabras/i, /lo que escribiste/i],
  en: [/the kind words/i, /what you wrote/i, /enjoyed your visit/i],
};

// A VISITA INVENTADA, e agora tambem para quem ESCREVEU.
//
// O elogio generico dizia "tenha gostado da visita" para qualquer negocio. Em
// 04/09/2026 Marcelo recebeu isso no WhatsApp para a Mesquita, que escreveu
// sobre os profissionais da agencia e nao falou em visita nenhuma — e a Noá e
// uma agencia digital, onde muitos clientes nunca la puseram os pes.
//
// O generico entra quando NENHUM tema foi reconhecido, ou seja precisamente
// quando se sabe menos. E o pior sitio para arriscar um detalhe.
const VISITA_INVENTADA = [/da visita/i, /la visita/i, /your visit/i];

const semTexto = (rating, businessCountry = 'BR') => buildReplySuggestions({
  rating, text: null, customerName: 'LailsonSantos jose',
  businessName: 'Noá Digital', channel: 'public', businessCountry,
});

// 1. NENHUMA VARIANTE INVENTA, em nenhuma nota. Percorre TODAS as variantes
//    devolvidas, e nao so a primeira: o dono escolhe entre elas.
for (const nota of [1, 2, 3, 4, 5]) {
  const variantes = semTexto(nota);
  exigir(`nota ${nota} sem texto devolveu zero sugestoes; o dono ficaria sem nada`,
    variantes.length > 0);
  for (const v of variantes) {
    for (const [idioma, padroes] of Object.entries(INVENCOES)) {
      for (const padrao of padroes) {
        exigir(`nota ${nota}, variante "${v.title}": inventa (${idioma}) ${padrao} — o cliente nao escreveu nada`,
          !padrao.test(v.body));
      }
    }
  }
}

// 2. E CONTINUA A DIZER ALGUMA COISA. Um guarda que so proibe passaria com o
//    texto vazio, que e pior do que o defeito.
for (const nota of [1, 3, 5]) {
  const corpo = semTexto(nota)[0].body;
  exigir(`nota ${nota} sem texto devolveu um corpo curto demais para ser uma resposta`,
    corpo.trim().length > 60);
  exigir(`nota ${nota} sem texto nao menciona a avaliacao, que e a unica coisa que de facto aconteceu`,
    /avalia/i.test(corpo));
  exigir(`nota ${nota} sem texto perdeu a assinatura do negocio`,
    corpo.includes('Noá Digital'));
}

// 2b. E QUEM ESCREVEU SEM FALAR DE VISITA NAO OUVE FALAR DE VISITA.
//     O texto da Mesquita, que causou o defeito, corrido de verdade.
for (const nota of [4, 5]) {
  const variantes = buildReplySuggestions({
    rating: nota,
    text: 'Agência Top de serviços de Sergipe, profissionais muito capacitados.',
    customerName: 'Mesquita', businessName: 'Noá Digital',
    channel: 'public', businessCountry: 'BR',
  });
  for (const v of variantes) {
    for (const padrao of VISITA_INVENTADA) {
      exigir(`nota ${nota}, variante "${v.title}": inventa uma visita (${padrao}) que o cliente nao mencionou`,
        !padrao.test(v.body));
    }
  }
}
// E o generico tambem nao a inventa nos outros idiomas.
for (const [pais, idioma] of [['BR', 'pt-BR'], [null, 'pt']]) {
  const corpo = buildReplySuggestions({
    rating: 5, text: 'Profissionais muito capacitados, recomendo.',
    customerName: 'Ana', businessName: 'Casa', channel: 'public', businessCountry: pais,
  })[0].body;
  exigir(`o elogio generico em ${idioma} ainda inventa uma visita`,
    !VISITA_INVENTADA.some((p) => p.test(corpo)));
}

// 3. QUEM ESCREVEU CONTINUA A SER TRATADO COMO ANTES. Se o conjunto novo
//    passasse a servir toda a gente, o produto perdia a resposta especifica —
//    que e a razao de ele existir.
const comTexto = buildReplySuggestions({
  rating: 5, text: 'Atendimento excelente, voltarei sempre.',
  customerName: 'Daniel', businessName: 'Noá Digital',
  channel: 'public', businessCountry: 'BR',
});
exigir('quem escreveu deixou de receber a resposta que cita o que ele disse',
  comTexto.some((v) => /suas palavras/i.test(v.body)));

// 4. UM TEXTO SO DE ESPACOS E "SEM TEXTO". Foi por aqui que um `if (text)`
//    ingenuo deixaria passar.
const soEspacos = buildReplySuggestions({
  rating: 5, text: '   \n  ', customerName: 'Daniel',
  businessName: 'Noá Digital', channel: 'public', businessCountry: 'BR',
});
exigir('um comentario so com espacos foi tratado como se tivesse palavras',
  !soEspacos.some((v) => /suas palavras/i.test(v.body)));

if (falhas.length) {
  console.error('So estrelas, sem palavras: %d protecao(oes) falharam.\n', falhas.length);
  for (const f of falhas.slice(0, 8)) console.error(' - %s', f);
  if (falhas.length > 8) console.error(' ... e mais %d', falhas.length - 8);
  process.exit(1);
}
console.log(`So estrelas, sem palavras: ${verificadas} protecoes verdes.`);
