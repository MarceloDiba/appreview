
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/layout/Navbar';

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <section className="pt-24 px-4 md:pt-32 bg-gradient-to-b from-white to-purple-50">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="space-y-6">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight">
                Proteja e Melhore a<br />
                <span className="text-primary">Reputação Online</span><br />
                do seu Negócio
              </h1>
              <p className="text-lg text-gray-600">
                Transforme a experiência dos seus clientes, gerencie avaliações negativas e impulsione a reputação da sua empresa com nossa plataforma inteligente.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" asChild>
                  <Link to="/signup">Começar Agora</Link>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <Link to="/demo">Ver Demo</Link>
                </Button>
              </div>
            </div>
            <div className="relative hidden md:block">
              <div className="relative z-10">
                <img
                  src="https://via.placeholder.com/550x400?text=Dashboard+Preview"
                  alt="Dashboard"
                  className="rounded-lg shadow-xl"
                />
              </div>
              <div className="absolute -bottom-6 -right-6 w-72 h-72 bg-primary/10 rounded-full z-0"></div>
            </div>
          </div>
        </div>
      </section>
      
      <section className="py-20 px-4 bg-white">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Como Funciona</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Nossa plataforma ajuda a gerenciar e melhorar a reputação do seu negócio em três passos simples:
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gray-50 p-6 rounded-lg">
              <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mb-4">
                <span className="text-primary font-bold text-xl">1</span>
              </div>
              <h3 className="font-bold text-xl mb-3">Coleta de Avaliações</h3>
              <p className="text-gray-600">
                Capture o feedback dos clientes através de QR Codes personalizados e evite avaliações negativas públicas.
              </p>
            </div>
            
            <div className="bg-gray-50 p-6 rounded-lg">
              <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mb-4">
                <span className="text-primary font-bold text-xl">2</span>
              </div>
              <h3 className="font-bold text-xl mb-3">Gestão Inteligente</h3>
              <p className="text-gray-600">
                Acompanhe e analise todas as suas avaliações em um único dashboard, incluindo Google e TripAdvisor.
              </p>
            </div>
            
            <div className="bg-gray-50 p-6 rounded-lg">
              <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mb-4">
                <span className="text-primary font-bold text-xl">3</span>
              </div>
              <h3 className="font-bold text-xl mb-3">Melhoria Contínua</h3>
              <p className="text-gray-600">
                Utilize insights para melhorar seus serviços e transformar clientes insatisfeitos em defensores da sua marca.
              </p>
            </div>
          </div>
        </div>
      </section>
      
      <section className="py-20 px-4 bg-gray-50">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Por Que Escolher o AppReview?</h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-12">
            <div className="bg-white p-8 rounded-lg shadow-md">
              <h3 className="font-bold text-xl mb-3 text-red-600">Negócio com Má Reputação</h3>
              <div className="space-y-4">
                <div className="flex items-center">
                  <span className="text-red-500 mr-2">✕</span>
                  <p>Perda de 40% em vendas potenciais</p>
                </div>
                <div className="flex items-center">
                  <span className="text-red-500 mr-2">✕</span>
                  <p>68% dos clientes desistem após ler avaliações negativas</p>
                </div>
                <div className="flex items-center">
                  <span className="text-red-500 mr-2">✕</span>
                  <p>Dificuldade em atrair novos clientes</p>
                </div>
                <div className="flex items-center">
                  <span className="text-red-500 mr-2">✕</span>
                  <p>Necessidade de maiores investimentos em marketing</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-8 rounded-lg shadow-md">
              <h3 className="font-bold text-xl mb-3 text-green-600">Negócio com Excelente Reputação</h3>
              <div className="space-y-4">
                <div className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  <p>Aumento de 31% na taxa de conversão</p>
                </div>
                <div className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  <p>73% dos clientes confiam em negócios com boas avaliações</p>
                </div>
                <div className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  <p>Crescimento orgânico através de recomendações</p>
                </div>
                <div className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  <p>Filas de espera e maior fidelidade dos clientes</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      <section className="py-20 px-4 bg-primary text-white">
        <div className="container mx-auto max-w-6xl text-center">
          <h2 className="text-3xl font-bold mb-6">Comece Hoje por Apenas €24,90/mês</h2>
          <p className="text-lg mb-8 max-w-2xl mx-auto">
            Investimento mínimo para proteger a reputação do seu negócio e aumentar suas vendas.
          </p>
          <Button size="lg" variant="secondary" className="text-primary" asChild>
            <Link to="/signup">Começar Agora</Link>
          </Button>
        </div>
      </section>
      
      <footer className="bg-gray-900 text-white py-10 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <h3 className="text-xl font-bold mb-4">AppReview</h3>
              <p className="text-gray-400">
                A solução completa para gerenciar a reputação online do seu negócio e transformar experiências negativas em oportunidades de melhoria.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-4">Links Rápidos</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link to="/" className="hover:text-white">Home</Link></li>
                <li><Link to="/features" className="hover:text-white">Recursos</Link></li>
                <li><Link to="/pricing" className="hover:text-white">Preços</Link></li>
                <li><Link to="/contact" className="hover:text-white">Contato</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Legal</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link to="/terms" className="hover:text-white">Termos de Uso</Link></li>
                <li><Link to="/privacy" className="hover:text-white">Política de Privacidade</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-6 text-center text-gray-500 text-sm">
            © {new Date().getFullYear()} AppReview. Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
