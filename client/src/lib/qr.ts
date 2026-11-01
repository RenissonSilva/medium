import QRCode from 'qrcode';

/** Gera o desenho do QR code como um único path SVG (um retângulo por trecho preto). */
export function qrPath(text: string): { size: number; d: string } {
  const { modules } = QRCode.create(text, { errorCorrectionLevel: 'M' });
  const { size } = modules;
  let d = '';
  for (let y = 0; y < size; y++) {
    let x = 0;
    while (x < size) {
      if (!modules.get(y, x)) {
        x++;
        continue;
      }
      let w = 1;
      while (x + w < size && modules.get(y, x + w)) w++;
      d += `M${x} ${y}h${w}v1h-${w}z`;
      x += w;
    }
  }
  return { size, d };
}
