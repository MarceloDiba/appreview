import { Star } from 'lucide-react';
import { useOwnerTranslation } from '@/i18n/owner/useOwnerTranslation';

/**
 * As estrelas, num sitio so.
 *
 * Extraido de `ApprovedCockpitDashboard` em 04/09/2026, para a fila de
 * respostas poder sair para ficheiro proprio sem import circular: os dois
 * precisam disto, e o cartao da reputacao tambem.
 */
export const Stars = ({ rating, medium = false }: { rating: number; medium?: boolean }) => {
  const { t } = useOwnerTranslation();
  return (
    <span className="flex" aria-label={t('dashboard.cockpit.approved.starsLabel', { rating })}>
      {[1, 2, 3, 4, 5].map((star) => <Star key={star} className={`${medium ? 'h-5 w-5' : 'h-3.5 w-3.5'} ${star <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />)}
    </span>
  );
};