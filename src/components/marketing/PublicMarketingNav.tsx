import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { MarketingCopy } from '@/i18n/marketing';
import MarcaBinno from '@/components/marketing/MarcaBinno';
/**
 * Todos os "Começar" da página pública levam a intenção de assinar. Só existe
 * um produto e um preço: quem cria conta é comprador em potencial, e mandá-lo
 * para um painel sem caminho até a cobrança era o vazamento que sobrava.
 */
import { comIntencao } from '@/lib/intencaoDeAssinar';

type PublicMarketingNavProps = {
  copy: MarketingCopy;
};

const PublicMarketingNav = ({ copy }: PublicMarketingNavProps) => {
  const [open, setOpen] = useState(false);
  const links = [
    { href: '/#how-it-works', label: copy.nav.howItWorks },
    { href: '/#capabilities', label: copy.nav.capabilities },
    { href: '/#pricing', label: copy.nav.price },
    { href: '/demo', label: copy.nav.demo },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" aria-label="Binno"><MarcaBinno /></Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Navegação principal">
          {links.map((link) => (
            <Link key={link.href} to={link.href} className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-[#2457D6]">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Button variant="outline" asChild><Link to="/login">{copy.nav.login}</Link></Button>
          <Button asChild className="bg-[#2457D6] hover:bg-[#1d47b0]"><Link to={comIntencao('/signup', true)}>{copy.nav.start}</Link></Button>
        </div>

        <Button type="button" variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-label="Menu">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {open && (
        <nav className="border-t border-slate-100 bg-white px-4 py-3 md:hidden" aria-label="Navegação móvel">
          <div className="mx-auto grid max-w-7xl gap-1">
            {links.map((link) => (
              <Link key={link.href} to={link.href} onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                {link.label}
              </Link>
            ))}
            <div className="mt-2 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
              <Button variant="outline" asChild><Link to="/login">{copy.nav.login}</Link></Button>
              <Button asChild className="bg-[#2457D6] hover:bg-[#1d47b0]"><Link to={comIntencao('/signup', true)}>{copy.nav.start}</Link></Button>
            </div>
          </div>
        </nav>
      )}
    </header>
  );
};

export default PublicMarketingNav;
