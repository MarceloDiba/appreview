import React, { useEffect, useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import GoogleReviews from '@/components/dashboard/GoogleReviews';
import CasesList from '@/components/dashboard/cases/CasesList';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useOwnerTranslation } from '@/i18n/owner/useOwnerTranslation';

const Reviews = () => {
  const { t } = useOwnerTranslation();
  const [userId, setUserId] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState('');

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUserId(user.id);
      const { data: profile } = await supabase
        .from('profiles')
        .select('business_name')
        .eq('id', user.id)
        .maybeSingle();
      if (profile?.business_name) setBusinessName(profile.business_name);
    };

    void fetchUser();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar userRole="business" businessName={businessName || undefined} />

      <main className="flex-1 pt-20 px-4 pb-8">
        <div className="container mx-auto max-w-6xl">
          <header className="mb-8">
            <h1 className="text-3xl font-bold">{t('reviews.title')}</h1>
            <p className="text-gray-600 mt-1">{t('reviews.subtitle')}</p>
          </header>

          <div className="mb-8">
            {userId ? (
              <GoogleReviews userId={userId} />
            ) : (
              <div className="py-8 text-center text-gray-500">{t('reviews.loading')}</div>
            )}
          </div>

          <Tabs defaultValue="internal">
            <TabsList className="mb-4">
              <TabsTrigger value="internal">{t('reviews.casesTab')}</TabsTrigger>
            </TabsList>
            <TabsContent value="internal">
              {userId ? (
                <CasesList userId={userId} businessName={businessName || undefined} />
              ) : (
                <div className="py-8 text-center text-gray-500">{t('reviews.loading')}</div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default Reviews;
