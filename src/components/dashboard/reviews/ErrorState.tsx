
import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useOwnerTranslation } from '@/i18n/owner/useOwnerTranslation';

interface ErrorStateProps {
  error: string;
}

const ErrorState: React.FC<ErrorStateProps> = ({ error }) => {
  const { t } = useOwnerTranslation();
  return (
    <>
      <CardHeader>
        <CardTitle>{t('reviews.google.title')}</CardTitle>
        <CardDescription>{t('reviews.google.errorTitle')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-start p-4 rounded-lg bg-amber-50 border border-amber-100">
          <AlertCircle className="h-5 w-5 text-amber-500 mr-3 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-medium text-amber-800">{t('reviews.google.configNeeded')}</h4>
            <p className="text-sm text-amber-700 mt-1">{error}</p>
            <Button
              variant="link"
              className="p-0 mt-2 text-amber-800"
              onClick={() => window.location.href = '/settings'}
            >
              {t('reviews.google.goToSettings')}
            </Button>
          </div>
        </div>
      </CardContent>
    </>
  );
};

export default ErrorState;
