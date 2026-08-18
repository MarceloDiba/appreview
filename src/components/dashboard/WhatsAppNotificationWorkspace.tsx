import { useEffect, useState } from 'react';
import { CheckCircle2, MessageCircle, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { ExperimentalApifySnapshot } from '@/lib/experimentalApifySnapshot';
import { useOwnerTranslation } from '@/i18n/owner/useOwnerTranslation';
import type { LocalWhatsAppState } from '@/hooks/useLocalWhatsApp';
import { maskInternationalPhone, sendLocalWhatsAppText } from '@/lib/localWhatsApp';

type NotificationPreferences = {
  weeklyEnabled: boolean;
  repliesEnabled: boolean;
  reputationEnabled: boolean;
  profileEnabled: boolean;
  recipient: string;
  day: 'monday' | 'friday';
  time: string;
  consented: boolean;
};

const storageKey = 'binno.local-whatsapp-preferences';
const defaults: NotificationPreferences = {
  weeklyEnabled: true,
  repliesEnabled: true,
  reputationEnabled: true,
  profileEnabled: true,
  recipient: '',
  day: 'monday',
  time: '09:00',
  consented: false,
};

const readPreferences = (): NotificationPreferences => {
  try {
    return { ...defaults, ...JSON.parse(window.localStorage.getItem(storageKey) || '{}') };
  } catch {
    return defaults;
  }
};

export const WhatsAppNotificationWorkspace = ({ localWhatsApp, snapshot, onboardingPhone }: { localWhatsApp: LocalWhatsAppState; snapshot: ExperimentalApifySnapshot; onboardingPhone?: string }) => {
  const { t, i18n } = useOwnerTranslation();
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaults);
  const [testRecipient, setTestRecipient] = useState('');
  const [message, setMessage] = useState(t('dashboard.cockpit.whatsapp.defaultMessage'));
  const [confirmed, setConfirmed] = useState(false);
  const [saved, setSaved] = useState(false);
  const [sendState, setSendState] = useState<{ status: 'idle' | 'sending' | 'sent' | 'error'; detail?: string; sentAt?: string; recipient?: string }>({ status: 'idle' });
  const ready = localWhatsApp.status === 'ready' && localWhatsApp.session;
  const lowRatings = snapshot.sample.ratingBreakdown['1'] + snapshot.sample.ratingBreakdown['2'];
  const unanswered = (snapshot.sample.observedReviews?.items || []).filter((review) => !review.responseObserved).length;
  const briefing = t('dashboard.cockpit.assisted.briefing', {
    business: snapshot.business.name,
    rating: new Intl.NumberFormat(i18n.language, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(snapshot.business.googleRating),
    total: new Intl.NumberFormat(i18n.language).format(snapshot.business.googleReviewCount),
    low: new Intl.NumberFormat(i18n.language).format(lowRatings),
    queue: new Intl.NumberFormat(i18n.language).format(unanswered),
  });

  useEffect(() => {
    const stored = readPreferences();
    setPreferences({ ...stored, recipient: stored.recipient || onboardingPhone || '' });
    if (onboardingPhone) setTestRecipient((current) => current || onboardingPhone);
  }, [onboardingPhone]);

  const savePreferences = () => {
    window.localStorage.setItem(storageKey, JSON.stringify(preferences));
    setSaved(true);
  };

  const sendTest = async () => {
    if (!ready || !message.trim() || !testRecipient.trim()) return;
    setSendState({ status: 'sending' });
    try {
      const result = await sendLocalWhatsAppText({ sessionId: localWhatsApp.session.id, phone: testRecipient, text: message.trim() });
      setSendState({ status: 'sent', sentAt: result.sentAt, recipient: maskInternationalPhone(testRecipient) });
      setConfirmed(false);
    } catch (error) {
      setSendState({ status: 'error', detail: error instanceof Error ? error.message : t('dashboard.cockpit.whatsapp.sendError') });
    }
  };

  const setChoice = (key: keyof Pick<NotificationPreferences, 'weeklyEnabled' | 'repliesEnabled' | 'reputationEnabled' | 'profileEnabled'>, checked: boolean) => setPreferences((current) => ({ ...current, [key]: checked }));
  const choices: Array<{ key: keyof Pick<NotificationPreferences, 'weeklyEnabled' | 'repliesEnabled' | 'reputationEnabled' | 'profileEnabled'>; title: string; body: string }> = [
    { key: 'weeklyEnabled', title: t('whatsappPilot.weeklyTitle'), body: t('whatsappPilot.weeklyBody') },
    { key: 'repliesEnabled', title: t('whatsappPilot.repliesTitle'), body: t('whatsappPilot.repliesBody') },
    { key: 'reputationEnabled', title: t('whatsappPilot.reputationTitle'), body: t('whatsappPilot.reputationBody') },
    { key: 'profileEnabled', title: t('whatsappPilot.profileTitle'), body: t('whatsappPilot.profileBody') },
  ];

  return <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
    <section className="space-y-5">
      <Card className="border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]"><CardContent className="p-6">
        <h2 className="text-xl font-semibold text-slate-950">{t('dashboard.cockpit.whatsapp.notificationsTitle')}</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">{t('dashboard.cockpit.whatsapp.notificationsBody')}</p>
        <h3 className="mt-6 text-sm font-semibold text-slate-950">{t('whatsappPilot.interestsTitle')}</h3>
        <p className="mt-1 text-sm text-slate-600">{t('whatsappPilot.interestsBody')}</p>
        <div className="mt-4 space-y-3">{choices.map((choice) => <label key={choice.key} className="flex items-start gap-3 rounded-xl border border-slate-200 p-4 text-sm leading-5 text-slate-700"><Checkbox checked={preferences[choice.key]} onCheckedChange={(checked) => setChoice(choice.key, checked === true)} /><span><strong className="block text-slate-950">{choice.title}</strong>{choice.body}</span></label>)}</div>
        <div className="mt-5 grid gap-4 sm:grid-cols-3"><label className="text-sm font-medium text-slate-700 sm:col-span-2">{t('whatsappPilot.notificationRecipient')}<Input value={preferences.recipient} onChange={(event) => setPreferences((current) => ({ ...current, recipient: event.target.value }))} placeholder="+351 911 056 526" className="mt-2" inputMode="tel" /><span className="mt-1 block text-xs font-normal leading-5 text-slate-500">{onboardingPhone ? t('whatsappPilot.onboardingPhoneHint') : t('whatsappPilot.notificationRecipientHint')}</span></label><label className="text-sm font-medium text-slate-700">{t('dashboard.cockpit.whatsapp.time')}<Input type="time" value={preferences.time} onChange={(event) => setPreferences((current) => ({ ...current, time: event.target.value }))} className="mt-2" /></label></div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium text-slate-700">{t('dashboard.cockpit.whatsapp.frequency')}<select value={preferences.day} onChange={(event) => setPreferences((current) => ({ ...current, day: event.target.value as NotificationPreferences['day'] }))} className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="monday">{t('dashboard.cockpit.whatsapp.schedule.monday')}</option><option value="friday">{t('dashboard.cockpit.whatsapp.schedule.friday')}</option></select></label></div>
        <label className="mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-sm leading-5 text-amber-950"><Checkbox checked={preferences.consented} onCheckedChange={(checked) => setPreferences((current) => ({ ...current, consented: checked === true }))} /><span>{t('dashboard.cockpit.whatsapp.notificationsConsent')}</span></label>
        <Button onClick={savePreferences} className="mt-4 rounded-full bg-[#2457D6] hover:bg-[#1d47b0]"><Send className="mr-2 h-4 w-4" />{t('dashboard.cockpit.whatsapp.saveLocal')}</Button>{saved && <p className="mt-3 text-sm text-emerald-700">{t('dashboard.cockpit.whatsapp.preferencesSaved')}</p>}
      </CardContent></Card>
      <Card className="border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]"><CardContent className="p-6">
        <div className="flex items-start justify-between gap-3"><div><h2 className="text-xl font-semibold text-slate-950">{t('dashboard.cockpit.whatsapp.localTitle')}</h2><p className="mt-1 text-sm leading-6 text-slate-600">{t('dashboard.cockpit.whatsapp.localBody')}</p></div><Button variant="outline" size="sm" onClick={() => void localWhatsApp.refresh()}>{t('dashboard.cockpit.whatsapp.refresh')}</Button></div>
        <div className={`mt-5 rounded-xl border p-4 text-sm leading-6 ${ready ? 'border-emerald-100 bg-emerald-50/60 text-emerald-950' : 'border-amber-200 bg-amber-50/60 text-amber-950'}`}><strong className="block">{t(`dashboard.cockpit.whatsapp.status.${localWhatsApp.status}`)}</strong><p className="mt-1">{ready ? t('dashboard.cockpit.whatsapp.readyBody') : localWhatsApp.detail || t('dashboard.cockpit.whatsapp.unavailableBody')}</p></div>
        <div className="mt-6 space-y-4"><div className="rounded-xl border border-violet-200 bg-violet-50/50 p-4"><p className="text-sm font-semibold text-violet-950">{t('dashboard.cockpit.assisted.briefingTitle')}</p><p className="mt-2 whitespace-pre-line text-sm leading-6 text-violet-950">{briefing}</p><Button type="button" variant="outline" className="mt-3 border-violet-300 bg-white" onClick={() => setMessage(briefing)} disabled={!ready || sendState.status === 'sending'}>{t('dashboard.cockpit.assisted.useBriefing')}</Button></div>
          <label className="block text-sm font-medium text-slate-700">{t('whatsappPilot.testRecipient')}<Input value={testRecipient} onChange={(event) => setTestRecipient(event.target.value)} autoComplete="tel" inputMode="tel" placeholder="+351 911 056 526" className="mt-2" disabled={!ready || sendState.status === 'sending'} /><span className="mt-1 block text-xs font-normal leading-5 text-slate-500">{t('whatsappPilot.testRecipientHint')}</span></label>
          <label className="block text-sm font-medium text-slate-700">{t('dashboard.cockpit.whatsapp.message')}<Textarea value={message} onChange={(event) => setMessage(event.target.value)} className="mt-2 min-h-28 resize-y" disabled={!ready || sendState.status === 'sending'} /></label><label className="flex items-start gap-3 rounded-xl border border-slate-200 p-3 text-sm leading-5 text-slate-700"><Checkbox checked={confirmed} onCheckedChange={(checked) => setConfirmed(checked === true)} disabled={!ready || sendState.status === 'sending'} /><span>{t('dashboard.cockpit.whatsapp.confirmation')}</span></label>
          <Button onClick={() => void sendTest()} disabled={!ready || !testRecipient.trim() || !message.trim() || !confirmed || sendState.status === 'sending'} className="rounded-full bg-[#2457D6] hover:bg-[#1d47b0]">{sendState.status === 'sending' ? t('dashboard.cockpit.whatsapp.sending') : t('dashboard.cockpit.whatsapp.sendTest')}</Button>{sendState.status === 'error' && <p className="text-sm text-red-700">{sendState.detail}</p>}{sendState.status === 'sent' && sendState.sentAt && <p className="mt-3 flex items-center gap-2 text-sm text-emerald-700"><CheckCircle2 className="h-4 w-4" />{t('dashboard.cockpit.whatsapp.sent', { recipient: sendState.recipient, time: new Intl.DateTimeFormat(i18n.language, { dateStyle: 'short', timeStyle: 'short' }).format(new Date(sendState.sentAt)) })}</p>}</div>
      </CardContent></Card>
    </section>
    <aside><Card className="border-amber-200 bg-amber-50/50 shadow-none"><CardContent className="p-5"><MessageCircle className="h-5 w-5 text-amber-800" /><h2 className="mt-3 font-semibold text-slate-950">{t('dashboard.cockpit.whatsapp.connectionTitle')}</h2><p className="mt-1 text-sm leading-6 text-slate-700">{t('dashboard.cockpit.whatsapp.connectionBody')}</p></CardContent></Card></aside>
  </div>;
};
