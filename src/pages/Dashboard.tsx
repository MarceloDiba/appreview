import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import AttentionCenter from '@/components/dashboard/AttentionCenter';
import { useInternalFeedback } from '@/hooks/useInternalFeedback';
import { useAttentionInsights } from '@/hooks/useAttentionInsights';
import { useSetupStatus } from '@/hooks/useSetupStatus';
import { supabase } from '@/integrations/supabase/client';
import { MessageSquare, QrCode, Settings as SettingsIcon } from 'lucide-react';

const shortcuts = [
  {
    to: '/reviews',
    icon: MessageSquare,
    title: 'Casos para resolver',
    description: 'Ler os relatos e registar o que foi feito.',
  },
  {
    to: '/qrcodes',
    icon: QrCode,
    title: 'QR Codes',
    description: 'Criar e imprimir códigos por mesa ou balcão.',
  },
  {
    to: '/settings',
    icon: SettingsIcon,
    title: 'Definições',
    description: 'Ligar as suas páginas do Google e do TripAdvisor.',
  },
];

const Dashboard = () => {
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
  const { cases, loading: loadingCases } = useInternalFeedback(userId);
  const insights = useAttentionInsights(cases);
  const loading = loadingUser || (!!userId && loadingCases);

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Navbar userRole="business" businessName={businessName || undefined} />

      <main className="flex-1 px-4 pb-12 pt-20">
        <div className="container mx-auto max-w-5xl">
          <header className="mb-6">
            <h1 className="text-3xl font-bold">
              {businessName ? `Olá, ${businessName}` : 'O seu painel'}
            </h1>
            <p className="mt-1 text-gray-600">
              O que precisa da sua atenção hoje, em primeiro lugar.
            </p>
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
                  <h2 className="font-semibold text-amber-900">Falta terminar a configuração</h2>
                  <p className="mt-1 text-sm text-amber-800">
                    {[
                      !setup.businessName && 'o nome do seu negócio',
                      !setup.hasGoogleLink && 'o endereço da sua página no Google',
                      setup.qrCount === 0 && 'o primeiro QR code',
                    ]
                      .filter(Boolean)
                      .join(', ')
                      .replace(/, ([^,]*)$/, ' e $1')}{' '}
                    — sem isto não chegam avaliações.
                  </p>
                </div>
                <Button asChild>
                  <Link to="/configuracao">Continuar</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          <AttentionCenter insights={insights} loading={loading} />

          <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {shortcuts.map(({ to, icon: Icon, title, description }) => (
              <Card key={to} className="transition-shadow hover:shadow-md">
                <CardContent className="p-5">
                  <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                  <h3 className="mt-3 font-semibold text-gray-900">{title}</h3>
                  <p className="mt-1 text-sm text-gray-600">{description}</p>
                  <Button asChild variant="link" className="mt-2 h-auto p-0">
                    <Link to={to}>Abrir</Link>
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
