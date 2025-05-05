
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Smile, Meh, Frown, ArrowRight, Star } from 'lucide-react';

const Demo = () => {
  const [activeTab, setActiveTab] = useState('overview');
  
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar userRole="none" />
      
      <main className="flex-1 pt-20 px-4 pb-12">
        <div className="container mx-auto max-w-6xl">
          <header className="mb-8 text-center">
            <h1 className="text-3xl md:text-4xl font-bold">Demonstração AppReview</h1>
            <p className="text-gray-600 mt-2 max-w-3xl mx-auto">
              Veja como nossa plataforma ajuda você a gerenciar sua reputação online e transformar feedback negativo em oportunidades de melhoria.
            </p>
          </header>
          
          <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="space-y-8">
            <div className="flex justify-center">
              <TabsList className="grid grid-cols-1 md:grid-cols-4 w-full max-w-3xl">
                <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                <TabsTrigger value="smiley">Avaliação Smiley</TabsTrigger>
                <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                <TabsTrigger value="integration">Integrações</TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="overview" className="space-y-8">
              <div className="max-w-4xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="bg-primary/5 border-primary/20 hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="bg-primary/10 rounded-full w-12 h-12 flex items-center justify-center mb-2">
                        <Smile className="h-6 w-6 text-primary" />
                      </div>
                      <CardTitle className="text-lg">Avaliação Simples</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-600">
                        Interface intuitiva com 3 opções de avaliação: smiley triste, neutro ou feliz.
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-primary/5 border-primary/20 hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="bg-primary/10 rounded-full w-12 h-12 flex items-center justify-center mb-2">
                        <ArrowRight className="h-6 w-6 text-primary" />
                      </div>
                      <CardTitle className="text-lg">Redirecionamento Inteligente</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-600">
                        Avaliações positivas são encaminhadas para plataformas como Google e TripAdvisor.
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-primary/5 border-primary/20 hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="bg-primary/10 rounded-full w-12 h-12 flex items-center justify-center mb-2">
                        <Frown className="h-6 w-6 text-primary" />
                      </div>
                      <CardTitle className="text-lg">Feedback Interno</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-600">
                        Avaliações negativas são capturadas internamente para resolução imediata de problemas.
                      </p>
                    </CardContent>
                  </Card>
                </div>
                
                <div className="mt-12 space-y-3 text-center">
                  <h3 className="text-xl font-semibold">Veja Nossa Solução Completa</h3>
                  <p className="text-gray-600">
                    Explore as abas acima para uma demonstração detalhada de cada funcionalidade ou teste agora mesmo.
                  </p>
                  <div className="flex justify-center mt-6 space-x-4">
                    <Button onClick={() => setActiveTab('smiley')}>
                      Conhecer Avaliação Smiley
                    </Button>
                    <Button variant="outline" asChild>
                      <Link to="/review/demo-business">
                        Testar Agora
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="smiley" className="space-y-8">
              <div className="max-w-4xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                  <div>
                    <h2 className="text-2xl font-bold mb-4">Avaliação Simples em 3 Passos</h2>
                    <div className="space-y-6">
                      <div className="flex items-start">
                        <div className="bg-primary/10 rounded-full w-8 h-8 flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">
                          <span className="font-semibold text-primary">1</span>
                        </div>
                        <div>
                          <h3 className="font-medium mb-1">Cliente escaneia QR Code</h3>
                          <p className="text-gray-600 text-sm">
                            Ao final da experiência, o cliente escaneia o QR Code disponibilizado em seu estabelecimento.
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start">
                        <div className="bg-primary/10 rounded-full w-8 h-8 flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">
                          <span className="font-semibold text-primary">2</span>
                        </div>
                        <div>
                          <h3 className="font-medium mb-1">Cliente seleciona emoção</h3>
                          <p className="text-gray-600 text-sm">
                            Uma interface intuitiva apresenta três opções: triste, neutro ou feliz.
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start">
                        <div className="bg-primary/10 rounded-full w-8 h-8 flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">
                          <span className="font-semibold text-primary">3</span>
                        </div>
                        <div>
                          <h3 className="font-medium mb-1">Redirecionamento inteligente</h3>
                          <p className="text-gray-600 text-sm">
                            Clientes satisfeitos são direcionados para plataformas externas, enquanto feedback negativo é capturado internamente.
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-8">
                      <Button asChild>
                        <Link to="/review/demo-business">
                          Experimentar Avaliação
                        </Link>
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex justify-center">
                    <div className="border shadow-lg rounded-lg p-8 bg-white max-w-sm">
                      <div className="text-center mb-6">
                        <h3 className="text-xl font-bold">Como foi sua experiência?</h3>
                        <p className="text-gray-600 mt-1">Restaurante Exemplo</p>
                      </div>
                      
                      <div className="flex justify-between mt-8 mb-6">
                        <div className="flex flex-col items-center cursor-pointer hover:scale-110 transition-transform bg-red-50 rounded-lg p-4">
                          <Frown className="h-12 w-12 text-red-500" />
                          <span className="mt-2 font-medium">Ruim</span>
                        </div>
                        
                        <div className="flex flex-col items-center cursor-pointer hover:scale-110 transition-transform bg-yellow-50 rounded-lg p-4">
                          <Meh className="h-12 w-12 text-yellow-500" />
                          <span className="mt-2 font-medium">Regular</span>
                        </div>
                        
                        <div className="flex flex-col items-center cursor-pointer hover:scale-110 transition-transform bg-green-50 rounded-lg p-4">
                          <Smile className="h-12 w-12 text-green-500" />
                          <span className="mt-2 font-medium">Bom</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="dashboard" className="space-y-8">
              <div className="max-w-5xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-500">Total de Avaliações</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">368</div>
                      <p className="text-xs text-green-600 flex items-center mt-1">
                        <span className="flex items-center justify-center bg-green-100 rounded-full p-0.5 mr-1">
                          <ArrowRight className="h-3 w-3 rotate-45" />
                        </span>
                        Aumento de 12% este mês
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-500">Média de Avaliação</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">4.7</div>
                      <div className="flex text-yellow-400 mt-1">
                        <Star className="h-4 w-4 fill-current" />
                        <Star className="h-4 w-4 fill-current" />
                        <Star className="h-4 w-4 fill-current" />
                        <Star className="h-4 w-4 fill-current" />
                        <Star className="h-4 w-4 fill-current text-gray-300" />
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-500">Taxa de Resposta</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">98%</div>
                      <Progress value={98} className="h-2 mt-2" />
                    </CardContent>
                  </Card>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Distribuição das Avaliações</CardTitle>
                      <CardDescription>Histórico dos últimos 30 dias</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center">
                              <Smile className="h-5 w-5 text-green-500 mr-2" />
                              <span>Positivas</span>
                            </div>
                            <span className="font-medium">78%</span>
                          </div>
                          <Progress value={78} className="h-2 bg-gray-100" />
                        </div>
                        
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center">
                              <Meh className="h-5 w-5 text-yellow-500 mr-2" />
                              <span>Neutras</span>
                            </div>
                            <span className="font-medium">15%</span>
                          </div>
                          <Progress value={15} className="h-2 bg-gray-100" />
                        </div>
                        
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center">
                              <Frown className="h-5 w-5 text-red-500 mr-2" />
                              <span>Negativas</span>
                            </div>
                            <span className="font-medium">7%</span>
                          </div>
                          <Progress value={7} className="h-2 bg-gray-100" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Plataformas</CardTitle>
                      <CardDescription>Distribuição de avaliações por plataforma</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center">
                              <img 
                                src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg" 
                                alt="Google"
                                className="h-5 w-5 mr-2"
                              />
                              <span>Google Reviews</span>
                            </div>
                            <span className="font-medium">210</span>
                          </div>
                          <Progress value={58} className="h-2 bg-gray-100" />
                        </div>
                        
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center">
                              <img 
                                src="https://static.tacdn.com/favicon.ico" 
                                alt="TripAdvisor"
                                className="h-5 w-5 mr-2"
                              />
                              <span>TripAdvisor</span>
                            </div>
                            <span className="font-medium">98</span>
                          </div>
                          <Progress value={26} className="h-2 bg-gray-100" />
                        </div>
                        
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center">
                              <div className="bg-primary/20 h-5 w-5 rounded-full flex items-center justify-center mr-2">
                                <span className="text-primary text-xs font-bold">A</span>
                              </div>
                              <span>AppReview (interno)</span>
                            </div>
                            <span className="font-medium">60</span>
                          </div>
                          <Progress value={16} className="h-2 bg-gray-100" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <div className="mt-8 text-center">
                  <h3 className="text-xl font-semibold mb-3">Experimente o Dashboard Completo</h3>
                  <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
                    Tenha acesso a todas estas métricas e muito mais em um painel completo e personalizável.
                  </p>
                  <Button asChild>
                    <Link to="/signup">
                      Experimente Grátis por 14 Dias
                    </Link>
                  </Button>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="integration" className="space-y-8">
              <div className="max-w-4xl mx-auto">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold">Integrações Poderosas</h2>
                  <p className="text-gray-600 mt-2 max-w-2xl mx-auto">
                    Conecte-se às plataformas que seus clientes já utilizam para avaliar seu negócio.
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                  <Card className="text-center p-6 flex flex-col items-center">
                    <img 
                      src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg" 
                      alt="Google"
                      className="h-16 w-16 mb-4"
                    />
                    <h3 className="font-semibold mb-2">Google Reviews</h3>
                    <p className="text-gray-600 text-sm">
                      Integre-se com a API do Google para importar e gerenciar avaliações.
                    </p>
                  </Card>
                  
                  <Card className="text-center p-6 flex flex-col items-center">
                    <img 
                      src="https://static.tacdn.com/favicon.ico" 
                      alt="TripAdvisor"
                      className="h-16 w-16 mb-4"
                    />
                    <h3 className="font-semibold mb-2">TripAdvisor</h3>
                    <p className="text-gray-600 text-sm">
                      Conecte-se ao TripAdvisor para monitorar e responder a avaliações.
                    </p>
                  </Card>
                  
                  <Card className="text-center p-6 flex flex-col items-center">
                    <img 
                      src="https://a0.muscache.com/airbnb/static/icons/android-icon-192x192-c0465f9f0380893768972a31a614b670.png"
                      alt="Airbnb"
                      className="h-16 w-16 mb-4"
                    />
                    <h3 className="font-semibold mb-2">Airbnb</h3>
                    <p className="text-gray-600 text-sm">
                      Para proprietários de hospedagem, integre-se às avaliações do Airbnb.
                    </p>
                  </Card>
                </div>
                
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-6 md:p-8">
                  <div className="md:flex items-center justify-between">
                    <div className="mb-6 md:mb-0 md:mr-6">
                      <h3 className="text-xl font-bold mb-2">Uma plataforma única para todas as suas avaliações</h3>
                      <p className="text-gray-600">
                        Pare de perder tempo verificando múltiplas plataformas. Com o AppReview, você gerencia
                        todas as suas avaliações em um único lugar, economizando tempo e melhorando a 
                        eficiência da sua gestão de reputação online.
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <Button asChild size="lg">
                        <Link to="/signup">
                          Comece Agora
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default Demo;
