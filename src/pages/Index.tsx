import React from 'react';
import { Link } from 'react-router-dom';
import {
  BellRing,
  Bot,
  Check,
  CheckCircle,
  Copy,
  Info,
  LockKeyhole,
  MessageCircle,
  Pencil,
  ShieldCheck,
  Sparkles,
  Star,
} from 'lucide-react';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/layout/Navbar';

const trend = [
  { period: '30d', rating: 4.2 },
  { period: '25d', rating: 4.3 },
  { period: '20d', rating: 4.35 },
  { period: '15d', rating: 4.4 },
  { period: '10d', rating: 4.45 },
  { period: '5d', rating: 4.5 },
  { period: 'Hoje', rating: 4.6 },
];

const ExampleBadge = () => (
  <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-primary">
    Exemplo ilustrativo
  </span>
);

const AgentPreview = () => (
  <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl shadow-violet-950/10">
    <div className="flex items-center justify-between border-b px-5 py-4">
      <div className="flex items-center gap-2 font-semibold">
        <Bot className="h-5 w-5 text-primary" aria-hidden="true" />
        Assessor de reputação
      </div>
      <ExampleBadge />
    </div>

    <div className="p-5">
      <div>
        <p className="font-semibold text-gray-900">1. O que mudou</p>
        <p className="mt-0.5 text-sm text-gray-500">Evolução observada nos dados do Google.</p>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-[150px_1fr]">
        <div className="rounded-xl border bg-gray-50 p-4">
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
            <strong className="text-2xl">4,6</strong>
          </div>
          <p className="mt-1 text-xs text-gray-500">avaliação média</p>
          <p className="mt-4 text-xl font-bold">128</p>
          <p className="text-xs text-gray-500">avaliações observadas</p>
        </div>
        <div className="h-40 rounded-xl border p-3">
          <p className="text-xs font-medium text-gray-600">Avaliação média observada</p>
          <ResponsiveContainer width="100%" height="85%">
            <LineChart data={trend} margin={{ top: 10, right: 12, bottom: 0, left: -28 }}>
              <XAxis dataKey="period" tickLine={false} axisLine={false} fontSize={10} />
              <YAxis domain={[4, 5]} tickLine={false} axisLine={false} fontSize={10} />
              <Tooltip formatter={(value: number) => [value.toFixed(1), 'Média']} />
              <Line type="monotone" dataKey="rating" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>

    <div className="border-t p-5">
      <p className="font-semibold text-gray-900">2. O que merece atenção</p>
      <p className="mt-0.5 text-sm text-gray-500">Uma leitura organizada das avaliações recentes.</p>
      <div className="mt-4 rounded-xl border p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-100 font-medium text-primary">C</div>
            <div><p className="text-sm font-medium">Cliente exemplo</p><p className="text-xs text-gray-500">Avaliação recente no Google</p></div>
          </div>
          <div className="flex" aria-label="2 de 5 estrelas">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star key={star} className={`h-4 w-4 ${star <= 2 ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
            ))}
          </div>
        </div>
        <p className="mt-3 text-sm text-gray-700">“Demoraram para responder e precisei insistir para ter uma solução.”</p>
        <div className="mt-3"><ExampleBadge /></div>
      </div>
    </div>

    <div className="border-t p-5">
      <p className="font-semibold text-gray-900">3. Resposta sugerida pelo assessor</p>
      <p className="mt-0.5 text-sm text-gray-500">Rascunho contextualizado e sempre editável.</p>
      <div className="mt-4 rounded-xl border border-violet-100 bg-violet-50/60 p-4">
        <p className="text-sm leading-relaxed text-gray-700">
          Olá! Lamentamos pela demora no retorno. Seu relato é importante para entendermos onde
          falhamos e melhorar esse ponto. Obrigado por nos dar a oportunidade de responder.
        </p>
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-violet-100 pt-3">
          <ExampleBadge />
          <div className="flex gap-3 text-xs font-medium text-primary">
            <span className="flex items-center gap-1"><Pencil className="h-3.5 w-3.5" />Editar</span>
            <span className="flex items-center gap-1"><Copy className="h-3.5 w-3.5" />Copiar</span>
          </div>
        </div>
      </div>
      <p className="mt-4 flex items-center gap-2 text-xs text-gray-500">
        <LockKeyhole className="h-3.5 w-3.5" />
        Você decide e publica no Google. O AppReview não publica automaticamente.
      </p>
    </div>
  </div>
);

const Index = () => (
  <div className="flex min-h-screen flex-col bg-white">
    <Navbar userRole="none" />

    <main>
      <section className="px-4 pb-16 pt-24 sm:px-6 md:pb-24 md:pt-32">
        <div className="container mx-auto grid max-w-7xl items-start gap-12 md:grid-cols-[0.8fr_1.2fr]">
          <div className="max-w-lg md:pt-12">
            <h1 className="text-4xl font-bold leading-[1.08] tracking-tight text-gray-950 sm:text-5xl lg:text-6xl">
              Seu assessor de reputação{' '}
              <span className="text-primary">no Google</span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              O AppReview acompanha o que mudou, destaca o que merece atenção e ajuda você a
              responder — sem exigir que viva dentro do painel.
            </p>

            <ul className="mt-8 space-y-3 text-sm text-gray-700">
              {[
                'Leitura clara da evolução observada no Google',
                'Avaliações recentes organizadas para você decidir',
                'Sugestões de resposta editáveis e contextualizadas',
              ].map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 flex-shrink-0 text-primary" />{item}
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg"><Link to="/signup">Começar agora</Link></Button>
              <Button asChild size="lg" variant="outline"><Link to="/demo">Ver como funciona</Link></Button>
            </div>

            <div className="mt-7 rounded-xl border border-violet-200 bg-violet-50/60 p-4">
              <p className="flex gap-3 text-sm text-gray-700">
                <ShieldCheck className="h-5 w-5 flex-shrink-0 text-primary" />
                <span>Você decide o que responder e publicar. O AppReview nunca publica por você.</span>
              </p>
            </div>

            <p className="mt-6 flex gap-2 text-xs leading-relaxed text-gray-500">
              <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
              Cliques indicam intenção, não publicação. Mudanças observadas no Google não são
              atribuídas automaticamente ao AppReview.
            </p>
          </div>

          <AgentPreview />
        </div>
      </section>

      <section className="px-4 py-8 sm:px-6">
        <div className="container mx-auto max-w-7xl rounded-2xl border border-green-200 bg-green-50/40 p-6 md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-600 text-white">
                <MessageCircle className="h-7 w-7" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-2xl font-bold">Resumo semanal no WhatsApp</h2>
                  <span className="rounded-full border border-green-300 bg-white px-3 py-1 text-xs font-medium text-green-800">Recurso planejado</span>
                </div>
                <p className="mt-1 text-gray-600">Um resumo direto, somente com o que importa.</p>
              </div>
            </div>
            <Button disabled className="bg-green-600 hover:bg-green-600">Disponível em breve</Button>
          </div>

          <div className="mt-7 grid gap-5 border-t border-green-200 pt-6 sm:grid-cols-3">
            <div><p className="text-2xl font-bold">4,6</p><p className="text-sm text-gray-600">avaliação média observada</p></div>
            <div><p className="text-2xl font-bold">+18</p><p className="text-sm text-gray-600">avaliações observadas no período</p></div>
            <div><p className="text-2xl font-bold">1</p><p className="text-sm text-gray-600">avaliação para ler com atenção</p></div>
          </div>
          <p className="mt-5 text-xs text-gray-500">Exemplo ilustrativo · Recurso planejado, sujeito a adesão e consentimento. O WhatsApp não é um canal oficial do Google.</p>
        </div>
      </section>

      <section id="features" className="scroll-mt-20 px-4 py-20 sm:px-6">
        <div className="container mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Você não precisa vigiar o Google</h2>
            <p className="mt-3 text-lg text-gray-600">O AppReview organiza os sinais e reduz o esforço para decidir.</p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              { icon: Bot, title: 'O assessor lê e organiza', body: 'Reúne evolução, avaliações recentes e contexto em uma leitura simples.', status: 'Em construção local' },
              { icon: BellRing, title: 'Você recebe só o que importa', body: 'Notas seletivas e resumo periódico, sem excesso de notificações.', status: 'Recurso planejado' },
              { icon: Pencil, title: 'Você responde com mais segurança', body: 'Sugestões editáveis para vencer a primeira frase e responder com contexto.', status: 'Disponível no painel' },
            ].map(({ icon: Icon, title, body, status }) => (
              <article key={title} className="rounded-2xl border bg-gray-50/60 p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-violet-200 bg-white text-primary"><Icon className="h-6 w-6" /></div>
                <h3 className="mt-6 text-xl font-bold">{title}</h3>
                <p className="mt-3 leading-relaxed text-gray-600">{body}</p>
                <span className="mt-8 inline-block rounded-full border bg-white px-3 py-1 text-xs text-gray-600">{status}</span>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pb-20 sm:px-6">
        <div className="container mx-auto max-w-7xl">
          <div className="mx-auto mb-8 max-w-2xl text-center">
            <h2 className="text-3xl font-bold">Google mostra. AppReview explica e orienta.</h2>
            <p className="mt-3 text-gray-600">Dados brutos são só o começo. O diferencial está em transformar sinais em decisão.</p>
          </div>
          <div className="grid overflow-hidden rounded-2xl border md:grid-cols-2">
            <div className="p-6 md:p-8">
              <p className="font-semibold">O que o Google oferece</p>
              <ul className="mt-5 space-y-3 text-sm text-gray-600">
                {['Nota e total atuais', 'Feed de avaliações', 'Dados para você interpretar'].map((item) => <li key={item} className="flex gap-2"><Check className="h-4 w-4 text-primary" />{item}</li>)}
              </ul>
            </div>
            <div className="border-t bg-violet-50/50 p-6 md:border-l md:border-t-0 md:p-8">
              <p className="font-semibold text-primary">O que o AppReview adiciona</p>
              <ul className="mt-5 space-y-3 text-sm text-gray-700">
                {['Evolução comparável ao longo do tempo', 'Priorização do que merece leitura', 'Sugestões contextualizadas e editáveis'].map((item) => <li key={item} className="flex gap-2"><Check className="h-4 w-4 text-green-600" />{item}</li>)}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section id="pricing" className="scroll-mt-20 bg-gray-50 px-4 py-16 sm:px-6">
        <div className="container mx-auto flex max-w-5xl flex-col items-center justify-between gap-8 rounded-2xl border bg-white p-8 md:flex-row">
          <div>
            <p className="text-sm font-medium text-primary">Plano Pro</p>
            <h2 className="mt-2 text-3xl font-bold">Mais clareza para cuidar da reputação</h2>
            <p className="mt-3 max-w-xl text-gray-600">QR codes, dados observados do Google e sugestões de resposta. Recursos planejados não fazem parte da oferta atual.</p>
          </div>
          <div className="min-w-56 text-center md:text-right">
            <p><span className="text-4xl font-bold">€49</span><span className="text-gray-500">/mês</span></p>
            <Button asChild size="lg" className="mt-4 w-full"><Link to="/signup">Começar agora</Link></Button>
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6">
        <div className="container mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 rounded-2xl bg-primary px-8 py-10 text-white md:flex-row">
          <div><Sparkles className="h-7 w-7" /><h2 className="mt-3 text-3xl font-bold">Você decide. O AppReview organiza os sinais.</h2><p className="mt-2 text-white/80">Menos vigilância, mais clareza para agir.</p></div>
          <Button asChild size="lg" variant="secondary"><Link to="/signup">Conhecer meu painel</Link></Button>
        </div>
      </section>
    </main>

    <footer className="bg-gray-950 px-4 py-10 text-gray-300 sm:px-6">
      <div className="container mx-auto flex max-w-7xl flex-col justify-between gap-4 sm:flex-row">
        <div><p className="text-lg font-bold text-white">AppReview</p><p className="mt-2 text-sm text-gray-400">Assistência de reputação para negócios locais.</p></div>
        <div className="flex flex-wrap gap-5 text-sm"><Link to="/demo">Demonstração</Link><Link to="/termos">Termos</Link><Link to="/privacidade">Privacidade</Link></div>
      </div>
    </footer>
  </div>
);

export default Index;
