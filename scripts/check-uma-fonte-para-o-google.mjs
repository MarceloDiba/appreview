#!/usr/bin/env node
// Com a ligação oficial completa, o retrato da Apify sai da fila.
//
// POR QUE ESTE GUARDA EXISTE
//
// Em 03/09/2026 o Painel mostrava 6 avaliacoes do Google a espera e a aba
// Avaliacoes mostrava 8, no mesmo momento e para o mesmo dono. A ordem tambem
// diferia. Marcelo viu as duas telas lado a lado.
//
// A CAUSA, medida na producao e nao suposta: duas listas independentes do MESMO
// perfil. A oficial, sincronizada no proprio dia pela API do Google, e um
// retrato da Apify recolhido a 01/09 e valido ate 15/09.
//
// A deduplicacao existe e funciona — a chave e `autor|nota|dia` — mas so remove
// quem aparece nas DUAS listas. Tres avaliacoes existiam SO no retrato:
//
//     Daniel Soares, H5 TEXAS BURGER HUB, Luciano Maynard Barreto
//
// e as tres JA ESTAVAM RESPONDIDAS no Google. O retrato e de tres dias antes e
// nao sabe das respostas publicadas depois, entao a aba oferecia ao dono
// responder a quem ele ja respondeu — incluindo a resposta que ele acabara de
// publicar naquele minuto.
//
// A REGRA: quando a fonte oficial tem retrato COMPLETO (`review_sync_completed
// _at`), ela e a unica que fala pelo Google. So ela sabe se o dono ja respondeu,
// porque devolve a resposta publicada; o retrato so sabe o que era verdade no
// dia em que foi tirado.
//
// E O QUE ELE NAO PODE FAZER: calar a fila de quem ainda NAO ligou o Google
// oficial. Para esses, o retrato e a unica coisa que existe, e continua a ser.
const { montarItensDaFila } = await import('../src/lib/filaDeRespostas.ts');

const falhas = [];
let verificadas = 0;
const exigir = (rotulo, condicao) => { verificadas += 1; if (!condicao) falhas.push(rotulo); };

// Os dados REAIS da producao em 03/09/2026, com os nomes e as datas que
// causaram o defeito. Copiados da consulta, e nao inventados.
const OFICIAIS = [
  { id: 'o1', reviewer_name: 'Breno Loeser', rating: 5, review_updated_at: '2017-12-12T10:00:00Z', comment: 'ótimo lugar', reply_text: null },
  { id: 'o2', reviewer_name: 'Diego França', rating: 4, review_updated_at: '2020-03-10T10:00:00Z', comment: null, reply_text: null },
  { id: 'o3', reviewer_name: 'Elétrica doutor house Júnior', rating: 5, review_updated_at: '2021-08-31T10:00:00Z', comment: 'Pronta pra melhor atender', reply_text: null },
  { id: 'o4', reviewer_name: 'Giza Feitosa leite', rating: 5, review_updated_at: '2018-07-03T10:00:00Z', comment: null, reply_text: null },
  { id: 'o5', reviewer_name: 'LailsonSantos jose', rating: 4, review_updated_at: '2021-07-27T10:00:00Z', comment: null, reply_text: null },
  { id: 'o6', reviewer_name: 'Mesquita', rating: 4, review_updated_at: '2020-01-14T10:00:00Z', comment: 'Agência Top', reply_text: null },
];

// O retrato da Apify. Os tres ultimos JA ESTAO RESPONDIDOS no Google, e o
// retrato nao sabe.
const PUBLICAS = [
  { review_id: 'p1', author_name: 'Breno Loeser', rating: 5, text: 'ótimo lugar', time: '2017-12-12T10:00:00Z' },
  { review_id: 'p2', author_name: 'Elétrica doutor house Júnior', rating: 5, text: 'Pronta pra melhor atender', time: '2021-08-31T10:00:00Z' },
  { review_id: 'p3', author_name: 'Mesquita', rating: 4, text: 'Agência Top', time: '2020-01-14T10:00:00Z' },
  { review_id: 'p4', author_name: 'Daniel Soares', rating: 5, text: 'Marcelo é um profissional ímpar.', time: '2026-08-31T10:00:00Z' },
  { review_id: 'p5', author_name: 'H5 TEXAS BURGER HUB', rating: 5, text: 'Muito bom para trabalhar com eles', time: '2024-06-19T10:00:00Z' },
  { review_id: 'p6', author_name: 'Luciano Maynard Barreto', rating: 5, text: 'Excelentes profissionais', time: '2017-11-21T10:00:00Z' },
];

const publicosDe = (itens) => itens.filter((i) => i.origem === 'google-publico');

// 1. COM A OFICIAL COMPLETA, O RETRATO NAO ENTRA. Esta e a assercao do defeito.
const comOficial = montarItensDaFila({ oficiais: OFICIAIS, publicas: PUBLICAS, oficialCompleta: true });
const sobraram = publicosDe(comOficial);
exigir(`o retrato da Apify ainda entra na fila com a oficial completa: ${sobraram.map((i) => i.autor).join(', ') || '(nenhum)'}`,
  sobraram.length === 0);

// 2. E O QUE A OFICIAL DIZ CONTINUA LA, INTEIRO. Um guarda que so proibisse
//    passaria com a fila vazia, que e pior do que o defeito.
exigir(`a fila perdeu avaliacoes oficiais: ${comOficial.filter((i) => i.origem === 'google-oficial').length} de ${OFICIAIS.length}`,
  comOficial.filter((i) => i.origem === 'google-oficial').length === OFICIAIS.length);

// 3. NINGUEM RESPONDIDO E OFERECIDO OUTRA VEZ. E o dano concreto: o dono ia
//    responder ao Daniel pela segunda vez, minutos depois da primeira.
for (const ja of ['Daniel Soares', 'H5 TEXAS BURGER HUB', 'Luciano Maynard Barreto']) {
  exigir(`"${ja}" ja foi respondido no Google e continua a ser oferecido na fila`,
    !comOficial.some((i) => i.autor === ja));
}

// 4. QUEM NAO LIGOU O GOOGLE OFICIAL NAO PODE FICAR SEM FILA. Sem esta, o
//    conserto acima poderia ser "apagar sempre o retrato", que cala o produto
//    inteiro para quem ainda depende dele.
const semOficial = montarItensDaFila({ oficiais: [], publicas: PUBLICAS, oficialCompleta: false });
exigir(`sem ligacao oficial a fila ficou com ${publicosDe(semOficial).length} itens do retrato; deviam ser ${PUBLICAS.length}`,
  publicosDe(semOficial).length === PUBLICAS.length);

// 5. E A OFICIAL INCOMPLETA TAMBEM NAO CALA O RETRATO. Ligada mas ainda a
//    sincronizar, ela nao sabe tudo — apagar o retrato ai esconderia avaliacoes
//    que existem.
const oficialAMeio = montarItensDaFila({ oficiais: OFICIAIS.slice(0, 2), publicas: PUBLICAS, oficialCompleta: false });
exigir('com a sincronizacao oficial a meio, o retrato foi calado e a fila encolheu',
  publicosDe(oficialAMeio).length > 0);

// 6. E A TELA TEM DE PASSAR O ESTADO. Sem isto, tudo o que esta acima fica
//    verde com o conserto a nao ser usado em lado nenhum — o modo de falha
//    mais silencioso que ha, e ja aconteceu neste projecto.
const { readFileSync } = await import('node:fs');
const tela = readFileSync('src/components/dashboard/reviews/FilaDeRespostas.tsx', 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
exigir('a tela nao passa `oficialCompleta`; o conserto existe e nao e usado',
  /oficialCompleta:/.test(tela));
// Ligada NAO chega: a meio da sincronizacao a oficial ainda nao sabe tudo.
exigir('a tela decide `oficialCompleta` so por estar ligada, sem exigir o retrato completo',
  /oficialCompleta: oficiais\.connectionStatus === 'connected' && oficiais\.syncComplete/.test(tela));
// Sem as duas no array de dependencias, o valor congela no primeiro calculo.
exigir('as dependencias do useMemo nao incluem o estado da ligacao; o valor congelaria',
  /oficiais\.connectionStatus, oficiais\.syncComplete/.test(tela));

if (falhas.length) {
  console.error('Uma fonte para o Google: %d protecao(oes) falharam.\n', falhas.length);
  for (const f of falhas) console.error(' - %s', f);
  process.exit(1);
}
console.log(`Uma fonte para o Google: ${verificadas} protecoes verdes.`);
