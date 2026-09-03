import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useOwnerTranslation } from '@/i18n/owner/useOwnerTranslation';
import { toast } from 'sonner';

/**
 * "Continuar com o Google", partilhado entre o login e o cadastro.
 *
 * É UM BOTÃO SÓ, porque é UMA CHAMADA só — `signInWithGoogle` não distingue
 * entrar de se cadastrar, o Supabase decide isso pelo e-mail que o Google
 * devolve. Dois componentes copiando o mesmo SVG e o mesmo texto divergiam na
 * primeira vez que alguém mexesse num.
 *
 * NÃO HÁ ESTADO DE SUCESSO AQUI. Um clique bem-sucedido navega o navegador
 * inteiro para o Google — não há "carregando" que valha a pena mostrar depois
 * disso, porque esta página já não existe quando ele volta.
 */
const IconeDoGoogle = () => (
  <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z" />
    <path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29A11.96 11.96 0 000 12c0 1.93.46 3.76 1.29 5.38l3.98-3.09z" />
    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.94 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z" />
  </svg>
);

export const BotaoDoGoogle = () => {
  const { t } = useOwnerTranslation();
  const { signInWithGoogle } = useAuth();
  const [entrando, setEntrando] = useState(false);

  const clicar = async () => {
    setEntrando(true);
    const { error } = await signInWithGoogle();
    // Só chega aqui se a REDIRECÇÃO em si falhou (bloqueada, sem rede). Um
    // sucesso navega para fora desta página antes de o código voltar aqui.
    if (error) {
      toast.error(error.message || t('auth.googleError'));
      setEntrando(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void clicar()}
      disabled={entrando}
      className="flex w-full items-center justify-center gap-2.5 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
    >
      <IconeDoGoogle />
      {entrando ? t('auth.googleRedirecting') : t('auth.continueWithGoogle')}
    </button>
  );
};

export default BotaoDoGoogle;
