import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Circle, MessageCircle, ShieldCheck, TrendingDown, XCircle, Zap } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { comVagas } from '@/lib/precoBinno';
import BotaoDeComprar from '@/components/marketing/BotaoDeComprar';
import PublicMarketingNav from '@/components/marketing/PublicMarketingNav';
import BotaoDeWhatsApp from '@/components/marketing/BotaoDeWhatsApp';
import HeroAnimado from '@/components/marketing/HeroAnimado';
import BinnoDemoCockpit from '@/components/marketing/BinnoDemoCockpit';
import { getMarketingCopy, type MarketingCopy } from '@/i18n/marketing';
import { useTranslation } from '@/i18n/useTranslation';
import MarcaBinno from '@/components/marketing/MarcaBinno';

/**
 * Ordem das seções: a tabela da seção 2 de `docs/nova-home-binno.md`, ponto
 * por ponto. `maps` e `alerts` guardam o conteúdo de "O problema" e "Como
 * funciona" — nomes de chave antigos, conteúdo novo, por decisão do
 * documento (ver o comentário no topo de `src/i18n/marketing.ts`).
 */
const Kicker = ({ eyebrow, title, body, centered = false }: { eyebrow: string; title: string; body?: string; centered?: boolean }) => (
  <div className={centered ? 'mx-auto max-w-2xl text-center' : 'max-w-xl'}>
    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#6D43C0]">{eyebrow}</p>
    <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">{title}</h2>
    {body && <p className="mt-4 text-lg leading-8 text-slate-600">{body}</p>}
  </div>
);

const PILARES_ICONES = [Zap, MessageCircle, TrendingDown];
const Pilar = ({ item, index }: { item: MarketingCopy['alerts']['items'][number]; index: number }) => {
  const Icone = PILARES_ICONES[index];
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-6">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-[#6D43C0]"><Icone className="h-5 w-5" /></span>
      <h3 className="mt-5 text-xl font-bold text-slate-950">{item.title}</h3>
      <p className="mt-3 leading-6 text-slate-600">{item.body}</p>
    </article>
  );
};

const LinhaComparativa = ({ row }: { row: MarketingCopy['compare']['rows'][number] }) => (
  <div className="grid grid-cols-1 border-t border-slate-200 sm:grid-cols-2">
    <div className="flex items-start gap-2.5 px-5 py-4 text-slate-600"><Circle className="mt-1 h-3.5 w-3.5 shrink-0 text-slate-300" />{row.before}</div>
    <div className="flex items-start gap-2.5 border-t border-slate-100 bg-[#FCFBFF] px-5 py-4 font-medium text-slate-950 sm:border-l sm:border-t-0"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />{row.after}</div>
  </div>
);

const RegraDeOuro = ({ rule }: { rule: MarketingCopy['honest']['rules'][number] }) => (
  <div className="flex gap-3 border-t border-slate-100 py-3.5 first:border-t-0 first:pt-0">
    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${rule.ok ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
      {rule.ok ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
    </span>
    <div><p className="font-semibold text-slate-950">{rule.title}</p><p className="text-sm leading-5 text-[#655F7C]">{rule.body}</p></div>
  </div>
);

const Index = () => {
  const { locale } = useTranslation();
  const copy = getMarketingCopy(locale);

  return (
    <div className="min-h-screen bg-white text-slate-950">
      <div className="border-b border-white/10 bg-[#1E1238] px-4 py-2.5 text-center text-sm text-white sm:px-6">
        <b className="text-[#C9B6F5]">{copy.pricing.promoLabel}</b> {comVagas(copy.pricing.promoNote)}
      </div>
      <PublicMarketingNav copy={copy} />
      <main>
        {/* 1. Hero interativo */}
        <section className="relative overflow-hidden bg-gradient-to-br from-[#1E1238] via-[#2A1A55] to-[#3A2470] px-4 py-16 text-white sm:px-6 lg:py-24">
          <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#C9B6F5]">{copy.hero.eyebrow}</p>
              <h1 className="mt-4 text-4xl font-bold leading-[1.04] tracking-tight sm:text-5xl lg:text-6xl">{copy.hero.title} <span className="text-[#C9B6F5]">{copy.hero.titleEmphasis}</span></h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-[#D9D2EA]">{copy.hero.body}</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <BotaoDeComprar rotulo={comVagas(copy.hero.primary)} className="bg-white text-[#1E1238] hover:bg-[#EFE9FA]"><ArrowRight className="ml-2 h-4 w-4" /></BotaoDeComprar>
                <Button asChild size="lg" variant="outline" className="min-h-11 border-white/35 bg-transparent text-white hover:border-white hover:bg-white/10 hover:text-white"><Link to="/demo">{copy.hero.secondary}</Link></Button>
              </div>
              <p className="mt-5 flex flex-wrap items-center gap-2 text-sm text-[#B9AFD3]"><ShieldCheck className="h-4 w-4 shrink-0" />{copy.hero.micro}</p>
              <div className="mt-9 flex flex-wrap gap-7">
                {copy.hero.proof.map((item) => <div key={item.label}><p className="text-2xl font-extrabold tracking-tight">{item.value}</p><p className="mt-0.5 text-xs text-[#B9AFD3]">{item.label}</p></div>)}
              </div>
            </div>
            <HeroAnimado copy={copy.hero} />
          </div>
        </section>

        {/* 2. O problema (chave `maps`, conteúdo reescrito) */}
        <section className="scroll-mt-24 border-y border-slate-100 bg-[#F7F5FC] px-4 py-20 sm:px-6" id="problema">
          <div className="mx-auto max-w-7xl">
            <Kicker eyebrow={copy.maps.eyebrow} title={copy.maps.title} body={copy.maps.body} />
            <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
              {copy.maps.stats.map((stat) => <div key={stat.body} className="rounded-2xl border border-slate-200 bg-white p-6"><p className="text-5xl font-extrabold tracking-tight text-[#6D43C0]">{stat.value}<span className="text-xl text-slate-400">{stat.suffix}</span></p><p className="mt-3 text-slate-600">{stat.body}</p></div>)}
            </div>
            <div className="mt-8 grid gap-3 rounded-2xl border border-dashed border-[#E3DAF6] bg-white p-6 text-sm text-slate-600 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center sm:gap-6">
              <span className="font-mono text-xs font-semibold uppercase tracking-wider text-[#6D43C0]">{copy.maps.sourceLabel}</span>
              <p>{copy.maps.sourceText} {copy.maps.sourceLinks.map((link) => <a key={link.label} href={link.href} target="_blank" rel="noreferrer" className="mr-4 inline-block font-medium text-[#2457D6] underline-offset-2 hover:underline">{link.label}</a>)}</p>
            </div>
          </div>
        </section>

        {/* 3. Como funciona (chave `alerts`, os três pilares) */}
        <section className="scroll-mt-24 px-4 py-20 sm:px-6" id="como">
          <div className="mx-auto max-w-7xl">
            <Kicker centered eyebrow={copy.alerts.eyebrow} title={copy.alerts.title} />
            <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3">
              {copy.alerts.items.map((item, index) => <Pilar key={item.title} item={item} index={index} />)}
            </div>
          </div>
        </section>

        {/* 4. Isso não é mockup */}
        <section className="scroll-mt-24 border-y border-slate-100 bg-[#F7F5FC] px-4 py-20 sm:px-6" id="prova">
          <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 md:grid-cols-[0.9fr_1.1fr]">
            <figure className="m-0">
              <img src="/marketing/prova-avaliacao-google.jpg" width={772} height={842} loading="lazy" alt="" className="mx-auto block h-auto w-full max-w-md rounded-2xl border border-slate-200 shadow-[0_30px_50px_-30px_rgba(18,12,34,0.35)]" />
              <figcaption className="mt-3 text-center text-sm text-[#655F7C]">{copy.prova.imageCaption}</figcaption>
            </figure>
            <div className="max-w-xl">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#6D43C0]">{copy.prova.eyebrow}</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">{copy.prova.title}</h2>
              <p className="mt-4 text-lg leading-8 text-slate-600">{copy.prova.body}</p>
              <div className="mt-7 grid gap-0 border-l-2 border-[#E3DAF6] pl-6">
                {copy.prova.steps.map((step) => <div key={step.title} className="relative py-3.5"><span className="absolute -left-[1.9rem] top-6 h-3 w-3 rounded-full bg-[#6D43C0] ring-4 ring-white" /><span className="font-mono text-xs tracking-wider text-[#6D43C0]">{step.tag}</span><p className="font-semibold text-slate-950">{step.title}</p><p className="mt-1 text-slate-600">{step.body}</p></div>)}
              </div>
            </div>
          </div>
        </section>

        {/* 5. Para quem é */}
        <section className="scroll-mt-24 px-4 py-20 sm:px-6" id="para-quem">
          <div className="mx-auto max-w-7xl">
            <Kicker centered eyebrow={copy.segments.eyebrow} title={copy.segments.title} />
            <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {copy.segments.items.map((item) => <div key={item.number} className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-5"><span className="font-mono text-xs tracking-wider text-[#6D43C0]">{item.number}</span><h3 className="font-bold text-slate-950">{item.title}</h3><p className="text-sm leading-6 text-slate-600">{item.body}</p></div>)}
            </div>
          </div>
        </section>

        {/* 6. Demonstração — sobe do /demo para dentro da home, mesmo componente aprovado */}
        <section className="scroll-mt-24 border-y border-slate-100 bg-[#F7F5FC] px-4 py-20 sm:px-6" id="demo">
          <div className="mx-auto max-w-7xl">
            <Kicker centered eyebrow={copy.demo.eyebrow} title={copy.demo.title} body={copy.demo.body} />
            <div className="mt-10"><BinnoDemoCockpit copy={copy} /></div>
            <div className="mt-8 text-center"><Button asChild size="lg" className="min-h-11 bg-[#2457D6] hover:bg-[#1d47b0]"><Link to="/demo">{copy.demo.primary}<ArrowRight className="ml-2 h-4 w-4" /></Link></Button></div>
          </div>
        </section>

        {/* 7. Sem o Binno / Com o Binno */}
        <section className="px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-4xl">
            <Kicker centered eyebrow={copy.compare.eyebrow} title={copy.compare.title} />
            <div className="mt-10 overflow-hidden rounded-2xl border border-slate-200">
              <div className="grid grid-cols-1 bg-[#F7F5FC] text-sm font-bold sm:grid-cols-2">
                <div className="px-5 py-3.5">{copy.compare.columnBefore}</div>
                <div className="border-t border-slate-200 px-5 py-3.5 text-[#6D43C0] sm:border-l sm:border-t-0">{copy.compare.columnAfter}</div>
              </div>
              {copy.compare.rows.map((row) => <LinhaComparativa key={row.before} row={row} />)}
            </div>
          </div>
        </section>

        {/* 8. A regra que não muda — review gating, antes do preço */}
        <section className="px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-7xl">
            <div className="grid grid-cols-1 gap-10 rounded-[1.5rem] border border-[#E3DAF6] bg-gradient-to-b from-[#FBF9FF] to-white p-8 sm:p-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
              <div className="max-w-xl">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#6D43C0]">{copy.honest.eyebrow}</p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">{copy.honest.title}</h2>
                <p className="mt-4 text-lg leading-8 text-slate-600">{copy.honest.body}</p>
                <p className="mt-5 flex gap-2 text-sm leading-6 text-slate-700"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#2457D6]" />{copy.honest.note}</p>
                <a href={copy.honest.linkHref} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[#2457D6]">{copy.honest.link}<ArrowRight className="h-4 w-4" /></a>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                {copy.honest.rules.map((rule) => <RegraDeOuro key={rule.title} rule={rule} />)}
              </div>
            </div>
          </div>
        </section>

        {/* 9. Plano */}
        <section className="scroll-mt-24 px-4 py-20 sm:px-6" id="plano">
          <div className="mx-auto max-w-4xl">
            <div className="grid grid-cols-1 gap-10 rounded-[1.6rem] border border-[#E3DAF6] bg-gradient-to-br from-[#F5F0FF] to-white p-8 sm:p-11 md:grid-cols-2 md:items-center">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#6D43C0]">{copy.pricing.eyebrow}</p>
                <p className="mt-3 text-lg text-[#655F7C] line-through">{comVagas(copy.pricing.oldPrice)}</p>
                <p className="text-5xl font-extrabold tracking-tight text-slate-950 sm:text-6xl">{comVagas(copy.pricing.newPrice)}<span className="ml-1 text-base font-normal text-[#655F7C]">{copy.pricing.priceSuffix}</span></p>
                <p className="mt-3 text-sm text-slate-600">{comVagas(copy.pricing.loteNote)}</p>
                <BotaoDeComprar rotulo={comVagas(copy.pricing.cta)} className="mt-6 bg-[#2457D6] hover:bg-[#1d47b0]" />
                <p className="mt-3 text-xs text-[#655F7C]">{copy.pricing.hint}</p>
              </div>
              <ul className="grid gap-2.5">
                {copy.pricing.features.map((feature) => <li key={feature} className="flex items-start gap-2.5 leading-6 text-slate-700"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />{feature}</li>)}
              </ul>
            </div>
          </div>
        </section>

        {/* 10. Perguntas frequentes */}
        <section className="px-4 pb-20 sm:px-6">
          <div className="mx-auto max-w-3xl">
            <Kicker centered eyebrow={copy.faq.eyebrow} title={copy.faq.title} />
            <Accordion type="single" collapsible defaultValue="faq-0" className="mt-10">
              {copy.faq.items.map((item, index) => (
                <AccordionItem key={item.question} value={`faq-${index}`}>
                  <AccordionTrigger className="min-h-11 text-left text-base font-semibold">{item.question}</AccordionTrigger>
                  <AccordionContent className="leading-7 text-slate-600">{item.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* 11. Fechamento */}
        <section className="bg-gradient-to-br from-[#3A2470] to-[#1E1238] px-4 py-20 text-center text-white sm:px-6">
          <div className="mx-auto max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#C9B6F5]">{copy.finalCta.eyebrow}</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">{copy.finalCta.title}</h2>
            <p className="mt-5 text-lg leading-8 text-[#D9D2EA]">{copy.finalCta.body}</p>
            <div className="mt-8"><BotaoDeComprar rotulo={comVagas(copy.finalCta.cta)} className="bg-white text-[#1E1238] hover:bg-[#EFE9FA]" /></div>
            <p className="mt-5 text-sm text-[#B9AFD3]">{copy.finalCta.micro}</p>
          </div>
        </section>
      </main>

      {/* 12. Rodapé */}
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

export default Index;
