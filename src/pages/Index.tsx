import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  BellRing,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Lightbulb,
  MessageCircle,
  QrCode,
  SearchCheck,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { comVagas, PRECO_PROMO_BRL, PRECO_REGULAR_BRL } from '@/lib/precoBinno';
import PublicMarketingNav from '@/components/marketing/PublicMarketingNav';
import BotaoDeWhatsApp from '@/components/marketing/BotaoDeWhatsApp';
import BinnoDemoCockpit, { SalesCockpitPreview } from '@/components/marketing/BinnoDemoCockpit';
import { getMarketingCopy } from '@/i18n/marketing';
import { useTranslation } from '@/i18n/useTranslation';
import MarcaBinno from '@/components/marketing/MarcaBinno';

const SectionTitle = ({ eyebrow, title, body, centered = false, inverted = false }: { eyebrow: string; title: string; body: string; centered?: boolean; inverted?: boolean }) => (
  <div className={centered ? 'mx-auto max-w-3xl text-center' : 'max-w-2xl'}>
    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#6D43C0]">{eyebrow}</p>
    <h2 className={`mt-3 text-3xl font-bold tracking-tight sm:text-4xl ${inverted ? 'text-white' : 'text-slate-950'}`}>{title}</h2>
    <p className={`mt-4 text-lg leading-8 ${inverted ? 'text-slate-300' : 'text-slate-600'}`}>{body}</p>
  </div>
);

const Index = () => {
  const { locale } = useTranslation();
  const copy = getMarketingCopy(locale);

  return (
    <div className="min-h-screen bg-white text-slate-950">
      <PublicMarketingNav copy={copy} />
      <main>
        <section className="overflow-hidden px-4 pb-20 pt-16 sm:px-6 lg:pb-28 lg:pt-24">
          <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[0.82fr_1.18fr]">
            <div className="max-w-xl">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#6D43C0]">{copy.hero.eyebrow}</p>
              <h1 className="mt-4 text-4xl font-bold leading-[1.04] tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">{copy.hero.title}</h1>
              <p className="mt-6 text-lg leading-8 text-slate-600">{copy.hero.body}</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="bg-[#2457D6] hover:bg-[#1d47b0]"><Link to="/signup">{copy.hero.primary}<ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
                <Button asChild size="lg" variant="outline"><Link to="/demo">{copy.hero.secondary}</Link></Button>
              </div>
              <p className="mt-6 flex gap-2 text-sm leading-6 text-slate-600"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />{copy.hero.trust}</p>
            </div>
            <div className="relative"><div className="absolute -inset-10 -z-10 rounded-full bg-violet-100/60 blur-3xl" /><SalesCockpitPreview copy={copy} /></div>
          </div>
        </section>

        <section id="how-it-works" className="scroll-mt-20 border-y border-slate-100 bg-slate-50 px-4 py-20 sm:px-6">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.84fr_1.16fr] lg:items-center">
            <SectionTitle eyebrow={copy.maps.eyebrow} title={copy.maps.title} body={copy.maps.body} />
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="grid gap-5 sm:grid-cols-3">
                <MapPoint icon={SearchCheck} title={copy.maps.steps[0].title} body={copy.maps.steps[0].body} />
                <MapPoint icon={Star} title={copy.maps.steps[1].title} body={copy.maps.steps[1].body} />
                <MapPoint icon={Sparkles} title={copy.maps.steps[2].title} body={copy.maps.steps[2].body} />
              </div>
              <p className="mt-6 border-t border-slate-100 pt-5 text-sm leading-6 text-slate-600">{copy.maps.note}</p>
              <a href="https://support.google.com/business/answer/7091?hl=en" target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center text-sm font-semibold text-[#2457D6]">{copy.maps.link}<ArrowRight className="ml-1 h-4 w-4" /></a>
            </div>
          </div>
        </section>

        <section id="capabilities" className="scroll-mt-20 px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-7xl">
            <SectionTitle centered eyebrow={copy.alerts.eyebrow} title={copy.alerts.title} body={copy.alerts.body} />
            <div className="mt-12 grid gap-5 md:grid-cols-3">
              {copy.alerts.items.map((item, index) => {
                const Icon = [TrendingDown, AlertTriangle, SearchCheck][index];
                return <article key={item.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><span className="flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-red-700"><Icon className="h-5 w-5" /></span><h3 className="mt-5 text-xl font-bold text-slate-950">{item.title}</h3><p className="mt-3 leading-6 text-slate-600">{item.body}</p></article>;
              })}
            </div>
          </div>
        </section>

        <section className="px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-4xl rounded-3xl border border-emerald-200 bg-emerald-50/50 p-8 text-center sm:p-12">
            <SectionTitle centered eyebrow={copy.honest.eyebrow} title={copy.honest.title} body={copy.honest.body} />
            <p className="mx-auto mt-6 flex max-w-2xl items-start gap-2 text-left text-sm leading-6 text-emerald-950"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />{copy.honest.note}</p>
            <a href="https://support.google.com/business/answer/13762416?hl=en" target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center text-sm font-semibold text-[#2457D6]">{copy.honest.link}<ArrowRight className="ml-1 h-4 w-4" /></a>
          </div>
        </section>

        <section className="px-4 py-20 sm:px-6">
          <div className="mx-auto grid max-w-7xl gap-10 rounded-3xl border border-emerald-200 bg-emerald-50/50 p-6 sm:p-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div><SectionTitle eyebrow={copy.whatsapp.eyebrow} title={copy.whatsapp.title} body={copy.whatsapp.body} /><p className="mt-6 text-sm leading-6 text-emerald-950">{copy.whatsapp.note}</p></div>
            <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm"><div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100"><MessageCircle className="h-5 w-5 text-emerald-700" /></span><div><p className="font-semibold text-slate-950">Binno</p><p className="text-sm text-slate-500">{copy.cockpit.weeklySummary}</p></div></div><div className="mt-5 rounded-2xl rounded-tl-sm bg-emerald-50 p-4 text-sm leading-6 text-emerald-950"><p className="font-semibold">{copy.cockpit.weekly}</p><ul className="mt-2 space-y-2">{copy.whatsapp.items.map((item) => <li key={item} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />{item}</li>)}</ul></div></div>
          </div>
        </section>

        <section className="border-y border-slate-100 bg-slate-50 px-4 py-20 sm:px-6">
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.88fr_1.12fr] lg:items-center">
            <div><SectionTitle eyebrow={copy.replies.eyebrow} title={copy.replies.title} body={copy.replies.body} /><p className="mt-6 flex gap-2 text-sm leading-6 text-slate-600"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#2457D6]" />{copy.replies.note}</p><a href="https://support.google.com/business/answer/3474050?hl=en" target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center text-sm font-semibold text-[#2457D6]">{copy.replies.link}<ArrowRight className="ml-1 h-4 w-4" /></a></div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between gap-3"><div><p className="font-semibold text-slate-950">{copy.cockpit.sampleReviewer}</p><div className="mt-1 flex">{[1, 2, 3, 4, 5].map((star) => <Star key={star} className={`h-4 w-4 ${star <= 2 ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />)}</div></div><span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-[#2457D6]">{copy.demo.label}</span></div><blockquote className="mt-5 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">“{copy.cockpit.reviewMessage}”</blockquote><div className="mt-4 rounded-xl border border-slate-200 p-4"><p className="text-sm font-semibold text-slate-950">{copy.cockpit.replySuggested}</p><p className="mt-2 text-sm leading-6 text-slate-700">{copy.cockpit.replyExample}</p><div className="mt-4 flex flex-wrap gap-2"><Button size="sm" className="bg-[#2457D6] hover:bg-[#1d47b0]"><ClipboardCheck className="mr-2 h-4 w-4" />{copy.cockpit.useReply}</Button><Button size="sm" variant="outline">{copy.cockpit.edit}</Button></div></div></div>
          </div>
        </section>

        <section className="px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-7xl"><SectionTitle centered eyebrow={copy.history.eyebrow} title={copy.history.title} body={copy.history.body} /><div className="mt-12 grid gap-5 md:grid-cols-4">{copy.history.items.map((item, index) => { const Icon = [FileText, TrendingUp, Star, MessageCircle][index]; return <div key={item} className="rounded-2xl border border-slate-200 p-5"><Icon className="h-5 w-5 text-[#2457D6]" /><p className="mt-4 font-semibold text-slate-950">{item}</p></div>; })}</div></div>
        </section>

        <section className="bg-[#111827] px-4 py-20 text-white sm:px-6"><div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-2 lg:items-center"><SectionTitle eyebrow={copy.radar.eyebrow} title={copy.radar.title} body={copy.radar.body} inverted /><div className="grid gap-4"><RadarBlock good icon={TrendingUp} title={copy.radar.strengthTitle} body={copy.radar.strengthBody} /><RadarBlock icon={TrendingDown} title={copy.radar.riskTitle} body={copy.radar.riskBody} /></div></div></section>

        <section className="px-4 py-20 sm:px-6"><div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center"><div><SectionTitle eyebrow={copy.profile.eyebrow} title={copy.profile.title} body={copy.profile.body} /><div className="mt-6 space-y-3">{copy.profile.items.map((item, index) => { const Icon = [MessageCircle, Star, SearchCheck, QrCode][index]; return <p key={item} className="flex gap-3 text-sm leading-6 text-slate-700"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-50 text-[#6D43C0]"><Icon className="h-4 w-4" /></span>{item}</p>; })}</div></div><div className="rounded-2xl border border-slate-200 bg-slate-50 p-6"><div className="flex items-center gap-3"><Lightbulb className="h-6 w-6 text-[#6D43C0]" /><div><p className="font-semibold text-slate-950">{copy.cockpit.plan}</p><p className="text-sm text-slate-500">{copy.cockpit.onePriority}</p></div></div><p className="mt-6 rounded-xl bg-white p-4 text-sm leading-6 text-slate-700">{copy.cockpit.practice}</p></div></div></section>

        <section id="demo" className="scroll-mt-20 border-y border-slate-100 bg-slate-50 px-4 py-20 sm:px-6"><div className="mx-auto max-w-7xl"><SectionTitle centered eyebrow={copy.demo.eyebrow} title={copy.demo.title} body={copy.demo.body} /><div className="mt-10"><BinnoDemoCockpit copy={copy} /></div><div className="mt-8 text-center"><Button asChild size="lg" className="bg-[#2457D6] hover:bg-[#1d47b0]"><Link to="/demo">{copy.demo.primary}<ArrowRight className="ml-2 h-4 w-4" /></Link></Button></div></div></section>

        <section id="pricing" className="scroll-mt-20 px-4 py-20 sm:px-6"><div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-8 rounded-3xl border border-violet-200 bg-violet-50/60 p-8 md:flex-row md:p-10"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#6D43C0]">{copy.pricing.eyebrow}</p><h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">{copy.pricing.title}</h2><p className="mt-3 max-w-xl text-lg leading-7 text-slate-600">{copy.pricing.body}</p></div><div className="w-full max-w-64 text-center md:text-right"><p className="text-sm font-medium text-slate-600">{copy.pricing.availableLabel}</p><p className="mt-3 text-xs font-bold uppercase tracking-[0.16em] text-[#6D43C0]">{copy.pricing.promoLabel}</p><p className="mt-1 text-sm text-slate-500">{copy.pricing.regularLabel} <span className="line-through">R${PRECO_REGULAR_BRL}</span></p><p className="mt-1"><span className="text-5xl font-bold text-slate-950">R${PRECO_PROMO_BRL}</span><span className="text-slate-500">{copy.pricing.monthly}</span></p><p className="mt-2 text-xs leading-5 text-slate-500">{comVagas(copy.pricing.promoNote)}</p><p className="mt-2 text-xs leading-5 text-slate-500">{copy.pricing.availableHint}</p><Button asChild size="lg" className="mt-5 w-full bg-[#2457D6] hover:bg-[#1d47b0]"><Link to="/signup">{copy.pricing.cta}</Link></Button></div></div></section>
      </main>
      <footer className="bg-slate-950 px-4 py-10 text-slate-300 sm:px-6"><div className="mx-auto flex max-w-7xl flex-col justify-between gap-5 sm:flex-row"><div><MarcaBinno tom="claro" /><p className="mt-2 text-sm text-slate-400">{copy.footer.body}</p></div><div className="flex flex-wrap gap-5 text-sm"><Link to="/demo">{copy.footer.demo}</Link><Link to="/termos">{copy.footer.terms}</Link><Link to="/privacidade">{copy.footer.privacy}</Link></div></div></footer>
      {/*
        Fora do <footer> e fora do <main>, de proposito: ele acompanha a pagina
        inteira. A pergunta que trava uma compra aparece a meio da leitura, e
        nao no fim — obrigar a rolar ate ao rodape para a fazer e perder a
        pergunta.
      */}
      <BotaoDeWhatsApp forma="flutuante" rotulo={copy.contacto.rotulo} mensagem={copy.contacto.mensagemDaVenda} />
    </div>
  );
};

const MapPoint = ({ icon: Icon, title, body }: { icon: typeof SearchCheck; title: string; body: string }) => <div><span className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-50 text-[#6D43C0]"><Icon className="h-5 w-5" /></span><h3 className="mt-4 font-semibold text-slate-950">{title}</h3><p className="mt-2 text-sm leading-5 text-slate-600">{body}</p></div>;
const RadarBlock = ({ icon: Icon, title, body, good = false }: { icon: typeof TrendingUp; title: string; body: string; good?: boolean }) => <div className={`rounded-2xl border p-6 ${good ? 'border-emerald-400/30 bg-emerald-400/10' : 'border-red-400/30 bg-red-400/10'}`}><div className="flex gap-3"><Icon className={`mt-0.5 h-5 w-5 shrink-0 ${good ? 'text-emerald-300' : 'text-red-300'}`} /><div><h3 className="font-semibold text-white">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-300">{body}</p></div></div></div>;

export default Index;
