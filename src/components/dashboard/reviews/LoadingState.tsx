
import React from 'react';
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useOwnerTranslation } from '@/i18n/owner/useOwnerTranslation';

const LoadingState: React.FC = () => {
  const { t } = useOwnerTranslation();
  return (
    <>
      <CardHeader>
        <CardTitle>{t('reviews.google.title')}</CardTitle>
        <CardDescription>{t('reviews.google.loading')}</CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </CardContent>
    </>
  );
};

export default LoadingState;
