
import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import BusinessMetrics from '@/components/dashboard/BusinessMetrics';
import QRCodeGenerator from '@/components/dashboard/QRCodeGenerator';
import ReviewsList from '@/components/dashboard/ReviewsList';

// Mock data for demonstration
const businessData = {
  id: 'business123',
  name: 'Restaurante Exemplo',
  metrics: {
    positive: 48,
    neutral: 12,
    negative: 4,
    total: 64,
    googleAverage: 4.7,
    tripAdvisorAverage: 4.5
  },
  reviews: [
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
      id: 'rev3',
      customerName: 'Pedro Santos',
      rating: 'negative' as const,
      platform: 'internal' as const,
      comment: 'Fiquei esperando por mais de uma hora e a comida chegou fria.',
      date: '2023-05-08'
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
  ]
};

const Dashboard = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar userRole="business" businessName={businessData.name} />
      
      <main className="flex-1 pt-20 px-4 pb-8">
        <div className="container mx-auto max-w-6xl">
          <header className="mb-8">
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Gerencie suas avaliações e reputação online.
            </p>
          </header>
          
          <BusinessMetrics metrics={businessData.metrics} />
          
          <div className="mt-8">
            <Tabs defaultValue="reviews">
              <TabsList className="mb-4">
                <TabsTrigger value="reviews">Avaliações</TabsTrigger>
                <TabsTrigger value="qrcodes">QR Codes</TabsTrigger>
                <TabsTrigger value="links">Links Externos</TabsTrigger>
              </TabsList>
              
              <TabsContent value="reviews">
                <ReviewsList reviews={businessData.reviews} />
              </TabsContent>
              
              <TabsContent value="qrcodes">
                <QRCodeGenerator 
                  businessId={businessData.id}
                  baseUrl="https://appreview.com"
                />
              </TabsContent>
              
              <TabsContent value="links">
                <Card>
                  <CardHeader>
                    <CardTitle>Links Externos</CardTitle>
                    <CardDescription>
                      Gerencie seus links para plataformas externas e redes sociais.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">Google Review</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-between gap-2">
                            <input
                              type="text"
                              value="https://g.page/r/example-review-link"
                              readOnly
                              className="flex-1 p-2 text-sm border rounded bg-gray-50"
                            />
                            <Button variant="outline" size="sm">Editar</Button>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">TripAdvisor</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-between gap-2">
                            <input
                              type="text"
                              value="https://tripadvisor.com/example-review"
                              readOnly
                              className="flex-1 p-2 text-sm border rounded bg-gray-50"
                            />
                            <Button variant="outline" size="sm">Editar</Button>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">Instagram</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-between gap-2">
                            <input
                              type="text"
                              value="https://instagram.com/example"
                              readOnly
                              className="flex-1 p-2 text-sm border rounded bg-gray-50"
                            />
                            <Button variant="outline" size="sm">Editar</Button>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">iFood</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-between gap-2">
                            <input
                              type="text"
                              value="https://ifood.com/example-restaurant"
                              readOnly
                              className="flex-1 p-2 text-sm border rounded bg-gray-50"
                            />
                            <Button variant="outline" size="sm">Editar</Button>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                    
                    <div className="pt-4 flex justify-end">
                      <Button>Adicionar Novo Link</Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
