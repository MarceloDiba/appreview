import { localeFromBusiness, qrCardCopy } from '@/lib/businessLocale';
import { QR_PRINT_SIZE, qrDataUrl } from '@/lib/qr';

interface PrintQrCardOptions {
  qrName: string;
  qrUrl: string;
  businessName?: string;
  businessCountry?: string;
  businessPhone?: string;
}

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  })[character] || character);

/** O mesmo cartão com moldura é usado no onboarding e na gestão dos QR codes. */
export const printQrCard = async ({
  qrName,
  qrUrl,
  businessName,
  businessCountry,
  businessPhone,
}: PrintQrCardOptions): Promise<boolean> => {
  const image = await qrDataUrl(qrUrl, QR_PRINT_SIZE);
  const locale = localeFromBusiness(businessCountry, businessPhone);
  const copy = qrCardCopy(locale);
  const printWindow = window.open('', '_blank', 'width=800,height=1000');
  if (!printWindow) return false;

  const safeName = businessName ? escapeHtml(businessName) : '';
  const safeQrName = escapeHtml(qrName);

  printWindow.document.write(`<!doctype html>
<html lang="${locale}"><head><meta charset="utf-8" />
<title>Cartão ${safeQrName}</title>
<style>
  @page { size: A6; margin: 7mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .card { width: 100%; min-height: 132mm; border: 0.7mm solid #101010; border-radius: 5mm; text-align: center; padding: 10mm 7mm 7mm; display: flex; flex-direction: column; align-items: center; }
  .biz { font-size: 10pt; font-weight: 700; color: #27272a; margin: 0 0 4mm; max-width: 58mm; }
  .ask { font-size: 19pt; font-weight: 800; letter-spacing: -0.55pt; color: #09090b; margin: 0; line-height: 1.08; }
  .help { font-size: 9.5pt; color: #52525b; margin: 3mm 0 6mm; line-height: 1.35; }
  .qr-frame { width: 67mm; height: 67mm; display: flex; align-items: center; justify-content: center; border: 0.7mm solid #18181b; border-radius: 5mm; padding: 3.2mm; background: #fff; }
  img { width: 58mm; height: 58mm; display: block; }
  .scan { font-size: 9pt; color: #52525b; line-height: 1.4; margin: 5mm 0 0; }
  .brand { margin: auto 0 0; padding: 2.3mm 5mm; border-radius: 999px; background: #111111; color: #fff; font-size: 7.5pt; font-weight: 650; letter-spacing: 0.05pt; }
  .tag { margin: 2.5mm 0 0; font-size: 6.5pt; color: #a1a1aa; }
  @media print { .hint { display: none; } }
  .hint { margin-top: 8mm; font-size: 9pt; color: #888; }
</style></head><body>
  <div class="card">
    ${safeName ? `<p class="biz">${safeName}</p>` : ''}
    <p class="ask">${copy.ask}</p>
    <p class="help">${copy.help}</p>
    <div class="qr-frame"><img src="${image}" alt="QR Code" /></div>
    <p class="scan">${copy.scan}</p>
    <p class="brand">Binno.pro · ${copy.brand}</p>
    <p class="tag">${safeQrName}</p>
    <p class="hint">Use Ficheiro &gt; Imprimir, ou Cmd/Ctrl + P</p>
  </div>
  <script>window.onload = function () { setTimeout(function () { window.print(); }, 300); };</script>
</body></html>`);
  printWindow.document.close();
  return true;
};
