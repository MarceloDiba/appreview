/**
 * Formatação e validação de WhatsApp escritas à mão, sem biblioteca.
 *
 * A tentativa anterior reaproveitou `react-phone-number-input` no formulário
 * público do QR. Funcionava, mas a metadata de países do libphonenumber não
 * encolhe quando a lista de países é restrita: a rota pública foi de 137,84 kB
 * para 189,33 kB gzip (+51,49 kB) só por causa de um campo. Essa tentativa foi
 * descartada. Este arquivo cobre só os três países que a Noá atende: Brasil,
 * Portugal e Espanha, com as regras de celular de cada um, escritas na mão.
 *
 * Fontes das regras (conferidas contra a metadata do libphonenumber-js já
 * presente no projeto, usada pelo `InternationalPhoneField.tsx` do painel):
 * - Brasil (+55): DDD de 2 dígitos + 9 dígitos de assinante, o primeiro
 *   dígito do assinante sendo 9. Exemplo oficial: 11 96123-4567.
 * - Portugal (+351): 9 dígitos, celular começa com 9. Exemplo oficial:
 *   912 345 678.
 * - Espanha (+34): 9 dígitos, celular começa com 6 ou 7. Exemplos oficiais:
 *   612 345 678 e 712 345 678.
 */

export type WhatsAppCountry = 'BR' | 'PT' | 'ES';

export const WHATSAPP_COUNTRIES: WhatsAppCountry[] = ['BR', 'PT', 'ES'];

interface CountryDef {
  callingCode: string;
  flag: string;
  nationalLength: number;
  isMobilePrefix: (digits: string) => boolean;
  format: (digits: string) => string;
}

const groupOfThree = (digits: string): string =>
  [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6, 9)].filter(Boolean).join(' ');

const formatBR = (digits: string): string => {
  if (digits.length === 0) return '';
  let out = `(${digits.slice(0, 2)}`;
  if (digits.length >= 2) out += ')';
  const rest = digits.slice(2);
  if (rest.length > 0) {
    out += ` ${rest.slice(0, 5)}`;
    if (rest.length > 5) out += `-${rest.slice(5, 9)}`;
  }
  return out;
};

const COUNTRY_DEFS: Record<WhatsAppCountry, CountryDef> = {
  BR: {
    callingCode: '55',
    flag: '🇧🇷',
    nationalLength: 11,
    isMobilePrefix: (digits) => digits[0] !== '0' && digits[2] === '9',
    format: formatBR,
  },
  PT: {
    callingCode: '351',
    flag: '🇵🇹',
    nationalLength: 9,
    isMobilePrefix: (digits) => digits[0] === '9',
    format: groupOfThree,
  },
  ES: {
    callingCode: '34',
    flag: '🇪🇸',
    nationalLength: 9,
    isMobilePrefix: (digits) => digits[0] === '6' || digits[0] === '7',
    format: groupOfThree,
  },
};

export const callingCodeFor = (country: WhatsAppCountry): string => COUNTRY_DEFS[country].callingCode;

export const flagFor = (country: WhatsAppCountry): string => COUNTRY_DEFS[country].flag;

export const maxDigitsFor = (country: WhatsAppCountry): number => COUNTRY_DEFS[country].nationalLength;

/** Mantém só dígitos, e nunca mais do que o país aceita. */
export const sanitizeDigits = (country: WhatsAppCountry, raw: string): string =>
  raw.replace(/\D/g, '').slice(0, maxDigitsFor(country));

/** Formatação progressiva, no padrão local, enquanto a pessoa digita. */
export const formatNationalDigits = (country: WhatsAppCountry, digits: string): string =>
  COUNTRY_DEFS[country].format(digits);

/**
 * Um número de celular fecha só quando tem o tamanho nacional completo e o
 * prefixo de celular do país. Um número incompleto (tamanho errado) ou um
 * fixo (prefixo errado) não passa aqui.
 */
export const isValidWhatsAppNumber = (country: WhatsAppCountry, digits: string): boolean => {
  const def = COUNTRY_DEFS[country];
  return digits.length === def.nationalLength && def.isMobilePrefix(digits);
};

/** Formato internacional (E.164), do jeito que o painel do dono já guarda os números. */
export const toInternationalWhatsApp = (country: WhatsAppCountry, digits: string): string =>
  `+${callingCodeFor(country)}${digits}`;

/**
 * Lê um valor já em formato internacional (por exemplo, vindo de um valor
 * salvo) e devolve o país e os dígitos nacionais, quando bate com um dos três
 * países atendidos. Usado só para inicializar o campo a partir de um valor
 * existente; o formulário público sempre começa vazio.
 */
export const parseInternationalWhatsApp = (
  value: string
): { country: WhatsAppCountry; digits: string } | null => {
  const trimmed = value.trim();
  if (!trimmed.startsWith('+')) return null;
  const onlyDigits = trimmed.slice(1).replace(/\D/g, '');

  for (const country of WHATSAPP_COUNTRIES) {
    const code = callingCodeFor(country);
    if (onlyDigits.startsWith(code)) {
      const digits = onlyDigits.slice(code.length);
      if (digits.length === maxDigitsFor(country)) {
        return { country, digits };
      }
    }
  }
  return null;
};
