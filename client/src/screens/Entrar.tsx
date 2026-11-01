import { useEffect, useRef, useState, type FormEvent } from 'react';
import { CODE_LENGTH } from '../../../shared/types';
import { Icon } from '../components/Icon';
import { Scanner } from '../components/Scanner';
import { BottomBar } from '../components/ui';
import { normalizeCode } from '../lib/code';

const TILTS = [-2, 1.5, -1, 2];

interface Props {
  busy: boolean;
  error: string | null;
  onBack: () => void;
  onJoin: (code: string) => void;
  onClearError: () => void;
}

export function Entrar({ busy, error, onBack, onJoin, onClearError }: Props) {
  const [code, setCode] = useState('');
  const [focused, setFocused] = useState(false);
  const [scanning, setScanning] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const ready = code.length === CODE_LENGTH;

  useEffect(() => {
    input.current?.focus();
  }, []);

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    if (ready && !busy) onJoin(code);
  };

  const cursor = Math.min(code.length, CODE_LENGTH - 1);

  return (
    <main className="screen">
      <header className="hdr hdr-back">
        <button type="button" className="icon-btn" aria-label="Voltar" onClick={onBack}>
          <Icon name="back" stroke={2.8} />
        </button>
        <h1>Entrar numa sala</h1>
      </header>

      <form className="code-field" onSubmit={submit}>
        <label htmlFor="codigo-sala" className="label">
          Código da sala
        </label>
        <div className="code-boxes">
          <div className={`code-grid ${focused ? 'focused' : ''} ${error ? 'shake' : ''}`} aria-hidden="true" key={error ?? 'ok'}>
            {Array.from({ length: CODE_LENGTH }, (_, i) => {
              const ch = code.charAt(i);
              const cls = ch ? 'filled' : i === cursor ? 'cursor' : '';
              return (
                <span
                  key={i}
                  className={`code-box ${cls}`}
                  style={{ transform: ch ? `translateY(0px) rotate(${TILTS[i]}deg)` : 'translateY(0px) rotate(0deg)' }}
                >
                  {ch}
                </span>
              );
            })}
          </div>
          <input
            id="codigo-sala"
            ref={input}
            className="code-input"
            type="text"
            value={code}
            onChange={(e) => {
              setCode(normalizeCode(e.target.value));
              if (error) onClearError();
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="characters"
            spellCheck={false}
            enterKeyHint="go"
            maxLength={CODE_LENGTH + 2}
          />
        </div>
        {error ? (
          <p className="error-pill" role="alert">
            {error}
          </p>
        ) : (
          <p className="hint">O código aparece na tela de quem criou a sala.</p>
        )}
      </form>

      <div className="divider" aria-hidden="true">
        <i />
        <span className="label">ou</span>
        <i />
      </div>

      <button type="button" className="scan-btn" onClick={() => setScanning(true)}>
        <span className="scan-icon" aria-hidden="true">
          <Icon name="scan" size={28} stroke={2.4} />
        </span>
        <span className="scan-text">
          <strong>Ler QR code</strong>
          <span>Aponte a câmera para a tela de quem criou a sala</span>
        </span>
        <Icon name="chevron" size={20} stroke={3} />
      </button>

      <BottomBar>
        <button type="button" className="btn btn-primary" disabled={!ready || busy} onClick={() => submit()}>
          <span>{ready ? 'Entrar na sala' : 'Digite o código'}</span>
          {ready && <Icon name="arrow" size={22} stroke={3} />}
        </button>
      </BottomBar>

      {scanning && (
        <Scanner
          onClose={() => setScanning(false)}
          onCode={(scanned) => {
            setScanning(false);
            setCode(scanned);
            onJoin(scanned);
          }}
        />
      )}
    </main>
  );
}
