import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import BotaoDoGoogle from '@/components/auth/BotaoDoGoogle';
import { linkDoWhatsAppDoBinno } from '@/lib/contactoDoBinno';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

/**
 * Onde quem acabou de pagar cria o seu acesso.
 *
 * O Stripe devolve a pessoa para aqui com o BILHETE no endereco
 * (`?compra=cs_live_...`). O pagamento ja aconteceu; o que falta e uma conta a
 * que ele possa pertencer.
 *
 * O BILHETE E GUARDADO NO NAVEGADOR ANTES DE QUALQUER COISA.
 *
 * Entrar com o Google leva a pessoa para fora do site e devolve-a por outro
 * endereco, sem os parametros. Sem o bilhete guardado, essa volta perderia a
 * ligacao com o pagamento — e a pessoa ficaria paga e sem acesso, que e o
 * estado que este caminho inteiro existe para evitar. `sessionStorage` porque
 * isto dura uma visita, nao catorze dias.
 *
 * (Esta chave esta declarada em `scripts/check-o-aparelho-nao-guarda-o-dono-anterior.mjs`:
 * nao e dado de negocio, e um bilhete de uma compra em curso.)
 */
const BILHETE_GUARDADO = 'binno.bilhete-da-compra';

const BemVindo = () => {
  const [parametros] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [aCriar, setACriar] = useState(false);
  const jaTentou = useRef(false);

  const bilhete = parametros.get('compra')
    || (typeof window !== 'undefined' ? window.sessionStorage.getItem(BILHETE_GUARDADO) : null);

  useEffect(() => {
    const doEndereco = parametros.get('compra');
    if (doEndereco) {
      try { window.sessionStorage.setItem(BILHETE_GUARDADO, doEndereco); } catch { /* segue */ }
    }
  }, [parametros]);

  // Assim que houver sessao — venha ela do Google ou do formulario abaixo —,
  // liga o pagamento a ela. `jaTentou` porque este efeito corre outra vez a
  // cada renovacao de token, e reclamar duas vezes nao pode acontecer.
  useEffect(() => {
    if (loading || !user || jaTentou.current) return;
    jaTentou.current = true;
    void (async () => {
      const { data, error } = await supabase.functions.invoke('reclamar-compra', {
        body: { bilhete },
      });
      try { window.sessionStorage.removeItem(BILHETE_GUARDADO); } catch { /* segue */ }
      if (error || !data?.reclamada) {
        // NAO manda a pessoa embora nem finge que correu bem. Ela pagou; se a
        // ligacao falhou, o dinheiro esta guardado numa linha que o Marcelo ve,
        // e ela precisa de saber que basta falar com alguem.
        toast.error('Sua conta foi criada, mas não consegui ligar o pagamento a ela. Fale com a gente — o pagamento está registrado.');
        navigate('/dashboard');
        return;
      }
      toast.success('Tudo certo. Sua assinatura está ativa.');
      navigate('/configuracao');
    })();
  }, [user, loading, bilhete, navigate]);

  const criarConta = async (evento: React.FormEvent) => {
    evento.preventDefault();
    if (!email.trim() || senha.length < 6) {
      toast.error('Informe o e-mail e uma senha de pelo menos 6 caracteres.');
      return;
    }
    setACriar(true);
    const { error } = await supabase.auth.signUp({ email: email.trim(), password: senha });
    if (error) {
      toast.error(error.message);
      setACriar(false);
    }
    // Havendo sessao, o efeito acima assume: nao navega nada daqui, para nao
    // haver dois donos da mesma decisao.
  };

  /*
   * SEM BILHETE, ESTA PAGINA NAO PODE AFIRMAR QUE HOUVE PAGAMENTO.
   *
   * Ate 05/09/2026 o titulo "Pagamento confirmado" era desenhado sempre, antes
   * de se saber se existia compra nenhuma. Quem abrisse `/bem-vindo` a mao — ou
   * guardasse o endereco nos favoritos depois de comprar — via o produto
   * afirmar um pagamento que nao aconteceu, e por baixo um formulario a
   * convidar a criar conta. Duas coisas erradas de uma vez: mentia, e abria uma
   * porta de cadastro que o "so usa quem paga" fechou.
   *
   * NAO REDIRECIONA EM SILENCIO. Quem chega aqui sem bilhete tanto pode ser
   * alguem que nunca comprou como alguem que COMPROU e perdeu o link — e essa
   * segunda pessoa e a que nao se pode mandar embora sem porta. Por isso a tela
   * diz o que sabe (nao encontrei uma compra), oferece o caminho de comprar, e
   * da um contacto directo a quem ja pagou.
   */
  if (!bilhete && !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <Card className="mx-auto w-full max-w-md p-6 shadow-lg">
          <div className="flex items-center gap-3">
            <HelpCircle className="h-8 w-8 text-slate-400" aria-hidden="true" />
            <div>
              <h1 className="text-xl font-bold text-slate-950">Não encontramos sua compra</h1>
              <p className="text-sm text-slate-600">Esta página abre depois do pagamento.</p>
            </div>
          </div>
          <p className="mt-6 text-sm text-slate-600">
            Se você ainda não assinou, comece por aqui. Se você já pagou e caiu nesta tela,
            seu pagamento está registrado — fale com a gente e a gente libera seu acesso.
          </p>
          <div className="mt-6 space-y-3">
            <Button asChild className="min-h-11 w-full bg-[#2457D6] hover:bg-[#1d47b0]">
              <a href="/#plano">Ver o plano e assinar</a>
            </Button>
            <Button asChild variant="outline" className="min-h-11 w-full">
              <a
                href={linkDoWhatsAppDoBinno('Olá! Paguei o Binno mas não consegui criar meu acesso.')}
                target="_blank"
                rel="noreferrer"
              >
                Já paguei — falar no WhatsApp
              </a>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="mx-auto w-full max-w-md p-6 shadow-lg">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-8 w-8 text-emerald-600" aria-hidden="true" />
          <div>
            <h1 className="text-xl font-bold text-slate-950">Pagamento confirmado</h1>
            <p className="text-sm text-slate-600">Falta só criar o seu acesso.</p>
          </div>
        </div>

        {user ? (
          <p className="mt-6 text-sm text-slate-600">Ligando o pagamento à sua conta…</p>
        ) : (
          <>
            <div className="mt-6"><BotaoDoGoogle /></div>
            <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wide text-slate-400">
              <span className="h-px flex-1 bg-slate-200" />ou<span className="h-px flex-1 bg-slate-200" />
            </div>
            <form onSubmit={criarConta} className="space-y-4">
              <div>
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" type="email" autoComplete="email" value={email}
                  onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="senha">Senha</Label>
                <Input id="senha" type="password" autoComplete="new-password" value={senha}
                  onChange={(e) => setSenha(e.target.value)} required minLength={6} />
              </div>
              <Button type="submit" className="w-full bg-[#2457D6] hover:bg-[#1d47b0]" disabled={aCriar}>
                {aCriar ? 'Criando…' : 'Criar meu acesso'}
              </Button>
            </form>
          </>
        )}
      </Card>
    </div>
  );
};

export default BemVindo;
