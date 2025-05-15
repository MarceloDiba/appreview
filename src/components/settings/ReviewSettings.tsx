
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

interface ReviewSettingsState {
  allowNegativeReviews: boolean;
  autoRedirectPositive: boolean;
  negativeFormCustomization: boolean;
  rememberCustomer: boolean;
  followUpEmail: boolean;
}

interface ReviewSettingsProps {
  reviewSettings: ReviewSettingsState;
  onReviewSettingsChange: (key: string, value: boolean) => void;
  onSaveReviewSettings: () => void;
}

const ReviewSettings: React.FC<ReviewSettingsProps> = ({
  reviewSettings,
  onReviewSettingsChange,
  onSaveReviewSettings
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Configurações de Avaliação</CardTitle>
        <CardDescription>
          Personalize como as avaliações são coletadas e gerenciadas.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="allowNegativeReviews">Permitir Avaliações Negativas</Label>
            <p className="text-sm text-gray-500">
              Se desativado, avaliações negativas serão enviadas apenas para formulário interno.
            </p>
          </div>
          <Switch
            id="allowNegativeReviews"
            checked={reviewSettings.allowNegativeReviews}
            onCheckedChange={(checked) => onReviewSettingsChange('allowNegativeReviews', checked)}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="autoRedirectPositive">Redirecionamento Automático</Label>
            <p className="text-sm text-gray-500">
              Redireciona automaticamente avaliações positivas para plataformas externas (Google, TripAdvisor).
            </p>
          </div>
          <Switch
            id="autoRedirectPositive"
            checked={reviewSettings.autoRedirectPositive}
            onCheckedChange={(checked) => onReviewSettingsChange('autoRedirectPositive', checked)}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="negativeFormCustomization">Personalizar Formulário Negativo</Label>
            <p className="text-sm text-gray-500">
              Personalizar campos e mensagens do formulário de feedback negativo.
            </p>
          </div>
          <Switch
            id="negativeFormCustomization"
            checked={reviewSettings.negativeFormCustomization}
            onCheckedChange={(checked) => onReviewSettingsChange('negativeFormCustomization', checked)}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="rememberCustomer">Lembrar Cliente</Label>
            <p className="text-sm text-gray-500">
              Armazena informações do cliente para facilitar avaliações futuras.
            </p>
          </div>
          <Switch
            id="rememberCustomer"
            checked={reviewSettings.rememberCustomer}
            onCheckedChange={(checked) => onReviewSettingsChange('rememberCustomer', checked)}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="followUpEmail">E-mail de Acompanhamento</Label>
            <p className="text-sm text-gray-500">
              Enviar e-mail de agradecimento após a avaliação.
            </p>
          </div>
          <Switch
            id="followUpEmail"
            checked={reviewSettings.followUpEmail}
            onCheckedChange={(checked) => onReviewSettingsChange('followUpEmail', checked)}
          />
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={onSaveReviewSettings} className="ml-auto">
          Salvar Configurações
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ReviewSettings;
