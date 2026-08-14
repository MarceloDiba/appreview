import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ExternalLink, MessageCircle, MessageSquareText, QrCode } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import GoogleOutcomeCard, { GooglePathCard } from '@/components/dashboard/GoogleOutcomeCard';
import ReputationAdvisorCard from '@/components/dashboard/ReputationAdvisorCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GoogleOutcomeData } from '@/hooks/useGoogleOutcome';
import { AdvisorReview } from '@/hooks/useReputationAdvisor';

const ExampleBadge = () => <span className="rounded-full bg-violet-50 px-3 py-1 text-xs text-primary">Exemplo ilustrativo</span>;

const previewOutcome: GoogleOutcomeData = {
  placeName: 'Seu negócio',
  averageRating: 4.6,
  totalReviews: 128,
  lastUpdatedAt: '2026-08-14T09:00:00-03:00',
  qrOpens: 180,
  googleClicks: 134,
  privateFeedback: 8,
  clickThroughRate: 74,
  reviewGrowth: 18,
  ratingChange: 0.2,
  history: [
    { capturedAt: '2026-07-15T09:00:00-03:00', averageRating: 3.6, totalReviews: 110 },
    { capturedAt: '2026-07-19T09:00:00-03:00', averageRating: 3.9, totalReviews: 113 },
    { capturedAt: '2026-07-23T09:00:00-03:00', averageRating: 4.1, totalReviews: 116 },
    { capturedAt: '2026-07-27T09:00:00-03:00', averageRating: 4.0, totalReviews: 118 },
    { capturedAt: '2026-07-31T09:00:00-03:00', averageRating: 4.3, totalReviews: 121 },
    { capturedAt: '2026-08-04T09:00:00-03:00', averageRating: 4.4, totalReviews: 123 },
    { capturedAt: '2026-08-08T09:00:00-03:00', averageRating: 4.5, totalReviews: 125 },
    { capturedAt: '2026-08-12T09:00:00-03:00', averageRating: 4.6, totalReviews: 128 },
  ],
};

const previewReview: AdvisorReview = {
  authorName: 'Mariana Souza',
  rating: 2,
  text: 'O atendimento foi demorado e não resolveram meu problema como eu esperava.',
  time: '2026-08-12T14:30:00-03:00',
  googleMapsUri: 'https://www.google.com/maps',
  suggestedReply: 'Olá, Mariana! Lamentamos pela demora e por não termos atendido às suas expectativas. Seu relato é muito importante para entendermos onde falhamos e melhorarmos. Podemos conversar?',
};

const AdvisorPanelPreview = ({ embedded = false }: { embedded?: boolean }) => (
  <div className={embedded ? 'rounded-2xl bg-[#f7f6f2] p-3 sm:p-5' : ''}>
    <GoogleOutcomeCard data={previewOutcome} illustrative />
    <div className="mt-4"><ReputationAdvisorCard previewReview={previewReview} illustrative /></div>
    <div className="mt-4"><GooglePathCard data={previewOutcome} illustrative /></div>
    <div className="mt-4 flex flex-col gap-3 rounded-xl border border-dashed border-stone-300 bg-white/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3"><MessageCircle className="h-6 w-6 text-stone-500" /><div><p className="font-semibold text-stone-900">Planejado: receber prioridades e resumo no WhatsApp</p><p className="text-sm text-stone-500">Depende de consentimento, provedor e aprovação de eventual custo.</p></div></div>
      <span className="w-fit rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-600">Recurso planejado</span>
    </div>
  </div>
);

const Demo = () => {
  const [searchParams] = useSearchParams();
  const panelOnly = searchParams.get('view') === 'panel';

  if (panelOnly) {
    return (
      <div className="flex min-h-screen flex-col bg-[#f7f6f2]">
        <Navbar userRole="business" businessName="Seu negócio · Exemplo ilustrativo" />
        <main className="flex-1 px-4 pb-12 pt-24">
          <div className="container mx-auto max-w-7xl"><AdvisorPanelPreview /></div>
        </main>
      </div>
    );
  }

  return (
  <div className="flex min-h-screen flex-col bg-gray-50">
    <Navbar userRole="none" />
    <main className="flex-1 px-4 pb-12 pt-24">
      <div className="container mx-auto max-w-7xl">
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
            <AdvisorPanelPreview embedded />
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
};

export default Demo;
