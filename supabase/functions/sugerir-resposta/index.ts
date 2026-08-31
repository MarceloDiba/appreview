import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

/**
 * Rascunha a resposta a uma avaliacao, lendo o que a pessoa escreveu.
 *
 * POR QUE ESTA FUNCAO EXISTE
 *
 * O gerador anterior (`src/lib/replySuggestions.ts`) adivinha o idioma contando
 * palavras-marca e encaixa o comentario numa de onze gavetas por palavra-chave.
 * Quando nada casa, e o caso comum, devolve texto generico. Marcelo apontou as
 * duas coisas em 31/08/2026: nao reconhece o idioma e nao entende o contexto.
 *
 * Nenhuma das duas se resolve com mais palavras-chave: seria uma corrida contra
 * o vocabulario inteiro. Responder ao que a pessoa disse exige ler o que a
 * pessoa disse.
 *
 * O QUE ELA NAO MUDA
 *
 * O Binno continua sem publicar. O que sai daqui e um rascunho que o dono le,
 * edita e envia em nome dele. A funcao nao decide se responde, nao escolhe a
 * avaliacao, nao toca na fila.
 *
 * POR QUE AS REGRAS ESTAO EM CODIGO E NAO SO NO PEDIDO AO MODELO
 *
 * Um pedido bem escrito e uma intencao; uma verificacao depois e uma garantia.
 * As regras abaixo custaram caro para serem descobertas e nao vao depender de o
 * modelo obedecer: o que ele devolver e conferido, e o que nao passar cai no
 * texto antigo em vez de chegar ao dono.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const TRAVESSAO = String.fromCharCode(0x2014);
const MEIO_RISCO = String.fromCharCode(0x2013);

/**
 * O que o rascunho nao pode conter, e por que cada um esta aqui.
 *
 * ISTO E UMA LISTA DE BLOQUEIO, NAO UMA GARANTIA
 *
 * Uma lista de palavras so apanha as palavras que estao nela. Ela nao entende o
 * texto: um rascunho que prometa reparacao por outras palavras ("passe ca
 * amanha que resolvemos", "falamos sobre o valor") passa por aqui inteiro. O
 * que ela garante e o caso comum e barato, nao o caso adversarial.
 *
 * Por isso ela nao substitui a ultima defesa, que e o dono ler antes de enviar.
 * O Binno nao publica nada em nome dele exatamente por isso.
 *
 * POR QUE HA TRES IDIOMAS, E NAO UM
 *
 * O pedido manda o modelo responder NO IDIOMA EM QUE O CLIENTE ESCREVEU, que e
 * a razao de esta funcao existir. Enquanto a lista so tinha portugues, uma
 * avaliacao em ingles ou espanhol podia voltar a prometer um "discount", um
 * "refund", um "descuento" ou uma "devolucion", passar por todas as
 * verificacoes e chegar ao dono como rascunho pronto a publicar em nome do
 * negocio dele. Uma divida que ele nunca autorizou, numa lingua que a defesa
 * nao lia. Achado na auditoria de 31/08/2026.
 *
 * Portugues, espanhol e ingles sao as tres linguas que o produto tem hoje (as
 * mesmas de `src/lib/replySuggestions.ts` e dos catalogos do painel). Uma
 * quarta lingua de cliente entra aqui ANTES de entrar no resto.
 *
 * As entradas ficam separadas por idioma, e nao somadas numa expressao so, para
 * que o guarda possa provar cada uma vermelha por si.
 */
const PROIBIDO: Array<{ padrao: RegExp; motivo: string }> = [
  // Marcelo, em 30/08/2026: "usam travessao, nunca usaria isso, ja deixa claro
  // que e IA". O tracinho longo e a marca mais reconhecivel de texto gerado.
  { padrao: new RegExp(`[${TRAVESSAO}${MEIO_RISCO}]`), motivo: 'travessao' },
  // O dono nao autorizou reparacao nenhuma. Prometer em nome dele cria uma
  // divida que ele nao sabe que tem. Uma vez por idioma que o produto atende.
  //
  // As formas VERBAIS entram junto das nominais. A auditoria de 31/08/2026
  // mostrou que "Vamos devolver o valor" e "Vamos compensar o transtorno"
  // passavam inteiras: `devolu[cç]` apanha "devolucao" e nao "devolver",
  // `compensa[cç]` apanha "compensacao" e nao "compensar". E "devolver o
  // valor" e a forma mais natural de prometer reembolso em portugues.
  { padrao: /\b(reembols|devolv|devolu[cç]|ressarc|desconto|cortesia|brinde|gr[aá]tis|compensa|por (nossa|minha) conta|sem custo|sem qualquer custo|oferta da casa|vale de)/i, motivo: 'promessa de reparacao (pt)' },
  { padrao: /\b(descuento|reembols|devolver|devolvere|devoluci|cortes[ií]a|obsequio|gratis|compensa|resarci|sin (coste|cargo|costo)|invita la casa|vale de)/i, motivo: 'promessa de reparacao (es)' },
  { padrao: /\b(refund|discount|voucher|coupon|rebate|reimburs|compensat|complimentary|on the house|free of charge|for free|at no (cost|charge)|free (meal|drink|dessert|night|stay|room)|gift (card|voucher))/i, motivo: 'promessa de reparacao (en)' },
  // Dizer que e um assistente quebra a voz do negocio, em qualquer lingua.
  { padrao: /\b(intelig[eê]ncia artificial|assistente virtual|sou uma? (IA|intelig)|inteligencia artificial|asistente virtual|artificial intelligence|virtual assistant|language model|an? AI\b)/i, motivo: 'revela automacao' },
];

// Escolhido em 31/08/2026 comparando tres modelos com os comentarios reais da
// Noa. O gpt-5-nano, o mais barato da tabela, devolveu VAZIO nas quatro provas:
// gastou o orcamento inteiro de saida a raciocinar e nao sobrou resposta, logo
// custava mais e nao entregava nada. Entre os dois que funcionaram, este soa
// como dono de negocio pequeno enquanto o gpt-4o-mini soa como departamento.
// A diferenca de preco entre eles e de centavos por mes; a diferenca de voz e
// o que o cliente le.
const MODELO = Deno.env.get('OPENAI_MODEL') || 'gpt-4.1-nano';

const PEDIDO = (negocio: string, nota: number | null, comentario: string) => `Você escreve a resposta pública de um negócio a uma avaliação de cliente.

Negócio: ${negocio}
Nota dada: ${nota === null ? 'o cliente não deu nota' : `${nota} de 5`}
O que o cliente escreveu:
"""
${comentario}
"""

Escreva a resposta que o dono do negócio publicaria.

Regras, todas obrigatórias:
- Responda no MESMO idioma em que o cliente escreveu. Se ele escreveu em espanhol, responda em espanhol.
- Responda ao que ele disse de facto. Cite o assunto concreto que ele mencionou. Nada de texto que serviria para qualquer avaliação.
- Fale como um dono de negócio pequeno fala: simples, direto, sem palavras corporativas.
- Nunca prometa reembolso, desconto, cortesia ou qualquer reparação, em nenhum idioma.
- Nunca invente facto sobre o negócio que não esteja no que o cliente escreveu.
- Nunca diga ou sugira que é uma inteligência artificial.
- Não use travessão nem meio-risco. Use vírgula ou ponto.
- Entre 2 e 5 frases.
- Termine com o nome do negócio numa linha própria.

Devolva apenas o texto da resposta, sem aspas e sem explicação.`;

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

  if (!chave) {
    // Desligado e um estado legivel. Quem chamou fica com o texto antigo.
    return json({ code: 'SEM_CHAVE', error: 'O rascunho automatico ainda nao esta configurado.' }, 503);
  }

  const corpo = await request.json().catch(() => ({})) as Record<string, unknown>;
  const comentario = typeof corpo.comment === 'string' ? corpo.comment.trim() : '';
  const negocio = typeof corpo.businessName === 'string' && corpo.businessName.trim() ? corpo.businessName.trim() : 'o negócio';
  const nota = typeof corpo.rating === 'number' && corpo.rating >= 1 && corpo.rating <= 5 ? corpo.rating : null;

  if (comentario.length < 3) return json({ code: 'SEM_COMENTARIO', error: 'Sem texto para responder.' }, 422);
  // Um comentario absurdamente longo e quase sempre colagem ou ataque. Cortar
  // protege o custo e o tempo de resposta sem perder o assunto.
  const recorte = comentario.slice(0, 1500);

  try {
    const resposta = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${chave}` },
      body: JSON.stringify({
        model: MODELO,
        messages: [{ role: 'user', content: PEDIDO(negocio, nota, recorte) }],
        temperature: 0.4,
        max_tokens: 400,
      }),
    });

    if (!resposta.ok) {
      const detalhe = await resposta.text().catch(() => '');
      return json({ code: 'MODELO_RECUSOU', error: `O modelo devolveu ${resposta.status}.`, detalhe: detalhe.slice(0, 200) }, 502);
    }

    const dados = await resposta.json();
    const rascunho = String(dados?.choices?.[0]?.message?.content ?? '').trim();
    if (!rascunho) return json({ code: 'MODELO_VAZIO', error: 'O modelo devolveu vazio.' }, 502);

    // A verificacao, que e a parte que garante em vez de pedir.
    for (const { padrao, motivo } of PROIBIDO) {
      if (padrao.test(rascunho)) {
        return json({ code: 'RASCUNHO_RECUSADO', error: `O rascunho continha ${motivo}.` }, 422);
      }
    }
    if (rascunho.length > 1200) {
      return json({ code: 'RASCUNHO_RECUSADO', error: 'O rascunho ficou longo demais para uma resposta pública.' }, 422);
    }

    return json({ rascunho, modelo: MODELO });
  } catch (erro) {
    return json({ code: 'MODELO_INDISPONIVEL', error: String(erro).slice(0, 160) }, 502);
  }
});
