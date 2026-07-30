import QRCode from 'qrcode';

/**
 * Geração de QR code local.
 *
 * Antes isto dependia de api.qrserver.com, o que punha um serviço de terceiros
 * no caminho do único activo físico do cliente — o código colado na mesa. Se
 * aquele serviço mudasse ou caísse, os QR codes deixavam de aparecer no painel.
 *
 * E as imagens vinham a 200×200 px, que serve para ver no ecrã e fica desfocado
 * ao imprimir num cartão de mesa.
 */

/** Tamanho de ecrã: pré-visualização no painel. */
export const QR_SCREEN_SIZE = 240;

/**
 * Tamanho de impressão. 1024 px dá cerca de 8,6 cm a 300 dpi — folgado para um
 * cartão de mesa, e escaneável mesmo impresso pequeno.
 */
export const QR_PRINT_SIZE = 1024;

const baseOptions = {
  errorCorrectionLevel: 'M' as const,
  margin: 2,
  color: { dark: '#000000', light: '#FFFFFF' },
};

export const qrDataUrl = (url: string, width = QR_SCREEN_SIZE): Promise<string> =>
  QRCode.toDataURL(url, { ...baseOptions, width });

/**
 * O endereço público de um QR code. Deriva sempre do slug gravado — nunca de um
 * identificador de página. Era exactamente aí que estava o bug: a imagem era
 * gerada a partir de um `businessId` fixo, antes de o slug existir, e o código
 * impresso apontava para uma página inexistente.
 */
export const publicReviewUrl = (baseUrl: string, slug: string): string =>
  `${baseUrl.replace(/\/$/, '')}/review/${slug}`;

/** Dispara o download de um data URL como ficheiro. */
export const downloadDataUrl = (dataUrl: string, filename: string): void => {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

export const slugFilename = (name: string): string =>
  name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'qrcode';
