#!/usr/bin/env node
// A ligação do WhatsApp é um teste só, e a tela nunca afirma uma ligação que
// não foi confirmada.
//
// Decisão de Marcelo em 31/08/2026, registada em `docs/contrato-produto-binno.md`
// na secção "Painel que cabe no celular". A parte difícil não era o desenho, era
// descobrir o que o código sabe de facto: a sessão local do piloto só existe em
// desenvolvimento, e o backend responder ao pedido de preferências prova que o
// backend está de pé, não que exista WhatsApp do outro lado. O que existe é o
// estado da mensagem em `whatsapp_outbox`.
//
// Este guarda EXECUTA `src/lib/whatsappConnection.ts` estado a estado, em vez de
// procurar texto. Uma asserção que só confere se a string 'accepted' aparece no
// arquivo fica verde com o mapeamento invertido.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const raiz = process.cwd();
const ler = (caminho) => readFileSync(resolve(raiz, caminho), 'utf8');

const modulo = resolve(raiz, 'src/lib/whatsappConnection.ts');
const { lerEstadoDaLigacao, ESTADOS_QUE_PROVAM_ENTREGA } = await import(pathToFileURL(modulo).href);

const falhas = [];
const exigir = (rotulo, condicao) => { if (!condicao) falhas.push(rotulo); };

// 1. Os três estados que exigem aceitação do outro lado, e só eles, provam
//    ligação. `accepted` é gravado pelo retransmissor quando o OpenWA aceitou a
//    mensagem; `delivered` e `read` vêm do webhook do WhatsApp.
for (const status of ['accepted', 'delivered', 'read']) {
  exigir(
    `um teste em "${status}" deixou de contar como ligação ativa, e a tela passa a esconder uma ligação que existe`,
    lerEstadoDaLigacao(status) === 'ativa',
  );
}

// 2. `queued` e `sending` NÃO provam ligação nenhuma: é exatamente o que o
//    Binno grava com o WhatsApp desligado. Esta é a asserção que importa, e a
//    razão de este guarda existir.
for (const status of ['queued', 'sending']) {
  exigir(
    `um teste em "${status}" passou a ser lido como ligação ativa. A tela afirmaria uma ligação que ninguém confirmou: é o estado que o Binno grava mesmo com o WhatsApp desligado.`,
    lerEstadoDaLigacao(status) === 'a-caminho',
  );
}

// 3. As falhas terminais dizem que falhou, e não que está a caminho.
for (const status of ['failed', 'skipped', 'cancelled']) {
  exigir(
    `um teste em "${status}" deixou de ser lido como falha, e a tela deixaria o dono à espera de uma mensagem que não vem`,
    lerEstadoDaLigacao(status) === 'falhou',
  );
}

// 4. Nenhum teste registado é "ainda não testámos", não é "desligado". A tela
//    oferece o teste em vez de afirmar que algo está errado.
for (const vazio of [null, undefined, '']) {
  exigir(
    'sem teste nenhum o estado deixou de ser "sem-teste"',
    lerEstadoDaLigacao(vazio) === 'sem-teste',
  );
}

// 5. Um estado que ninguém previu nunca pode cair em "ativa". Se o esquema da
//    outbox ganhar um estado novo amanhã, o pior que acontece é a tela dizer
//    que ainda não há confirmação.
exigir(
  'um estado desconhecido passou a ser lido como ligação ativa: o padrão do mapeamento deixou de ser o lado seguro',
  lerEstadoDaLigacao('estado-que-nao-existe') === 'a-caminho',
);

exigir(
  'a lista de estados que provam entrega mudou sem passar por aqui',
  Array.isArray([...ESTADOS_QUE_PROVAM_ENTREGA])
  && [...ESTADOS_QUE_PROVAM_ENTREGA].join(',') === 'accepted,delivered,read',
);

// 6. A tela tem de usar este módulo, e o estado tem de vir do último teste
//    registado. Ler `deliveries[0]` sem filtrar por `kind` faria um alerta
//    entregue passar por prova de que o teste do dono chegou.
const tela = ler('src/components/dashboard/WhatsAppNotificationWorkspace.tsx');
exigir(
  'a tela do WhatsApp deixou de derivar o estado da ligação de lerEstadoDaLigacao',
  /const estadoDaLigacao = [^;]*lerEstadoDaLigacao\(/.test(tela),
);
exigir(
  'a tela do WhatsApp deixou de ler o último teste pelo kind "test": um alerta entregue passaria por prova de que o teste do dono chegou',
  /deliveries\.find\(\(delivery\) => delivery\.kind === 'test'\)/.test(tela),
);

// 7. Depois de o teste passar, a tela mostra só o estado e o botão de refazer.
//    O formulário de teste fica no outro lado do ternário, e é isso que faz o
//    "apenas" da decisão ser verdade.
const ramoAtivo = tela.match(/estadoDaLigacao === 'ativa' \? \(([\s\S]*?)\) : \(/);
exigir('o ramo de ligação ativa deixou de existir na tela do WhatsApp.', ramoAtivo !== null);
if (ramoAtivo) {
  exigir(
    'o ramo de ligação ativa deixou de mostrar o estado ou o botão de refazer o teste',
    ramoAtivo[1].includes("t('whatsappPilot.ligacaoAtiva')") && ramoAtivo[1].includes("t('whatsappPilot.testeRefazer')"),
  );
  exigir(
    'o formulário de teste voltou a aparecer depois de a ligação estar ativa: a tela deixou de mostrar apenas o estado e o botão de refazer',
    !ramoAtivo[1].includes('sendTest') && !ramoAtivo[1].includes('Checkbox'),
  );
}

// 8. O contrato precisa continuar a registar a regra, com os estados nomeados.
//    Uma regra viva no código e apagada do documento é a mesma contradição que
//    este projeto já pagou mais de uma vez.
const contrato = ler('docs/contrato-produto-binno.md');
exigir(
  'docs/contrato-produto-binno.md deixou de registrar quais estados de entrega provam a ligação do WhatsApp',
  /`accepted`, `delivered` ou `read`/.test(contrato),
);

if (falhas.length) {
  console.error('Ligação do WhatsApp: %d proteção(ões) falharam.\n', falhas.length);
  for (const falha of falhas) console.error(' - %s', falha);
  process.exit(1);
}
console.log('Ligação do WhatsApp: 21 proteções verdes.');
