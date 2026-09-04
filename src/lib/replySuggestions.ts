/**
 * Sugestões de resposta a avaliações e a casos internos.
 *
 * O dono do negócio sabe o que aconteceu na sua casa, mas trava na primeira
 * frase — e uma resposta mal escrita em público custa mais do que o silêncio.
 * Isto dá-lhe um texto pronto que ele lê, ajusta e cola.
 *
 * Deliberadamente determinístico: sem IA, sem API externa, sem chave paga e sem
 * latência. As regras são as mesmas que um consultor de reputação usaria —
 * reconhecer o que foi dito, nunca discutir em público, e levar o caso para
 * fora da vitrina. Mesma decisão tomada no bloco de comentários que pedem
 * atenção da Visão geral, pela mesma razão: o produto tem de funcionar com o
 * banco em pé e mais nada.
 *
 * A resposta sai no idioma em que o cliente escreveu. Em Lisboa, metade das
 * avaliações de um restaurante do centro não é em português.
 */

export type ReplyLocale = 'pt' | 'es' | 'en';

/**
 * O português tem dois conteúdos possíveis: o de Portugal, que é o `pt`
 * histórico e o que a deteção abaixo continua a devolver, e o do Brasil, que
 * só entra quando o NEGÓCIO é brasileiro, não quando o cliente escreve em
 * português. `pt-BR` nunca é um valor de `ReplyLocale` nem de detecção: é uma
 * chave interna de conteúdo, resolvida depois de já se saber em que língua o
 * cliente escreveu (ver `resolveContentLocale`).
 */
type ContentLocale = ReplyLocale | 'pt-BR';

/**
 * `public` = resposta que vai ser publicada no Google, lida por estranhos.
 * `private` = mensagem directa a quem deixou contacto no formulário do QR.
 * O tom muda: em público escreve-se para quem lê depois, não para quem reclamou.
 */
export type ReplyChannel = 'public' | 'private';

export interface ReplySuggestion {
  id: string;
  /** Nome da variante, para o dono escolher entre elas. */
  title: string;
  /** Quando usar esta variante em vez das outras. */
  hint: string;
  /** O texto a copiar. */
  body: string;
}

export interface ReplySuggestionInput {
  /** 1 a 5, ou `null` quando o cliente escreveu sem avaliar. */
  rating: number | null;
  /** O que o cliente escreveu. Pode vir vazio. */
  text?: string | null;
  customerName?: string | null;
  businessName?: string | null;
  channel: ReplyChannel;
  /** Força o idioma. Sem isto, é detectado a partir do texto do cliente. */
  locale?: ReplyLocale;
  /**
   * `profiles.business_country` do negócio (ex.: 'BR', 'PT'), o mesmo campo
   * que decide pt-BR vs. pt-PT em `src/lib/businessLocale.ts`. Decide a
   * variante do português da resposta publicada em nome do dono; não muda a
   * deteção do idioma do cliente. Vazio ou diferente de 'BR' cai no português
   * de hoje (Portugal).
   *
   * OBRIGATÓRIO, e sem valor por omissão, desde 30/08/2026. Enquanto era
   * opcional, quatro das sete chamadas do projeto simplesmente não o passavam,
   * e o esquecimento não tinha sintoma nenhum em código: a função devolvia
   * português de Portugal e seguia. O sintoma aparecia no fim, na tela de um
   * dono brasileiro, com "casa de banho" a caminho de um cliente em Aracaju.
   *
   * Quem não sabe o país escreve `null` de propósito, e a escolha fica à
   * vista de quem lê a chamada. Esquecer passou a ser erro de compilação, que
   * é o único momento em que isto ainda é barato de corrigir.
   */
  businessCountry: string | null;
}

/**
 * `unrated` é a ausência de nota, e não uma nota do meio. Existe porque um
 * comentário sem nota não autoriza nenhuma das três posições: não houve queixa
 * a lamentar, não houve elogio a celebrar e não houve nota média a recuperar.
 */
type Sentiment = 'negative' | 'neutral' | 'positive' | 'unrated';

const stripAccents = (value: string): string =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/**
 * Palavras muito frequentes, que só existem numa das três línguas.
 *
 * A LISTA CRESCEU EM 01/09/2026, E PORQUÊ.
 *
 * Até aqui cada lista era vocabulário de restaurante: "comida", "atendimento",
 * "staff", "camarero". Isso acerta numa avaliação de mesa e falha em tudo o
 * resto. O defeito foi visto na conta do dono, num comentário privado que diz
 * "Horrible App, i can't even log in.": nenhuma das três listas continha uma
 * única daquelas palavras, as três pontuações ficaram a zero, e a votação a
 * zero devolvia português. O cliente escreveu em inglês e o painel abria o
 * seletor em português.
 *
 * O que entra agora são palavras de classe fechada, que aparecem em qualquer
 * assunto: pronomes, preposições, artigos, auxiliares. "in", "my", "can" e
 * "even" identificam inglês numa queixa sobre uma aplicação tão bem como
 * "food" identificava numa queixa sobre o jantar, e continuam a identificar
 * quando o assunto for outro qualquer.
 *
 * A REGRA DE ENTRADA NÃO MUDOU: cada palavra tem de existir numa língua só,
 * depois de tirados os acentos. Foi por isso que ficaram de fora palavras
 * óbvias e tentadoras: "so" (que é o "só" português sem acento), "me", "no",
 * "porque", "funciona", "entrar", "desde", "dos" e "horrible" (que é espanhol
 * tal e qual). Uma palavra partilhada não desempata nada: pontua os dois lados
 * e só faz barulho.
 *
 * E "comida" SAIU das duas listas, onde estava desde o início. Ela é a mesma
 * palavra em português e em espanhol, e por isso dava um ponto a cada um dos
 * dois de cada vez que aparecia. Nunca decidiu nada; o que fazia era diluir o
 * peso das palavras que decidem. Foi encontrada ao escrever a asserção que
 * mede esta regra na lista inteira, em `scripts/check-idioma-do-cliente.mjs`.
 */
const LOCALE_MARKERS: Record<ReplyLocale, string[]> = {
  pt: [
    'nao', 'muito', 'foi', 'estava', 'atendimento', 'otimo', 'mas', 'demorou', 'aqui', 'para', 'lugar', 'sempre', 'gostei', 'voltar',
    'uma', 'com', 'sem', 'das', 'pelo', 'pela', 'nem', 'entao', 'ainda', 'isso', 'ele', 'ela', 'voce', 'sao', 'tambem',
    'minha', 'meu', 'quando', 'onde', 'muita', 'muitos', 'muitas', 'melhor', 'pior', 'horrivel', 'pessimo', 'obrigado',
    'aplicacao', 'aplicativo', 'conta', 'ontem', 'hoje', 'agora', 'tenho', 'consegui', 'fazer',
  ],
  es: [
    'pero', 'muy', 'estaba', 'atencion', 'bueno', 'buena', 'nada', 'volver', 'todo', 'gusto', 'camarero', 'tambien', 'malo',
    'una', 'con', 'sin', 'los', 'las', 'del', 'ni', 'entonces', 'ahora', 'ellos', 'ella', 'mi', 'mucho', 'mucha', 'siempre',
    'donde', 'cuando', 'mejor', 'peor', 'son', 'fue', 'estan', 'tengo', 'tiene', 'tienen', 'puedo', 'puede', 'pueden',
    'hacer', 'aplicacion', 'cuenta', 'ayer', 'hoy',
  ],
  en: [
    'the', 'was', 'and', 'very', 'food', 'service', 'good', 'great', 'but', 'they', 'were', 'staff', 'place', 'again', 'nice',
    'i', 'in', 'is', 'it', 'my', 'you', 'we', 'can', 'cannot', 'even', 'log', 'not', 'this', 'that', 'have', 'with', 'to', 'of',
    'at', 'on', 'all', 'get', 'got', 'here', 'there', 'never', 'always', 'worst', 'best', 'love', 'am', 'are', 'be', 'been',
    'do', 'does', 'did', 'dont', 'didnt', 'isnt', 'wasnt', 'what', 'why', 'how', 'when', 'who', 'from', 'about', 'after',
    'before', 'into', 'than', 'then', 'them', 'their', 'these', 'those', 'just', 'only', 'still', 'also', 'because',
    'would', 'could', 'should', 'will', 'wont', 'account', 'crash', 'useless',
  ],
};

/**
 * Sinais de ortografia que uma língua tem e as outras duas não.
 *
 * `ã`, `õ` e `ç` aparecem em português e não no espanhol nem no inglês; `ñ`,
 * `¿` e `¡` são espanhóis e de mais ninguém. O inglês não tem sinal positivo
 * nenhum: identifica-se pelas palavras, que é o que a lista acima passou a
 * garantir.
 *
 * Isto SÓ DESEMPATA, nunca pontua. Um "não" solto dentro de um parágrafo
 * inglês não pode virar a leitura da frase inteira; o que ele pode é decidir
 * um texto acentuado e curto em que nenhuma palavra da lista apareceu.
 */
const ORTHOGRAPHIC_SIGNALS: Partial<Record<ReplyLocale, RegExp>> = {
  pt: /[ãõç]/i,
  es: /[ñ¿¡]/i,
};

/**
 * O idioma em que o cliente escreveu, para a resposta sair na língua dele.
 *
 * A ordem das decisões, e cada uma existe por um caso real:
 *
 * 1. Texto curto demais para decidir cai em português. Doze caracteres é o
 *    chão histórico e continua: "Top!" não é evidência de língua nenhuma.
 * 2. Votação pelas palavras acima. Ganha quem tiver mais, sozinho.
 * 3. Empate, ou votação a zero, consulta a ortografia.
 * 4. Sem nada disso, português, que é a língua do piloto e do dono.
 *
 * O passo 4 é o ÚLTIMO recurso, e não o primeiro. Até 01/09/2026 qualquer
 * comentário sem vocabulário de restaurante caía nele, e era assim que
 * "Horrible App, i can't even log in." abria o seletor em português.
 *
 * Quem escolhe no fim continua a ser o dono: o seletor ABRE no que isto
 * devolve, e ele troca com um toque.
 */
export const detectReplyLocale = (text?: string | null): ReplyLocale => {
  if (!text || text.trim().length < 12) return 'pt';

  const words = stripAccents(text).split(/[^a-z]+/).filter(Boolean);
  if (words.length === 0) return 'pt';

  const scores: Record<ReplyLocale, number> = { pt: 0, es: 0, en: 0 };
  for (const word of words) {
    for (const locale of ['pt', 'es', 'en'] as ReplyLocale[]) {
      if (LOCALE_MARKERS[locale].includes(word)) scores[locale] += 1;
    }
  }

  const best = (Object.keys(scores) as ReplyLocale[]).reduce((a, b) =>
    scores[b] > scores[a] ? b : a
  );
  const tied = (Object.keys(scores) as ReplyLocale[]).filter((locale) => scores[locale] === scores[best]);
  if (scores[best] > 0 && tied.length === 1) return best;

  // A ortografia só é consultada entre quem ainda está empatado. Com a votação
  // a zero, "empatados" são as três.
  const candidates = scores[best] > 0 ? tied : (['pt', 'es', 'en'] as ReplyLocale[]);
  for (const locale of candidates) {
    const signal = ORTHOGRAPHIC_SIGNALS[locale];
    if (signal && signal.test(text)) return locale;
  }

  return scores[best] > 0 ? best : 'pt';
};

interface Theme {
  id: string;
  /** Procurados no texto sem acentos, em minúsculas, como sub-cadeia. */
  keywords: string[];
  /** "…lamento que {noun} não tenha correspondido". */
  noun: Record<ContentLocale, string>;
  /** O que o dono diz que vai fazer. Concreto, não "vamos melhorar". */
  fix: Record<ContentLocale, string>;
  /** Usado quando a avaliação é boa: "…que {praise}". */
  praise: Record<ContentLocale, string>;
}

/**
 * Ordem importa: o primeiro tema encontrado é o que entra na resposta. Está
 * ordenado pelo que mais pesa na decisão de um cliente voltar — higiene e
 * atendimento acima de preço.
 */
const THEMES: Theme[] = [
  {
    id: 'limpeza',
    keywords: ['limpeza', 'sujo', 'suja', 'higiene', 'casa de banho', 'banheiro', 'cheiro', 'mosca', 'limpieza', 'sucio', 'sucia', 'bano', 'olor', 'clean', 'dirty', 'hygiene', 'toilet', 'bathroom', 'smell', 'fly'],
    noun: { pt: 'a limpeza', 'pt-BR': 'a limpeza', es: 'la limpieza', en: 'cleanliness' },
    fix: {
      pt: 'Reforcei a rotina de limpeza e a verificação das casas de banho durante o serviço.',
      'pt-BR': 'Reforcei a limpeza e a conferência dos banheiros durante o expediente.',
      es: 'He reforzado la rutina de limpieza y la revisión de los baños durante el servicio.',
      en: 'We have tightened our cleaning routine and the checks on the washrooms during service.',
    },
    praise: { pt: 'tenha reparado no cuidado com a limpeza', 'pt-BR': 'tenha notado o cuidado com a limpeza', es: 'hayas notado el cuidado con la limpieza', en: 'you noticed how much care we put into keeping the place clean' },
  },
  {
    id: 'atendimento',
    keywords: ['atendimento', 'atendente', 'funcionario', 'funcionaria', 'empregado', 'empregada', 'garcom', 'mal-educado', 'mal educado', 'rude', 'grosseiro', 'simpat', 'equipa', 'gerente', 'atencion', 'camarero', 'camarera', 'personal', 'grosero', 'amable', 'service', 'staff', 'waiter', 'waitress', 'server', 'manager', 'friendly'],
    noun: { pt: 'o atendimento', 'pt-BR': 'o atendimento', es: 'la atención', en: 'the service you received' },
    fix: {
      pt: 'Já falei com a equipa que estava nesse turno, com o seu relato na mão.',
      'pt-BR': 'Já conversei com a equipe que estava nesse turno, com o seu relato em mãos.',
      es: 'Ya he hablado con el equipo de ese turno, con tu comentario delante.',
      en: 'I have spoken with the team who were on that shift, with your message in front of them.',
    },
    praise: { pt: 'o tenhamos atendido como merece', 'pt-BR': 'tenhamos atendido você como merece', es: 'te hayamos atendido como mereces', en: 'we looked after you the way we should' },
  },
  {
    id: 'espera',
    keywords: ['espera', 'esperar', 'esperei', 'demora', 'demorou', 'demorado', 'lento', 'lentidao', 'fila', 'tardo', 'tarde mucho', 'cola', 'wait', 'waiting', 'waited', 'slow', 'queue', 'ages', 'forever'],
    noun: { pt: 'o tempo de espera', 'pt-BR': 'o tempo de espera', es: 'el tiempo de espera', en: 'the wait' },
    fix: {
      pt: 'Estou a rever a escala e os tempos de saída da cozinha nas horas de maior movimento.',
      'pt-BR': 'Estou revendo a escala e o tempo de saída da cozinha nos horários de mais movimento.',
      es: 'Estoy revisando los turnos y los tiempos de salida de cocina en las horas de más movimiento.',
      en: 'I am reviewing our staffing and kitchen timings for the busiest hours.',
    },
    praise: { pt: 'tenha sido servido sem esperas', 'pt-BR': 'não tenha precisado esperar', es: 'te hayamos servido sin esperas', en: 'we got everything to you without a wait' },
  },
  {
    id: 'comida',
    keywords: ['comida', 'prato', 'sabor', 'frio', 'fria', 'temperatura', 'hamburguer', 'burger', 'carne', 'batata', 'bebida', 'cozinha', 'salgado', 'cru', 'crua', 'queimado', 'plato', 'sabor', 'frio', 'hamburguesa', 'cocina', 'crudo', 'quemado', 'food', 'dish', 'meal', 'taste', 'tasteless', 'cold', 'meat', 'fries', 'drink', 'kitchen', 'raw', 'burnt'],
    noun: { pt: 'a comida', 'pt-BR': 'a comida', es: 'la comida', en: 'the food' },
    fix: {
      pt: 'Levei o caso à cozinha e revimos a preparação e a temperatura de saída desse prato.',
      'pt-BR': 'Levei o caso para a cozinha e revisamos o preparo e a temperatura de saída desse prato.',
      es: 'He llevado el caso a cocina y hemos revisado la preparación y la temperatura de salida de ese plato.',
      en: 'I took this to the kitchen and we have gone over how that dish is prepared and how it leaves the pass.',
    },
    praise: { pt: 'a comida tenha estado à altura', 'pt-BR': 'a comida tenha ficado à altura', es: 'la comida haya estado a la altura', en: 'the food lived up to what you hoped for' },
  },
  {
    id: 'pedido',
    keywords: ['pedido', 'encomenda', 'entrega', 'takeaway', 'take away', 'reserva', 'errado', 'trocado', 'faltou', 'esqueceram', 'equivocado', 'faltaba', 'olvidaron', 'order', 'delivery', 'booking', 'reservation', 'wrong', 'missing', 'forgot'],
    noun: { pt: 'o seu pedido', 'pt-BR': 'seu pedido', es: 'tu pedido', en: 'your order' },
    fix: {
      pt: 'Revi connosco como os pedidos são confirmados antes de saírem, para que não volte a acontecer.',
      'pt-BR': 'Revisei com a equipe como os pedidos são conferidos antes de sair, para que isso não aconteça de novo.',
      es: 'Hemos revisado cómo se confirman los pedidos antes de salir, para que no vuelva a ocurrir.',
      en: 'We have gone over how orders are checked before they leave, so it does not happen again.',
    },
    praise: { pt: 'esteja tudo certo com o seu pedido', 'pt-BR': 'esteja tudo certo com seu pedido', es: 'todo haya salido bien con tu pedido', en: 'everything came out right with your order' },
  },
  {
    id: 'preco',
    keywords: ['preco', 'caro', 'valor', 'conta', 'cobranca', 'cobrado', 'precio', 'cuenta', 'cobro', 'price', 'expensive', 'pricey', 'bill', 'charged', 'overpriced', 'value for money'],
    noun: { pt: 'a relação entre o que pagou e o que recebeu', 'pt-BR': 'a relação entre o que pagou e o que recebeu', es: 'la relación entre lo que pagaste y lo que recibiste', en: 'what you got for what you paid' },
    fix: {
      pt: 'Vou rever a nossa carta e o que ela promete, porque o preço só se justifica com a experiência à altura.',
      'pt-BR': 'Vou revisar nosso cardápio e o que ele promete, porque o preço só se justifica com uma experiência à altura.',
      es: 'Voy a revisar nuestra carta y lo que promete, porque el precio sólo se justifica con la experiencia a la altura.',
      en: 'I am reviewing our menu and what it promises, because the price only holds up if the experience does.',
    },
    praise: { pt: 'tenha sentido que valeu o que pagou', 'pt-BR': 'tenha sentido que valeu o que pagou', es: 'hayas sentido que valió lo que pagaste', en: 'you felt it was worth what you paid' },
  },
  {
    id: 'ambiente',
    keywords: ['barulho', 'barulhent', 'ruido', 'musica alta', 'ambiente', 'lotado', 'apertado', 'calor', 'ruidoso', 'musica', 'lleno', 'noise', 'noisy', 'loud', 'music', 'atmosphere', 'crowded', 'cramped'],
    noun: { pt: 'o ambiente da sala', 'pt-BR': 'o ambiente do salão', es: 'el ambiente del local', en: 'the atmosphere in the room' },
    fix: {
      pt: 'Vamos ajustar o som e a disposição das mesas nas horas de maior movimento.',
      'pt-BR': 'Vamos ajustar o som e a disposição das mesas nos horários de mais movimento.',
      es: 'Vamos a ajustar el sonido y la disposición de las mesas en las horas de más movimiento.',
      en: 'We are adjusting the music and the table layout for our busiest hours.',
    },
    praise: { pt: 'se tenha sentido bem na sala', 'pt-BR': 'se tenha sentido bem no salão', es: 'te hayas sentido a gusto en el local', en: 'the room felt right to you' },
  },
];

const findTheme = (text?: string | null): Theme | null => {
  if (!text) return null;
  const haystack = stripAccents(text);
  return THEMES.find((theme) => theme.keywords.some((k) => haystack.includes(k))) ?? null;
};

/**
 * A ausência de nota é testada ANTES de qualquer comparação, e explicitamente.
 *
 * `null <= 2` é `true` em JavaScript, porque o null vira 0 na comparação. Com o
 * teste no fim, ou ausente, quem escrevia um elogio sem dar nota recebia a
 * resposta de uma estrela: pedido de desculpa e oferta de reparação, prontos
 * para o dono enviar em nome dele. Não trocar por `!rating` nem por `rating < 1`:
 * o que se quer saber aqui é se houve nota, não que valor ela tem.
 */
const sentimentOf = (rating: number | null | undefined): Sentiment => {
  if (rating === null || rating === undefined || Number.isNaN(rating)) return 'unrated';
  if (rating <= 2) return 'negative';
  if (rating === 3) return 'neutral';
  return 'positive';
};

interface Ctx {
  greeting: string;
  /** "a comida", "a sua experiência" quando não há tema identificado. */
  noun: string;
  fix: string;
  praise: string;
  signature: string;
}

const GENERIC = {
  noun: { pt: 'a sua experiência', 'pt-BR': 'sua experiência', es: 'tu experiencia', en: 'your experience' },
  fix: {
    pt: 'Já revi o caso com a equipa para perceber onde falhámos.',
    'pt-BR': 'Já revisei o caso com a equipe para entender onde erramos.',
    es: 'Ya he revisado el caso con el equipo para entender dónde fallamos.',
    en: 'I have gone through what happened with the team to understand where we fell short.',
  },
  /*
   * O ELOGIO GENERICO NAO PODE INVENTAR UMA VISITA.
   *
   * Ate 04/09/2026 esta frase era "tenha gostado da visita", fixa, para
   * QUALQUER negocio. Marcelo recebeu no WhatsApp o rascunho para a Mesquita,
   * que escreveu "Agência Top de serviços de Sergipe, profissionais muito
   * capacitados" — e o Binno respondia agradecendo por ela ter gostado da
   * VISITA. Ela nao falou em visita nenhuma, e a Noá e uma agencia digital:
   * muitos clientes nunca puseram os pes la.
   *
   * Isto e o generico: entra quando NENHUM tema foi reconhecido no texto, ou
   * seja, precisamente quando se sabe menos sobre o que a pessoa disse. E o
   * pior sitio possivel para arriscar um detalhe.
   *
   * A frase nova so afirma o que a propria avaliacao ja prova: houve uma
   * experiencia, e ela foi boa. Serve a um restaurante, a uma clinica e a uma
   * agencia sem mentir a nenhum deles.
   */
  praise: {
    pt: 'tenha tido uma boa experiência connosco',
    'pt-BR': 'tenha tido uma boa experiência com a gente',
    es: 'hayas tenido una buena experiencia con nosotros',
    en: 'you had a good experience with us',
  },
} as const;

const buildGreeting = (locale: ContentLocale, name?: string | null): string => {
  const clean = name?.trim();
  if (!clean || clean.toLowerCase().includes('anon')) {
    return { pt: 'Olá,', 'pt-BR': 'Olá,', es: 'Hola,', en: 'Hello,' }[locale];
  }
  const first = clean.split(/\s+/)[0];
  return { pt: `Olá, ${first},`, 'pt-BR': `Olá, ${first},`, es: `Hola, ${first},`, en: `Hello ${first},` }[locale];
};

/**
 * A assinatura é o nome do negócio sozinho na sua linha, do jeito que uma
 * pessoa assina de verdade. Já não antecede o nome por um travessão: era
 * esse sinal que denunciava texto de máquina numa resposta publicada em
 * nome do dono.
 */
const buildSignature = (locale: ContentLocale, business?: string | null): string => {
  const clean = business?.trim();
  if (!clean) {
    return { pt: 'Obrigado, mais uma vez.', 'pt-BR': 'Obrigado, mais uma vez.', es: 'Gracias de nuevo.', en: 'Thank you again.' }[locale];
  }
  return { pt: clean, 'pt-BR': clean, es: clean, en: clean }[locale];
};

type Builder = (c: Ctx) => string;

interface Variant {
  id: string;
  title: Record<ContentLocale, string>;
  hint: Record<ContentLocale, string>;
  body: Record<ContentLocale, Builder>;
}

/**
 * Regras que valem para todas as variantes públicas, e a razão de existirem:
 *
 * - Não se contesta a versão do cliente em público. Quem lê fica do lado de
 *   quem reclamou, mesmo quando o dono tem razão.
 * - Não se pedem dados pessoais na resposta pública.
 * - Não se oferece dinheiro nem refeição grátis em público — atrai reclamações
 *   por interesse e, em muitas jurisdições, cheira a compra de avaliação.
 * - A conversa sai da vitrina: convida-se a falar em privado.
 */
const PUBLIC_NEGATIVE: Variant[] = [
  {
    id: 'curta',
    title: { pt: 'Curta e directa', 'pt-BR': 'Curta e direta', es: 'Corta y directa', en: 'Short and direct' },
    hint: {
      pt: 'A escolha segura quando ainda não sabe exactamente o que correu mal.',
      'pt-BR': 'A escolha segura para quando você ainda não sabe exatamente o que deu errado.',
      es: 'La opción segura cuando aún no sabes exactamente qué salió mal.',
      en: 'The safe choice when you do not yet know exactly what went wrong.',
    },
    body: {
      pt: (c) => `${c.greeting}\n\nObrigado por escrever, e lamento que ${c.noun} não tenha correspondido ao que esperava. Não é assim que queremos receber quem nos visita.\n\nGostava de perceber melhor o que aconteceu. Se puder falar connosco directamente, resolvemos isto consigo.\n\n${c.signature}`,
      'pt-BR': (c) => `${c.greeting}\n\nObrigado por escrever. Sinto muito que ${c.noun} não tenha sido o que você esperava. Não é assim que a gente quer receber quem vem aqui.\n\nGostaria de entender melhor o que aconteceu. Se puder falar direto com a gente, resolvemos isso com você.\n\n${c.signature}`,
      es: (c) => `${c.greeting}\n\nGracias por escribir, y lamento que ${c.noun} no haya estado a la altura de lo que esperabas. No es así como queremos recibir a quien nos visita.\n\nMe gustaría entender mejor qué pasó. Si puedes hablar con nosotros directamente, lo resolvemos contigo.\n\n${c.signature}`,
      en: (c) => `${c.greeting}\n\nThank you for taking the time to write, and I am sorry ${c.noun} was not what you had hoped for. That is not how we want to welcome anyone.\n\nI would like to understand better what happened. If you can get in touch with us directly, we will put it right.\n\n${c.signature}`,
    },
  },
  {
    id: 'com-accao',
    title: { pt: 'Com o que já foi feito', 'pt-BR': 'Com o que já foi feito', es: 'Con lo que ya se hizo', en: 'With what you already did' },
    hint: {
      pt: 'Use quando já tomou uma medida concreta. Ajuste a frase do meio ao que realmente fez.',
      'pt-BR': 'Use quando você já tomou uma providência concreta. Ajuste a frase do meio para o que você realmente fez.',
      es: 'Úsala cuando ya has tomado una medida concreta. Ajusta la frase del medio a lo que hiciste de verdad.',
      en: 'Use when you have already taken a concrete step. Adjust the middle sentence to what you actually did.',
    },
    body: {
      pt: (c) => `${c.greeting}\n\nObrigado pelo seu relato. Foi lido com atenção. Lamento sinceramente o que se passou com ${c.noun}.\n\n${c.fix}\n\nSe nos der uma segunda oportunidade, faço questão de acompanhar a sua visita pessoalmente.\n\n${c.signature}`,
      'pt-BR': (c) => `${c.greeting}\n\nObrigado pelo seu relato. Li com atenção. Sinto muito de verdade pelo que aconteceu com ${c.noun}.\n\n${c.fix}\n\nSe você nos der uma segunda chance, faço questão de acompanhar sua visita pessoalmente.\n\n${c.signature}`,
      es: (c) => `${c.greeting}\n\nGracias por tu comentario. Lo hemos leído con atención. Lamento sinceramente lo que ocurrió con ${c.noun}.\n\n${c.fix}\n\nSi nos das una segunda oportunidad, me encargo personalmente de tu visita.\n\n${c.signature}`,
      en: (c) => `${c.greeting}\n\nThank you for your review. We read it properly. I am genuinely sorry about ${c.noun}.\n\n${c.fix}\n\nIf you give us another chance, I will look after your visit myself.\n\n${c.signature}`,
    },
  },
];

const PUBLIC_NEUTRAL: Variant[] = [
  {
    id: 'perguntar',
    title: { pt: 'Perguntar o que faltou', 'pt-BR': 'Perguntar o que faltou', es: 'Preguntar qué faltó', en: 'Ask what was missing' },
    hint: {
      pt: 'Uma nota do meio é a mais fácil de recuperar: normalmente falta uma coisa só.',
      'pt-BR': 'Uma nota no meio é a mais fácil de recuperar: geralmente falta só uma coisa.',
      es: 'Una nota intermedia es la más fácil de recuperar: casi siempre falta una sola cosa.',
      en: 'A middling rating is the easiest to win back: there is usually one thing missing.',
    },
    body: {
      pt: (c) => `${c.greeting}\n\nObrigado por avaliar. Fico contente por ter havido coisas boas, e quero perceber o que faltou em ${c.noun} para que a visita fosse mesmo boa.\n\nSe nos disser, é isso que vamos trabalhar.\n\n${c.signature}`,
      'pt-BR': (c) => `${c.greeting}\n\nObrigado por avaliar. Fico feliz que tenha tido coisas boas, e quero entender o que faltou em ${c.noun} para a visita ter sido realmente boa.\n\nSe você nos contar, é nisso que vamos trabalhar.\n\n${c.signature}`,
      es: (c) => `${c.greeting}\n\nGracias por tu valoración. Me alegra que haya habido cosas buenas, y quiero entender qué faltó en ${c.noun} para que la visita fuera realmente buena.\n\nSi nos lo cuentas, es en eso en lo que vamos a trabajar.\n\n${c.signature}`,
      en: (c) => `${c.greeting}\n\nThank you for the review. I am glad parts of it worked, and I would like to know what was missing in ${c.noun} to make the visit a good one.\n\nTell us and that is what we will work on.\n\n${c.signature}`,
    },
  },
];

const PUBLIC_POSITIVE: Variant[] = [
  {
    id: 'agradecer',
    title: { pt: 'Agradecer com especificidade', 'pt-BR': 'Agradecer com especificidade', es: 'Agradecer con detalle', en: 'Thank them specifically' },
    hint: {
      pt: 'Responder a quem elogia é o que mais cria clientes habituais — e quase ninguém faz.',
      'pt-BR': 'Responder a quem elogia é o que mais fideliza cliente, e quase ninguém faz.',
      es: 'Responder a quien te elogia es lo que más fideliza — y casi nadie lo hace.',
      en: 'Replying to praise is what builds regulars — and almost nobody does it.',
    },
    body: {
      pt: (c) => `${c.greeting}\n\nMuito obrigado pelas suas palavras. Fico feliz por saber que ${c.praise}. Vou passar isso à equipa, que é quem faz acontecer.\n\nCá o esperamos da próxima.\n\n${c.signature}`,
      'pt-BR': (c) => `${c.greeting}\n\nMuito obrigado pelas suas palavras. Fico feliz em saber que ${c.praise}. Vou passar isso para a equipe, que é quem faz isso acontecer.\n\nEsperamos você na próxima.\n\n${c.signature}`,
      es: (c) => `${c.greeting}\n\nMuchas gracias por tus palabras. Me alegra saber que ${c.praise}. Se lo paso al equipo, que es quien lo hace posible.\n\nTe esperamos en la próxima.\n\n${c.signature}`,
      en: (c) => `${c.greeting}\n\nThank you for the kind words. I am glad ${c.praise}. I will pass it on to the team, who are the ones who make it happen.\n\nWe will be here next time.\n\n${c.signature}`,
    },
  },
];

/**
 * O canal privado é o cliente que deixou contacto no formulário do QR. Aqui é
 * legítimo — e recomendável — pedir detalhes e propor uma reparação concreta,
 * coisa que não se faz à frente de toda a gente.
 */
const PRIVATE_NEGATIVE: Variant[] = [
  {
    id: 'contacto-imediato',
    title: { pt: 'Contacto no próprio dia', 'pt-BR': 'Contato no mesmo dia', es: 'Contacto el mismo día', en: 'Same-day contact' },
    hint: {
      pt: 'Envie hoje, mesmo sem solução ainda. O silêncio é o que perde o cliente.',
      'pt-BR': 'Envie hoje, mesmo sem solução ainda. O silêncio é o que faz perder o cliente.',
      es: 'Envíalo hoy, aunque aún no tengas solución. El silencio es lo que pierde al cliente.',
      en: 'Send today, even without a solution yet. Silence is what loses the customer.',
    },
    body: {
      pt: (c) => `${c.greeting}\n\nSou eu que respondo aqui. Recebi o que escreveu sobre ${c.noun} e queria falar consigo antes de mais nada.\n\nLamento o que aconteceu. Não é o que queremos oferecer a quem nos visita. Pode contar-me um pouco mais: dia, hora e o que se passou?\n\nQuero corrigir isto consigo.\n\n${c.signature}`,
      'pt-BR': (c) => `${c.greeting}\n\nSou eu quem responde aqui. Recebi o que você escreveu sobre ${c.noun} e queria falar com você antes de mais nada.\n\nSinto muito pelo que aconteceu. Não é isso que queremos oferecer a quem vem aqui. Pode me contar um pouco mais: dia, horário e o que aconteceu?\n\nQuero corrigir isso com você.\n\n${c.signature}`,
      es: (c) => `${c.greeting}\n\nTe respondo personalmente. He recibido lo que escribiste sobre ${c.noun} y quería hablar contigo antes que nada.\n\nLamento lo ocurrido. No es lo que queremos ofrecer a quien nos visita. ¿Puedes contarme un poco más: día, hora y qué pasó?\n\nQuiero corregirlo contigo.\n\n${c.signature}`,
      en: (c) => `${c.greeting}\n\nI am replying to you personally. I read what you wrote about ${c.noun} and wanted to reach you before anything else.\n\nI am sorry it happened. It is not what we want to offer anyone who visits us. Could you tell me a bit more: the day, the time, and what went on?\n\nI would like to put this right with you.\n\n${c.signature}`,
    },
  },
  {
    id: 'com-reparacao',
    title: { pt: 'Com uma reparação', 'pt-BR': 'Com uma compensação', es: 'Con una compensación', en: 'With something to make up for it' },
    hint: {
      pt: 'Só em privado, e nunca em troca de apagar ou mudar uma avaliação pública — isso é proibido.',
      'pt-BR': 'Só em privado, e nunca em troca de apagar ou mudar uma avaliação pública. Isso é proibido.',
      es: 'Sólo en privado, y nunca a cambio de borrar o cambiar una reseña pública — eso está prohibido.',
      en: 'Private only, and never in exchange for removing or changing a public review — that is prohibited.',
    },
    body: {
      pt: (c) => `${c.greeting}\n\nObrigado por nos ter dito o que se passou com ${c.noun}, em vez de simplesmente não voltar.\n\n${c.fix}\n\nGostava de o receber outra vez, por nossa conta, e mostrar-lhe como devia ter sido. Diga-me quando lhe der jeito.\n\n${c.signature}`,
      'pt-BR': (c) => `${c.greeting}\n\nObrigado por nos contar o que aconteceu com ${c.noun}, em vez de simplesmente não voltar.\n\n${c.fix}\n\nGostaria de receber você de novo, por nossa conta, e mostrar como deveria ter sido. Me diga quando for melhor para você.\n\n${c.signature}`,
      es: (c) => `${c.greeting}\n\nGracias por contarnos lo que pasó con ${c.noun}, en lugar de simplemente no volver.\n\n${c.fix}\n\nMe gustaría recibirte otra vez, por nuestra cuenta, y enseñarte cómo debería haber sido. Dime cuándo te viene bien.\n\n${c.signature}`,
      en: (c) => `${c.greeting}\n\nThank you for telling us what happened with ${c.noun}, rather than simply not coming back.\n\n${c.fix}\n\nI would like to have you back, on us, and show you how it should have gone. Tell me when suits you.\n\n${c.signature}`,
    },
  },
];

const PRIVATE_NEUTRAL: Variant[] = [
  {
    id: 'perguntar-privado',
    title: { pt: 'Perguntar o que faltou', 'pt-BR': 'Perguntar o que faltou', es: 'Preguntar qué faltó', en: 'Ask what was missing' },
    hint: {
      pt: 'Quem escreve sem estar furioso costuma responder — e diz-lhe exactamente o que corrigir.',
      'pt-BR': 'Quem escreve sem estar bravo costuma responder, e diz exatamente o que corrigir.',
      es: 'Quien escribe sin estar furioso suele responder — y te dice exactamente qué corregir.',
      en: 'Someone who writes without being angry usually replies — and tells you exactly what to fix.',
    },
    body: {
      pt: (c) => `${c.greeting}\n\nObrigado por ter deixado o seu relato. Li o que escreveu sobre ${c.noun}.\n\nO que teria de ter acontecido para a visita ter sido mesmo boa? A sua resposta vale-me mais do que qualquer inquérito.\n\n${c.signature}`,
      'pt-BR': (c) => `${c.greeting}\n\nObrigado por deixar seu relato. Li o que você escreveu sobre ${c.noun}.\n\nO que precisava ter acontecido para a visita ter sido realmente boa? Sua resposta vale mais para mim do que qualquer pesquisa.\n\n${c.signature}`,
      es: (c) => `${c.greeting}\n\nGracias por dejar tu comentario. He leído lo que escribiste sobre ${c.noun}.\n\n¿Qué tendría que haber pasado para que la visita fuera realmente buena? Tu respuesta me vale más que cualquier encuesta.\n\n${c.signature}`,
      en: (c) => `${c.greeting}\n\nThank you for leaving your feedback. I read what you wrote about ${c.noun}.\n\nWhat would have had to happen for the visit to be a good one? Your answer is worth more to me than any survey.\n\n${c.signature}`,
    },
  },
];

const PRIVATE_POSITIVE: Variant[] = [
  {
    id: 'agradecer-privado',
    title: { pt: 'Agradecer e convidar', 'pt-BR': 'Agradecer e convidar', es: 'Agradecer e invitar', en: 'Thank and invite' },
    hint: {
      pt: 'Este é o melhor momento para convidar a avaliar em público — e só depois de agradecer.',
      'pt-BR': 'Este é o melhor momento para convidar a avaliar em público, e só depois de agradecer.',
      es: 'Este es el mejor momento para invitar a valorar en público — y sólo después de agradecer.',
      en: 'This is the best moment to invite a public review — and only after thanking them.',
    },
    body: {
      pt: (c) => `${c.greeting}\n\nObrigado por ter dedicado um minuto a dizer-nos que ${c.praise}. Passei a mensagem à equipa.\n\nSe lhe apetecer deixar essas palavras também numa avaliação pública, ajuda-nos muito. E se não, ficamos na mesma gratos.\n\n${c.signature}`,
      'pt-BR': (c) => `${c.greeting}\n\nObrigado por dedicar um minuto para nos dizer que ${c.praise}. Passei a mensagem para a equipe.\n\nSe você quiser deixar essas palavras também numa avaliação pública, ajuda muito a gente. E se não quiser, ficamos gratos do mesmo jeito.\n\n${c.signature}`,
      es: (c) => `${c.greeting}\n\nGracias por dedicar un minuto a decirnos que ${c.praise}. Se lo he pasado al equipo.\n\nSi te apetece dejar esas palabras también en una reseña pública, nos ayuda mucho. Y si no, te lo agradecemos igual.\n\n${c.signature}`,
      en: (c) => `${c.greeting}\n\nThank you for taking a minute to tell us ${c.praise}. I passed it on to the team.\n\nIf you feel like leaving those words in a public review as well, it helps us a lot. And if not, we are grateful all the same.\n\n${c.signature}`,
    },
  },
];

/**
 * Sem nota, a resposta é guiada só pelo texto.
 *
 * Estas variantes usam apenas a saudação, o ASSUNTO que a pessoa escreveu
 * (`c.noun`) e a assinatura. Nunca `c.fix`, que promete consertar uma falha, nem
 * `c.praise`, que celebra um elogio: as duas afirmam algo sobre a visita que
 * ninguém disse. O que sobra é o que é verdade em qualquer caso, que a pessoa
 * escreveu e que o dono leu.
 *
 * A dica de cada variante diz ao dono que não houve nota, para que ele leia o
 * comentário e escolha o tom, em vez de a ferramenta escolher por ele e errar.
 */
const PUBLIC_UNRATED: Variant[] = [
  {
    id: 'agradecer-sem-presumir',
    title: { pt: 'Agradecer sem presumir', 'pt-BR': 'Agradecer sem presumir', es: 'Agradecer sin presumir', en: 'Thank without assuming' },
    hint: {
      pt: 'Esta pessoa escreveu sem deixar nota. Em público, presumir a nota errada é o erro mais caro.',
      'pt-BR': 'Esta pessoa escreveu sem deixar nota. Em público, presumir a nota errada é o erro mais caro.',
      es: 'Esta persona escribió sin dejar valoración. En público, presumir la nota equivocada es el error más caro.',
      en: 'This person wrote without leaving a rating. In public, assuming the wrong one is the costliest mistake.',
    },
    body: {
      pt: (c) => `${c.greeting}\n\nObrigado por ter escrito sobre ${c.noun}. Lemos tudo o que nos chega e levamos a sério.\n\nSe quiser falar connosco directamente, estamos à disposição.\n\n${c.signature}`,
      'pt-BR': (c) => `${c.greeting}\n\nObrigado por escrever sobre ${c.noun}. A gente lê tudo o que chega e leva a sério.\n\nSe quiser falar com a gente diretamente, estamos à disposição.\n\n${c.signature}`,
      es: (c) => `${c.greeting}\n\nGracias por escribir sobre ${c.noun}. Leemos todo lo que nos llega y lo tomamos en serio.\n\nSi quieres hablar con nosotros directamente, aquí estamos.\n\n${c.signature}`,
      en: (c) => `${c.greeting}\n\nThank you for writing about ${c.noun}. We read everything that reaches us and take it seriously.\n\nIf you would like to talk to us directly, we are here.\n\n${c.signature}`,
    },
  },
];

const PRIVATE_UNRATED: Variant[] = [
  {
    id: 'agradecer-e-perguntar',
    title: { pt: 'Agradecer e perguntar', 'pt-BR': 'Agradecer e perguntar', es: 'Agradecer y preguntar', en: 'Thank and ask' },
    hint: {
      pt: 'Esta pessoa escreveu sem deixar nota. Leia o que ela diz e ajuste o tom antes de enviar.',
      'pt-BR': 'Esta pessoa escreveu sem deixar nota. Leia o que ela diz e ajuste o tom antes de enviar.',
      es: 'Esta persona escribió sin dejar valoración. Lee lo que dice y ajusta el tono antes de enviar.',
      en: 'This person wrote without leaving a rating. Read what they say and adjust the tone before sending.',
    },
    body: {
      pt: (c) => `${c.greeting}\n\nObrigado por nos ter escrito sobre ${c.noun}. Li com atenção o que deixou.\n\nSe quiser contar-me mais, leio tudo o que me escrever. É assim que sabemos o que manter e o que mudar.\n\n${c.signature}`,
      'pt-BR': (c) => `${c.greeting}\n\nObrigado por escrever sobre ${c.noun}. Li com atenção o que você deixou.\n\nSe quiser me contar mais, eu leio tudo. É assim que a gente sabe o que manter e o que mudar.\n\n${c.signature}`,
      es: (c) => `${c.greeting}\n\nGracias por escribirnos sobre ${c.noun}. He leído con atención lo que dejaste.\n\nSi quieres contarme más, lo leo todo. Así sabemos qué mantener y qué cambiar.\n\n${c.signature}`,
      en: (c) => `${c.greeting}\n\nThank you for writing to us about ${c.noun}. I read what you left carefully.\n\nIf you want to tell me more, I read everything that comes in. That is how we know what to keep and what to change.\n\n${c.signature}`,
    },
  },
  {
    id: 'abrir-conversa',
    title: { pt: 'Abrir conversa directa', 'pt-BR': 'Abrir conversa direta', es: 'Abrir conversación directa', en: 'Open a direct conversation' },
    hint: {
      pt: 'Quando prefere ouvir a pessoa antes de decidir o que fazer com o caso.',
      'pt-BR': 'Quando você prefere ouvir a pessoa antes de decidir o que fazer com o caso.',
      es: 'Cuando prefieres escuchar a la persona antes de decidir qué hacer con el caso.',
      en: 'When you would rather hear the person out before deciding what to do with the case.',
    },
    body: {
      pt: (c) => `${c.greeting}\n\nRecebi o que escreveu sobre ${c.noun} e quis responder eu próprio.\n\nSe lhe der jeito falar directamente, diga-me quando. Prefiro ouvir de si do que supor.\n\n${c.signature}`,
      'pt-BR': (c) => `${c.greeting}\n\nRecebi o que você escreveu sobre ${c.noun} e quis responder pessoalmente.\n\nSe for melhor falar direto, me diga quando. Prefiro ouvir de você do que supor.\n\n${c.signature}`,
      es: (c) => `${c.greeting}\n\nHe recibido lo que escribiste sobre ${c.noun} y quise responderte personalmente.\n\nSi te viene bien hablar directamente, dime cuándo. Prefiero escucharte a suponer.\n\n${c.signature}`,
      en: (c) => `${c.greeting}\n\nI received what you wrote about ${c.noun} and wanted to reply personally.\n\nIf it suits you to talk directly, tell me when. I would rather hear it from you than assume.\n\n${c.signature}`,
    },
  },
];

/**
 * QUEM DEU SÓ ESTRELAS NÃO DISSE NADA, e a resposta não pode fingir que disse.
 *
 * Em 03/09/2026 o painel sugeriu isto para uma avaliação de 4 estrelas SEM
 * comentário nenhum:
 *
 *     "Muito obrigado pelas suas palavras. Fico feliz em saber que tenha
 *      gostado da visita."
 *
 * Duas invenções numa frase: não houve palavras, e ninguém falou em visita.
 * Publicado na página do negócio, isso é o dono a agradecer em público por algo
 * que não aconteceu — e quem escreveu a avaliação é a primeira pessoa a notar.
 *
 * A nota sozinha autoriza pouco, e é esse pouco que estes textos dizem: que a
 * avaliação chegou, e o que a nota significa. Nada sobre o que a pessoa achou,
 * porque ela não contou.
 *
 * Estes textos não têm `c.praise` nem `c.noun`: os dois saem do tema, o tema
 * sai do texto do cliente, e aqui não há texto. Usá-los seria voltar a inventar
 * por outro caminho.
 */
const SEM_PALAVRAS: Record<Sentiment, Variant[]> = {
  positive: [{
    id: 'obrigado-pela-nota',
    title: { pt: 'Agradecer a nota', 'pt-BR': 'Agradecer a nota', es: 'Agradecer la valoración', en: 'Thank them for the rating' },
    hint: {
      pt: 'Não houve comentário. Agradecer a nota é tudo o que se pode dizer sem inventar.',
      'pt-BR': 'Não houve comentário. Agradecer a nota é tudo o que dá para dizer sem inventar.',
      es: 'No hubo comentario. Agradecer la valoración es todo lo que se puede decir sin inventar.',
      en: 'There was no comment. Thanking them for the rating is all you can say without inventing.',
    },
    body: {
      pt: (c) => `${c.greeting}\n\nObrigado pela avaliação. Fico contente por ter deixado uma nota alta, e espero voltar a recebê-lo.\n\n${c.signature}`,
      'pt-BR': (c) => `${c.greeting}\n\nObrigado pela avaliação. Fico contente que tenha deixado uma nota alta, e espero receber você de novo.\n\n${c.signature}`,
      es: (c) => `${c.greeting}\n\nGracias por la valoración. Me alegra que hayas dejado una nota alta, y espero volver a verte.\n\n${c.signature}`,
      en: (c) => `${c.greeting}\n\nThank you for the rating. I am glad you left a high score, and I hope to see you again.\n\n${c.signature}`,
    },
  }],
  neutral: [{
    id: 'perguntar-o-que-faltou-sem-texto',
    title: { pt: 'Perguntar o que faltou', 'pt-BR': 'Perguntar o que faltou', es: 'Preguntar qué faltó', en: 'Ask what was missing' },
    hint: {
      pt: 'A nota do meio sem comentário é um convite a perguntar, não a agradecer.',
      'pt-BR': 'Nota do meio sem comentário é convite para perguntar, não para agradecer.',
      es: 'Una nota media sin comentario invita a preguntar, no a agradecer.',
      en: 'A middling rating with no comment invites a question, not thanks.',
    },
    body: {
      pt: (c) => `${c.greeting}\n\nObrigado pela avaliação. Como não deixou comentário, fico sem saber o que podíamos ter feito melhor — e é isso que queria perceber. Se puder dizer-me, agradeço.\n\n${c.signature}`,
      'pt-BR': (c) => `${c.greeting}\n\nObrigado pela avaliação. Como você não deixou comentário, fico sem saber o que poderíamos ter feito melhor, e é isso que eu queria entender. Se puder me contar, agradeço.\n\n${c.signature}`,
      es: (c) => `${c.greeting}\n\nGracias por la valoración. Como no dejaste comentario, no sé qué pudimos haber hecho mejor, y es lo que me gustaría entender. Si puedes contármelo, te lo agradezco.\n\n${c.signature}`,
      en: (c) => `${c.greeting}\n\nThank you for the rating. Since you left no comment, I do not know what we could have done better, and that is what I would like to understand. If you can tell me, I would appreciate it.\n\n${c.signature}`,
    },
  }],
  negative: [{
    id: 'nota-baixa-sem-texto',
    title: { pt: 'Perguntar o que aconteceu', 'pt-BR': 'Perguntar o que aconteceu', es: 'Preguntar qué pasó', en: 'Ask what happened' },
    hint: {
      pt: 'Nota baixa sem comentário: perguntar é a única coisa honesta a fazer.',
      'pt-BR': 'Nota baixa sem comentário: perguntar é a única coisa honesta a fazer.',
      es: 'Nota baja sin comentario: preguntar es lo único honesto.',
      en: 'A low rating with no comment: asking is the only honest thing to do.',
    },
    body: {
      pt: (c) => `${c.greeting}\n\nVi a sua avaliação e lamento que a experiência não tenha corrido bem. Como não deixou comentário, não sei o que aconteceu, e gostava de saber para o corrigir. Se puder falar comigo, agradeço.\n\n${c.signature}`,
      'pt-BR': (c) => `${c.greeting}\n\nVi a sua avaliação e lamento que a experiência não tenha sido boa. Como você não deixou comentário, eu não sei o que aconteceu, e gostaria de saber para corrigir. Se puder falar comigo, agradeço.\n\n${c.signature}`,
      es: (c) => `${c.greeting}\n\nVi tu valoración y lamento que la experiencia no haya sido buena. Como no dejaste comentario, no sé qué pasó, y me gustaría saberlo para corregirlo. Si puedes hablar conmigo, te lo agradezco.\n\n${c.signature}`,
      en: (c) => `${c.greeting}\n\nI saw your rating and I am sorry the experience was not good. Since you left no comment, I do not know what happened, and I would like to know so I can fix it. If you can talk to me, I would appreciate it.\n\n${c.signature}`,
    },
  }],
  // Sem nota E sem texto nao e uma avaliacao: nao ha nada a que responder.
  // Mantem-se o conjunto de sempre, que ja trata a ausencia de nota.
  unrated: PUBLIC_UNRATED,
};

const VARIANTS: Record<ReplyChannel, Record<Sentiment, Variant[]>> = {
  public: { negative: PUBLIC_NEGATIVE, neutral: PUBLIC_NEUTRAL, positive: PUBLIC_POSITIVE, unrated: PUBLIC_UNRATED },
  private: { negative: PRIVATE_NEGATIVE, neutral: PRIVATE_NEUTRAL, positive: PRIVATE_POSITIVE, unrated: PRIVATE_UNRATED },
};

/**
 * A variante do português segue o país do NEGÓCIO, não o do texto do
 * cliente: quem publica é o dono, na própria página, para os próprios
 * clientes lerem, e "não gostei do atendimento" não distingue Brasil de
 * Portugal de forma confiável. `businessCountry` só entra em jogo quando o
 * idioma já detectado é `pt` (es/en seguem como sempre) e só vira `pt-BR`
 * quando o valor é exatamente 'BR', o mesmo formato de
 * `profiles.business_country` usado em `src/lib/businessLocale.ts`. Ausente,
 * vazio ou qualquer outro país cai no português de hoje (Portugal), para que
 * um país desconhecido nunca vire um brasileirismo indevido nem o contrário.
 */
const resolveContentLocale = (locale: ReplyLocale, businessCountry: string | null): ContentLocale =>
  locale === 'pt' && businessCountry === 'BR' ? 'pt-BR' : locale;

export const buildReplySuggestions = (input: ReplySuggestionInput): ReplySuggestion[] => {
  const locale = input.locale ?? detectReplyLocale(input.text);
  const content = resolveContentLocale(locale, input.businessCountry);
  const theme = findTheme(input.text);
  const sentiment = sentimentOf(input.rating);

  const ctx: Ctx = {
    greeting: buildGreeting(content, input.customerName),
    noun: theme ? theme.noun[content] : GENERIC.noun[content],
    fix: theme ? theme.fix[content] : GENERIC.fix[content],
    praise: theme ? theme.praise[content] : GENERIC.praise[content],
    signature: buildSignature(content, input.businessName),
  };

  // SEM TEXTO, OUTRO CONJUNTO. Os textos de sempre agradecem "pelas suas
  // palavras" e citam o que a pessoa achou — as duas coisas saem do texto dela,
  // e aqui nao ha texto. O canal privado nao entra: uma mensagem privada sem
  // texto nao existe, o formulario do QR exige o comentario.
  const semPalavras = !(input.text && input.text.trim().length > 0);
  const conjunto = semPalavras && input.channel === 'public'
    ? SEM_PALAVRAS[sentiment]
    : VARIANTS[input.channel][sentiment];

  return conjunto.map((variant) => ({
    id: variant.id,
    title: variant.title[content],
    hint: variant.hint[content],
    body: variant.body[content](ctx),
  }));
};

/** Exposto para a interface poder dizer ao dono em que idioma vai responder. */
export const LOCALE_LABEL: Record<ReplyLocale, string> = {
  pt: 'Português',
  es: 'Espanhol',
  en: 'Inglês',
};
