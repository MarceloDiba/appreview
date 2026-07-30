
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any | null }>;
  signUp: (email: string, password: string, businessName: string, name: string) => Promise<{ error: any | null }>;
  signOut: () => Promise<void>;
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
      return { error };
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
      return { error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut }}>
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
