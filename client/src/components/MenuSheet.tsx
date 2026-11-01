import { useState } from 'react';
import type { RoomView } from '../../../shared/types';
import { sound } from '../lib/sound';
import { nameOf } from '../lib/text';
import { useGame } from '../state/game';
import { Icon, type IconName } from './Icon';
import { QrCard } from './QrCard';
import { Rules, Sheet } from './Sheet';

type Mode = 'menu' | 'rules' | 'invite' | 'leave' | 'end';

function Item({ icon, tone, label, onClick }: { icon: IconName; tone?: string; label: string; onClick: () => void }) {
  return (
    <button type="button" className="menu-item" onClick={onClick}>
      <span className={`mi-icon ${tone ?? ''}`}>
        <Icon name={icon} size={18} />
      </span>
      <span>{label}</span>
      <Icon name="chevron" size={18} stroke={3} />
    </button>
  );
}

export function MenuSheet({ view, onClose, initial = 'menu' }: { view: RoomView; onClose: () => void; initial?: Mode }) {
  const { send, leave, toast } = useGame();
  const [mode, setMode] = useState<Mode>(initial);
  const [muted, setMuted] = useState(sound.isMuted());
  const [busy, setBusy] = useState(false);
  const g = view.game;
  const isAdmin = view.adminId === view.youId;
  const playing = view.status === 'playing' && !!g;
  const chooser = view.players.find((p) => p.id === g?.chooserId);

  const run = async (event: 'game:skip' | 'game:end', payload?: object) => {
    setBusy(true);
    const res = await send(event, payload);
    setBusy(false);
    if (!res.ok) toast(res.message, 'error');
    onClose();
  };

  if (mode === 'rules') {
    return (
      <Sheet title="Como jogar" onClose={onClose}>
        <Rules />
        <div className="sheet-actions">
          <button type="button" className="btn btn-primary" onClick={onClose} data-autofocus>
            Entendi
          </button>
        </div>
      </Sheet>
    );
  }

  if (mode === 'invite') {
    return (
      <Sheet title="Convidar" onClose={onClose}>
        <QrCard code={view.code} />
      </Sheet>
    );
  }

  if (mode === 'leave') {
    return (
      <Sheet title="Sair da sala?" onClose={onClose}>
        <p>{playing ? 'A partida continua sem você e seus pontos ficam para trás.' : 'Você pode voltar depois com o código.'}</p>
        <div className="sheet-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose} data-autofocus>
            Ficar
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await leave();
            }}
          >
            <Icon name="logout" size={22} />
            <span>Sair da sala</span>
          </button>
        </div>
      </Sheet>
    );
  }

  if (mode === 'end') {
    return (
      <Sheet title="Encerrar a partida?" onClose={onClose}>
        <p>Todo mundo vai direto para o placar final.</p>
        <div className="sheet-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose} data-autofocus>
            Continuar jogando
          </button>
          <button type="button" className="btn btn-primary" disabled={busy} onClick={() => run('game:end')}>
            <Icon name="flag" size={22} />
            <span>Encerrar</span>
          </button>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet title="Menu" onClose={onClose}>
      <div className="menu-list">
        {view.status !== 'lobby' && <Item icon="invite" label="Convidar mais gente" onClick={() => setMode('invite')} />}
        <Item icon="help" tone="yellow" label="Como jogar" onClick={() => setMode('rules')} />
        <Item
          icon={muted ? 'soundOff' : 'soundOn'}
          tone="paper"
          label={muted ? 'Som desligado' : 'Som ligado'}
          onClick={() => {
            sound.setMuted(!muted);
            setMuted(!muted);
          }}
        />
        {playing && isAdmin && g.phase === 'choosing' && (
          <Item
            icon="skip"
            tone="paper"
            label={g.chooserId === view.youId ? 'Passar a minha vez' : `Pular a vez de ${nameOf(chooser, view.youId)}`}
            onClick={() => run('game:skip', { round: g.round })}
          />
        )}
        {playing && isAdmin && <Item icon="flag" tone="pink" label="Encerrar partida" onClick={() => setMode('end')} />}
        <Item icon="logout" tone="pink" label="Sair da sala" onClick={() => setMode('leave')} />
      </div>
    </Sheet>
  );
}
