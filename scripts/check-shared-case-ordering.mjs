import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// O bloco "Comentários que pedem atenção" da Visão geral e a lista de casos
// em `/reviews` (`CasesList.tsx`) precisam mostrar sempre o mesmo caso como
// primeiro: o bloco destaca um, a lista mostra ele primeiro. A regra, desde
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
const casesList = read('src/components/dashboard/cases/CasesList.tsx');

const requirements = [
  ['mais recente sem contato (X) vence mais antigo com contato (Y): contato não reordena', xyOrder[0]?.id === 'X' && xyOrder[1]?.id === 'Y'],
  ['caseHasContact ainda identifica Y como caso com contato, mesmo sem isso mudar a ordem', caseHasContact(caseY) === true && caseHasContact(caseX) === false],
  ['sem contato dos dois lados, o mais recente (D) vem antes do mais antigo (C)', cdOrder[0]?.id === 'D' && cdOrder[1]?.id === 'C'],
  ['empate de created_at desempata por id crescente (E antes de F)', tieOrder[0]?.id === 'E' && tieOrder[1]?.id === 'F'],
  ['caso já tratado nunca aparece na ordem de pendentes', withResolved.length === 1 && withResolved[0]?.id === 'X'],
  ['o bloco da Visão geral importa a função compartilhada', banner.includes("from '@/lib/internalCasePriority'")],
  ['o bloco da Visão geral chama a função compartilhada, não uma cópia local', banner.includes('orderPendingCasesByRecency(cases)')],
  ['a lista de casos importa a função compartilhada', casesList.includes("from '@/lib/internalCasePriority'")],
  ['a lista de casos chama a função compartilhada, não uma cópia local', casesList.includes('orderPendingCasesByRecency(cases)')],
];

const failed = requirements.filter(([, ok]) => !ok).map(([label]) => label);
if (failed.length) {
  console.error(`Ordem compartilhada de casos internos quebrada:\n- ${failed.join('\n- ')}`);
  process.exit(1);
}

console.log(`Ordem compartilhada de casos internos verificada: ${requirements.length} regras conferidas.`);
