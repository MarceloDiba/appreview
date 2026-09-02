import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Copy, MessageCircle } from 'lucide-react';
import { mensagemDoConvite, linkDeWhatsApp } from '@/lib/convite';
import { useOwnerTranslation } from '@/i18n/owner/useOwnerTranslation';

/**
 * O convite para avaliar no Google, ao lado de quem escreveu.
 *
 * NÃO RECEBE A NOTA, e isso é a regra. Convidar só quem deu 4 ou 5 é
 * solicitação seletiva e a política do Google proíbe. Sem a nota nas
 * propriedades, este componente não consegue esconder-se por causa dela.
 *
 * O Binno não envia: o botão abre o WhatsApp do dono com a mensagem escrita, e
 * é ele quem toca em enviar.
 */
interface ConviteParaAvaliarProps {
  nomeDoCliente: string | null;
  contacto: string | null;
  nomeDoNegocio: string;
  linkDeAvaliacao: string | null;
}

const ConviteParaAvaliar: React.FC<ConviteParaAvaliarProps> = ({
  nomeDoCliente, contacto, nomeDoNegocio, linkDeAvaliacao,
}) => {
  const { t, i18n } = useOwnerTranslation();
  const [copiado, setCopiado] = useState(false);
  const idioma = (['pt-PT', 'pt-BR', 'en'] as const).includes(i18n.language as never)
    ? (i18n.language as 'pt-PT' | 'pt-BR' | 'en')
    : 'pt-PT';

  const mensagem = mensagemDoConvite({ nomeDoCliente, nomeDoNegocio, linkDeAvaliacao, idioma });
  // Sem link de avaliação não há convite nenhum a fazer, e dizer porquê é mais
  // útil do que esconder o bloco: o dono tem uma acção clara a tomar.
  if (!mensagem) return <p className="mt-3 text-xs text-slate-500">{t('invite.inviteNoLink')}</p>;

  const paraWhatsApp = linkDeWhatsApp(contacto, mensagem);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(mensagem);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2000);
      toast.success(t('invite.inviteCopy'));
    } catch {
      toast.error(t('invite.inviteCopy'));
    }
  };

  return (
    <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
      <p className="text-sm font-medium text-slate-900">{t('invite.inviteTitle')}</p>
      <p className="mt-0.5 text-xs text-slate-500">{t('invite.inviteHint')}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {paraWhatsApp && (
          <Button asChild size="sm" className="rounded-full bg-[#2457D6] hover:bg-[#1d47b0]">
            <a href={paraWhatsApp} target="_blank" rel="noreferrer">
              <MessageCircle className="mr-2 h-4 w-4" />{t('invite.inviteWhatsApp')}
            </a>
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={() => void copiar()}>
          <Copy className="mr-2 h-4 w-4" />{copiado ? t('invite.inviteCopy') : t('invite.inviteCopy')}
        </Button>
      </div>
    </div>
  );
};

export default ConviteParaAvaliar;
