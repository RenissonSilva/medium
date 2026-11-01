import { useState } from 'react';
import { MAX_PLAYERS, MIN_PLAYERS, ROUND_OPTIONS, type RoomView } from '../../../shared/types';
import { Icon } from '../components/Icon';
import { QrCard } from '../components/QrCard';
import { Avatar, BottomBar, WaitBox } from '../components/ui';
import { nameOf } from '../lib/text';
import { useGame } from '../state/game';

export function Sala({ view, onMenu }: { view: RoomView; onMenu: () => void }) {
  const { send, toast } = useGame();
  const [busy, setBusy] = useState(false);
  const isAdmin = view.adminId === view.youId;
  const admin = view.players.find((p) => p.id === view.adminId);
  const enough = view.players.length >= MIN_PLAYERS;

  const act = async (event: 'game:start' | 'room:rounds' | 'room:kick', payload?: object) => {
    setBusy(true);
    const res = await send(event, payload);
    setBusy(false);
    if (!res.ok) toast(res.message, 'error');
  };

  return (
    <main className="screen">
      <header className="hdr">
        <div className="hdr-title">
          <strong>Sala</strong>
          <span>Chame a galera</span>
        </div>
        <button type="button" className="icon-btn" aria-label="Menu" onClick={onMenu}>
          <Icon name="menu" />
        </button>
      </header>

      <QrCard code={view.code} />

      <div className="list-head">
        <span className="label" id="lista-jogadores">
          Jogadores na sala
        </span>
        <span className="count" aria-label={`${view.players.length} jogadores`}>
          {view.players.length}
        </span>
      </div>

      <ul className="players" aria-labelledby="lista-jogadores">
        {view.players.map((p) => (
          <li key={p.id} className={p.connected ? 'player-row' : 'player-row away'}>
            <Avatar player={p} youId={view.youId} />
            <span className="player-name">{nameOf(p, view.youId)}</span>
            {p.id === view.hostId && <span className="tag">Anfitrião</span>}
            {!p.connected && <span className="tag off">Offline</span>}
            {isAdmin && p.id !== view.youId && (
              <button
                type="button"
                className="kick"
                aria-label={`Remover ${p.name} da sala`}
                disabled={busy}
                onClick={() => act('room:kick', { playerId: p.id })}
              >
                <Icon name="close" size={14} stroke={3.2} />
              </button>
            )}
          </li>
        ))}
        {view.players.length < MAX_PLAYERS && (
          <li className="player-row empty">
            <span className="empty-dot" aria-hidden="true">
              <Icon name="plus" size={14} stroke={3.4} />
            </span>
            <span>Esperando mais gente…</span>
          </li>
        )}
      </ul>

      <div className="setting">
        <span className="label" id="rodadas">
          Rodadas
        </span>
        {isAdmin ? (
          <div className="seg" role="radiogroup" aria-labelledby="rodadas">
            {ROUND_OPTIONS.map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={view.rounds === n}
                disabled={busy}
                onClick={() => view.rounds !== n && act('room:rounds', { rounds: n })}
              >
                {n}
              </button>
            ))}
          </div>
        ) : (
          <div className="seg" aria-labelledby="rodadas">
            <span>{view.rounds}</span>
          </div>
        )}
      </div>

      <BottomBar>
        {isAdmin ? (
          <button type="button" className="btn btn-primary" disabled={!enough || busy} onClick={() => act('game:start')}>
            <span>{enough ? 'Iniciar jogo' : 'Precisa de mais 1 pessoa'}</span>
            {enough && <Icon name="arrow" size={22} stroke={3} />}
          </button>
        ) : (
          <WaitBox>Esperando {admin ? admin.name : 'o anfitrião'} começar</WaitBox>
        )}
      </BottomBar>
    </main>
  );
}
