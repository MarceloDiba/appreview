import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// O bloco "Comentários que pedem atenção" da Visão geral e a lista de casos
// em `/reviews` (`CasesList.tsx`) precisam mostrar sempre o mesmo caso como
// mais urgente: o bloco destaca um, a lista mostra ele primeiro. A regra é
// "quem tem contato antes de quem não tem, mais antigo primeiro dentro de
// cada grupo", em `src/lib/internalCasePriority.ts`. Reimplementar essa
// regra duas vezes, uma em cada tela, é exatamente como o bloco passou a
// apontar para um caso diferente do primeiro card da lista: duas cópias de
// uma regra sempre podem divergir. Este guarda tem duas partes: primeiro,
// prova a regra em si com um caso concreto (A sem contato e mais antigo, B
// com contato e mais novo, a regra tem de escolher B primeiro, o oposto de
// "mais antigo vence sempre"); depois, confere que os dois consumidores
// realmente importam e chamam a função exportada, em vez de ter a própria
// cópia da ordenação.
const root = process.cwd();
const read = (path) => readFileSync(resolve(root, path), 'utf8');

const modulePath = resolve(root, 'src/lib/internalCasePriority.ts');
const { orderPendingCasesByUrgency, caseHasContact } = await import(pathToFileURL(modulePath).href);

const caseA = { id: 'A', customer_email: null, created_at: '2026-08-25T10:00:00.000Z', is_addressed: false };
const caseB = { id: 'B', customer_email: '+5511961234567', created_at: '2026-08-27T10:00:00.000Z', is_addressed: false };
const caseC = { id: 'C', customer_email: null, created_at: '2026-08-20T10:00:00.000Z', is_addressed: false };
const caseD = { id: 'D', customer_email: null, created_at: '2026-08-22T10:00:00.000Z', is_addressed: false };
const caseResolved = { id: 'R', customer_email: '+5511961234567', created_at: '2026-08-29T10:00:00.000Z', is_addressed: true };

const abOrder = orderPendingCasesByUrgency([caseA, caseB]);
const cdOrder = orderPendingCasesByUrgency([caseD, caseC]);
const withResolved = orderPendingCasesByUrgency([caseResolved, caseA]);

const banner = read('src/components/dashboard/PendingCommentsBanner.tsx');
const casesList = read('src/components/dashboard/cases/CasesList.tsx');

const requirements = [
  ['caso com contato (B, mais novo) vence caso sem contato (A, mais antigo)', abOrder[0]?.id === 'B' && abOrder[1]?.id === 'A'],
  ['caseHasContact concorda com a ordem escolhida acima', caseHasContact(caseB) === true && caseHasContact(caseA) === false],
  ['sem contato dos dois lados, o mais antigo (C) vem antes do mais novo (D)', cdOrder[0]?.id === 'C' && cdOrder[1]?.id === 'D'],
  ['caso já tratado nunca aparece na ordem de urgência', withResolved.length === 1 && withResolved[0]?.id === 'A'],
  ['o bloco da Visão geral importa a função compartilhada', banner.includes("from '@/lib/internalCasePriority'")],
  ['o bloco da Visão geral chama a função compartilhada, não uma cópia local', banner.includes('orderPendingCasesByUrgency(cases)')],
  ['a lista de casos importa a função compartilhada', casesList.includes("from '@/lib/internalCasePriority'")],
  ['a lista de casos chama a função compartilhada, não uma cópia local', casesList.includes('orderPendingCasesByUrgency(cases)')],
];

const failed = requirements.filter(([, ok]) => !ok).map(([label]) => label);
if (failed.length) {
  console.error(`Ordem compartilhada de casos internos quebrada:\n- ${failed.join('\n- ')}`);
  process.exit(1);
}

console.log(`Ordem compartilhada de casos internos verificada: ${requirements.length} regras conferidas.`);
