#!/usr/bin/env node
// O convite para avaliar no Google nao pode depender da nota.
//
// Convidar so quem deu 4 ou 5 e solicitacao seletiva, e a politica do Google
// proibe. Ate 02/09/2026 o aviso do comentario privado escrevia "Agradeca e
// convide a publicar no Google" apenas quando `especie = 'feedback-praise'`,
// ou seja, so para nota 4 ou 5. Quem deu 3 ou menos nunca era convidado.
//
// Duas analises independentes de concorrentes apontaram o nao-filtrar como a
// melhor vantagem de venda do Binno. Nao se vende isso enquanto o produto
// sugere o contrario.
import { readFileSync } from 'node:fs';

const MIGRACAO = 'supabase/migrations/20260902120000_convite_sem_filtro.sql';

const falhas = [];
let verificadas = 0;
const exigir = (rotulo, condicao) => { verificadas += 1; if (!condicao) falhas.push(rotulo); };

const semComentariosSql = (fonte) => fonte.replace(/^\s*--[^\n]*$/gm, '');
const migracao = semComentariosSql(readFileSync(MIGRACAO, 'utf8'));

// O bloco que escreve o convite nao pode estar dentro de um `if` sobre a
// especie. Le-se o corpo entre o fecho do bloco da citacao e o link final.
const inicio = migracao.indexOf("linhas := array_append(linhas, '');\n\n    if especie");
exigir(
  'o convite deixou de estar dentro de um if sobre a especie do aviso',
  inicio === -1,
);
exigir(
  'o convite ao Google continua a existir, para toda a gente',
  /convide a publicar no Google/.test(migracao),
);
exigir(
  'a regra de quando avisar nao mudou: nota ausente continua a nao avisar',
  /if new\.rating is null then\s+return new;/.test(migracao),
);

if (falhas.length) {
  console.error('Convite sem filtro: %d protecao(oes) falharam.\n', falhas.length);
  for (const falha of falhas) console.error(' - %s', falha);
  process.exit(1);
}
console.log(`Convite sem filtro: ${verificadas} protecoes verdes.`);
