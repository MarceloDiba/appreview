#!/usr/bin/env node
// Quando o Google recusa, a tela diz que falhou — e nao que esta a trabalhar.
//
// POR QUE ESTE GUARDA EXISTE
//
// Em 03/09/2026 a producao estava assim: a sincronizacao com o Google tinha
// falhado (a API `mybusiness.googleapis.com` estava desactivada no projecto), e
// a tela do dono dizia, em amarelo:
//
//     "Ainda estamos trazendo todas as páginas do Google. A contagem de
//      pendências só vale quando a sincronização terminar."
//
// Nao estava a trazer nada. Nada corria. O aviso aparecia so porque
// `review_sync_completed_at` era nulo, e "nunca terminou" foi confundido com
// "ainda a decorrer". O dono ficava a espera de um trabalho que nao existia,
// sem nunca saber que havia um erro — e o erro trazia dentro dele exactamente
// o que era preciso fazer.
//
// Sao duas situacoes diferentes e precisam de duas mensagens diferentes. A que
// promete trabalho em andamento so pode aparecer quando NAO ha erro.
import { readFileSync } from 'node:fs';

const semComentariosTs = (fonte) => fonte
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');

const TELA = 'src/components/dashboard/reviews/FilaDeRespostas.tsx';
const HOOK = 'src/hooks/useGoogleBusinessReviewQueue.ts';
const tela = semComentariosTs(readFileSync(TELA, 'utf8'));
const hook = semComentariosTs(readFileSync(HOOK, 'utf8'));

// O comentario que explica esta correccao cita as duas mensagens pelo nome. Sem
// o strip, as asserções casariam com a EXPLICACAO em vez do codigo — verdes
// mesmo depois de alguem apagar o que elas guardam.
if (tela.includes('POR QUE ESTE GUARDA') || tela.includes('DUAS MENSAGENS DIFERENTES')) {
  console.error('O strip de comentarios nao funcionou; as asserções abaixo mediriam o texto explicativo.');
  process.exit(1);
}

const falhas = [];
let verificadas = 0;
const exigir = (rotulo, condicao) => { verificadas += 1; if (!condicao) falhas.push(rotulo); };

// 1. O MOTIVO CHEGA A TELA. Sem isto nao ha o que mostrar.
exigir('o hook nao le o last_error da ligacao; a tela nao teria como saber que falhou',
  /select\('status, last_error'\)/.test(hook));
exigir('o hook nao expoe o erro da sincronizacao',
  /syncError/.test(hook) && /return \{[^}]*syncError/.test(hook));

// 2. A MENSAGEM DE FALHA EXISTE, e mostra o motivo em vez de o esconder. O
//    motivo vem do Google e costuma dizer o que fazer.
exigir('a tela nao mostra a mensagem de falha da sincronizacao',
  /reviews\.google\.official\.syncFailed/.test(tela));
exigir('a tela nao mostra o motivo que o Google deu',
  /\{oficiais\.syncError\}/.test(tela));

// 3. AS DUAS NAO PODEM APARECER JUNTAS, e a que promete trabalho em andamento
//    NAO pode aparecer quando ha erro. Esta e a assercao que apanha o defeito.
const blocoIncompleto = tela.slice(
  tela.indexOf('!oficiais.syncComplete && !oficiais.syncError'),
  tela.indexOf('official.incomplete') + 40,
);
exigir('a mensagem "ainda estamos trazendo" pode aparecer mesmo com erro: falta excluir syncError',
  blocoIncompleto.length > 40 && /!oficiais\.syncError/.test(blocoIncompleto)
    && /official\.incomplete/.test(blocoIncompleto));
// A CONDICAO INTEIRA, e nao so `syncError`. A versao anterior desta assercao
// procurava `oficiais.syncError && (` — e casava com `!oficiais.syncError && (`
// do outro bloco, porque nada a impedia de casar com a forma NEGADA. Ficava
// verde com a mensagem de falha a aparecer sempre. Apanhado ao provar as
// mutacoes: tres ficaram vermelhas e esta nao.
exigir('a mensagem de falha aparece mesmo sem erro nenhum: falta exigir syncError na condicao',
  /!oficiais\.syncComplete && oficiais\.syncError && \(/.test(tela));

// 4. A CHAVE EXISTE NOS TRES IDIOMAS. Uma chave em falta mostra o nome dela ao
//    dono, no lugar da explicacao.
for (const locale of ['pt-BR', 'pt-PT', 'en']) {
  const dicionario = JSON.parse(readFileSync(`src/i18n/owner/locales/${locale}.json`, 'utf8'));
  const oficial = dicionario?.reviews?.google?.official || {};
  exigir(`${locale}: falta a chave reviews.google.official.syncFailed`,
    typeof oficial.syncFailed === 'string' && oficial.syncFailed.trim().length > 0);
}

if (falhas.length) {
  console.error('Aviso diz que falhou: %d protecao(oes) falharam.\n', falhas.length);
  for (const falha of falhas) console.error(' - %s', falha);
  process.exit(1);
}
console.log(`Aviso diz que falhou: ${verificadas} protecoes verdes.`);
