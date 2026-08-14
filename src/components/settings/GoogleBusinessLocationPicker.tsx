import { useCallback, useEffect, useState } from 'react';
import { Check, MapPin, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useOwnerTranslation } from '@/i18n/owner/useOwnerTranslation';

const GoogleBusinessLocationPicker = () => {
  const { user } = useAuth();
  const { t } = useOwnerTranslation();
  const [connected, setConnected] = useState(false);
  const [locations, setLocations] = useState<Array<{ id: string; title: string; is_selected: boolean }>>([]);
  const [loading, setLoading] = useState(true);
  const [discovering, setDiscovering] = useState(false);
  const [selecting, setSelecting] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: connection }, { data: savedLocations }] = await Promise.all([
      supabase.from('google_business_connections').select('status').eq('user_id', user.id).maybeSingle(),
      supabase.from('google_business_locations').select('id, title, is_selected').eq('user_id', user.id).order('title'),
    ]);
    setConnected(connection?.status === 'connected');
    setLocations(savedLocations || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { void load(); }, [load]);

  const discover = async () => {
    setDiscovering(true);
    try {
      const { error } = await supabase.functions.invoke('sync-google-business-profile', { body: { action: 'list-locations' } });
      if (error) throw error;
      await load();
    } catch (error) {
      console.error('Could not list Google Business locations:', error);
      toast.error(t('settings.googleLocation.discoverError'));
    } finally {
      setDiscovering(false);
    }
  };

  const select = async (id: string) => {
    setSelecting(id);
    try {
      const { error } = await supabase.functions.invoke('sync-google-business-profile', {
        body: { action: 'select-location', location_id: id },
      });
      if (error) throw error;
      await load();
      toast.success(t('settings.googleLocation.selected'));
    } catch (error) {
      console.error('Could not select Google Business location:', error);
      toast.error(t('settings.googleLocation.selectError'));
    } finally {
      setSelecting(null);
    }
  };

  if (loading || !connected) return null;

  return (
    <Card className="mb-6 border-slate-200 shadow-none">
      <CardContent className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><h2 className="font-semibold text-slate-950">{t('settings.googleLocation.title')}</h2><p className="mt-1 max-w-2xl text-sm text-slate-600">{t('settings.googleLocation.description')}</p></div>
          <Button variant="outline" onClick={() => void discover()} disabled={discovering}><RefreshCw className={`mr-2 h-4 w-4 ${discovering ? 'animate-spin' : ''}`} />{discovering ? t('settings.googleLocation.discovering') : t('settings.googleLocation.discover')}</Button>
        </div>
        {locations.length > 0 && <div className="mt-4 divide-y divide-slate-200 rounded-lg border border-slate-200">{locations.map((location) => <button type="button" key={location.id} onClick={() => void select(location.id)} disabled={selecting === location.id} className={`flex w-full items-center gap-3 p-3 text-left ${location.is_selected ? 'bg-blue-50' : 'hover:bg-slate-50'}`}><span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#2457D6]"><MapPin className="h-4 w-4" /></span><span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-900">{location.title}</span>{location.is_selected && <span className="flex items-center gap-1 text-xs font-medium text-emerald-700"><Check className="h-4 w-4" />{t('settings.googleLocation.active')}</span>}</button>)}</div>}
      </CardContent>
    </Card>
  );
};

export default GoogleBusinessLocationPicker;
