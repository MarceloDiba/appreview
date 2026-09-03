#!/usr/bin/env node
// Responder a avaliacao pela propria mensagem, sem abrir o painel.
//
// POR QUE ESTE GUARDA EXISTE
//
// Esta e a frase que Marcelo quer poder dizer na pagina de vendas: "Responda as
// avaliacoes do Google Maps direto do seu WhatsApp em 1 clique". Uma frase de
// venda que deixa de ser verdade e pior do que uma que nunca se disse, e ha
// quatro maneiras de esta deixar de ser verdade em silencio:
//
//   1. O caminho de volta desaparecer. Ate 03/09/2026 o Binno so FALAVA — nao
//      havia webhook nenhum, e "responda 1" nao tinha onde aterrar.
//   2. Alguem publicar direto do webhook. A Meta espera resposta em
//      milissegundos e repete quando demora; publicar ali vira resposta
//      duplicada no perfil publico de um cliente.
//   3. A assinatura da Meta deixar de ser conferida. O endereco e publico:
//      sem ela, qualquer pessoa envia um "1" em nome de um dono.
//   4. A janela de 24 horas ser ignorada. Fora dela a Meta so aceita modelo
//      aprovado, e um envio recusado e um aviso que nao chega.
import { readFileSync } from 'node:fs';

const semComentariosTs = (fonte) => fonte
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
const semComentariosSql = (fonte) => fonte.replace(/^\s*--[^\n]*$/gm, ' ');

const enviador = semComentariosTs(readFileSync('supabase/functions/whatsapp-cloud-dispatch/index.ts', 'utf8'));
const webhook = semComentariosTs(readFileSync('supabase/functions/whatsapp-cloud-webhook/index.ts', 'utf8'));
const publicador = semComentariosTs(readFileSync('supabase/functions/publicar-respostas-confirmadas/index.ts', 'utf8'));
const migracao = semComentariosSql(readFileSync('supabase/migrations/20260903200000_whatsapp_oficial_e_resposta_por_mensagem.sql', 'utf8'));

const falhas = [];
let verificadas = 0;
const exigir = (rotulo, condicao) => { verificadas += 1; if (!condicao) falhas.push(rotulo); };

// 1. O CAMINHO DE VOLTA EXISTE, e responde ao aperto de mao do registo.
exigir('o webhook responde ao desafio de verificacao da Meta',
  /hub\.mode.*subscribe/s.test(webhook) && /hub\.challenge/.test(webhook));
exigir('o webhook anota que o dono escreveu, e nao so quando ele confirma',
  /ultima_mensagem_recebida_em: new Date\(\)\.toISOString\(\)/.test(webhook));

// 2. O WEBHOOK NAO PUBLICA. Marca, e sai.
exigir('o webhook nao fala com o Google',
  !/googleapis\.com/.test(webhook));
exigir('o webhook so marca a confirmacao',
  /confirmar_resposta_do_dono/.test(webhook));
// Sempre 200: outra coisa faz a Meta repetir o evento, e repetir significa
// confirmar duas vezes.
exigir('o webhook devolve sempre 200 ao fim, para a Meta nao repetir o evento',
  /return json\(\{ recebido: true \}\);\s*\}\);?\s*$/.test(webhook.trimEnd()));

// 3. A ASSINATURA. O endereco e publico.
exigir('o webhook confere a assinatura da Meta antes de acreditar no corpo',
  /x-hub-signature-256/.test(webhook) && /assinaturaConfere\(corpo/.test(webhook));
exigir('sem segredo do app, o webhook recusa em vez de confiar',
  /if \(!appSecret\) \{/.test(webhook));
// Comparar com `===` deixa escapar o tempo, e o tempo diz quantos caracteres
// iniciais estao certos.
exigir('a assinatura e comparada em tempo constante',
  /diferenca \|= esperado\.charCodeAt\(i\) \^ recebido\.charCodeAt\(i\)/.test(webhook));

// 4. A JANELA DE 24 HORAS decide a forma da mensagem.
exigir('o enviador pergunta se a janela esta aberta antes de escolher a forma',
  /janela_de_texto_livre_aberta/.test(enviador));
exigir('fora da janela vai modelo, dentro vai texto livre',
  /janelaAberta \|\| !modelo/.test(enviador)
  && /type: 'template'/.test(enviador) && /type: 'text'/.test(enviador));
exigir('a janela e perguntada na hora de enviar, e nao na hora de enfileirar',
  enviador.indexOf('claim_whatsapp_outbox_por_canal') < enviador.indexOf('janela_de_texto_livre_aberta'));

// 5. NUNCA PUBLICAR DUAS VEZES. O estrago e publico e nao se desfaz.
exigir('a marca de publicado e escrita ANTES da chamada ao Google',
  publicador.indexOf("update({ publicado_em: new Date().toISOString() })")
    < publicador.indexOf('mybusiness.googleapis.com'));
// A ASSERCAO ANTERIOR ERA VACUA e so uma mutacao o mostrou: ela procurava
// `.is('publicado_em', null)` em qualquer sitio do ficheiro, e a CONSULTA que
// lista os pedidos ja tem essa linha. Apagar a mesma condicao da RESERVA — que
// e a unica que impede duas execucoes de publicarem a mesma resposta — deixava
// o guarda verde. Agora le-se so o bloco da reserva.
const reserva = publicador.slice(
  publicador.indexOf("update({ publicado_em:"),
  publicador.indexOf('const falhar'),
);
exigir('o bloco da reserva foi encontrado, senao nada abaixo prova nada', reserva.length > 60);
exigir('a reserva so pega quem ainda nao foi publicado',
  reserva.length > 60 && /\.is\('publicado_em', null\)/.test(reserva));
exigir('so pode haver uma resposta a espera por dono',
  /create unique index if not exists respostas_a_confirmar_uma_por_dono/.test(migracao));

// 6. O PRAZO. Um "1" de tres dias depois e sobre outra coisa.
exigir('a resposta a confirmar expira em 24 horas',
  /expira_em timestamptz not null default \(now\(\) \+ interval '24 hours'\)/.test(migracao));
exigir('a confirmacao recusa o que ja expirou',
  /and expira_em > now\(\)/.test(migracao));
exigir('o que expira e limpo sozinho, senao bloqueia o indice unico',
  /perform public\.recusar_respostas_expiradas\(\);/.test(migracao));

// 7. O QUE CONTA COMO SIM e uma lista literal e curta. "Parece um sim" publica
// no perfil publico de alguem por engano.
exigir('a lista de confirmacoes e literal, e nao uma adivinhacao',
  /const CONFIRMACOES = \[/.test(webhook) && !/includes\(limpo\.slice/.test(webhook));

// 8. O canal novo e o agendamento.
exigir('a fila aceita o canal meta-cloud',
  /'meta-cloud'::text/.test(migracao));
exigir('o WhatsApp oficial e drenado a cada minuto, como o Telegram',
  /cron\.schedule\('binno-whatsapp-oficial', '\* \* \* \* \*'/.test(migracao));
exigir('a publicacao tambem corre a cada minuto: o dono esta a olhar para o telemovel',
  /cron\.schedule\('binno-publicar-respostas', '\* \* \* \* \*'/.test(migracao));

// 9. Sem chave, a fila ESPERA. Marcar falhado apagaria avisos por causa de uma
// configuracao que falta.
exigir('sem o token da Meta a fila espera, e nao falha',
  /WHATSAPP_CLOUD_SEM_CHAVE/.test(enviador));
exigir('a chave e conferida ANTES de reservar linhas',
  enviador.indexOf('WHATSAPP_CLOUD_SEM_CHAVE') < enviador.indexOf('claim_whatsapp_outbox_por_canal'));

if (falhas.length) {
  console.error('Responder pelo WhatsApp: %d protecao(oes) falharam.\n', falhas.length);
  for (const falha of falhas) console.error(' - %s', falha);
  process.exit(1);
}
console.log(`Responder pelo WhatsApp: ${verificadas} protecoes verdes.`);
