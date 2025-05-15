
import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ErrorStateProps {
  error: string;
}

const ErrorState: React.FC<ErrorStateProps> = ({ error }) => {
  return (
    <>
      <CardHeader>
        <CardTitle>Avaliações do Google</CardTitle>
        <CardDescription>Erro ao carregar avaliações</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-start p-4 rounded-lg bg-amber-50 border border-amber-100">
          <AlertCircle className="h-5 w-5 text-amber-500 mr-3 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-medium text-amber-800">Configuração necessária</h4>
            <p className="text-sm text-amber-700 mt-1">{error}</p>
            <Button 
              variant="link" 
              className="p-0 mt-2 text-amber-800"
              onClick={() => window.location.href = '/settings'}
            >
              Ir para Configurações
            </Button>
          </div>
        </div>
      </CardContent>
    </>
  );
};

export default ErrorState;
