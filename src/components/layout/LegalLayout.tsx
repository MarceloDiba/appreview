import React from 'react';
import { Link } from 'react-router-dom';
import { isPendente } from '@/lib/legal';

interface LegalLayoutProps {
  title: string;
  updatedAt: string;
  children: React.ReactNode;
}

/**
 * Um dado que ainda não foi confirmado aparece assim, à vista. É deliberado:
 * mais vale o cliente ver "a confirmar" do que ler uma identidade jurídica
 * inventada. Ver `src/lib/legal.ts`.
 */
export const Dado: React.FC<{ valor: string }> = ({ valor }) => {
  if (!isPendente(valor)) return <>{valor}</>;
  return (
    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-800">
      [a confirmar]
    </span>
  );
};

const LegalLayout: React.FC<LegalLayoutProps> = ({ title, updatedAt, children }) => (
  <div className="min-h-screen bg-white">
    <header className="border-b border-gray-200">
      <div className="container mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
        <Link to="/" className="font-bold text-gray-900">
          Binno
        </Link>
        <Link to="/" className="text-sm text-gray-500 hover:text-gray-900">
          Voltar ao início
        </Link>
      </div>
    </header>

    <main className="container mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
      <p className="mt-2 text-sm text-gray-500">Em vigor desde {updatedAt}.</p>

      <div className="mt-8 space-y-8 text-[15px] leading-relaxed text-gray-700">
        {children}
      </div>

      <div className="mt-12 border-t border-gray-200 pt-6 text-sm text-gray-500">
        <Link to="/termos" className="hover:text-gray-900">
          Termos de Serviço
        </Link>
        <span className="mx-2">·</span>
        <Link to="/privacidade" className="hover:text-gray-900">
          Política de Privacidade
        </Link>
      </div>
    </main>
  </div>
);

export const Seccao: React.FC<{ titulo: string; children: React.ReactNode }> = ({
  titulo,
  children,
}) => (
  <section className="space-y-3">
    <h2 className="text-lg font-semibold text-gray-900">{titulo}</h2>
    {children}
  </section>
);

export default LegalLayout;
