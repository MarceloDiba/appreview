import React, { useEffect, useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import QRCodeGenerator from '@/components/dashboard/QRCodeGenerator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useOwnerTranslation } from '@/i18n/owner/useOwnerTranslation';
import { isLoopbackPublicOrigin, isNonCanonicalPublicOrigin, publicAppOrigin } from '@/lib/qr';

const QRCodes = () => {
  const { t } = useOwnerTranslation();
  const [businessName, setBusinessName] = useState<string>('');
  const [businessCountry, setBusinessCountry] = useState<string>('');
  const [businessPhone, setBusinessPhone] = useState<string>('');
  const baseUrl = publicAppOrigin();
  const isLoopback = isLoopbackPublicOrigin(baseUrl);
  // Loopback já bloqueia a criação; o aviso de origem não canónica só faz
  // sentido quando a criação está de facto liberada.
  const isNonCanonical = !isLoopback && isNonCanonicalPublicOrigin(baseUrl);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !active) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('business_name, business_country, phone')
        .eq('id', user.id)
        .maybeSingle();

      if (active) {
        setBusinessName(profile?.business_name || '');
        setBusinessCountry(profile?.business_country || '');
        setBusinessPhone(profile?.phone || '');
      }
    };

    load();
    return () => { active = false; };
  }, []);
  
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar userRole="business" businessName={businessName || undefined} />
      
      <main className="flex-1 pt-20 px-4 pb-8">
        <div className="container mx-auto max-w-6xl">
          <header className="mb-8">
            <h1 className="text-3xl font-bold">{t('qrcodes.title')}</h1>
            <p className="text-gray-600 mt-1">{t('qrcodes.subtitle')}</p>
          </header>

          <QRCodeGenerator baseUrl={baseUrl} businessName={businessName} businessCountry={businessCountry} businessPhone={businessPhone} canCreate={!isLoopback} nonCanonicalOrigin={isNonCanonical} />

          <div className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle>{t('qrcodes.howToTitle')}</CardTitle>
                <CardDescription>{t('qrcodes.howToDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="bg-gray-50 border shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-lg">{t('qrcodes.onSite')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600">{t('qrcodes.onSiteDesc')}</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-gray-50 border shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-lg">{t('qrcodes.inMaterials')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600">{t('qrcodes.inMaterialsDesc')}</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-gray-50 border shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-lg">{t('qrcodes.online')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600">{t('qrcodes.onlineDesc')}</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex items-start">
                  <AlertCircle className="h-5 w-5 text-blue-500 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-medium text-blue-700">{t('qrcodes.tipTitle')}</h4>
                    <p className="text-sm text-blue-600 mt-1">{t('qrcodes.tipDesc')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default QRCodes;
