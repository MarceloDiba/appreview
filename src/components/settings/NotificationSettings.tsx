
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

const NotificationSettings: React.FC = () => {
  const handleSaveNotifications = () => {
    toast.success('Configurações de notificações salvas!');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configurações de Notificações</CardTitle>
        <CardDescription>
          Gerencie como e quando você recebe notificações sobre seu negócio.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Novas Avaliações</Label>
            <p className="text-sm text-gray-500">
              Receba notificações quando seu negócio receber novas avaliações.
            </p>
          </div>
          <Switch defaultChecked />
        </div>
        
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Avaliações Negativas</Label>
            <p className="text-sm text-gray-500">
              Receba alertas imediatos para avaliações negativas (1-2 estrelas).
            </p>
          </div>
          <Switch defaultChecked />
        </div>
        
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Relatório Semanal</Label>
            <p className="text-sm text-gray-500">
              Receba um resumo semanal do desempenho das suas avaliações.
            </p>
          </div>
          <Switch defaultChecked />
        </div>
        
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>E-mail</Label>
            <p className="text-sm text-gray-500">
              Receba notificações por e-mail.
            </p>
          </div>
          <Switch defaultChecked />
        </div>
        
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Push</Label>
            <p className="text-sm text-gray-500">
              Receba notificações push no navegador.
            </p>
          </div>
          <Switch />
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleSaveNotifications} className="ml-auto">
          Salvar Preferências
        </Button>
      </CardFooter>
    </Card>
  );
};

export default NotificationSettings;
