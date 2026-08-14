import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import GoogleOutcomeCard, { GooglePathCard } from '@/components/dashboard/GoogleOutcomeCard';
import ReputationAdvisorCard, { ProfileHealthCard } from '@/components/dashboard/ReputationAdvisorCard';
import { useSetupStatus } from '@/hooks/useSetupStatus';
import { useGoogleOutcome } from '@/hooks/useGoogleOutcome';
import { supabase } from '@/integrations/supabase/client';
import { ArrowRight, MessageCircle, MessageSquare, QrCode, Settings as SettingsIcon } from 'lucide-react';
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
  const outcome = useGoogleOutcome(userId || undefined);

  return (
    <div className="flex min-h-screen flex-col bg-[#f5f7f9]">
      <Navbar userRole="business" businessName={businessName || undefined} />

      <main className="flex-1 px-4 pb-12 pt-20">
        <div className="container mx-auto max-w-7xl">

          <header className="mb-5 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6D43C0]">{t('dashboard.workspace.eyebrow')}</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">{businessName || t('dashboard.workspace.fallbackName')}</h1>
            <p className="mt-1 text-sm text-slate-500">{t('dashboard.workspace.subtitle')}</p>
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

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_330px]">
            <section className="min-w-0 space-y-4">
              <GoogleOutcomeCard data={outcome.data} loading={outcome.loading} error={outcome.error} />
              <ReputationAdvisorCard userId={userId || undefined} showProfileHealth={false} />
              {outcome.data && <GooglePathCard data={outcome.data} />}
            </section>

            <aside className="space-y-4">
              <ProfileHealthCard />

              <Card className="rounded-xl border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50"><MessageCircle className="h-4 w-4 text-emerald-700" aria-hidden="true" /></span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-medium text-slate-600">{t('dashboard.whatsapp.planned')}</span>
                  </div>
                  <p className="mt-4 font-semibold text-slate-950">{t('dashboard.whatsapp.title')}</p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-500">{t('dashboard.whatsapp.subtitle')}</p>
                </CardContent>
              </Card>

              <Card className="rounded-xl border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
                <CardContent className="p-5">
                  <h2 className="text-base font-semibold text-slate-950">{t('dashboard.shortcuts.title')}</h2>
                  <div className="mt-3 divide-y divide-slate-200 rounded-lg border border-slate-200">
                    {shortcuts.map(({ to, icon: Icon, titleKey, descKey }) => (
                      <Link key={to} to={to} className="flex items-center gap-3 p-3 transition-colors hover:bg-slate-50">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50"><Icon className="h-4 w-4 text-[#2457D6]" aria-hidden="true" /></span>
                        <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-slate-900">{t(titleKey)}</span><span className="block truncate text-xs text-slate-500">{t(descKey)}</span></span>
                        <ArrowRight className="h-4 w-4 text-slate-400" />
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
