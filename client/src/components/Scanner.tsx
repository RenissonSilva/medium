import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { codeFromScan } from '../lib/code';
import { Icon } from './Icon';

interface Detector {
  detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]>;
}

/** Usa o leitor nativo do navegador quando existe (Android); senão, o jsQR. */
async function nativeDetector(): Promise<Detector | null> {
  const BD = (window as unknown as { BarcodeDetector?: { new (o: object): Detector; getSupportedFormats?: () => Promise<string[]> } })
    .BarcodeDetector;
  if (!BD) return null;
  try {
    const formats = await BD.getSupportedFormats?.();
    if (formats && !formats.includes('qr_code')) return null;
    return new BD({ formats: ['qr_code'] });
  } catch {
    return null;
  }
}

export function Scanner({ onCode, onClose }: { onCode: (code: string) => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [found, setFound] = useState<string | null>(null);
  const done = useRef(onCode);
  done.current = onCode;

  useEffect(() => {
    let stopped = false;
    let timer = 0;
    let stream: MediaStream | null = null;

    void (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError(
          window.isSecureContext
            ? 'Este navegador não deixa usar a câmera aqui. Use a câmera do celular ou digite o código.'
            : 'A câmera só abre em endereço seguro (https). Use a câmera do próprio celular para ler o QR code, ou digite o código.',
        );
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
      } catch {
        setError('Não deu para abrir a câmera. Libere o acesso nas configurações ou digite o código.');
        return;
      }
      const el = video.current;
      if (stopped || !el) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      el.srcObject = stream;
      await el.play().catch(() => {});

      const detector = await nativeDetector();
      const jsQR = detector ? null : (await import('jsqr')).default;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      const tick = async () => {
        if (stopped) return;
        let text: string | null = null;
        if (el.readyState >= 2 && el.videoWidth > 0) {
          if (detector) {
            try {
              text = (await detector.detect(el))[0]?.rawValue ?? null;
            } catch {
              text = null;
            }
          } else if (jsQR && ctx) {
            const scale = Math.min(1, 720 / Math.max(el.videoWidth, el.videoHeight));
            canvas.width = Math.round(el.videoWidth * scale);
            canvas.height = Math.round(el.videoHeight * scale);
            ctx.drawImage(el, 0, 0, canvas.width, canvas.height);
            const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
            text = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' })?.data ?? null;
          }
        }
        const code = text ? codeFromScan(text) : null;
        if (code && !stopped) {
          stopped = true;
          setFound(code);
          stream?.getTracks().forEach((t) => t.stop());
          window.setTimeout(() => done.current(code), 250);
          return;
        }
        timer = window.setTimeout(tick, 160);
      };
      void tick();
    })();

    return () => {
      stopped = true;
      window.clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return createPortal(
    <div className="scanner" role="dialog" aria-modal="true" aria-label="Ler QR code">
      <header className="hdr hdr-back">
        <button type="button" className="icon-btn" aria-label="Fechar câmera" onClick={onClose}>
          <Icon name="close" stroke={3} />
        </button>
        <h1>Ler QR code</h1>
      </header>
      <div className="scanner-body">
        {error ? (
          <>
            <p>{error}</p>
            <button type="button" className="btn btn-yellow" onClick={onClose} style={{ maxWidth: 320 }}>
              Digitar o código
            </button>
          </>
        ) : (
          <>
            <div className="scanner-view">
              <video ref={video} muted playsInline autoPlay />
              <span className="scanner-frame" aria-hidden="true" />
            </div>
            <p role="status">{found ? `Achei a sala ${found}!` : 'Aponte para o QR code na tela de quem criou a sala.'}</p>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
