#!/usr/bin/env node
// Cada uso da Places fala com a versao que lhe corresponde, e isso fica escrito.
//
// POR QUE ESTE GUARDA EXISTE
//
// O Binno usa a Places do Google em dois sitios, e em VERSOES DIFERENTES:
// `fetch-google-reviews` le avaliacoes publicas pela Places NOVA
// (`places.googleapis.com/v1`), e `search-prospects` varre uma zona pela Places
// LEGADA (`maps.googleapis.com/maps/api/place/nearbysearch/json`). Sao duas
// APIs distintas, activadas separadamente no Console do Google: ter uma ligada
// e a outra nao deixa metade do produto morto sem que uma linha de codigo mude.
//
// A LEGADA NAO MORREU, E ISSO FOI SONDADO, NAO ADIVINHADO. Em 03/09/2026, com o
// susto dos locais da v4 ainda quente, a suspeita foi que esta fosse a proxima.
// A sonda (uma chamada sem chave, que nao gasta quota nem revela segredo) diz o
// contrario: a legada responde HTTP 200 com JSON `REQUEST_DENIED`, ou seja, o
// endereco existe e so falta credencial; o endereco que morreu de facto,
// `mybusiness.googleapis.com/v4/{conta}/locations`, responde 404 em HTML. A
// documentacao do Google concorda: desde 01/03/2025 a legada esta congelada e
// nao se activa em projectos NOVOS, mas quem ja a tinha continua servido, com
// 12 meses de aviso prometidos e nenhuma data marcada.
//
// Daqui saem as duas regras que este guarda cobra:
//
// 1. NAO MIGRAR a busca de prospectos enquanto a legada servir. Migrar o que
//    funciona e criar risco sem ganho — e quem chegar aqui daqui a um mes vai
//    ler "legada" e querer uniformizar. Se um dia houver prova de morte, a
//    migracao passa por mudar esta linha de proposito, e nao por acidente.
// 2. REGISTAR O MOTIVO da recusa. Nao se consegue impedir o Google de desligar
//    a legada; consegue-se garantir que, no dia em que desligar, o log diga
//    porque, em vez de um 502 mudo. Foi o 502 mudo dos locais que custou uma
//    ida e volta inteira em 03/09/2026.
import { readFileSync } from 'node:fs';

const AVALIACOES = 'supabase/functions/fetch-google-reviews/index.ts';
const PROSPECTOS = 'supabase/functions/search-prospects/index.ts';

// Comentario nao e codigo: descrever um endereco na explicacao nao pode fazer
// passar uma assercao sobre o endereco que a funcao chama de verdade.
const semComentarios = (fonte) => fonte
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');

const avaliacoes = semComentarios(readFileSync(AVALIACOES, 'utf8'));
const prospectos = semComentarios(readFileSync(PROSPECTOS, 'utf8'));

const falhas = [];
let verificadas = 0;
const exigir = (rotulo, condicao) => { verificadas += 1; if (!condicao) falhas.push(rotulo); };

// 1. QUAL VERSAO CADA USO FALA.
//
// A leitura de avaliacoes publicas ja vive na nova, e tem de continuar la: a
// legada recusa projectos onde a Places antiga nunca foi activada, e este
// caminho serve clientes que nem sequer ligaram o Google.
exigir('a leitura de avaliacoes publicas usa a Places nova',
  /places\.googleapis\.com\/v1\/places\//.test(avaliacoes));

// A busca de prospectos fica na legada ate haver prova de morte. Esta assercao
// e o travao contra a migracao distraida — a que se faz "para uniformizar" e
// que para uma ferramenta que hoje funciona.
exigir('a busca de prospectos continua na Places legada, ate haver prova de que morreu',
  /maps\.googleapis\.com\/maps\/api\/place\/nearbysearch\/json/.test(prospectos));

// 2. O MOTIVO DA RECUSA FICA REGISTADO, NO MESMO FORMATO DE TODA A CASA.
//
// `sync-google-business-profile` ja escreve "Google recusou em ..."; usar outro
// texto aqui obrigaria a procurar duas coisas diferentes no log para responder
// a mesma pergunta.
exigir('a busca de prospectos regista o motivo da recusa do Google',
  /Google recusou em/.test(prospectos));

// Sem o sitio, um log de recusa nao diz de onde veio: ha varios pontos do
// Google no mesmo servidor a escrever para o mesmo lado.
exigir('o registo da recusa nomeia o sitio ("buscar prospectos")',
  /"buscar prospectos"/.test(prospectos));

// O `status` e o que separa consertos opostos: REQUEST_DENIED e "a API nao esta
// activada ou a chave nao vale", OVER_QUERY_LIMIT e "esta activada e acabou a
// quota". Sem ele, o log confirma que houve erro e nao ajuda em mais nada.
exigir('o registo da recusa leva o status que o Google devolveu',
  /data\.status \|\| "\?"/.test(prospectos));

// O modo de falha que interessa mesmo: quando o Google desliga um endereco, nao
// responde erro JSON — responde HTML. Fazer `res.json()` sobre HTML rebenta
// longe do sitio, no catch geral, e some com a unica pista que havia.
exigir('uma resposta que nao e JSON tambem fica registada, e nao rebenta muda',
  /corpo nao e JSON/.test(prospectos)
  && /JSON\.parse\(corpo\)/.test(prospectos));

if (falhas.length) {
  console.error('Places API viva: %d protecao(oes) falharam.\n', falhas.length);
  for (const falha of falhas) console.error(' - %s', falha);
  process.exit(1);
}
console.log(`Places API viva: ${verificadas} protecoes verdes.`);
