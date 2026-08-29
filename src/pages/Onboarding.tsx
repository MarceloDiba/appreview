import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { AlertCircle, Check, Printer } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import {
  QR_PRINT_SIZE,
  QR_SCREEN_SIZE,
  downloadDataUrl,
  isLoopbackPublicOrigin,
  isNonCanonicalPublicOrigin,
  publicAppOrigin,
  publicReviewUrl,
  qrDataUrl,
  slugFilename,
} from '@/lib/qr';
import { useOwnerTranslation } from '@/i18n/owner/useOwnerTranslation';
import LanguageSwitcher from '@/components/layout/LanguageSwitcher';
import { extractPlaceIdFromUrl } from '@/utils/googlePlaceUtils';
import InternationalPhoneField from '@/components/forms/InternationalPhoneField';
import BusinessCountrySelect from '@/components/forms/BusinessCountrySelect';
import { localeFromBusiness, qrCardCopy } from '@/lib/businessLocale';
import { printQrCard } from '@/lib/qrCard';

/**
 * Configuração guiada.
 *
 * O dono chegava ao painel vazio e tinha de descobrir sozinho que precisava de
 * três coisas em três sítios diferentes: link do Google, nome nas definições
 * e QR code. Quem não sabe de tecnologia — que é exactamente quem este produto
 * serve — desiste antes do fim.
 *
 * Aqui é um passo de cada vez, cada um guardado quando avança, e ninguém sai
 * sem um QR code pronto a imprimir. É esse o único activo físico do cliente: se
 * ele não sair daqui com o código na mão, nada do resto acontece.
 *
 * Primeira tela do painel a passar para o react-i18next (pt-BR / pt-PT / en).
 * Os textos vivem nos catálogos em `src/i18n/owner/locales`.
 */

type Step = 1 | 2 | 3;

const STEPS: { n: Step; labelKey: string }[] = [
  { n: 1, labelKey: 'onboarding.step1Label' },
  { n: 2, labelKey: 'onboarding.step2Label' },
  { n: 3, labelKey: 'onboarding.step3Label' },
];

const Onboarding = () => {
  const navigate = useNavigate();
  const { t, i18n } = useOwnerTranslation();
  const { user, loading: authLoading } = useAuth();
  const baseUrl = publicAppOrigin();
  const isLoopback = isLoopbackPublicOrigin(baseUrl);
  // Loopback já é bloqueado em createQr(); o aviso só se aplica quando a
  // criação está de facto liberada, mas o endereço ainda não é o oficial.
  const requiresOriginConfirmation = !isLoopback && isNonCanonicalPublicOrigin(baseUrl);

  const [step, setStep] = useState<Step>(1);
  const [saving, setSaving] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(true);

  // Passo 2
  const [businessName, setBusinessName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [businessCountry, setBusinessCountry] = useState('');

  // Passo 1
  const [googleUrl, setGoogleUrl] = useState('');

  // Passo 3
  const [qrName, setQrName] = useState('Mesa 1');
  const [createdQr, setCreatedQr] = useState<{ name: string; url: string; image: string } | null>(
    null
  );
  const [confirmedNonCanonical, setConfirmedNonCanonical] = useState(false);

  /**
   * Carrega o que já existe antes de mostrar os campos. Sem isto, quem volta ao
   * passo a passo vê campos vazios e pensa que perdeu o que já tinha feito.
   */
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoadingExisting(false);
      return;
    }
    let active = true;

    const load = async () => {
      const [profile, links] = await Promise.all([
        supabase
          .from('profiles')
          .select('business_name, first_name, last_name, phone, business_country')
          .eq('id', user.id)
          .maybeSingle(),
        supabase.from('platform_links').select('platform, url').eq('user_id', user.id),
      ]);

      if (!active) return;

      if (profile.data) {
        setBusinessName(profile.data.business_name || '');
        setOwnerName(
          [profile.data.first_name, profile.data.last_name].filter(Boolean).join(' ').trim()
        );
        setPhone(profile.data.phone || '');
        setBusinessCountry(profile.data.business_country || '');
      }

      const google = (links.data || []).find((l) => l.platform?.toLowerCase().includes('google'));
      if (google?.url) setGoogleUrl(google.url);
    };

    // Se a leitura falhar — banco em baixo, rede fraca — mostra-se o formulário
    // vazio em vez de um spinner eterno. O dono ainda consegue configurar tudo;
    // é ao gravar que saberá se há problema.
    load()
      .catch((error) => console.error('Erro ao carregar a configuração existente:', error))
      .finally(() => {
        if (active) setLoadingExisting(false);
      });
    return () => {
      active = false;
    };
  }, [user]);

  const saveBusiness = async () => {
    if (!user || !businessName.trim()) return;
    setSaving(true);
    try {
      const [firstName, ...rest] = ownerName.trim().split(/\s+/);
      const { error } = await supabase.from('profiles').upsert({
        id: user.id,
        business_name: businessName.trim(),
        first_name: firstName || null,
        last_name: rest.length ? rest.join(' ') : null,
        phone: phone.trim() || null,
        business_country: businessCountry || null,
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;
      setStep(3);
    } catch (error) {
      console.error('Erro ao guardar o negócio:', error);
      toast.error(t('onboarding.errSave'));
    } finally {
      setSaving(false);
    }
  };

  /**
   * Grava só as plataformas deste passo. Apagar tudo e reinserir — como faz o
   * ecrã de definições — arriscava levar à frente links que o dono já tinha.
   */
  const saveLinks = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const wanted = [{ platform: 'google reviews', display: 'Google Reviews', url: googleUrl.trim() }];

      for (const link of wanted) {
        await supabase
          .from('platform_links')
          .delete()
          .eq('user_id', user.id)
          .eq('platform', link.platform);
      }

      if (wanted.length) {
        const { error } = await supabase.from('platform_links').insert(
          wanted.map((l) => ({
            user_id: user.id,
            platform: l.platform,
            display_name: l.display,
            url: l.url,
            place_id:
              l.platform === 'google reviews' ? extractPlaceIdFromUrl(l.url) : null,
          }))
        );
        if (error) throw error;
      }

      setStep(2);
    } catch (error) {
      console.error('Erro ao guardar os links:', error);
      toast.error(t('onboarding.errLinks'));
    } finally {
      setSaving(false);
    }
  };

  const createQr = async () => {
    if (!user || !qrName.trim()) return;
    if (isLoopback) {
      toast.error(t('onboarding.errQrLocal'));
      return;
    }
    if (requiresOriginConfirmation && !confirmedNonCanonical) return;
    setSaving(true);
    try {
      // O slug primeiro, a imagem depois — a ordem que corrigiu o QR impresso
      // que apontava para uma página inexistente. Ver src/lib/qr.ts.
      const slug = uuidv4().substring(0, 8);
      const url = publicReviewUrl(baseUrl, slug);

      const { error } = await supabase
        .from('qr_codes')
        .insert([{ user_id: user.id, name: qrName.trim(), slug, redirect_url: url }]);

      if (error) throw error;

      setCreatedQr({ name: qrName.trim(), url, image: await qrDataUrl(url, QR_SCREEN_SIZE) });
    } catch (error) {
      console.error('Erro ao criar o QR code:', error);
      toast.error(t('onboarding.errQr'));
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loadingExisting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-t-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-xl">
        <div className="mb-2 flex justify-end">
          <LanguageSwitcher />
        </div>

        <header className="mb-8 text-center">
          <h1 className="text-2xl font-bold">{t('onboarding.headerTitle')}</h1>
          <p className="mt-2 text-gray-600">{t('onboarding.headerSubtitle')}</p>
        </header>

        <ol className="mb-6 flex items-center justify-center gap-2 text-sm">
          {STEPS.map(({ n, labelKey }) => (
            <li key={n} className="flex items-center gap-2">
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
                  step > n
                    ? 'bg-green-600 text-white'
                    : step === n
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-gray-200 text-gray-500'
                }`}
              >
                {step > n ? <Check size={14} aria-hidden="true" /> : n}
              </span>
              <span className={step === n ? 'font-medium text-gray-900' : 'text-gray-500'}>
                {t(labelKey)}
              </span>
              {n !== 3 && <span className="mx-1 text-gray-300">—</span>}
            </li>
          ))}
        </ol>

        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>{t('onboarding.step1Title')}</CardTitle>
              <CardDescription>{t('onboarding.step1Desc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="googleUrl">{t('onboarding.googleLabel')}</Label>
                <Input
                  id="googleUrl"
                  value={googleUrl}
                  onChange={(e) => setGoogleUrl(e.target.value)}
                  placeholder={t('onboarding.googlePlaceholder')}
                  autoFocus
                />
                <p className="text-xs text-gray-500">{t('onboarding.googleHelp')}</p>
              </div>
              <div className="flex justify-end pt-2">
                <Button onClick={saveLinks} disabled={saving || !googleUrl.trim()}>
                  {saving ? t('onboarding.saving') : t('onboarding.continue')}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>{t('onboarding.step2Title')}</CardTitle>
              <CardDescription>{t('onboarding.step2Desc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="businessName">{t('onboarding.businessNameLabel')}</Label>
                <Input
                  id="businessName"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder={t('onboarding.businessNamePlaceholder')}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ownerName">{t('onboarding.ownerNameLabel')}</Label>
                <Input
                  id="ownerName"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder={t('onboarding.ownerNamePlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">{t('onboarding.phoneLabel')}</Label>
                <InternationalPhoneField
                  id="phone"
                  value={phone}
                  onChange={setPhone}
                  placeholder={t('onboarding.phonePlaceholder')}
                  ariaLabel={t('onboarding.phoneCountryLabel')}
                />
                <p className="text-xs text-muted-foreground">{t('onboarding.phoneHelp')}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="business-country">{t('onboarding.businessCountryLabel')}</Label>
                <BusinessCountrySelect
                  id="business-country"
                  value={businessCountry}
                  onChange={setBusinessCountry}
                  placeholder={t('onboarding.businessCountryPlaceholder')}
                  locale={i18n.language}
                />
                <p className="text-xs text-muted-foreground">{t('onboarding.businessCountryHelp')}</p>
              </div>
              <div className="flex items-center justify-between pt-2">
                <Button variant="ghost" onClick={() => setStep(1)} disabled={saving}>
                  {t('onboarding.back')}
                </Button>
                <Button onClick={saveBusiness} disabled={saving || !businessName.trim() || !businessCountry}>
                  {saving ? t('onboarding.saving') : t('onboarding.continue')}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>{t('onboarding.step3Title')}</CardTitle>
              <CardDescription>{t('onboarding.step3Desc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!createdQr ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="qrName">{t('onboarding.qrNameLabel')}</Label>
                    <Input
                      id="qrName"
                      value={qrName}
                      onChange={(e) => setQrName(e.target.value)}
                      placeholder={t('onboarding.qrNamePlaceholder')}
                      autoFocus
                    />
                  </div>
                  {requiresOriginConfirmation && (
                    <div className="flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
                      <div className="flex gap-3">
                        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-800" aria-hidden="true" />
                        <p>
                          <strong>{t('qrcodes.nonCanonicalTitle')}</strong>
                          <br />
                          {t('qrcodes.nonCanonicalBody', { url: baseUrl.replace(/\/$/, '') })}
                        </p>
                      </div>
                      <label className="flex items-start gap-2 pl-8">
                        <Checkbox
                          checked={confirmedNonCanonical}
                          onCheckedChange={(checked) => setConfirmedNonCanonical(checked === true)}
                        />
                        <span>{t('qrcodes.nonCanonicalConfirm')}</span>
                      </label>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-2">
                    <Button variant="ghost" onClick={() => setStep(2)}>
                      {t('onboarding.back')}
                    </Button>
                    <Button
                      onClick={createQr}
                      disabled={
                        saving ||
                        !qrName.trim() ||
                        (requiresOriginConfirmation && !confirmedNonCanonical)
                      }
                    >
                      {saving ? t('onboarding.creating') : t('onboarding.createQr')}
                    </Button>
                  </div>
                </>
              ) : (
                (() => {
                  const cardCopy = qrCardCopy(localeFromBusiness(businessCountry, phone));
                  return <div className="space-y-4 text-center">
                  <div className="inline-block max-w-sm rounded-md border bg-white p-4">
                    <p className="text-lg font-bold">{cardCopy.ask}</p>
                    <p className="mt-1 text-sm text-gray-600">{cardCopy.help}</p>
                    <img
                      className="mx-auto my-4"
                      src={createdQr.image}
                      alt={`QR code ${createdQr.name}`}
                      width={QR_SCREEN_SIZE}
                      height={QR_SCREEN_SIZE}
                    />
                    <p className="text-xs text-gray-500">{cardCopy.scan}</p>
                  </div>
                  <p className="font-medium">{createdQr.name}</p>
                  <p className="text-sm text-gray-600">{t('onboarding.readyBody')}</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button
                      onClick={async () => {
                        const printed = await printQrCard({
                          qrName: createdQr.name,
                          qrUrl: createdQr.url,
                          businessName,
                          businessCountry,
                          businessPhone: phone,
                        });
                        if (!printed) toast.error(t('qrcodes.popupHint'));
                      }}
                    >
                      <Printer className="mr-2 h-4 w-4" aria-hidden="true" />
                      {t('qrcodes.printCard')}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={async () => {
                        const highRes = await qrDataUrl(createdQr.url, QR_PRINT_SIZE);
                        downloadDataUrl(highRes, `qrcode-${slugFilename(createdQr.name)}.png`);
                      }}
                    >
                      <Printer className="mr-2 h-4 w-4" aria-hidden="true" />
                      {t('onboarding.downloadPrint')}
                    </Button>
                    <Button variant="outline" onClick={() => navigate('/qrcodes')}>
                      {t('onboarding.seeAll')}
                    </Button>
                  </div>
                  <div className="pt-2">
                    <Button variant="ghost" onClick={() => navigate('/dashboard')}>
                      {t('onboarding.goToPanel')}
                    </Button>
                  </div>
                </div>;
                })()
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
