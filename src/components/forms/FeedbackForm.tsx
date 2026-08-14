import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { X, Send, ExternalLink } from 'lucide-react';
import { useTranslation } from '@/i18n/useTranslation';

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
  /**
   * Public review destinations. These must always be offered, whatever the
   * rating — routing a customer away from public review based on sentiment is
   * review gating, which Google prohibits and the EU Omnibus Directive bans.
   */
  googleReviewUrl?: string;
  tripAdvisorUrl?: string;
}

const FeedbackForm = ({
  businessName,
  businessId,
  userId,
  rating,
  googleReviewUrl,
  tripAdvisorUrl,
}: FeedbackFormProps) => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [formData, setFormData] = useState({
    comentario: '',
    nome: '',
    contato: '',
    notaInterna: rating === 'negative' ? '1' : rating === 'neutral' ? '3' : '5',
  });

  const [enviando, setEnviando] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
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
        }
      }

      if (!idUsuario || !isUUID(idUsuario)) {
        toast.error('Não foi possível identificar o estabelecimento. Tente novamente pelo QR Code.');
        setEnviando(false);
        return;
      }

      const { error } = await supabase.from('internal_feedback').insert([
        {
          user_id: idUsuario,
          qr_code_id: businessId,
          feedback_text: formData.comentario,
          rating: parseInt(formData.notaInterna, 10),
          customer_name: formData.nome || null,
          customer_email: formData.contato || null,
        },
      ]);

      if (error) throw error;

      toast.success('Feedback enviado! O estabelecimento já foi avisado.');
      // Carry the public review links forward so the option stays available
      // after submitting — the thank-you page is not a dead end.
      navigate('/thank-you', {
        state: { businessName, googleReviewUrl, tripAdvisorUrl },
      });
    } catch (error: unknown) {
      console.error('Erro ao enviar feedback:', error);
      const message = error instanceof Error ? error.message : 'Erro desconhecido ao enviar o feedback.';
      toast.error(`Erro: ${message}`);
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

        {/* Botão Enviar */}
        <button
          type="submit"
          onClick={handleSubmit}
          disabled={enviando}
          className="absolute right-4 top-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-full text-sm font-medium"
        >
          {enviando ? t('formSending') : t('formSend')}
        </button>

        {/* Cabeçalho */}
        <div className="flex flex-col items-start gap-3 pt-10 pb-6">
          <div className="text-left">
            <h2 className="text-base font-medium">
              {t('formTitle')}
            </h2>
            <div className="flex items-start gap-1 mt-1">
              <Send size={14} className="text-gray-500 mt-0.5 flex-shrink-0" />
              <span className="text-sm text-gray-500">
                {t('formSubtitle', { business: businessName })}
              </span>
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
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <p className="text-sm text-black-500 text-left mb-2">
              {t('formCommentLabel')}
            </p>
            <Textarea
              id="comentario"
              name="comentario"
              value={formData.comentario}
              onChange={handleChange}
              required
              placeholder={t('formCommentPlaceholder')}
              rows={4}
              className="resize-none border border-blue-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl text-base p-4"
            />
          </div>

          <div>
            <Label htmlFor="nome" className="text-sm text-gray-600">{t('formNameLabel')}</Label>
            <Input
              id="nome"
              name="nome"
              value={formData.nome}
              onChange={handleChange}
              placeholder={t('formNamePlaceholder')}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="contato" className="text-sm text-gray-600">{t('formContactLabel')}</Label>
            <Input
              id="contato"
              name="contato"
              value={formData.contato}
              onChange={handleChange}
              placeholder={t('formContactPlaceholder')}
              className="mt-1"
            />
          </div>

          {/*
            Aviso no momento da recolha, como o RGPD exige. Fica junto aos
            campos de nome e contacto — que é onde o cliente decide se dá dados
            pessoais — e diz-lhe quem fica com eles: o estabelecimento.
          */}
          <p className="text-xs leading-relaxed text-gray-500">
            {t('formPrivacyNotice', { business: businessName })}{' '}
            <Link to="/privacidade" className="underline hover:text-gray-700">
              {t('formPrivacyLink')}
            </Link>
            .
          </p>
        </form>

        {/*
          Public review is offered here regardless of the rating given. Hiding it
          from unhappy customers is review gating — prohibited by Google's policy,
          the FTC's Consumer Review Rule and the EU Omnibus Directive. Do not
          make this block conditional on `rating`.
        */}
        {(googleReviewUrl || tripAdvisorUrl) && (
          <div className="mt-6 border-t border-gray-200 pt-5">
            <p className="text-sm font-medium text-gray-900">
              {t('publicTitle')}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              {t('publicSubtitle')}
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              {googleReviewUrl && (
                <a
                  href={googleReviewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                  {t('publicGoogle')}
                  <ExternalLink size={14} aria-hidden="true" />
                </a>
              )}
              {tripAdvisorUrl && (
                <a
                  href={tripAdvisorUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                  {t('publicTripAdvisor')}
                  <ExternalLink size={14} aria-hidden="true" />
                </a>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default FeedbackForm;
