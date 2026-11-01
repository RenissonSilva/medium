import { useEffect, useState } from 'react';
import type { RoomView } from '../../../shared/types';
import { Icon, Sparkle } from '../components/Icon';
import { Avatar, BottomBar, GameHeader, roundTitle } from '../components/ui';
import { vibrate } from '../lib/device';
import { sound } from '../lib/sound';
import { listNames, nameOf, ranking } from '../lib/text';
import { useGame } from '../state/game';

function headline(view: RoomView, matchedIds: string[]): string {
  const matched = view.players.filter((p) => matchedIds.includes(p.id));
  // "Você" primeiro, como no layout ("Você e Bia combinaram!").
  matched.sort((a, b) => Number(b.id === view.youId) - Number(a.id === view.youId));
  const names = matched.map((p) => nameOf(p, view.youId));
  if (matched.length === 0) return 'Ninguém combinou dessa vez';
  if (matched.length === 1) return `${names[0]} levou 1 ponto`;
  if (matched.length === view.players.length && matched.length > 2) return 'Todo mundo combinou!';
  const list = listNames(names);
  // Nomes curtos ficam juntos numa linha ("Você e Bia" / "combinaram!").
  return `${list.length <= 14 ? list.replace(/ /g, ' ') : list} combinaram!`;
}

/** 08 · Resultado da rodada e placar. */
export function Rodada({ view, onMenu }: { view: RoomView; onMenu: () => void }) {
  const { send, toast } = useGame();
  const g = view.game!;
  const r = g.lastResult!;
  const [busy, setBusy] = useState(false);
  const isLast = g.round >= g.totalRounds;
  const scoredMe = r.matchedIds.includes(view.youId);

  useEffect(() => {
    if (scoredMe) {
      sound.point();
      vibrate(50);
    }
  }, [scoredMe]);

  const advance = async () => {
    setBusy(true);
    const res = await send('game:next', { round: g.round });
    if (!res.ok) {
      setBusy(false);
      // Alguém já avançou: o estado novo chega em seguida.
      if (res.error !== 'BAD_STATE') toast(res.message, 'error');
    }
  };

  return (
    <main className="screen">
      <GameHeader title={roundTitle(view)} subtitle={`Sala ${view.code}`} onMenu={onMenu} />

      <div className="result-wrap">
        <Sparkle size={24} color="paper" style={{ left: 4, top: 8 }} />
        <Sparkle size={16} color="yellow" style={{ left: 22, top: 92 }} />
        <Sparkle size={20} color="paper" style={{ right: 6, top: 70 }} />
        <div className="result-card" role="status">
          <span className="card-label">Resultado</span>
          <strong>{headline(view, r.matchedIds)}</strong>
        </div>
      </div>

      <div className="board-wrap">
        <span className="label" id="placar">
          Placar
        </span>
        <ol className="board" aria-labelledby="placar">
          {ranking(view.players).map(({ player, rank }) => (
            <li key={player.id} className="board-row">
              <span className="rank">{rank}º</span>
              <Avatar player={player} youId={view.youId} />
              <span className="board-name">{nameOf(player, view.youId)}</span>
              {r.matchedIds.includes(player.id) && <span className="plus1">+1</span>}
              <span className="pts">
                {player.score}
                <span className="sr-only"> {player.score === 1 ? 'ponto' : 'pontos'}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>

      <BottomBar>
        <button type="button" className="btn btn-primary" disabled={busy} onClick={advance}>
          <span>{isLast ? 'Ver placar final' : 'Próxima rodada'}</span>
          <Icon name="arrow" size={22} stroke={3} />
        </button>
      </BottomBar>
    </main>
  );
}
