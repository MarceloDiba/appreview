import React, { useEffect, useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { CreditCard, Shield, UserCog } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useOwnerTranslation } from '@/i18n/owner/useOwnerTranslation';

const SUPORTE_EMAIL = 'diba@noadigital.com.br';
const PRECO_MENSAL = '49 €';

/**
 * Esta página era inteiramente inventada: uma "Ana Silva", um plano Pro de
 * 24,90 €, um cartão Mastercard terminado em 5678 e três meses de facturas
 * falsas com botão de descarregar recibo. Nada disso existia, e um cliente real
 * podia razoavelmente acreditar que estava a ser cobrado.
 *
 * Agora mostra o que é verdade — a conta que iniciou sessão — e, no que toca a
 * facturação, diz o que se passa de facto: no piloto a assinatura é tratada
 * directamente com a NOÁ. Nada de tabelas de facturas até existir facturação a
 * sério.
 */
const Profile = () => {
  const { t } = useOwnerTranslation();
  const { user, loading: authLoading } = useAuth();

  const [profileData, setProfileData] = useState({ name: '', phone: '', businessName: '' });
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);

  const [profilePassword, setProfilePassword] = useState({ new: '', confirm: '' });
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (!user) return;
    let active = true;

    const load = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('business_name, first_name, last_name, phone')
        .eq('id', user.id)
        .maybeSingle();

      if (!active) return;

      if (data) {
        setProfileData({
          name: [data.first_name, data.last_name].filter(Boolean).join(' ').trim(),
          phone: data.phone || '',
          businessName: data.business_name || '',
        });
      }
    };

    load()
      .catch((loadError) => console.error('Erro ao carregar o perfil:', loadError))
      .finally(() => {
        if (active) setLoadingProfile(false);
      });
    return () => {
      active = false;
    };
  }, [user]);

  const handleProfileUpdate = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const [firstName, ...rest] = profileData.name.trim().split(/\s+/);
      const { error } = await supabase.from('profiles').upsert({
        id: user.id,
        first_name: firstName || null,
        last_name: rest.length ? rest.join(' ') : null,
        phone: profileData.phone.trim() || null,
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;
      toast.success(t('profile.savedToast'));
    } catch (error) {
      console.error('Erro ao guardar o perfil:', error);
      toast.error(t('profile.saveErrorToast'));
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (profilePassword.new !== profilePassword.confirm) {
      toast.error(t('profile.pwMismatch'));
      return;
    }
    if (profilePassword.new.length < 8) {
      toast.error(t('profile.pwTooShort'));
      return;
    }

    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: profilePassword.new });
      if (error) throw error;

      setProfilePassword({ new: '', confirm: '' });
      toast.success(t('profile.pwChanged'));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao alterar a palavra-passe';
      console.error('Erro ao alterar a palavra-passe:', message);
      toast.error(t('profile.pwError'));
    } finally {
      setChangingPassword(false);
    }
  };

  if (authLoading || loadingProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-t-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar userRole="business" businessName={profileData.businessName || undefined} />

      <main className="flex-1 pt-20 px-4 pb-8">
        <div className="container mx-auto max-w-4xl">
          <header className="mb-8">
            <h1 className="text-3xl font-bold">{t('nav.account')}</h1>
            <p className="text-gray-600 mt-1">
              {user?.email}
            </p>
          </header>

          <Tabs defaultValue="profile">
            <TabsList className="mb-6">
              <TabsTrigger value="profile">
                <UserCog className="h-4 w-4 mr-2" />
                {t('profile.tabProfile')}
              </TabsTrigger>
              <TabsTrigger value="password">
                <Shield className="h-4 w-4 mr-2" />
                {t('profile.tabPassword')}
              </TabsTrigger>
              <TabsTrigger value="billing">
                <CreditCard className="h-4 w-4 mr-2" />
                {t('profile.tabBilling')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile">
              <Card>
                <CardHeader>
                  <CardTitle>{t('profile.dataTitle')}</CardTitle>
                  <CardDescription>
                    {t('profile.dataDescPrefix')}{' '}
                    <a href="/settings" className="text-primary underline">
                      {t('profile.settingsLink')}
                    </a>
                    .
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name">{t('profile.nameLabel')}</Label>
                      <Input
                        id="name"
                        value={profileData.name}
                        onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                        placeholder={t('profile.namePlaceholder')}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">{t('profile.emailLabel')}</Label>
                      <Input id="email" value={user?.email || ''} disabled />
                      <p className="text-xs text-gray-500">
                        {t('profile.emailHint', { email: SUPORTE_EMAIL })}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">{t('profile.phoneLabel')}</Label>
                      <Input
                        id="phone"
                        value={profileData.phone}
                        onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                        placeholder={t('profile.phonePlaceholder')}
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button onClick={handleProfileUpdate} disabled={saving}>
                    {saving ? t('profile.saving') : t('profile.save')}
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>

            <TabsContent value="password">
              <Card>
                <CardHeader>
                  <CardTitle>{t('profile.pwTitle')}</CardTitle>
                  <CardDescription>{t('profile.pwDesc')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-password">{t('profile.pwNew')}</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={profilePassword.new}
                      onChange={(e) =>
                        setProfilePassword({ ...profilePassword, new: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">{t('profile.pwConfirm')}</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={profilePassword.confirm}
                      onChange={(e) =>
                        setProfilePassword({ ...profilePassword, confirm: e.target.value })
                      }
                    />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    onClick={handlePasswordChange}
                    className="ml-auto"
                    disabled={changingPassword || !profilePassword.new || !profilePassword.confirm}
                  >
                    {changingPassword ? t('profile.pwChanging') : t('profile.pwSubmit')}
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>

            <TabsContent value="billing">
              <Card>
                <CardHeader>
                  <CardTitle>{t('profile.billingTitle')}</CardTitle>
                  <CardDescription>{t('profile.billingDesc')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-gray-700">{t('profile.billingBody1', { price: PRECO_MENSAL })}</p>
                  <p className="text-gray-700">
                    {t('profile.billingContactPrefix')}{' '}
                    <a className="text-primary underline" href={`mailto:${SUPORTE_EMAIL}`}>
                      {SUPORTE_EMAIL}
                    </a>
                    {t('profile.billingContactSuffix')}
                  </p>
                  <p className="text-sm text-gray-500">{t('profile.billingNoMinimum')}</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default Profile;
