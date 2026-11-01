import { useState } from 'react';
import type { RoomView } from '../../../shared/types';
import { Crown, Icon, Sparkle } from '../components/Icon';
import { Avatar, BottomBar, GameHeader, WaitBox, points } from '../components/ui';
import { listNames, nameOf, ranking, upper } from '../lib/text';
import { useVs } from '../lib/viewport';
import { useGame } from '../state/game';

/** 10 · Fim de jogo: quem venceu e o placar final. */
export function Fim({ view, onMenu }: { view: RoomView; onMenu: () => void }) {
  const { send, leave, toast } = useGame();
  const vs = useVs();
  const [busy, setBusy] = useState(false);
  const isAdmin = view.adminId === view.youId;
  const admin = view.players.find((p) => p.id === view.adminId);
  const best = Math.max(0, ...view.players.map((p) => p.score));
  const winners = view.players.filter((p) => p.score === best);
  const solo = winners.length === 1;
  const title = solo ? `${upper(nameOf(winners[0], view.youId))} VENCEU!` : 'EMPATE!';
  const subtitle = solo ? points(best) : `${listNames(winners.map((p) => nameOf(p, view.youId)))} · ${points(best)}`;
  const titleSize = Math.round((title.length <= 12 ? 42 : title.length <= 18 ? 34 : 28) * Math.max(vs, 0.85));

  const again = async () => {
    setBusy(true);
    const res = await send('game:lobby');
    if (!res.ok) {
      setBusy(false);
      toast(res.message, 'error');
    }
  };

  return (
    <main className="screen">
      <GameHeader title="Fim de jogo" subtitle={`Sala ${view.code}`} onMenu={onMenu} />

      <div className="winner">
        <Sparkle size={26} color="paper" style={{ left: 40, top: 30 }} />
        <Sparkle size={20} color="yellow" style={{ left: 296, top: 12 }} />
        <Sparkle size={16} color="paper" style={{ left: 284, top: 112 }} />
        <Sparkle size={14} color="yellow" style={{ left: 62, top: 122 }} />
        <div className={solo ? 'winner-faces' : 'winner-faces many'}>
          <Crown className="crown" />
          {winners.slice(0, 3).map((p) => (
            <Avatar key={p.id} player={p} youId={view.youId} />
          ))}
        </div>
        <div className="winner-banner" role="status">
          <strong style={{ fontSize: titleSize }}>{title}</strong>
          <span>{subtitle}</span>
        </div>
      </div>

      <div className="board-wrap" style={{ marginTop: `calc(28px * var(--vs))` }}>
        <span className="label" id="placar-final">
          Placar final
        </span>
        <ol className="board" aria-labelledby="placar-final">
          {ranking(view.players).map(({ player, rank }) => (
            <li key={player.id} className={player.score === best ? 'board-row top' : 'board-row'}>
              <span className="rank">{rank}º</span>
              <Avatar player={player} youId={view.youId} />
              <span className="board-name">{nameOf(player, view.youId)}</span>
              <span className="pts">
                {player.score}
                <span className="sr-only"> {player.score === 1 ? 'ponto' : 'pontos'}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>

      <BottomBar>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await leave();
          }}
        >
          <Icon name="logout" size={22} />
          <span>Sair da sala</span>
        </button>
        {isAdmin ? (
          <button type="button" className="btn btn-primary" disabled={busy} onClick={again}>
            <Icon name="replay" size={22} stroke={2.8} />
            <span>Jogar de novo</span>
          </button>
        ) : (
          <WaitBox>Esperando {admin ? admin.name : 'o anfitrião'} começar outra</WaitBox>
        )}
      </BottomBar>
    </main>
  );
}
