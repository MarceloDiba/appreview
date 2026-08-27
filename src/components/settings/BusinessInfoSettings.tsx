import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useOwnerTranslation } from '@/i18n/owner/useOwnerTranslation';
import InternationalPhoneField from '@/components/forms/InternationalPhoneField';
import BusinessCountrySelect from '@/components/forms/BusinessCountrySelect';

export interface BusinessInfo {
  /** Nome do negócio. Aparece a quem avalia e assina as respostas. */
  name: string;
  /** Nome de quem responde aos clientes. */
  ownerName: string;
  phone: string;
  country: string;
}

interface BusinessInfoSettingsProps {
  businessInfo: BusinessInfo;
  onBusinessInfoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPhoneChange: (value: string) => void;
  onCountryChange: (value: string) => void;
  onSaveBusinessInfo: () => void;
  onCancel: () => void;
  saving?: boolean;
}

/**
 * Só os campos que o produto guarda e usa de verdade.
 *
 * Antes havia morada, cidade, código postal, website, e-mail e descrição, todos
 * pré-preenchidos com um "Restaurante Exemplo" inventado. Nada disso existe na
 * tabela `profiles`: o dono apagava sete campos à mão, carregava em guardar,
 * via "Informações atualizadas com sucesso!" — e não se guardava rigorosamente
 * nada. Um formulário que mente é pior do que um formulário que não existe.
 *
 * Se um dia a morada fizer falta ao produto, entra primeiro na base de dados e
 * só depois aqui.
 */
const BusinessInfoSettings: React.FC<BusinessInfoSettingsProps> = ({
  businessInfo,
  onBusinessInfoChange,
  onPhoneChange,
  onCountryChange,
  onSaveBusinessInfo,
  onCancel,
  saving = false,
}) => {
  const { t, i18n } = useOwnerTranslation();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('settings.business.title')}</CardTitle>
        <CardDescription>{t('settings.business.desc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">{t('settings.business.nameLabel')}</Label>
            <Input
              id="name"
              name="name"
              value={businessInfo.name}
              onChange={onBusinessInfoChange}
              placeholder={t('settings.business.namePlaceholder')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ownerName">{t('settings.business.ownerLabel')}</Label>
            <Input
              id="ownerName"
              name="ownerName"
              value={businessInfo.ownerName}
              onChange={onBusinessInfoChange}
              placeholder={t('settings.business.ownerPlaceholder')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">{t('settings.business.phoneLabel')}</Label>
            <InternationalPhoneField
              id="phone"
              value={businessInfo.phone}
              onChange={onPhoneChange}
              placeholder={t('settings.business.phonePlaceholder')}
              ariaLabel={t('settings.business.phoneCountryLabel')}
              disabled={saving}
            />
            <p className="text-xs text-muted-foreground">{t('settings.business.phoneHelp')}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="business-country">{t('settings.business.countryLabel')}</Label>
            <BusinessCountrySelect
              id="business-country"
              value={businessInfo.country}
              onChange={onCountryChange}
              placeholder={t('settings.business.countryPlaceholder')}
              locale={i18n.language}
              disabled={saving}
            />
            <p className="text-xs text-muted-foreground">{t('settings.business.countryHelp')}</p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onCancel} disabled={saving}>
          {t('settings.business.cancel')}
        </Button>
        <Button onClick={onSaveBusinessInfo} disabled={saving || !businessInfo.name.trim()}>
          {saving ? t('settings.business.saving') : t('settings.business.save')}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default BusinessInfoSettings;
