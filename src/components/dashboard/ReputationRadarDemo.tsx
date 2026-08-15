import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  ImagePlus,
  MessageSquareText,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useOwnerTranslation } from '@/i18n/owner/useOwnerTranslation';

type RadarState = 'stable' | 'risk' | 'strength' | 'opportunity';

const radarStates: RadarState[] = ['risk', 'strength', 'opportunity', 'stable'];

const ExampleBadge = ({ label }: { label: string }) => (
  <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-500">
    {label}
  </span>
);

const ReputationRadarDemo = () => {
  const { t } = useOwnerTranslation();
  const [expanded, setExpanded] = useState<RadarState | null>('risk');

  const content = useMemo(() => ({
    stable: {
      icon: CheckCircle2,
      tone: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
      border: 'border-emerald-200',
      eyebrow: t('dashboard.radar.states.stable.eyebrow'),
      title: t('dashboard.radar.states.stable.title'),
      body: t('dashboard.radar.states.stable.body'),
      action: t('dashboard.radar.states.stable.action'),
      detail: t('dashboard.radar.states.stable.detail'),
    },
    risk: {
      icon: AlertTriangle,
      tone: 'bg-amber-50 text-amber-800 ring-amber-100',
      border: 'border-amber-200',
      eyebrow: t('dashboard.radar.states.risk.eyebrow'),
      title: t('dashboard.radar.states.risk.title'),
      body: t('dashboard.radar.states.risk.body'),
      action: t('dashboard.radar.states.risk.action'),
      detail: t('dashboard.radar.states.risk.detail'),
    },
    strength: {
      icon: TrendingUp,
      tone: 'bg-blue-50 text-[#2457D6] ring-blue-100',
      border: 'border-blue-100',
      eyebrow: t('dashboard.radar.states.strength.eyebrow'),
      title: t('dashboard.radar.states.strength.title'),
      body: t('dashboard.radar.states.strength.body'),
      action: t('dashboard.radar.states.strength.action'),
      detail: t('dashboard.radar.states.strength.detail'),
    },
    opportunity: {
      icon: Sparkles,
      tone: 'bg-violet-50 text-[#6D43C0] ring-violet-100',
      border: 'border-violet-200',
      eyebrow: t('dashboard.radar.states.opportunity.eyebrow'),
      title: t('dashboard.radar.states.opportunity.title'),
      body: t('dashboard.radar.states.opportunity.body'),
      action: t('dashboard.radar.states.opportunity.action'),
      detail: t('dashboard.radar.states.opportunity.detail'),
    },
  }), [t]);

  const priority = content.risk;
  const PriorityIcon = priority.icon;

  return (
    <div className="min-h-screen bg-[#f5f7f9] px-4 pb-12 pt-24">
      <div className="container mx-auto max-w-6xl">
        <header className="mb-6 flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6D43C0]">{t('dashboard.radar.eyebrow')}</p>
              <ExampleBadge label={t('dashboard.radar.exampleBadge')} />
            </div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{t('dashboard.radar.title')}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">{t('dashboard.radar.subtitle')}</p>
          </div>
          <Link to="/demo?view=panel" className="text-sm font-medium text-[#2457D6] hover:text-[#1d47b0]">{t('dashboard.radar.back')} <ArrowRight className="ml-1 inline h-4 w-4" /></Link>
        </header>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
          <section className="min-w-0 space-y-4">
            <Card className="overflow-hidden rounded-xl border-amber-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
              <CardContent className="p-0">
                <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-7">
                  <div className="flex gap-4">
                    <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ring-4 ${priority.tone}`}><PriorityIcon className="h-5 w-5" aria-hidden="true" /></span>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{t('dashboard.radar.todayLabel')}</p>
                      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{priority.title}</h2>
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{priority.body}</p>
                    </div>
                  </div>
                  <ExampleBadge label={t('dashboard.radar.exampleBadge')} />
                </div>
                <div className="flex flex-col gap-3 border-t border-amber-100 bg-amber-50/50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
                  <p className="text-sm font-medium text-slate-800">{priority.detail}</p>
                  <Button asChild className="shrink-0 rounded-full bg-[#2457D6] hover:bg-[#1d47b0]"><Link to="/demo?view=queue">{priority.action}<ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
                </div>
              </CardContent>
            </Card>

            <div>
              <h2 className="text-lg font-semibold tracking-tight text-slate-950">{t('dashboard.radar.allSignals.title')}</h2>
              <p className="mt-1 text-sm text-slate-500">{t('dashboard.radar.allSignals.subtitle')}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {radarStates.map((state) => {
                const item = content[state];
                const Icon = item.icon;
                const isExpanded = expanded === state;

                return (
                  <Card key={state} className={`rounded-xl bg-white shadow-sm transition-colors ${isExpanded ? item.border : 'border-slate-200'}`}>
                    <CardContent className="p-5">
                      <div className="flex gap-3">
                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-2 ${item.tone}`}><Icon className="h-4 w-4" aria-hidden="true" /></span>
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">{item.eyebrow}</p>
                          <h3 className="mt-1 text-base font-semibold leading-5 text-slate-950">{item.title}</h3>
                        </div>
                      </div>
                      <p className="mt-3 text-sm leading-5 text-slate-600">{item.detail}</p>
                      <button
                        type="button"
                        aria-expanded={isExpanded}
                        onClick={() => setExpanded(isExpanded ? null : state)}
                        className="mt-4 text-sm font-medium text-[#2457D6] hover:text-[#1d47b0]"
                      >
                        {isExpanded ? t('dashboard.radar.allSignals.hideEvidence') : t('dashboard.radar.allSignals.showEvidence')}
                      </button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {expanded === 'risk' && (
              <Card className="rounded-xl border-amber-200 bg-white shadow-sm"><CardContent className="p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold text-slate-950">{t('dashboard.radar.riskEvidence.title')}</h2><p className="mt-1 text-sm text-slate-500">{t('dashboard.radar.riskEvidence.subtitle')}</p></div><span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">3</span></div>
                <div className="mt-5 divide-y divide-slate-200 rounded-lg border border-slate-200">
                  {['mariana', 'ricardo', 'bia'].map((review) => <div key={review} className="p-3.5"><div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold text-slate-900">{t(`dashboard.radar.riskEvidence.${review}.name`)}</p><p className="text-xs text-slate-500">{t(`dashboard.radar.riskEvidence.${review}.date`)}</p></div><p className="mt-1 text-sm text-slate-600">“{t(`dashboard.radar.riskEvidence.${review}.quote`)}”</p></div>)}
                </div>
              </CardContent></Card>
            )}

            {expanded === 'strength' && (
              <Card className="rounded-xl border-blue-100 bg-white shadow-sm"><CardContent className="grid gap-5 p-5 sm:grid-cols-[0.75fr_1.25fr] sm:p-6">
                <div className="rounded-lg bg-blue-50 p-5"><p className="text-sm font-medium text-[#2457D6]">{t('dashboard.radar.strengthEvidence.metric')}</p><p className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">18</p><p className="mt-1 text-sm text-slate-600">{t('dashboard.radar.strengthEvidence.metricDetail')}</p></div>
                <div><h2 className="font-semibold text-slate-950">{t('dashboard.radar.strengthEvidence.title')}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{t('dashboard.radar.strengthEvidence.body')}</p><div className="mt-4 flex flex-wrap gap-2">{['cordialidade', 'agilidade', 'atenção'].map((topic) => <span key={topic} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600">{t(`dashboard.radar.strengthEvidence.topics.${topic}`)}</span>)}</div></div>
              </CardContent></Card>
            )}

            {expanded === 'opportunity' && (
              <Card className="rounded-xl border-violet-200 bg-white shadow-sm"><CardContent className="p-5 sm:p-6"><div className="flex gap-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-50 text-[#6D43C0]"><ImagePlus className="h-5 w-5" /></span><div><h2 className="font-semibold text-slate-950">{t('dashboard.radar.opportunityEvidence.title')}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{t('dashboard.radar.opportunityEvidence.body')}</p></div></div><div className="mt-5 grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2"><p className="text-sm text-slate-700"><strong className="block text-slate-950">9</strong>{t('dashboard.radar.opportunityEvidence.praise')}</p><p className="text-sm text-slate-700"><strong className="block text-slate-950">0</strong>{t('dashboard.radar.opportunityEvidence.photos')}</p></div></CardContent></Card>
            )}

            {expanded === 'stable' && (
              <Card className="rounded-xl border-emerald-200 bg-white shadow-sm"><CardContent className="flex gap-4 p-5 sm:p-6"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700"><CheckCircle2 className="h-5 w-5" /></span><div><h2 className="font-semibold text-slate-950">{content.stable.title}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{content.stable.body}</p></div></CardContent></Card>
            )}
          </section>

          <aside className="space-y-4">
            <Card className="rounded-xl border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]"><CardContent className="p-5"><div className="flex items-start gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50"><MessageSquareText className="h-4 w-4 text-[#2457D6]" /></span><div><h2 className="font-semibold text-slate-950">{t('dashboard.radar.sources.title')}</h2><p className="mt-1 text-sm leading-5 text-slate-500">{t('dashboard.radar.sources.subtitle')}</p></div></div><dl className="mt-5 divide-y divide-slate-200 rounded-lg border border-slate-200"><div className="flex items-center justify-between gap-3 p-3"><dt className="text-xs text-slate-500">{t('dashboard.radar.sources.period')}</dt><dd className="text-xs font-medium text-slate-900">14 jul — 14 ago</dd></div><div className="flex items-center justify-between gap-3 p-3"><dt className="text-xs text-slate-500">{t('dashboard.radar.sources.reviews')}</dt><dd className="text-xs font-medium text-slate-900">94</dd></div><div className="flex items-center justify-between gap-3 p-3"><dt className="text-xs text-slate-500">{t('dashboard.radar.sources.profile')}</dt><dd className="text-xs font-medium text-slate-900">{t('dashboard.radar.sources.profileValue')}</dd></div></dl></CardContent></Card>
            <Card className="rounded-xl border-slate-200 bg-white shadow-sm"><CardContent className="p-5"><Clock3 className="h-5 w-5 text-[#6D43C0]" /><h2 className="mt-3 font-semibold text-slate-950">{t('dashboard.radar.quiet.title')}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{t('dashboard.radar.quiet.body')}</p></CardContent></Card>
          </aside>
        </div>

        <p className="mt-5 text-center text-xs leading-5 text-slate-500">{t('dashboard.radar.disclaimer')}</p>
      </div>
    </div>
  );
};

export default ReputationRadarDemo;
