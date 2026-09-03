#!/usr/bin/env node
// Toda saida de falha do callback do Google diz por que falhou.
//
// POR QUE ESTE GUARDA EXISTE
//
// Em 03/09/2026 o botao "Buscar locais no Google" devolveu um 502 mudo: a
// funcao sabia o motivo exato e nao o registava em lado nenhum, e isso custou
// uma ida e volta inteira ate alguem instrumentar o codigo. O
// `google-business-oauth-callback` tem o mesmo defeito multiplicado: varios
// caminhos diferentes terminam no mesmo `redirectToApp("failed")`, e sem um
// log distinto antes de cada um, "falhou" e tudo o que sobra — nao da para
// saber se foi estado invalido, estado expirado, token recusado ou falha ao
// gravar.
//
// Este guarda nao confia em ver o codigo "parecer certo": ele conta as saidas
// de falha e os motivos registados, e falha se sobrar alguma saida muda.
import { readFileSync } from 'node:fs';

const CALLBACK = 'supabase/functions/google-business-oauth-callback/index.ts';
const AVALIACOES = 'supabase/functions/fetch-google-reviews/index.ts';

const semComentarios = (fonte) => fonte
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');

const callback = semComentarios(readFileSync(CALLBACK, 'utf8'));

const falhas = [];
let verificadas = 0;
const exigir = (rotulo, condicao) => { verificadas += 1; if (!condicao) falhas.push(rotulo); };

// A asserção central do plano: nenhuma saída de falha pode ficar sem motivo
// registado antes dela. ">=", e não "===", porque um motivo extra (por
// exemplo, um log de contexto adicional) não é o defeito que este guarda
// caça — o defeito é a saída SEM nenhum.
const saidasDeFalha = (callback.match(/redirectToApp\("failed"\)/g) || []).length;
const motivosRegistados = (callback.match(/console\.error\("Callback do Google:/g) || []).length;
exigir('cada saida de falha do callback diz por que falhou',
  motivosRegistados >= saidasDeFalha);

// Pelo menos uma saída de falha tem de existir: se o número cair a zero, é
// sinal de que alguém apagou o tratamento de erro inteiro, e a asserção
// acima passaria (0 >= 0) sem pegar nada.
exigir('o callback ainda tem saidas de falha para instrumentar',
  saidasDeFalha > 0);

// Um motivo repetido em dois lugares diferentes é tão mudo quanto nenhum
// motivo: quem ler o log não consegue distinguir qual dos dois caminhos foi.
// Isto obriga cada console.error a nomear uma causa que nenhum outro nomeia.
const mensagens = [...callback.matchAll(/console\.error\("(Callback do Google: [^"]+)"/g)]
  .map((match) => match[1]);
exigir('nenhum motivo registado no callback se repete (cada um distingue uma causa)',
  new Set(mensagens).size === mensagens.length);

// O mesmo 502 mudo existia em fetch-google-reviews: a função lia o corpo da
// resposta do Google, mas só regatava status e status-enum, nunca a
// mensagem. "Google recusou em" é o mesmo prefixo que sync-google-business-profile
// usa, para caber num único filtro de log.
const avaliacoes = readFileSync(AVALIACOES, 'utf8');
exigir('fetch-google-reviews regista o motivo da recusa do Google, e nao so o codigo HTTP',
  /Google recusou em/.test(avaliacoes));

if (falhas.length) {
  console.error('Saidas de falha do callback: %d protecao(oes) falharam.\n', falhas.length);
  for (const falha of falhas) console.error(' - %s', falha);
  process.exit(1);
}
console.log(`Saidas de falha do callback: ${verificadas} protecoes verdes.`);
