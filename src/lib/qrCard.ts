import { localeFromBusinessPhone, qrCardCopy } from '@/lib/businessLocale';
import { QR_PRINT_SIZE, qrDataUrl } from '@/lib/qr';

interface PrintQrCardOptions {
  qrName: string;
  qrUrl: string;
  businessName?: string;
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

/** O mesmo cartão é usado no onboarding e na gestão dos QR codes. */
export const printQrCard = async ({
  qrName,
  qrUrl,
  businessName,
  businessPhone,
}: PrintQrCardOptions): Promise<boolean> => {
  const image = await qrDataUrl(qrUrl, QR_PRINT_SIZE);
  const locale = localeFromBusinessPhone(businessPhone);
  const copy = qrCardCopy(locale);
  const printWindow = window.open('', '_blank', 'width=800,height=1000');
  if (!printWindow) return false;

  const safeName = businessName ? escapeHtml(businessName) : '';
  const safeQrName = escapeHtml(qrName);

  printWindow.document.write(`<!doctype html>
<html lang="${locale}"><head><meta charset="utf-8" />
<title>Cartão ${safeQrName}</title>
<style>
  @page { size: A6; margin: 8mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
  .card { text-align: center; padding: 10mm 6mm; }
  .biz { font-size: 11pt; font-weight: 600; color: #333; margin: 0 0 3mm; }
  .ask { font-size: 15pt; font-weight: 700; margin: 0 0 2mm; line-height: 1.25; }
  .help { font-size: 10pt; color: #555; margin: 0 0 5mm; line-height: 1.35; }
  img { width: 52mm; height: 52mm; display: block; margin: 0 auto 5mm; }
  .scan { font-size: 9.5pt; color: #555; line-height: 1.5; margin: 0; }
  .tag { margin: 6mm 0 0; font-size: 7.5pt; color: #999; }
  @media print { .hint { display: none; } }
  .hint { margin-top: 8mm; font-size: 9pt; color: #888; }
</style></head><body>
  <div class="card">
    ${safeName ? `<p class="biz">${safeName}</p>` : ''}
    <p class="ask">${copy.ask}</p>
    <p class="help">${copy.help}</p>
    <img src="${image}" alt="QR Code" />
    <p class="scan">${copy.scan}</p>
    <p class="tag">${safeQrName}</p>
    <p class="hint">Use Ficheiro &gt; Imprimir, ou Cmd/Ctrl + P</p>
  </div>
  <script>window.onload = function () { setTimeout(function () { window.print(); }, 300); };</script>
</body></html>`);
  printWindow.document.close();
  return true;
};
