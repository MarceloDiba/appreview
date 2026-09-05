import { execFileSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';

// Nenhuma funcao do Supabase usa um nome que nao existe.
//
// POR QUE ESTE GUARDA EXISTE
//
// Em 05/09/2026 o `whatsapp-cloud-webhook` tinha, em producao, esta linha:
//
//   console.error('... recebido sem nada a espera', texto.slice(0, 20));
//
// `texto` nunca foi declarado em lado nenhum do ficheiro — a variavel chama-se
// `dito`. Era um ReferenceError a espera do dia em que o dono confirmasse sem
// haver nada pendente: o pedido inteiro rebentava, a Meta recebia 500 e voltava
// a tentar o mesmo evento.
//
// O DEFEITO NAO ERA A LINHA. Era nao haver nada a olhar para ali. O `tsc` do
// projeto corre sobre `tsconfig.app.json`, que cobre `src/` e NAO cobre
// `supabase/functions/` — essas correm em Deno, e o Deno so as compila quando
// sao chamadas. Codigo que so falha ao ser executado, num caminho raro, num
// runtime que ninguem verifica: passa anos sem ninguem ver.
//
// COMO VERIFICA
//
// Corre o `tsc` sobre as funcoes com `--noResolve` e olha para DOIS codigos de
// erro, nao um. Os erros de modulo (TS2307) sao esperados e ignorados: os
// imports sao URLs, e resolver URLs e trabalho do Deno, nao do tsc. O `Deno`
// global vem declarado em `scripts/tipos/deno-global.d.ts`.
//
// TS2304 e TS2552 SAO O MESMO DEFEITO. A primeira versao deste guarda filtrava
// so `TS2304`, e ficou VERDE com o defeito real reposto — apanhado por mutacao,
// nao por leitura. O TypeScript troca o codigo quando consegue sugerir um nome
// parecido:
//
//   TS2304  Cannot find name 'xpto'.
//   TS2552  Cannot find name 'texto'. Did you mean 'Text'?
//
// E era exactamente o caso real: havia um `Text` no lib do DOM, entao o erro do
// `texto` saiu como TS2552 e o guarda nao o via. Um guarda que protege contra
// metade de um defeito e pior do que nenhum, porque parece que protege.

const raiz = resolve(import.meta.dirname, '..');
const pastaDasFuncoes = resolve(raiz, 'supabase/functions');

const ficheiros = [];
const percorrer = (pasta) => {
  for (const nome of readdirSync(pasta)) {
    const caminho = join(pasta, nome);
    if (statSync(caminho).isDirectory()) percorrer(caminho);
    else if (nome.endsWith('.ts')) ficheiros.push(caminho);
  }
};
percorrer(pastaDasFuncoes);

// SE NAO HA FICHEIROS, O GUARDA MENTE. Um caminho errado daria zero erros e
// verde eterno — o formato exacto de guarda que este projeto ja apanhou antes.
if (ficheiros.length < 10) {
  console.error(`Nome que nao existe: so encontrei ${ficheiros.length} ficheiros em ${pastaDasFuncoes}.`);
  console.error('Sao mais de vinte. O caminho esta errado e o guarda estaria a proteger nada.');
  process.exit(1);
}

let saida = '';
try {
  execFileSync('npx', ['tsc', '--noEmit', '--noResolve', '--target', 'es2022',
    '--module', 'esnext', '--moduleResolution', 'bundler', '--lib', 'es2022,dom',
    '--skipLibCheck', resolve(raiz, 'scripts/tipos/deno-global.d.ts'), ...ficheiros],
    { cwd: raiz, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
} catch (erro) {
  saida = `${erro.stdout || ''}${erro.stderr || ''}`;
}

const nomesQueNaoExistem = saida.split('\n')
  .filter((linha) => /error TS(2304|2552)/.test(linha));

if (nomesQueNaoExistem.length) {
  console.error('Funcao do Supabase a usar um nome que nao existe:');
  for (const linha of nomesQueNaoExistem) console.error(`- ${linha.trim()}`);
  process.exit(1);
}

console.log(`Nome que nao existe: ${ficheiros.length} ficheiros de funcao conferidos, nenhum nome solto.`);
