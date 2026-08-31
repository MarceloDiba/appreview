import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// O bloco "Comentários que pedem atenção" da Visão geral e a fila única de
// `/reviews` (`src/lib/filaDeRespostas.ts`) precisam mostrar sempre o mesmo
// caso como primeiro: o bloco destaca um, a fila mostra ele primeiro. A regra, desde
// a decisão de 30/08/2026 (`docs/decisoes-30-08-ordem-e-navegacao.md`,
// secção 1), é "o mais recente primeiro; contato marca o selo, mas não
// reordena", em `src/lib/internalCasePriority.ts`. Reimplementar essa regra
// duas vezes, uma em cada tela, é exatamente como o bloco passou a apontar
// para um caso diferente do primeiro card da lista: duas cópias de uma
// regra sempre podem divergir. Este guarda tem duas partes: primeiro, prova
// a regra em si com casos concretos (mais recente vence mesmo sem contato;
// contato não é motivo para pular a fila; empate de horário desempata por
// id); depois, confere que os dois consumidores realmente importam e chamam
// a função exportada, em vez de ter a própria cópia da ordenação.
const root = process.cwd();
const read = (path) => readFileSync(resolve(root, path), 'utf8');

const modulePath = resolve(root, 'src/lib/internalCasePriority.ts');
const { orderPendingCasesByRecency, caseHasContact } = await import(pathToFileURL(modulePath).href);

// X é mais novo e sem contato; Y é mais antigo e com contato. Se o contato
// ainda reordenasse, Y viria primeiro (era a regra antiga). A regra atual
// tem de escolher X primeiro, só por ser mais recente.
const caseX = { id: 'X', customer_email: null, created_at: '2026-08-28T10:00:00.000Z', is_addressed: false };
const caseY = { id: 'Y', customer_email: '+5511961234567', created_at: '2026-08-20T10:00:00.000Z', is_addressed: false };

// C e D, nenhum com contato: prova a recência sozinha, sem o contato como fator.
const caseC = { id: 'C', customer_email: null, created_at: '2026-08-20T10:00:00.000Z', is_addressed: false };
const caseD = { id: 'D', customer_email: null, created_at: '2026-08-22T10:00:00.000Z', is_addressed: false };

// E e F têm o mesmo created_at: o desempate é por id crescente.
const caseF = { id: 'F', customer_email: null, created_at: '2026-08-24T10:00:00.000Z', is_addressed: false };
const caseE = { id: 'E', customer_email: null, created_at: '2026-08-24T10:00:00.000Z', is_addressed: false };

const caseResolved = { id: 'R', customer_email: '+5511961234567', created_at: '2026-08-29T10:00:00.000Z', is_addressed: true };

const xyOrder = orderPendingCasesByRecency([caseY, caseX]);
const cdOrder = orderPendingCasesByRecency([caseC, caseD]);
const tieOrder = orderPendingCasesByRecency([caseF, caseE]);
const withResolved = orderPendingCasesByRecency([caseResolved, caseX]);

const banner = read('src/components/dashboard/PendingCommentsBanner.tsx');
// A lista de casos (`CasesList.tsx`) virou a fila única aprovada em
// 30/08/2026: as três abas de `/reviews` somaram-se numa fila só. O segundo
// consumidor da ordem partilhada passou a ser `src/lib/filaDeRespostas.ts`, e
// é ele que este guarda lê. As asserções não afrouxaram; ganharam a fila
// somada, onde uma segunda ordenação seria ainda mais fácil de escrever por
// engano, porque agora há três origens a juntar.
const filaModulo = read('src/lib/filaDeRespostas.ts');
// A asserção "nenhuma ordenação própria" tem de ler CÓDIGO, não prosa: o
// próprio módulo explica em comentário por que não tem `.sort(`, e a menção
// no comentário deixava o guarda vermelho com o código certo. Comentário
// fora, e um `.sort(` comentado também deixa de enganar o guarda ao contrário.
const semComentarios = (fonte) => fonte
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
const filaCodigo = semComentarios(filaModulo);
const { montarFilaDeRespostas, comentariosJaTratados } = await import(
  pathToFileURL(resolve(root, 'src/lib/filaDeRespostas.ts')).href
);

// Um comentário privado de hoje, uma avaliação oficial de ontem e uma
// avaliação pública de anteontem: a fila somada tem de os devolver nessa
// ordem, sem olhar a origem. Se alguém reintroduzir "primeiro o Google" ou
// "primeiro o privado", esta linha fica vermelha.
const privadoDeHoje = { id: 'p1', customer_name: 'Ana', customer_email: '+5511961234567', feedback_text: 'demorou', rating: 2, is_addressed: false, created_at: '2026-08-30T20:00:00.000Z' };
const privadoTratado = { id: 'p2', customer_name: 'Bia', customer_email: null, feedback_text: 'ja resolvido', rating: 1, is_addressed: true, created_at: '2026-08-30T21:00:00.000Z' };
const oficialSemResposta = { id: 'o1', reviewer_name: 'Carlos', rating: 3, comment: 'ok', review_updated_at: '2026-08-29T20:00:00.000Z', reply_text: null };
const oficialRespondida = { id: 'o2', reviewer_name: 'Duda', rating: 5, comment: 'otimo', review_updated_at: '2026-08-30T22:00:00.000Z', reply_text: 'obrigado' };
const publicaSemEstado = { review_id: 'g1', author_name: 'Eva', rating: 4, text: 'bom', time: '2026-08-28T20:00:00.000Z', google_maps_uri: 'https://maps.google.com/x' };

const filaSomada = montarFilaDeRespostas({
  privados: [privadoDeHoje, privadoTratado],
  oficiais: [oficialSemResposta, oficialRespondida],
  publicas: [publicaSemEstado],
});
const tratados = comentariosJaTratados([privadoDeHoje, privadoTratado]);

const requirements = [
  ['mais recente sem contato (X) vence mais antigo com contato (Y): contato não reordena', xyOrder[0]?.id === 'X' && xyOrder[1]?.id === 'Y'],
  ['caseHasContact ainda identifica Y como caso com contato, mesmo sem isso mudar a ordem', caseHasContact(caseY) === true && caseHasContact(caseX) === false],
  ['sem contato dos dois lados, o mais recente (D) vem antes do mais antigo (C)', cdOrder[0]?.id === 'D' && cdOrder[1]?.id === 'C'],
  ['empate de created_at desempata por id crescente (E antes de F)', tieOrder[0]?.id === 'E' && tieOrder[1]?.id === 'F'],
  ['caso já tratado nunca aparece na ordem de pendentes', withResolved.length === 1 && withResolved[0]?.id === 'X'],
  ['o bloco da Visão geral importa a função compartilhada', banner.includes("from '@/lib/internalCasePriority'")],
  ['o bloco da Visão geral chama a função compartilhada, não uma cópia local', banner.includes('orderPendingCasesByRecency(cases)')],
  ['a fila única de /reviews importa a função compartilhada', filaModulo.includes("from './internalCasePriority.ts'")],
  ['a fila única de /reviews chama a função compartilhada, não uma cópia local', /orderPendingCasesByRecency<ItemDaFila>\(/.test(filaModulo)],
  // A fila somada é o lugar mais fácil do projeto para nascer uma segunda
  // ordenação: são três origens a juntar, e um `.sort(` local resolveria o
  // caso da tarde e divergiria do bloco da Visão geral na semana seguinte.
  ['a fila única não tem ordenação própria: nenhum .sort( no módulo', !filaCodigo.includes('.sort(')],

  // Comportamento da fila somada, com as três origens juntas.
  ['a fila somada ordena por recência, sem olhar a origem (privado de hoje, oficial de ontem, pública de anteontem)',
    filaSomada.map((item) => item.id).join(' | ') === 'comentario-privado:p1 | google-oficial:o1 | google-publico:g1'],
  ['comentário privado já tratado não entra na fila somada', !filaSomada.some((item) => item.idNaFonte === 'p2')],
  ['avaliação oficial já respondida no Google não entra na fila somada', !filaSomada.some((item) => item.idNaFonte === 'o2')],
  // A leitura pública não devolve as respostas já publicadas: o estado é
  // desconhecido, não "não respondida". `null` mantém o item na fila sem
  // afirmar o que não se sabe; trocar por `false` seria inventar o facto.
  ['a avaliação lida publicamente fica na fila com estado desconhecido, não com estado inventado',
    filaSomada.find((item) => item.origem === 'google-publico')?.is_addressed === null],
  ['cada item da fila diz de onde veio', filaSomada.every((item) => ['comentario-privado', 'google-oficial', 'google-publico'].includes(item.origem))],
  ['os já tratados são só comentários privados tratados, e saem da mesma ordem partilhada',
    tratados.length === 1 && tratados[0]?.idNaFonte === 'p2' && tratados[0]?.is_addressed === true],
];

const failed = requirements.filter(([, ok]) => !ok).map(([label]) => label);
if (failed.length) {
  console.error(`Ordem compartilhada de casos internos quebrada:\n- ${failed.join('\n- ')}`);
  process.exit(1);
}

console.log(`Ordem compartilhada de casos internos verificada: ${requirements.length} regras conferidas.`);
