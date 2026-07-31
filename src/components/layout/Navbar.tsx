import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/context/AuthContext';
import { useOwnerTranslation } from '@/i18n/owner/useOwnerTranslation';
import LanguageSwitcher from '@/components/layout/LanguageSwitcher';

interface NavbarProps {
  userRole?: 'admin' | 'business' | 'none';
  businessName?: string;
}

/**
 * O painel do dono (userRole === 'business') e os itens partilhados — conta,
 * definições, sair, entrar/começar — passam pelo react-i18next. As telas de
 * admin (interno) e os links de marketing da landing ficam em português, que é
 * a língua dessas páginas.
 */
const Navbar = ({ userRole = 'none', businessName }: NavbarProps) => {
  const { t } = useOwnerTranslation();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  const handleLogout = async () => {
    await signOut();
    navigate('/', { replace: true });
  };

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  const deskLink = (path: string, active: boolean) =>
    `px-3 py-2 rounded-md text-sm font-medium ${active ? 'text-primary bg-primary/5' : 'text-gray-600 hover:text-primary'}`;
  const mobLink = (path: string, active: boolean) =>
    `block px-3 py-2 rounded-md text-base font-medium ${active ? 'text-primary bg-primary/5' : 'text-gray-600 hover:text-primary'}`;

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
                  <Link to="/admin" className={deskLink('/admin', isActive('/admin'))}>Dashboard</Link>
                  <Link to="/admin/users" className={deskLink('/admin/users', isActive('/admin/users'))}>Usuários</Link>
                  <Link to="/admin/plans" className={deskLink('/admin/plans', isActive('/admin/plans'))}>Planos</Link>
                  <Link to="/admin/analytics" className={deskLink('/admin/analytics', isActive('/admin/analytics'))}>Estatísticas</Link>
                </>
              )}

              {userRole === 'business' && (
                <>
                  <Link to="/dashboard" className={deskLink('/dashboard', isActive('/dashboard'))}>{t('nav.dashboard')}</Link>
                  <Link to="/reviews" className={deskLink('/reviews', isActive('/reviews'))}>{t('nav.reviews')}</Link>
                  <Link to="/qrcodes" className={deskLink('/qrcodes', isActive('/qrcodes'))}>{t('nav.qrcodes')}</Link>
                  <Link to="/settings" className={deskLink('/settings', isActive('/settings'))}>{t('nav.settings')}</Link>
                </>
              )}

              {userRole === 'none' && (
                <>
                  <Link to="/demo" className={deskLink('/demo', isActive('/demo'))}>Demo</Link>
                  <Link to="/#features" className="text-gray-600 hover:text-primary px-3 py-2 rounded-md text-sm font-medium">Recursos</Link>
                  <Link to="/#pricing" className="text-gray-600 hover:text-primary px-3 py-2 rounded-md text-sm font-medium">Preços</Link>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            {userRole === 'business' && <LanguageSwitcher />}

            {userRole !== 'none' ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-40 rounded-full">
                    <div className="flex h-full w-full items-center justify-center rounded-full bg-primary text-white">
                      {userRole === 'admin' ? 'Admin' : t('nav.profile')}
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link to="/profile">{t('nav.account')}</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/settings">{t('nav.settings')}</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => void handleLogout()}>
                    {t('nav.logout')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex space-x-2">
                <Button variant="outline" asChild>
                  <Link to="/login">{t('nav.login')}</Link>
                </Button>
                <Button asChild>
                  <Link to="/signup">{t('nav.signup')}</Link>
                </Button>
              </div>
            )}

            {/* Mobile menu button */}
            <div className="md:hidden ml-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="text-gray-600"
              >
                <span className="sr-only">Menu</span>
                {isMobileMenuOpen ? <span className="text-xl">✕</span> : <span className="text-xl">☰</span>}
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
                <Link to="/admin" className={mobLink('/admin', isActive('/admin'))} onClick={() => setIsMobileMenuOpen(false)}>Dashboard</Link>
                <Link to="/admin/users" className={mobLink('/admin/users', isActive('/admin/users'))} onClick={() => setIsMobileMenuOpen(false)}>Usuários</Link>
                <Link to="/admin/plans" className={mobLink('/admin/plans', isActive('/admin/plans'))} onClick={() => setIsMobileMenuOpen(false)}>Planos</Link>
                <Link to="/admin/analytics" className={mobLink('/admin/analytics', isActive('/admin/analytics'))} onClick={() => setIsMobileMenuOpen(false)}>Estatísticas</Link>
              </>
            )}

            {userRole === 'business' && (
              <>
                <Link to="/dashboard" className={mobLink('/dashboard', isActive('/dashboard'))} onClick={() => setIsMobileMenuOpen(false)}>{t('nav.dashboard')}</Link>
                <Link to="/reviews" className={mobLink('/reviews', isActive('/reviews'))} onClick={() => setIsMobileMenuOpen(false)}>{t('nav.reviews')}</Link>
                <Link to="/qrcodes" className={mobLink('/qrcodes', isActive('/qrcodes'))} onClick={() => setIsMobileMenuOpen(false)}>{t('nav.qrcodes')}</Link>
                <Link to="/settings" className={mobLink('/settings', isActive('/settings'))} onClick={() => setIsMobileMenuOpen(false)}>{t('nav.settings')}</Link>
                <Link to="/profile" className={mobLink('/profile', isActive('/profile'))} onClick={() => setIsMobileMenuOpen(false)}>{t('nav.account')}</Link>
              </>
            )}

            {userRole === 'none' && (
              <>
                <Link to="/demo" className={mobLink('/demo', isActive('/demo'))} onClick={() => setIsMobileMenuOpen(false)}>Demo</Link>
                <Link to="/#features" className="text-gray-600 hover:text-primary block px-3 py-2 rounded-md text-base font-medium" onClick={() => setIsMobileMenuOpen(false)}>Recursos</Link>
                <Link to="/#pricing" className="text-gray-600 hover:text-primary block px-3 py-2 rounded-md text-base font-medium" onClick={() => setIsMobileMenuOpen(false)}>Preços</Link>
                <Link to="/login" className="text-gray-600 hover:text-primary block px-3 py-2 rounded-md text-base font-medium" onClick={() => setIsMobileMenuOpen(false)}>{t('nav.login')}</Link>
                <Link to="/signup" className="text-gray-600 hover:text-primary block px-3 py-2 rounded-md text-base font-medium" onClick={() => setIsMobileMenuOpen(false)}>{t('nav.signup')}</Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
