#!/usr/bin/env node
// Uma resposta ja publicada no Google continua alcancavel para correcao.
//
// POR QUE ESTE GUARDA EXISTE
//
// Em 03/09/2026 o Binno publicou uma resposta em INGLES no perfil publico de
// um cliente real. Descoberto o erro, a resposta ficou la: o Google aceita
// sobrescrever — `publish-reply` e um PUT — mas o painel escondia a avaliacao
// assim que ela ganhava resposta (`.is('reply_text', null)`), e nao havia
// porta de volta. O dono ficou com um erro publico e nenhuma forma de o
// corrigir sem sair do produto.
//
// O que este guarda mede nao e a existencia de um botao: e que as tres pecas
// do caminho continuem ligadas — o banco devolve as respondidas, a tela
// recebe-as, e o botao chama a MESMA publicacao que sobrescreve.
import { readFileSync } from 'node:fs';

const semComentarios = (texto) => texto
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');

const HOOK = semComentarios(readFileSync('src/hooks/useGoogleBusinessReviewQueue.ts', 'utf8'));
const TELA = semComentarios(readFileSync('src/components/dashboard/reviews/RespostasPublicadas.tsx', 'utf8'));
const FILA = semComentarios(readFileSync('src/components/dashboard/reviews/FilaDeRespostas.tsx', 'utf8'));

if (HOOK.includes('perfil publico do Daniel') || TELA.includes('resposta em INGLES')) {
  console.error('O strip de comentarios nao funcionou; as asserções mediriam a explicacao.');
  process.exit(1);
}

const falhas = [];
let verificadas = 0;
const exigir = (rotulo, condicao) => { verificadas += 1; if (!condicao) falhas.push(rotulo); };

// 1. O BANCO DEVOLVE AS RESPONDIDAS. Sem esta busca nao ha nada para corrigir.
exigir('o hook deixou de buscar as avaliacoes que ja tem resposta',
  /\.not\('reply_text',\s*'is',\s*null\)/.test(HOOK));
exigir('o hook deixou de devolver a lista das respondidas',
  /return \{[^}]*\brespondidas\b/.test(HOOK));

// 2. E A FILA CONTINUA A SER SO O QUE FALTA. Se a busca da fila perder o
// filtro, "N esperando resposta" passa a SUBIR a cada resposta publicada.
exigir('a fila deixou de excluir as ja respondidas; o numero de pendentes passaria a subir ao responder',
  /\.is\('reply_text',\s*null\)/.test(HOOK));

// 3. A TELA RECEBE-AS. A prop ligada e o que distingue a lista de existir e a
// lista de aparecer.
exigir('a lista de respostas publicadas deixou de ser montada na tela',
  /<RespostasPublicadas/.test(FILA));
exigir('a lista de respostas publicadas deixou de receber as respondidas do hook',
  /respondidas=\{oficiais\.respondidas\}/.test(FILA));

// 4. O BOTAO CHAMA A PUBLICACAO QUE SOBRESCREVE. Um botao que abre o editor e
// nao publica deixaria tudo acima verde e o erro no ar.
exigir('a correcao deixou de receber a funcao que publica no Google',
  /publicar=\{oficiais\.publishReply\}[\s\S]{0,200}?\/>/.test(
    FILA.slice(FILA.indexOf('<RespostasPublicadas'))));
exigir('a tela de correcao deixou de chamar `publicar`',
  /await publicar\(avaliacao\.id, rascunho\.trim\(\)\)/.test(TELA));

// 5. CORRIGIR NAO E PUBLICAR. Publicar acrescenta o que nao existia; corrigir
// APAGA o que o cliente ja pode ter lido. O botao so acorda com texto NOVO —
// um clique distraido nao reescreve o perfil de ninguem.
exigir('o botao de substituir deixou de exigir que o texto tenha mudado',
  /rascunho\.trim\(\) !== publicada\.trim\(\)/.test(TELA)
  && /disabled=\{publicando \|\| !mudou\}/.test(TELA));
exigir('o editor de correcao deixou de abrir fechado; substituir passaria a ser um clique so',
  /useState\(false\)/.test(TELA) && /!aCorrigir \?/.test(TELA));

if (falhas.length) {
  console.error('Corrigir resposta publicada: %d protecao(oes) falharam.\n', falhas.length);
  for (const f of falhas) console.error(' - %s', f);
  process.exit(1);
}
console.log(`Corrigir resposta publicada: ${verificadas} protecoes verdes.`);
