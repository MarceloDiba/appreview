
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { useOwnerTranslation } from '@/i18n/owner/useOwnerTranslation';
import LanguageSwitcher from '@/components/layout/LanguageSwitcher';
import MarcaBinno from '@/components/marketing/MarcaBinno';

const Signup = () => {
  const navigate = useNavigate();
  const { t } = useOwnerTranslation();
  const { signUp, user } = useAuth();
  const [formData, setFormData] = useState({
    businessName: '',
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
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
    
    if (formData.password !== formData.confirmPassword) {
      toast.error(t('signup.passwordsDontMatch'));
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const { error } = await signUp(
        formData.email, 
        formData.password, 
        formData.businessName,
        formData.name
      );
      
      if (error) {
        console.error('Signup error:', error);
        
        if (error.message.includes('email already registered')) {
          toast.error(t('signup.emailInUse'));
        } else {
          toast.error(`${t('signup.signupErrorPrefix')}: ${error.message}`);
        }
      } else {
        toast.success(t('signup.successToast'));
        toast.info(t('signup.confirmEmailToast'), {
          duration: 5000
        });
        navigate('/login');
      }
    } catch (error) {
      console.error('Unexpected error during signup:', error);
      toast.error(t('signup.unexpectedError'));
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
          <MarcaBinno tamanho="lg" />
          <p className="text-gray-600 mt-2">{t('signup.title')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="businessName">{t('signup.businessName')}</Label>
            <Input
              id="businessName"
              name="businessName"
              placeholder={t('signup.businessNamePlaceholder')}
              value={formData.businessName}
              onChange={handleChange}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">{t('signup.fullName')}</Label>
            <Input
              id="name"
              name="name"
              placeholder={t('signup.fullNamePlaceholder')}
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">{t('signup.email')}</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder={t('signup.emailPlaceholder')}
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">{t('signup.password')}</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder={t('signup.passwordPlaceholder')}
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">{t('signup.confirmPassword')}</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder={t('signup.confirmPasswordPlaceholder')}
              value={formData.confirmPassword}
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
              {isSubmitting ? t('signup.submitting') : t('signup.submit')}
            </Button>
            {/*
              O aviso fica antes do botão e não num visto separado de propósito:
              é informação, não consentimento a arrancar. O consentimento aqui é
              a própria criação da conta.
            */}
            <p className="mt-3 text-center text-xs text-gray-500">
              {t('signup.termsPrefix')}{' '}
              <Link to="/termos" className="underline hover:text-gray-700">
                {t('signup.terms')}
              </Link>{' '}
              {t('signup.and')}{' '}
              <Link to="/privacidade" className="underline hover:text-gray-700">
                {t('signup.privacy')}
              </Link>
              .
            </p>
          </div>
        </form>

        <div className="mt-4 text-center">
          <p className="text-gray-600 text-sm">
            {t('signup.haveAccount')}{' '}
            <Link to="/login" className="text-primary hover:underline">
              {t('signup.signIn')}
            </Link>
          </p>
          <Link to="/" className="text-gray-500 text-sm hover:text-primary block mt-2">
            {t('signup.backHome')}
          </Link>
        </div>
      </Card>
    </div>
  );
};

export default Signup;
