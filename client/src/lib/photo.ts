import { PHOTO_MAX_BYTES, PHOTO_SIZE } from '../../../shared/types';

const FAIL = 'Não consegui abrir essa imagem. Tente outra.';

/** Abre a imagem escolhida. O <img> já aplica a rotação que a câmera do celular grava (EXIF). */
function load(file: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.decoding = 'async';
  img.src = url;
  return img.decode().then(
    () => img,
    (err) => {
      URL.revokeObjectURL(url);
      throw err;
    },
  );
}

const bytesOf = (dataUrl: string) => Math.ceil(((dataUrl.length - dataUrl.indexOf(',') - 1) * 3) / 4);

/**
 * Recorta o centro da imagem num quadrado, reduz para PHOTO_SIZE px e devolve um JPEG
 * (data URL) pequeno o bastante para guardar no navegador e mandar para a sala.
 */
export async function makePhoto(file: File): Promise<string> {
  if (file.type && !file.type.startsWith('image/')) throw new Error('Escolha uma imagem.');
  let img: HTMLImageElement;
  try {
    img = await load(file);
  } catch {
    throw new Error(FAIL);
  }
  try {
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    if (!w || !h) throw new Error(FAIL);
    const side = Math.min(w, h);

    // Reduz em etapas (no máximo pela metade de cada vez): reduzir de 4000 px para 240 px
    // num passo só deixa a foto serrilhada em alguns navegadores.
    let size = Math.min(side, PHOTO_SIZE * 4);
    let canvas = paint(img, (w - side) / 2, (h - side) / 2, side, size);
    while (size > PHOTO_SIZE) {
      const next = Math.max(PHOTO_SIZE, Math.round(size / 2));
      canvas = paint(canvas, 0, 0, size, next);
      size = next;
    }

    for (const quality of [0.85, 0.75, 0.6, 0.45]) {
      const url = canvas.toDataURL('image/jpeg', quality);
      if (!url.startsWith('data:image/jpeg;base64,')) break;
      if (bytesOf(url) <= PHOTO_MAX_BYTES) return url;
    }
    throw new Error(FAIL);
  } finally {
    URL.revokeObjectURL(img.src);
  }
}

/** Desenha o quadrado (sx, sy, side) da origem num canvas novo de `size` px. */
function paint(source: CanvasImageSource, sx: number, sy: number, side: number, size: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error(FAIL);
  // Fundo claro para imagens com transparência (o JPEG não tem).
  ctx.fillStyle = '#FFFDF7';
  ctx.fillRect(0, 0, size, size);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, sx, sy, side, side, 0, 0, size, size);
  return canvas;
}
