import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { ROTA_ASSINATURA } from '@/lib/intencaoDeAssinar';

/**
 * O botao de comprar da pagina publica.
 *
 * POR QUE ELE NAO LEVA AO CADASTRO
 *
 * Ate 04/09/2026 levava. O caminho era: clicar no preco, preencher CINCO
 * campos, atravessar TRES passos de configuracao, e so entao ver a tela de
 * pagamento. Nove interacoes antes de a pessoa poder pagar R$99.
 *
 * O Marcelo tentou comprar o proprio produto nesse dia e desistiu: "Desisto,
 * nao consigo comprar algo que esta pra vender. O botao deve levar para a
 * pagina de compra quem estiver deslogado. Simples como isso."
 *
 * Entao: quem esta deslogado vai para o pagamento. A conta vem depois, na tela
 * `/bem-vindo`, com a compra ja paga a espera dela.
 *
 * QUEM JA TEM SESSAO SEGUE O CAMINHO ANTIGO, e nao este: a assinatura dessa
 * pessoa tem de nascer ligada a conta que ela ja tem. Manda-la ao checkout
 * anonimo criaria uma compra orfa que ela teria de reclamar — para uma conta
 * que o produto ja conhecia.
 */
export const BotaoDeComprar = ({
  rotulo,
  className,
  children,
}: {
  rotulo: string;
  className?: string;
  children?: React.ReactNode;
}) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [aCaminho, setACaminho] = useState(false);

  const comprar = async () => {
    // Quem ja entrou compra pela cobranca do proprio perfil, onde a assinatura
    // nasce ligada a conta dele.
    if (user) {
      navigate(ROTA_ASSINATURA);
      return;
    }
    setACaminho(true);
    try {
      const { data, error } = await supabase.functions.invoke('comprar', { body: {} });
      const url = typeof data?.url === 'string' ? data.url : null;
      if (error || !url) throw error || new Error('sem endereco de pagamento');
      // `replace` e nao `assign`: quem voltar do Stripe com o botao "voltar"
      // nao pode cair outra vez no meio de um pagamento.
      window.location.replace(url);
    } catch (erro) {
      console.error('Nao foi possivel abrir o pagamento:', erro);
      toast.error('Não foi possível abrir o pagamento. Tente de novo em instantes.');
      setACaminho(false);
    }
  };

  return (
    <Button
      size="lg"
      className={className}
      disabled={loading || aCaminho}
      onClick={() => void comprar()}
    >
      {aCaminho ? 'Abrindo o pagamento…' : rotulo}
      {!aCaminho && children}
    </Button>
  );
};

export default BotaoDeComprar;
