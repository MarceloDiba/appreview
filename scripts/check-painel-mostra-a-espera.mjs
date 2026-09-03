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
exigir('a tela chama o hook uma vez, para todo o dono',
  /const aEsperar = useRespostaAEsperar\(userId\);/.test(tela));

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
// O texto mostrado tem de ser o que veio do banco (o que foi mesmo enviado),
// nunca o rascunho editavel da caixa de texto ao lado, que o dono pode ja ter
// alterado sem ainda ter respondido "1".
exigir('o aviso mostra o texto que foi mesmo enviado ao WhatsApp, e nao o rascunho editavel',
  /respostaAEsperar\.rascunho/.test(componente));
exigir('o aviso diz que o rascunho foi enviado ao WhatsApp',
  /waitingWhatsappTitle/.test(componente));
exigir('o aviso diz que responder "1" publica',
  /waitingWhatsappInstruction/.test(componente));
// As duas chaves tem de estar SO dentro deste componente: se aparecerem
// noutro sitio da tela, o aviso deixou de estar preso a avaliacao a que ele
// se refere e pode vazar para itens que nao tem nada a espera.
const foraDoComponente = tela.slice(0, inicioComponente) + tela.slice(fimComponente);
exigir('as chaves do aviso nao aparecem fora do componente da publicacao oficial',
  !/waitingWhatsapp(Title|Instruction)/.test(foraDoComponente));

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
