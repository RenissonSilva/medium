import { useState } from 'react';
import type { RoomView } from '../../../shared/types';
import { Dots, Icon, Sparkle } from '../components/Icon';
import { Avatar, GameHeader, ScoreChips, WordCard, roundTitle } from '../components/ui';
import { upper } from '../lib/text';
import { useVs } from '../lib/viewport';
import { useGame } from '../state/game';

/** 09 · Vez de outro jogador escolher. */
export function Espera({ view, onMenu }: { view: RoomView; onMenu: () => void }) {
  const { send, toast } = useGame();
  const g = view.game!;
  const vs = useVs();
  const [busy, setBusy] = useState(false);
  const chooser = view.players.find((p) => p.id === g.chooserId);
  const away = !chooser || !chooser.connected;
  const name = chooser?.name ?? 'Alguém';

  const skip = async () => {
    setBusy(true);
    const res = await send('game:skip', { round: g.round });
    setBusy(false);
    if (!res.ok) toast(res.message, 'error');
  };

  return (
    <main className="screen">
      <GameHeader title={roundTitle(view)} subtitle={`Sala ${view.code}`} onMenu={onMenu} />
      <ScoreChips view={view} mode="score" />

      <div className="deck">
        <Sparkle size={26} color="paper" style={{ left: 30, top: 6 }} />
        <Sparkle size={16} color="yellow" style={{ left: 12, top: 42 }} />
        <Sparkle size={20} color="yellow" style={{ right: 26, bottom: 4 }} />
        <WordCard yellow label="Palavra do baralho" word={g.deckWord} max={Math.round(82 * vs)} />
      </div>

      <div role="status" className="wait-card">
        <Avatar player={chooser} youId={view.youId} />
        <span className="wait-text">
          <span className="wait-title">
            {away ? (
              <span>{name} está offline</span>
            ) : (
              <>
                <span>{name} está escolhendo</span>
                <Dots small />
              </>
            )}
          </span>
          <span className="wait-sub">
            {away ? 'Dá para esperar voltar ou pular a vez.' : `Já vai pensando: o que combina com ${upper(g.deckWord)}?`}
          </span>
        </span>
      </div>

      {away && (
        <div className="skip-wrap">
          <button type="button" className="btn btn-secondary btn-small" disabled={busy} onClick={skip}>
            <Icon name="skip" size={18} />
            <span>Pular a vez de {name}</span>
          </button>
        </div>
      )}

      <div className="bottom" style={{ position: 'static', gap: 10 }}>
        <span className="label">Sua mão</span>
        <div className="hand">
          {view.hand.map((card) => (
            <span key={card.word} className={card.fresh ? 'hand-chip fresh' : 'hand-chip'}>
              <span>{card.word}</span>
              {card.fresh && <span className="mini-tag">Nova</span>}
            </span>
          ))}
        </div>
      </div>
    </main>
  );
}
