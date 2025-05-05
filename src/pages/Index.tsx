
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/layout/Navbar';
import { Smile, Frown, Meh, ArrowRight, Star, ChevronRight, CheckCircle } from 'lucide-react';

const Index = () => {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <Navbar userRole="none" />
      
      {/* Hero Section */}
      <section className="pt-28 pb-16 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-12">
            <div className="max-w-xl">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight">
                Transforme avaliações em{' '}
                <span className="text-primary">crescimento</span>{' '}
                para seu negócio
              </h1>
              <p className="mt-6 text-lg text-gray-600">
                AppReview ajuda a capturar feedback positivo e negativo de forma inteligente, 
                melhorando sua reputação online e aumentando a visibilidade no Google e TripAdvisor.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Button asChild size="lg">
                  <Link to="/signup">
                    Começar agora
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link to="/demo">
                    Ver demonstração
                  </Link>
                </Button>
              </div>
              <div className="mt-8 flex items-center text-sm text-gray-500">
                <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                <span>14 dias de teste gratuito, sem necessidade de cartão de crédito</span>
              </div>
            </div>
            
            <div className="relative max-w-lg w-full">
              <div className="bg-white rounded-lg shadow-xl p-6 md:p-8 border border-gray-100">
                <h3 className="text-xl font-semibold text-center mb-8">
                  Como foi sua experiência no Restaurante Exemplo?
                </h3>
                <div className="flex justify-between">
                  <div className="emoji-button bg-review-negative/10">
                    <div className="emoji-icon text-review-negative">
                      <Frown className="h-12 w-12 md:h-14 md:w-14" />
                    </div>
                    <span className="emoji-label">Ruim</span>
                  </div>
                  
                  <div className="emoji-button bg-review-neutral/10">
                    <div className="emoji-icon text-review-neutral">
                      <Meh className="h-12 w-12 md:h-14 md:w-14" />
                    </div>
                    <span className="emoji-label">Regular</span>
                  </div>
                  
                  <div className="emoji-button bg-review-positive/10">
                    <div className="emoji-icon text-review-positive">
                      <Smile className="h-12 w-12 md:h-14 md:w-14" />
                    </div>
                    <span className="emoji-label">Bom</span>
                  </div>
                </div>
                
                <div className="mt-8 text-center text-sm text-gray-500">
                  Use um QR Code para acessar esta tela de avaliação
                </div>
              </div>
              
              <div className="absolute -bottom-6 -right-6 bg-primary/10 p-3 rounded-lg transform rotate-3">
                <div className="flex items-center text-sm font-medium text-primary">
                  <ArrowRight className="h-4 w-4 mr-1" />
                  <span>Redirecionamento inteligente</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Metrics Section */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold">Por que escolher o AppReview?</h2>
            <p className="mt-4 text-gray-600 max-w-2xl mx-auto">
              Nossa plataforma ajuda negócios locais a aumentar avaliações positivas e gerenciar sua reputação online de forma eficiente.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <div className="bg-primary/10 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                <span className="text-2xl font-bold text-primary">85%</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Aumento de avaliações positivas</h3>
              <p className="text-gray-600">
                Nossos clientes registram um aumento médio de 85% nas avaliações positivas em plataformas como Google e TripAdvisor.
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <div className="bg-primary/10 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                <span className="text-2xl font-bold text-primary">70%</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Redução de avaliações negativas públicas</h3>
              <p className="text-gray-600">
                Redução de até 70% nas avaliações negativas públicas, através do nosso sistema de captura interna de feedback.
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <div className="bg-primary/10 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                <span className="text-2xl font-bold text-primary">4.8</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Aumento na média de estrelas</h3>
              <p className="text-gray-600">
                Nossos clientes atingem uma média de 4.8 estrelas em plataformas de avaliação, impulsionando sua visibilidade.
              </p>
            </div>
          </div>
        </div>
      </section>
      
      {/* Features Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold">Funcionalidades principais</h2>
            <p className="mt-4 text-gray-600 max-w-2xl mx-auto">
              Nossa plataforma completa oferece tudo que você precisa para gerenciar e melhorar sua reputação online.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="flex items-start">
                <div className="mr-4 bg-primary/10 p-3 rounded-lg">
                  <Smile className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Avaliação Smiley Intuitiva</h3>
                  <p className="text-gray-600">
                    Interface simples com 3 emoções que direciona clientes satisfeitos para plataformas externas e captura feedback negativo internamente.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="mr-4 bg-primary/10 p-3 rounded-lg">
                  <Star className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Integração com Google e TripAdvisor</h3>
                  <p className="text-gray-600">
                    Conecte-se às principais plataformas de avaliação para monitorar e gerenciar sua reputação em um único lugar.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="mr-4 bg-primary/10 p-3 rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                    <path d="M3 7h3a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1Z" />
                    <path d="M19 7h-3a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1Z" />
                    <path d="M8 7h7" />
                    <path d="M11 17V7" />
                    <path d="M8 17h5a1 1 0 0 0 1-1v-1a1 1 0 0 0-1-1H8" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Gerador de QR Code</h3>
                  <p className="text-gray-600">
                    Crie QR Codes personalizados para diferentes pontos do seu negócio para capturar avaliações de forma eficiente.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-xl p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold">Dashboard de Métricas</h3>
                <div className="text-gray-600 text-sm">Atualizado em tempo real</div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1 text-sm">
                    <span>Avaliações Positivas</span>
                    <span className="font-medium">78%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: '78%' }}></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between mb-1 text-sm">
                    <span>Avaliações Neutras</span>
                    <span className="font-medium">15%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '15%' }}></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between mb-1 text-sm">
                    <span>Avaliações Negativas</span>
                    <span className="font-medium">7%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="bg-red-500 h-2 rounded-full" style={{ width: '7%' }}></div>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="border rounded p-3">
                  <div className="text-sm text-gray-500">Google Reviews</div>
                  <div className="mt-1 flex items-center">
                    <span className="text-lg font-bold">4.7</span>
                    <div className="ml-2 flex text-yellow-400">
                      <Star className="h-4 w-4 fill-current" />
                      <Star className="h-4 w-4 fill-current" />
                      <Star className="h-4 w-4 fill-current" />
                      <Star className="h-4 w-4 fill-current" />
                      <Star className="h-4 w-4 fill-current text-yellow-100" />
                    </div>
                  </div>
                </div>
                
                <div className="border rounded p-3">
                  <div className="text-sm text-gray-500">TripAdvisor</div>
                  <div className="mt-1 flex items-center">
                    <span className="text-lg font-bold">4.5</span>
                    <div className="ml-2 flex text-yellow-400">
                      <Star className="h-4 w-4 fill-current" />
                      <Star className="h-4 w-4 fill-current" />
                      <Star className="h-4 w-4 fill-current" />
                      <Star className="h-4 w-4 fill-current" />
                      <Star className="h-4 w-4 fill-current text-yellow-100" />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-6">
                <Link to="/demo" className="text-primary font-medium flex items-center hover:underline">
                  Ver demonstração completa
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Pricing Section */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold">Planos simples e transparentes</h2>
            <p className="mt-4 text-gray-600 max-w-2xl mx-auto">
              Um único plano com tudo que você precisa para transformar seu negócio.
            </p>
          </div>
          
          <div className="max-w-md mx-auto">
            <div className="bg-white rounded-lg shadow-lg overflow-hidden border-2 border-primary">
              <div className="p-6 bg-primary/5">
                <h3 className="text-2xl font-bold text-center">Plano Pro</h3>
                <div className="mt-4 text-center">
                  <span className="text-4xl font-bold">€24.90</span>
                  <span className="text-gray-600">/mês</span>
                </div>
                <div className="mt-1 text-center text-sm text-gray-500">
                  Faturado mensalmente
                </div>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                  <span>Avaliação Smiley com QR Codes ilimitados</span>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                  <span>Integração com Google Reviews e TripAdvisor</span>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                  <span>Dashboard completo com métricas e análises</span>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                  <span>Captura interna de feedback negativo</span>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                  <span>Links personalizados para redes sociais</span>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                  <span>Suporte prioritário via e-mail e chat</span>
                </div>
              </div>
              
              <div className="p-6 pt-0">
                <Button asChild className="w-full" size="lg">
                  <Link to="/signup">
                    Começar teste gratuito
                  </Link>
                </Button>
                <div className="mt-3 text-center text-sm text-gray-500">
                  14 dias grátis, sem compromisso
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-16 px-4 bg-primary/5">
        <div className="container mx-auto max-w-7xl">
          <div className="md:flex items-center justify-between">
            <div className="max-w-xl">
              <h2 className="text-3xl font-bold">Pronto para transformar sua reputação online?</h2>
              <p className="mt-4 text-gray-600">
                Junte-se a milhares de negócios que estão aumentando suas avaliações positivas e
                gerenciando sua reputação de forma eficiente com o AppReview.
              </p>
            </div>
            
            <div className="mt-8 md:mt-0 space-y-4 md:space-y-0 md:space-x-4 flex flex-col md:flex-row">
              <Button asChild size="lg">
                <Link to="/signup">
                  Começar agora
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/demo">
                  Ver demonstração
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-white font-bold text-lg mb-4">AppReview</h3>
              <p className="text-gray-400 text-sm">
                Plataforma de gestão de reputação para negócios locais.
                Transforme avaliações em crescimento.
              </p>
            </div>
            
            <div>
              <h3 className="text-white font-bold text-lg mb-4">Produto</h3>
              <ul className="space-y-2 text-sm">
                <li><Link to="/demo" className="hover:text-white transition-colors">Demonstração</Link></li>
                <li><Link to="/signup" className="hover:text-white transition-colors">Planos</Link></li>
                <li><a href="#" className="hover:text-white transition-colors">Recursos</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Integrações</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-white font-bold text-lg mb-4">Empresa</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Sobre Nós</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contato</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Carreiras</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-white font-bold text-lg mb-4">Legal</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Termos de Serviço</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Política de Privacidade</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Cookies</a></li>
                <li><a href="#" className="hover:text-white transition-colors">GDPR</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
            <div className="text-sm text-gray-500">
              &copy; 2025 AppReview. Todos os direitos reservados.
            </div>
            <div className="mt-4 md:mt-0 flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" />
                </svg>
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z" />
                </svg>
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M4.98 3.5c0 1.381-1.11 2.5-2.48 2.5s-2.48-1.119-2.48-2.5c0-1.38 1.11-2.5 2.48-2.5s2.48 1.12 2.48 2.5zm.02 4.5h-5v16h5v-16zm7.982 0h-4.968v16h4.969v-8.399c0-4.67 6.029-5.052 6.029 0v8.399h4.988v-10.131c0-7.88-8.922-7.593-11.018-3.714v-2.155z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
