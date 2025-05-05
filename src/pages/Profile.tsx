
import React, { useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { CalendarClock, CreditCard, Shield, UserCog } from 'lucide-react';

const Profile = () => {
  const [profileData, setProfileData] = useState({
    name: 'Ana Silva',
    email: 'ana.silva@exemplo.com.br',
    phone: '(11) 98765-4321',
    currentPlan: 'Pro',
    planRenewal: '15/06/2025',
    lastPayment: '€24.90 em 15/05/2025',
    paymentMethod: '**** **** **** 5678',
  });
  
  const [profilePassword, setProfilePassword] = useState({
    current: '',
    new: '',
    confirm: '',
  });
  
  const [securitySettings, setSecuritySettings] = useState({
    twoFactorAuth: false,
    sessionTimeout: true,
    activityNotifications: true,
  });
  
  const handleProfileUpdate = () => {
    toast.success('Perfil atualizado com sucesso!');
  };
  
  const handlePasswordChange = () => {
    if (profilePassword.new !== profilePassword.confirm) {
      toast.error('As senhas não coincidem');
      return;
    }
    
    if (profilePassword.new.length < 8) {
      toast.error('A senha deve ter pelo menos 8 caracteres');
      return;
    }
    
    // Reset password fields
    setProfilePassword({
      current: '',
      new: '',
      confirm: '',
    });
    
    toast.success('Senha alterada com sucesso!');
  };
  
  const handleSecuritySettingChange = (setting: string, value: boolean) => {
    setSecuritySettings({
      ...securitySettings,
      [setting]: value,
    });
    
    toast.success(`Configuração ${setting} atualizada!`);
  };
  
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar userRole="business" businessName="Restaurante Exemplo" />
      
      <main className="flex-1 pt-20 px-4 pb-8">
        <div className="container mx-auto max-w-6xl">
          <header className="mb-8">
            <h1 className="text-3xl font-bold">Minha Conta</h1>
            <p className="text-gray-600 mt-1">
              Gerencie suas informações pessoais e preferências de conta.
            </p>
          </header>
          
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-1">
              <Card>
                <CardContent className="p-6">
                  <div className="flex flex-col items-center text-center">
                    <Avatar className="h-24 w-24 mb-4">
                      <AvatarImage src="https://i.pravatar.cc/150?img=36" />
                      <AvatarFallback>AS</AvatarFallback>
                    </Avatar>
                    <h2 className="text-xl font-semibold">{profileData.name}</h2>
                    <p className="text-gray-500 text-sm mt-1">{profileData.email}</p>
                    
                    <div className="bg-primary/10 text-primary rounded-full px-3 py-1 text-xs font-medium mt-3">
                      Plano {profileData.currentPlan}
                    </div>
                    
                    <div className="mt-6 w-full">
                      <Button className="w-full" variant="outline" onClick={() => toast.info('Função de alteração de foto em desenvolvimento.')}>
                        Alterar Foto
                      </Button>
                    </div>
                  </div>
                  
                  <div className="mt-6 pt-6 border-t">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500 flex items-center">
                          <CreditCard className="h-4 w-4 mr-2" />
                          Plano Atual
                        </span>
                        <span className="font-medium">{profileData.currentPlan}</span>
                      </div>
                      
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500 flex items-center">
                          <CalendarClock className="h-4 w-4 mr-2" />
                          Renovação
                        </span>
                        <span className="font-medium">{profileData.planRenewal}</span>
                      </div>
                      
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500 flex items-center">
                          <Shield className="h-4 w-4 mr-2" />
                          Status
                        </span>
                        <span className="text-green-600 font-medium">Ativo</span>
                      </div>
                    </div>
                    
                    <div className="mt-6">
                      <Button 
                        className="w-full"
                        onClick={() => toast.info('Redirecionando para a página de gerenciamento de assinatura...')}
                      >
                        Gerenciar Assinatura
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="lg:col-span-3">
              <Tabs defaultValue="profile">
                <TabsList className="mb-6">
                  <TabsTrigger value="profile">
                    <UserCog className="h-4 w-4 mr-2" />
                    Perfil
                  </TabsTrigger>
                  <TabsTrigger value="password">
                    <Shield className="h-4 w-4 mr-2" />
                    Senha e Segurança
                  </TabsTrigger>
                  <TabsTrigger value="billing">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Faturamento
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="profile">
                  <Card>
                    <CardHeader>
                      <CardTitle>Informações de Perfil</CardTitle>
                      <CardDescription>
                        Atualize suas informações pessoais e de contato.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Nome Completo</Label>
                          <Input
                            id="name"
                            value={profileData.name}
                            onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="email">E-mail</Label>
                          <Input
                            id="email"
                            type="email"
                            value={profileData.email}
                            onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="phone">Telefone</Label>
                          <Input
                            id="phone"
                            value={profileData.phone}
                            onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                          />
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-between">
                      <Button variant="outline" onClick={() => toast.info('Formulário resetado')}>Cancelar</Button>
                      <Button onClick={handleProfileUpdate}>Salvar Alterações</Button>
                    </CardFooter>
                  </Card>
                </TabsContent>
                
                <TabsContent value="password">
                  <Card>
                    <CardHeader>
                      <CardTitle>Alterar Senha</CardTitle>
                      <CardDescription>
                        Atualize sua senha para manter sua conta segura.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="current-password">Senha Atual</Label>
                        <Input
                          id="current-password"
                          type="password"
                          value={profilePassword.current}
                          onChange={(e) => setProfilePassword({...profilePassword, current: e.target.value})}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="new-password">Nova Senha</Label>
                        <Input
                          id="new-password"
                          type="password"
                          value={profilePassword.new}
                          onChange={(e) => setProfilePassword({...profilePassword, new: e.target.value})}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
                        <Input
                          id="confirm-password"
                          type="password"
                          value={profilePassword.confirm}
                          onChange={(e) => setProfilePassword({...profilePassword, confirm: e.target.value})}
                        />
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button 
                        onClick={handlePasswordChange} 
                        className="ml-auto"
                        disabled={!profilePassword.current || !profilePassword.new || !profilePassword.confirm}
                      >
                        Atualizar Senha
                      </Button>
                    </CardFooter>
                  </Card>
                  
                  <Card className="mt-6">
                    <CardHeader>
                      <CardTitle>Segurança</CardTitle>
                      <CardDescription>
                        Configure opções adicionais de segurança para sua conta.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Autenticação de Dois Fatores</Label>
                          <p className="text-sm text-gray-500">
                            Adicione uma camada extra de segurança à sua conta.
                          </p>
                        </div>
                        <Switch
                          checked={securitySettings.twoFactorAuth}
                          onCheckedChange={(checked) => handleSecuritySettingChange('twoFactorAuth', checked)}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Timeout de Sessão</Label>
                          <p className="text-sm text-gray-500">
                            Encerrar sessão após 30 minutos de inatividade.
                          </p>
                        </div>
                        <Switch
                          checked={securitySettings.sessionTimeout}
                          onCheckedChange={(checked) => handleSecuritySettingChange('sessionTimeout', checked)}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Notificações de Atividade</Label>
                          <p className="text-sm text-gray-500">
                            Receba notificações de login em novos dispositivos.
                          </p>
                        </div>
                        <Switch
                          checked={securitySettings.activityNotifications}
                          onCheckedChange={(checked) => handleSecuritySettingChange('activityNotifications', checked)}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="billing">
                  <Card>
                    <CardHeader>
                      <CardTitle>Informações de Faturamento</CardTitle>
                      <CardDescription>
                        Gerencie suas informações de pagamento e veja o histórico de faturas.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div>
                        <h3 className="text-sm font-medium mb-2">Plano Atual</h3>
                        <div className="bg-primary/5 border border-primary/10 rounded-lg p-4">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-medium text-lg">Plano Pro</p>
                              <p className="text-sm text-gray-500">€24.90/mês</p>
                            </div>
                            <div className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-medium">
                              Ativo
                            </div>
                          </div>
                          <div className="mt-3 text-sm text-gray-500">
                            Próxima cobrança em {profileData.planRenewal}
                          </div>
                          <div className="mt-4 flex space-x-3">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => toast.info('Redirecionando para a página de gerenciamento de assinatura...')}
                            >
                              Alterar Plano
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="text-red-500 hover:text-red-600 hover:bg-red-50"
                              onClick={() => toast.info('Redirecionando para cancelamento de assinatura...')}
                            >
                              Cancelar Assinatura
                            </Button>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="text-sm font-medium mb-2">Método de Pagamento</h3>
                        <div className="border rounded-lg p-4">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center">
                              <div className="bg-gray-100 p-2 rounded mr-3">
                                <CreditCard className="h-5 w-5 text-gray-600" />
                              </div>
                              <div>
                                <p className="font-medium">Cartão de Crédito</p>
                                <p className="text-sm text-gray-500">Mastercard terminando em 5678</p>
                              </div>
                            </div>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => toast.info('Funcionalidade em desenvolvimento: atualizar método de pagamento')}
                            >
                              Atualizar
                            </Button>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="text-sm font-medium mb-2">Histórico de Pagamentos</h3>
                        <div className="border rounded-lg overflow-hidden">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-3 text-left font-medium text-gray-500">Data</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-500">Descrição</th>
                                <th className="px-4 py-3 text-right font-medium text-gray-500">Valor</th>
                                <th className="px-4 py-3 text-right font-medium text-gray-500">Recibo</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              <tr>
                                <td className="px-4 py-3 text-gray-700">15/05/2025</td>
                                <td className="px-4 py-3 text-gray-700">Assinatura mensal - Plano Pro</td>
                                <td className="px-4 py-3 text-right text-gray-700">€24.90</td>
                                <td className="px-4 py-3 text-right">
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="text-blue-600 hover:text-blue-700"
                                    onClick={() => toast.info('Baixando recibo...')}
                                  >
                                    Baixar
                                  </Button>
                                </td>
                              </tr>
                              <tr>
                                <td className="px-4 py-3 text-gray-700">15/04/2025</td>
                                <td className="px-4 py-3 text-gray-700">Assinatura mensal - Plano Pro</td>
                                <td className="px-4 py-3 text-right text-gray-700">€24.90</td>
                                <td className="px-4 py-3 text-right">
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="text-blue-600 hover:text-blue-700"
                                    onClick={() => toast.info('Baixando recibo...')}
                                  >
                                    Baixar
                                  </Button>
                                </td>
                              </tr>
                              <tr>
                                <td className="px-4 py-3 text-gray-700">15/03/2025</td>
                                <td className="px-4 py-3 text-gray-700">Assinatura mensal - Plano Pro</td>
                                <td className="px-4 py-3 text-right text-gray-700">€24.90</td>
                                <td className="px-4 py-3 text-right">
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="text-blue-600 hover:text-blue-700"
                                    onClick={() => toast.info('Baixando recibo...')}
                                  >
                                    Baixar
                                  </Button>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Profile;
