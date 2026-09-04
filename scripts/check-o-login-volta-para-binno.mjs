#!/usr/bin/env node
// O login com o Google devolve o dono ao Binno, e nao a um endereco local.
//
// POR QUE ESTE GUARDA EXISTE
//
// De 10/07/2026 a 04/09/2026 o projecto ficou com `site_url =
// "http://localhost:3000"` — o padrao do `supabase init`. Ninguem reparou
// porque a entrada por email e senha nao passa pelo Supabase Auth.
//
// Na primeira vez que uma conta entrou com o Google, o Supabase descartou o
// `redirectTo` que o codigo manda e devolveu o dono a `localhost:3000`, uma
// pagina que nao existe no computador dele — com o token da sessao escrito no
// endereco, a vista de toda a gente.
//
// O `redirectTo` do codigo so vale se o endereco constar da lista de retornos
// permitidos. Uma lista vazia nao e um detalhe de configuracao: e o mesmo
// que nao ter `redirectTo` nenhum.
import { readFileSync } from 'node:fs';

const CONFIG = readFileSync('supabase/config.toml', 'utf8');
const AUTH = CONFIG.slice(CONFIG.indexOf('\n[auth]'), CONFIG.indexOf('\n[auth.email]'));
const semComentarios = AUTH.replace(/^\s*#[^\n]*$/gm, ' ');
const CONTEXTO = readFileSync('src/context/AuthContext.tsx', 'utf8');

if (semComentarios.includes('padrao do `supabase init`')) {
  console.error('O strip de comentarios nao funcionou; as asserções mediriam a explicacao.');
  process.exit(1);
}

const falhas = [];
let verificadas = 0;
const exigir = (rotulo, condicao) => { verificadas += 1; if (!condicao) falhas.push(rotulo); };

exigir('o retorno padrao do login voltou a ser um endereco local; o dono cai numa pagina que nao existe no computador dele',
  /site_url\s*=\s*"https:\/\/binno\.pro"/.test(semComentarios));

// A LISTA VAZIA E O DEFEITO INTEIRO. Sem o endereco de producao nela, o
// `redirectTo` do codigo e ignorado e tudo cai no `site_url` — mesmo com o
// `site_url` certo, uma conta que entra por `www.` ou por uma pre-visualizacao
// sai do fluxo.
exigir('binno.pro deixou de constar na lista de retornos permitidos; o `redirectTo` do codigo volta a ser ignorado',
  /"https:\/\/binno\.pro\/\*\*"/.test(semComentarios));
exigir('a lista de retornos permitidos ficou vazia',
  /additional_redirect_urls\s*=\s*\[\s*(\n|")/.test(semComentarios)
  && !/additional_redirect_urls\s*=\s*\[\s*\]/.test(semComentarios));

// E O CODIGO CONTINUA A PEDIR O RETORNO. Se ele parar de mandar `redirectTo`,
// toda a lista acima deixa de ser usada e o dono cai sempre no `site_url`,
// perdendo a pagina de destino.
exigir('o login deixou de pedir para voltar a origem de onde partiu',
  /redirectTo:\s*`\$\{window\.location\.origin\}\/login`/.test(CONTEXTO));

if (falhas.length) {
  console.error('O login volta para o Binno: %d protecao(oes) falharam.\n', falhas.length);
  for (const f of falhas) console.error(' - %s', f);
  process.exit(1);
}
console.log(`O login volta para o Binno: ${verificadas} protecoes verdes.`);
