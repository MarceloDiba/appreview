import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { User, X, Info } from 'lucide-react';

// Função para validar UUID
function isUUID(value: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

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
  rating,
}: FeedbackFormProps) => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    comentario: '',
    notaInterna: rating === 'negative' ? '1' : rating === 'neutral' ? '3' : '5',
  });

  const [enviando, setEnviando] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleClickEstrela = (index: number) => {
    setFormData(prev => ({ ...prev, notaInterna: (index + 1).toString() }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);

    try {
      let idUsuario = userId;

      if (!idUsuario) {
        const { data: qrData, error: qrError } = await supabase
          .from('qr_codes')
          .select('user_id')
          .eq('id', businessId)
          .single();

        if (!qrError && qrData) {
          idUsuario = qrData.user_id;
        } else {
          idUsuario = businessId;
        }
      }

      const { error } = await supabase.from('internal_feedback').insert([
        {
          user_id: isUUID(idUsuario) ? idUsuario : null,
          feedback_text: formData.comentario,
        },
      ]);

      if (error) throw error;

      toast.success('Feedback enviado com sucesso!');
      navigate('/thank-you');
    } catch (error: any) {
      console.error('Erro ao enviar feedback:', error);
      toast.error(`Erro: ${error.message || 'Erro desconhecido ao enviar o feedback.'}`);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md rounded-2xl p-6 shadow-lg bg-white relative">
        {/* Botão Voltar */}
        <button
          onClick={() => window.history.back()}
          className="absolute left-4 top-4 text-gray-500 hover:text-gray-700"
        >
          <X size={20} />
        </button>

        {/* Botão Postar */}
        <button
          type="submit"
          onClick={handleSubmit}
          disabled={enviando}
          className="absolute right-4 top-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-full text-sm font-medium"
        >
          {enviando ? 'Enviando...' : 'Postar'}
        </button>

        {/* Cabeçalho */}
        <div className="flex flex-col items-start gap-3 pt-10 pb-6">
          <div className="flex items-center gap-3">
            <div className="bg-white text-gray-500 rounded-full w-10 h-10 flex items-center justify-center border border-gray-300">
              <User size={20} className="text-gray-500" />
            </div>
            <div className="text-left">
              <h2 className="text-base font-medium">
                {rating === 'negative' ? 'Usuário' : 'Como foi sua experiência?'}
              </h2>
              <div className="flex items-center gap-1">
                <span className="text-sm text-gray-500">Postar publicamente</span>
                <Info size={14} className="text-gray-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Estrelas */}
        <div className="flex justify-center gap-1 mb-6">
          {[...Array(5)].map((_, i) => {
            const isSelected = i < parseInt(formData.notaInterna);
            return (
              <svg
                key={i}
                onClick={() => handleClickEstrela(i)}
                className={`w-8 h-8 cursor-pointer transition-all duration-150 ${
                  isSelected
                    ? 'text-yellow-400 fill-yellow-400'
                    : 'text-gray-300 fill-gray-300'
                } hover:text-yellow-400 hover:fill-yellow-400`}
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
              </svg>
            );
          })}
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <p className="text-sm text-black-500 text-left">
            Conte mais sobre a sua experiência
          </p>

          <Textarea
            id="comentario"
            name="comentario"
            value={formData.comentario}
            onChange={handleChange}
            required
            placeholder="Conte como foi sua experiência neste lugar"
            rows={4}
            className="resize-none border border-blue-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl text-base p-4"
          />
        </form>
      </Card>
    </div>
  );
};

export default FeedbackForm;
