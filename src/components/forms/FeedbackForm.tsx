
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
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface FeedbackFormProps {
  businessName: string;
  businessId: string;
  userId?: string;
  rating: 'negative' | 'neutral' | 'positive';
}

const FeedbackForm = ({ 
  businessName, 
  businessId,
  userId,
  rating 
}: FeedbackFormProps) => {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    visitDate: new Date().toISOString().substring(0, 10), // Set today as default
    comment: '',
    internalRating: rating === 'negative' ? '1' : rating === 'neutral' ? '3' : '5',
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSelectChange = (value: string) => {
    setFormData(prev => ({ ...prev, internalRating: value }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Determine the actual user_id if not provided
      let targetUserId = userId;
      
      if (!targetUserId) {
        // Try to get user_id from the qr_codes table
        const { data: qrData, error: qrError } = await supabase
          .from('qr_codes')
          .select('user_id')
          .eq('id', businessId)
          .single();
          
        if (qrError && qrError.code !== 'PGRST116') {
          console.error('Error fetching QR code info:', qrError);
        } else if (qrData) {
          targetUserId = qrData.user_id;
        } else {
          // Fallback to businessId as user_id
          targetUserId = businessId;
        }
      }
      
      // Insert the feedback into the internal_feedback table
      const { error } = await supabase
        .from('internal_feedback')
        .insert([
          {
            user_id: targetUserId,
            customer_name: formData.name,
            customer_email: formData.email,
            rating: parseInt(formData.internalRating),
            feedback_text: formData.comment,
          }
        ]);
        
      if (error) {
        throw error;
      }
      
      toast.success('Feedback enviado com sucesso!');
      navigate('/thank-you');
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast.error('Ocorreu um erro ao enviar o feedback. Tente novamente.');
      setIsSubmitting(false);
    }
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
