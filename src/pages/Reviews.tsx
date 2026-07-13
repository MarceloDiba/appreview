import React, { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import ReviewsList from '@/components/dashboard/ReviewsList';
import GoogleReviews from '@/components/dashboard/GoogleReviews';
import CasesList from '@/components/dashboard/cases/CasesList';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { AlertCircle, ImportIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

// Mock data for demonstration (Google/TripAdvisor reviews only — internal cases come from real data below)
const reviews = [
  {
    id: 'rev1',
    customerName: 'João Silva',
    rating: 'positive' as const,
    platform: 'google' as const,
    comment: 'Excelente atendimento e comida muito saborosa. Recomendo!',
    date: '2023-05-12',
    responseStatus: 'responded' as const
  },
  {
    id: 'rev2',
    customerName: 'Maria Oliveira',
    rating: 'neutral' as const,
    platform: 'tripadvisor' as const,
    comment: 'A comida estava boa, mas o atendimento demorou muito.',
    date: '2023-05-10',
    responseStatus: 'pending' as const
  },
  {
    id: 'rev4',
    customerName: 'Ana Costa',
    rating: 'positive' as const,
    platform: 'google' as const,
    comment: 'Adorei o novo menu, especialmente o prato do dia!',
    date: '2023-05-06',
    responseStatus: 'responded' as const
  },
  {
    id: 'rev5',
    customerName: 'Luiz Ferreira',
    rating: 'positive' as const,
    platform: 'tripadvisor' as const,
    comment: 'Ambiente aconchegante e música ao vivo muito boa.',
    date: '2023-05-04'
  }
];

const Reviews = () => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [userId, setUserId] = useState<string | null>(null);
  
  useEffect(() => {
    // Get the current user's ID
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    
    fetchUser();
  }, []);
  
  const refreshReviews = () => {
    setIsRefreshing(true);
    
    // Simulate API call to refresh reviews
    setTimeout(() => {
      setIsRefreshing(false);
      toast.success('Avaliações atualizadas com sucesso!');
    }, 1500);
  };
  
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar userRole="business" businessName="Restaurante Exemplo" />
      
      <main className="flex-1 pt-20 px-4 pb-8">
        <div className="container mx-auto max-w-6xl">
          <header className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <div>
              <h1 className="text-3xl font-bold">Avaliações</h1>
              <p className="text-gray-600 mt-1">
                Resolva os casos que chegam pelo Smiley e responda às avaliações públicas do seu negócio.
              </p>
            </div>
            
            <div className="mt-4 sm:mt-0 flex gap-3">
              <Button 
                variant="outline" 
                onClick={refreshReviews}
                disabled={isRefreshing}
              >
                {isRefreshing ? 'Atualizando...' : 'Atualizar'}
              </Button>
              <Button onClick={() => toast.info('Funcionalidade em desenvolvimento!')}>
                <ImportIcon className="h-4 w-4 mr-2" />
                Importar
              </Button>
            </div>
          </header>

          {/* New Google Reviews section */}
          <div className="mb-8">
            {userId && <GoogleReviews userId={userId} />}
          </div>
          
          <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">Públicas ({reviews.length})</TabsTrigger>
              <TabsTrigger value="google">Google (2)</TabsTrigger>
              <TabsTrigger value="tripadvisor">TripAdvisor (2)</TabsTrigger>
              <TabsTrigger value="internal">Casos para resolver</TabsTrigger>
            </TabsList>

            <TabsContent value="all">
              <ReviewsList reviews={reviews} />
            </TabsContent>

            <TabsContent value="google">
              <ReviewsList reviews={reviews.filter(r => r.platform === 'google')} />
            </TabsContent>

            <TabsContent value="tripadvisor">
              <ReviewsList reviews={reviews.filter(r => r.platform === 'tripadvisor')} />
            </TabsContent>

            <TabsContent value="internal">
              {userId ? (
                <CasesList userId={userId} />
              ) : (
                <div className="text-center py-8 text-gray-500">Carregando...</div>
              )}
            </TabsContent>
          </Tabs>
          
          <div className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle>Integrações e Links Externos</CardTitle>
                <CardDescription>
                  Configure as integrações com plataformas de avaliação externas para importar e gerenciar automaticamente.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center">
                        <div className="bg-blue-100 p-2 rounded-full text-blue-600 mr-2">
                          <img 
                            src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg" 
                            alt="Google"
                            className="h-5 w-5"
                          />
                        </div>
                        Google Reviews API
                        <span className="ml-2 text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                          Conectado
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-col gap-2">
                        <p className="text-sm text-gray-500">
                          Importações automáticas de avaliações do Google Reviews através da API do Google Places.
                        </p>
                        <Button 
                          variant="outline"
                          onClick={() => window.location.href = '/settings'}
                          className="mt-2"
                        >
                          Configurar URLs do Google
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center">
                        <div className="bg-green-100 p-2 rounded-full text-green-600 mr-2">
                          <img 
                            src="https://static.tacdn.com/favicon.ico" 
                            alt="TripAdvisor"
                            className="h-5 w-5"
                          />
                        </div>
                        TripAdvisor Reviews
                        <span className="ml-2 text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">
                          Pendente
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-col gap-2">
                        <p className="text-sm text-gray-500">
                          Configure a conexão com reviews do TripAdvisor ou adicione manualmente.
                        </p>
                        <Button 
                          variant="outline"
                          onClick={() => toast.info('Funcionalidade em desenvolvimento!')}
                          className="mt-2"
                        >
                          Configurar TripAdvisor
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex items-start">
                  <AlertCircle className="h-5 w-5 text-blue-500 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-medium text-blue-700">API de avaliações</h4>
                    <p className="text-sm text-blue-600 mt-1">
                      A integração com o Google Places API está ativa. As avaliações são automaticamente atualizadas a cada 12 horas.
                      Você pode forçar uma atualização manualmente clicando no botão "Atualizar" na seção de Avaliações do Google.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Reviews;
