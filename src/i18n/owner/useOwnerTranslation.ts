import { useTranslation } from 'react-i18next';
import ownerI18n from './instance';

/**
 * `useTranslation` do painel, já ligado à instância do dono.
 *
 * Passar a instância no terceiro argumento evita ter de embrulhar o painel num
 * `<I18nextProvider>` — e mantém o react-i18next fora do pacote do cliente,
 * porque só quem importa este hook (as páginas do painel) o carrega. O
 * componente volta a renderizar sozinho quando o idioma muda.
 */
export const useOwnerTranslation = (namespace?: string) =>
  useTranslation(namespace, { i18n: ownerI18n });
