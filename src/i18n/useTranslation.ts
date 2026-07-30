import { useCallback, useEffect, useMemo, useState } from 'react';
import { detectLocale, normalizeLocale, translate, type Locale, type TranslationKey } from '@/i18n';

/**
 * Idioma detectado a partir do navegador do visitante, com override manual por
 * `?lang=` — útil para o dono conferir cada versão sem trocar as definições do
 * telemóvel, e para imprimir um QR já apontado a um idioma específico.
 *
 * O override aceita `pt-BR`, `br`, `pt-PT`, `pt`, `es` e `en`.
 */
export const useTranslation = () => {
  const [locale, setLocale] = useState<Locale>('en');

  useEffect(() => {
    // O override de `?lang=` precisa sobreviver à navegação entre as telas: o
    // react-router não carrega a query string adiante, então sem isto um QR
    // impresso apontado a um idioma voltava ao idioma do telemóvel na segunda
    // tela. sessionStorage dura só a visita, que é exatamente o tempo do fluxo.
    const forced = normalizeLocale(new URLSearchParams(window.location.search).get('lang'));
    if (forced) {
      sessionStorage.setItem('appreview:lang', forced);
      setLocale(forced);
      return;
    }

    const remembered = normalizeLocale(sessionStorage.getItem('appreview:lang'));
    if (remembered) {
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
