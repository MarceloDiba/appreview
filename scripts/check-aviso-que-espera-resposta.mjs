#!/usr/bin/env node
// O aviso oferece um rascunho E grava o que o "1" quer dizer, na mesma
// transacao.
//
// POR QUE ESTE GUARDA EXISTE
//
// Ate 03/09/2026 o caminho de volta estava construido inteiro e nunca podia
// disparar: havia webhook a ouvir, tabela a guardar e drenador a publicar, mas
// NADA criava a resposta a espera. O "1" que a mensagem pedia nao tinha o que
// confirmar. `public.oferecer_rascunho` e a peca que fechou esse buraco, e o
// que ela promete e facil de partir sem ninguem dar por isso:
//
//   1. Alguem separar os dois `insert`. Enfileirar o aviso e gravar a resposta
//      a espera sao os dois lados da mesma promessa — a mensagem diz "responda
//      1", e a linha e o unico sitio onde esta escrito o que esse "1"
//      significa. Se o aviso sai e a linha nao grava, o dono responde "1" e
//      fica a olhar para o telemovel convencido de que publicou. Se a linha
//      grava e o aviso nao sai, o indice de uma-por-dono fica preso 24 horas
//      com uma resposta que ninguem viu.
//   2. Alguem trocar o "ja ha uma a espera" por uma excepcao. O chamador pode
//      estar a meio de gravar avaliacoes vindas do Google; uma excepcao aqui
//      aborta essa transacao inteira por causa de um aviso.
//   3. A instrucao literal mudar. O webhook so aceita uma lista curta de
//      confirmacoes; se a mensagem passar a pedir outra coisa, o dono responde
//      o que lhe foi pedido e nao acontece nada.
//   4. O asterisco voltar a passar. Ele emparelha com o negrito e po-lo no
//      sitio errado, ou parte a mensagem no Telegram — e o nome do autor e o
//      rascunho sao os dois textos que nao sao nossos.
//   5. A funcao ficar ao alcance do navegador. Um "1" vindo do painel nao
//      prova que a pessoa respondeu no WhatsApp, e essa prova e o produto.
//   6. A chave de idempotencia deixar de nomear a resposta, e com isso o aviso
//      e o que ele espera passarem a ser duas linhas sem relacao nenhuma.
//
// AS ASSERCOES LEEM SO O CORPO DA FUNCAO, e nao o ficheiro. Neste projecto ja
// houve um guarda verde por procurar uma condicao "em qualquer sitio" e a
// encontrar noutro bloco que a tinha por outro motivo. E os comentarios sao
// retirados antes de qualquer procura: o texto explicativo aqui em cima cita a
// instrucao que a assercao 3 exige, e casar com o proprio comentario e a
// maneira mais silenciosa de um guarda nao provar nada.
import { readFileSync } from 'node:fs';

const MIGRACAO = 'supabase/migrations/20260903210000_aviso_oferece_o_rascunho.sql';

const semComentarios = (fonte) => fonte.replace(/^\s*--[^\n]*$/gm, ' ');
const numaLinha = (fonte) => fonte.replace(/\s+/g, ' ');

const ficheiro = semComentarios(readFileSync(MIGRACAO, 'utf8'));

// O CORPO E RECORTADO, E O RECORTE E CONFERIDO ANTES DE VALER COMO PROVA.
//
// `indexOf` devolve -1 quando nao acha, e `slice` com -1 nao rebenta: devolve
// um pedaco qualquer, ou vazio. Um recorte vazio faz TODAS as assercoes
// abaixo passarem a testar o nada — e o guarda fica vermelho por seis motivos
// errados, ou verde por nenhum. Falhar aqui, com nome proprio, e a unica saida
// honesta.
const inicio = ficheiro.indexOf('create or replace function public.oferecer_rascunho(');
const fim = inicio < 0 ? -1 : ficheiro.indexOf('$function$;', inicio);
if (inicio < 0 || fim < 0) {
  console.error('Aviso que espera resposta: a funcao public.oferecer_rascunho nao foi encontrada em %s.', MIGRACAO);
  console.error('Sem o corpo da funcao nenhuma das protecoes abaixo prova o que quer que seja.');
  process.exit(1);
}
const corpo = numaLinha(ficheiro.slice(inicio, fim));

const falhas = [];
let verificadas = 0;
const exigir = (rotulo, condicao) => { verificadas += 1; if (!condicao) falhas.push(rotulo); };

// 1. AS DUAS ESCRITAS VIVEM NA MESMA FUNCAO, e por isso na mesma transacao.
// Ou existem as duas, ou nao existe nenhuma.
exigir('a funcao grava a resposta a espera E enfileira o aviso, as duas na mesma transacao',
  /insert into public\.respostas_a_confirmar \(user_id, review_id, rascunho\)/.test(corpo)
  && /insert into public\.whatsapp_outbox \(user_id, kind, provider, recipient_e164, body, idempotency_key\)/.test(corpo));

// 2. JA HA UMA A ESPERA E UMA RESPOSTA, NAO UM ERRO. O indice unico ja impede
// duas; bater nele lancaria excepcao e abortaria a transacao de quem chamou.
exigir('quando ja ha uma a espera a funcao devolve nulo, em vez de lancar excepcao',
  /if exists \( select 1 from public\.respostas_a_confirmar where user_id = p_user_id and confirmado_em is null and recusado_em is null \) then return null; end if;/.test(corpo));

// 3. A INSTRUCAO E LITERAL, e tem de bater com a lista curta de confirmacoes
// que o webhook aceita. Pedir "responda SIM" faria o dono responder SIM.
exigir('a mensagem diz ao dono, com estas palavras, que um 1 publica no Google',
  corpo.includes('Responda *1* para publicar'));

// 4. O ASTERISCO SAI DOS DOIS TEXTOS QUE NAO SAO NOSSOS: o nome de quem
// avaliou, e o rascunho que saiu do modelo a partir do comentario do cliente.
exigir('o asterisco e retirado do nome do autor e tambem do rascunho',
  /replace\(v_autor, '\*', ''\)/.test(corpo)
  && /replace\(p_rascunho, '\*', ''\)/.test(corpo));

// 5. FORA DO ALCANCE DO NAVEGADOR. Esta funcao arma uma publicacao no perfil
// publico de um cliente; a unica prova que o produto oferece e a pessoa ter
// respondido no WhatsApp, e uma chamada vinda do painel nao e essa prova.
exigir('a funcao e revogada de anon e authenticated, e nunca concedida de volta',
  /revoke all on function public\.oferecer_rascunho\(uuid, uuid, text\) from public, anon, authenticated;/.test(numaLinha(ficheiro))
  && !/grant execute on function public\.oferecer_rascunho\(uuid, uuid, text\) to (public|anon|authenticated)/.test(numaLinha(ficheiro)));

// 6. A CHAVE NOMEIA A RESPOSTA. E o que liga a linha da fila ao "1" que ela
// espera, nos dois sentidos, e o que impede um segundo aviso para o mesmo
// rascunho — que faria o dono confirmar duas vezes, a segunda por cima do
// rascunho seguinte.
exigir('a chave de idempotencia do aviso carrega o id da resposta a confirmar',
  /values \(p_user_id, 'alert', v_canal, v_destino, v_corpo, 'rascunho:' \|\| v_id::text\) on conflict \(user_id, idempotency_key\) do nothing;/.test(corpo));

if (falhas.length) {
  console.error('Aviso que espera resposta: %d protecao(oes) falharam.\n', falhas.length);
  for (const falha of falhas) console.error(' - %s', falha);
  process.exit(1);
}
console.log(`Aviso que espera resposta: ${verificadas} protecoes verdes.`);
