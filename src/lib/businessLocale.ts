import { parsePhoneNumber } from 'react-phone-number-input';
import type { Locale } from '@/i18n';

/**
 * O cartão impresso pertence ao estabelecimento, não a quem o vai ler nem a
 * quem o gere. `profiles.business_country` é o fato comercial que descreve
 * onde o negócio opera (o mesmo campo usado na cobrança regional, ver
 * docs/cobranca-regional-binno.md) e por isso é a fonte primária do idioma
 * impresso. O telefone do gestor só entra como reserva quando esse país ainda
 * não foi preenchido, porque um gestor com telemóvel de outro país não muda o
 * mercado do negócio.
 */
export const localeFromBusiness = (
  businessCountry: string | null | undefined,
  phone: string | null | undefined,
): Locale => {
  const country = businessCountry || (phone ? parsePhoneNumber(phone)?.country : undefined);
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
