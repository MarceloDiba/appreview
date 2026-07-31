import React, { useCallback, useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';
import { Printer, Download, Trash2 } from 'lucide-react';
import {
  QR_PRINT_SIZE,
  QR_SCREEN_SIZE,
  downloadDataUrl,
  publicReviewUrl,
  qrDataUrl,
  slugFilename,
} from '@/lib/qr';
import { useOwnerTranslation } from '@/i18n/owner/useOwnerTranslation';

interface QRCodeGeneratorProps {
  baseUrl: string;
  businessName?: string;
}

interface SavedQR {
  id: string;
  name: string;
  slug: string;
  url: string;
  image: string;
}

/**
 * A ordem das operações aqui é a correcção do bug que teria matado o piloto.
 *
 * Antes: a imagem do QR era gerada a partir de um `businessId` fixo da página,
 * o slug só nascia ao gravar, e o `redirect_url` guardava o endereço antigo. O
 * código impresso apontava para uma página que não existe — e ninguém
 * descobriria, porque o dono não escaneia o próprio QR.
 *
 * Agora: grava-se primeiro para obter o slug, e só depois se desenha a imagem a
 * partir dele. O endereço deixou de ser editável de propósito: um endereço
 * escrito à mão quebra a atribuição do caso ao negócio.
 */
const QRCodeGenerator = ({ baseUrl, businessName }: QRCodeGeneratorProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { t } = useOwnerTranslation();

  const [qrName, setQrName] = useState(() => t('qrcodes.defaultName'));
  const [creating, setCreating] = useState(false);
  const [savedQRCodes, setSavedQRCodes] = useState<SavedQR[]>([]);
  const [isLoadingQRs, setIsLoadingQRs] = useState(true);
  const [lastCreated, setLastCreated] = useState<SavedQR | null>(null);

  const fetchSavedQRCodes = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('qr_codes')
        .select('id, name, slug')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const withImages = await Promise.all(
        (data || []).map(async (qr) => {
          const url = publicReviewUrl(baseUrl, qr.slug);
          return {
            id: qr.id,
            name: qr.name,
            slug: qr.slug,
            url,
            image: await qrDataUrl(url, QR_SCREEN_SIZE),
          };
        })
      );

      setSavedQRCodes(withImages);
    } catch (error) {
      console.error('Error fetching QR codes:', error);
      toast({
        title: t('qrcodes.errorTitle'),
        description: t('qrcodes.errLoad'),
        variant: 'destructive',
      });
    } finally {
      setIsLoadingQRs(false);
    }
  }, [user, baseUrl, toast, t]);

  useEffect(() => {
    if (user) fetchSavedQRCodes();
  }, [user, fetchSavedQRCodes]);

  const createQRCode = async () => {
    if (!user || !qrName.trim()) return;
    setCreating(true);

    try {
      // 1. O slug primeiro. É ele que define o endereço público.
      const slug = uuidv4().substring(0, 8);
      const url = publicReviewUrl(baseUrl, slug);

      // 2. Gravar com o endereço já correcto.
      const { data, error } = await supabase
        .from('qr_codes')
        .insert([{ user_id: user.id, name: qrName.trim(), slug, redirect_url: url }])
        .select('id, name, slug')
        .single();

      if (error) throw error;

      // 3. Só agora a imagem, derivada do slug gravado.
      const created: SavedQR = {
        id: data.id,
        name: data.name,
        slug: data.slug,
        url,
        image: await qrDataUrl(url, QR_SCREEN_SIZE),
      };

      setLastCreated(created);
      setSavedQRCodes((prev) => [created, ...prev]);

      toast({
        title: t('qrcodes.createdTitle'),
        description: t('qrcodes.createdToast', { name: created.name }),
      });
    } catch (error) {
      console.error('Error creating QR code:', error);
      toast({
        title: t('qrcodes.errorTitle'),
        description: t('qrcodes.errCreate'),
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const deleteQRCode = async (id: string) => {
    try {
      const { error } = await supabase.from('qr_codes').delete().eq('id', id);
      if (error) throw error;

      setSavedQRCodes((prev) => prev.filter((qr) => qr.id !== id));
      setLastCreated((prev) => (prev?.id === id ? null : prev));

      toast({ title: t('qrcodes.removedToast') });
    } catch (error) {
      console.error('Error deleting QR code:', error);
      toast({
        title: t('qrcodes.errorTitle'),
        description: t('qrcodes.errRemove'),
        variant: 'destructive',
      });
    }
  };

  /** Descarrega em resolução de impressão, não a da pré-visualização. */
  const downloadForPrint = async (qr: SavedQR) => {
    const highRes = await qrDataUrl(qr.url, QR_PRINT_SIZE);
    downloadDataUrl(highRes, `qrcode-${slugFilename(qr.name)}.png`);
    toast({
      title: t('qrcodes.downloadTitle'),
      description: t('qrcodes.downloadStarted', { size: QR_PRINT_SIZE }),
    });
  };

  /**
   * Cartão de mesa pronto a imprimir. Trilingue de propósito: quem escaneia
   * pode ser turista, e o texto na mesa é a única parte do fluxo que não se
   * adapta ao telemóvel de quem lê.
   */
  const printCard = async (qr: SavedQR) => {
    const highRes = await qrDataUrl(qr.url, QR_PRINT_SIZE);
    const win = window.open('', '_blank', 'width=800,height=1000');
    if (!win) {
      toast({
        title: t('qrcodes.popupBlocked'),
        description: t('qrcodes.popupHint'),
        variant: 'destructive',
      });
      return;
    }

    const safeName = (businessName || '').replace(/[<>&]/g, '');

    win.document.write(`<!doctype html>
<html lang="pt"><head><meta charset="utf-8" />
<title>Cartao ${qr.name}</title>
<style>
  @page { size: A6; margin: 8mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
         display: flex; align-items: center; justify-content: center; min-height: 100vh; }
  .card { text-align: center; padding: 10mm 6mm; }
  .biz { font-size: 11pt; font-weight: 600; color: #333; margin: 0 0 3mm; }
  .ask { font-size: 15pt; font-weight: 700; margin: 0 0 5mm; line-height: 1.25; }
  img { width: 52mm; height: 52mm; display: block; margin: 0 auto 5mm; }
  .langs { font-size: 9.5pt; color: #555; line-height: 1.5; margin: 0; }
  .tag { margin: 6mm 0 0; font-size: 7.5pt; color: #999; }
  @media print { .hint { display: none; } }
  .hint { margin-top: 8mm; font-size: 9pt; color: #888; }
</style></head><body>
  <div class="card">
    ${safeName ? `<p class="biz">${safeName}</p>` : ''}
    <p class="ask">Como foi a sua experiência?</p>
    <img src="${highRes}" alt="QR Code" />
    <p class="langs">
      Aponte a câmara do telemóvel<br />
      <em>Apunta la cámara de tu móvil</em><br />
      <em>Point your phone camera here</em>
    </p>
    <p class="tag">${qr.name}</p>
    <p class="hint">Use Ficheiro &gt; Imprimir, ou Cmd/Ctrl + P</p>
  </div>
  <script>window.onload = function () { setTimeout(function () { window.print(); }, 300); };</script>
</body></html>`);
    win.document.close();
  };

  return (
    <Tabs defaultValue="generate">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="generate">{t('qrcodes.createTab')}</TabsTrigger>
        <TabsTrigger value="saved">
          {t('qrcodes.savedTab', { count: savedQRCodes.length })}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="generate">
        <Card>
          <CardHeader>
            <CardTitle>{t('qrcodes.createTitle')}</CardTitle>
            <CardDescription>{t('qrcodes.createDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="qr-name">{t('qrcodes.nameLabel')}</Label>
              <Input
                id="qr-name"
                value={qrName}
                onChange={(e) => setQrName(e.target.value)}
                placeholder={t('qrcodes.namePlaceholder')}
              />
            </div>

            <div className="flex justify-center pt-2">
              <Button onClick={createQRCode} disabled={creating || !qrName.trim()}>
                {creating ? t('qrcodes.creating') : t('qrcodes.create')}
              </Button>
            </div>

            {lastCreated && (
              <div className="mt-6 flex flex-col items-center">
                <div className="rounded-md border bg-white p-4">
                  <img
                    src={lastCreated.image}
                    alt={`QR Code ${lastCreated.name}`}
                    width={QR_SCREEN_SIZE}
                    height={QR_SCREEN_SIZE}
                  />
                </div>
                <div className="mt-2 font-medium">{lastCreated.name}</div>
                <div className="mt-1 break-all text-center text-xs text-gray-500">
                  {lastCreated.url}
                </div>
              </div>
            )}
          </CardContent>

          {lastCreated && (
            <CardFooter className="flex flex-wrap justify-center gap-2">
              <Button onClick={() => printCard(lastCreated)}>
                <Printer className="mr-2 h-4 w-4" aria-hidden="true" />
                {t('qrcodes.printCard')}
              </Button>
              <Button variant="outline" onClick={() => downloadForPrint(lastCreated)}>
                <Download className="mr-2 h-4 w-4" aria-hidden="true" />
                {t('qrcodes.download')}
              </Button>
            </CardFooter>
          )}
        </Card>
      </TabsContent>

      <TabsContent value="saved">
        <Card>
          <CardHeader>
            <CardTitle>{t('qrcodes.savedTitle')}</CardTitle>
            <CardDescription>{t('qrcodes.savedDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingQRs ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-t-2 border-primary" />
              </div>
            ) : savedQRCodes.length === 0 ? (
              <div className="py-8 text-center text-gray-500">
                <p>{t('qrcodes.empty')}</p>
                <p className="mt-2 text-sm">{t('qrcodes.emptyHint')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {savedQRCodes.map((qrCode) => (
                  <Card key={qrCode.id} className="overflow-hidden">
                    <div className="flex flex-col items-center p-4">
                      <img
                        src={qrCode.image}
                        alt={`QR Code ${qrCode.name}`}
                        width={150}
                        height={150}
                      />
                      <h3 className="mt-2 font-medium">{qrCode.name}</h3>
                      <p className="mt-1 w-full break-all text-center text-xs text-gray-500">
                        {qrCode.url}
                      </p>
                    </div>
                    <CardFooter className="flex justify-between gap-1 bg-gray-50 px-3 py-2">
                      <Button variant="ghost" size="sm" onClick={() => printCard(qrCode)}>
                        <Printer className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                        {t('qrcodes.print')}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => downloadForPrint(qrCode)}>
                        <Download className="h-3.5 w-3.5" aria-hidden="true" />
                        <span className="sr-only">
                          {t('qrcodes.downloadSr', { name: qrCode.name })}
                        </span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500"
                        onClick={() => deleteQRCode(qrCode.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        <span className="sr-only">
                          {t('qrcodes.removeSr', { name: qrCode.name })}
                        </span>
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};

export default QRCodeGenerator;
