import React from 'react';
import { Globe, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { OWNER_LOCALES, getOwnerLocale, setOwnerLocale } from '@/i18n/owner/instance';
import { useOwnerTranslation } from '@/i18n/owner/useOwnerTranslation';

/**
 * Seletor de idioma do painel. Existe para dar autonomia ao dono: se a detecção
 * pela região errar — ou se ele simplesmente preferir outra —, troca aqui, e a
 * escolha fica guardada para as próximas visitas.
 *
 * Só aparece no painel; o cliente final não escolhe idioma, é detectado.
 */
const LanguageSwitcher: React.FC<{ className?: string }> = ({ className }) => {
  const { t, i18n } = useOwnerTranslation();
  const current = getOwnerLocale();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={className}
          aria-label={t('language.switcherLabel')}
        >
          <Globe className="h-4 w-4 sm:mr-2" aria-hidden="true" />
          <span className="hidden sm:inline">{t(`language.${current}`)}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {OWNER_LOCALES.map((locale) => (
          <DropdownMenuItem
            key={locale}
            onClick={() => setOwnerLocale(locale)}
            className="flex items-center justify-between gap-3"
          >
            {t(`language.${locale}`)}
            {i18n.language === locale && <Check className="h-4 w-4" aria-hidden="true" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSwitcher;
