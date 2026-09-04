#!/usr/bin/env node
// "Temas mais citados" tem de ler as avaliacoes, e nao procurar palavras.
//
// Marcelo apontou o cartao a zero tres vezes, a ultima em 01/09/2026. A causa,
// medida nas avaliacoes reais do negocio dele: as sete gavetas eram vocabulario
// de restaurante (comida, prato, cozinha, entrega, ambiente, limpeza, espera) e
// as avaliacoes de uma agencia digital nao casam nenhuma. Zero em seis, e zero
// em sessenta pela mesma razao.
//
// O QUE ESTE GUARDA PROTEGE, e a ordem importa:
//
//   1. Que o NUMERO no cartao seja calculado a partir das avaliacoes que o
//      formam, e nunca lido do que o modelo devolveu. Um numero inventado num
//      painel de reputacao e pior do que nenhum: o dono decide com ele.
//   2. Que uma falha do modelo nao apague o modulo.
//   3. Que se pague uma vez por retrato, e nunca na demonstracao publica.
//
// A politica vive em `src/lib/temasDoModelo.ts`, sem React e sem rede, para as
// assercoes abaixo a CORREREM em vez de a procurarem. As estruturais existem
// so para provar que a funcao e a tela usam essa politica.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const POLITICA = 'src/lib/temasDoModelo.ts';
const TRANSPORTE = 'src/lib/temasDasAvaliacoes.ts';
const FUNCAO = 'supabase/functions/temas-das-avaliacoes/index.ts';
// O CARTAO DOS TEMAS saiu do painel em 04/09/2026, no terceiro corte por
// tamanho. Este guarda e inteiro sobre esse cartao — "o cartao decide", "o
// cartao pede" —, entao seguiu-o.
const PAINEL = 'src/components/dashboard/qr/CartoesDeQrETemas.tsx';

const raiz = process.cwd();
const {
  temasNaTela, pedirTemas, temasGuardados, esquecerTemas, avaliacoesComTexto, chaveDoRetrato, MINIMO_DE_AVALIACOES,
} = await import(pathToFileURL(resolve(raiz, POLITICA)).href);

const funcao = readFileSync(FUNCAO, 'utf8');
const painel = readFileSync(PAINEL, 'utf8');
const transporte = readFileSync(TRANSPORTE, 'utf8');

const falhas = [];
let verificadas = 0;
const exigir = (rotulo, condicao) => { verificadas += 1; if (!condicao) falhas.push(rotulo); };

const tema = (rotulo, contagem, sentimento = 'positivo') => ({ rotulo, contagem, sentimento });

// ---------------------------------------------------------------------------
// 1. O que o cartao mostra, CORRIDO.
// ---------------------------------------------------------------------------
exigir(
  'os temas do modelo ganham dos das palavras-chave, porque sao os que leram o texto',
  temasNaTela({ origem: 'modelo', temas: [tema('profissionalismo', 4)] }, [tema('comida', 9)]).origem === 'modelo',
);
exigir(
  'sem temas do modelo, as palavras-chave continuam a servir de chao',
  temasNaTela({ origem: 'vazio' }, [tema('comida', 9)]).origem === 'palavras',
);
exigir(
  'sem nenhum dos dois, o cartao fica sem temas e diz a linha honesta',
  temasNaTela({ origem: 'vazio' }, []).origem === 'nenhum',
);
// Regra 1 do rascunho, aplicada aqui: a tela nao pisca enquanto se espera.
exigir(
  'enquanto o pedido corre, o cartao continua a mostrar o que ja tinha',
  temasNaTela({ origem: 'pedindo' }, [tema('comida', 9)]).origem === 'palavras',
);
// Uma lista vazia vinda do modelo nao pode apagar o chao.
exigir(
  'uma resposta do modelo sem temas nenhuns nao apaga as palavras-chave',
  temasNaTela({ origem: 'modelo', temas: [] }, [tema('comida', 9)]).origem === 'palavras',
);

// ---------------------------------------------------------------------------
// 2. Quantas vezes se paga, CORRIDO.
// ---------------------------------------------------------------------------
const entrada = { reviews: [{ comment: 'texto', rating: 5 }], businessName: 'Casa', idioma: 'pt-PT' };

esquecerTemas();
let chamadas = 0;
const transportePago = async () => { chamadas += 1; return [tema('servico', 3)]; };
await pedirTemas('retrato-1', entrada, transportePago);
await pedirTemas('retrato-1', entrada, transportePago);
await pedirTemas('retrato-1', entrada, transportePago);
exigir(`paga-se uma vez por retrato na sessao (foram ${chamadas})`, chamadas === 1);
exigir('o resultado fica guardado para quem voltar ao painel', temasGuardados('retrato-1')?.origem === 'modelo');

esquecerTemas();
let falhadas = 0;
const transporteQuebrado = async () => { falhadas += 1; throw new Error('rede'); };
const depoisDaFalha = await pedirTemas('retrato-2', entrada, transporteQuebrado);
await pedirTemas('retrato-2', entrada, transporteQuebrado);
exigir('uma falha nao vira excecao para a tela: vira vazio', depoisDaFalha.origem === 'vazio');
exigir(`uma falha tambem e guardada, e nao repetida a cada volta (foram ${falhadas})`, falhadas === 1);

esquecerTemas();
const semPromessa = await pedirTemas('retrato-3', entrada, () => { throw new Error('rebentou antes'); });
exigir('um transporte que rebenta antes de devolver promessa tambem vira vazio', semPromessa.origem === 'vazio');

esquecerTemas();
const demorado = await pedirTemas('retrato-4', entrada, () => new Promise(() => {}), 20);
exigir('um pedido que nunca responde vira vazio pelo limite, em vez de ficar em voo', demorado.origem === 'vazio');

// ---------------------------------------------------------------------------
// 3. A politica confere a FORMA outra vez deste lado.
// ---------------------------------------------------------------------------
//
// Se a funcao mudar e deixar de filtrar, um tema apontado por uma avaliacao so
// nao pode chegar a tela: nao e um tema, e um comentario.
esquecerTemas();
const comLixo = await pedirTemas('retrato-5', entrada, async () => [
  tema('valido', 3), tema('so uma', 1), tema('', 5), { rotulo: 'sem conta', contagem: 'muitas' },
]);
exigir(
  'um tema com menos de duas avaliacoes nao chega a tela',
  comLixo.origem === 'modelo' && comLixo.temas.length === 1 && comLixo.temas[0].rotulo === 'valido',
);
esquecerTemas();
const soLixo = await pedirTemas('retrato-6', entrada, async () => [tema('so uma', 1)]);
exigir('se so vier lixo, o resultado e vazio e o chao aparece', soLixo.origem === 'vazio');

// ---------------------------------------------------------------------------
// 4. A chave do cache, e o filtro que evita pagar por nada.
// ---------------------------------------------------------------------------
exigir(
  'uma coleta nova muda a chave, senao os temas velhos ficavam ate recarregar a pagina',
  chaveDoRetrato('lugar', '2026-09-01T10:00:00Z') !== chaveDoRetrato('lugar', '2026-09-02T10:00:00Z'),
);
exigir(
  'negocios diferentes nao partilham temas',
  chaveDoRetrato('lugar-a', 'agora') !== chaveDoRetrato('lugar-b', 'agora'),
);
exigir(
  'as avaliacoes sem texto sao descartadas antes de se pagar por elas',
  avaliacoesComTexto([
    { id: '1', rating: 5, comment: 'texto que serve' },
    { id: '2', rating: 5, comment: '  ' },
    { id: '3', rating: 5, comment: undefined },
  ]).length === 1,
);
exigir('a nota ausente atravessa como nula, em vez de virar zero', avaliacoesComTexto([{ id: '1', rating: undefined, comment: 'texto que serve' }])[0].rating === null);

// ---------------------------------------------------------------------------
// 5. A FUNCAO calcula o numero, e nao o le do modelo.
// ---------------------------------------------------------------------------
//
// Esta e a assercao central deste guarda. Se o `contagem` passar a vir do JSON
// do modelo, o cartao mostra um numero que ninguem verificou.
exigir(
  'a contagem sai do numero de avaliacoes apontadas, e nao do que o modelo escreveu',
  /contagem: indices\.length,/.test(funcao) && !/contagem: (linha|item|objeto)\./.test(funcao),
);
exigir(
  'os indices sao filtrados contra a lista real antes de contarem',
  /Number\.isInteger\(n\) && n >= 0 && n < avaliacoes\.length/.test(funcao),
);
exigir(
  'indices repetidos nao inflam a contagem',
  /new Set\(/.test(funcao),
);
exigir(
  'o sentimento sai das notas das avaliacoes apontadas, e nao do modelo',
  /const notas = indices\.map\(/.test(funcao) && !/sentimento: (linha|item)\./.test(funcao),
);
exigir(
  'um tema apontado por menos de duas avaliacoes e descartado na funcao',
  /t\.contagem >= MINIMO_POR_TEMA/.test(funcao) && /const MINIMO_POR_TEMA = 2;/.test(funcao),
);
exigir(
  'a funcao devolve no maximo seis temas, para o cartao nao virar uma nuvem',
  /\.slice\(0, MAXIMO_DE_TEMAS\)/.test(funcao),
);

// O pedido tem de pedir os NUMEROS. Sem isso nao ha o que contar, e a funcao
// cairia num zero silencioso.
exigir('o pedido manda o modelo apontar quais avaliacoes formam cada tema', /list the numbers of the reviews that mention it/.test(funcao));
exigir('o pedido exige pelo menos duas avaliacoes por tema', /AT LEAST TWO different reviews/.test(funcao));
exigir('o pedido proibe inventar tema que nao esta no texto', /Never invent a theme that is not in the text/.test(funcao));
// Medido: sem esta linha o modelo puxava para os problemas e deixava de fora o
// tema mais citado de um restaurante de teste, que era a comida.
exigir('o pedido cobre elogio e queixa, e nao so os problemas', /Cover what customers PRAISED as well as what they complained about/.test(funcao));
exigir('o rotulo sai no idioma do DONO, que e quem le o cartao', /written in \$\{IDIOMAS\[idioma\]/.test(funcao));

// ---------------------------------------------------------------------------
// 6. A TELA usa a politica, e nao paga onde nao deve.
// ---------------------------------------------------------------------------
exigir(
  'o cartao decide o que mostrar pela politica partilhada, e nao por conta propria',
  /temasNaTela\(doModelo, porPalavraChave\)/.test(painel),
);
exigir(
  'o cartao pede pela porta partilhada, e nao por uma chamada propria',
  /pedirTemas\(/.test(painel) && !/functions\.invoke\('temas/.test(painel),
);
const efeito = painel.slice(painel.indexOf('const TopicsCard'), painel.indexOf('const naTela = temasNaTela'));
exigir(
  'a demonstracao publica nao paga chamada nenhuma',
  /if \(demo \|\| !userId\) return;/.test(efeito),
);
exigir(
  'sem texto suficiente nao se paga, em vez de se pagar para ouvir que nao da',
  new RegExp(`if \\(avaliacoes\\.length < MINIMO_PARA_TEMAS\\) return;`).test(efeito),
);
exigir(
  'o cartao reaproveita o que ja foi pago nesta sessao',
  /temasGuardados\(chave\)/.test(efeito),
);
exigir(
  'as palavras-chave continuam a ser lidas, para nao se trocar uma leitura gratis por uma que depende de rede',
  /snapshot\.sample\.insights\?\.topics \|\| \[\]/.test(painel),
);
exigir(
  'o transporte nao decide nada: toda falha vira a mesma excecao',
  /throw error;/.test(transporte) && /throw new Error\('SEM_TEMAS'\)/.test(transporte),
);

if (falhas.length) {
  console.error('Temas que leem: %d protecao(oes) falharam.\n', falhas.length);
  for (const falha of falhas) console.error(' - %s', falha);
  process.exit(1);
}
console.log(`Temas que leem: ${verificadas} protecoes verdes.`);
