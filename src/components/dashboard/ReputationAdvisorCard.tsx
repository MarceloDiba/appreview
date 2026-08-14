import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bot, Check, Copy, ExternalLink, MessageSquareQuote, Star } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useOwnerTranslation } from '@/i18n/owner/useOwnerTranslation';
import { useReputationAdvisor } from '@/hooks/useReputationAdvisor';

interface ReputationAdvisorCardProps {
  userId?: string;
}

const ReputationAdvisorCard = ({ userId }: ReputationAdvisorCardProps) => {
  const { t, i18n } = useOwnerTranslation();
  const { review, loading, error } = useReputationAdvisor(userId);
  const [copied, setCopied] = useState(false);

  const copySuggestion = async () => {
    if (!review?.suggestedReply) return;
    try {
      await navigator.clipboard.writeText(review.suggestedReply);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
      toast.success(t('dashboard.advisor.copied'));
    } catch {
      toast.error(t('dashboard.advisor.copyError'));
    }
  };

  if (loading) return <Card className="mb-6 h-48 animate-pulse bg-white" />;

  return (
    <Card className="mb-6 overflow-hidden border-violet-200">
      <CardHeader className="border-b bg-violet-50/60 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white">
              <Bot className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <CardTitle>{t('dashboard.advisor.title')}</CardTitle>
              <p className="mt-1 text-sm text-gray-600">{t('dashboard.advisor.subtitle')}</p>
            </div>
          </div>
          <span className="rounded-full border bg-white px-3 py-1 text-xs text-gray-600">
            {t('dashboard.advisor.localBadge')}
          </span>
        </div>
      </CardHeader>

      <CardContent className="p-5">
        {error ? (
          <p className="text-sm text-gray-600">{t('dashboard.advisor.error')}</p>
        ) : !review ? (
          <div>
            <p className="font-medium text-gray-900">{t('dashboard.advisor.emptyTitle')}</p>
            <p className="mt-1 text-sm text-gray-600">{t('dashboard.advisor.emptyBody')}</p>
            <Button asChild variant="link" className="mt-3 h-auto p-0">
              <Link to="/reviews">{t('dashboard.advisor.openReviews')}</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            <section>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                {review.rating <= 3
                  ? t('dashboard.advisor.attentionLabel')
                  : t('dashboard.advisor.recentLabel')}
              </p>
              <div className="mt-3 rounded-xl border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{review.authorName}</p>
                    <p className="text-xs text-gray-500">
                      {new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' }).format(new Date(review.time))}
                    </p>
                  </div>
                  <div className="flex" aria-label={t('dashboard.advisor.ratingAria', { rating: review.rating })}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className={`h-4 w-4 ${star <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
                    ))}
                  </div>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-gray-700">{review.text}</p>
                {review.googleMapsUri && (
                  <a href={review.googleMapsUri} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center text-xs font-medium text-primary hover:underline">
                    {t('dashboard.advisor.source')}<ExternalLink className="ml-1 h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </section>

            <section>
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
                <MessageSquareQuote className="h-4 w-4" />{t('dashboard.advisor.replyLabel')}
              </p>
              <div className="mt-3 rounded-xl border border-violet-100 bg-violet-50/50 p-4">
                <p className="text-sm leading-relaxed text-gray-700">{review.suggestedReply}</p>
                <div className="mt-4 flex flex-wrap gap-2 border-t border-violet-100 pt-3">
                  <Button size="sm" variant="outline" onClick={() => void copySuggestion()}>
                    {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                    {copied ? t('dashboard.advisor.copiedButton') : t('dashboard.advisor.copy')}
                  </Button>
                  <Button asChild size="sm" variant="ghost">
                    <Link to="/reviews">{t('dashboard.advisor.edit')}</Link>
                  </Button>
                </div>
              </div>
              <p className="mt-3 text-xs text-gray-500">{t('dashboard.advisor.disclaimer')}</p>
            </section>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ReputationAdvisorCard;
