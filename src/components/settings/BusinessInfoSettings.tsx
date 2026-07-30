import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface BusinessInfo {
  /** Nome do negócio. Aparece a quem avalia e assina as respostas. */
  name: string;
  /** Nome de quem responde aos clientes. */
  ownerName: string;
  phone: string;
}

interface BusinessInfoSettingsProps {
  businessInfo: BusinessInfo;
  onBusinessInfoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
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
  onSaveBusinessInfo,
  onCancel,
  saving = false,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Informações do seu negócio</CardTitle>
        <CardDescription>
          O nome aparece a quem avalia pelo QR code e assina as respostas que enviar.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do seu negócio</Label>
            <Input
              id="name"
              name="name"
              value={businessInfo.name}
              onChange={onBusinessInfoChange}
              placeholder="Como os clientes o conhecem"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ownerName">O seu nome</Label>
            <Input
              id="ownerName"
              name="ownerName"
              value={businessInfo.ownerName}
              onChange={onBusinessInfoChange}
              placeholder="Quem responde aos clientes"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input
              id="phone"
              name="phone"
              value={businessInfo.phone}
              onChange={onBusinessInfoChange}
              placeholder="Para o contactarmos se algo falhar"
            />
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onCancel} disabled={saving}>
          Cancelar
        </Button>
        <Button onClick={onSaveBusinessInfo} disabled={saving || !businessInfo.name.trim()}>
          {saving ? 'A guardar...' : 'Guardar alterações'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default BusinessInfoSettings;
