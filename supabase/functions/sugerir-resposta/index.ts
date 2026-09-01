import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

/**
 * Rascunha o texto a enviar a quem escreveu, lendo o que a pessoa escreveu.
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
 * OS DOIS CANAIS, E POR QUE AS REGRAS DELES SAO DIFERENTES (01/09/2026)
 *
 * `public` e uma resposta que o dono publica na pagina do Google, debaixo da
 * avaliacao, para desconhecidos lerem. `private` e um recado directo a quem
 * deixou contacto no formulario do QR, que mais ninguem le.
 *
 * A diferenca nao e de tom, e de risco, e ela inverte uma proibicao:
 *
 *   Em PUBLICO, prometer reembolso, desconto ou refeicao gratis ensina o
 *   proximo leitor que uma avaliacao de uma estrela vale dinheiro. Por isso o
 *   canal publico RECUSA qualquer promessa de reparacao.
 *
 *   Em PRIVADO, oferecer resolver e exactamente a coisa certa a dizer, e o
 *   molde tem uma variante inteira para isso (`com-reparacao`). Recusa-la aqui
 *   seria entregar ao dono um recado proibido de oferecer o que ele quer
 *   oferecer. Por isso o canal privado PERMITE a reparacao.
 *
 * O que o privado ganha no lugar e a proibicao que o proprio molde ja escreve
 * na dica da variante: "nunca em troca de apagar ou mudar uma avaliacao
 * publica. Isso e proibido." Trocar reparacao por avaliacao viola as politicas
 * do Google e pode custar a ficha do cliente. E a unica regra que existe so no
 * privado, e a razao de o canal privado nao ser o canal publico com o texto
 * amaciado.
 *
 * O canal chega no corpo do pedido e o PADRAO E `public`. Um chamador antigo,
 * que nao saiba do campo, continua a receber exactamente o que recebia.
 *
 * O QUE ELA NAO MUDA
 *
 * O Binno continua sem publicar e sem enviar. O que sai daqui e um rascunho que
 * o dono le, edita e envia em nome dele. A funcao nao decide se responde, nao
 * escolhe a avaliacao, nao toca na fila.
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

type Canal = 'public' | 'private';
type Regra = { padrao: RegExp; motivo: string };

/**
 * O que NENHUM rascunho pode conter, em canal nenhum.
 *
 * ISTO E UMA LISTA DE BLOQUEIO, NAO UMA GARANTIA
 *
 * Uma lista de palavras so apanha as palavras que estao nela. Ela nao entende o
 * texto: um rascunho que prometa reparacao por outras palavras ("passe ca
 * amanha que resolvemos", "falamos sobre o valor") passa por aqui inteiro. O
 * que ela garante e o caso comum e barato, nao o caso adversarial.
 *
 * Por isso ela nao substitui a ultima defesa, que e o dono ler antes de enviar.
 * O Binno nao publica nem envia nada em nome dele exactamente por isso.
 */
const SEMPRE_PROIBIDO: Regra[] = [
  // Marcelo, em 30/08/2026: "usam travessao, nunca usaria isso, ja deixa claro
  // que e IA". O tracinho longo e a marca mais reconhecivel de texto gerado.
  { padrao: new RegExp(`[${TRAVESSAO}${MEIO_RISCO}]`), motivo: 'travessao' },
  // Dizer que e um assistente quebra a voz do negocio, em qualquer lingua e em
  // qualquer canal.
  { padrao: /\b(intelig[eê]ncia artificial|assistente virtual|sou uma? (IA|intelig)|inteligencia artificial|asistente virtual|artificial intelligence|virtual assistant|language model|an? AI\b)/i, motivo: 'revela automacao' },
];

/**
 * So no PUBLICO: o dono nao autorizou reparacao nenhuma, e prometer em nome
 * dele cria uma divida que ele nao sabe que tem. Uma entrada por idioma que o
 * produto atende.
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
 *
 * As formas VERBAIS entram junto das nominais. A auditoria de 31/08/2026
 * mostrou que "Vamos devolver o valor" e "Vamos compensar o transtorno"
 * passavam inteiras: `devolu[cç]` apanha "devolucao" e nao "devolver",
 * `compensa[cç]` apanha "compensacao" e nao "compensar". E "devolver o valor"
 * e a forma mais natural de prometer reembolso em portugues.
 */
const REPARACAO: Regra[] = [
  { padrao: /\b(reembols|devolv|devolu[cç]|ressarc|desconto|cortesia|brinde|gr[aá]tis|compensa|por (nossa|minha) conta|sem custo|sem qualquer custo|oferta da casa|vale de)/i, motivo: 'promessa de reparacao (pt)' },
  { padrao: /\b(descuento|reembols|devolver|devolvere|devoluci|cortes[ií]a|obsequio|gratis|compensa|resarci|sin (coste|cargo|costo)|invita la casa|vale de)/i, motivo: 'promessa de reparacao (es)' },
  { padrao: /\b(refund|discount|voucher|coupon|rebate|reimburs|compensat|complimentary|on the house|free of charge|for free|at no (cost|charge)|free (meal|drink|dessert|night|stay|room)|gift (card|voucher))/i, motivo: 'promessa de reparacao (en)' },
];

/**
 * So no PRIVADO: o recado nao fala da avaliacao publica. De nenhuma maneira.
 *
 * POR QUE A REGRA E ESTA, E NAO "NAO TROCAR"
 *
 * A primeira versao desta lista, escrita na mesma manha, tentava apanhar a
 * TROCA: um verbo de apagar ou mudar perto de uma palavra de avaliacao. Uma
 * auditoria adversarial mediu-a em 01/09/2026 e ela falhava nos dois sentidos,
 * o que era previsivel: "oferecer X em troca de mudar Y" e uma relacao entre
 * partes da frase, e uma expressao regular nao le relacoes.
 *
 *   Falso negativo: 18 trocas plausiveis escritas a mao, 18 passaram. Faltavam
 *   verbos ("tirar", "editar", "reconsiderar", "withdraw", "bump"), faltavam
 *   alvos ("a nota" sozinha, "opinion", "puntuacion") e a janela de 40
 *   caracteres nao chegava para uma oracao relativa no meio.
 *
 *   Falso positivo: 5 de 10 recados legitimos foram RECUSADOS, e eram as
 *   frases mais provaveis de todas ("obrigado pela avaliacao, vou melhorar o
 *   turno da noite"). Pior, os alvos nao tinham fronteira de palavra: `star`
 *   apanhava "starter", `estrela` apanhava o nome de um cliente chamado "Cinco
 *   Estrelas", e esse nome entra em TODO rascunho porque o pedido manda
 *   assina-lo. Esse cliente teria o canal privado partido para sempre, sem
 *   erro nenhum na tela: um rascunho recusado cai no molde em silencio.
 *
 * A regra nova e a que uma expressao regular SABE verificar, e e mais forte:
 * o recado privado nao menciona avaliacao, nota, estrelas nem Google. Qualquer
 * troca tem de nomear a avaliacao para existir, logo toda troca cai aqui. E a
 * regra tambem e certa por si: quem escreveu no formulario da mesa escreveu ao
 * dono, e um recado que responde falando da pagina publica esta a mudar de
 * assunto.
 *
 * MEDIDO ANTES DE ESCRITO. Com a linha do pedido a proibir estas palavras, 10
 * recados privados de teste (pt, es, en, com e sem nota, queixa e elogio)
 * deram ZERO mencoes. A regra estrita nao custa rascunho nenhum na pratica.
 *
 * O NOME DO NEGOCIO SAI DO TEXTO ANTES DA CONFERENCIA. E a unica parte do
 * rascunho que nao foi o modelo que escolheu: o pedido manda termina-lo com o
 * nome. Um negocio chamado "Estrela do Norte" nao pode ser recusado por se
 * assinar.
 *
 * As entradas ficam separadas por idioma para o guarda poder provar cada uma
 * vermelha por si.
 */
const FALAR_DA_AVALIACAO: Regra[] = [
  // `nota` leva uma excecao: "tomar nota" e uma frase normal de quem promete
  // agir, e nao uma referencia a pontuacao.
  { padrao: /\b(avalia[çc][õoãa]\w*|(?<!tomar )(?<!tomei )(?<!tomo )(?<!tomarei )notas?|estrelas?|google)\b/i, motivo: 'fala da avaliacao publica (pt)' },
  { padrao: /\b(rese[ñn]as?|valoraci[óo]n\w*|puntuaci[óo]n\w*|calificaci[óo]n\w*|estrellas?|google)\b/i, motivo: 'fala da avaliacao publica (es)' },
  { padrao: /\b(reviews?|ratings?|stars?|scores?|google)\b/i, motivo: 'fala da avaliacao publica (en)' },
];

const PROIBIDO: Record<Canal, Regra[]> = {
  public: [...SEMPRE_PROIBIDO, ...REPARACAO],
  private: [...SEMPRE_PROIBIDO, ...FALAR_DA_AVALIACAO],
};

// Escolhido em 31/08/2026 comparando tres modelos com os comentarios reais da
// Noa. O gpt-5-nano, o mais barato da tabela, devolveu VAZIO nas quatro provas:
// gastou o orcamento inteiro de saida a raciocinar e nao sobrou resposta, logo
// custava mais e nao entregava nada. Entre os dois que funcionaram, este soa
// como dono de negocio pequeno enquanto o gpt-4o-mini soa como departamento.
// A diferenca de preco entre eles e de centavos por mes; a diferenca de voz e
// o que o cliente le.
const MODELO = Deno.env.get('OPENAI_MODEL') || 'gpt-4.1-nano';

/**
 * A variante do portugues segue o pais do NEGOCIO, e nao o texto do cliente.
 *
 * POR QUE ISTO E PRECISO (01/09/2026)
 *
 * Ao provar o canal privado, os quatro rascunhos sairam em portugues do Brasil
 * ("Oi Ana", "voce poderia", "compartilhar") para um negocio em Portugal. O
 * modelo escreve na lingua do cliente, mas a lingua nao escolhe a variante: sem
 * instrucao, ele cai no portugues que mais viu.
 *
 * Para o piloto isto nao e um detalhe. O primeiro cliente e em Portugal, e um
 * recado do dono de um restaurante portugues escrito em brasileiro le-se como
 * escrito por outra pessoa, que e o oposto do que este texto existe para fazer.
 *
 * A regra e a MESMA de `resolveContentLocale` em `src/lib/replySuggestions.ts`,
 * de proposito: so o valor exactamente 'BR' vira brasileiro, e ausente, vazio
 * ou qualquer outro pais cai em Portugal. Duas regras diferentes para a mesma
 * decisao dariam ao dono um molde numa variante e um rascunho noutra, na mesma
 * tela.
 */
const VARIANTE_DO_PORTUGUES = (pais: string | null) => pais === 'BR'
  ? 'If that language is Portuguese, write Brazilian Portuguese (use "voce").'
  : 'If that language is Portuguese, write European Portuguese as spoken in Portugal (use "si" or "voce" as in Portugal, never "voce" in the Brazilian way, and never Brazilian spellings or Brazilian expressions).';

/**
 * Os pedidos sao escritos em INGLES, e a resposta vem em JSON com o idioma
 * declarado antes do texto. As duas coisas foram descobertas a testar, em
 * 01/09/2026, depois de Marcelo ver uma resposta em portugues para uma
 * avaliacao em ingles.
 *
 * O pedido anterior estava escrito em portugues e mandava "responda no MESMO
 * idioma". O modelo respondia em portugues a tudo: a lingua do pedido vence a
 * instrucao sobre a lingua. Reescrever o pedido em ingles sozinho foi pior,
 * porque ai ele respondia em espanhol a tudo.
 *
 * O que resolve e nao pedir que ele adivinhe em silencio: ele DECLARA o idioma
 * num campo, e so depois escreve. Declarar primeiro prende o resto.
 *
 * A chave do JSON e `reply` e nao `resposta` por um motivo achado no teste: com
 * a chave em portugues, ao responder em espanhol o modelo traduzia a propria
 * chave para `respuesta` e o texto chegava vazio.
 */
const PEDIDO_PUBLICO = (negocio: string, nota: number | null, comentario: string, pais: string | null) => `You reply to customer reviews as the owner of "${negocio}".

Rating given: ${nota === null ? 'none' : `${nota} out of 5`}
The review, verbatim:
"""
${comentario}
"""

Step 1. Identify the language the review is written in.
Step 2. Write the owner's public reply ENTIRELY in that same language. ${VARIANTE_DO_PORTUGUES(pais)}

Rules for the reply, all mandatory:
- Name the concrete thing the customer mentioned. A reply that would fit any review is wrong.
- Sound like a small business owner talking, plain and direct, no corporate words.
- Never promise a refund, discount, voucher, free item or any compensation.
- Never invent a fact about the business that is not in the review.
- Never say or imply you are an AI.
- No em dash and no en dash.
- Between 2 and 5 sentences.
- End with "${negocio}" on its own line.

Answer with JSON only, no other text:
{"language":"<the review\'s language, in English>","reply":"<the reply>"}`;

/**
 * O pedido privado. Tres coisas o separam do publico, e cada uma corresponde a
 * uma diferenca real do canal:
 *
 *   E DIRECTO. Diz-se ao modelo, em texto, que isto nao e publicado em lado
 *   nenhum: e um recado de uma pessoa para outra, como uma mensagem de
 *   telemovel. Sem isso o modelo escreve um comunicado com destinatario.
 *
 *   PODE OFERECER. "You MAY offer to fix it" esta la de proposito, porque e a
 *   coisa certa a dizer em privado e porque o molde ja oferece na variante
 *   `com-reparacao`. E a instrucao que o canal publico proibe.
 *
 *   NAO NEGOCEIA A AVALIACAO. A frase que proibe trocar seja o que for por
 *   apagar, mudar ou melhorar uma avaliacao publica. O pedido diz, e a lista
 *   `TROCA` verifica depois, porque pedir nao e garantir.
 *
 * O nome de quem escreveu entra quando existe, para o recado abrir como o molde
 * abre (`greeting`) em vez de comecar num "Ola" sem ninguem.
 */
const PEDIDO_PRIVADO = (negocio: string, nota: number | null, comentario: string, cliente: string | null, pais: string | null) => `You draft a PRIVATE message from the owner of "${negocio}" to one customer who sent private feedback. It is not published anywhere and nobody else reads it. It is a direct message, like a phone message written down.

${cliente ? `The customer's name: ${cliente}` : 'The customer left no name.'}
Rating given: ${nota === null ? 'none' : `${nota} out of 5`}
What the customer wrote, verbatim:
"""
${comentario}
"""

Step 1. Identify the language the customer wrote in.
Step 2. Write the owner's private message ENTIRELY in that same language. ${VARIANTE_DO_PORTUGUES(pais)}

Rules for the message, all mandatory:
- Name the concrete thing the customer mentioned. A message that would fit anyone is wrong.
- Speak as one person to another. Say "I", not "we", wherever the language allows it. No corporate words.
- You MAY offer to fix it, to talk, to have them come back, or to make it right. This is private, so making it right is the point.
- NEVER write the words review, rating, stars, score, Google, or their equivalents in the language you are writing. Do not thank them for a review, do not mention any public page, and never offer anything in exchange for changing one. They wrote to the owner directly, so refer only to what they told you.
- Ask one concrete question that helps the owner understand what happened.
- Never invent a fact about the business that is not in what the customer wrote.
- Never say or imply you are an AI.
- No em dash and no en dash.
- Between 3 and 6 sentences.
${cliente ? `- Open by greeting ${cliente} by name.` : ''}- End with "${negocio}" on its own line.

Answer with JSON only, no other text:
{"language":"<the customer's language, in English>","reply":"<the message>"}`;

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
  const cliente = typeof corpo.customerName === 'string' && corpo.customerName.trim() ? corpo.customerName.trim().slice(0, 80) : null;
  // Qualquer valor que nao seja exactamente 'private' cai no publico, que e o
  // canal com as regras mais apertadas. Um chamador antigo, um campo com erro
  // de escrita e um campo ausente levam todos ao mesmo lugar seguro.
  const canal: Canal = corpo.channel === 'private' ? 'private' : 'public';
  // Mesma regra de `resolveContentLocale`: so 'BR' exacto vira brasileiro.
  const pais = typeof corpo.businessCountry === 'string' && corpo.businessCountry.trim() ? corpo.businessCountry.trim() : null;

  if (comentario.length < 3) return json({ code: 'SEM_COMENTARIO', error: 'Sem texto para responder.' }, 422);
  // Um comentario absurdamente longo e quase sempre colagem ou ataque. Cortar
  // protege o custo e o tempo de resposta sem perder o assunto.
  const recorte = comentario.slice(0, 1500);
  const pedido = canal === 'private'
    ? PEDIDO_PRIVADO(negocio, nota, recorte, cliente, pais)
    : PEDIDO_PUBLICO(negocio, nota, recorte, pais);

  try {
    const resposta = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${chave}` },
      body: JSON.stringify({
        model: MODELO,
        messages: [{ role: 'user', content: pedido }],
        temperature: 0.3,
        // O recado privado tem uma frase a mais e uma pergunta, e o corte por
        // orcamento chegaria como JSON partido, ou seja, como template.
        max_tokens: canal === 'private' ? 500 : 400,
        response_format: { type: 'json_object' },
      }),
    });

    if (!resposta.ok) {
      const detalhe = await resposta.text().catch(() => '');
      return json({ code: 'MODELO_RECUSOU', error: `O modelo devolveu ${resposta.status}.`, detalhe: detalhe.slice(0, 200) }, 502);
    }

    const dados = await resposta.json();
    const bruto = String(dados?.choices?.[0]?.message?.content ?? '').trim();
    let rascunho = '';
    let idioma = '';
    try {
      const objeto = JSON.parse(bruto) as Record<string, unknown>;
      rascunho = String(objeto?.reply ?? '').trim();
      idioma = String(objeto?.language ?? '').trim();
    } catch {
      // JSON invalido e o mesmo que resposta vazia: quem chamou fica com o
      // texto antigo, em vez de receber o objeto cru na caixa.
      rascunho = '';
    }
    if (!rascunho) return json({ code: 'MODELO_VAZIO', error: 'O modelo devolveu vazio.' }, 502);

    // A verificacao, que e a parte que garante em vez de pedir. A lista muda
    // com o canal: ver o cabecalho.
    //
    // O nome do negocio sai do texto ANTES de ser conferido. E a unica parte
    // do rascunho que nao foi o modelo que escolheu (o pedido manda assinar
    // com ele), e um negocio chamado "Estrela do Norte" ou "Cinco Estrelas"
    // seria recusado por se assinar, para sempre e sem erro na tela.
    const paraConferir = negocio ? rascunho.split(negocio).join(' ') : rascunho;
    for (const { padrao, motivo } of PROIBIDO[canal]) {
      if (padrao.test(paraConferir)) {
        return json({ code: 'RASCUNHO_RECUSADO', error: `O rascunho continha ${motivo}.` }, 422);
      }
    }
    // O recado privado tem uma frase a mais que a resposta publica, e o molde
    // privado ja e mais longo que o publico. O tecto acompanha.
    const tecto = canal === 'private' ? 1600 : 1200;
    if (rascunho.length > tecto) {
      return json({ code: 'RASCUNHO_RECUSADO', error: 'O rascunho ficou longo demais.' }, 422);
    }

    return json({ rascunho, idioma, modelo: MODELO, canal });
  } catch (erro) {
    return json({ code: 'MODELO_INDISPONIVEL', error: String(erro).slice(0, 160) }, 502);
  }
});
