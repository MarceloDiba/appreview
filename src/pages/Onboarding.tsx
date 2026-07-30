import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Check, Printer } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { QR_PRINT_SIZE, QR_SCREEN_SIZE, downloadDataUrl, publicReviewUrl, qrDataUrl, slugFilename } from '@/lib/qr';

/**
 * Configuração guiada.
 *
 * O dono chegava ao painel vazio e tinha de descobrir sozinho que precisava de
 * três coisas em três sítios diferentes: nome nas definições, link do Google
 * noutro separador, e QR code numa terceira página. Quem não sabe de tecnologia
 * — que é exactamente quem este produto serve — desiste antes do fim.
 *
 * Aqui é um passo de cada vez, cada um guardado quando avança, e ninguém sai
 * sem um QR code pronto a imprimir. É esse o único activo físico do cliente: se
 * ele não sair daqui com o código na mão, nada do resto acontece.
 */

type Step = 1 | 2 | 3;

const STEPS: { n: Step; label: string }[] = [
  { n: 1, label: 'O seu negócio' },
  { n: 2, label: 'Onde o avaliam' },
  { n: 3, label: 'O código para a mesa' },
];

const Onboarding = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const baseUrl = window.location.origin;

  const [step, setStep] = useState<Step>(1);
  const [saving, setSaving] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(true);

  // Passo 1
  const [businessName, setBusinessName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');

  // Passo 2
  const [googleUrl, setGoogleUrl] = useState('');
  const [tripAdvisorUrl, setTripAdvisorUrl] = useState('');

  // Passo 3
  const [qrName, setQrName] = useState('Mesa 1');
  const [createdQr, setCreatedQr] = useState<{ name: string; url: string; image: string } | null>(
    null
  );

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
          .select('business_name, first_name, last_name, phone')
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
      }

      const google = (links.data || []).find((l) => l.platform?.toLowerCase().includes('google'));
      const trip = (links.data || []).find((l) => l.platform?.toLowerCase().includes('tripadvisor'));
      if (google?.url) setGoogleUrl(google.url);
      if (trip?.url) setTripAdvisorUrl(trip.url);
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
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;
      setStep(2);
    } catch (error) {
      console.error('Erro ao guardar o negócio:', error);
      toast.error('Não foi possível guardar. Tente novamente.');
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
      const wanted = [
        { platform: 'google reviews', display: 'Google Reviews', url: googleUrl.trim() },
        { platform: 'tripadvisor', display: 'TripAdvisor', url: tripAdvisorUrl.trim() },
      ].filter((l) => l.url);

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
          }))
        );
        if (error) throw error;
      }

      setStep(3);
    } catch (error) {
      console.error('Erro ao guardar os links:', error);
      toast.error('Não foi possível guardar os links. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const createQr = async () => {
    if (!user || !qrName.trim()) return;
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
      toast.error('Não foi possível criar o QR code. Tente novamente.');
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
        <header className="mb-8 text-center">
          <h1 className="text-2xl font-bold">Vamos pôr o seu negócio a funcionar</h1>
          <p className="mt-2 text-gray-600">
            São três passos. Leva menos de cinco minutos e no fim já tem o código pronto a imprimir.
          </p>
        </header>

        <ol className="mb-6 flex items-center justify-center gap-2 text-sm">
          {STEPS.map(({ n, label }) => (
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
                {label}
              </span>
              {n !== 3 && <span className="mx-1 text-gray-300">—</span>}
            </li>
          ))}
        </ol>

        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>O seu negócio</CardTitle>
              <CardDescription>
                O nome aparece a quem avalia e assina as respostas que enviar.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="businessName">Nome do seu negócio</Label>
                <Input
                  id="businessName"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Como os clientes o conhecem"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ownerName">O seu nome (opcional)</Label>
                <Input
                  id="ownerName"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="Quem responde aos clientes"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone (opcional)</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Para o contactarmos se algo falhar"
                />
              </div>
              <div className="flex justify-end pt-2">
                <Button onClick={saveBusiness} disabled={saving || !businessName.trim()}>
                  {saving ? 'A guardar...' : 'Continuar'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Onde os seus clientes o avaliam</CardTitle>
              <CardDescription>
                É para aqui que enviamos quem quiser deixar avaliação pública — qualquer que seja a
                nota que deu. Cole o endereço da sua página no Google.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="googleUrl">Endereço da sua página no Google</Label>
                <Input
                  id="googleUrl"
                  value={googleUrl}
                  onChange={(e) => setGoogleUrl(e.target.value)}
                  placeholder="https://g.page/... ou o link do Google Maps"
                  autoFocus
                />
                <p className="text-xs text-gray-500">
                  Procure o seu negócio no Google Maps e copie o endereço da barra do navegador.
                  Serve também o link curto <code>g.page</code>.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tripAdvisorUrl">TripAdvisor (opcional)</Label>
                <Input
                  id="tripAdvisorUrl"
                  value={tripAdvisorUrl}
                  onChange={(e) => setTripAdvisorUrl(e.target.value)}
                  placeholder="https://www.tripadvisor.pt/..."
                />
              </div>
              <div className="flex items-center justify-between pt-2">
                <Button variant="ghost" onClick={() => setStep(1)}>
                  Voltar
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(3)} disabled={saving}>
                    Fazer isto depois
                  </Button>
                  <Button onClick={saveLinks} disabled={saving || !googleUrl.trim()}>
                    {saving ? 'A guardar...' : 'Continuar'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>O código para pôr na mesa</CardTitle>
              <CardDescription>
                É este código que o cliente aponta com o telemóvel. Dê-lhe o nome do sítio onde vai
                ficar, para saber depois de onde veio cada avaliação.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!createdQr ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="qrName">Onde vai ficar este código?</Label>
                    <Input
                      id="qrName"
                      value={qrName}
                      onChange={(e) => setQrName(e.target.value)}
                      placeholder="Ex: Mesa 1, Balcão, Recepção"
                      autoFocus
                    />
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <Button variant="ghost" onClick={() => setStep(2)}>
                      Voltar
                    </Button>
                    <Button onClick={createQr} disabled={saving || !qrName.trim()}>
                      {saving ? 'A criar...' : 'Criar o meu QR code'}
                    </Button>
                  </div>
                </>
              ) : (
                <div className="space-y-4 text-center">
                  <div className="inline-block rounded-md border bg-white p-4">
                    <img
                      src={createdQr.image}
                      alt={`QR code ${createdQr.name}`}
                      width={QR_SCREEN_SIZE}
                      height={QR_SCREEN_SIZE}
                    />
                  </div>
                  <p className="font-medium">{createdQr.name}</p>
                  <p className="text-sm text-gray-600">
                    Está pronto. Imprima, ponha na mesa ou no balcão, e as avaliações começam a
                    chegar ao seu painel.
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button
                      onClick={async () => {
                        const highRes = await qrDataUrl(createdQr.url, QR_PRINT_SIZE);
                        downloadDataUrl(highRes, `qrcode-${slugFilename(createdQr.name)}.png`);
                      }}
                    >
                      <Printer className="mr-2 h-4 w-4" aria-hidden="true" />
                      Baixar para imprimir
                    </Button>
                    <Button variant="outline" onClick={() => navigate('/qrcodes')}>
                      Ver todos os meus códigos
                    </Button>
                  </div>
                  <div className="pt-2">
                    <Button variant="ghost" onClick={() => navigate('/dashboard')}>
                      Ir para o painel
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="text-sm text-gray-500 underline hover:text-gray-700"
          >
            Saltar por agora
          </button>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
