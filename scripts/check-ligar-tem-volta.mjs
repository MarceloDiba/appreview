import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Ligar o Google tem volta.
//
// POR QUE ESTE GUARDA EXISTE
//
// Ate 05/09/2026 nao havia forma nenhuma de desligar. Zero ocorrencias de
// "desconectar" no produto inteiro: uma vez ligado, ligado para sempre, e a
// unica saida era alguem mexer no banco.
//
// Marcelo apanhou-o no dia em que precisou. O app saiu do modo Teste nessa
// tarde, o que acaba com a expiracao de 7 dias — mas so para autorizacoes
// NOVAS. A que ja existia nasceu em Teste e leva o prazo carimbado. Sem
// desligar, nao havia como pedir uma nova, e publicar nao teria servido de nada.
//
// A ORDEM NA FUNCAO E O QUE ESTE GUARDA MAIS PROTEGE. O `disconnect` esta
// ANTES da renovacao do token, e tem de continuar la: se ficasse depois, so
// funcionaria enquanto a ligacao estivesse SAUDAVEL — e o momento em que
// alguem mais precisa de desligar e exactamente aquele em que a autorizacao
// morreu. O dono ficaria preso a uma ligacao partida sem botao para a largar.
//
// E o defeito seria invisivel a leitura: o codigo do desligar estaria la,
// escrito e correcto, so que inalcancavel no unico caso que importa.

const raiz = resolve(import.meta.dirname, '..');
const funcao = readFileSync(resolve(raiz, 'supabase/functions/sync-google-business-profile/index.ts'), 'utf8');
const tela = readFileSync(resolve(raiz, 'src/components/settings/ConexaoDoGoogle.tsx'), 'utf8');
const migracao = readFileSync(resolve(raiz, 'supabase/migrations/20260905200000_dono_pode_desligar_o_google.sql'), 'utf8');

const posDesligar = funcao.indexOf('action === "disconnect"');
const posRenovar = funcao.indexOf('read_google_business_refresh_token');

const requisitos = [
  ['a funcao aceita o pedido de desligar', posDesligar !== -1],

  // A REGRA CENTRAL. Mede a posicao, nao a existencia.
  ['desligar vem antes de renovar o token',
    posDesligar !== -1 && posRenovar !== -1 && posDesligar < posRenovar],

  ['a tela tem por onde desligar', /action: 'disconnect'/.test(tela)],

  // PEDE CONFIRMACAO. Desligar apaga a autorizacao; voltar a ligar passa pelo
  // Google outra vez, e um toque sem querer no telemovel nao pode custar isso.
  //
  // MEDE O PORTAO, E NAO AS PALAVRAS. A primeira versao procurava `aConfirmar`
  // e `desligarPergunta` em qualquer sitio do ficheiro, e ficou VERDE com a
  // mutacao que ligava o botao directamente ao `desligar()` — as duas palavras
  // continuavam la, uma no `setAConfirmar` e outra num texto que ja ninguem
  // mostrava. Agora exige que a chamada destrutiva esteja DEPOIS da abertura do
  // ramo de confirmacao, e que o primeiro botao so mude estado.
  ['a tela pergunta antes de desligar', (() => {
    const ramo = tela.indexOf('aConfirmar ? (');
    const chamada = tela.indexOf('void desligar()');
    return ramo !== -1
      && chamada > ramo
      && tela.includes('setAConfirmar(true)')
      && tela.includes('desligarPergunta');
  })()],

  // O SEGREDO SAI DO VAULT. Deixar la um refresh token vivo de uma ligacao que
  // o dono desfez e guardar a chave da casa de alguem depois de ele a pedir de
  // volta.
  ['o segredo do Vault e apagado', /delete from vault\.secrets where id = v_segredo/.test(migracao)],

  // E O HISTORICO FICA. Desligar o Google nao pode apagar o trabalho ja feito:
  // avaliacoes trazidas e respostas publicadas sao do negocio, nao da ligacao.
  ['desligar nao apaga avaliacoes nem respostas publicadas',
    !/delete from public\.(google_business_reviews|google_public_reviews_answered)/.test(migracao)],
];

const falhas = requisitos.filter(([, ok]) => !ok).map(([rotulo]) => rotulo);
if (falhas.length) {
  console.error(`Ligar tem volta, regra quebrada:\n- ${falhas.join('\n- ')}`);
  process.exit(1);
}

console.log(`Ligar tem volta: ${requisitos.length} regras conferidas.`);
