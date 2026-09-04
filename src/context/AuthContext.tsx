
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AuthError, AuthUnknownError, isAuthError, Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { comIntencao } from '@/lib/intencaoDeAssinar';
import { toast } from 'sonner';

/**
 * Garante que o que sai de signIn/signUp e sempre um AuthError de verdade,
 * mesmo quando o catch pega algo que nao veio do supabase-js (falha de
 * rede, erro de runtime, ou qualquer coisa nao padrao). Sem isso, Login.tsx
 * e Signup.tsx chamam error.message assumindo que ele existe, e um valor
 * lancado sem essa propriedade quebraria essa suposicao silenciosamente.
 */
const toAuthError = (caught: unknown): AuthError => {
  if (isAuthError(caught)) return caught;
  const message = caught instanceof Error ? caught.message : String(caught);
  return new AuthUnknownError(message, caught);
};

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string, businessName: string, name: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  signInWithGoogle: (quer?: boolean) => Promise<{ error: AuthError | null }>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  /** Espelho do utilizador actual, para o listener saber se já havia sessão. */
  const userRef = useRef<User | null>(null);
  userRef.current = user;

  useEffect(() => {
    let settled = false;

    /**
     * O ecrã não pode ficar preso a carregar para sempre.
     *
     * Antes, `loading` só passava a falso quando `getSession()` respondia. Se
     * essa promessa não resolvesse — sessão em estado estranho, rede a cair a
     * meio, servidor lento — toda a aplicação ficava num spinner infinito, sem
     * mensagem e sem saída. Aconteceu em desenvolvimento e aconteceria a um
     * cliente sem que ele soubesse dizer porquê.
     *
     * Agora qualquer um dos três caminhos liberta o ecrã: a sessão chega, um
     * evento de autenticação chega, ou passam-se dez segundos e assumimos que
     * não há sessão. Assumir "não autenticado" manda a pessoa para o login, que
     * é recuperável; ficar em espera não é.
     */
    const settle = (currentSession: Session | null) => {
      settled = true;
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        // `SIGNED_IN` também é disparado ao renovar o token e ao voltar ao
        // separador. Avisar em todos enchia o ecrã de "Login realizado com
        // sucesso!" repetidos. Só interessa a transição de fora para dentro.
        const wasSignedIn = settled && !!userRef.current;
        settle(currentSession);

        if (event === 'SIGNED_IN' && !wasSignedIn) {
          toast.success('Login realizado com sucesso!');
        }
        if (event === 'SIGNED_OUT') {
          toast.info('Sessão terminada.');
        }
      }
    );

    supabase.auth
      .getSession()
      .then(({ data: { session: currentSession } }) => settle(currentSession))
      .catch((error) => {
        console.error('Erro ao ler a sessão:', error);
        settle(null);
      });

    const timeout = window.setTimeout(() => {
      if (!settled) {
        console.warn('A sessão não respondeu a tempo. A continuar sem autenticação.');
        settle(null);
      }
    }, 10000);

    return () => {
      window.clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error };
    } catch (error) {
      return { error: toAuthError(error) };
    }
  };

  const signUp = async (email: string, password: string, businessName: string, name: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            businessName,
            name
          }
        }
      });
      
      if (!error) {
        toast.success('Cadastro realizado com sucesso!');
      }
      
      return { error };
    } catch (error) {
      return { error: toAuthError(error) };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  /**
   * Entrar (ou cadastrar-se) com o Google.
   *
   * É a MESMA chamada para os dois casos: o Supabase decide, a partir do
   * e-mail que o Google devolve, se está a criar uma conta nova ou a entrar
   * numa que já existe. Nada aqui distingue "login" de "cadastro" — a
   * distinção que existe nas duas telas é só de onde o botão é mostrado.
   *
   * `redirectTo` aponta sempre para `/login`, mesmo quando o clique partiu do
   * cadastro: é `/login` que sabe, depois de a sessão chegar, decidir entre o
   * painel e o assistente de configuração — ver `navegarDepoisDoLogin` em
   * `src/pages/Login.tsx`. Duplicar essa decisão no cadastro seria duas cópias
   * da mesma regra a divergirem na primeira vez que alguém mexesse numa.
   */
  const signInWithGoogle = async (quer = false) => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}${comIntencao('/login', quer)}` },
      });
      return { error };
    } catch (error) {
      return { error: toAuthError(error) };
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut, signInWithGoogle }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
