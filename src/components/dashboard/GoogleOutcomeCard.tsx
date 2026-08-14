import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ExternalLink, QrCode, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useGoogleOutcome } from '@/hooks/useGoogleOutcome';
import { useOwnerTranslation } from '@/i18n/owner/useOwnerTranslation';

interface GoogleOutcomeCardProps {
  userId?: string;
}

const GoogleOutcomeCard = ({ userId }: GoogleOutcomeCardProps) => {
  const { t, i18n } = useOwnerTranslation();
  const { data, loading, error } = useGoogleOutcome(userId);
  const locale = i18n.language;

  if (loading) {
    return <Card className="h-64 animate-pulse bg-white" />;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-gray-600">
          {t('dashboard.googleOutcome.loadError')}
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('dashboard.googleOutcome.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">{t('dashboard.googleOutcome.empty')}</p>
          <Button asChild className="mt-4">
            <Link to="/settings">{t('dashboard.googleOutcome.configure')}</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const integer = new Intl.NumberFormat(locale);
  const decimal = new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const percent = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  const hasGoogleChange = data.reviewGrowth !== null && data.ratingChange !== null;

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>{t('dashboard.googleOutcome.title')}</CardTitle>
            <p className="mt-1 text-sm text-gray-600">{data.placeName}</p>
          </div>
          <span className="text-xs text-gray-500">
            {t('dashboard.googleOutcome.lastUpdate', {
              date: new Intl.DateTimeFormat(locale, { dateStyle: 'short' }).format(new Date(data.lastUpdatedAt)),
            })}
          </span>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-amber-50 p-4">
            <Star className="h-5 w-5 fill-amber-400 text-amber-400" aria-hidden="true" />
            <p className="mt-3 text-2xl font-bold">{decimal.format(data.averageRating)}</p>
            <p className="text-sm text-gray-600">
              {t('dashboard.googleOutcome.googleTotal', { count: integer.format(data.totalReviews) })}
            </p>
          </div>
          <div className="rounded-xl bg-violet-50 p-4">
            <QrCode className="h-5 w-5 text-primary" aria-hidden="true" />
            <p className="mt-3 text-2xl font-bold">{integer.format(data.qrOpens)}</p>
            <p className="text-sm text-gray-600">{t('dashboard.googleOutcome.qrOpens')}</p>
          </div>
          <div className="rounded-xl bg-blue-50 p-4">
            <ExternalLink className="h-5 w-5 text-blue-600" aria-hidden="true" />
            <p className="mt-3 text-2xl font-bold">{integer.format(data.googleClicks)}</p>
            <p className="text-sm text-gray-600">{t('dashboard.googleOutcome.googleClicks')}</p>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-gray-200 p-4">
          {hasGoogleChange ? (
            <p className="font-medium text-gray-900">
              {t('dashboard.googleOutcome.change', {
                reviews: integer.format(data.reviewGrowth || 0),
                rating: `${(data.ratingChange || 0) >= 0 ? '+' : ''}${decimal.format(data.ratingChange || 0)}`,
              })}
            </p>
          ) : (
            <p className="font-medium text-gray-900">{t('dashboard.googleOutcome.noBaseline')}</p>
          )}
          <p className="mt-1 text-sm text-gray-600">
            {data.clickThroughRate === null
              ? t('dashboard.googleOutcome.noClickRate')
              : t('dashboard.googleOutcome.clickRate', { rate: percent.format(data.clickThroughRate) })}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-gray-500">
            {t('dashboard.googleOutcome.disclaimer')}
          </p>
        </div>

        <Button asChild variant="link" className="mt-4 h-auto p-0">
          <Link to="/reviews">
            {t('dashboard.googleOutcome.openReviews')}
            <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
};

export default GoogleOutcomeCard;
