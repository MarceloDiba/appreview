import type { ExperimentalObservedReview } from '@/lib/experimentalApifySnapshot';

/**
 * Os temas que saem de LER as avaliações, e o texto honesto que fica por baixo.
 *
 * O PROBLEMA
 *
 * Marcelo, três vezes, a última em 01/09/2026: "Temas mais citados ainda
 * continua zerado". O cartão procurava sete conjuntos de palavras-chave —
 * comida, prato, cozinha, entrega, ambiente, limpeza, espera, preço — e é
 * vocabulário de restaurante. As avaliações reais do negócio dele, que é uma
 * agência digital, não casam nenhuma delas, e não casariam com sessenta em vez
 * de seis. Não faltavam dados: faltava ao módulo saber ler.
 *
 * O QUE ESTE ARQUIVO É
 *
 * A política, separada do React e da rede, para poder ser provada sem os dois.
 * É a mesma forma de `rascunhoDoModelo.ts`, de propósito: quem já leu aquele
 * lê este. Duas peças:
 *
 *   `temasNaTela`   decide O QUE o cartão mostra agora, entre os temas do
 *                   modelo, os das palavras-chave e nada.
 *   `pedirTemas`    decide QUANTAS vezes se paga por um retrato.
 *
 * AS QUATRO REGRAS, as mesmas do rascunho e pela mesma razão
 *
 * 1. Alguma coisa útil está sempre na tela. Enquanto o pedido corre, o cartão
 *    mostra o que já tinha; nunca uma caixa vazia nem uma roda a girar.
 *
 * 2. Qualquer falha fica com o que havia. Rede, 4xx, 5xx, JSON partido, demora
 *    acima do limite: tudo dá `{ origem: 'vazio' }`, e o cartão cai na lista
 *    por palavras-chave ou na linha honesta. Um modelo em baixo não pode
 *    apagar um módulo do painel.
 *
 * 3. O que o modelo devolve é conferido, não aceito. A contagem e o sentimento
 *    de cada tema são calculados na função a partir das avaliações que ele
 *    aponta, e um tema com menos de duas é descartado lá. Aqui confere-se
 *    outra vez a forma, porque quem chama é uma tela que não pode quebrar.
 *
 * 4. Uma chamada por retrato, na sessão. A chave é o retrato (negócio mais o
 *    instante da coleta), e o cache guarda também a falha: reabrir o painel não
 *    paga de novo, e um erro passageiro não é repetido a cada volta.
 */

/** Um tema, com a conta já feita a partir das avaliações que o formam. */
export interface TemaDoModelo {
  rotulo: string;
  contagem: number;
  sentimento: 'positivo' | 'negativo' | 'misto';
}

export type ResultadoDosTemas =
  /** Pedido em curso. O cartão continua com o que já tinha. */
  | { origem: 'pedindo' }
  /** O modelo agrupou e a função conferiu. */
  | { origem: 'modelo'; temas: TemaDoModelo[] }
  /** Não houve temas do modelo, por qualquer motivo. */
  | { origem: 'vazio' };

export interface EntradaDosTemas {
  reviews: Array<{ comment: string; rating: number | null }>;
  businessName: string | null;
  /** O idioma do DONO, que é quem lê o cartão, e não o do cliente. */
  idioma: string;
}

export type PedidoDeTemas = (entrada: EntradaDosTemas) => Promise<TemaDoModelo[]>;

/**
 * A chave do cache: o negócio e o instante da coleta.
 *
 * `fetchedAt` é o que muda quando há avaliações novas, e é exactamente quando
 * vale a pena pagar outra vez. Sem ele na chave, uma coleta nova mostraria os
 * temas da anterior até o dono recarregar a página.
 */
export const chaveDoRetrato = (placeId: string | null | undefined, fetchedAt: string | null | undefined) =>
  `${placeId || 'sem-lugar'}:${fetchedAt || 'sem-data'}`;

/** Menos texto do que isto não dá para agrupar, e não vale a chamada. */
export const MINIMO_DE_AVALIACOES = 3;

/**
 * As avaliações com texto do retrato, no formato que a função espera.
 *
 * Vive aqui, e não no componente, porque é a mesma decisão que `pedirTemas`
 * protege: sem este filtro, um retrato de cinquenta avaliações sem texto
 * nenhum pagaria uma chamada para o modelo não ter o que agrupar.
 */
export const avaliacoesComTexto = (itens: ExperimentalObservedReview[] | undefined) =>
  (itens || [])
    .map((item) => ({ comment: (item.comment || '').trim(), rating: item.rating ?? null }))
    .filter((item) => item.comment.length >= 3);

/**
 * O que o cartão mostra agora.
 *
 * A ordem das perguntas É a regra: os temas do modelo ganham quando existem,
 * porque são os que leram o texto; as palavras-chave ficam como chão, para um
 * restaurante em que elas acertem; e nada é nada, com a linha honesta.
 *
 * `pedindo` devolve o chão em vez de vazio: a regra 1 diz que a tela nunca
 * pisca.
 */
export const temasNaTela = (
  doModelo: ResultadoDosTemas | undefined,
  porPalavraChave: TemaDoModelo[],
): { temas: TemaDoModelo[]; origem: 'modelo' | 'palavras' | 'nenhum' } => {
  if (doModelo?.origem === 'modelo' && doModelo.temas.length) return { temas: doModelo.temas, origem: 'modelo' };
  if (porPalavraChave.length) return { temas: porPalavraChave, origem: 'palavras' };
  return { temas: [], origem: 'nenhum' };
};

const resolvidos = new Map<string, ResultadoDosTemas>();
const emVoo = new Map<string, Promise<ResultadoDosTemas>>();

export const temasGuardados = (chave: string): ResultadoDosTemas | undefined => resolvidos.get(chave);

/**
 * Agrupar cinquenta avaliações demora mais do que escrever uma resposta, e o
 * cartão já tem o que mostrar enquanto espera. O limite existe para o cache
 * poder fechar o retrato em vez de o deixar em voo até recarregar a página.
 */
export const LIMITE_MS = 20000;

/** Nunca rejeita: toda falha vira `{ origem: 'vazio' }`. Ver regra 2. */
export const pedirTemas = (
  chave: string,
  entrada: EntradaDosTemas,
  pedir: PedidoDeTemas,
  limiteMs: number = LIMITE_MS,
): Promise<ResultadoDosTemas> => {
  const guardado = resolvidos.get(chave);
  if (guardado) return Promise.resolve(guardado);
  const jaEmVoo = emVoo.get(chave);
  if (jaEmVoo) return jaEmVoo;

  const comLimite = new Promise<ResultadoDosTemas>((resolver) => {
    const relogio = setTimeout(() => resolver({ origem: 'vazio' }), limiteMs);
    const encerrar = (resultado: ResultadoDosTemas) => {
      clearTimeout(relogio);
      resolver(resultado);
    };
    let promessa: Promise<TemaDoModelo[]>;
    try {
      promessa = pedir(entrada);
    } catch {
      encerrar({ origem: 'vazio' });
      return;
    }
    promessa.then(
      (temas) => {
        // Regra 3: a forma é conferida outra vez deste lado. Um tema sem
        // rótulo ou com contagem abaixo de duas não chega à tela do dono,
        // mesmo que a função mude e deixe de o filtrar.
        const validos = (temas || []).filter(
          (t) => typeof t?.rotulo === 'string' && t.rotulo.trim().length >= 2 && Number.isInteger(t.contagem) && t.contagem >= 2,
        );
        encerrar(validos.length ? { origem: 'modelo', temas: validos } : { origem: 'vazio' });
      },
      () => encerrar({ origem: 'vazio' }),
    );
  }).then((resultado) => {
    resolvidos.set(chave, resultado);
    emVoo.delete(chave);
    return resultado;
  });

  emVoo.set(chave, comLimite);
  return comLimite;
};

/** Só para os guardas: cada caso começa com a sessão limpa. */
export const esquecerTemas = () => {
  resolvidos.clear();
  emVoo.clear();
};
