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
  /** 1 a 5. */
  rating: number;
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
   * deteção do idioma do cliente. Ausente, vazio ou diferente de 'BR' cai no
   * português de hoje (Portugal).
   */
  businessCountry?: string | null;
}

type Sentiment = 'negative' | 'neutral' | 'positive';

const stripAccents = (value: string): string =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/**
 * Palavras curtas e muito frequentes, que só existem numa das três línguas.
 * Não é um detector de idioma a sério — é o suficiente para distinguir
 * português, espanhol e inglês num parágrafo de avaliação, que é o problema
 * real. Empate ou texto curto demais cai em português, a língua do piloto.
 */
const LOCALE_MARKERS: Record<ReplyLocale, string[]> = {
  pt: ['nao', 'muito', 'foi', 'estava', 'atendimento', 'comida', 'otimo', 'mas', 'demorou', 'aqui', 'para', 'lugar', 'sempre', 'gostei', 'voltar'],
  es: ['pero', 'muy', 'estaba', 'comida', 'atencion', 'bueno', 'buena', 'nada', 'volver', 'todo', 'gusto', 'camarero', 'tambien', 'malo'],
  en: ['the', 'was', 'and', 'very', 'food', 'service', 'good', 'great', 'but', 'they', 'were', 'staff', 'place', 'again', 'nice'],
};

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

  return scores[best] === 0 ? 'pt' : best;
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

const sentimentOf = (rating: number): Sentiment => {
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
  praise: {
    pt: 'tenha gostado da visita', 'pt-BR': 'tenha gostado da visita', es: 'te haya gustado la visita', en: 'you enjoyed your visit',
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

const VARIANTS: Record<ReplyChannel, Record<Sentiment, Variant[]>> = {
  public: { negative: PUBLIC_NEGATIVE, neutral: PUBLIC_NEUTRAL, positive: PUBLIC_POSITIVE },
  private: { negative: PRIVATE_NEGATIVE, neutral: PRIVATE_NEUTRAL, positive: PRIVATE_POSITIVE },
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
const resolveContentLocale = (locale: ReplyLocale, businessCountry?: string | null): ContentLocale =>
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

  return VARIANTS[input.channel][sentiment].map((variant) => ({
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
