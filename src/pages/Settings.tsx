import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { ExternalLink, PlusCircle, Trash2 } from 'lucide-react';
import { extractPlaceIdFromUrl } from '@/utils/googlePlaceUtils';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/components/providers/UserProvider';

const Settings = () => {
  const navigate = useNavigate();
  const [businessInfo, setBusinessInfo] = useState({
    name: 'Restaurante Exemplo',
    address: 'Rua das Flores, 123',
    city: 'São Paulo',
    postalCode: '01234-567',
    phone: '(11) 99999-9999',
    email: 'contato@restauranteexemplo.com.br',
    description: 'Restaurante especializado em comida tradicional brasileira. Ambiente aconchegante e familiar.',
    websiteUrl: 'https://restauranteexemplo.com.br',
  });
  
  const [reviewSettings, setReviewSettings] = useState({
    allowNegativeReviews: true,
    autoRedirectPositive: true,
    negativeFormCustomization: false,
    rememberCustomer: true,
    followUpEmail: false,
  });

  const [externalLinks, setExternalLinks] = useState<
    { platform: string; url: string; place_id?: string }[]
  >([
    { platform: 'Google Reviews', url: 'https://g.page/r/example-review-link', place_id: '' },
    { platform: 'TripAdvisor', url: 'https://tripadvisor.com/example-review' },
    { platform: 'Instagram', url: 'https://instagram.com/example' },
    { platform: 'Facebook', url: 'https://facebook.com/example' },
  ]);
  
  const [newLink, setNewLink] = useState({ platform: '', url: '' });
  const { user } = useUser();

  // Load external links from database when component mounts
  useEffect(() => {
    if (user) {
      loadExternalLinks();
    }
  }, [user]);

  const loadExternalLinks = async () => {
    try {
      const { data: links, error } = await supabase
        .from('platform_links')
        .select('*')
        .eq('user_id', user?.id);
        
      if (error) {
        throw new Error(error.message);
      }
      
      if (links && links.length > 0) {
        const formattedLinks = links.map(link => ({
          platform: link.display_name || link.platform,
          url: link.url,
          place_id: link.place_id || ''
        }));
        
        setExternalLinks(formattedLinks);
      }
    } catch (error) {
      console.error('Error loading external links:', error);
    }
  };
  
  const handleBusinessInfoChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setBusinessInfo(prev => ({ ...prev, [name]: value }));
  };
  
  const handleReviewSettingsChange = (key: string, value: boolean) => {
    setReviewSettings(prev => ({ ...prev, [key]: value }));
  };
  
  const handleSaveBusinessInfo = () => {
    // In a real app, this would save to the database
    toast.success('Informações atualizadas com sucesso!');
  };
  
  const handleSaveReviewSettings = () => {
    // In a real app, this would save to the database
    toast.success('Configurações de avaliação atualizadas!');
  };

  const handleExternalLinkChange = (index: number, key: string, value: string) => {
    const updatedLinks = [...externalLinks];
    updatedLinks[index] = { ...updatedLinks[index], [key]: value };
    
    // If this is a Google URL, try to extract the place_id
    if (key === 'url' && updatedLinks[index].platform === 'Google Reviews') {
      const placeId = extractPlaceIdFromUrl(value);
      if (placeId) {
        updatedLinks[index].place_id = placeId;
        toast.success('Google Place ID detectado com sucesso!');
      } else {
        // Clear the place_id if we couldn't extract it
        updatedLinks[index].place_id = '';
      }
    }
    
    setExternalLinks(updatedLinks);
  };
  
  const handleAddExternalLink = () => {
    if (!newLink.platform || !newLink.url) {
      toast.error('Preencha todos os campos');
      return;
    }
    
    const linkToAdd: { platform: string; url: string; place_id?: string } = { ...newLink };
    
    // If this is a Google URL, try to extract the place_id
    if (linkToAdd.platform === 'Google Reviews') {
      const placeId = extractPlaceIdFromUrl(linkToAdd.url);
      if (placeId) {
        linkToAdd.place_id = placeId;
        toast.success('Google Place ID detectado com sucesso!');
      }
    }
    
    setExternalLinks([...externalLinks, linkToAdd]);
    setNewLink({ platform: '', url: '' });
    toast.success('Link adicionado com sucesso!');
  };
  
  const handleDeleteExternalLink = (index: number) => {
    const updatedLinks = [...externalLinks];
    updatedLinks.splice(index, 1);
    setExternalLinks(updatedLinks);
    toast.success('Link removido com sucesso!');
  };
  
  const saveExternalLinks = async () => {
    try {
      if (!user?.id) {
        toast.error('Usuário não autenticado');
        return;
      }

      // First delete all existing links
      const { error: deleteError } = await supabase
        .from('platform_links')
        .delete()
        .eq('user_id', user.id);
        
      if (deleteError) {
        throw new Error(deleteError.message);
      }
      
      // Then insert all links
      const linksToInsert = externalLinks.map(link => ({
        user_id: user.id,
        platform: link.platform.toLowerCase(),
        url: link.url,
        display_name: link.platform,
        place_id: link.place_id || null
      }));
      
      const { error: insertError } = await supabase
        .from('platform_links')
        .insert(linksToInsert);
        
      if (insertError) {
        throw new Error(insertError.message);
      }
      
      toast.success('Links externos atualizados com sucesso!');
    } catch (error) {
      console.error('Error saving external links:', error);
      toast.error('Erro ao salvar links externos. Por favor, tente novamente.');
    }
  };
  
  
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar userRole="business" businessName={businessInfo.name} />
      
      <main className="flex-1 pt-20 px-4 pb-8">
        <div className="container mx-auto max-w-6xl">
          <header className="mb-8">
            <h1 className="text-3xl font-bold">Configurações</h1>
            <p className="text-gray-600 mt-1">
              Gerencie as configurações do seu negócio e personalize sua experiência.
            </p>
          </header>
          
          <Tabs defaultValue="business">
            <TabsList className="mb-6">
              <TabsTrigger value="business">Informações do Negócio</TabsTrigger>
              <TabsTrigger value="reviews">Avaliações</TabsTrigger>
              <TabsTrigger value="external-links">Links Externos</TabsTrigger>
              <TabsTrigger value="notifications">Notificações</TabsTrigger>
            </TabsList>
            
            
            <TabsContent value="business">
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
                        onChange={handleBusinessInfoChange}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email">E-mail de Contato</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={businessInfo.email}
                        onChange={handleBusinessInfoChange}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefone</Label>
                      <Input
                        id="phone"
                        name="phone"
                        value={businessInfo.phone}
                        onChange={handleBusinessInfoChange}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="websiteUrl">Website</Label>
                      <Input
                        id="websiteUrl"
                        name="websiteUrl"
                        value={businessInfo.websiteUrl}
                        onChange={handleBusinessInfoChange}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="address">Endereço</Label>
                      <Input
                        id="address"
                        name="address"
                        value={businessInfo.address}
                        onChange={handleBusinessInfoChange}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="city">Cidade</Label>
                      <Input
                        id="city"
                        name="city"
                        value={businessInfo.city}
                        onChange={handleBusinessInfoChange}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="postalCode">CEP</Label>
                      <Input
                        id="postalCode"
                        name="postalCode"
                        value={businessInfo.postalCode}
                        onChange={handleBusinessInfoChange}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="description">Descrição do Negócio</Label>
                    <Textarea
                      id="description"
                      name="description"
                      value={businessInfo.description}
                      onChange={handleBusinessInfoChange}
                      rows={4}
                    />
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button variant="outline" onClick={() => navigate(-1)}>Cancelar</Button>
                  <Button onClick={handleSaveBusinessInfo}>Salvar Alterações</Button>
                </CardFooter>
              </Card>
            </TabsContent>
            
            <TabsContent value="reviews">
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
                      onCheckedChange={(checked) => handleReviewSettingsChange('allowNegativeReviews', checked)}
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
                      onCheckedChange={(checked) => handleReviewSettingsChange('autoRedirectPositive', checked)}
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
                      onCheckedChange={(checked) => handleReviewSettingsChange('negativeFormCustomization', checked)}
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
                      onCheckedChange={(checked) => handleReviewSettingsChange('rememberCustomer', checked)}
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
                      onCheckedChange={(checked) => handleReviewSettingsChange('followUpEmail', checked)}
                    />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button onClick={handleSaveReviewSettings} className="ml-auto">
                    Salvar Configurações
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
            
            <TabsContent value="external-links">
              <Card>
                <CardHeader>
                  <CardTitle>Links Externos</CardTitle>
                  <CardDescription>
                    Gerencie links para suas plataformas externas de avaliação e redes sociais.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    {externalLinks.map((link, index) => (
                      <div key={index} className="flex items-center justify-between border p-3 rounded-md">
                        <div className="flex flex-col gap-1 flex-grow pr-2">
                          <div className="font-medium">{link.platform}</div>
                          <div className="flex items-center">
                            <input
                              type="text"
                              value={link.url}
                              onChange={(e) => handleExternalLinkChange(index, 'url', e.target.value)}
                              className="w-full text-sm p-1 border rounded"
                              placeholder="https://"
                            />
                            <a
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-2 text-blue-600 hover:underline"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </div>
                          {link.platform === 'Google Reviews' && (
                            <div className="text-xs text-gray-500">
                              {link.place_id ? (
                                <span className="text-green-600">Place ID: {link.place_id}</span>
                              ) : (
                                <span className="text-amber-600">Nenhum Place ID detectado. Verifique o URL.</span>
                              )}
                            </div>
                          )}
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDeleteExternalLink(index)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  
                  <div className="border-t pt-4">
                    <h3 className="text-sm font-medium mb-3">Adicionar Novo Link</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="platform">Plataforma</Label>
                        <Input
                          id="platform"
                          placeholder="Ex: WhatsApp, Instagram, etc."
                          value={newLink.platform}
                          onChange={(e) => setNewLink({...newLink, platform: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="url">URL</Label>
                        <Input
                          id="url"
                          placeholder="https://..."
                          value={newLink.url}
                          onChange={(e) => setNewLink({...newLink, url: e.target.value})}
                        />
                      </div>
                    </div>
                    <Button 
                      onClick={handleAddExternalLink} 
                      className="mt-4"
                      variant="outline"
                    >
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Adicionar Link
                    </Button>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button onClick={saveExternalLinks}>Salvar Links</Button>
                </CardFooter>
              </Card>
            </TabsContent>
            
            <TabsContent value="notifications">
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
                  <Button onClick={() => toast.success('Configurações de notificações salvas!')} className="ml-auto">
                    Salvar Preferências
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default Settings;
