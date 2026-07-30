import React, { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import GoogleReviews from '@/components/dashboard/GoogleReviews';
import CasesList from '@/components/dashboard/cases/CasesList';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';


const Reviews = () => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('internal');
  const [userId, setUserId] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState<string>('');
  
  useEffect(() => {
    // Get the current user's ID
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const { data: profile } = await supabase
          .from('profiles')
          .select('business_name')
          .eq('id', user.id)
          .maybeSingle();
        if (profile?.business_name) setBusinessName(profile.business_name);
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
      <Navbar userRole="business" businessName={businessName || undefined} />
      
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
            </div>
          </header>

          {/* New Google Reviews section */}
          <div className="mb-8">
            {userId && <GoogleReviews userId={userId} />}
          </div>
          
          <Tabs defaultValue="internal" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="internal">Casos para resolver</TabsTrigger>
            </TabsList>

            <TabsContent value="internal">
              {userId ? (
                <CasesList userId={userId} businessName={businessName || undefined} />
              ) : (
                <div className="text-center py-8 text-gray-500">A carregar...</div>
              )}
            </TabsContent>
          </Tabs>
          
          <div className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle>Integrações e Links Externos</CardTitle>
                <CardDescription>
                  Configure os links e a infraestrutura das plataformas de avaliação externas. Link salvo não significa importação automática ativa.
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
                        <span className="ml-2 text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">
                          Link salvo / infra pendente
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-col gap-2">
                        <p className="text-sm text-gray-500">
                          O link do Google pode estar salvo, mas a importação automática só funciona quando o Place ID, a Edge Function e a chave da Google Places API estiverem operacionais.
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
                    <h4 className="text-sm font-medium text-blue-700">Status da importação automática</h4>
                    <p className="text-sm text-blue-600 mt-1">
                      Se o link do Google já foi salvo, ele pode ser usado para redirecionar clientes. Já a importação automática desta aba continua dependente de Place ID, Edge Function publicada e secret GOOGLE_PLACES_API_KEY no Supabase.
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
