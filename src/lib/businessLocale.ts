import { parsePhoneNumber } from 'react-phone-number-input';
import type { Locale } from '@/i18n';

/**
 * O cartão impresso pertence ao estabelecimento. Ao contrário da tela aberta
 * pelo QR, ele não conhece o idioma do telemóvel de quem o vai ler. O telefone
 * internacional escolhido pelo dono é a única localização persistida hoje e
 * permite escolher uma cópia local sem inventar morada ou país.
 */
export const localeFromBusinessPhone = (phone: string | null | undefined): Locale => {
  const country = phone ? parsePhoneNumber(phone)?.country : undefined;
  if (country === 'BR') return 'pt-BR';
  if (country === 'PT') return 'pt-PT';
  return 'en';
};

export const qrCardCopy = (locale: Locale) => {
  if (locale === 'pt-BR') {
    return {
      ask: 'Nos avalie no Google',
      help: 'Sua opinião nos ajuda a melhorar.',
      scan: 'Aponte a câmera do celular para o QR Code',
      brand: 'Seu assessor de reputação no Google',
    };
  }
  if (locale === 'pt-PT') {
    return {
      ask: 'Avalie-nos no Google',
      help: 'A sua opinião ajuda-nos a melhorar.',
      scan: 'Aponte a câmara do telemóvel para o QR Code',
      brand: 'O seu assessor de reputação no Google',
    };
  }
  return {
    ask: 'Review us on Google',
    help: 'Your feedback helps us improve.',
    scan: 'Point your phone camera at the QR code',
    brand: 'Your Google reputation advisor',
  };
};
