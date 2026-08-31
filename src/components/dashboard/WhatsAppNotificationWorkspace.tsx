import { useEffect, useState } from 'react';
import { CheckCircle2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import InternationalPhoneField from '@/components/forms/InternationalPhoneField';
import { useOwnerTranslation } from '@/i18n/owner/useOwnerTranslation';
import type { LocalWhatsAppState } from '@/hooks/useLocalWhatsApp';
import { maskInternationalPhone, sendLocalWhatsAppText } from '@/lib/localWhatsApp';
import { defaultPilotNotificationPreferences, type PilotNotificationPreferences, readLatestPilotNotificationDelivery, readPilotNotificationPreferences, savePilotNotificationPreferences } from '@/lib/pilotNotificationPreferences';
import { enqueueWhatsAppTest, getWhatsAppDeliveryState, saveWhatsAppDeliveryPreferences, type WhatsAppDelivery } from '@/lib/whatsappDelivery';
import { lerEstadoDaLigacao } from '@/lib/whatsappConnection';

/**
 * A tela do WhatsApp, destino próprio do menu desde 31/08/2026.
 *
 * Ela vivia ao fim do painel, presente em todas as telas do dono. Marcelo
 * tirou-a de lá e deu-lhe destino próprio: configuração não tem prazo, e estar
 * sempre à frente de quem abriu o painel para responder alguém custava a
 * primeira dobra.
 *
 * A ligação virou um teste só. O estado que a tela afirma vem de
 * `lerEstadoDaLigacao`, e o cabeçalho daquele módulo explica por que a sessão
 * local e o backend responder não provam ligação nenhuma. Ver "Painel que cabe
 * no celular" no contrato de produto.
 *
 * O ramo de demonstração deste componente foi apagado com a mudança: ele só
 * era alcançado pelo cockpit em modo `demo`, que deixou de renderizar esta
 * tela. Código que ninguém alcança é onde o texto errado sobrevive a todas as
 * correções, e este arquivo já pagou por isso uma vez.
 */
export const WhatsAppNotificationWorkspace = ({ localWhatsApp, onboardingPhone }: { localWhatsApp: LocalWhatsAppState; onboardingPhone?: string }) => {
  const { t } = useOwnerTranslation();
  const [preferences, setPreferences] = useState<PilotNotificationPreferences>(defaultPilotNotificationPreferences);
  // Um número só. Dois campos de telefone faziam a pessoa preencher um e o
  // sistema cobrar o outro, sem dizer qual. O teste vai para o mesmo número
  // que recebe as notificações.
  const [confirmed, setConfirmed] = useState(false);
  const [saved, setSaved] = useState(false);
  const [sendState, setSendState] = useState<{ status: 'idle' | 'sending' | 'error'; detail?: string }>({ status: 'idle' });
  // "Refazer o teste" precisa de estado próprio. Sem ele o botão era decorativo:
  // limpava variáveis e recarregava, a linha `delivered` de antes continuava lá,
  // o estado voltava a ser "ativa" e o mesmo painel redesenhava-se. Depois do
  // primeiro teste bem sucedido o formulário ficava inalcançável para sempre.
  const [refazendo, setRefazendo] = useState(false);
  const [latestAdvisorDelivery, setLatestAdvisorDelivery] = useState(() => readLatestPilotNotificationDelivery());
  const [backendState, setBackendState] = useState<'checking' | 'ready' | 'local-fallback' | 'unavailable'>('checking');
  const [deliveries, setDeliveries] = useState<WhatsAppDelivery[]>([]);
  const [ultimoTeste, setUltimoTeste] = useState<WhatsAppDelivery | null>(null);
  const testRecipient = preferences.recipient;
  const directReady = localWhatsApp.status === 'ready' && localWhatsApp.session;
  const ready = backendState === 'ready' || Boolean(directReady);

  // O estado da ligação nasce do último teste registado, e de mais nada.
  // Nenhum atalho ao lado desta linha: ver o cabeçalho de
  // `src/lib/whatsappConnection.ts` para o que foi apagado daqui e por quê.
  const estadoDaLigacao = lerEstadoDaLigacao(ultimoTeste);
  // O formulário reaparece quando o dono pede para refazer, e é isso que torna
  // o botão um caminho em vez de um enfeite.
  const mostrandoFormulario = refazendo || estadoDaLigacao !== 'ativa';

  useEffect(() => {
    const stored = readPilotNotificationPreferences();
    setPreferences({ ...stored, recipient: stored.recipient || onboardingPhone || '' });
  }, [onboardingPhone]);

  const refreshDeliveryState = async () => {
    const state = await getWhatsAppDeliveryState();
    setDeliveries(state.deliveries);
    setUltimoTeste(state.lastTest);
    if (state.preferences) setPreferences(state.preferences);
    setBackendState('ready');
    return state;
  };

  useEffect(() => {
    let active = true;
    void refreshDeliveryState().catch(() => {
      if (!active) return;
      setBackendState(import.meta.env.DEV ? 'local-fallback' : 'unavailable');
    });
    setLatestAdvisorDelivery(readLatestPilotNotificationDelivery());
    return () => { active = false; };
  }, []);

  const savePreferences = async () => {
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

  const message = t('dashboard.cockpit.whatsapp.defaultMessage');

  const sendTest = async () => {
    if (!ready || !testRecipient.trim()) return;
    setSendState({ status: 'sending' });
    try {
      if (backendState === 'ready') {
        await enqueueWhatsAppTest({ recipient: testRecipient, message });
        setSendState({ status: 'idle' });
        // O teste novo é agora o último da outbox, e é ele que decide o estado
        // daqui para a frente. O modo "refazendo" fecha-se aqui: a partir deste
        // ponto quem manda é a linha nova, não a intenção do clique.
        setRefazendo(false);
        await refreshDeliveryState();
      } else if (directReady) {
        // Caminho só de desenvolvimento: não passa pela outbox, então não deixa
        // prova nenhuma. A tela diz o que sabe (saiu, sem confirmação) em vez de
        // afirmar uma ligação que ninguém confirmou.
        await sendLocalWhatsAppText({ sessionId: directReady.id, phone: testRecipient, text: message });
        setSendState({ status: 'idle' });
      } else {
        throw new Error(t('whatsappPilot.backendUnavailable'));
      }
      setConfirmed(false);
    } catch (error) {
      setSendState({ status: 'error', detail: error instanceof Error ? error.message : t('dashboard.cockpit.whatsapp.sendError') });
    }
  };

  const refazer = () => {
    setRefazendo(true);
    setConfirmed(false);
    setSendState({ status: 'idle' });
    void refreshDeliveryState().catch(() => setBackendState(import.meta.env.DEV ? 'local-fallback' : 'unavailable'));
  };

  // Entrar no formulário com a ligação ativa não pode virar a mesma armadilha
  // ao contrário: quem mudou de ideia volta ao painel sem ter de testar.
  const voltar = () => {
    setRefazendo(false);
    setConfirmed(false);
    setSendState({ status: 'idle' });
  };

  const setChoice = (key: keyof Pick<PilotNotificationPreferences, 'weeklyEnabled' | 'repliesEnabled' | 'reputationEnabled' | 'feedbackEnabled'>, checked: boolean) => setPreferences((current) => ({ ...current, [key]: checked }));
  // A opção "Perfil do Google" saiu em 31/08/2026: prometia lembretes que só
  // existiriam com a conexão oficial ligada, e nenhuma conta real a tem. O
  // campo `profileEnabled` continua no tipo e no banco, para não apagar a
  // escolha de quem já a fez; o que saiu é a linha que a oferecia.
  const choices: Array<{ key: keyof Pick<PilotNotificationPreferences, 'weeklyEnabled' | 'repliesEnabled' | 'reputationEnabled' | 'feedbackEnabled'>; title: string; body: string }> = [
    { key: 'weeklyEnabled', title: t('whatsappPilot.weeklyTitle'), body: t('whatsappPilot.weeklyBody') },
    { key: 'repliesEnabled', title: t('whatsappPilot.repliesTitle'), body: t('whatsappPilot.repliesBody') },
    { key: 'reputationEnabled', title: t('whatsappPilot.reputationTitle'), body: t('whatsappPilot.reputationBody') },
    { key: 'feedbackEnabled', title: t('whatsappPilot.feedbackTitle'), body: t('whatsappPilot.feedbackBody') },
  ];

  return <div className="space-y-5">
    {/*
      O teste vem primeiro: é o que o dono veio fazer aqui. Depois de ele passar,
      este cartão encolhe para duas coisas, o estado e o botão de refazer, e a
      configuração fica logo a seguir, sem ter de rolar por cima de um
      formulário de teste que já cumpriu o seu papel.
    */}
    <Card className={`shadow-[0_1px_3px_rgba(15,23,42,0.08)] ${!mostrandoFormulario ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200 bg-white'}`}><CardContent className="p-5 sm:p-6">
      {mostrandoFormulario ? (
        <>
          <h2 className="text-lg font-semibold text-slate-950">{t('whatsappPilot.testeTitulo')}</h2>
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
            <p className="font-medium text-slate-950">{t('whatsappPilot.testRecipient')}</p>
            <p className="mt-1">{testRecipient.trim() ? maskInternationalPhone(testRecipient) : t('whatsappPilot.testRecipientMissing')}</p>
            {/*
              A secção 4 do contrato manda a tela distinguir sem ambiguidade o
              WhatsApp do gestor do número de teste, e nunca usar o de um
              cliente. Esta linha era a que dizia isso; ficou órfã quando o
              cartão de teste passou a vir ANTES do bloco de notificações, e
              voltou com a direção corrigida.
            */}
            <p className="mt-1 text-xs leading-5 text-slate-500">{t('whatsappPilot.testRecipientHint')}</p>
          </div>
          <label className="mt-4 flex items-start gap-3 rounded-xl border border-slate-200 p-3 text-sm leading-5 text-slate-700">
            <Checkbox checked={confirmed} onCheckedChange={(checked) => setConfirmed(checked === true)} disabled={!ready || sendState.status === 'sending'} />
            <span>{t('dashboard.cockpit.whatsapp.confirmation')}</span>
          </label>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button onClick={() => void sendTest()} disabled={!ready || !testRecipient.trim() || !confirmed || sendState.status === 'sending'} className="w-full rounded-full bg-[#2457D6] hover:bg-[#1d47b0] sm:w-auto">
              {sendState.status === 'sending' ? t('dashboard.cockpit.whatsapp.sending') : t('whatsappPilot.testeBotao')}
            </Button>
            {estadoDaLigacao === 'a-caminho' && (
              <Button variant="outline" className="w-full sm:w-auto" onClick={refazer}>{t('dashboard.cockpit.whatsapp.refresh')}</Button>
            )}
          </div>
          {/*
            "Na fila" não é "chegou". Enquanto o estado do último teste for
            `queued` ou `sending`, o Binno guardou a intenção e mais nada: é
            exatamente o que ele faria com o WhatsApp desligado.
          */}
          {estadoDaLigacao === 'a-caminho' && <p className="mt-3 text-sm leading-5 text-slate-600">{t('whatsappPilot.testeACaminho')}</p>}
          {estadoDaLigacao === 'falhou' && <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm leading-5 text-red-800">{t('whatsappPilot.testeFalhou')}</p>}
          {/*
            "Funcionou uma vez" não é "está de pé agora": a sessão do OpenWA
            despareia, e um `delivered` de há seis semanas dizia "ligação ativa"
            para sempre. Ver JANELA_DE_PROVA_EM_DIAS.
          */}
          {estadoDaLigacao === 'expirado' && <p className="mt-3 text-sm leading-5 text-slate-600">{t('whatsappPilot.testeExpirado')}</p>}
          {!ready && backendState !== 'checking' && <p className="mt-3 text-sm leading-5 text-slate-600">{t('whatsappPilot.backendUnavailable')}</p>}
          {sendState.status === 'error' && <p className="mt-3 text-sm text-red-700">{sendState.detail}</p>}
          {/*
            Só aparece quando existe um painel de ligação ativa para onde voltar,
            que é exatamente quando entrar aqui foi uma escolha e não o estado
            natural da tela.
          */}
          {refazendo && estadoDaLigacao === 'ativa' && (
            <Button variant="link" className="mt-2 h-auto px-0 text-[#2457D6]" onClick={voltar}>{t('whatsappPilot.testeVoltar')}</Button>
          )}
        </>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2 font-medium text-emerald-950"><CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-700" aria-hidden="true" />{t('whatsappPilot.ligacaoAtiva')}</p>
          <Button variant="outline" className="w-full sm:w-auto" onClick={refazer}>{t('whatsappPilot.testeRefazer')}</Button>
        </div>
      )}
    </CardContent></Card>

    <Card className="border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]"><CardContent className="p-5 sm:p-6">
      <h2 className="text-xl font-semibold text-slate-950">{t('dashboard.cockpit.whatsapp.notificationsTitle')}</h2>
      <h3 className="mt-6 text-sm font-semibold text-slate-950">{t('whatsappPilot.interestsTitle')}</h3>
      <p className="mt-1 text-sm text-slate-600">{t('whatsappPilot.interestsBody')}</p>
      <div className="mt-4 space-y-3">{choices.map((choice) => <label key={choice.key} className="flex items-start gap-3 rounded-xl border border-slate-200 p-4 text-sm leading-5 text-slate-700"><Checkbox checked={preferences[choice.key]} onCheckedChange={(checked) => setChoice(choice.key, checked === true)} /><span><strong className="block text-slate-950">{choice.title}</strong>{choice.body}</span></label>)}</div>
      <div className="mt-5 grid gap-4 sm:grid-cols-3"><label className="text-sm font-medium text-slate-700 sm:col-span-2">{t('whatsappPilot.notificationRecipient')}<div className="mt-2"><InternationalPhoneField id="whatsapp-recipient" value={preferences.recipient} onChange={(recipient) => setPreferences((current) => ({ ...current, recipient }))} placeholder="(00) 00000-0000" ariaLabel={t('whatsappPilot.notificationRecipient')} /></div><span className="mt-1 block text-xs font-normal leading-5 text-slate-500">{onboardingPhone ? t('whatsappPilot.onboardingPhoneHint') : t('whatsappPilot.notificationRecipientHint')}</span></label><label className="text-sm font-medium text-slate-700">{t('dashboard.cockpit.whatsapp.time')}<Input type="time" value={preferences.time} onChange={(event) => setPreferences((current) => ({ ...current, time: event.target.value }))} className="mt-2" /></label></div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium text-slate-700">{t('dashboard.cockpit.whatsapp.frequency')}<select value={preferences.day} onChange={(event) => setPreferences((current) => ({ ...current, day: event.target.value as PilotNotificationPreferences['day'] }))} className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="monday">{t('dashboard.cockpit.whatsapp.schedule.monday')}</option><option value="friday">{t('dashboard.cockpit.whatsapp.schedule.friday')}</option></select></label></div>
      <label className="mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-sm leading-5 text-amber-950"><Checkbox checked={preferences.consented} onCheckedChange={(checked) => setPreferences((current) => ({ ...current, consented: checked === true }))} /><span>{t('dashboard.advisorPilot.notificationsConsent')}</span></label>
      <Button onClick={() => void savePreferences().catch((error) => setSendState({ status: 'error', detail: error instanceof Error ? error.message : t('whatsappPilot.backendUnavailable') }))} className="mt-4 w-full rounded-full bg-[#2457D6] hover:bg-[#1d47b0] sm:w-auto"><Send className="mr-2 h-4 w-4" aria-hidden="true" />{backendState === 'ready' ? t('whatsappPilot.save') : t('dashboard.cockpit.whatsapp.saveLocal')}</Button>{saved && <p className="mt-3 text-sm text-emerald-700">{backendState === 'ready' ? t('whatsappPilot.preferencesSaved') : t('dashboard.advisorPilot.preferencesSaved')}</p>}
      <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-5 text-slate-700"><p className="font-semibold text-slate-950">{t('dashboard.cockpit.whatsapp.historyTitle')}</p><p className="mt-1">{deliveries[0] ? t(`whatsappPilot.delivery.${deliveries[0].status}`, { recipient: maskInternationalPhone(deliveries[0].recipient) }) : latestAdvisorDelivery?.status === 'sent' ? t('dashboard.advisorPilot.whatsappSent') : latestAdvisorDelivery?.status === 'failed' ? t('dashboard.advisorPilot.whatsappFailed') : t('dashboard.cockpit.whatsapp.historyEmpty')}</p></div>
    </CardContent></Card>
  </div>;
};
