import { Link } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { comVagas } from '@/lib/precoBinno';
import BotaoDeComprar from '@/components/marketing/BotaoDeComprar';
import type { MarketingCopy } from '@/i18n/marketing';
import MarcaBinno from '@/components/marketing/MarcaBinno';

type PublicMarketingNavProps = {
  copy: MarketingCopy;
};

/**
 * Os quatro links seguem os ids das seções da home nova
 * (`docs/nova-home-binno.md`, seção 2): como funciona, para quem é,
 * demonstração e plano. O CTA usa `BotaoDeComprar` — nada de "Começar" que
 * leva a um cadastro, porque a home nova cobra antes de pedir conta.
 */
const LINKS = (copy: MarketingCopy) => [
  { href: '/#como', label: copy.nav.howItWorks },
  { href: '/#para-quem', label: copy.nav.capabilities },
  { href: '/#demo', label: copy.nav.demo },
  { href: '/#plano', label: copy.nav.price },
];

const PublicMarketingNav = ({ copy }: PublicMarketingNavProps) => {
  const links = LINKS(copy);

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
          <Button variant="outline" asChild className="min-h-11"><Link to="/login">{copy.nav.login}</Link></Button>
          <BotaoDeComprar rotulo={comVagas(copy.nav.start)} className="h-11 bg-[#2457D6] px-4 text-sm hover:bg-[#1d47b0]" />
        </div>

        <Sheet>
          <SheetTrigger asChild>
            <Button type="button" variant="outline" size="icon" className="h-11 w-11 md:hidden" aria-label="Abrir menu">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="flex w-4/5 flex-col gap-1 sm:max-w-xs">
            {/* `sr-only`: o Sheet exige um título para leitores de tela, mas a barra já mostra a marca visualmente. */}
            <SheetTitle className="sr-only">Menu</SheetTitle>
            {links.map((link) => (
              <SheetClose asChild key={link.href}>
                <Link to={link.href} className="flex min-h-11 items-center rounded-lg px-3 text-base font-medium text-slate-700 hover:bg-slate-50">
                  {link.label}
                </Link>
              </SheetClose>
            ))}
            <div className="mt-3 grid gap-2 border-t border-slate-100 pt-4">
              <SheetClose asChild>
                <Button variant="outline" asChild className="min-h-11"><Link to="/login">{copy.nav.login}</Link></Button>
              </SheetClose>
              <BotaoDeComprar rotulo={comVagas(copy.nav.start)} className="min-h-11 w-full bg-[#2457D6] hover:bg-[#1d47b0]" />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
};

export default PublicMarketingNav;
