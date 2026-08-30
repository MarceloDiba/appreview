import { Link } from 'react-router-dom';
import { MailWarning } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useInternalFeedback } from '@/hooks/useInternalFeedback';
import { useOwnerTranslation } from '@/i18n/owner/useOwnerTranslation';

/**
 * O comentário privado com nota baixa é a única coisa do produto que expira:
 * o cliente ainda está no restaurante, ou acabou de sair. Uma avaliação no
 * Google pode esperar até amanhã; este caso não pode.
 *
 * Por isso este bloco é a única exceção à Visão geral fixada pelo contrato de
 * produto: ele existe acima da fila de respostas somente enquanto houver pelo
 * menos um comentário sem tratar em `internal_feedback`, e desaparece por
 * completo assim que não houver nenhum. Sem caso pendente, retorna `null` e a
 * Visão geral fica idêntica à descrita no contrato.
 *
 * Reaproveita `useInternalFeedback`, a mesma fonte usada em `/reviews`, para
 * não criar um segundo caminho de leitura para o mesmo dado.
 */
const PendingCommentsBanner = ({ userId }: { userId?: string }) => {
  const { t, i18n } = useOwnerTranslation();
  const { loading, cases } = useInternalFeedback(userId || '');

  if (loading) return null;

  const pending = cases.filter((item) => !item.is_addressed);
  if (pending.length === 0) return null;

  const oldest = pending.reduce((older, current) => {
    const olderTime = older.created_at ? new Date(older.created_at).getTime() : 0;
    const currentTime = current.created_at ? new Date(current.created_at).getTime() : 0;
    return currentTime < olderTime ? current : older;
  });
  const quote = oldest.feedback_text?.trim();
  const who = oldest.customer_name?.trim() || t('dashboard.cockpit.layout.anonymousReviewer');
  const locale = i18n.resolvedLanguage || i18n.language;
  const dateLabel = oldest.created_at
    ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(oldest.created_at))
    : '';

  return (
    <Card className="border-red-200 bg-red-50/70 shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-700">
            <MailWarning className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold text-slate-950">
              {t('dashboard.cockpit.layout.pendingCommentsTitle')}
            </h2>
            <p className="mt-1 text-sm leading-5 text-slate-700">
              {t('dashboard.cockpit.layout.pendingCommentsCount', { count: pending.length })}
            </p>
            <div className="mt-3 rounded-lg bg-white/70 p-3 text-sm leading-5 text-slate-700">
              <p className="font-medium text-slate-900">
                {who}
                {dateLabel ? ` · ${dateLabel}` : ''}
              </p>
              {quote && (
                <p className="mt-1">
                  {t('dashboard.cockpit.layout.pendingCommentsQuote', { quote })}
                </p>
              )}
            </div>
            <div className="mt-4">
              <Button asChild className="rounded-full bg-[#2457D6] hover:bg-[#1d47b0]">
                <Link to="/reviews">{t('dashboard.cockpit.layout.pendingCommentsAction')}</Link>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PendingCommentsBanner;
