/**
 * O rascunho que lê a avaliação, e o texto padrão que continua por baixo dele.
 *
 * O PROBLEMA
 *
 * Marcelo, em 31/08/2026: "a sugestão de resposta dentro do app não reconhece o
 * idioma que foi escrito automaticamente e não entende o contexto do que foi
 * dito e gera apenas uma resposta padrão".
 *
 * As duas coisas são o teto de `src/lib/replySuggestions.ts`, não defeitos
 * dele: o idioma é adivinhado contando palavras-marca e cai em português no
 * empate, e o assunto é procurado em onze conjuntos de palavras-chave e cai no
 * genérico quando nenhum casa, que é o caso comum. Nenhuma das duas se resolve
 * com mais palavras-chave. Quem responde ao que a pessoa disse tem de ler o que
 * a pessoa disse, e é isso que a função `sugerir-resposta` faz.
 *
 * O QUE ESTE ARQUIVO É
 *
 * A política, separada do React e da rede, para poder ser provada sem os dois.
 * Duas peças:
 *
 *   `rascunhoNaTela`  decide QUAL texto o dono vê agora, entre o dele, o do
 *                     modelo e o do template.
 *   `pedirRascunho`   decide QUANTAS vezes se paga por uma avaliação.
 *
 * AS QUATRO REGRAS, E ONDE CADA UMA VIVE
 *
 * 1. Alguma coisa útil está sempre na tela. `rascunhoNaTela` nunca devolve
 *    vazio enquanto houver template: o texto padrão aparece no primeiro quadro
 *    e só sai quando existe algo melhor para pôr no lugar. Nunca há caixa vazia
 *    nem roda a girar onde antes havia rascunho.
 *
 * 2. Qualquer falha fica com o template. Erro de rede, 4xx, 5xx, rascunho
 *    recusado pela própria função, resposta vazia ou demora acima do limite:
 *    tudo cai no mesmo resultado, `{ origem: 'template' }`, e o dono continua a
 *    trabalhar. Um modelo quebrado não pode quebrar a fila.
 *
 * 3. O que o dono escreveu ganha de tudo. Se ele já tem rascunho próprio nesta
 *    avaliação, uma resposta atrasada do modelo não entra na tela. A regra é
 *    estrutural, não uma verificação de tempo: `rascunhoNaTela` olha primeiro
 *    para o texto dele, e o texto dele vazio ainda é o texto dele (por isso a
 *    comparação é com `undefined`, e não com falsidade).
 *
 * 4. Uma chamada por avaliação, na sessão. O cache é por id da avaliação e
 *    guarda também a falha: uma avaliação a que o dono volta não é paga de
 *    novo, e uma que falhou não é repetida a cada volta. O preço disso é que
 *    uma falha passageira prende o template naquela avaliação até recarregar a
 *    página, e é um preço barato: o template está lá e ele responde na mesma.
 */

import type { ReplyChannel } from '@/lib/replySuggestions';

/** O que a fila sabe sobre o rascunho do modelo para uma avaliação. */
export type ResultadoDoModelo =
  /** Pedido em curso. O template continua na tela enquanto isto dura. */
  | { origem: 'pedindo' }
  /** O modelo respondeu e o texto passou pelas verificações da função. */
  | { origem: 'modelo'; texto: string }
  /** Não houve texto do modelo, por qualquer motivo. O template fica. */
  | { origem: 'template' };

/** De onde veio o que está na caixa agora, para a tela poder dizê-lo. */
export type OrigemNaTela = 'dono' | 'modelo' | 'pedindo' | 'template';

export interface EntradaDoRascunho {
  /** O que o cliente escreveu. É o único contexto que a função recebe. */
  comment: string;
  /** 1 a 5, ou `null` quando a avaliação não tem nota. */
  rating: number | null;
  businessName: string | null;
  /**
   * Qual dos dois textos se pede, e é uma diferença de regras, não de tom.
   *
   * `public` é a resposta que o dono publica debaixo da avaliação, para
   * desconhecidos lerem, e nela a função RECUSA qualquer promessa de reparação:
   * oferecer dinheiro em público ensina o próximo leitor que uma estrela vale
   * dinheiro.
   *
   * `private` é o recado directo a quem deixou contacto no formulário do QR, que
   * mais ninguém lê. Aí oferecer resolver é exactamente a coisa certa a dizer, e
   * o molde já tem uma variante inteira para isso (`com-reparacao`). O que o
   * privado ganha no lugar é a proibição de trocar seja o que for por apagar ou
   * mudar uma avaliação pública, que viola as políticas do Google.
   *
   * Até 01/09/2026 o comentário privado não tinha rascunho do modelo nenhum, por
   * não haver onde pôr esta diferença. Marcelo pediu-o nesse dia.
   */
  channel: ReplyChannel;
  /**
   * O nome de quem escreveu, quando existe. Só o recado privado o usa, para
   * abrir como o molde privado abre em vez de começar num "Olá" sem ninguém.
   */
  customerName: string | null;
  /**
   * `profiles.business_country`, para o modelo escrever português de Portugal ou
   * do Brasil. Mesma regra e mesmo campo que `resolveContentLocale` usa para as
   * variantes do molde: só `'BR'` exacto vira brasileiro.
   *
   * Sem ele, o rascunho saía em brasileiro para um negócio em Portugal enquanto
   * o molde ao lado, na mesma tela, saía em português de Portugal. Achado a
   * provar o canal privado em 01/09/2026.
   */
  businessCountry: string | null;
}

/** O transporte, injetado: aqui não se sabe que existe rede nem Supabase. */
export type PedidoAoBinno = (entrada: EntradaDoRascunho) => Promise<string>;

/**
 * Qual texto vai para a caixa, e de onde ele veio.
 *
 * A ordem das três perguntas É a regra 3: o texto do dono é lido antes de
 * qualquer outra coisa, então nenhuma resposta atrasada consegue passar por
 * cima dele. Trocar a ordem aqui é desfazer a regra, e é exatamente isso que o
 * guarda quebra para provar que a asserção fala.
 *
 * `doDono === undefined` significa "ele nunca tocou nesta avaliação". Uma caixa
 * que ele apagou até ficar vazia é uma decisão dele, e continua a ser o texto
 * dele.
 */
export const rascunhoNaTela = (
  doDono: string | undefined,
  doModelo: ResultadoDoModelo | undefined,
  doTemplate: string,
): { texto: string; origem: OrigemNaTela } => {
  if (doDono !== undefined) return { texto: doDono, origem: 'dono' };
  if (doModelo?.origem === 'modelo') return { texto: doModelo.texto, origem: 'modelo' };
  return { texto: doTemplate, origem: doModelo?.origem === 'pedindo' ? 'pedindo' : 'template' };
};

/**
 * O cache da sessão. Vive no módulo, e não num estado de componente, porque a
 * fila remonta a cada troca de aba do navegador e a cada releitura do painel:
 * um cache que morre com o componente pagaria de novo por avaliações que o dono
 * já viu, que é exatamente a regra 4.
 */
const resolvidos = new Map<string, ResultadoDoModelo>();
/** Pedidos em voo, para que dois quadros seguidos não virem duas chamadas. */
const emVoo = new Map<string, Promise<ResultadoDoModelo>>();

/** O que já se sabe desta avaliação, sem pedir nada. */
export const rascunhoGuardado = (id: string): ResultadoDoModelo | undefined => resolvidos.get(id);

/**
 * Um pedido lento é um pedido que nunca acaba, do ponto de vista do dono. O
 * template já está na tela, então o limite não existe para o proteger: existe
 * para a etiqueta parar de dizer "lendo a avaliação" para sempre, e para o
 * cache poder fechar a avaliação em vez de a deixar em voo até recarregar.
 */
export const LIMITE_MS = 12000;

/**
 * Pede o rascunho ao modelo, no máximo uma vez por avaliação na sessão.
 *
 * Nunca rejeita: toda falha vira `{ origem: 'template' }`, porque quem chama é
 * uma tela que não pode quebrar. Ver regra 2.
 */
export const pedirRascunho = (
  id: string,
  entrada: EntradaDoRascunho,
  pedir: PedidoAoBinno,
  limiteMs: number = LIMITE_MS,
): Promise<ResultadoDoModelo> => {
  const guardado = resolvidos.get(id);
  if (guardado) return Promise.resolve(guardado);
  const jaEmVoo = emVoo.get(id);
  if (jaEmVoo) return jaEmVoo;

  const comLimite = new Promise<ResultadoDoModelo>((resolver) => {
    const relogio = setTimeout(() => resolver({ origem: 'template' }), limiteMs);
    const encerrar = (resultado: ResultadoDoModelo) => {
      clearTimeout(relogio);
      resolver(resultado);
    };
    let promessa: Promise<string>;
    // O transporte pode estourar antes de devolver promessa nenhuma (uma
    // referência indefinida, por exemplo). Sem isto, a fila veria a exceção.
    try {
      promessa = pedir(entrada);
    } catch {
      encerrar({ origem: 'template' });
      return;
    }
    promessa.then(
      (texto) => encerrar(texto && texto.trim() ? { origem: 'modelo', texto: texto.trim() } : { origem: 'template' }),
      () => encerrar({ origem: 'template' }),
    );
  }).then((resultado) => {
    resolvidos.set(id, resultado);
    emVoo.delete(id);
    return resultado;
  });

  emVoo.set(id, comLimite);
  return comLimite;
};

/** Só para os guardas: cada caso começa com a sessão limpa. */
export const esquecerRascunhos = () => {
  resolvidos.clear();
  emVoo.clear();
};
