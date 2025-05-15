
import React from 'react';
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const LoadingState: React.FC = () => {
  return (
    <>
      <CardHeader>
        <CardTitle>Avaliações do Google</CardTitle>
        <CardDescription>Carregando avaliações...</CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </CardContent>
    </>
  );
};

export default LoadingState;
