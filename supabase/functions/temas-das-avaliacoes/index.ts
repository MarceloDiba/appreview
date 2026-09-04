import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { temAcesso } from '../_shared/acesso.ts';

/**
 * Agrupa as avaliacoes do dono nos temas que se repetem nelas.
 *
 * POR QUE ESTA FUNCAO EXISTE
 *
 * O cartao "Temas mais citados" procurava sete conjuntos de palavras-chave:
 * comida, prato, cozinha, entrega, ambiente, limpeza, espera, preco. E
 * vocabulario de restaurante. Marcelo apontou o cartao a zero tres vezes, e a
 * ultima em 01/09/2026: "Temas mais citados ainda continua zerado".
 *
 * Medido nas avaliacoes reais do negocio dele, que e uma agencia digital:
 * "profissional impar", "bom para trabalhar com eles", "pronta pra melhor
 * atender", "Agencia Top de servicos", "lugar para aprender", "Excelentes
 * profissionais". ZERO das seis casa qualquer uma das sete gavetas, e nenhuma
 * casaria com sessenta avaliacoes em vez de seis. Nao e falta de dados: o
 * modulo nao tem como achar um tema num negocio que nao seja restaurante.
 *
 * E a mesma doenca do gerador de respostas e do detector de idioma, corrigidos
 * no mesmo dia pela mesma razao: uma lista de palavras nao entende texto, e
 * alargar a lista e uma corrida contra o vocabulario inteiro.
 *
 * O QUE TORNA ISTO HONESTO
 *
 * O modelo NAO escreve numeros. Ele so AGRUPA: para cada tema devolve os
 * NUMEROS das avaliacoes que o mencionam, e a contagem e o sentimento sao
 * calculados aqui, a partir dessas avaliacoes e das notas delas. Um tema que
 * nao aponte para pelo menos duas avaliacoes reais e descartado.
 *
 * Isto e o que o contrato ja exigia deste modulo, em "Leitura de reputacao":
 * "Temas recorrentes so viram oportunidade ou alerta com comentarios e
 * contexto suficientes; comentario -> tema -> acao operacional." A versao por
 * palavras-chave cumpria a letra e falhava o proposito; esta cumpre as duas,
 * porque o caminho de volta do tema para os comentarios existe de verdade.
 *
 * O QUE ELA NAO FAZ
 *
 * Nao decide alertas, nao escreve recomendacao, nao toca no Radar. O Radar
 * continua a ler `insights.topics`, a lista por palavras-chave, e continua a
 * so falar com evidencia. Os dois podem estar em desacordo, e o desacordo e
 * honesto: um le a amostra inteira por palavras, o outro agrupa o texto.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const MODELO = Deno.env.get('OPENAI_MODEL') || 'gpt-4.1-nano';

/** Menos do que isto nao e um tema, e um comentario. */
const MINIMO_POR_TEMA = 2;
/** Menos avaliacoes com texto do que isto nao da para agrupar coisa nenhuma. */
const MINIMO_DE_AVALIACOES = 3;
const MAXIMO_DE_TEMAS = 6;
/** Cortar protege o custo e o tempo sem perder o assunto de nenhuma. */
const CORTE_DO_TEXTO = 400;
const MAXIMO_DE_AVALIACOES = 60;

const IDIOMAS: Record<string, string> = {
  'pt-PT': 'European Portuguese as spoken in Portugal',
  'pt-BR': 'Brazilian Portuguese',
  en: 'English',
};

/**
 * O pedido e escrito em ingles pela mesma razao que o do rascunho: a lingua do
 * pedido vence a instrucao sobre a lingua, e aqui o rotulo tem de sair na
 * lingua do DONO, que e quem le o cartao, e nao na do cliente.
 *
 * A linha sobre elogio e queixa esta la por medicao: sem ela, o modelo puxava
 * para os problemas e deixava de fora o tema mais citado de um restaurante de
 * teste, que era a comida.
 */
const PEDIDO = (negocio: string, idioma: string, avaliacoes: Array<{ texto: string; nota: number | null }>) =>
  `You group customer reviews of "${negocio}" into the themes that come up again and again.

The reviews, numbered:
${avaliacoes.map((a, i) => `${i}. (${a.nota === null ? 'no rating' : `${a.nota} of 5`}) "${a.texto}"`).join('\n')}

Rules, all mandatory:
- A theme must be mentioned by AT LEAST TWO different reviews. Drop anything mentioned once.
- For each theme, list the numbers of the reviews that mention it. Use only numbers from the list above.
- Cover what customers PRAISED as well as what they complained about. A theme is any subject that comes up more than once, good or bad.
- The label is a noun phrase of 1 to 3 words, written in ${IDIOMAS[idioma] || IDIOMAS['pt-PT']}, naming what the customers talked about. Not a sentence, not your opinion, not a recommendation.
- Never invent a theme that is not in the text. If nothing is mentioned twice, return an empty list.
- At most ${MAXIMO_DE_TEMAS} themes, the most mentioned first.

Answer with JSON only:
{"temas":[{"rotulo":"<the label>","avaliacoes":[<numbers>]}]}`;

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
  const chave = Deno.env.get('OPENAI_API_KEY') || '';

  const authorization = request.headers.get('Authorization');
  if (!authorization) return json({ error: 'Authentication required' }, 401);
  const caller = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } });
  const { data: { user }, error: erroDeSessao } = await caller.auth.getUser();
  if (erroDeSessao || !user) return json({ error: 'Invalid session' }, 401);

  // SO USA QUEM PAGA. Antes da chamada a OpenAI, que e o que custa aqui.
  const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '');
  if (!await temAcesso(admin, user.id)) {
    return json({ code: 'SEM_ASSINATURA', error: 'Sua assinatura nao esta ativa.' }, 402);
  }
  if (!chave) return json({ code: 'SEM_CHAVE', error: 'O agrupamento automatico ainda nao esta configurado.' }, 503);

  const corpo = await request.json().catch(() => ({})) as Record<string, unknown>;
  const negocio = typeof corpo.businessName === 'string' && corpo.businessName.trim() ? corpo.businessName.trim() : 'o negócio';
  const idioma = typeof corpo.idioma === 'string' && IDIOMAS[corpo.idioma] ? corpo.idioma : 'pt-PT';
  const brutas = Array.isArray(corpo.reviews) ? corpo.reviews : [];
  const avaliacoes = brutas
    .map((item) => {
      const linha = item as Record<string, unknown>;
      const texto = typeof linha.comment === 'string' ? linha.comment.trim().slice(0, CORTE_DO_TEXTO) : '';
      const nota = typeof linha.rating === 'number' && linha.rating >= 1 && linha.rating <= 5 ? linha.rating : null;
      return { texto, nota };
    })
    .filter((a) => a.texto.length >= 3)
    .slice(0, MAXIMO_DE_AVALIACOES);

  if (avaliacoes.length < MINIMO_DE_AVALIACOES) {
    return json({ code: 'POUCO_TEXTO', error: 'Nao ha avaliacoes com texto suficientes para agrupar.' }, 422);
  }

  try {
    const resposta = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${chave}` },
      body: JSON.stringify({
        model: MODELO,
        messages: [{ role: 'user', content: PEDIDO(negocio, idioma, avaliacoes) }],
        temperature: 0.2,
        max_tokens: 600,
        response_format: { type: 'json_object' },
      }),
    });
    if (!resposta.ok) {
      const detalhe = await resposta.text().catch(() => '');
      return json({ code: 'MODELO_RECUSOU', error: `O modelo devolveu ${resposta.status}.`, detalhe: detalhe.slice(0, 200) }, 502);
    }

    const dados = await resposta.json();
    let brutos: unknown[] = [];
    try {
      const objeto = JSON.parse(String(dados?.choices?.[0]?.message?.content ?? '').trim()) as Record<string, unknown>;
      brutos = Array.isArray(objeto?.temas) ? objeto.temas : [];
    } catch {
      brutos = [];
    }

    /**
     * A CONTA E FEITA AQUI, e nao lida do que o modelo devolveu.
     *
     * O modelo so aponta quais avaliacoes formam cada tema. Se ele mandasse
     * tambem a contagem, o cartao mostraria um numero que ninguem verificou, e
     * um numero inventado num painel de reputacao e pior do que nenhum: o dono
     * toma decisao com ele. Os indices sao filtrados contra a lista real antes
     * de serem contados, por isso um indice inventado nao chega a somar.
     */
    const temas = brutos
      .map((item) => {
        const linha = item as Record<string, unknown>;
        const rotulo = typeof linha.rotulo === 'string' ? linha.rotulo.trim().slice(0, 40) : '';
        const indices = Array.isArray(linha.avaliacoes)
          ? [...new Set(linha.avaliacoes.filter((n): n is number => Number.isInteger(n) && n >= 0 && n < avaliacoes.length))]
          : [];
        const notas = indices.map((i) => avaliacoes[i].nota).filter((n): n is number => n !== null);
        const positivas = notas.filter((n) => n >= 4).length;
        const negativas = notas.filter((n) => n <= 3).length;
        return {
          rotulo,
          contagem: indices.length,
          sentimento: positivas > negativas ? 'positivo' : negativas > positivas ? 'negativo' : 'misto',
        };
      })
      .filter((t) => t.rotulo.length >= 2 && t.contagem >= MINIMO_POR_TEMA)
      .sort((a, b) => b.contagem - a.contagem || a.rotulo.localeCompare(b.rotulo))
      .slice(0, MAXIMO_DE_TEMAS);

    return json({ temas, lidas: avaliacoes.length, modelo: MODELO });
  } catch (erro) {
    return json({ code: 'MODELO_INDISPONIVEL', error: String(erro).slice(0, 160) }, 502);
  }
});
