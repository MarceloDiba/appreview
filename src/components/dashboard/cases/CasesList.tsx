import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star } from 'lucide-react';
import { useInternalFeedback } from '@/hooks/useInternalFeedback';
import { orderPendingCasesByRecency } from '@/lib/internalCasePriority';
import ReplySuggestions from '@/components/dashboard/ReplySuggestions';
import { useOwnerTranslation } from '@/i18n/owner/useOwnerTranslation';

interface CasesListProps {
  userId: string;
  /** Nome do negócio, para assinar as mensagens sugeridas. */
  businessName?: string | null;
  /** `profiles.business_country`, para escolher pt-BR vs. pt-PT na sugestão. */
  businessCountry?: string | null;
}

const CasesList: React.FC<CasesListProps> = ({ userId, businessName, businessCountry }) => {
  const { t, i18n } = useOwnerTranslation();
  const { loading, cases, error, resolvingId, resolveCase } = useInternalFeedback(userId);
  // O caso sem tratar é o que ainda tem prazo; o caso já tratado é histórico.
  // Casos sem tratar vêm primeiro, do mais recente para o mais antigo, na
  // mesma ordem de `orderPendingCasesByRecency`
  // (`src/lib/internalCasePriority.ts`), e só depois os já tratados, na
  // ordem que a busca devolveu. Quem chega pelo bloco "Comentários que pedem
  // atenção" da Visão geral encontra aqui, no topo, o mesmo caso que o
  // bloco destacou, porque os dois consomem a mesma função: não há uma
  // segunda cópia da regra para divergir. Esta ordem vale para toda visita
  // à página, não só para quem chega pelo bloco.
  const orderedCases = useMemo(() => {
    const pending = orderPendingCasesByRecency(cases);
    const resolved = cases.filter((item) => item.is_addressed);
    return [...pending, ...resolved];
  }, [cases]);
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    return new Intl.DateTimeFormat(i18n.resolvedLanguage || i18n.language).format(
      new Date(dateString)
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">
          {t('reviews.cases.loading')}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">
          {error}
        </CardContent>
      </Card>
    );
  }

  if (cases.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">
          {t('reviews.cases.empty')}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {orderedCases.map((item) => {
        const isAddressed = !!item.is_addressed;
        return (
          <Card key={item.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{item.customer_name || t('reviews.cases.anonCustomer')}</span>
                    <span className="text-sm text-gray-500">{formatDate(item.created_at)}</span>
                    <Badge variant={isAddressed ? 'secondary' : 'destructive'}>
                      {isAddressed ? t('reviews.cases.resolved') : t('reviews.cases.open')}
                    </Badge>
                  </div>
                  <div className="flex mt-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={14}
                        className={star <= item.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}
                      />
                    ))}
                  </div>
                  <p className="mt-2 text-gray-700 text-sm">{item.feedback_text}</p>
                  {item.customer_email && (
                    <p className="mt-2 text-xs text-gray-500">{t('reviews.cases.contact')}: {item.customer_email}</p>
                  )}

                  <ReplySuggestions
                    channel="private"
                    rating={item.rating}
                    text={item.feedback_text}
                    customerName={item.customer_name}
                    customerEmail={item.customer_email}
                    businessName={businessName}
                    businessCountry={businessCountry}
                  />
                </div>
                <Button
                  size="sm"
                  variant={isAddressed ? 'outline' : 'default'}
                  disabled={resolvingId === item.id}
                  onClick={() => resolveCase(item.id, !isAddressed)}
                >
                  {isAddressed ? t('reviews.cases.reopen') : t('reviews.cases.markResolved')}
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default CasesList;
