/**
 * Tradução do fluxo do cliente final — as únicas telas que um turista vê.
 *
 * O painel do dono fica só em português de propósito: quem o usa é o dono do
 * negócio, não o visitante. Traduzi-lo seria custo de manutenção sem retorno.
 *
 * Sem biblioteca externa: são três idiomas e um punhado de textos. O dicionário
 * é tipado, então esquecer uma chave em qualquer idioma quebra o build em vez
 * de aparecer como texto faltando na tela do cliente.
 */

export type Locale = 'pt' | 'es' | 'en';

export const SUPPORTED_LOCALES: Locale[] = ['pt', 'es', 'en'];

const DICTIONARY = {
  pt: {
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

  es: {
    ratingQuestion: '¿Qué tal fue tu experiencia?',
    ratingBad: 'Mala',
    ratingOk: 'Regular',
    ratingGood: 'Buena',
    back: 'Volver',
    backAndChooseAnother: 'Volver y elegir otra opción',
    ariaRatingBad: 'Valoración negativa',
    ariaRatingOk: 'Valoración neutra',
    ariaRatingGood: 'Valoración positiva',

    chooserTitle: '¿Dónde prefieres dejar tu reseña?',
    chooserSubtitle: 'Elige la plataforma para continuar con tu reseña de {business}.',

    formTitle: 'Cuéntanos qué pasó',
    formSubtitle: '{business} recibe tu comentario al instante y puede ponerse en contacto.',
    formSend: 'Enviar',
    formSending: 'Enviando...',
    formCommentLabel: 'Cuéntanos más sobre tu experiencia',
    formCommentPlaceholder: 'Cuéntanos cómo fue tu experiencia en este lugar',
    formNameLabel: 'Tu nombre (opcional)',
    formNamePlaceholder: 'Cómo podemos llamarte',
    formContactLabel: 'WhatsApp o correo electrónico (opcional)',
    formContactPlaceholder: 'Déjanos un contacto si quieres respuesta',

    publicTitle: 'También puedes dejar una reseña pública',
    publicSubtitle: 'Tu reseña pública es siempre tu decisión. Aquí no se filtra ni se oculta nada.',
    publicGoogle: 'Reseñar en Google',
    publicTripAdvisor: 'Reseñar en TripAdvisor',

    thanksTitle: '¡Gracias por tu comentario!',
    thanksBodyNamed:
      'Hemos recibido tu comentario y ya está con el responsable de {business}. Si dejaste un contacto, recibirás respuesta pronto.',
    thanksBodyGeneric:
      'Hemos recibido tu comentario y ya está con el responsable del establecimiento. Si dejaste un contacto, recibirás respuesta pronto.',
    thanksPublicPrompt: '¿Quieres dejar también una reseña pública?',
    thanksHome: 'Volver al inicio',
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

export type TranslationKey = keyof (typeof DICTIONARY)['pt'];

/**
 * Português cobre PT e BR; espanhol cobre Espanha e América Latina; qualquer
 * outro idioma cai em inglês, que é a língua franca do turista em Lisboa.
 */
export const detectLocale = (): Locale => {
  if (typeof navigator === 'undefined') return 'en';

  const candidates = navigator.languages?.length
    ? navigator.languages
    : [navigator.language];

  for (const tag of candidates) {
    const base = tag.toLowerCase().split('-')[0];
    if (base === 'pt') return 'pt';
    if (base === 'es' || base === 'ca' || base === 'gl') return 'es';
    if (base === 'en') return 'en';
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
