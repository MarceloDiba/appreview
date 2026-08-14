import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle, ExternalLink, MessageSquareText, QrCode, ShieldCheck, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/layout/Navbar';

const Index = () => (
  <div className="flex min-h-screen flex-col bg-gradient-to-b from-gray-50 to-white">
    <Navbar userRole="none" />

    <section className="px-4 pb-14 pt-24 sm:px-6 md:pb-20 md:pt-32">
      <div className="container mx-auto grid max-w-7xl items-center gap-12 md:grid-cols-2">
        <div className="max-w-xl">
          <h1 className="text-4xl font-bold leading-tight text-gray-900 md:text-5xl">
            Facilite o caminho até a sua próxima{' '}
            <span className="text-primary">avaliação no Google</span>
          </h1>
          <p className="mt-6 text-lg text-gray-600">
            Um QR pronto para imprimir leva o cliente direto à sua página. No painel, você vê
            acessos, cliques e a evolução real da nota e do total de avaliações no Google.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg"><Link to="/signup">Começar agora</Link></Button>
            <Button asChild variant="outline" size="lg"><Link to="/demo">Ver demonstração</Link></Button>
          </div>
          <div className="mt-7 flex items-start text-sm text-gray-500">
            <ShieldCheck className="mr-2 mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
            <span>A avaliação pública é oferecida a todos. Nenhuma nota é filtrada ou escondida.</span>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xl">
          <div className="flex items-start justify-between border-b border-gray-100 pb-5">
            <div>
              <p className="text-sm text-gray-500">Resultado no Google</p>
              <h2 className="mt-1 text-xl font-semibold">Seu negócio</h2>
            </div>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">Exemplo ilustrativo</span>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-amber-50 p-4">
              <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
              <p className="mt-3 text-2xl font-bold">4,6</p>
              <p className="text-xs text-gray-600">nota no Google</p>
            </div>
            <div className="rounded-xl bg-violet-50 p-4">
              <QrCode className="h-5 w-5 text-primary" />
              <p className="mt-3 text-2xl font-bold">128</p>
              <p className="text-xs text-gray-600">aberturas do QR</p>
            </div>
            <div className="rounded-xl bg-blue-50 p-4">
              <ExternalLink className="h-5 w-5 text-blue-600" />
              <p className="mt-3 text-2xl font-bold">74</p>
              <p className="text-xs text-gray-600">cliques ao Google</p>
            </div>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-gray-500">
            Cliques mostram intenção, não publicação. Nota e quantidade vêm dos dados reais do Google.
          </p>
        </div>
      </div>
    </section>

    <section className="bg-gray-50 px-4 py-16 sm:px-6">
      <div className="container mx-auto max-w-7xl">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-bold">Menos tarefa para o gestor</h2>
          <p className="mt-4 text-gray-600">O produto trabalha no caminho do cliente e resume o resultado.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {[
            [QrCode, '1. Imprima o QR', 'Crie o cartão uma vez e coloque no ponto de atendimento. O cliente usa a própria câmera, sem instalar app.'],
            [ExternalLink, '2. O cliente vai ao Google', 'O acesso público aparece direto, sem pergunta de humor e sem tratamento diferente por nota.'],
            [Star, '3. Acompanhe o resultado', 'Veja a nota e o total reais do Google, a evolução observada e quantas pessoas avançaram pelo QR.'],
          ].map(([Icon, title, body]) => {
            const FeatureIcon = Icon as typeof QrCode;
            return (
              <div key={title as string} className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10">
                  <FeatureIcon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mt-4 text-xl font-semibold">{title as string}</h3>
                <p className="mt-2 text-gray-600">{body as string}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>

    <section className="px-4 py-16 sm:px-6">
      <div className="container mx-auto grid max-w-7xl items-center gap-10 md:grid-cols-2">
        <div>
          <h2 className="text-3xl font-bold">Ajuda prática para cuidar da reputação</h2>
          <p className="mt-4 text-gray-600">
            Quando houver avaliações públicas, o gestor encontra tudo num só lugar e recebe uma
            sugestão de resposta. Ele revisa e responde no Google — o AppReview não publica por ele.
          </p>
          <ul className="mt-6 space-y-4 text-gray-700">
            <li className="flex gap-3"><CheckCircle className="mt-0.5 h-5 w-5 text-green-600" />Avaliações e nota atual do Google</li>
            <li className="flex gap-3"><CheckCircle className="mt-0.5 h-5 w-5 text-green-600" />Sugestões de resposta para revisar e copiar</li>
            <li className="flex gap-3"><CheckCircle className="mt-0.5 h-5 w-5 text-green-600" />Comentário privado opcional, sem desviar a avaliação pública</li>
          </ul>
        </div>
        <div className="rounded-2xl border bg-white p-6 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary/10 p-3"><MessageSquareText className="h-5 w-5 text-primary" /></div>
            <div><p className="font-semibold">Avaliação do Google</p><p className="text-sm text-gray-500">Exemplo ilustrativo</p></div>
          </div>
          <div className="mt-5 flex gap-1 text-amber-400">★★★★★</div>
          <p className="mt-3 text-gray-700">“Atendimento atencioso e experiência excelente.”</p>
          <div className="mt-5 rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
            Sugestão: Obrigado por compartilhar sua experiência. Ficamos felizes em receber você!
          </div>
        </div>
      </div>
    </section>

    <section className="bg-gray-50 px-4 py-16 sm:px-6">
      <div className="container mx-auto max-w-md overflow-hidden rounded-xl border-2 border-primary bg-white shadow-lg">
        <div className="bg-primary/5 p-6 text-center">
          <h2 className="text-2xl font-bold">Plano Pro</h2>
          <div className="mt-4"><span className="text-4xl font-bold">€49</span><span className="text-gray-600">/mês</span></div>
          <p className="mt-1 text-sm text-gray-500">Faturado mensalmente</p>
        </div>
        <div className="space-y-4 p-6">
          {['QR Codes ilimitados', 'Acesso direto ao Google e TripAdvisor', 'Painel com indicadores do QR e dados reais do Google', 'Avaliações públicas e sugestões de resposta', 'Suporte por e-mail'].map((item) => (
            <div key={item} className="flex items-start"><CheckCircle className="mr-3 mt-0.5 h-5 w-5 flex-shrink-0 text-green-500" /><span>{item}</span></div>
          ))}
          <Button asChild className="mt-2 w-full" size="lg"><Link to="/signup">Começar agora</Link></Button>
        </div>
      </div>
    </section>

    <section className="bg-primary/5 px-4 py-16 sm:px-6">
      <div className="container mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 md:flex-row">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-bold">Torne mais fácil avaliar o seu negócio</h2>
          <p className="mt-3 text-gray-600">Configure uma vez, coloque o QR no atendimento e acompanhe o que mudou no Google.</p>
        </div>
        <Button asChild size="lg"><Link to="/signup">Começar agora<ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
      </div>
    </section>

    <footer className="bg-gray-900 px-4 py-10 text-gray-300 sm:px-6">
      <div className="container mx-auto grid max-w-7xl gap-8 sm:grid-cols-3">
        <div><h3 className="text-lg font-bold text-white">AppReview</h3><p className="mt-3 text-sm text-gray-400">Gestão de reputação para negócios locais, com foco em resultados reais no Google.</p></div>
        <div><h3 className="text-lg font-bold text-white">Produto</h3><div className="mt-3 space-y-2 text-sm"><Link className="block hover:text-white" to="/demo">Demonstração</Link><Link className="block hover:text-white" to="/signup">Criar conta</Link><Link className="block hover:text-white" to="/login">Entrar</Link></div></div>
        <div><h3 className="text-lg font-bold text-white">Contacto</h3><div className="mt-3 space-y-2 text-sm"><a className="block hover:text-white" href="mailto:diba@noadigital.com.br">diba@noadigital.com.br</a><Link className="block hover:text-white" to="/termos">Termos de Serviço</Link><Link className="block hover:text-white" to="/privacidade">Política de Privacidade</Link></div></div>
      </div>
      <div className="container mx-auto mt-8 max-w-7xl border-t border-gray-800 pt-6 text-sm text-gray-500">&copy; {new Date().getFullYear()} AppReview · NOÁ Digital.</div>
    </footer>
  </div>
);

export default Index;
