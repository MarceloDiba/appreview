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
import { UserRound } from 'lucide-react';

interface NavbarProps {
  userRole?: 'business' | 'none';
  businessName?: string;
}

/**
 * O painel do dono e os itens partilhados — conta, definições, sair,
 * entrar/começar — passam pelo react-i18next. Os links de marketing da landing
 * ficam em português, que é a língua dessa página.
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
    `relative px-3 py-5 text-sm font-medium transition-colors ${active ? 'text-[#2457D6] after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-[#2457D6]' : 'text-slate-600 hover:text-[#2457D6]'}`;
  const mobLink = (path: string, active: boolean) =>
    `block px-3 py-2 rounded-md text-base font-medium ${active ? 'text-primary bg-primary/5' : 'text-gray-600 hover:text-primary'}`;

  return (
    <nav className="fixed z-10 w-full border-b border-slate-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0">
              <span className="text-xl font-bold text-[#6D43C0]">Binno</span>
            </Link>

            {userRole === 'business' && businessName && (
              <div className="ml-4 hidden border-l border-slate-300 pl-4 md:block">
                <span className="text-sm text-slate-600">{businessName}</span>
              </div>
            )}
          </div>

          {/* Desktop navigation */}
          <div className="hidden md:block">
            <div className="flex items-center space-x-4">
              {userRole === 'business' && (
                <>
                  <Link to="/dashboard" className={deskLink('/dashboard', isActive('/dashboard'))}>{t('nav.dashboard')}</Link>
                  <Link to="/reviews" className={deskLink('/reviews', isActive('/reviews'))}>{t('nav.reviews')}</Link>
                  <Link to="/whatsapp" className={deskLink('/whatsapp', isActive('/whatsapp'))}>{t('nav.whatsapp')}</Link>
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
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0" aria-label={t('nav.profile')}>
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#2457D6] text-white">
                      <UserRound className="h-4 w-4" aria-hidden="true" />
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
            {userRole === 'business' && (
              <>
                <Link to="/dashboard" className={mobLink('/dashboard', isActive('/dashboard'))} onClick={() => setIsMobileMenuOpen(false)}>{t('nav.dashboard')}</Link>
                <Link to="/reviews" className={mobLink('/reviews', isActive('/reviews'))} onClick={() => setIsMobileMenuOpen(false)}>{t('nav.reviews')}</Link>
                <Link to="/whatsapp" className={mobLink('/whatsapp', isActive('/whatsapp'))} onClick={() => setIsMobileMenuOpen(false)}>{t('nav.whatsapp')}</Link>
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
