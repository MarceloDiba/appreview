import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/layout/Navbar';
import { Smile, Frown, Meh, Star, ChevronRight, CheckCircle, ShieldCheck, QrCode, Bell } from 'lucide-react';

const Index = () => {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <Navbar userRole="none" />

      {/* Hero Section */}
      <section className="pt-20 md:pt-28 pb-12 md:pb-16 px-4 sm:px-6">
        <div className="container mx-auto max-w-7xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 md:gap-12">
            <div className="max-w-xl w-full">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 leading-tight">
                Saiba do problema enquanto o cliente ainda está{' '}
                <span className="text-primary">no seu negócio</span>
              </h1>
              <p className="mt-4 sm:mt-6 text-base sm:text-lg text-gray-600">
                Todo cliente que escaneia o QR code pode avaliar publicamente no Google e no
                TripAdvisor — sempre, qualquer que seja a nota. Quando a experiência foi ruim,
                você também recebe um alerta na hora, para resolver antes que o cliente vá embora.
              </p>
              <div className="mt-6 sm:mt-8 flex flex-wrap gap-3 sm:gap-4">
                <Button asChild size="lg" className="w-full sm:w-auto">
                  <Link to="/signup">
                    Começar agora
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
                  <Link to="/demo">
                    Ver demonstração
                  </Link>
                </Button>
              </div>
              <div className="mt-6 sm:mt-8 flex items-start text-xs sm:text-sm text-gray-500">
                <ShieldCheck className="h-4 w-4 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                <span>
                  Nenhuma avaliação é filtrada ou escondida — em conformidade com as políticas
                  do Google e com a Diretiva Ómnibus da União Europeia.
                </span>
              </div>
            </div>

            <div className="relative max-w-lg w-full mt-10 md:mt-0">
              <div className="bg-white rounded-lg shadow-xl p-5 sm:p-6 md:p-8 border border-gray-100">
                <h3 className="text-lg sm:text-xl font-semibold text-center mb-6 sm:mb-8">
                  Como foi a sua experiência no Seu Negócio?
                </h3>
                <div className="flex justify-between space-x-2 sm:space-x-4">
                  <div className="emoji-button bg-review-negative/10 flex flex-col items-center p-2 sm:p-3 rounded-lg">
                    <div className="emoji-icon text-review-negative">
                      <Frown className="h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14" />
                    </div>
                    <span className="emoji-label text-xs sm:text-sm mt-1">Ruim</span>
                  </div>

                  <div className="emoji-button bg-review-neutral/10 flex flex-col items-center p-2 sm:p-3 rounded-lg">
                    <div className="emoji-icon text-review-neutral">
                      <Meh className="h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14" />
                    </div>
                    <span className="emoji-label text-xs sm:text-sm mt-1">Regular</span>
                  </div>

                  <div className="emoji-button bg-review-positive/10 flex flex-col items-center p-2 sm:p-3 rounded-lg">
                    <div className="emoji-icon text-review-positive">
                      <Smile className="h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14" />
                    </div>
                    <span className="emoji-label text-xs sm:text-sm mt-1">Bom</span>
                  </div>
                </div>

                <div className="mt-6 sm:mt-8 text-center text-xs sm:text-sm text-gray-500">
                  Use um QR Code para acessar esta tela de avaliação
                </div>
              </div>

              <div className="absolute -bottom-4 -right-4 sm:-bottom-6 sm:-right-6 bg-primary/10 p-2 sm:p-3 rounded-lg transform rotate-3">
                <div className="flex items-center text-xs sm:text-sm font-medium text-primary">
                  <ShieldCheck className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  <span>Avaliação pública sempre disponível</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-12 md:py-16 px-4 sm:px-6 bg-gray-50">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold">Como funciona</h2>
            <p className="mt-3 sm:mt-4 text-gray-600 max-w-2xl mx-auto text-sm sm:text-base">
              Três passos, sem app para o cliente instalar e sem treinamento para a sua equipe.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
            <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-100">
              <div className="bg-primary/10 rounded-full w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center mb-3 sm:mb-4">
                <QrCode className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold mb-2">1. O cliente escaneia</h3>
              <p className="text-gray-600 text-sm sm:text-base">
                Um QR code na mesa, no balcão ou no recibo. O cliente abre pela câmera do próprio
                telefone — sem instalar nada e sem criar conta.
              </p>
            </div>

            <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-100">
              <div className="bg-primary/10 rounded-full w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center mb-3 sm:mb-4">
                <Star className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold mb-2">2. Avalia em um toque</h3>
              <p className="text-gray-600 text-sm sm:text-base">
                Ruim, Regular ou Bom. Nas três opções, o link para avaliar publicamente no Google
                e no TripAdvisor é oferecido — nada é filtrado.
              </p>
            </div>

            <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-100">
              <div className="bg-primary/10 rounded-full w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center mb-3 sm:mb-4">
                <Bell className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold mb-2">3. Você age na hora</h3>
              <p className="text-gray-600 text-sm sm:text-base">
                Uma nota baixa abre um caso no seu painel, com o relato do cliente. Você resolve
                enquanto ele ainda está ali e registra o que foi feito.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 md:py-16 px-4 sm:px-6">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold">O que está incluído</h2>
            <p className="mt-3 sm:mt-4 text-gray-600 max-w-2xl mx-auto text-sm sm:text-base">
              O necessário para captar avaliação no ponto de atendimento e não perder um cliente
              insatisfeito de vista.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
            <div className="space-y-6 md:space-y-8">
              <div className="flex items-start">
                <div className="mr-3 sm:mr-4 bg-primary/10 p-2 sm:p-3 rounded-lg">
                  <Smile className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-semibold mb-1 sm:mb-2">Avaliação em um toque</h3>
                  <p className="text-gray-600 text-sm sm:text-base">
                    Três opções: Ruim, Regular e Bom. Em todas elas o cliente recebe o link para
                    avaliar publicamente. Nenhuma avaliação é bloqueada, filtrada ou escondida.
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="mr-3 sm:mr-4 bg-primary/10 p-2 sm:p-3 rounded-lg">
                  <Bell className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-semibold mb-1 sm:mb-2">Casos para resolver</h3>
                  <p className="text-gray-600 text-sm sm:text-base">
                    Cada avaliação negativa vira um caso com o relato do cliente e o contato que
                    ele quis deixar. Você marca como resolvido e fica o registro de que agiu.
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="mr-3 sm:mr-4 bg-primary/10 p-2 sm:p-3 rounded-lg">
                  <Star className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-semibold mb-1 sm:mb-2">Google e TripAdvisor no mesmo lugar</h3>
                  <p className="text-gray-600 text-sm sm:text-base">
                    Configure os links das suas páginas públicas uma vez. O cliente escolhe onde
                    quer avaliar e você acompanha as avaliações pelo painel.
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="mr-3 sm:mr-4 bg-primary/10 p-2 sm:p-3 rounded-lg">
                  <QrCode className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-semibold mb-1 sm:mb-2">QR Codes ilimitados</h3>
                  <p className="text-gray-600 text-sm sm:text-base">
                    Crie um QR code por mesa, por balcão ou por unidade, e veja de onde veio cada
                    avaliação.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-xl p-4 sm:p-6 border border-gray-100 mt-8 md:mt-0">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6">
                <h3 className="text-lg sm:text-xl font-semibold">Casos para resolver</h3>
                <div className="text-gray-500 text-xs sm:text-sm mt-1 sm:mt-0">Exemplo ilustrativo</div>
              </div>

              <div className="space-y-3">
                <div className="border rounded-lg p-3 sm:p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-review-negative">
                      <Frown className="h-4 w-4 mr-2" />
                      <span className="text-sm font-medium">Ruim</span>
                    </div>
                    <span className="text-xs text-gray-500">há 4 minutos</span>
                  </div>
                  <p className="mt-2 text-sm text-gray-600">
                    &ldquo;Esperámos 40 minutos pelo prato principal e ninguém nos avisou.&rdquo;
                  </p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-gray-500">Mesa 12 · deixou contacto</span>
                    <span className="text-xs font-medium text-primary">Marcar como resolvido</span>
                  </div>
                </div>

                <div className="border rounded-lg p-3 sm:p-4 opacity-70">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-review-neutral">
                      <Meh className="h-4 w-4 mr-2" />
                      <span className="text-sm font-medium">Regular</span>
                    </div>
                    <span className="text-xs text-gray-500">ontem</span>
                  </div>
                  <p className="mt-2 text-sm text-gray-600">
                    &ldquo;A comida estava boa, mas a sala estava muito fria.&rdquo;
                  </p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-gray-500">Balcão</span>
                    <span className="text-xs font-medium text-green-600 flex items-center">
                      <CheckCircle className="h-3 w-3 mr-1" /> Resolvido
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 sm:mt-6">
                <Link to="/demo" className="text-primary font-medium flex items-center hover:underline text-sm sm:text-base">
                  Ver demonstração completa
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-12 md:py-16 px-4 sm:px-6 bg-gray-50">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold">Um plano, sem surpresa</h2>
            <p className="mt-3 sm:mt-4 text-gray-600 max-w-2xl mx-auto text-sm sm:text-base">
              Tudo incluído, sem contrato de fidelização.
            </p>
          </div>

          <div className="max-w-md mx-auto">
            <div className="bg-white rounded-lg shadow-lg overflow-hidden border-2 border-primary">
              <div className="p-4 sm:p-6 bg-primary/5">
                <h3 className="text-xl sm:text-2xl font-bold text-center">Plano Pro</h3>
                <div className="mt-3 sm:mt-4 text-center">
                  <span className="text-3xl sm:text-4xl font-bold">€49</span>
                  <span className="text-gray-600">/mês</span>
                </div>
                <div className="mt-1 text-center text-xs sm:text-sm text-gray-500">
                  Faturado mensalmente
                </div>
              </div>

              <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                <div className="flex items-start">
                  <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 mr-2 sm:mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-sm sm:text-base">QR Codes ilimitados</span>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 mr-2 sm:mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-sm sm:text-base">Links para Google Reviews e TripAdvisor</span>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 mr-2 sm:mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-sm sm:text-base">Casos para resolver, com registo da resolução</span>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 mr-2 sm:mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-sm sm:text-base">Painel com o histórico das avaliações</span>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 mr-2 sm:mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-sm sm:text-base">Suporte por e-mail</span>
                </div>
              </div>

              <div className="p-4 sm:p-6 pt-0">
                <Button asChild className="w-full" size="lg">
                  <Link to="/signup">
                    Começar agora
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 md:py-16 px-4 sm:px-6 bg-primary/5">
        <div className="container mx-auto max-w-7xl">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="max-w-xl">
              <h2 className="text-2xl sm:text-3xl font-bold">Pronto para não perder mais um cliente calado?</h2>
              <p className="mt-3 sm:mt-4 text-gray-600 text-sm sm:text-base">
                Coloque um QR code no seu balcão hoje e passe a saber da insatisfação enquanto
                ainda dá para resolver.
              </p>
            </div>

            <div className="mt-6 md:mt-0 space-y-3 sm:space-y-0 sm:space-x-3 flex flex-col sm:flex-row w-full sm:w-auto">
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link to="/signup">
                  Começar agora
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
                <Link to="/demo">
                  Ver demonstração
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-8 sm:py-12 px-4 sm:px-6">
        <div className="container mx-auto max-w-7xl">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
            <div>
              <h3 className="text-white font-bold text-lg mb-3 sm:mb-4">AppReview</h3>
              <p className="text-gray-400 text-xs sm:text-sm">
                Gestão de reputação para negócios locais. Descubra a insatisfação cedo, reaja
                rápido e registe que agiu.
              </p>
            </div>

            <div>
              <h3 className="text-white font-bold text-lg mb-3 sm:mb-4">Produto</h3>
              <ul className="space-y-1 sm:space-y-2 text-xs sm:text-sm">
                <li><Link to="/demo" className="hover:text-white transition-colors">Demonstração</Link></li>
                <li><Link to="/signup" className="hover:text-white transition-colors">Criar conta</Link></li>
                <li><Link to="/login" className="hover:text-white transition-colors">Entrar</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="text-white font-bold text-lg mb-3 sm:mb-4">Contacto</h3>
              <ul className="space-y-1 sm:space-y-2 text-xs sm:text-sm">
                <li>
                  <a href="mailto:diba@noadigital.com.br" className="hover:text-white transition-colors">
                    diba@noadigital.com.br
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 sm:mt-12 pt-6 sm:pt-8">
            <div className="text-xs sm:text-sm text-gray-500">
              &copy; {new Date().getFullYear()} AppReview · NOÁ Digital. Todos os direitos reservados.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
