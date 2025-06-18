
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
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
  const location = useLocation();
  
  // Function to check if a path is active
  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

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
                  <Link to="/admin" className={`px-3 py-2 rounded-md text-sm font-medium ${isActive('/admin') ? 'text-primary bg-primary/5' : 'text-gray-600 hover:text-primary'}`}>
                    Dashboard
                  </Link>
                  <Link to="/admin/users" className={`px-3 py-2 rounded-md text-sm font-medium ${isActive('/admin/users') ? 'text-primary bg-primary/5' : 'text-gray-600 hover:text-primary'}`}>
                    Usuários
                  </Link>
                  <Link to="/admin/plans" className={`px-3 py-2 rounded-md text-sm font-medium ${isActive('/admin/plans') ? 'text-primary bg-primary/5' : 'text-gray-600 hover:text-primary'}`}>
                    Planos
                  </Link>
                  <Link to="/admin/analytics" className={`px-3 py-2 rounded-md text-sm font-medium ${isActive('/admin/analytics') ? 'text-primary bg-primary/5' : 'text-gray-600 hover:text-primary'}`}>
                    Estatísticas
                  </Link>
                </>
              )}
              
              {userRole === 'business' && (
                <>
                  <Link to="/dashboard" className={`px-3 py-2 rounded-md text-sm font-medium ${isActive('/dashboard') ? 'text-primary bg-primary/5' : 'text-gray-600 hover:text-primary'}`}>
                    Dashboard
                  </Link>
                  <Link to="/reviews" className={`px-3 py-2 rounded-md text-sm font-medium ${isActive('/reviews') ? 'text-primary bg-primary/5' : 'text-gray-600 hover:text-primary'}`}>
                    Avaliações
                  </Link>
                  <Link to="/qrcodes" className={`px-3 py-2 rounded-md text-sm font-medium ${isActive('/qrcodes') ? 'text-primary bg-primary/5' : 'text-gray-600 hover:text-primary'}`}>
                    QR Codes
                  </Link>
                  <Link to="/settings" className={`px-3 py-2 rounded-md text-sm font-medium ${isActive('/settings') ? 'text-primary bg-primary/5' : 'text-gray-600 hover:text-primary'}`}>
                    Configurações
                  </Link>
                </>
              )}
              
              {userRole === 'none' && (
                <>
                  <Link to="/demo" className={`px-3 py-2 rounded-md text-sm font-medium ${isActive('/demo') ? 'text-primary bg-primary/5' : 'text-gray-600 hover:text-primary'}`}>
                    Demo
                  </Link>
                  <Link to="/#features" className="text-gray-600 hover:text-primary px-3 py-2 rounded-md text-sm font-medium">
                    Recursos
                  </Link>
                  <Link to="/#pricing" className="text-gray-600 hover:text-primary px-3 py-2 rounded-md text-sm font-medium">
                    Preços
                  </Link>
                </>
              )}
            </div>
          </div>
          
          <div className="flex items-center">
            {userRole !== 'none' ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-40 rounded-full">
                    <div className="flex h-full w-full items-center justify-center rounded-full bg-primary text-white">
                      {userRole === 'admin' ? 'Admin' : 'perfil'}
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
                  className={`block px-3 py-2 rounded-md text-base font-medium ${isActive('/admin') ? 'text-primary bg-primary/5' : 'text-gray-600 hover:text-primary'}`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <Link 
                  to="/admin/users" 
                  className={`block px-3 py-2 rounded-md text-base font-medium ${isActive('/admin/users') ? 'text-primary bg-primary/5' : 'text-gray-600 hover:text-primary'}`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Usuários
                </Link>
                <Link 
                  to="/admin/plans" 
                  className={`block px-3 py-2 rounded-md text-base font-medium ${isActive('/admin/plans') ? 'text-primary bg-primary/5' : 'text-gray-600 hover:text-primary'}`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Planos
                </Link>
                <Link 
                  to="/admin/analytics" 
                  className={`block px-3 py-2 rounded-md text-base font-medium ${isActive('/admin/analytics') ? 'text-primary bg-primary/5' : 'text-gray-600 hover:text-primary'}`}
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
                  className={`block px-3 py-2 rounded-md text-base font-medium ${isActive('/dashboard') ? 'text-primary bg-primary/5' : 'text-gray-600 hover:text-primary'}`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <Link 
                  to="/reviews" 
                  className={`block px-3 py-2 rounded-md text-base font-medium ${isActive('/reviews') ? 'text-primary bg-primary/5' : 'text-gray-600 hover:text-primary'}`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Avaliações
                </Link>
                <Link 
                  to="/qrcodes" 
                  className={`block px-3 py-2 rounded-md text-base font-medium ${isActive('/qrcodes') ? 'text-primary bg-primary/5' : 'text-gray-600 hover:text-primary'}`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  QR Codes
                </Link>
                <Link 
                  to="/settings" 
                  className={`block px-3 py-2 rounded-md text-base font-medium ${isActive('/settings') ? 'text-primary bg-primary/5' : 'text-gray-600 hover:text-primary'}`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Configurações
                </Link>
                <Link 
                  to="/profile" 
                  className={`block px-3 py-2 rounded-md text-base font-medium ${isActive('/profile') ? 'text-primary bg-primary/5' : 'text-gray-600 hover:text-primary'}`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Minha Conta
                </Link>
              </>
            )}
            
            {userRole === 'none' && (
              <>
                <Link 
                  to="/demo" 
                  className={`block px-3 py-2 rounded-md text-base font-medium ${isActive('/demo') ? 'text-primary bg-primary/5' : 'text-gray-600 hover:text-primary'}`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Demo
                </Link>
                <Link 
                  to="/#features" 
                  className="text-gray-600 hover:text-primary block px-3 py-2 rounded-md text-base font-medium"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Recursos
                </Link>
                <Link 
                  to="/#pricing" 
                  className="text-gray-600 hover:text-primary block px-3 py-2 rounded-md text-base font-medium"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Preços
                </Link>
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
