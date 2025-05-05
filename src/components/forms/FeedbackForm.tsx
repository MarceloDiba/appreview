
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface FeedbackFormProps {
  businessName: string;
  businessId: string;
  rating: 'negative' | 'neutral' | 'positive';
}

const FeedbackForm = ({ 
  businessName, 
  businessId, 
  rating 
}: FeedbackFormProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    visitDate: '',
    comment: '',
    internalRating: '1',
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSelectChange = (value: string) => {
    setFormData(prev => ({ ...prev, internalRating: value }));
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Here you would typically send the data to your backend
    // For now, we'll just simulate a successful submission
    setTimeout(() => {
      setIsSubmitting(false);
      toast({
        title: 'Feedback enviado',
        description: 'Obrigado pelo seu feedback!',
      });
      navigate('/thank-you');
    }, 1000);
  };
  
  return (
    <Card className="w-full max-w-md mx-auto p-6">
      <div className="text-center mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-gray-800">
          {rating === 'negative' 
            ? 'Sentimos muito pela sua experiência'
            : 'Conte-nos mais sobre sua experiência'
          }
        </h2>
        <p className="text-gray-600 mt-2">{businessName}</p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nome</Label>
          <Input
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            placeholder="Seu nome"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            required
            placeholder="seu@email.com"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="visitDate">Data da visita</Label>
          <Input
            id="visitDate"
            name="visitDate"
            type="date"
            value={formData.visitDate}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="internalRating">Nota interna (1-5)</Label>
          <Select 
            name="internalRating" 
            value={formData.internalRating}
            onValueChange={handleSelectChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione uma nota" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 - Muito ruim</SelectItem>
              <SelectItem value="2">2 - Ruim</SelectItem>
              <SelectItem value="3">3 - Regular</SelectItem>
              <SelectItem value="4">4 - Bom</SelectItem>
              <SelectItem value="5">5 - Excelente</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="comment">Comentário</Label>
          <Textarea
            id="comment"
            name="comment"
            value={formData.comment}
            onChange={handleChange}
            required
            placeholder="Conte-nos mais sobre sua experiência..."
            rows={5}
          />
        </div>
        
        <div className="pt-2">
          <Button 
            type="submit" 
            className="w-full" 
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Enviando...' : 'Enviar feedback'}
          </Button>
        </div>
      </form>
      
      <div className="mt-4 text-center">
        <Button 
          variant="link" 
          className="text-gray-500 text-sm hover:text-primary"
          onClick={() => window.history.back()}
        >
          Voltar
        </Button>
      </div>
    </Card>
  );
};

export default FeedbackForm;
