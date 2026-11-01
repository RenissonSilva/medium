import { useState, type FormEvent } from 'react';
import { NAME_MAX } from '../../../shared/types';
import { Icon, Sparkle } from '../components/Icon';
import { BottomBar, Scaled } from '../components/ui';
import { storage } from '../lib/storage';

function Hero() {
  return (
    <div className="hero" aria-hidden="true">
      <Sparkle size={22} color="paper" style={{ left: 316, top: 4 }} />
      <Sparkle size={16} color="yellow" style={{ left: 10, top: 170 }} />
      <Sparkle size={14} color="paper" style={{ left: 326, top: 214 }} />
      <div className="hero-card" style={{ left: 8, top: 24, background: '#FFD43B', transform: 'rotate(-6deg)' }}>
        <span>Baralho</span>
        <strong style={{ fontSize: 60 }}>LUA</strong>
      </div>
      <div className="hero-card" style={{ left: 180, top: 84, background: '#FFFDF7', transform: 'rotate(5deg)' }}>
        <span>Sua mão</span>
        <strong style={{ fontSize: 54 }}>MARÉ</strong>
      </div>
      <div className="hero-plus">
        <Icon name="plus" size={24} stroke={3.4} />
      </div>
      <div className="hero-bubble">?</div>
    </div>
  );
}

interface Props {
  /** Código da sala quando a pessoa chegou pelo link/QR code. */
  invite: string | null;
  busy: boolean;
  onCreate: (name: string) => void;
  onJoinScreen: (name: string) => void;
  onJoinInvite: (name: string) => void;
}

export function Inicio({ invite, busy, onCreate, onJoinScreen, onJoinInvite }: Props) {
  const [name, setName] = useState(() => storage.get('name') ?? '');
  const clean = name.trim();
  const ok = clean.length > 0;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (invite && ok && !busy) onJoinInvite(clean);
    else (document.activeElement as HTMLElement | null)?.blur();
  };

  return (
    <main className="screen">
      <Scaled width={358} height={240} className="hero-wrap">
        <Hero />
      </Scaled>

      <div className="intro">
        <h1>Medium</h1>
        <p>
          {invite ? (
            <>
              Te chamaram para a sala <strong>{invite}</strong>. Diga seu nome e entre!
            </>
          ) : (
            'Uma palavra do baralho, uma da sua mão — e todo mundo fala junto.'
          )}
        </p>
      </div>

      <form className="field" onSubmit={submit}>
        <label htmlFor="nome-jogador" className="label">
          Seu nome
        </label>
        <input
          id="nome-jogador"
          className="text-input"
          type="text"
          value={name}
          maxLength={NAME_MAX}
          onChange={(e) => setName(e.target.value)}
          placeholder="Como a galera te chama?"
          autoComplete="nickname"
          autoCapitalize="words"
          spellCheck={false}
          enterKeyHint={invite ? 'go' : 'done'}
        />
      </form>

      <BottomBar>
        {invite ? (
          <button type="button" className="btn btn-primary" disabled={!ok || busy} onClick={() => onJoinInvite(clean)}>
            <span>Entrar na sala {invite}</span>
            <Icon name="arrow" size={22} stroke={3} />
          </button>
        ) : (
          <>
            <button type="button" className="btn btn-secondary" disabled={!ok} onClick={() => onJoinScreen(clean)}>
              <Icon name="login" size={22} />
              <span>Entrar numa sala</span>
            </button>
            <button type="button" className="btn btn-primary" disabled={!ok || busy} onClick={() => onCreate(clean)}>
              <span>Criar sala</span>
              <Icon name="arrow" size={22} stroke={3} />
            </button>
          </>
        )}
      </BottomBar>
    </main>
  );
}
