import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star } from 'lucide-react';
import { useInternalFeedback } from '@/hooks/useInternalFeedback';

interface CasesListProps {
  userId: string;
}

const formatDate = (dateString: string | null) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('pt-BR');
};

const CasesList: React.FC<CasesListProps> = ({ userId }) => {
  const { loading, cases, error, resolvingId, resolveCase } = useInternalFeedback(userId);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">
          Carregando casos...
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">
          Erro ao carregar casos: {error}
        </CardContent>
      </Card>
    );
  }

  if (cases.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">
          Nenhum caso ainda. Quando alguém avaliar "Ruim" no Smiley, o caso aparece aqui na hora.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {cases.map((item) => {
        const isAddressed = !!item.is_addressed;
        return (
          <Card key={item.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{item.customer_name || 'Cliente anônimo'}</span>
                    <span className="text-sm text-gray-500">{formatDate(item.created_at)}</span>
                    <Badge variant={isAddressed ? 'secondary' : 'destructive'}>
                      {isAddressed ? 'Resolvido' : 'Aberto'}
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
                    <p className="mt-2 text-xs text-gray-500">Contato: {item.customer_email}</p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant={isAddressed ? 'outline' : 'default'}
                  disabled={resolvingId === item.id}
                  onClick={() => resolveCase(item.id, !isAddressed)}
                >
                  {isAddressed ? 'Reabrir' : 'Marcar como resolvido'}
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
