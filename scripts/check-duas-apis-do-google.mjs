#!/usr/bin/env node
// As avaliacoes e os locais vivem em APIs DIFERENTES do Google, e tem de
// continuar assim.
//
// POR QUE ESTE GUARDA EXISTE
//
// Em 03/09/2026 o botao "Buscar locais" devolveu um 404 em HTML — a pagina de
// erro do proprio Google, e nao um erro JSON da API. O codigo, escrito em
// agosto, pedia os locais a `mybusiness.googleapis.com/v4`, e o Google desligou
// os endpoints de LOCAIS dessa versao. Eles vivem agora em
// `mybusinessbusinessinformation.googleapis.com/v1`.
//
// AS AVALIACOES CONTINUAM NA v4, e isso nao e divida tecnica: o Google nunca as
// migrou para API nenhuma. E o unico endereco que existe para elas.
//
// A funcao fala com duas APIs de proposito, e a leitura natural de quem chegar
// aqui daqui a um mes e "isto esta inconsistente, vou uniformizar". Uniformizar
// para v4 parte os locais; uniformizar para v1 parte as avaliacoes. As duas
// direccoes estao proibidas abaixo, com o motivo escrito.
import { readFileSync } from 'node:fs';

const FUNCAO = 'supabase/functions/sync-google-business-profile/index.ts';

const semComentarios = (fonte) => fonte
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');

const fonte = semComentarios(readFileSync(FUNCAO, 'utf8'));

const falhas = [];
let verificadas = 0;
const exigir = (rotulo, condicao) => { verificadas += 1; if (!condicao) falhas.push(rotulo); };

// 1. OS LOCAIS na API nova. Um 404 em HTML e o que o Google responde quando o
// endereco nao existe — nao ha erro JSON para tratar, e por isso este defeito
// nao se apanha lendo codigo de tratamento de erro.
exigir('os locais sao pedidos a Business Information API, e nao a v4',
  /mybusinessbusinessinformation\.googleapis\.com\/v1\/\$\{account\.name\}\/locations/.test(fonte));
exigir('a v4 nao e usada para locais em sitio nenhum',
  !/mybusiness\.googleapis\.com\/v4\/[^`]*\/locations`/.test(fonte));
// `readMask` e obrigatorio na v1: sem ele a resposta e 400, e nao uma lista
// vazia — falha barulhenta, mas so em producao.
exigir('o pedido de locais leva o readMask que a API nova exige',
  /searchParams\.set\("readMask", "name,title,storeCode,metadata"\)/.test(fonte));

// 2. AS AVALIACOES continuam na v4, porque nao ha alternativa.
exigir('as avaliacoes continuam a ser pedidas a v4',
  /mybusiness\.googleapis\.com\/v4\/\$\{location\.location_name\}\/reviews/.test(fonte));

// 3. O CAMINHO COMPLETO. A v1 devolve `locations/123`; a v4 das avaliacoes
// exige `accounts/1/locations/123`. Guardar o nome curto faria a sincronizacao
// falhar depois, longe daqui, com um 404 que ninguem ligaria a este sitio.
exigir('o nome do local e recomposto com a conta antes de ser guardado',
  /nomeCurto\.startsWith\("accounts\/"\)/.test(fonte)
  && /\$\{accountName\}\/\$\{nomeCurto\}/.test(fonte));

// 4. O TITULO mudou de nome entre as duas versoes. Ler o campo errado nao
// falha: guarda o identificador no lugar do nome do negocio, e o dono ve
// `locations/123` na tela onde devia estar o nome da loja dele.
exigir('o titulo do local e lido do campo da API nova',
  /typeof location\.title === "string"/.test(fonte)
  && !/typeof location\.locationName === "string"/.test(fonte));

if (falhas.length) {
  console.error('Duas APIs do Google: %d protecao(oes) falharam.\n', falhas.length);
  for (const falha of falhas) console.error(' - %s', falha);
  process.exit(1);
}
console.log(`Duas APIs do Google: ${verificadas} protecoes verdes.`);
