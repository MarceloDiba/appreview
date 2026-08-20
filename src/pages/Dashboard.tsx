import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import ExperimentalCockpitDashboard from '@/components/dashboard/ExperimentalCockpitDashboard';
import { useSetupStatus } from '@/hooks/useSetupStatus';
import { useGoogleOutcome } from '@/hooks/useGoogleOutcome';
import { supabase } from '@/integrations/supabase/client';
import { useOwnerTranslation } from '@/i18n/owner/useOwnerTranslation';
import { ExperimentalApifySnapshot, loadExperimentalApifySnapshot } from '@/lib/experimentalApifySnapshot';

const emptyBreakdown = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 } as const;

const Dashboard = () => {
  const { t } = useOwnerTranslation();
  const [userId, setUserId] = useState<string>('');
  const [businessName, setBusinessName] = useState<string>('');
  const [loadingUser, setLoadingUser] = useState(true);
  const [experimentalSnapshot, setExperimentalSnapshot] = useState<ExperimentalApifySnapshot | null>(null);
  const [loadingExperimentalSnapshot, setLoadingExperimentalSnapshot] = useState(true);

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

  useEffect(() => {
    let active = true;
    const load = async () => {
      const snapshot = await loadExperimentalApifySnapshot({ allowLocalFixture: import.meta.env.DEV });
      if (!active) return;
      setExperimentalSnapshot(snapshot);
      setLoadingExperimentalSnapshot(false);
    };
    void load();
    return () => { active = false; };
  }, []);

  const setup = useSetupStatus(userId || undefined);
  const outcome = useGoogleOutcome(userId || undefined);
  const approvedFallbackSnapshot = useMemo<ExperimentalApifySnapshot | null>(() => {
    if (!outcome.data) return null;
    return {
      // This is built only from the authenticated business record already on
      // screen. It deliberately leaves queue, history, themes and rating
      // distribution empty instead of making an Apify or official claim.
      source: 'owner-dashboard-summary',
      fetchedAt: outcome.data.lastUpdatedAt,
      business: {
        name: outcome.data.placeName || businessName || t('dashboard.workspace.fallbackName'),
        address: '',
        placeId: '',
        googleRating: outcome.data.averageRating,
        googleReviewCount: outcome.data.totalReviews,
      },
      sample: {
        reviewCount: 0,
        ratingBreakdown: emptyBreakdown,
        ownerRepliesFound: 0,
        insights: { reviewsLast30Days: null, averageResponseHours: null, topics: [] },
      },
    };
  }, [businessName, outcome.data, t]);

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

          {loadingExperimentalSnapshot || outcome.loading ? (
            <Card className="h-72 animate-pulse border-slate-200 bg-white" />
          ) : experimentalSnapshot || approvedFallbackSnapshot ? (
            <ExperimentalCockpitDashboard snapshot={experimentalSnapshot || approvedFallbackSnapshot} userId={userId || undefined} />
          ) : (
            <Card className="border-slate-200 bg-white"><CardContent className="p-6"><h2 className="text-lg font-semibold text-slate-950">{t('dashboard.googleOutcome.emptyTitle')}</h2><p className="mt-2 text-sm text-slate-600">{t('dashboard.googleOutcome.empty')}</p><Button asChild className="mt-5"><Link to="/settings">{t('dashboard.googleOutcome.configure')}</Link></Button></CardContent></Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
