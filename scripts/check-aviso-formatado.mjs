#!/usr/bin/env node
// O aviso chega formatado, e nunca se perde por causa da formatacao.
//
// Marcelo, em 01/09/2026, depois de ler um aviso de ensaio no Telegram: "voce
// pode editar ela melhor, deixar pontos importantes em negrito, fazer quebra de
// linha, enviar o link do dash ao final" e "podemos ter emojis pra nos ajudar a
// organizar a mensagem".
//
// O corpo e escrito UMA vez, com o negrito do WhatsApp (*assim*), e serve os
// dois canais. O WhatsApp desenha-o nativamente; o Telegram precisa de HTML, e
// ate esse dia recebia texto simples de proposito, com o raciocinio escrito no
// codigo: um caractere solto no texto de uma avaliacao real quebraria a
// mensagem inteira. O raciocinio estava certo e a conclusao era cara demais.
//
// O QUE ESTE GUARDA PROVA, correndo a conversao de verdade:
//
//   1. Que o texto do CLIENTE nao consegue injectar formatacao nenhuma.
//   2. Que um asterisco solto faz cair para texto simples, em vez de partir a
//      mensagem.
//   3. Que a rede de seguranca do envio existe: formatacao recusada pelo
//      Telegram repete em texto simples.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const DESPACHO = 'supabase/functions/telegram-dispatch/index.ts';
// A MIGRACAO NAO E APONTADA A MAO, E DESCOBERTA.
//
// `create or replace function` substitui o corpo inteiro: a funcao que o
// Postgres tem e a da ULTIMA migracao que a reescreve, e nao aquela em que o
// formato nasceu. Ate 02/09/2026 este caminho estava escrito a mao e apontava
// para `20260901200000_aviso_com_emoji_e_negrito.sql`. Depois do ramo do
// convite, a funcao viva passou a ser a de `20260902120000`, e as vinte e tal
// assercoes de formato abaixo (emojis, negrito, acentos, asterisco fora da
// citacao, citacao, contacto, link no fim, janelas de 5 e 15 minutos) ficaram
// a proteger um fossil: apagar o bloco da citacao da migracao nova deixava
// este guarda verde.
//
// Corrigir o caminho a mao resolvia hoje e voltava a partir-se na proxima
// migracao que tocasse na funcao, em silencio e da mesma maneira. Por isso ele
// e CALCULADO: as migracoes que contem o `create or replace` desta funcao,
// ordenadas pelo carimbo de data que abre o nome, e a ultima ganha. Uma
// migracao nova entra sozinha, e nao ha caminho para envelhecer.
const PASTA_DAS_MIGRACOES = 'supabase/migrations';
const ASSINATURA_DO_GATILHO = 'create or replace function public.notify_internal_feedback_whatsapp';
const migracoesDoGatilho = readdirSync(PASTA_DAS_MIGRACOES)
  .filter((nome) => nome.endsWith('.sql'))
  .filter((nome) => readFileSync(join(PASTA_DAS_MIGRACOES, nome), 'utf8').includes(ASSINATURA_DO_GATILHO))
  .sort();
if (migracoesDoGatilho.length === 0) {
  // Nenhuma migracao reescreve a funcao: nao ha o que verificar, e um guarda
  // que nao consegue verificar tem de ficar vermelho em vez de parecer verde.
  console.error(
    'Aviso formatado: nao encontrei nenhuma migracao com "%s" em %s.',
    ASSINATURA_DO_GATILHO, PASTA_DAS_MIGRACOES,
  );
  process.exit(1);
}
const MIGRACAO = join(PASTA_DAS_MIGRACOES, migracoesDoGatilho[migracoesDoGatilho.length - 1]);
// O RESUMO MUDOU DE CASA EM 02/09/2026.
//
// Ele era montado dentro do materializador, numa funcao que so sabia escrever
// mensagem curta. Quando o e-mail entrou como canal, a composicao saiu de la
// para `_shared/relatorioSemanal.ts` e passou a servir os dois formatos a
// partir da mesma leitura — senao haveria duas versoes do mesmo relatorio a
// divergir sem ninguem ver. As duas assercoes abaixo seguiram o codigo: elas
// protegem o resumo, e nao o ficheiro onde ele morava.
const RESUMO = 'supabase/functions/_shared/relatorioSemanal.ts';

// O cabecalho da migracao CITA o texto antigo, sem acentos, para explicar o que
// mudou. As assercoes sobre o portugues tem de ler so a parte executavel, senao
// apanham a propria explicacao e ficam vermelhas por dizer a verdade.
const semComentariosSql = (fonte) => fonte.replace(/^\s*--[^\n]*$/gm, '');

const despacho = readFileSync(DESPACHO, 'utf8');
const migracao = readFileSync(MIGRACAO, 'utf8');
const resumo = readFileSync(RESUMO, 'utf8');

const falhas = [];
let verificadas = 0;
const exigir = (rotulo, condicao) => { verificadas += 1; if (!condicao) falhas.push(rotulo); };

// A conversao, extraida do proprio arquivo e EXECUTADA. Procurar por
// `replace(/&/g` provaria que a linha existe, nao que ela protege.
const inicio = despacho.indexOf('export const paraHtmlDoTelegram');
const fim = despacho.indexOf('Deno.serve(');
if (inicio < 0 || fim <= inicio) {
  console.error('Aviso formatado: nao encontrei a conversao em %s.', DESPACHO);
  process.exit(1);
}
const corpo = despacho.slice(inicio, fim)
  .replace('export const paraHtmlDoTelegram = (texto: string): string | null =>', 'const paraHtmlDoTelegram = (texto) =>');
const paraHtml = new Function(`${corpo}\nreturn paraHtmlDoTelegram;`)();

// 1. O negrito nosso vira negrito.
exigir('um par de asteriscos vira negrito', paraHtml('Deixou *nota 2 de 5*.') === 'Deixou <b>nota 2 de 5</b>.');
exigir('varios pares na mesma mensagem viram varios negritos',
  paraHtml('*Um* e *dois*') === '<b>Um</b> e <b>dois</b>');

// 2. O cliente NAO consegue injectar formatacao. Escapar antes de converter e a
// ordem que garante isto: ao contrario, o `<b>` dele sobreviveria.
const injeccao = paraHtml('💬 "Isto e *mau* <b>a serio</b> & tal"');
exigir('o cliente nao consegue abrir uma etiqueta HTML', injeccao !== null && !injeccao.includes('<b>a serio'));
exigir('a etiqueta do cliente aparece como texto, tal como ele a escreveu',
  injeccao !== null && injeccao.includes('&lt;b&gt;a serio&lt;/b&gt;'));
exigir('o E comercial do cliente e escapado', injeccao !== null && injeccao.includes('&amp;'));
exigir('o negrito nosso continua a funcionar ao lado disso', injeccao !== null && injeccao.includes('<b>mau</b>'));

// 3. Asterisco impar cai para texto simples, em vez de partir a mensagem.
exigir('um asterisco solto desliga a formatacao', paraHtml('Comprei 3 * 4 unidades e *isto* ficou') === null);
exigir('texto sem asterisco nenhum nao e formatado', paraHtml('Aviso simples, sem negrito.') === null);
// Um par que atravesse linhas nao e um par: seria negrito a comecar no sitio
// errado e a acabar noutro paragrafo.
exigir('um par que atravessa quebra de linha desliga a formatacao',
  paraHtml('*abre aqui\ne fecha* na linha de baixo') === null);

// 4. Os emojis e as quebras de linha atravessam intactos.
const comEmoji = paraHtml('🔴 *Comentário privado agora*\n\n💬 "texto"\n\n👉 https://binno.pro/reviews');
exigir('os emojis atravessam a conversao', comEmoji !== null && comEmoji.startsWith('🔴 <b>'));
exigir('as quebras de linha atravessam a conversao', comEmoji !== null && comEmoji.split('\n').length === 5);

// 5. A REDE DE SEGURANCA no envio. Sem ela, uma formatacao recusada pelo
// Telegram perderia o aviso, e este guarda estaria a proteger a coisa errada.
exigir('o envio repete em texto simples quando a formatacao e recusada',
  /if \(formatado !== null && \(!resposta\.ok \|\| corpoDaResposta\?\.ok !== true\)\) \{[\s\S]{0,160}enviar\(corpo, false\)/.test(despacho));
exigir('a repeticao manda o corpo ORIGINAL, e nao o escapado',
  /resposta = await enviar\(corpo, false\);/.test(despacho));
exigir('a formatacao so e pedida ao Telegram quando ha o que formatar',
  /\.\.\.\(comFormatacao \? \{ parse_mode: 'HTML' \} : \{\}\)/.test(despacho));

// 6. A ORIGEM: o asterisco sai do texto do cliente antes de entrar na mensagem.
// Sem isto, um asterisco do cliente emparelha com os nossos e poe negrito no
// sitio errado, ou desliga a formatacao da mensagem inteira.
exigir('o comentario do cliente entra sem asteriscos',
  /comentario := nullif\(btrim\(replace\(coalesce\(new\.feedback_text, ''\), '\*', ''\)\), ''\);/.test(migracao));
// O CONTACTO MUDOU DE FORMA EM 05/09/2026, E A PROPRIEDADE NAO.
// Ate hoje as duas colunas do contacto entravam pelo mesmo caminho, e contar
// duas ocorrencias de `replace(..., '*', '')` media as duas de uma vez.
// Agora `customer_email` — que guarda um numero de WhatsApp — deixou de entrar
// como texto: ou vira digitos para o link `wa.me`, ou nao entra de todo. Contar
// dois `replace` passou a medir uma coisa que nao existe.
// As duas assercoes abaixo medem cada ponta do que sobrou: o nome continua
// domado, e o numero so entra reduzido a digitos.
exigir('o nome do cliente entra sem asteriscos',
  /contato := nullif\(btrim\(replace\(coalesce\(new\.customer_name, ''\), '\*', ''\)\), ''\);/.test(migracao));
exigir('o numero so entra no aviso reduzido a digitos, nunca como texto do cliente',
  /telefone := regexp_replace\(telefone, '\\D', '', 'g'\);/.test(migracao)
  // UMA UNICA LEITURA DA COLUNA, e ela e a que atribui `telefone`. Se alguem
  // acrescentar uma segunda — imprimir o contacto em bruto numa linha do aviso,
  // por exemplo — passam a ser duas, e esta assercao fica vermelha.
  && (migracao.match(/new\.customer_email/g) || []).length === 1
  && /telefone := nullif\(btrim\(coalesce\(new\.customer_email, ''\)\), ''\);/.test(migracao));
// O nome do negocio vem do Google e um asterisco dele emparelha com os nossos.
// A `opportunity.phrase` que esta assercao media ate 02/09/2026 deixou de vir no
// retrato da coleta, e o que sobrou a proteger e o nome — que e o unico texto do
// resumo que o Binno nao escreveu.
// O nome passou a ser domado em `nomeDoNegocio` (02/09/2026): alem do
// asterisco, ele colapsa espacos — uma quebra de linha no nome do Google
// sobrevivia ao `trim` e chegava ao assunto do e-mail — e poe um tecto de
// comprimento, porque um nome de cinco mil caracteres fazia o corpo passar o
// `check` de 4096 da fila e o resumo desaparecia em silencio.
exigir('o texto que vem do Google entra no resumo sem asteriscos',
  /export const semAsterisco = \(texto: string\): string => texto\.replace\(\/\\\*\/g, ''\);/.test(resumo)
  && /const domado = semAsterisco\(limpo\);/.test(resumo)
  && /const nome = nomeDoNegocio\(negocio\.name\);/.test(resumo));

// 7. O que Marcelo pediu, no texto: negrito, quebras de linha, link no fim.
exigir('o aviso do comentario privado tem negrito', /\*Comentário privado agora\*/.test(migracao));
// A citacao do cliente e o meio da mensagem: e o que o dono abre o telemovel
// para ler. Nenhuma das assercoes acima a media, e apagar este bloco deixava o
// guarda verde mesmo depois de ele passar a ler a migracao certa. Foi o
// cenario nomeado na revisao final do ramo, em 02/09/2026.
exigir('o aviso traz a citacao do cliente, com o emoji que a marca',
  /array_append\(linhas, format\('💬 "%s"', comentario\)\);/.test(migracao));
// O CONTACTO DEIXOU DE SER UMA LINHA SO, em 05/09/2026: o Marcelo pediu que o
// numero fosse clicavel. `📱 Contato deixado: +55...` nao e reconhecido como
// endereco pelo WhatsApp — virou um nome numa linha e um `wa.me` sozinho na
// seguinte, porque um link colado a outro texto deixa de ser clicavel.
// O que continua a ser medido e o mesmo: o contacto tem marca propria, e o
// link ocupa a sua propria linha.
exigir('o contacto deixado continua marcado com o proprio emoji',
  /array_append\(linhas, format\('👤 %s', contato\)\);/.test(migracao));
exigir('o link de conversa fica sozinho na linha, para o WhatsApp o reconhecer',
  /array_append\(linhas, format\('https:\/\/wa\.me\/%s', telefone\)\);/.test(migracao));
exigir('o aviso do comentario privado acaba no link do painel',
  /array_append\(linhas, '👉 https:\/\/binno\.pro\/reviews'\);/.test(migracao));
// O RESUMO ACABA NUM PASSO, e nao apenas num link. Mudou em 02/09/2026, na
// auditoria: um retrato sem nota, sem historico e sem nada por responder — um
// negocio recem-colhido — produzia tres linhas, o nome e o endereco. O contrato
// diz que todo relatorio acaba num passo, e a versao curta nao o cumpria.
exigir('o resumo acaba no passo a dar, com o link do painel',
  /linhas\.push\(`👉 \$\{semAsterisco\(passo\.titulo\)\}: \$\{PAINEL_DAS_RESPOSTAS\}`\);/.test(resumo)
  && /export const PAINEL_DAS_RESPOSTAS = 'https:\/\/binno\.pro\/reviews';/.test(resumo));
exigir('o aviso separa os blocos com linha em branco',
  (migracao.match(/array_append\(linhas, ''\)/g) || []).length >= 3);

// 8. E o portugues. As frases foram escritas sem acentos na pressa do bloqueio
// do WhatsApp, e e o dono que as le, com um prospecto ao lado.
const migracaoExecutavel = semComentariosSql(migracao);
exigir('a mensagem acumulada deixou de dizer "comentarios" sem acento',
  !/comentarios privados desde o ultimo aviso/.test(migracaoExecutavel)
  && /comentários privados\* desde o último aviso/.test(migracaoExecutavel));
exigir('a mensagem acumulada de elogios tambem foi acentuada',
  !/elogios escritos desde o ultimo aviso/.test(migracaoExecutavel)
  && /elogios escritos\* desde o último aviso/.test(migracaoExecutavel));

// 9. E a REGRA de quando avisar nao pode mudar com o texto. Estas linhas sao a
// razao de a demonstracao poder falhar em silencio se alguem mexer nelas.
//
// A PRIMEIRA REGRA MUDOU EM 05/09/2026, por decisao do Marcelo, e a assercao
// mudou com ela. Ate esse dia era "nota ausente nao avisa", e estava certa:
// nota ausente nao existia na pratica, porque a tela do QR injectava 3 antes de
// o cliente tocar em nada. Corrigida a tela, a nota ausente passou a ser o caso
// COMUM — o cliente que so escreve —, e manter a regra antiga trocaria "avisa a
// mais" por "nao avisa".
//
// A decisao dele: avisar, sem cor de reclamacao. Diz-se o que se sabe (houve
// comentario) e nao se inventa o que nao se sabe (a opiniao).
exigir('comentario sem nota avisa, e nao se cala',
  /if new\.rating is null then[\s\S]{0,220}especie := 'feedback-sem-nota';/.test(migracao));
exigir('sem nota e sem texto continua a nao avisar ninguem',
  /if new\.rating is null then\s+if comentario is null then\s+return new;/.test(migracao));
exigir('a queixa continua a calar-se 5 minutos', /especie := 'feedback';\s+janela := interval '5 minutes';/.test(migracao));
exigir('o elogio com texto continua a calar-se 15 minutos', /especie := 'feedback-praise';\s+janela := interval '15 minutes';/.test(migracao));
exigir('o elogio sem texto continua a nao avisar', /else\s+return new;\s+end if;/.test(migracao));

if (falhas.length) {
  console.error('Aviso formatado: %d protecao(oes) falharam.\n', falhas.length);
  for (const falha of falhas) console.error(' - %s', falha);
  process.exit(1);
}
console.log(`Aviso formatado: ${verificadas} protecoes verdes.`);
