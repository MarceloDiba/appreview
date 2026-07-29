import { useCallback, useEffect, useMemo, useState } from 'react';
import { detectLocale, translate, type Locale, type TranslationKey } from '@/i18n';

/**
 * Idioma detectado a partir do navegador do visitante, com override manual por
 * `?lang=` — útil para o dono conferir cada versão sem trocar as definições do
 * telemóvel, e para imprimir um QR já apontado a um idioma específico.
 */
export const useTranslation = () => {
  const [locale, setLocale] = useState<Locale>('en');

  useEffect(() => {
    const isLocale = (value: string | null): value is Locale =>
      value === 'pt' || value === 'es' || value === 'en';

    // O override de `?lang=` precisa sobreviver à navegação entre as telas: o
    // react-router não carrega a query string adiante, então sem isto um QR
    // impresso apontado a um idioma voltava ao idioma do telemóvel na segunda
    // tela. sessionStorage dura só a visita, que é exatamente o tempo do fluxo.
    const forced = new URLSearchParams(window.location.search).get('lang');
    if (isLocale(forced)) {
      sessionStorage.setItem('appreview:lang', forced);
      setLocale(forced);
      return;
    }

    const remembered = sessionStorage.getItem('appreview:lang');
    if (isLocale(remembered)) {
      setLocale(remembered);
      return;
    }

    setLocale(detectLocale());
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const t = useCallback(
    (key: TranslationKey, vars?: Record<string, string>) => translate(locale, key, vars),
    [locale]
  );

  return useMemo(() => ({ t, locale, setLocale }), [t, locale]);
};
