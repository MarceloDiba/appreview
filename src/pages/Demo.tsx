import React from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, MessageSquareText, QrCode, Star } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const Demo = () => (
  <div className="flex min-h-screen flex-col bg-gray-50">
    <Navbar userRole="none" />
    <main className="flex-1 px-4 pb-12 pt-24">
      <div className="container mx-auto max-w-5xl">
        <header className="mx-auto mb-8 max-w-2xl text-center">
          <span className="rounded-full bg-gray-200 px-3 py-1 text-xs text-gray-600">Demonstração ilustrativa</span>
          <h1 className="mt-4 text-4xl font-bold">O caminho do QR até o Google</h1>
          <p className="mt-3 text-gray-600">Sem dados reais e sem simular uma publicação. Veja apenas como o produto funciona.</p>
        </header>

        <Tabs defaultValue="customer" className="space-y-6">
          <TabsList className="mx-auto grid max-w-xl grid-cols-2">
            <TabsTrigger value="customer">Experiência do cliente</TabsTrigger>
            <TabsTrigger value="manager">Painel do gestor</TabsTrigger>
          </TabsList>

          <TabsContent value="customer">
            <div className="grid items-center gap-8 md:grid-cols-2">
              <div>
                <h2 className="text-2xl font-bold">Direto, sem perguntar se a experiência foi boa</h2>
                <p className="mt-3 text-gray-600">
                  O cliente escaneia o QR e encontra a avaliação pública disponível imediatamente.
                  Se preferir, também pode enviar um comentário privado ao estabelecimento.
                </p>
                <div className="mt-6 space-y-4">
                  <div className="flex gap-3"><QrCode className="mt-0.5 h-5 w-5 text-primary" /><p><strong>1.</strong> Escaneia com a câmera do telefone.</p></div>
                  <div className="flex gap-3"><ExternalLink className="mt-0.5 h-5 w-5 text-primary" /><p><strong>2.</strong> Abre a página pública do negócio.</p></div>
                  <div className="flex gap-3"><MessageSquareText className="mt-0.5 h-5 w-5 text-primary" /><p><strong>3.</strong> Comentário privado continua opcional.</p></div>
                </div>
              </div>
              <Card className="mx-auto w-full max-w-sm shadow-lg">
                <CardHeader className="text-center"><CardTitle>Compartilhe sua experiência</CardTitle><p className="text-sm text-gray-500">Seu negócio</p></CardHeader>
                <CardContent className="space-y-3">
                  <Button className="h-12 w-full">Avaliar no Google <ExternalLink className="ml-2 h-4 w-4" /></Button>
                  <Button variant="outline" className="h-12 w-full"><MessageSquareText className="mr-2 h-4 w-4" />Enviar comentário direto</Button>
                  <p className="text-center text-xs text-gray-500">A opção pública nunca é filtrada.</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="manager">
            <Card className="shadow-lg">
              <CardHeader><div className="flex items-start justify-between"><div><CardTitle>Resultado no Google</CardTitle><p className="mt-1 text-sm text-gray-500">Seu negócio</p></div><span className="rounded-full bg-gray-100 px-3 py-1 text-xs">Exemplo ilustrativo</span></div></CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-amber-50 p-5"><Star className="h-5 w-5 fill-amber-400 text-amber-400" /><p className="mt-3 text-3xl font-bold">4,6</p><p className="text-sm text-gray-600">82 avaliações no Google</p></div>
                  <div className="rounded-xl bg-violet-50 p-5"><QrCode className="h-5 w-5 text-primary" /><p className="mt-3 text-3xl font-bold">128</p><p className="text-sm text-gray-600">aberturas do QR</p></div>
                  <div className="rounded-xl bg-blue-50 p-5"><ExternalLink className="h-5 w-5 text-blue-600" /><p className="mt-3 text-3xl font-bold">74</p><p className="text-sm text-gray-600">cliques para o Google</p></div>
                </div>
                <div className="mt-4 rounded-xl border p-4"><p className="font-medium">Evolução observada: +6 avaliações e +0,1 na média.</p><p className="mt-2 text-xs text-gray-500">O clique não confirma publicação. A evolução vem do Google e não é atribuída automaticamente ao AppReview.</p></div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="mt-10 text-center"><Button asChild size="lg"><Link to="/signup">Criar minha conta</Link></Button></div>
      </div>
    </main>
  </div>
);

export default Demo;
