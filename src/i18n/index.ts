/**
 * Tradução do fluxo do cliente final — as únicas telas que um turista vê.
 *
 * O painel do dono fica só em português de propósito: quem o usa é o dono do
 * negócio, não o visitante. Traduzi-lo seria custo de manutenção sem retorno.
 *
 * Sem biblioteca externa: são quatro variantes e um punhado de textos. O
 * dicionário é tipado, então esquecer uma chave em qualquer idioma quebra o
 * build em vez de aparecer como texto faltando na tela do cliente.
 *
 * **Português do Brasil e de Portugal são variantes separadas.** "Contacto" e
 * "contato", "o seu nome" e "seu nome": para quem lê, a variante errada soa
 * como texto traduzido por máquina — exatamente a impressão que este produto
 * não pode passar no momento em que pede um favor ao cliente.
 *
 * Não há espanhol aqui: o Marcelo decidiu (30/07/2026) que quem não fala
 * português vê inglês, e ponto. A regra dele é Brasil→pt-BR, Portugal→pt-PT ou
 * inglês, resto→inglês. O espanhol continua a existir noutro sítio e por outra
 * razão — nas sugestões de resposta (`src/lib/replySuggestions.ts`), onde o
 * dono responde a quem lhe escreveu, e uma avaliação de turista espanhol
 * merece resposta em espanhol. São eixos diferentes: aqui é a língua que o
 * cliente lê, lá é a língua em que ele escreveu.
 */

export type Locale = 'pt-BR' | 'pt-PT' | 'en';

export const SUPPORTED_LOCALES: Locale[] = ['pt-BR', 'pt-PT', 'en'];

const DICTIONARY = {
  'pt-BR': {
    ratingQuestion: 'Como foi sua experiência?',
    ratingBad: 'Ruim',
    ratingOk: 'Razoável',
    ratingGood: 'Boa',
    back: 'Voltar',
    backAndChooseAnother: 'Voltar e escolher outra opção',
    ariaRatingBad: 'Avaliação negativa',
    ariaRatingOk: 'Avaliação neutra',
    ariaRatingGood: 'Avaliação positiva',

    chooserTitle: 'Onde você prefere avaliar?',
    chooserSubtitle: 'Escolha a plataforma para continuar sua avaliação de {business}.',

    formTitle: 'Conte o que aconteceu',
    formSubtitle: '{business} recebe seu comentário na hora e pode entrar em contato.',
    formSend: 'Enviar',
    formSending: 'Enviando...',
    formCommentLabel: 'Conte mais sobre sua experiência',
    formCommentPlaceholder: 'Conte como foi sua experiência neste lugar',
    formNameLabel: 'Seu nome (opcional)',
    formNamePlaceholder: 'Como podemos chamar você',
    formContactLabel: 'WhatsApp ou e-mail (opcional)',
    formContactPlaceholder: 'Deixe um contato se quiser retorno',
    formPrivacyNotice:
      'O que você escrever vai direto para {business}, que é quem cuida desses dados. Nome e contato são opcionais.',
    formPrivacyLink: 'Como seus dados são tratados',

    publicTitle: 'Você também pode avaliar publicamente',
    publicSubtitle: 'A avaliação pública é sempre escolha sua. Nada aqui é filtrado ou escondido.',
    publicGoogle: 'Avaliar no Google',
    publicTripAdvisor: 'Avaliar no TripAdvisor',

    thanksTitle: 'Obrigado pelo seu comentário!',
    thanksBodyNamed:
      'Recebemos o que você escreveu e já está com o responsável do {business}. Se você deixou um contato, pode esperar retorno em breve.',
    thanksBodyGeneric:
      'Recebemos o que você escreveu e já está com o responsável do estabelecimento. Se você deixou um contato, pode esperar retorno em breve.',
    thanksPublicPrompt: 'Quer deixar também uma avaliação pública?',
    thanksHome: 'Voltar para a página inicial',
  },

  'pt-PT': {
    ratingQuestion: 'Como foi a sua experiência?',
    ratingBad: 'Mau',
    ratingOk: 'Razoável',
    ratingGood: 'Bom',
    back: 'Voltar',
    backAndChooseAnother: 'Voltar e escolher outra opção',
    ariaRatingBad: 'Avaliação negativa',
    ariaRatingOk: 'Avaliação neutra',
    ariaRatingGood: 'Avaliação positiva',

    chooserTitle: 'Onde prefere avaliar?',
    chooserSubtitle: 'Escolha a plataforma para continuar a sua avaliação de {business}.',

    formTitle: 'Conte o que aconteceu',
    formSubtitle: '{business} recebe o seu relato na hora e pode entrar em contacto.',
    formSend: 'Enviar',
    formSending: 'A enviar...',
    formCommentLabel: 'Conte mais sobre a sua experiência',
    formCommentPlaceholder: 'Conte como foi a sua experiência neste lugar',
    formNameLabel: 'O seu nome (opcional)',
    formNamePlaceholder: 'Como o podemos tratar',
    formContactLabel: 'WhatsApp ou e-mail (opcional)',
    formContactPlaceholder: 'Deixe um contacto se quiser retorno',
    formPrivacyNotice:
      'O que escrever vai directamente para {business}, que é quem trata destes dados. Nome e contacto são opcionais.',
    formPrivacyLink: 'Como os seus dados são tratados',

    publicTitle: 'Também pode avaliar publicamente',
    publicSubtitle: 'A sua avaliação pública é sempre sua escolha. Nada aqui é filtrado ou escondido.',
    publicGoogle: 'Avaliar no Google',
    publicTripAdvisor: 'Avaliar no TripAdvisor',

    thanksTitle: 'Obrigado pelo seu feedback!',
    thanksBodyNamed:
      'Recebemos o seu relato e ele já está com o responsável do {business}. Se deixou um contacto, pode esperar retorno em breve.',
    thanksBodyGeneric:
      'Recebemos o seu relato e ele já está com o responsável do estabelecimento. Se deixou um contacto, pode esperar retorno em breve.',
    thanksPublicPrompt: 'Quer deixar também uma avaliação pública?',
    thanksHome: 'Voltar à página inicial',
  },

  en: {
    ratingQuestion: 'How was your experience?',
    ratingBad: 'Bad',
    ratingOk: 'Okay',
    ratingGood: 'Good',
    back: 'Back',
    backAndChooseAnother: 'Go back and choose another option',
    ariaRatingBad: 'Negative rating',
    ariaRatingOk: 'Neutral rating',
    ariaRatingGood: 'Positive rating',

    chooserTitle: 'Where would you like to review?',
    chooserSubtitle: 'Choose a platform to continue your review of {business}.',

    formTitle: 'Tell us what happened',
    formSubtitle: '{business} gets your message straight away and may get in touch.',
    formSend: 'Send',
    formSending: 'Sending...',
    formCommentLabel: 'Tell us more about your experience',
    formCommentPlaceholder: 'Tell us how your experience here went',
    formNameLabel: 'Your name (optional)',
    formNamePlaceholder: 'What should we call you',
    formContactLabel: 'WhatsApp or email (optional)',
    formContactPlaceholder: 'Leave a contact if you would like a reply',
    formPrivacyNotice:
      'What you write goes straight to {business}, who is responsible for this data. Name and contact are optional.',
    formPrivacyLink: 'How your data is handled',

    publicTitle: 'You can also leave a public review',
    publicSubtitle: 'Your public review is always your choice. Nothing here is filtered or hidden.',
    publicGoogle: 'Review on Google',
    publicTripAdvisor: 'Review on TripAdvisor',

    thanksTitle: 'Thank you for your feedback!',
    thanksBodyNamed:
      'We have passed your message to the team at {business}. If you left a contact, expect to hear back soon.',
    thanksBodyGeneric:
      'We have passed your message to the team. If you left a contact, expect to hear back soon.',
    thanksPublicPrompt: 'Would you like to leave a public review as well?',
    thanksHome: 'Back to home',
  },
} as const;

export type TranslationKey = keyof (typeof DICTIONARY)['pt-BR'];

/**
 * Aceita o que uma pessoa escreveria à mão em `?lang=` além dos códigos
 * exactos: `br`, `pt-br`, `pt`, `en-gb`, e por aí.
 */
export const normalizeLocale = (value: string | null | undefined): Locale | null => {
  if (!value) return null;
  const tag = value.trim().toLowerCase();

  if (tag === 'br' || tag === 'pt-br' || tag.startsWith('pt-br')) return 'pt-BR';
  if (tag === 'pt' || tag.startsWith('pt')) return 'pt-PT';
  if (tag === 'en' || tag.startsWith('en')) return 'en';

  // Tudo o resto — incluindo espanhol — cai no inglês pela via de quem chama,
  // que trata `null` como "não é nenhuma das nossas" e usa o inglês.
  return null;
};

/**
 * O idioma vem do telemóvel de quem escaneia, não do país onde o QR está
 * colado.
 *
 * É de propósito, e não é o mesmo que localização: um brasileiro de férias em
 * Lisboa lê melhor "seu nome" do que "o seu nome", e é o aparelho dele que diz
 * isso. Localizar por IP exigiria um serviço externo no caminho do cliente —
 * mais uma dependência que pode cair no único momento em que o produto tem uma
 * chance de funcionar.
 *
 * Um aparelho que diz só `pt`, sem região, cai em português de Portugal: é onde
 * está o piloto, e um aparelho brasileiro quase sempre diz `pt-BR`.
 *
 * Quem não fala português vê inglês — inclusive quem fala espanhol. Foi decisão
 * do Marcelo (30/07/2026), depois de eu ter defendido manter o espanhol.
 */
export const detectLocale = (): Locale => {
  if (typeof navigator === 'undefined') return 'en';

  const candidates = navigator.languages?.length ? navigator.languages : [navigator.language];

  for (const tag of candidates) {
    const match = normalizeLocale(tag);
    if (match) return match;
  }

  return 'en';
};

export const translate = (
  locale: Locale,
  key: TranslationKey,
  vars?: Record<string, string>
): string => {
  const template: string = DICTIONARY[locale][key] ?? DICTIONARY.en[key];
  if (!vars) return template;

  // split/join em vez de replaceAll: o alvo de compilação do projeto é anterior
  // ao ES2021 e replaceAll não existe lá.
  return Object.entries(vars).reduce(
    (text, [name, value]) => text.split(`{${name}}`).join(value),
    template
  );
};
