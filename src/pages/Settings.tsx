
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useUser } from '@/components/providers/UserProvider';
import BusinessInfoSettings from '@/components/settings/BusinessInfoSettings';
import ReviewSettings from '@/components/settings/ReviewSettings';
import ExternalLinksSettings from '@/components/settings/ExternalLinksSettings';
import NotificationSettings from '@/components/settings/NotificationSettings';
import { useExternalLinks } from '@/hooks/useExternalLinks';
import GoogleReviews from '@/components/dashboard/GoogleReviews';

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

  const { user } = useUser();
  const { 
    externalLinks, 
    isLoading,
    isValidating,
    handleExternalLinkChange, 
    handleAddExternalLink, 
    handleDeleteExternalLink,
    refreshGooglePlaceData,
    saveExternalLinks,
    refreshLinks,
    error 
  } = useExternalLinks(user?.id);
  
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
              <TabsTrigger value="google-reviews">Google Reviews</TabsTrigger>
            </TabsList>
            
            <TabsContent value="business">
              <BusinessInfoSettings 
                businessInfo={businessInfo}
                onBusinessInfoChange={handleBusinessInfoChange}
                onSaveBusinessInfo={handleSaveBusinessInfo}
                onCancel={() => navigate(-1)}
              />
            </TabsContent>
            
            <TabsContent value="reviews">
              <ReviewSettings 
                reviewSettings={reviewSettings}
                onReviewSettingsChange={handleReviewSettingsChange}
                onSaveReviewSettings={handleSaveReviewSettings}
              />
            </TabsContent>
            
            <TabsContent value="external-links">
              <ExternalLinksSettings 
                externalLinks={externalLinks}
                onExternalLinkChange={handleExternalLinkChange}
                onDeleteExternalLink={handleDeleteExternalLink}
                onAddExternalLink={handleAddExternalLink}
                onSaveExternalLinks={saveExternalLinks}
                onRefreshPlaceData={refreshGooglePlaceData}
                isLoading={isLoading}
                isValidating={isValidating}
                error={error}
                refreshLinks={refreshLinks}
              />
            </TabsContent>
            
            <TabsContent value="notifications">
              <NotificationSettings />
            </TabsContent>

            <TabsContent value="google-reviews">
              {user && <GoogleReviews userId={user.id} />}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default Settings;
