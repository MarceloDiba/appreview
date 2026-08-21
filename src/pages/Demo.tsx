import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PublicMarketingNav from '@/components/marketing/PublicMarketingNav';
import BinnoDemoCockpit from '@/components/marketing/BinnoDemoCockpit';
import { getMarketingCopy } from '@/i18n/marketing';
import { useTranslation } from '@/i18n/useTranslation';

const Demo = () => {
  const { locale } = useTranslation();
  const copy = getMarketingCopy(locale);

  return (
    <div className="min-h-screen bg-[#f5f7f9]">
      <PublicMarketingNav copy={copy} />
      <main className="px-4 py-14 sm:px-6 lg:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-10 max-w-3xl text-center">
            <span className="rounded-full border border-violet-100 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-800">{copy.demo.label}</span>
            <h1 className="mt-5 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">{copy.demo.title}</h1>
            <p className="mt-4 text-lg leading-8 text-slate-600">{copy.demo.body}</p>
          </div>
          <BinnoDemoCockpit copy={copy} />
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild variant="outline"><Link to="/"><ArrowLeft className="mr-2 h-4 w-4" />Binno</Link></Button>
            <Button asChild className="bg-[#2457D6] hover:bg-[#1d47b0]"><Link to="/signup">{copy.hero.primary}<ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Demo;
