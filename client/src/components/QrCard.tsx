import { useEffect, useMemo, useRef, useState } from 'react';
import { copyText, shareInvite, useInviteUrl } from '../lib/invite';
import { qrPath } from '../lib/qr';
import { useGame } from '../state/game';
import { Icon } from './Icon';

/** Cartão do convite: QR code (abre o jogo direto na sala) + código + copiar/compartilhar. */
export function QrCard({ code }: { code: string }) {
  const { toast } = useGame();
  const url = useInviteUrl(code);
  const qr = useMemo(() => (url ? qrPath(url) : null), [url]);
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = async () => {
    if (!(await copyText(code))) {
      toast('Não deu para copiar. O código é ' + code, 'error');
      return;
    }
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1600);
  };

  const share = async () => {
    if (!url) return;
    const result = await shareInvite(code, url);
    if (result === 'copied') toast('Link do convite copiado!');
    if (result === 'failed') toast(url, 'error');
  };

  return (
    <div className="qr-card">
      <span className="qr-title">Aponte a câmera para entrar</span>
      {qr ? (
        <svg
          className="qr"
          role="img"
          aria-label={`QR code para entrar na sala ${code}`}
          viewBox={`-2 -2 ${qr.size + 4} ${qr.size + 4}`}
          shapeRendering="crispEdges"
        >
          <path fill="#0E0F1A" d={qr.d} />
        </svg>
      ) : (
        <div className="qr" aria-hidden="true" />
      )}
      <div className="qr-foot">
        <span className="qr-code-wrap">
          <span className="qr-code-label">Código</span>
          <span className="qr-code">{code}</span>
        </span>
        <span className="qr-actions">
          <button
            type="button"
            className={copied ? 'sq-btn done' : 'sq-btn'}
            onClick={copy}
            aria-label={copied ? 'Código copiado' : 'Copiar código'}
          >
            {copied ? <Icon name="check" stroke={3.2} /> : <Icon name="copy" />}
          </button>
          <button type="button" className="sq-btn yellow" onClick={share} aria-label="Compartilhar convite" disabled={!url}>
            <Icon name="share" />
          </button>
        </span>
      </div>
    </div>
  );
}
