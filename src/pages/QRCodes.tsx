
import React from 'react';
import Navbar from '@/components/layout/Navbar';
import QRCodeGenerator from '@/components/dashboard/QRCodeGenerator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle } from 'lucide-react';

const QRCodes = () => {
  // In a real app, this would come from user's account data
  const businessId = 'business123';
  const baseUrl = window.location.origin;
  
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar userRole="business" businessName="Restaurante Exemplo" />
      
      <main className="flex-1 pt-20 px-4 pb-8">
        <div className="container mx-auto max-w-6xl">
          <header className="mb-8">
            <h1 className="text-3xl font-bold">QR Codes</h1>
            <p className="text-gray-600 mt-1">
              Gere e gerencie QR Codes para coletar avaliações dos seus clientes.
            </p>
          </header>
          
          <QRCodeGenerator 
            businessId={businessId}
            baseUrl={baseUrl}
          />
          
          <div className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle>Como usar os QR Codes</CardTitle>
                <CardDescription>
                  Dicas para utilizar os QR Codes de maneira eficiente no seu negócio.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="bg-gray-50 border shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-lg">No local</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600">
                        Coloque QR Codes nas mesas, balcões, ou pontos de saída do seu estabelecimento. 
                        Incentive clientes a escanear o código após o atendimento.
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-gray-50 border shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-lg">Em materiais</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600">
                        Adicione QR Codes em cartões de visita, notas fiscais, embalagens de produtos, 
                        ou qualquer material que o cliente leve consigo.
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-gray-50 border shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-lg">Online</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600">
                        Compartilhe a imagem do QR Code em suas redes sociais, 
                        site, e-mails ou newsletters para clientes que visitaram seu negócio.
                      </p>
                    </CardContent>
                  </Card>
                </div>
                
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex items-start">
                  <AlertCircle className="h-5 w-5 text-blue-500 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-medium text-blue-700">Dica Profissional</h4>
                    <p className="text-sm text-blue-600 mt-1">
                      Crie QR Codes específicos para diferentes pontos do seu negócio ou diferentes campanhas.
                      Isso ajudará a identificar de onde vêm as avaliações e medir a eficácia de cada ponto de contato.
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

export default QRCodes;
