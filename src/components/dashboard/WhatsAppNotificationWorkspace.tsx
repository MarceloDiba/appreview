import { useEffect, useState } from 'react';
import { CheckCircle2, MessageCircle, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import InternationalPhoneField from '@/components/forms/InternationalPhoneField';
import { useOwnerTranslation } from '@/i18n/owner/useOwnerTranslation';
import type { LocalWhatsAppState } from '@/hooks/useLocalWhatsApp';
import { maskInternationalPhone, sendLocalWhatsAppText } from '@/lib/localWhatsApp';
import { defaultPilotNotificationPreferences, type PilotNotificationPreferences, readLatestPilotNotificationDelivery, readPilotNotificationPreferences, savePilotNotificationPreferences } from '@/lib/pilotNotificationPreferences';
import { enqueueWhatsAppTest, getWhatsAppDeliveryState, saveWhatsAppDeliveryPreferences, type WhatsAppDelivery } from '@/lib/whatsappDelivery';

export const WhatsAppNotificationWorkspace = ({ localWhatsApp, onboardingPhone, demoPhone, demo = false }: { localWhatsApp: LocalWhatsAppState; onboardingPhone?: string; demoPhone?: string; demo?: boolean }) => {
  const { t, i18n } = useOwnerTranslation();
  const [preferences, setPreferences] = useState<PilotNotificationPreferences>(defaultPilotNotificationPreferences);
  const [testRecipient, setTestRecipient] = useState('');
  const [message, setMessage] = useState(t('dashboard.cockpit.whatsapp.defaultMessage'));
  const [confirmed, setConfirmed] = useState(false);
  const [saved, setSaved] = useState(false);
  const [sendState, setSendState] = useState<{ status: 'idle' | 'sending' | 'sent' | 'error'; detail?: string; sentAt?: string; recipient?: string }>({ status: 'idle' });
  const [latestAdvisorDelivery, setLatestAdvisorDelivery] = useState(() => readLatestPilotNotificationDelivery());
  const [backendState, setBackendState] = useState<'checking' | 'ready' | 'local-fallback' | 'unavailable'>('checking');
  const [deliveries, setDeliveries] = useState<WhatsAppDelivery[]>([]);
  const directReady = localWhatsApp.status === 'ready' && localWhatsApp.session;
  const ready = backendState === 'ready' || Boolean(directReady);

  useEffect(() => {
    if (demo) {
      setPreferences({ ...defaultPilotNotificationPreferences, recipient: demoPhone || '' });
      setTestRecipient(demoPhone || '');
      return;
    }
    const stored = readPilotNotificationPreferences();
    setPreferences({ ...stored, recipient: stored.recipient || onboardingPhone || '' });
    if (onboardingPhone) setTestRecipient((current) => current || onboardingPhone);
  }, [demo, demoPhone, onboardingPhone]);

  const refreshDeliveryState = async () => {
    const state = await getWhatsAppDeliveryState();
    setDeliveries(state.deliveries);
    if (state.preferences) setPreferences(state.preferences);
    setBackendState('ready');
    return state;
  };

  useEffect(() => {
    if (demo) return;
    let active = true;
    void refreshDeliveryState().catch(() => {
      if (!active) return;
      setBackendState(import.meta.env.DEV ? 'local-fallback' : 'unavailable');
    });
    return () => { active = false; };
  }, [demo]);

  useEffect(() => {
    if (demo) return;
    setLatestAdvisorDelivery(readLatestPilotNotificationDelivery());
  }, [demo]);

  const savePreferences = async () => {
    if (demo) {
      setSaved(true);
      return;
    }
    if (backendState === 'ready') {
      const next = await saveWhatsAppDeliveryPreferences(preferences);
      if (next) setPreferences(next);
      await refreshDeliveryState();
    } else if (import.meta.env.DEV) {
      savePilotNotificationPreferences(preferences);
    } else {
      throw new Error(t('whatsappPilot.backendUnavailable'));
    }
    setSaved(true);
  };

  const sendTest = async () => {
    if (!ready || !message.trim() || !testRecipient.trim()) return;
    setSendState({ status: 'sending' });
    try {
      if (backendState === 'ready') {
        const delivery = await enqueueWhatsAppTest({ recipient: testRecipient, message: message.trim() });
        setSendState({ status: 'sent', sentAt: delivery.created_at, recipient: maskInternationalPhone(testRecipient), detail: 'queued' });
        await refreshDeliveryState();
      } else if (directReady) {
        const result = await sendLocalWhatsAppText({ sessionId: directReady.id, phone: testRecipient, text: message.trim() });
        setSendState({ status: 'sent', sentAt: result.sentAt, recipient: maskInternationalPhone(testRecipient) });
      } else {
        throw new Error(t('whatsappPilot.backendUnavailable'));
      }
      setConfirmed(false);
    } catch (error) {
      setSendState({ status: 'error', detail: error instanceof Error ? error.message : t('dashboard.cockpit.whatsapp.sendError') });
    }
  };

  const setChoice = (key: keyof Pick<PilotNotificationPreferences, 'weeklyEnabled' | 'repliesEnabled' | 'reputationEnabled' | 'profileEnabled'>, checked: boolean) => setPreferences((current) => ({ ...current, [key]: checked }));
  const choices: Array<{ key: keyof Pick<PilotNotificationPreferences, 'weeklyEnabled' | 'repliesEnabled' | 'reputationEnabled' | 'profileEnabled'>; title: string; body: string }> = [
    { key: 'weeklyEnabled', title: t('whatsappPilot.weeklyTitle'), body: t('whatsappPilot.weeklyBody') },
    { key: 'repliesEnabled', title: t('whatsappPilot.repliesTitle'), body: t('whatsappPilot.repliesBody') },
    { key: 'reputationEnabled', title: t('whatsappPilot.reputationTitle'), body: t('whatsappPilot.reputationBody') },
    { key: 'profileEnabled', title: t('whatsappPilot.profileTitle'), body: t('whatsappPilot.profileBody') },
  ];

  if (demo) return <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
    <Card className="border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]"><CardContent className="p-6">
      <h2 className="text-xl font-semibold text-slate-950">Configuração das notificações</h2>
      <p className="mt-1 text-sm leading-6 text-slate-600">Escolha o que o gestor quer receber e quando prefere acompanhar.</p>
      <h3 className="mt-6 text-sm font-semibold text-slate-950">O que você quer receber?</h3>
      <div className="mt-4 space-y-3">{choices.map((choice) => <label key={choice.key} className="flex items-start gap-3 rounded-xl border border-slate-200 p-4 text-sm leading-5 text-slate-700"><Checkbox checked={preferences[choice.key]} onCheckedChange={(checked) => setChoice(choice.key, checked === true)} /><span><strong className="block text-slate-950">{choice.title}</strong>{choice.body}</span></label>)}</div>
      <div className="mt-5 grid gap-4 sm:grid-cols-3"><label className="text-sm font-medium text-slate-700 sm:col-span-2">WhatsApp do gestor<div className="mt-2"><InternationalPhoneField id="demo-whatsapp-recipient" value={preferences.recipient} onChange={(recipient) => setPreferences((current) => ({ ...current, recipient }))} placeholder="(00) 00000-0000" ariaLabel="País do WhatsApp do gestor" /></div><span className="mt-1 block text-xs font-normal leading-5 text-slate-500">Este é o número que recebe resumos e alertas.</span></label><label className="text-sm font-medium text-slate-700">Horário<Input type="time" value={preferences.time} onChange={(event) => setPreferences((current) => ({ ...current, time: event.target.value }))} className="mt-2" /></label></div>
      <label className="mt-4 block text-sm font-medium text-slate-700">Frequência<select value={preferences.day} onChange={(event) => setPreferences((current) => ({ ...current, day: event.target.value as PilotNotificationPreferences['day'] }))} className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="monday">Toda segunda-feira</option><option value="friday">Toda sexta-feira</option></select></label>
      <Button onClick={() => void savePreferences()} className="mt-5 rounded-full bg-[#2457D6] hover:bg-[#1d47b0]"><Send className="mr-2 h-4 w-4" />Salvar preferências</Button>{saved && <p className="mt-3 text-sm text-emerald-700">Preferências salvas nesta demonstração.</p>}
    </CardContent></Card>
    <aside className="space-y-5"><Card className="border-emerald-200 bg-emerald-50/50 shadow-[0_1px_3px_rgba(15,23,42,0.08)]"><CardContent className="p-5"><div className="flex items-center gap-2"><MessageCircle className="h-5 w-5 text-emerald-700" /><h2 className="font-semibold text-slate-950">Prévia do WhatsApp</h2></div><div className="mt-4 rounded-2xl rounded-tl-sm bg-white p-4 text-sm leading-6 text-slate-700"><p className="text-xs font-semibold text-emerald-800">Binno</p><p className="mt-2">O que fortaleceu: prato executivo e atendimento. Atenção: tempo de espera apareceu em três avaliações. Próxima ação: revise uma resposta e a escala do almoço.</p></div></CardContent></Card><Card className="border-violet-200 bg-violet-50/50 shadow-none"><CardContent className="p-5"><p className="font-semibold text-slate-950">Acompanhamento no seu ritmo</p><p className="mt-2 text-sm leading-6 text-slate-700">O gestor escolhe os avisos e a frequência. A demonstração não envia mensagens.</p></CardContent></Card></aside>
  </div>;

  return <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
    <section className="space-y-5">
      <Card className="border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]"><CardContent className="p-6">
        <h2 className="text-xl font-semibold text-slate-950">{t('dashboard.cockpit.whatsapp.notificationsTitle')}</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">{t('dashboard.advisorPilot.notificationsBody')}</p>
        <h3 className="mt-6 text-sm font-semibold text-slate-950">{t('whatsappPilot.interestsTitle')}</h3>
        <p className="mt-1 text-sm text-slate-600">{t('whatsappPilot.interestsBody')}</p>
        <div className="mt-4 space-y-3">{choices.map((choice) => <label key={choice.key} className="flex items-start gap-3 rounded-xl border border-slate-200 p-4 text-sm leading-5 text-slate-700"><Checkbox checked={preferences[choice.key]} onCheckedChange={(checked) => setChoice(choice.key, checked === true)} /><span><strong className="block text-slate-950">{choice.title}</strong>{choice.body}</span></label>)}</div>
        <div className="mt-5 grid gap-4 sm:grid-cols-3"><label className="text-sm font-medium text-slate-700 sm:col-span-2">{t('whatsappPilot.notificationRecipient')}<div className="mt-2"><InternationalPhoneField id="whatsapp-recipient" value={preferences.recipient} onChange={(recipient) => setPreferences((current) => ({ ...current, recipient }))} placeholder="(00) 00000-0000" ariaLabel={t('whatsappPilot.notificationRecipient')} /></div><span className="mt-1 block text-xs font-normal leading-5 text-slate-500">{onboardingPhone ? t('whatsappPilot.onboardingPhoneHint') : t('whatsappPilot.notificationRecipientHint')}</span></label><label className="text-sm font-medium text-slate-700">{t('dashboard.cockpit.whatsapp.time')}<Input type="time" value={preferences.time} onChange={(event) => setPreferences((current) => ({ ...current, time: event.target.value }))} className="mt-2" /></label></div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium text-slate-700">{t('dashboard.cockpit.whatsapp.frequency')}<select value={preferences.day} onChange={(event) => setPreferences((current) => ({ ...current, day: event.target.value as PilotNotificationPreferences['day'] }))} className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="monday">{t('dashboard.cockpit.whatsapp.schedule.monday')}</option><option value="friday">{t('dashboard.cockpit.whatsapp.schedule.friday')}</option></select></label></div>
        <label className="mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-sm leading-5 text-amber-950"><Checkbox checked={preferences.consented} onCheckedChange={(checked) => setPreferences((current) => ({ ...current, consented: checked === true }))} /><span>{t('dashboard.advisorPilot.notificationsConsent')}</span></label>
        <Button onClick={() => void savePreferences().catch((error) => setSendState({ status: 'error', detail: error instanceof Error ? error.message : t('whatsappPilot.backendUnavailable') }))} className="mt-4 rounded-full bg-[#2457D6] hover:bg-[#1d47b0]"><Send className="mr-2 h-4 w-4" />{backendState === 'ready' ? t('whatsappPilot.save') : t('dashboard.cockpit.whatsapp.saveLocal')}</Button>{saved && <p className="mt-3 text-sm text-emerald-700">{backendState === 'ready' ? t('whatsappPilot.preferencesSaved') : t('dashboard.advisorPilot.preferencesSaved')}</p>}
        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-5 text-slate-700"><p className="font-semibold text-slate-950">{t('dashboard.cockpit.whatsapp.historyTitle')}</p><p className="mt-1">{deliveries[0] ? t(`whatsappPilot.delivery.${deliveries[0].status}`, { recipient: maskInternationalPhone(deliveries[0].recipient) }) : latestAdvisorDelivery?.status === 'sent' ? t('dashboard.advisorPilot.whatsappSent') : latestAdvisorDelivery?.status === 'failed' ? t('dashboard.advisorPilot.whatsappFailed') : t('dashboard.cockpit.whatsapp.historyEmpty')}</p></div>
      </CardContent></Card>
      <Card className="border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]"><CardContent className="p-6">
        <div className="flex items-start justify-between gap-3"><div><h2 className="text-xl font-semibold text-slate-950">{backendState === 'ready' ? t('whatsappPilot.deliveryTitle') : t('dashboard.cockpit.whatsapp.localTitle')}</h2><p className="mt-1 text-sm leading-6 text-slate-600">{backendState === 'ready' ? t('whatsappPilot.deliveryBody') : t('dashboard.cockpit.whatsapp.localBody')}</p></div><Button variant="outline" size="sm" onClick={() => void (backendState === 'ready' ? refreshDeliveryState().catch(() => setBackendState('unavailable')) : localWhatsApp.refresh())}>{t('dashboard.cockpit.whatsapp.refresh')}</Button></div>
        <div className={`mt-5 rounded-xl border p-4 text-sm leading-6 ${ready ? 'border-emerald-100 bg-emerald-50/60 text-emerald-950' : 'border-amber-200 bg-amber-50/60 text-amber-950'}`}><strong className="block">{backendState === 'ready' ? t('whatsappPilot.deliveryReady') : t(`dashboard.cockpit.whatsapp.status.${localWhatsApp.status}`)}</strong><p className="mt-1">{backendState === 'ready' ? t('whatsappPilot.deliveryReadyBody') : localWhatsApp.detail || t('dashboard.cockpit.whatsapp.unavailableBody')}</p></div>
        <div className="mt-6 space-y-4">
          <label className="block text-sm font-medium text-slate-700">{t('whatsappPilot.testRecipient')}<div className="mt-2"><InternationalPhoneField id="whatsapp-test-recipient" value={testRecipient} onChange={setTestRecipient} placeholder="(00) 00000-0000" ariaLabel={t('whatsappPilot.testRecipient')} disabled={!ready || sendState.status === 'sending'} /></div><span className="mt-1 block text-xs font-normal leading-5 text-slate-500">{t('whatsappPilot.testRecipientHint')}</span></label>
          <label className="block text-sm font-medium text-slate-700">{t('dashboard.cockpit.whatsapp.message')}<Textarea value={message} onChange={(event) => setMessage(event.target.value)} className="mt-2 min-h-28 resize-y" disabled={!ready || sendState.status === 'sending'} /></label><label className="flex items-start gap-3 rounded-xl border border-slate-200 p-3 text-sm leading-5 text-slate-700"><Checkbox checked={confirmed} onCheckedChange={(checked) => setConfirmed(checked === true)} disabled={!ready || sendState.status === 'sending'} /><span>{t('dashboard.cockpit.whatsapp.confirmation')}</span></label>
          <Button onClick={() => void sendTest()} disabled={!ready || !testRecipient.trim() || !message.trim() || !confirmed || sendState.status === 'sending'} className="rounded-full bg-[#2457D6] hover:bg-[#1d47b0]">{sendState.status === 'sending' ? t('dashboard.cockpit.whatsapp.sending') : t('dashboard.cockpit.whatsapp.sendTest')}</Button>{sendState.status === 'error' && <p className="text-sm text-red-700">{sendState.detail}</p>}{sendState.status === 'sent' && sendState.sentAt && <p className="mt-3 flex items-center gap-2 text-sm text-emerald-700"><CheckCircle2 className="h-4 w-4" />{sendState.detail === 'queued' ? t('whatsappPilot.testQueued', { recipient: sendState.recipient }) : t('dashboard.cockpit.whatsapp.sent', { recipient: sendState.recipient, time: new Intl.DateTimeFormat(i18n.language, { dateStyle: 'short', timeStyle: 'short' }).format(new Date(sendState.sentAt)) })}</p>}</div>
      </CardContent></Card>
    </section>
    <aside><Card className="border-amber-200 bg-amber-50/50 shadow-none"><CardContent className="p-5"><MessageCircle className="h-5 w-5 text-amber-800" /><h2 className="mt-3 font-semibold text-slate-950">{t('dashboard.cockpit.whatsapp.connectionTitle')}</h2><p className="mt-1 text-sm leading-6 text-slate-700">{t('dashboard.cockpit.whatsapp.connectionBody')}</p></CardContent></Card></aside>
  </div>;
};
