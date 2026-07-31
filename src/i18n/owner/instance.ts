import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import ptBR from './locales/pt-BR.json';
import ptPT from './locales/pt-PT.json';
import en from './locales/en.json';
import { detectLocale, normalizeLocale, type Locale } from '@/i18n';

/**
 * i18n do painel do dono.
 *
 * É uma instância à parte, de propósito. O fluxo do cliente final continua no
 * dicionário leve de `src/i18n/index.ts` — poucas frases, sem plural, e um
 * caminho que foi deliberadamente emagrecido. Esta instância traz o
 * react-i18next (uns 8 kB), que só interessa ao painel: catálogos por idioma,
 * plural resolvido pela biblioteca (a Central de Atenção precisa disso), e um
 * idioma novo a custar apenas mais um ficheiro JSON.
 *
 * Como só as páginas do painel importam este módulo, e essas páginas são
 * carregadas sob demanda, o react-i18next nunca entra no pacote que o cliente
 * final baixa. Os dois sistemas convivem separados por quem os usa: cliente
 * leve, dono robusto.
 */

/** Idiomas em que o painel existe. Adicionar um: novo JSON + uma linha aqui. */
export const OWNER_LOCALES: Locale[] = ['pt-BR', 'pt-PT', 'en'];

const STORAGE_KEY = 'appreview:owner-lang';

/**
 * O idioma do painel é escolha do dono, e a escolha dele fica guardada. Só
 * quando ele nunca escolheu é que adivinhamos pela região do navegador — a
 * mesma detecção do fluxo do cliente.
 */
const detectOwnerLocale = (): Locale => {
  if (typeof window !== 'undefined') {
    const stored = normalizeLocale(window.localStorage.getItem(STORAGE_KEY));
    if (stored) return stored;
  }
  return detectLocale();
};

const ownerI18n = i18next.createInstance();

ownerI18n.use(initReactI18next).init({
  resources: {
    'pt-BR': { translation: ptBR },
    'pt-PT': { translation: ptPT },
    en: { translation: en },
  },
  lng: detectOwnerLocale(),
  fallbackLng: 'en',
  supportedLngs: OWNER_LOCALES,
  interpolation: { escapeValue: false },
  returnNull: false,
});

export const getOwnerLocale = (): Locale => (ownerI18n.language as Locale) ?? 'en';

/** Troca o idioma e guarda a preferência do dono para as próximas visitas. */
export const setOwnerLocale = (locale: Locale): void => {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, locale);
  }
  ownerI18n.changeLanguage(locale);
};

export default ownerI18n;
