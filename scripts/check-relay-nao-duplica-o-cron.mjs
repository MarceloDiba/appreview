#!/usr/bin/env node
// O relé da VPS não agenda. Ele envia.
//
// POR QUE ESTE GUARDA EXISTE
//
// Ate 03/09/2026, `dispatch()` chamava `materialize-whatsapp-notifications` a
// cada volta do laco. O laco corre de 10 em 10 segundos. Sao 8.640 chamadas por
// dia a uma funcao que enfileira o resumo SEMANAL de cada dono.
//
// E o cron `binno-resumo-semanal` ja chamava a mesma funcao de 15 em 15
// minutos. Ou seja, 8.640 chamadas por dia a duplicar um trabalho que 96 ja
// faziam — mais de metade do tecto gratuito de invocacoes do Supabase gasto
// numa duplicacao que ninguem via, porque uma chamada que devolve 200 nao
// acorda ninguem.
//
// O ERRO E FACIL DE REPETIR: quem esta a olhar para o laco de envio e a pensar
// "e preciso garantir que a fila esta cheia antes de a esvaziar" volta a por a
// chamada aqui. A fila enche-se sozinha, e quem a enche tem hora marcada.
//
// ESTE GUARDA LE UM FICHEIRO QUE NAO CORRE NO SUPABASE. O relé vive numa VPS,
// em Docker, e o repositorio e so a fonte dele. Um `verify` verde aqui nao
// prova que a VPS foi actualizada — prova que a proxima implantacao nao leva o
// defeito de volta.
import { readFileSync } from 'node:fs';

const CAMINHO = 'services/openwa-relay/src/server.mjs';
const bruto = readFileSync(CAMINHO, 'utf8');

// O comentario que explica esta correccao cita o nome da funcao. Sem retirar os
// comentarios, a assercao casaria com a EXPLICACAO e ficaria verde depois de
// alguem repor a chamada.
const fonte = bruto
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');

if (fonte.includes('SAIU DAQUI') || fonte.length < 500) {
  console.error('O strip de comentarios nao funcionou; a assercao mediria o texto explicativo.');
  process.exit(1);
}

const falhas = [];
let verificadas = 0;
const exigir = (rotulo, condicao) => { verificadas += 1; if (!condicao) falhas.push(rotulo); };

// 1. O RELE NAO CHAMA O AGENDADOR. Esta e a assercao inteira do ficheiro.
exigir('o relé voltou a chamar materialize-whatsapp-notifications; a cada 10s isso sao 8.640 chamadas/dia a duplicar o cron binno-resumo-semanal',
  !/materialize-whatsapp-notifications/.test(fonte));

// 2. E CONTINUA A FAZER O QUE E DELE. Se o laco perdesse tambem o envio, o
//    guarda acima ficaria verde por o ficheiro ter deixado de fazer tudo.
exigir('o relé deixou de reclamar a fila; o guarda acima passaria por o ficheiro nao fazer nada',
  /claim_whatsapp_outbox/.test(fonte));
exigir('o relé deixou de enviar',
  /setInterval\(runDispatch/.test(fonte));

// 3. E SO A FILA DELE. `claim_whatsapp_outbox` filtra por `openwa` no banco;
//    um dia em que o relé passe a reclamar todos os canais, ele volta a roubar
//    mensagens do Telegram — ja aconteceu, em 31/08/2026.
exigir('o relé passou a reclamar a fila por canal generico; ja roubou mensagem do Telegram uma vez',
  !/claim_whatsapp_outbox_por_canal/.test(fonte) || /'openwa'/.test(fonte));

if (falhas.length) {
  console.error('Relé não duplica o cron: %d protecao(oes) falharam.\n', falhas.length);
  for (const falha of falhas) console.error(' - %s', falha);
  process.exit(1);
}
console.log(`Relé não duplica o cron: ${verificadas} protecoes verdes.`);
