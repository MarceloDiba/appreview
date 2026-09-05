#!/usr/bin/env node
// O toque no botao vale tanto como escrever "1".
//
// POR QUE ESTE GUARDA EXISTE
//
// Marcelo apanhou isto a ler o proprio produto, em 04/09/2026: "botao e 1
// toque, digitar 1 e enviar sao 2". Para um produto que promete UM clique, o
// botao de resposta rapida nao e um extra — e a promessa.
//
// MAS O BOTAO NAO DEVOLVE "1". A Meta manda `type: 'button'` com o texto (ou o
// payload) do botao, e nao um `text.body`. Um webhook que so leia texto ignora
// o toque em silencio: o dono carrega, nada acontece, e parece que o produto o
// ignorou. E o pior sintoma que ha, porque nao ha erro nenhum a mostrar.
//
// E O ROTULO TEM DE BATER com o que esta escrito no modelo da Meta. Se alguem
// renomear o botao la e nao aqui, volta o mesmo silencio.
import { readFileSync } from 'node:fs';

const CAMINHO = 'supabase/functions/whatsapp-cloud-webhook/index.ts';
const bruto = readFileSync(CAMINHO, 'utf8');
const fonte = bruto
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');

if (fonte.includes('O QUE CONTA COMO')) {
  console.error('O strip de comentarios nao funcionou; as asserções mediriam a explicacao.');
  process.exit(1);
}

// Corre a decisao de verdade, em vez de a ler.
const inicio = bruto.indexOf('const CONFIRMACOES');
const fim = bruto.indexOf('const registarBatida');
if (inicio === -1 || fim <= inicio) {
  console.error('Nao achei a lista de confirmacoes. Sem ela, nada abaixo mede o que diz medir.');
  process.exit(1);
}
const corpo = bruto.slice(inicio, fim).replace('const ehConfirmacao = (texto: string) =>', 'const ehConfirmacao = (texto) =>');
const { ehConfirmacao } = await import(
  'data:text/javascript,' + encodeURIComponent(corpo + '\nexport { ehConfirmacao };')
);

const falhas = [];
let verificadas = 0;
const exigir = (rotulo, condicao) => { verificadas += 1; if (!condicao) falhas.push(rotulo); };

// 1. AS DUAS FORMAS DE DIZER SIM.
exigir('escrever "1" deixou de confirmar; e o que sai dentro da janela de 24h',
  ehConfirmacao('1'));
exigir('o toque no botao deixou de confirmar; o rotulo tem de bater com o modelo da Meta',
  ehConfirmacao('Publicar no Google'));
exigir('o rotulo do botao so confirma com a caixa exacta',
  ehConfirmacao('PUBLICAR NO GOOGLE') && ehConfirmacao('publicar no google '));

// 2. E O QUE NAO E SIM CONTINUA A NAO SER. Uma lista generosa de mais publica
//    no perfil publico de alguem por engano, e isso nao se desfaz.
for (const nao of ['nao', 'depois', '2', 'muda o texto', 'quem e', '']) {
  exigir(`"${nao}" passou a contar como confirmacao`, !ehConfirmacao(nao));
}

// 3. O WEBHOOK LE O BOTAO. Sem isto, tudo acima fica verde e o toque continua
//    a ser ignorado — a lista aceita o rotulo, mas o rotulo nunca la chega.
exigir('o webhook nao le mensagens do tipo `button`',
  /mensagem\.type === 'button'/.test(fonte));
// A LISTA CRESCEU EM 05/09/2026 e a assercao tinha o literal fixo. Passou a
// exigir os membros, e nao a lista exacta: uma quarta forma de dizer sim nao
// pode fazer este guarda dar vermelho por existir.
exigir('o webhook aceita o toque em botao na porta de entrada',
  /\.includes\(mensagem\.type/.test(fonte)
  && /\['text', 'button', 'interactive'\]/.test(fonte));

// UM RASCUNHO NUNCA SAI SEM BOTAO, e esta e a regra que o produto vende.
// Marcelo, 05/09/2026: "vendemos a ideia de um clique, nao adianta querer mudar
// isso a essa altura".
//
// A primeira versao do envio interactivo caia para texto simples — sem botao —
// quando o corpo passava dos 1024 caracteres. Perguntava "o texto cabe?" em vez
// de "o clique sobrevive?". Como a mensagem e PREVIA e nao carga (o que vai
// para o Google e lido do banco), encurtar a previa e barato e perder o botao
// nao e. O guarda recusa qualquer condicao de tamanho a decidir a forma.
const despacho = readFileSync('supabase/functions/whatsapp-cloud-dispatch/index.ts', 'utf8');
exigir('o rascunho dentro da janela vai sempre em forma interactiva',
  /if \(janelaAberta && ehRascunho\) \{/.test(despacho));
exigir('nenhuma condicao de tamanho decide se o rascunho leva botao',
  !/cabeNoInteractivo/.test(despacho)
  && !/length <= 1024 [\s\S]{0,80}\? \{ type: 'text'/.test(despacho));
// E A PREVIA ENCURTA-SE EM VEZ DE PERDER O CLIQUE.
exigir('a previa e encurtada quando nao cabe, em vez de cair para texto',
  /slice\(0, 1023\)/.test(despacho));
// A LINHA QUE MANDA DIGITAR "1" SAI QUANDO HA BOTAO. Com o botao no ecra ela
// contradiz a promessa. Continua no corpo que o Telegram recebe, porque la nao
// ha botao — o gatilho em SQL serve os dois canais.
exigir('a instrucao de digitar 1 e removida da mensagem com botao',
  /Responda \\\*1\\\* para publicar no Google/.test(despacho));

// A TERCEIRA FORMA. Dentro da janela de 24h o rascunho vai como mensagem
// `interactive`, que leva o corpo inteiro E o botao — antes ia texto simples,
// completo e SEM nada para tocar. Marcelo recebeu um assim com a janela aberta
// por vinte e quatro minutos.
//
// O toque nela NAO chega como `button`: chega em `interactive.button_reply`.
// Ler so as duas formas antigas fazia o toque cair no vazio — o dono carrega,
// nada acontece, e conclui que o produto o ignorou.
exigir('o webhook le o toque no botao interactivo',
  /mensagem\.interactive\?\.button_reply\?\.id/.test(fonte));
exigir('o tipo da mensagem declara o botao interactivo',
  /interactive\?: \{[^}]*button_reply/.test(fonte));
// E o `id` vem antes do titulo, pela mesma razao do payload: nao muda com a
// traducao do rotulo.
exigir('o webhook le o id do botao interactivo antes do titulo',
  /button_reply\?\.id \|\| mensagem\.interactive\?\.button_reply\?\.title/.test(fonte));
// O payload primeiro: e o que nao muda quando alguem traduz o rotulo.
exigir('o webhook le o rotulo antes do payload; traduzir o botao partiria a confirmacao',
  /mensagem\.button\?\.payload \|\| mensagem\.button\?\.text/.test(fonte));
// E o tipo tem de estar declarado, senao o TypeScript nao deixa ler.
exigir('o tipo da mensagem nao declara o botao',
  /button\?: \{ text\?: string; payload\?: string \}/.test(fonte));

if (falhas.length) {
  console.error('O botao e um toque: %d protecao(oes) falharam.\n', falhas.length);
  for (const f of falhas) console.error(' - %s', f);
  process.exit(1);
}
console.log(`O botao e um toque: ${verificadas} protecoes verdes.`);
