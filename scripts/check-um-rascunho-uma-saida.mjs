import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Uma avaliacao tem UM rascunho, e ele tem saida sem publicar.
//
// POR QUE ESTE GUARDA EXISTE
//
// Marcelo abriu `/reviews` com um rascunho a espera no WhatsApp e viu DOIS
// textos diferentes para a mesma avaliacao: o que tinha sido enviado, na caixa
// verde, e outro, gerado ali, na caixa de edicao — com o botao azul de publicar
// por baixo do segundo.
//
// E o cartao existia para impedir exactamente isso. O comentario dele diz: "sem
// isto ele nao sabe que a mensagem chegou e pode responder duas vezes a mesma
// avaliacao". Mostrar o aviso e a seguir oferecer uma resposta DIFERENTE
// derrotava a razao de o aviso existir.
//
// E NAO HAVIA SAIDA SEM PUBLICAR. So existia `recusar_respostas_expiradas()`,
// que corre sozinha ao fim do prazo. Como o produto so oferece um rascunho de
// cada vez, um que o dono nao queira publicar trancava a fila inteira ate
// expirar. Ele ficou preso nesse estado: "nao tem como recusar em review,
// apenas no painel" — e no painel a unica saida era publicar.

const raiz = resolve(import.meta.dirname, '..');
const tela = readFileSync(resolve(raiz, 'src/components/dashboard/reviews/FilaDeRespostas.tsx'), 'utf8');
const tipos = readFileSync(resolve(raiz, 'src/integrations/supabase/types.ts'), 'utf8');

const requisitos = [
  // A CAIXA ABRE COM O RASCUNHO QUE FOI ENVIADO, quando ha um. Sem isto voltam
  // os dois textos.
  ['a caixa comeca com o rascunho que ja foi para o WhatsApp',
    /useState\(respostaAEsperar\?\.rascunho \?\? rascunhoInicial\)/.test(tela)],

  ['a tela tem como recusar', /rpc\('recusar_rascunho'/.test(tela)],

  // O BOTAO SO APARECE COM RASCUNHO A ESPERA. Oferecer "recusar" onde nao ha
  // nada a recusar e um botao que nao pode fazer nada.
  //
  // MEDE AS DUAS PONTAS, e nao um bloco unico. Os botoes foram extraidos para
  // `AccoesDoRascunho` no mesmo dia — o cartao tinha passado o limite de
  // complexidade do `lint:portao`. A primeira versao desta regra casava o JSX
  // inteiro num sitio so e deu vermelho a uma extracao que melhora o codigo.
  // A condicao continua a existir: e calculada no cartao e obedecida no filho.
  ['recusar so aparece quando ha rascunho a espera',
    /temRascunhoAEsperar=\{Boolean\(respostaAEsperar\)\}/.test(tela)
    && /\{temRascunhoAEsperar && \([\s\S]{0,400}aoRecusar/.test(tela)],

  // E A RECUSA NAO ACEITA O DONO POR PARAMETRO. A primeira versao da funcao
  // recebia `p_user_id` e era `security definer` com execucao para
  // `authenticated`: qualquer sessao podia trancar a fila de outra conta.
  ['a recusa nao recebe o dono por parametro',
    !/recusar_rascunho'[\s\S]{0,120}p_user_id/.test(tela)
    && /recusar_rascunho: \{[\s\S]{0,120}p_review_id: string[\s\S]{0,60}\}/.test(tipos)],

  // E A INSTRUCAO NAO MANDA DIGITAR. Com botao no WhatsApp, "responda 1"
  // contradiz a promessa que a home vende.
  ['a instrucao do WhatsApp nao manda digitar um numero',
    !/Responda 1 no WhatsApp/.test(
      readFileSync(resolve(raiz, 'src/i18n/owner/locales/pt-BR.json'), 'utf8'))],
];

const falhas = requisitos.filter(([, ok]) => !ok).map(([rotulo]) => rotulo);
if (falhas.length) {
  console.error(`Um rascunho, uma saida, regra quebrada:\n- ${falhas.join('\n- ')}`);
  process.exit(1);
}

console.log(`Um rascunho, uma saida: ${requisitos.length} regras conferidas.`);
