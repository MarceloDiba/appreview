
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { getSetupState } from '@/hooks/useSetupStatus';
import { useOwnerTranslation } from '@/i18n/owner/useOwnerTranslation';
import LanguageSwitcher from '@/components/layout/LanguageSwitcher';

const Login = () => {
  const navigate = useNavigate();
  const { t } = useOwnerTranslation();
  const { signIn, user } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Redirect if already logged in
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      toast.error(t('auth.fillAllFields'));
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const { error } = await signIn(formData.email, formData.password);
      
      if (error) {
        console.error('Login error:', error);
        
        if (error.message.includes('Invalid login credentials')) {
          toast.error(t('auth.wrongCredentials'));
        } else {
          toast.error(`${t('auth.loginErrorPrefix')}: ${error.message}`);
        }
      } else {
        // Quem ainda não tem nome, link do Google e um QR code vai para o passo
        // a passo em vez de aterrar num painel vazio sem saber o que fazer.
        const { data: { user: signedIn } } = await supabase.auth.getUser();
        const setup = signedIn ? await getSetupState(signedIn.id) : null;
        navigate(setup && !setup.isComplete ? '/configuracao' : '/dashboard');
      }
    } catch (error) {
      console.error('Unexpected error during login:', error);
      toast.error(t('auth.unexpectedError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md mx-auto p-6 shadow-lg">
        <div className="mb-2 flex justify-end">
          <LanguageSwitcher />
        </div>
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-primary">Binno</h1>
          <p className="text-gray-600 mt-2">{t('auth.loginSubtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t('auth.email')}</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder={t('auth.emailPlaceholder')}
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">{t('auth.password')}</Label>
              <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                {t('auth.forgotPassword')}
              </Link>
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder={t('auth.passwordPlaceholder')}
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? t('auth.signingIn') : t('auth.signIn')}
            </Button>
          </div>
        </form>

        <div className="mt-4 text-center">
          <p className="text-gray-600 text-sm">
            {t('auth.noAccount')}{' '}
            <Link to="/signup" className="text-primary hover:underline">
              {t('auth.createAccount')}
            </Link>
          </p>
          <Link to="/" className="text-gray-500 text-sm hover:text-primary block mt-2">
            {t('auth.backHome')}
          </Link>
        </div>
      </Card>
    </div>
  );
};

export default Login;
