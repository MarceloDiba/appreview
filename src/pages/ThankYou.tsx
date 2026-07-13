
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';

const ThankYou = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md mx-auto p-6 shadow-lg border-0">
        <div className="text-center">
          <div className="mx-auto w-12 h-12 bg-green-100 text-green-500 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="h-6 w-6" />
          </div>
          
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Obrigado pelo seu feedback!
          </h1>

          <p className="text-gray-600 mb-6">
            Recebemos seu relato e ele já está com o responsável do estabelecimento.
            Se você deixou um contato, pode esperar um retorno em breve.
          </p>
          
          <Button asChild>
            <Link to="/">
              Voltar à página inicial
            </Link>
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default ThankYou;
