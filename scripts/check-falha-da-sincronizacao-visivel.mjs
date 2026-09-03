#!/usr/bin/env node
// Uma recusa do Google tem de deixar rasto no banco, nao so no ecra.
//
// POR QUE ESTE GUARDA EXISTE
//
// Em 03/09/2026 a producao estava assim: perfil do Google `connected`, local
// escolhido e guardado, `last_synced_at` NULO, `last_error` NULO e ZERO
// avaliacoes. Ou seja: alguma coisa recusou, e nao havia como saber o que.
//
// O motivo era este: `last_error` so era escrito quando a renovacao do token
// falhava. Uma recusa do Google a listar locais ou a buscar avaliacoes devolvia
// 502 ao navegador e mais nada. Quem visse o erro foi quem estava a olhar para
// o ecra naquele segundo; para todos os outros — incluindo quem for depurar
// isto — a falha nunca aconteceu.
//
// Este guarda existe para essa falha nao voltar a ser invisivel.
//
// A ARMADILHA QUE ELE PROPRIO TEM DE EVITAR: o comentario que explica o
// `registarFalha` contem as palavras `last_error` e `google_business_connections`.
// Uma expressao regular ingenua casaria com a EXPLICACAO em vez do codigo, e
// ficaria verde mesmo depois de alguem apagar a chamada. Por isso tudo aqui
// corre sobre a fonte com os comentarios retirados.
import { readFileSync } from 'node:fs';

const CAMINHO = 'supabase/functions/sync-google-business-profile/index.ts';
const bruto = readFileSync(CAMINHO, 'utf8');

// Retira comentarios de bloco e de linha. O `[^:]` antes de `//` evita comer o
// `https://` dos imports, que nao e comentario.
const fonte = bruto
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');

// Se o strip comeu o ficheiro inteiro, ou nao comeu nada, nao ha nada a provar.
if (fonte.length < 1000 || fonte.includes('POR QUE ISTO EXISTE')) {
  console.error('O strip de comentarios nao funcionou; as asserções abaixo mediriam o texto errado.');
  process.exit(1);
}

const falhas = [];
const exigir = (rotulo, condicao) => { if (!condicao) falhas.push(rotulo); };

// 1. TODA recusa do Google e registada, e nao apenas uma delas.
//
// Conta os sitios em vez de procurar um: acrescentar uma terceira chamada ao
// Google sem registar a falha e exactamente o modo como isto volta a partir-se.
const sitios = [...fonte.matchAll(/googleError\(response/g)];
exigir('nao encontrei nenhuma chamada a googleError — o ficheiro mudou de forma e este guarda deixou de medir o que diz medir',
  sitios.length >= 2);
for (const sitio of sitios) {
  const trecho = fonte.slice(sitio.index, sitio.index + 320);
  const onde = (trecho.match(/googleError\(response,\s*"([^"]+)"/) || [, '?'])[1];
  exigir(`a recusa do Google em "${onde}" nao e registada: devolve o erro e some`,
    /registarFalha\(/.test(trecho));
}

// 2. O REGISTO ESCREVE MESMO. Recorta so o corpo da funcao, para nao casar com
//    uma mencao a `last_error` noutro sitio do ficheiro (ha uma, no caminho do
//    token revogado, e ela nao prova nada sobre esta).
const inicio = fonte.indexOf('const registarFalha');
exigir('nao achei a funcao registarFalha', inicio !== -1);
if (inicio !== -1) {
  const fim = fonte.indexOf('const googleError', inicio);
  exigir('nao consegui delimitar o corpo de registarFalha; sem isso as asserções seguintes mediriam o ficheiro todo',
    fim > inicio);
  const corpo = fonte.slice(inicio, fim > inicio ? fim : inicio + 800);

  exigir('registarFalha nao escreve em google_business_connections',
    /from\("google_business_connections"\)/.test(corpo));
  exigir('registarFalha nao escreve o last_error',
    /update\(\{\s*last_error:/.test(corpo));
  // Sem o filtro, um erro de um dono apagava a explicacao do erro de outro.
  exigir('registarFalha nao filtra por dono — escreveria na ligacao de toda a gente',
    /\.eq\("user_id",\s*userId\)/.test(corpo));
  // O rasto nao pode virar o erro que o utilizador le.
  exigir('registarFalha pode derrubar a resposta: falta o try/catch',
    /try\s*\{/.test(corpo) && /catch\s*\(/.test(corpo));
}

// 3. O TIPO ESTA IMPORTADO. Estas funcoes correm em Deno e nao entram no
//    `tsc` do projecto, portanto um import em falta nao seria apanhado por
//    mais nada em todo o `verify`.
exigir('falta importar o tipo SupabaseClient que registarFalha declara',
  /import \{ createClient, type SupabaseClient \}/.test(fonte));

if (falhas.length) {
  console.error('check-falha-da-sincronizacao-visivel: VERMELHO\n' + falhas.map((f) => `  - ${f}`).join('\n'));
  process.exit(1);
}
console.log(`check-falha-da-sincronizacao-visivel: ${8 + sitios.length} asserções, ${sitios.length} recusas do Google cobertas.`);
