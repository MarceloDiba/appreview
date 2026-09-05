// O vigia diario tem de bater em TODAS as portas, menos a que se decidiu abrir.
//
// POR QUE ISTO EXISTE
//
// A primeira medicao do vigia — `docs/qa/vigia-diario.md` — bate numa lista de
// funcoes escrita a mao dentro da propria funcao de borda, porque ela corre no
// Deno e nao ve o repositorio. Uma lista escrita a mao envelhece: acrescentar
// uma funcao e esquecer de a listar deixa o vigia VERDE sobre uma porta que
// ninguem mediu.
//
// E essa e exactamente a familia de defeito que a regra 1 da especificacao
// combate: "uma verificacao que ficou sem o que medir devolve tudo bem em vez
// de erro". Aqui a verificacao nao fica sem o que medir — fica a medir menos do
// que diz, o que da no mesmo e e mais dificil de ver.
//
// A UNICA AUSENCIA PERMITIDA e `comprar`, e ela e deliberada duas vezes: a
// funcao responde 200 por decisao de produto, e bater nela todos os dias criaria
// uma sessao de pagamento abandonada por dia num sistema de dinheiro a serio.
import { readdirSync, existsSync, readFileSync } from 'node:fs';

const PASTA = 'supabase/functions';
const ABERTA_POR_DECISAO = 'comprar';

const fonte = readFileSync(`${PASTA}/vigia-diario/index.ts`, 'utf8');

const falhas = [];
const exigir = (o_que, verdade) => { if (!verdade) falhas.push(o_que); };

// A FATIA E A LISTA, e nao o ficheiro. O nome de uma funcao aparece tambem nos
// comentarios; medir o ficheiro inteiro daria por coberta uma porta que so foi
// mencionada.
const inicio = fonte.indexOf('const PORTAS = [');
const fim = fonte.indexOf('];', inicio);
if (inicio === -1 || fim === -1) {
  console.error('Vigia sem portas: nao encontrei a lista PORTAS na funcao de borda.');
  console.error('Sem a lista nao ha o que medir, e um guarda cego nao passa.');
  process.exit(1);
}
const lista = fonte.slice(inicio, fim);
const listadas = [...lista.matchAll(/'([a-z0-9-]+)'/g)].map((m) => m[1]);

exigir('a lista do vigia esta vazia; deixou de medir o que diz medir', listadas.length > 5);

const existentes = readdirSync(PASTA, { withFileTypes: true })
  .filter((e) => e.isDirectory() && e.name !== '_shared' && existsSync(`${PASTA}/${e.name}/index.ts`))
  .map((e) => e.name);

exigir(`a varredura achou so ${existentes.length} funcoes; nao e o repositorio inteiro`,
  existentes.length >= 15);

for (const nome of existentes) {
  if (nome === ABERTA_POR_DECISAO) {
    exigir(`'${nome}' e a aberta por decisao e nao pode estar na lista do vigia`,
      !listadas.includes(nome));
    continue;
  }
  exigir(`'${nome}' existe no repositorio e o vigia nao bate nela`, listadas.includes(nome));
}

// E O INVERSO: um nome na lista que ja nao existe faz o vigia bater no vazio e
// contar isso como recusa.
for (const nome of listadas) {
  exigir(`'${nome}' esta na lista do vigia e nao existe no repositorio`, existentes.includes(nome));
}

if (falhas.length) {
  console.error(`Vigia bate em todas as portas: ${falhas.length} protecao(oes) falharam.\n`);
  for (const f of falhas) console.error(` - ${f}`);
  process.exit(1);
}
console.log(`Vigia bate em todas as portas: ${existentes.length} funcoes conferidas, ${listadas.length} medidas.`);
