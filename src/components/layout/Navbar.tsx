
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface NavbarProps {
  userRole?: 'admin' | 'business' | 'none';
  businessName?: string;
}

const Navbar = ({ userRole = 'none', businessName }: NavbarProps) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <nav className="bg-white border-b border-gray-200 fixed w-full z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0">
              <span className="text-primary font-bold text-xl">AppReview</span>
            </Link>
            
            {userRole === 'business' && businessName && (
              <div className="hidden md:block ml-4 pl-4 border-l border-gray-300">
                <span className="text-gray-600">{businessName}</span>
              </div>
            )}
          </div>
          
          {/* Desktop navigation */}
          <div className="hidden md:block">
            <div className="flex items-center space-x-4">
              {userRole === 'admin' && (
                <>
                  <Link to="/admin" className="text-gray-600 hover:text-primary px-3 py-2 rounded-md text-sm font-medium">
                    Dashboard
                  </Link>
                  <Link to="/admin/users" className="text-gray-600 hover:text-primary px-3 py-2 rounded-md text-sm font-medium">
                    Usuários
                  </Link>
                  <Link to="/admin/plans" className="text-gray-600 hover:text-primary px-3 py-2 rounded-md text-sm font-medium">
                    Planos
                  </Link>
                  <Link to="/admin/analytics" className="text-gray-600 hover:text-primary px-3 py-2 rounded-md text-sm font-medium">
                    Estatísticas
                  </Link>
                </>
              )}
              
              {userRole === 'business' && (
                <>
                  <Link to="/dashboard" className="text-gray-600 hover:text-primary px-3 py-2 rounded-md text-sm font-medium">
                    Dashboard
                  </Link>
                  <Link to="/reviews" className="text-gray-600 hover:text-primary px-3 py-2 rounded-md text-sm font-medium">
                    Avaliações
                  </Link>
                  <Link to="/qrcodes" className="text-gray-600 hover:text-primary px-3 py-2 rounded-md text-sm font-medium">
                    QR Codes
                  </Link>
                  <Link to="/settings" className="text-gray-600 hover:text-primary px-3 py-2 rounded-md text-sm font-medium">
                    Configurações
                  </Link>
                </>
              )}
            </div>
          </div>
          
          <div className="flex items-center">
            {userRole !== 'none' ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <div className="flex h-full w-full items-center justify-center rounded-full bg-primary text-white">
                      {userRole === 'admin' ? 'A' : 'U'}
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link to="/profile">Minha Conta</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/settings">Configurações</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/">Sair</Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex space-x-2">
                <Button variant="outline" asChild>
                  <Link to="/login">Entrar</Link>
                </Button>
                <Button asChild>
                  <Link to="/signup">Começar</Link>
                </Button>
              </div>
            )}
            
            {/* Mobile menu button */}
            <div className="md:hidden ml-4">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="text-gray-600"
              >
                <span className="sr-only">Open menu</span>
                {isMobileMenuOpen ? (
                  <span className="text-xl">✕</span>
                ) : (
                  <span className="text-xl">☰</span>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white shadow-lg">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {userRole === 'admin' && (
              <>
                <Link 
                  to="/admin" 
                  className="text-gray-600 hover:text-primary block px-3 py-2 rounded-md text-base font-medium"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <Link 
                  to="/admin/users" 
                  className="text-gray-600 hover:text-primary block px-3 py-2 rounded-md text-base font-medium"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Usuários
                </Link>
                <Link 
                  to="/admin/plans" 
                  className="text-gray-600 hover:text-primary block px-3 py-2 rounded-md text-base font-medium"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Planos
                </Link>
                <Link 
                  to="/admin/analytics" 
                  className="text-gray-600 hover:text-primary block px-3 py-2 rounded-md text-base font-medium"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Estatísticas
                </Link>
              </>
            )}
            
            {userRole === 'business' && (
              <>
                <Link 
                  to="/dashboard" 
                  className="text-gray-600 hover:text-primary block px-3 py-2 rounded-md text-base font-medium"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <Link 
                  to="/reviews" 
                  className="text-gray-600 hover:text-primary block px-3 py-2 rounded-md text-base font-medium"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Avaliações
                </Link>
                <Link 
                  to="/qrcodes" 
                  className="text-gray-600 hover:text-primary block px-3 py-2 rounded-md text-base font-medium"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  QR Codes
                </Link>
                <Link 
                  to="/settings" 
                  className="text-gray-600 hover:text-primary block px-3 py-2 rounded-md text-base font-medium"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Configurações
                </Link>
              </>
            )}
            
            {userRole === 'none' && (
              <>
                <Link 
                  to="/login" 
                  className="text-gray-600 hover:text-primary block px-3 py-2 rounded-md text-base font-medium"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Entrar
                </Link>
                <Link 
                  to="/signup" 
                  className="text-gray-600 hover:text-primary block px-3 py-2 rounded-md text-base font-medium"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Cadastre-se
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
