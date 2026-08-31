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
const { lerEstadoDaLigacao, ESTADOS_QUE_PROVAM_ENTREGA, JANELA_DE_PROVA_EM_DIAS } = await import(pathToFileURL(modulo).href);

// Instante fixo, para a janela de prova ser medida e não observada. Um guarda
// que use `new Date()` dos dois lados testa sempre "agora contra agora".
const agora = new Date('2026-08-31T12:00:00.000Z');
const haDias = (dias) => new Date(agora.getTime() - dias * 24 * 60 * 60 * 1_000).toISOString();

const falhas = [];
let verificadas = 0;
const exigir = (rotulo, condicao) => { verificadas += 1; if (!condicao) falhas.push(rotulo); };

// 1. Os três estados que exigem aceitação do outro lado, e só eles, provam
//    ligação. `accepted` é gravado pelo retransmissor quando o OpenWA aceitou a
//    mensagem; `delivered` e `read` vêm do webhook do WhatsApp.
for (const status of ['accepted', 'delivered', 'read']) {
  exigir(
    `um teste em "${status}" deixou de contar como ligação ativa, e a tela passa a esconder uma ligação que existe`,
    lerEstadoDaLigacao({ status, updatedAt: agora.toISOString() }) === 'ativa',
  );
}

// 2. `queued` e `sending` NÃO provam ligação nenhuma: é exatamente o que o
//    Binno grava com o WhatsApp desligado. Esta é a asserção que importa, e a
//    razão de este guarda existir.
for (const status of ['queued', 'sending']) {
  exigir(
    `um teste em "${status}" passou a ser lido como ligação ativa. A tela afirmaria uma ligação que ninguém confirmou: é o estado que o Binno grava mesmo com o WhatsApp desligado.`,
    lerEstadoDaLigacao({ status, updatedAt: agora.toISOString() }) === 'a-caminho',
  );
}

// 3. As falhas terminais dizem que falhou, e não que está a caminho.
for (const status of ['failed', 'skipped', 'cancelled']) {
  exigir(
    `um teste em "${status}" deixou de ser lido como falha, e a tela deixaria o dono à espera de uma mensagem que não vem`,
    lerEstadoDaLigacao({ status, updatedAt: agora.toISOString() }) === 'falhou',
  );
}

// 4. Nenhum teste registado é "ainda não testámos", não é "desligado". A tela
//    oferece o teste em vez de afirmar que algo está errado.
for (const vazio of [null, undefined, { status: '', updatedAt: agora.toISOString() }]) {
  exigir(
    'sem teste nenhum o estado deixou de ser "sem-teste"',
    lerEstadoDaLigacao(vazio, agora) === 'sem-teste',
  );
}

// 4b. A janela de prova. "Funcionou uma vez" não é "está de pé agora": sem
//     isto, um `delivered` de há seis semanas dizia "ligação ativa" para
//     sempre, mesmo com a sessão do OpenWA despareada no dia seguinte.
exigir(
  'a janela de prova deixou de ser os sete dias decididos em 31/08/2026',
  JANELA_DE_PROVA_EM_DIAS === 7,
);
exigir(
  'um teste entregue dentro da janela deixou de contar como ligação ativa',
  lerEstadoDaLigacao({ status: 'delivered', updatedAt: haDias(6) }, agora) === 'ativa',
);
exigir(
  'um teste entregue há mais de uma semana voltou a ser lido como ligação ativa: a tela afirmaria que o canal está de pé com base numa observação que já não diz nada sobre agora',
  lerEstadoDaLigacao({ status: 'delivered', updatedAt: haDias(8) }, agora) === 'expirado',
);
exigir(
  'um teste entregue sem data legível passou a contar como ligação ativa, e a frescura deixou de poder ser mostrada',
  lerEstadoDaLigacao({ status: 'accepted', updatedAt: 'nao-e-uma-data' }, agora) === 'expirado',
);

// 5. Um estado que ninguém previu nunca pode cair em "ativa". Se o esquema da
//    outbox ganhar um estado novo amanhã, o pior que acontece é a tela dizer
//    que ainda não há confirmação.
exigir(
  'um estado desconhecido passou a ser lido como ligação ativa: o padrão do mapeamento deixou de ser o lado seguro',
  lerEstadoDaLigacao({ status: 'estado-que-nao-existe', updatedAt: agora.toISOString() }) === 'a-caminho',
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
const funcaoDaEdge = ler('supabase/functions/whatsapp-notifications/index.ts');
const clienteDaEntrega = ler('src/lib/whatsappDelivery.ts');

// A versão anterior desta asserção pedia que a linha CONTIVESSE uma chamada ao
// módulo: `/const estadoDaLigacao = [^;]*lerEstadoDaLigacao\(/`. Ela ficava
// verde com `const estadoDaLigacao = true ? 'ativa' : lerEstadoDaLigacao(...)`,
// e a versão que ela aprovou tinha exatamente essa forma, com `aceiteLocal` no
// lugar do `true`. Conferir a presença de um nome não é conferir o valor que
// chega à tela.
//
// Passa a exigir que a expressão INTEIRA seja a chamada, e nada mais: sem
// ternário, sem `||`, sem literal ao lado.
const atribuicao = tela.match(/const estadoDaLigacao = ([^;]+);/);
exigir('a tela do WhatsApp deixou de calcular estadoDaLigacao.', atribuicao !== null);
if (atribuicao) {
  exigir(
    'o estado da ligação deixou de ser exatamente o que o módulo devolve: há um atalho ao lado da regra honesta, e é o atalho que decide o que a tela afirma',
    /^lerEstadoDaLigacao\([^;]*\)$/.test(atribuicao[1].trim()),
  );
  // A forma da chamada nao basta. `lerEstadoDaLigacao(aceiteLocal ? {status:
  // 'accepted', updatedAt: agora} : ultimoTeste)` satisfaz a regra acima e
  // reintroduz o atalho inteiro, so que dentro do parenteses: o modulo passa a
  // julgar um registo forjado em vez do ultimo teste que o servidor devolveu.
  // Por isso o argumento tambem e preso: ele tem de ser o registo vindo do
  // servidor, sem ramo e sem objeto construido ali.
  const argumento = atribuicao[1].trim().replace(/^lerEstadoDaLigacao\(/, '').replace(/\)$/, '').trim();
  exigir(
    'o argumento deixou de ser o ultimo teste vindo do servidor: um registo forjado ali dentro faz o modulo honesto julgar uma prova inventada',
    /^[A-Za-z_$][\w$]*$/.test(argumento),
  );
}

// E o valor tem de ser o que a tela DESENHA. Sem isto, apagar todo o uso e
// manter o import ficava verde.
exigir(
  'o estado calculado deixou de decidir o que a tela mostra',
  /const mostrandoFormulario = [^;]*estadoDaLigacao[^;]*;/.test(tela)
  && /\{mostrandoFormulario \?/.test(tela),
);

// O último teste é consultado como último teste, no servidor. A versão anterior
// pescava-o de uma lista de dez entregas de qualquer tipo, e dez avisos mais
// recentes escondiam-no: um dono com a ligação a funcionar lia "nunca testou".
exigir(
  'a consulta do último teste deixou de ser filtrada por kind no servidor: dez avisos mais recentes voltam a esconder o teste do dono',
  /\.eq\('kind', 'test'\)[\s\S]{0,120}\.limit\(1\)/.test(funcaoDaEdge),
);
exigir(
  'o cliente deixou de trazer o último teste consultado à parte',
  /lastTest: data\.last_test \? toDelivery\(data\.last_test\) : null/.test(clienteDaEntrega),
);
exigir(
  'a tela voltou a pescar o teste de dentro da lista de entregas recentes, em vez de usar o que o servidor consultou por kind',
  /setUltimoTeste\(state\.lastTest\)/.test(tela) && !/deliveries\.find\(/.test(tela),
);

// 7. Depois de o teste passar, a tela mostra só o estado e o botão de refazer.
//    O formulário de teste fica no outro lado do ternário, e é isso que faz o
//    "apenas" da decisão ser verdade.
// 7. Depois de o teste passar, a tela mostra só o estado e o botão de refazer.
//    E o botão TEM DE FUNCIONAR. A versão anterior destas duas asserções pedia
//    que `sendTest` estivesse ausente do ramo ativo, o que descrevia o beco sem
//    saída em vez de o proibir: `refazer` limpava variáveis, a linha antiga
//    continuava na outbox, o estado voltava a "ativa" e o mesmo painel
//    redesenhava-se. O formulário ficava inalcançável para sempre e o guarda
//    abençoava isso.
const ramoAtivo = tela.match(/\) : \(([\s\S]*?)\)\}\s*<\/CardContent>/);
exigir('o ramo de ligação ativa deixou de existir na tela do WhatsApp.', ramoAtivo !== null);
if (ramoAtivo) {
  exigir(
    'o ramo de ligação ativa deixou de mostrar o estado ou o botão de refazer o teste',
    ramoAtivo[1].includes("t('whatsappPilot.ligacaoAtiva')") && ramoAtivo[1].includes("t('whatsappPilot.testeRefazer')"),
  );
  exigir(
    'o painel de ligação ativa deixou de mostrar apenas o estado e o botão de refazer',
    !ramoAtivo[1].includes('sendTest') && !ramoAtivo[1].includes('Checkbox'),
  );
  exigir(
    'o botão de refazer deixou de estar ligado a `refazer`',
    /onClick=\{refazer\}/.test(ramoAtivo[1]),
  );
}

// 7b. E o caminho de volta ao formulário existe de verdade. Estas três são a
//     correção do beco sem saída, e é por elas que "Refazer o teste" deixa de
//     ser um enfeite em produção.
exigir(
  '`refazer` deixou de reabrir o formulário: sem estado próprio, a linha entregue de antes mantém a tela em "ativa" e o botão não faz nada',
  /const refazer = \(\) => \{[\s\S]{0,200}?setRefazendo\(true\)/.test(tela),
);
exigir(
  'o formulário deixou de ser alcançável com a ligação ativa: `mostrandoFormulario` voltou a depender só do estado da ligação',
  /const mostrandoFormulario = refazendo \|\| estadoDaLigacao !== 'ativa';/.test(tela),
);
exigir(
  'o formulário reaberto deixou de poder enviar um teste novo',
  /\{mostrandoFormulario \? \([\s\S]{0,3000}?void sendTest\(\)/.test(tela),
);
// Entrar no formulário com a ligação ativa não pode virar a mesma armadilha ao
// contrário: quem mudou de ideia volta sem ter de testar.
exigir(
  'quem entra no formulário com a ligação ativa deixou de poder voltar sem testar',
  /const voltar = \(\) => \{[\s\S]{0,200}?setRefazendo\(false\)/.test(tela)
  && /refazendo && estadoDaLigacao === 'ativa' &&[\s\S]{0,200}onClick=\{voltar\}/.test(tela),
);

// 8. O contrato precisa continuar a registar a regra, com os estados nomeados.
//    Uma regra viva no código e apagada do documento é a mesma contradição que
//    este projeto já pagou mais de uma vez.
const contrato = ler('docs/contrato-produto-binno.md');
exigir(
  'docs/contrato-produto-binno.md deixou de registrar quais estados de entrega provam a ligação do WhatsApp',
  /`accepted`, `delivered` ou `read`/.test(contrato),
);
exigir(
  'docs/contrato-produto-binno.md deixou de registrar a janela de prova de sete dias',
  /JANELA_DE_PROVA_EM_DIAS/.test(contrato) && /sete dias/.test(contrato),
);
exigir(
  'docs/contrato-produto-binno.md deixou de corrigir o que `accepted` realmente prova',
  /a chamada HTTP do\s+retransmissor ao OpenWA devolveu 2xx/.test(contrato),
);

if (falhas.length) {
  console.error('Ligação do WhatsApp: %d proteção(ões) falharam.\n', falhas.length);
  for (const falha of falhas) console.error(' - %s', falha);
  process.exit(1);
}
console.log(`Ligação do WhatsApp: ${verificadas} proteções verdes.`);
