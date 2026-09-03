#!/usr/bin/env node
// O contato que o cliente deixou decide o botao — nao o nome da coluna.
//
// POR QUE ESTE GUARDA EXISTE
//
// A coluna chama-se `customer_email`, mas o formulario do QR aceita o que o
// cliente escrever. Em 03/09/2026, na producao, DEZ dos DEZ contatos deixados
// eram telefone e NENHUM era e-mail. Mesmo assim a tela mostrava "Enviar por
// e-mail" e montava `mailto:+5579999711500`, que nao abre nada em lado nenhum.
//
// Ou seja: o unico botao de accao do recado privado nunca funcionou, em 100%
// dos casos reais, durante todo o tempo em que existiu. Marcelo viu no ecra.
//
// E TAMBEM: a forma do recado.
//
// O mesmo ecra mostrava o rascunho como um bloco unico de texto, sem uma quebra
// de linha. Lido no WhatsApp, um paragrafo de seis frases e uma parede. O
// pedido ao modelo passou a exigir tres partes separadas por linha em branco, e
// um emoji apenas quando a nota nao e de reclamacao.
import { readFileSync } from 'node:fs';

const semComentariosTs = (fonte) => fonte
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');

const TELA = 'src/components/dashboard/ReplySuggestions.tsx';
const PEDIDO = 'supabase/functions/sugerir-resposta/index.ts';
const tela = semComentariosTs(readFileSync(TELA, 'utf8'));
const pedido = readFileSync(PEDIDO, 'utf8');

// Os comentarios destes dois ficheiros citam quase tudo o que as asserções
// procuram — `mailto`, `wa.me`, `emoji`. Sem o strip, elas casariam com a
// explicacao e ficariam verdes depois de alguem apagar o codigo.
if (tela.includes('O CONTATO DECIDE O BOTAO')) {
  console.error('O strip de comentarios nao funcionou na tela; as asserções mediriam a explicacao.');
  process.exit(1);
}

const falhas = [];
let verificadas = 0;
const exigir = (rotulo, condicao) => { verificadas += 1; if (!condicao) falhas.push(rotulo); };

// 1. O TIPO DO CONTATO E DECIDIDO, e nao assumido.
exigir('a tela nao classifica o contato; volta a assumir que todo contato e e-mail',
  /tipoDoContato/.test(tela) && /includes\('@'\)/.test(tela));

// 2. TELEFONE VAI PARA O WHATSAPP.
exigir('nao ha caminho para o WhatsApp; um telefone ficaria sem accao nenhuma',
  /https:\/\/wa\.me\//.test(tela));
exigir('o botao do WhatsApp nao esta preso ao contato ser telefone',
  /tipoDoContato === 'telefone' && \(/.test(tela));
// O `wa.me` recusa qualquer coisa que nao sejam digitos.
exigir('o numero vai para o wa.me sem limpar os simbolos, e o link nao abre',
  /replace\(\/\\D\/g, ''\)/.test(tela));

// 3. E-MAIL SO APARECE PARA E-MAIL. Este e o defeito original: o botao de
//    e-mail aparecia para um telefone.
exigir('o botao de e-mail volta a aparecer para um contato que nao e e-mail',
  /tipoDoContato === 'email' && \(/.test(tela));
exigir('o mailto continua a ser montado sem conferir o tipo do contato',
  !/customerEmail && \(\s*<Button/.test(tela));

// 4. O RECADO TEM FORMA. Tres partes, separadas por linha em branco.
exigir('o pedido ao modelo deixou de exigir a forma do recado; volta o bloco unico',
  /SHAPE\./.test(pedido) && /separated by a blank line/.test(pedido));
exigir('o pedido nao diz ao modelo para escrever a quebra de linha de verdade',
  /Write real line breaks in the JSON string/.test(pedido));

// 5. O EMOJI DEPENDE DA NOTA, e nao do gosto. Um emoji numa mensagem a quem
//    reclamou le-se como deboche.
exigir('a regra do emoji nao existe',
  /const EMOJI = \(nota: number \| null\)/.test(pedido));
exigir('o emoji nao esta proibido para quem reclamou',
  /NEVER use an emoji/.test(pedido));
exigir('o emoji nao tem tecto de um',
  /at most ONE emoji/.test(pedido));
exigir('a regra do emoji nao chega ao pedido privado',
  /\$\{EMOJI\(nota\)\}/.test(pedido));

// 6. AS CHAVES EXISTEM NOS TRES IDIOMAS.
for (const locale of ['pt-BR', 'pt-PT', 'en']) {
  const d = JSON.parse(readFileSync(`src/i18n/owner/locales/${locale}.json`, 'utf8'));
  exigir(`${locale}: falta a chave reply.sendWhatsapp`,
    typeof d?.reply?.sendWhatsapp === 'string' && d.reply.sendWhatsapp.trim().length > 0);
}

if (falhas.length) {
  console.error('Contato decide o canal: %d protecao(oes) falharam.\n', falhas.length);
  for (const falha of falhas) console.error(' - %s', falha);
  process.exit(1);
}
console.log(`Contato decide o canal: ${verificadas} protecoes verdes.`);
