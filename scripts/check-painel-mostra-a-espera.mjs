#!/usr/bin/env node
// O painel mostra o que esta a espera de um "1" no WhatsApp.
//
// POR QUE ESTE GUARDA EXISTE
//
// O Binno vai passar a mandar, pelo WhatsApp, um rascunho de resposta a uma
// avaliacao, pedindo que o dono responda "1" para publicar no Google. Sem o
// painel mostrar isso, o dono nao sabe que ja existe uma resposta a espera, e
// pode responder duas vezes a mesma avaliacao: uma pelo telemovel, outra pelo
// painel.
//
// Este guarda prova tres coisas, e as tres tem de continuar verdadeiras:
//
//   1. O painel LE `respostas_a_confirmar` filtrando pelas tres condicoes que
//      decidem se uma resposta ainda vale: nao confirmada, nao recusada, nao
//      expirada. Falhar qualquer uma mostra ao dono uma resposta que ja nao
//      vale, ou esconde uma que ainda vale.
//   2. O painel NUNCA escreve nessa tabela. Uma confirmacao vinda do
//      navegador nao provaria que a pessoa respondeu no WhatsApp — e e essa
//      prova que autoriza publicar no perfil publico dela. So o servidor
//      pode confirmar (RLS da migracao `20260903200000`: o dono so tem
//      politica de SELECT; insert/update/delete estao revogados de `anon` e
//      `authenticated`).
//   3. O aviso aparece no sitio certo, ligado a avaliacao certa: dentro do
//      bloco da publicacao oficial do Google, comparado pelo id que essa
//      origem usa, mostrando o texto que foi mesmo enviado e a instrucao de
//      responder "1", nos tres idiomas do painel.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const semComentariosTs = (fonte) => fonte
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');

const HOOK = 'src/hooks/useRespostaAEsperar.ts';
const TELA = 'src/components/dashboard/reviews/FilaDeRespostas.tsx';

const hook = semComentariosTs(readFileSync(HOOK, 'utf8'));
const tela = semComentariosTs(readFileSync(TELA, 'utf8'));

const falhas = [];
let verificadas = 0;
const exigir = (rotulo, condicao) => { verificadas += 1; if (!condicao) falhas.push(rotulo); };

// ---------------------------------------------------------------------------
// 1. A LEITURA. Tres condicoes, uma de cada vez: uma mutacao em qualquer uma
// tem de deixar exatamente a assercao dela vermelha, e nenhuma outra.
// ---------------------------------------------------------------------------
exigir('o hook le a tabela respostas_a_confirmar',
  /\.from\('respostas_a_confirmar'\)/.test(hook));
exigir('o hook filtra por nao confirmada (confirmado_em nulo)',
  /\.is\('confirmado_em', null\)/.test(hook));
exigir('o hook filtra por nao recusada (recusado_em nulo)',
  /\.is\('recusado_em', null\)/.test(hook));
exigir('o hook filtra por nao expirada (expira_em no futuro)',
  /\.gt\('expira_em', new Date\(\)\.toISOString\(\)\)/.test(hook));
// Nao pedido pelo plano, mas e a mesma familia de protecao: sem isto, um RLS
// mal escrito no futuro nao seria apanhado aqui, so em producao.
exigir('o hook so pede as linhas deste dono',
  /\.eq\('user_id', userId\)/.test(hook));

// ---------------------------------------------------------------------------
// 2. NUNCA ESCREVE. Varre o painel inteiro, nao so o hook: um componente novo
// que passasse a escrever em `respostas_a_confirmar` sem tocar no hook
// ficaria invisivel se a busca fosse so a um ficheiro.
// ---------------------------------------------------------------------------
const arquivosDoPainel = [];
const varrer = (diretorio) => {
  for (const entrada of readdirSync(diretorio, { withFileTypes: true })) {
    const caminho = join(diretorio, entrada.name);
    if (entrada.isDirectory()) { varrer(caminho); continue; }
    if (/\.(ts|tsx)$/.test(entrada.name)) arquivosDoPainel.push(caminho);
  }
};
varrer('src');

// Janela de 400 caracteres depois do nome da tabela: larga o bastante para
// apanhar uma cadeia de metodos encadeados no mesmo `supabase.from(...)`,
// curta o bastante para nao acusar um verbo de escrita que more noutra
// consulta, mais abaixo no mesmo ficheiro.
const semEscritaEmRespostasAConfirmar = (caminho) => {
  const fonte = semComentariosTs(readFileSync(caminho, 'utf8'));
  let cursor = 0;
  for (;;) {
    const posicao = fonte.indexOf('respostas_a_confirmar', cursor);
    if (posicao < 0) return true;
    const janela = fonte.slice(posicao, posicao + 400);
    if (/\.(insert|update|upsert|delete)\(/.test(janela)) return false;
    cursor = posicao + 1;
  }
};

const arquivosComATabela = arquivosDoPainel.filter((caminho) =>
  readFileSync(caminho, 'utf8').includes('respostas_a_confirmar'));
// Se isto ficar vazio, a busca abaixo passa sem ter verificado nada — o
// oposto de um guarda.
exigir('pelo menos um ficheiro do painel fala desta tabela, senao a busca de escrita nao prova nada',
  arquivosComATabela.length > 0);
for (const caminho of arquivosComATabela) {
  exigir(`${caminho}: nao escreve em respostas_a_confirmar`, semEscritaEmRespostasAConfirmar(caminho));
}

// ---------------------------------------------------------------------------
// 3. O AVISO NO SITIO CERTO.
// ---------------------------------------------------------------------------
exigir('a tela importa o hook',
  /import \{ useRespostaAEsperar, type RespostaAEsperar \} from '@\/hooks\/useRespostaAEsperar';/.test(tela));
// CONTA as chamadas em vez de casar com a forma da linha. A asserção antiga
// exigia `const aEsperar = useRespostaAEsperar(userId);` e ficou vermelha
// quando o hook passou a devolver tambem o `refresh` — vermelha por a mudanca
// aprovada ter acontecido, que e a maneira mais certa de ensinar alguem a
// desligar um guarda. O que importa nao e o formato da atribuicao: e que o
// hook seja chamado UMA vez, com o dono, e nao um por cartao.
const chamadasDoHook = (tela.match(/useRespostaAEsperar\(/g) || []).length;
exigir(`a tela chama o hook ${chamadasDoHook} vezes; tem de ser exactamente uma, para todo o dono`,
  chamadasDoHook === 1);
exigir('a chamada do hook nao recebe o dono',
  /useRespostaAEsperar\(userId\)/.test(tela));

const inicioComponente = tela.indexOf('const PublicacaoOficial');
const fimComponente = tela.indexOf('const ItemDaFilaCard');
exigir('o componente da publicacao oficial continua legivel, senao nada abaixo prova nada',
  inicioComponente >= 0 && fimComponente > inicioComponente);
const componente = tela.slice(inicioComponente, fimComponente);

// A comparacao tem de ser pelo id NA FONTE (idNaFonte), que e o mesmo que
// `google_business_reviews.id` e que `respostas_a_confirmar.review_id`
// referencia. Comparar com `item.id` compararia com o id PREFIXADO da fila
// somada (`google-oficial:...`, ver `idDaFila` em filaDeRespostas.ts) e nunca
// bateria com nada.
exigir('a comparacao usa o id na fonte da avaliacao oficial, nao o id prefixado da fila somada',
  /aEsperar\?\.reviewId === item\.idNaFonte/.test(componente));

// AVALIACAO JA TRATADA NAO MOSTRA O AVISO.
//
// Achado na ronda de correcao 1, em 03/09/2026, e ele e o motivo de esta
// tarefa existir. O dono publicava a resposta pelo proprio painel (o botao
// esta no mesmo cartao) ou respondia direto no app do Google, fora do Binno —
// e o aviso continuava a dizer "responda 1 no WhatsApp para publicar" por cima
// de uma avaliacao que ja tinha resposta publicada.
//
// Sao as DUAS VERDADES EM DOIS SITIOS que esta tarefa foi escrita para
// eliminar, reintroduzidas no unico canto que nenhuma das outras asserções
// olhava. A condicao tem de olhar para o estado do item, e nao so para o id.
exigir('o aviso aparece mesmo sobre uma avaliacao ja respondida: falta olhar para item.is_addressed',
  /item\.is_addressed !== true/.test(componente));

// E O AVISO TEM DE SUMIR SOZINHO.
//
// Sem revalidar, `aEsperar` fica preso no valor lido no primeiro carregamento
// da pagina. O dono publica, o cartao passa para "Ja respondidas", e o aviso
// so desaparece quando ele recarregar — ou seja, continua a mentir durante
// todo o tempo em que ele estiver a olhar.
exigir('publicar pelo painel nao rele a tabela: o aviso ficaria preso ate a pagina recarregar',
  /revalidarAEsperar\(\)/.test(componente));
exigir('o hook nao expoe como reler; a tela nao teria como revalidar depois de publicar',
  /refresh/.test(hook));

// A RELEITURA NAO PODE APLICAR RESULTADO VELHO.
//
// Passa a haver duas maneiras de disparar a busca (a montagem e o `refresh`),
// e elas podem responder fora de ordem. Sem numerar as buscas, a mais lenta
// sobrescreve a mais nova e o aviso reaparece depois de ja ter sumido.
exigir('duas buscas podem responder fora de ordem e a mais velha sobrescreve a mais nova',
  /geracaoRef/.test(hook) && /minhaGeracao !== geracaoRef\.current/.test(hook));
// O texto mostrado tem de ser o que veio do banco (o que foi mesmo enviado),
// nunca o rascunho editavel da caixa de texto ao lado, que o dono pode ja ter
// alterado sem ainda ter publicado.
exigir('o aviso mostra o texto que foi mesmo enviado ao WhatsApp, e nao o rascunho editavel',
  /respostaAEsperar\.rascunho/.test(componente));

// O AVISO MUDOU DE SITIO EM 05/09/2026, E A REGRA PASSA A MEDIR O QUE IMPORTA.
//
// Ele vivia dentro de `PublicacaoOficial`, e estas assercoes exigiam que as
// chaves estivessem la — a co-localizacao era o proxy para "o aviso esta preso
// a avaliacao certa". Ao acrescentar o botao de recusar e o modo de leitura, o
// componente passou o limite de complexidade do `lint:portao`, e o aviso foi
// extraido para `JaFoiParaOWhatsApp`.
//
// O intento nao mudou: o aviso continua preso a uma avaliacao, porque so e
// desenhado sob `respostaAEsperar &&` e recebe o texto por parametro. O que
// mudou foi o mecanismo. Medir a co-localizacao aqui daria vermelho a uma
// extracao que melhora o codigo, e verde a um vazamento que passasse a chave
// por outro caminho.
exigir('o aviso e desenhado so quando ha rascunho a espera desta avaliacao',
  /\{respostaAEsperar && <JaFoiParaOWhatsApp rascunho=\{respostaAEsperar\.rascunho\} \/>\}/
    .test(componente));
exigir('o aviso diz que o rascunho foi enviado ao WhatsApp',
  /waitingWhatsappTitle/.test(tela));
exigir('o aviso diz o que fazer para publicar',
  /waitingWhatsappInstruction/.test(tela));
// E AS CHAVES CONTINUAM A VIVER NUM SITIO SO. Agora esse sitio e o componente
// extraido: se aparecerem noutro lado, o aviso deixou de estar preso a
// avaliacao a que se refere e pode vazar para itens sem nada a espera.
const inicioDoAviso = tela.indexOf('const JaFoiParaOWhatsApp');
const fimDoAviso = tela.indexOf('\n};', inicioDoAviso);
if (inicioDoAviso === -1 || fimDoAviso === -1) {
  exigir('o componente do aviso existe e foi encontrado para ser medido', false);
}
const foraDoAviso = tela.slice(0, inicioDoAviso) + tela.slice(fimDoAviso);
exigir('as chaves do aviso nao aparecem fora do componente do aviso',
  !/waitingWhatsapp(Title|Instruction)/.test(foraDoAviso));

// As tres traducoes: cada chave usada pela tela tem de existir, com texto,
// nos tres idiomas do painel — check-owner-i18n.mjs ja prova isto de forma
// generica para o catalogo inteiro; aqui prova-se que ESTAS DUAS chaves,
// especificamente, sao as que a Task 3 pediu, no sitio onde o resto da fila
// oficial ja busca (`reviews.google.official`).
for (const locale of ['pt-BR', 'pt-PT', 'en']) {
  const catalogo = JSON.parse(readFileSync(`src/i18n/owner/locales/${locale}.json`, 'utf8'));
  const official = catalogo?.reviews?.google?.official ?? {};
  for (const chave of ['waitingWhatsappTitle', 'waitingWhatsappInstruction']) {
    exigir(`${locale}: a chave reviews.google.official.${chave} existe e nao esta vazia`,
      typeof official[chave] === 'string' && official[chave].trim().length > 0);
  }
}

if (falhas.length) {
  console.error('Painel mostra a espera: %d protecao(oes) falharam.\n', falhas.length);
  for (const falha of falhas) console.error(' - %s', falha);
  process.exit(1);
}
console.log(`Painel mostra a espera: ${verificadas} protecoes verdes.`);
