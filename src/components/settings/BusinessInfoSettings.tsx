
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface BusinessInfo {
  name: string;
  address: string;
  city: string;
  postalCode: string;
  phone: string;
  email: string;
  description: string;
  websiteUrl: string;
}

interface BusinessInfoSettingsProps {
  businessInfo: BusinessInfo;
  onBusinessInfoChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onSaveBusinessInfo: () => void;
  onCancel: () => void;
}

const BusinessInfoSettings: React.FC<BusinessInfoSettingsProps> = ({
  businessInfo,
  onBusinessInfoChange,
  onSaveBusinessInfo,
  onCancel
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Informações do Negócio</CardTitle>
        <CardDescription>
          Atualize as informações básicas do seu negócio que serão exibidas aos clientes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Negócio</Label>
            <Input
              id="name"
              name="name"
              value={businessInfo.name}
              onChange={onBusinessInfoChange}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">E-mail de Contato</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={businessInfo.email}
              onChange={onBusinessInfoChange}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input
              id="phone"
              name="phone"
              value={businessInfo.phone}
              onChange={onBusinessInfoChange}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="websiteUrl">Website</Label>
            <Input
              id="websiteUrl"
              name="websiteUrl"
              value={businessInfo.websiteUrl}
              onChange={onBusinessInfoChange}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="address">Endereço</Label>
            <Input
              id="address"
              name="address"
              value={businessInfo.address}
              onChange={onBusinessInfoChange}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="city">Cidade</Label>
            <Input
              id="city"
              name="city"
              value={businessInfo.city}
              onChange={onBusinessInfoChange}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="postalCode">CEP</Label>
            <Input
              id="postalCode"
              name="postalCode"
              value={businessInfo.postalCode}
              onChange={onBusinessInfoChange}
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="description">Descrição do Negócio</Label>
          <Textarea
            id="description"
            name="description"
            value={businessInfo.description}
            onChange={onBusinessInfoChange}
            rows={4}
          />
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button onClick={onSaveBusinessInfo}>Salvar Alterações</Button>
      </CardFooter>
    </Card>
  );
};

export default BusinessInfoSettings;
