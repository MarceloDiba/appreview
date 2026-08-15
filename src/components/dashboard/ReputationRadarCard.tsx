import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, CheckCircle2, Clock3, Link2, Sparkles, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useOwnerTranslation } from '@/i18n/owner/useOwnerTranslation';
import { RadarSignal } from '@/lib/reputationRadar';
import { useReputationRadar } from '@/hooks/useReputationRadar';

const SignalCard = ({ signal }: { signal: RadarSignal }) => {
  const { t } = useOwnerTranslation();
  const isConcern = signal.kind === 'recurring-concern';
  const Icon = isConcern ? AlertTriangle : TrendingUp;
  const color = isConcern
    ? 'bg-amber-50 text-amber-800 ring-amber-100'
    : 'bg-blue-50 text-[#2457D6] ring-blue-100';

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex gap-3">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-2 ${color}`}><Icon className="h-4 w-4" aria-hidden="true" /></span>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">
            {isConcern ? t('dashboard.radarLive.signals.concernLabel') : t('dashboard.radarLive.signals.strengthLabel')}
          </p>
          <p className="mt-1 text-sm font-semibold leading-5 text-slate-950">
            {isConcern
              ? t('dashboard.radarLive.signals.concernTitle', { theme: t(`dashboard.radarLive.themes.${signal.theme}`) })
              : t('dashboard.radarLive.signals.strengthTitle', { theme: t(`dashboard.radarLive.themes.${signal.theme}`) })}
          </p>
          <p className="mt-2 text-xs leading-5 text-slate-600">{t('dashboard.radarLive.signals.evidence', { count: signal.mentions, days: signal.days })}</p>
        </div>
      </div>
    </div>
  );
};

const ReputationRadarCard = ({ userId }: { userId?: string }) => {
  const { t, i18n } = useOwnerTranslation();
  const state = useReputationRadar(userId);

  if (state.status === 'loading') {
    return <Card className="h-64 animate-pulse rounded-xl border-slate-200 bg-white" />;
  }

  if (state.status === 'error') {
    return (
      <Card className="rounded-xl border-slate-200 bg-white shadow-sm"><CardContent className="p-5">
        <h2 className="text-lg font-semibold text-slate-950">{t('dashboard.radarLive.title')}</h2>
        <p className="mt-2 text-sm text-slate-600">{t('dashboard.radarLive.error')}</p>
      </CardContent></Card>
    );
  }

  if (state.status === 'needs-connection') {
    return (
      <Card className="rounded-xl border-blue-100 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]"><CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[#2457D6]"><Link2 className="h-5 w-5" /></span><div><p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#6D43C0]">{t('dashboard.radarLive.title')}</p><h2 className="mt-1 text-lg font-semibold text-slate-950">{t('dashboard.radarLive.connection.title')}</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">{t('dashboard.radarLive.connection.body')}</p></div></div>
        <Button asChild className="shrink-0 rounded-full bg-[#2457D6] hover:bg-[#1d47b0]"><Link to="/settings">{t('dashboard.radarLive.connection.action')}<ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
      </CardContent></Card>
    );
  }

  if (state.status === 'sync-incomplete') {
    return (
      <Card className="rounded-xl border-amber-200 bg-white shadow-sm"><CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-800"><Clock3 className="h-5 w-5" /></span><div><p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#6D43C0]">{t('dashboard.radarLive.title')}</p><h2 className="mt-1 text-lg font-semibold text-slate-950">{t('dashboard.radarLive.syncing.title')}</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">{t('dashboard.radarLive.syncing.body')}</p></div></div>
        <Button asChild variant="outline" className="shrink-0 rounded-full"><Link to="/reviews">{t('dashboard.radarLive.syncing.action')}<ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
      </CardContent></Card>
    );
  }

  const { result } = state;
  const lastSynced = state.lastSyncedAt
    ? new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(state.lastSyncedAt))
    : null;
  const hasPriority = result.unansweredCount > 0;

  return (
    <Card className="overflow-hidden rounded-xl border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
      <CardContent className="p-0">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6D43C0]">{t('dashboard.radarLive.title')}</p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">{hasPriority ? t('dashboard.radarLive.priority.title', { count: result.unansweredCount }) : t('dashboard.radarLive.clear.title')}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{hasPriority ? t('dashboard.radarLive.priority.body', { count: result.lowRatingUnansweredCount }) : t('dashboard.radarLive.clear.body')}</p>
          </div>
          {hasPriority ? <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-800"><AlertTriangle className="h-5 w-5" /></span> : <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700"><CheckCircle2 className="h-5 w-5" /></span>}
        </div>

        <div className="border-t border-slate-200 bg-slate-50/70 p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium text-slate-800">{t('dashboard.radarLive.source', { count: result.importedReviewCount })}{lastSynced ? ` · ${t('dashboard.radarLive.lastSynced', { date: lastSynced })}` : ''}</p>
            {hasPriority && <Button asChild className="shrink-0 rounded-full bg-[#2457D6] hover:bg-[#1d47b0]"><Link to="/reviews">{t('dashboard.radarLive.priority.action')}<ArrowRight className="ml-2 h-4 w-4" /></Link></Button>}
          </div>

          {result.signals.length > 0 ? (
            <div className="mt-4 grid gap-3 md:grid-cols-2">{result.signals.map((signal) => <SignalCard key={`${signal.kind}-${signal.theme}`} signal={signal} />)}</div>
          ) : (
            <p className="mt-4 text-sm text-slate-600">{t('dashboard.radarLive.noPatterns')}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ReputationRadarCard;
