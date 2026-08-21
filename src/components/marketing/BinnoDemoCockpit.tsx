import ApprovedCockpitDashboard from '@/components/dashboard/ApprovedCockpitDashboard';
import { ILLUSTRATIVE_DEMO_FUNNEL, ILLUSTRATIVE_DEMO_SNAPSHOT } from '@/lib/illustrativeDemoSnapshot';
import type { MarketingCopy } from '@/i18n/marketing';

const CockpitHeader = ({ copy }: { copy: MarketingCopy }) => (
  <header className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3"><p className="text-xl font-bold tracking-tight text-[#6D43C0]">Binno</p><span className="hidden h-5 border-l border-slate-200 sm:block" /><p className="text-sm font-medium text-slate-700">{ILLUSTRATIVE_DEMO_SNAPSHOT.business.name}</p></div>
      <span className="rounded-full border border-violet-100 bg-violet-50 px-2.5 py-1 text-[11px] font-medium text-violet-800">{copy.demo.label}</span>
    </div>
  </header>
);

/**
 * Public demonstration and hero use the exact approved cockpit component.
 * The only data source is the isolated illustrative snapshot above.
 */
const BinnoDemoCockpit = ({ copy, compact = false }: { copy: MarketingCopy; compact?: boolean }) => (
  <section className={`overflow-hidden rounded-2xl border border-slate-200 bg-[#f5f7f9] shadow-[0_18px_60px_rgba(15,23,42,0.10)] ${compact ? 'pointer-events-none' : ''}`}>
    <CockpitHeader copy={copy} />
    <div className={compact ? 'max-h-[660px] overflow-hidden p-4 sm:p-5' : 'p-4 sm:p-6'}>
      <ApprovedCockpitDashboard snapshot={ILLUSTRATIVE_DEMO_SNAPSHOT} demo demoFunnel={ILLUSTRATIVE_DEMO_FUNNEL} />
    </div>
  </section>
);

export const SalesCockpitPreview = ({ copy }: { copy: MarketingCopy }) => <BinnoDemoCockpit copy={copy} compact />;

export default BinnoDemoCockpit;
