import React from 'react';
import { Link } from 'react-router-dom';
import { Bot, Copy, ExternalLink, MessageCircle, MessageSquareText, Pencil, QrCode, Star } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const ExampleBadge = () => <span className="rounded-full bg-violet-50 px-3 py-1 text-xs text-primary">Exemplo ilustrativo</span>;

const Demo = () => (
  <div className="flex min-h-screen flex-col bg-gray-50">
    <Navbar userRole="none" />
    <main className="flex-1 px-4 pb-12 pt-24">
      <div className="container mx-auto max-w-5xl">
        <header className="mx-auto mb-8 max-w-3xl text-center">
          <ExampleBadge />
          <h1 className="mt-4 text-4xl font-bold">Veja como o assessor trabalha por você</h1>
          <p className="mt-3 text-gray-600">A demonstração usa somente dados fictícios identificados. Nenhuma resposta é publicada.</p>
        </header>

        <Tabs defaultValue="customer" className="space-y-6">
          <TabsList className="mx-auto grid h-auto max-w-2xl grid-cols-1 sm:grid-cols-3">
            <TabsTrigger value="customer">Caminho do cliente</TabsTrigger>
            <TabsTrigger value="advisor">Assessor no painel</TabsTrigger>
            <TabsTrigger value="whatsapp">WhatsApp planejado</TabsTrigger>
          </TabsList>

          <TabsContent value="customer">
            <div className="grid items-center gap-8 md:grid-cols-2">
              <div>
                <h2 className="text-2xl font-bold">O cliente chega ao Google sem triagem</h2>
                <p className="mt-3 text-gray-600">O QR oferece a avaliação pública diretamente. Comentário privado é uma alternativa opcional, nunca um desvio por nota.</p>
                <div className="mt-6 space-y-4 text-sm text-gray-700">
                  <div className="flex gap-3"><QrCode className="mt-0.5 h-5 w-5 text-primary" /><p>Escaneia com a câmera do telefone.</p></div>
                  <div className="flex gap-3"><ExternalLink className="mt-0.5 h-5 w-5 text-primary" /><p>Abre a página pública do negócio.</p></div>
                  <div className="flex gap-3"><MessageSquareText className="mt-0.5 h-5 w-5 text-primary" /><p>Pode enviar comentário direto, se preferir.</p></div>
                </div>
              </div>
              <Card className="mx-auto w-full max-w-sm shadow-lg">
                <CardHeader className="text-center"><CardTitle>Compartilhe sua experiência</CardTitle><p className="text-sm text-gray-500">Seu negócio · Exemplo ilustrativo</p></CardHeader>
                <CardContent className="space-y-3">
                  <Button className="h-12 w-full">Avaliar no Google <ExternalLink className="ml-2 h-4 w-4" /></Button>
                  <Button variant="outline" className="h-12 w-full"><MessageSquareText className="mr-2 h-4 w-4" />Enviar comentário direto</Button>
                  <p className="text-center text-xs text-gray-500">A opção pública nunca é filtrada.</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="advisor">
            <Card className="overflow-hidden shadow-lg">
              <CardHeader className="border-b bg-violet-50/50">
                <div className="flex items-center justify-between gap-3"><CardTitle className="flex items-center gap-2"><Bot className="h-5 w-5 text-primary" />Seu assessor de reputação</CardTitle><ExampleBadge /></div>
              </CardHeader>
              <CardContent className="grid gap-6 p-6 md:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">Merece sua atenção</p>
                  <div className="mt-3 rounded-xl border p-4">
                    <div className="flex items-center justify-between"><p className="font-medium">Cliente exemplo</p><div className="flex">{[1,2,3,4,5].map((item) => <Star key={item} className={`h-4 w-4 ${item <= 2 ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />)}</div></div>
                    <p className="mt-3 text-sm text-gray-700">“Demoraram para responder e precisei insistir para ter uma solução.”</p>
                    <div className="mt-3"><ExampleBadge /></div>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">Resposta sugerida</p>
                  <div className="mt-3 rounded-xl border border-violet-100 bg-violet-50/60 p-4">
                    <p className="text-sm leading-relaxed text-gray-700">Olá! Lamentamos pela demora no retorno. Seu relato é importante para entendermos onde falhamos e melhorar esse ponto.</p>
                    <div className="mt-4 flex gap-2 border-t border-violet-100 pt-3"><Button size="sm" variant="outline"><Copy className="mr-2 h-4 w-4" />Copiar</Button><Button size="sm" variant="ghost"><Pencil className="mr-2 h-4 w-4" />Editar</Button></div>
                  </div>
                  <p className="mt-3 text-xs text-gray-500">Você revisa e publica no Google. O AppReview não publica automaticamente.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="whatsapp">
            <Card className="border-green-200 bg-green-50/40 shadow-lg">
              <CardContent className="p-6 md:p-8">
                <div className="flex flex-wrap items-center gap-4"><div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-600 text-white"><MessageCircle /></div><div><div className="flex flex-wrap items-center gap-3"><h2 className="text-2xl font-bold">Resumo semanal AppReview</h2><span className="rounded-full border border-green-300 bg-white px-3 py-1 text-xs text-green-800">Recurso planejado</span></div><p className="mt-1 text-gray-600">Uma mensagem curta com a evolução observada e o que merece leitura.</p></div></div>
                <div className="mt-7 grid gap-4 border-t border-green-200 pt-6 sm:grid-cols-3"><div><p className="text-2xl font-bold">4,6</p><p className="text-sm text-gray-600">média observada</p></div><div><p className="text-2xl font-bold">+18</p><p className="text-sm text-gray-600">avaliações observadas</p></div><div><p className="text-2xl font-bold">1</p><p className="text-sm text-gray-600">avaliação para ler</p></div></div>
                <p className="mt-6 text-xs text-gray-500">Exemplo ilustrativo · Ainda não disponível. Depende de opt-in, provedor de WhatsApp e aprovação de eventual custo.</p>
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
