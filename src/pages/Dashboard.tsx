import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import GoogleOutcomeCard from '@/components/dashboard/GoogleOutcomeCard';
import { useSetupStatus } from '@/hooks/useSetupStatus';
import { supabase } from '@/integrations/supabase/client';
import { MessageSquare, QrCode, Settings as SettingsIcon } from 'lucide-react';
import { useOwnerTranslation } from '@/i18n/owner/useOwnerTranslation';

const shortcuts = [
  { to: '/reviews', icon: MessageSquare, titleKey: 'dashboard.shortcuts.reviewsTitle', descKey: 'dashboard.shortcuts.reviewsDesc' },
  { to: '/qrcodes', icon: QrCode, titleKey: 'dashboard.shortcuts.qrTitle', descKey: 'dashboard.shortcuts.qrDesc' },
  { to: '/settings', icon: SettingsIcon, titleKey: 'dashboard.shortcuts.settingsTitle', descKey: 'dashboard.shortcuts.settingsDesc' },
];

const Dashboard = () => {
  const { t } = useOwnerTranslation();
  const [userId, setUserId] = useState<string>('');
  const [businessName, setBusinessName] = useState<string>('');
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!active) return;

      if (user) {
        setUserId(user.id);

        const { data: profile } = await supabase
          .from('profiles')
          .select('business_name')
          .eq('id', user.id)
          .maybeSingle();

        if (active && profile?.business_name) {
          setBusinessName(profile.business_name);
        }
      }

      if (active) setLoadingUser(false);
    };

    load();
    return () => {
      active = false;
    };
  }, []);

  const setup = useSetupStatus(userId || undefined);

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Navbar userRole="business" businessName={businessName || undefined} />

      <main className="flex-1 px-4 pb-12 pt-20">
        <div className="container mx-auto max-w-5xl">
          <header className="mb-6">
            <h1 className="text-3xl font-bold">
              {businessName
                ? t('dashboard.greetingNamed', { name: businessName })
                : t('dashboard.greetingGeneric')}
            </h1>
            <p className="mt-1 text-gray-600">{t('dashboard.subtitle')}</p>
          </header>

          {/*
            Enquanto faltar uma das três peças — nome, link do Google, QR code —
            o painel não tem como encher. Dizer o que falta vale mais do que
            mostrar uma Central de Atenção vazia.
          */}
          {!setup.loading && !setup.isComplete && (
            <Card className="mb-6 border-amber-200 bg-amber-50">
              <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-semibold text-amber-900">{t('dashboard.setupBanner.title')}</h2>
                  <p className="mt-1 text-sm text-amber-800">
                    {(() => {
                      const missing = [
                        !setup.businessName && t('dashboard.setupBanner.name'),
                        !setup.hasGoogleLink && t('dashboard.setupBanner.google'),
                        setup.qrCount === 0 && t('dashboard.setupBanner.qr'),
                      ].filter(Boolean) as string[];
                      const list =
                        missing.length <= 1
                          ? missing.join('')
                          : `${missing.slice(0, -1).join(', ')} ${t('dashboard.setupBanner.and')} ${missing[missing.length - 1]}`;
                      return `${list} ${t('dashboard.setupBanner.suffix')}`;
                    })()}
                  </p>
                </div>
                <Button asChild>
                  <Link to="/configuracao">{t('dashboard.setupBanner.continue')}</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          <GoogleOutcomeCard userId={userId || undefined} />

          <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {shortcuts.map(({ to, icon: Icon, titleKey, descKey }) => (
              <Card key={to} className="transition-shadow hover:shadow-md">
                <CardContent className="p-5">
                  <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                  <h3 className="mt-3 font-semibold text-gray-900">{t(titleKey)}</h3>
                  <p className="mt-1 text-sm text-gray-600">{t(descKey)}</p>
                  <Button asChild variant="link" className="mt-2 h-auto p-0">
                    <Link to={to}>{t('dashboard.shortcuts.open')}</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
