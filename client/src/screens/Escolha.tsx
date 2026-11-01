import { useEffect, useState } from 'react';
import type { RoomView } from '../../../shared/types';
import { Icon, Sparkle } from '../components/Icon';
import { BottomBar, GameHeader, ScoreChips, WordCard, roundTitle } from '../components/ui';
import { vibrate } from '../lib/device';
import { sound } from '../lib/sound';
import { upper } from '../lib/text';
import { useVs } from '../lib/viewport';
import { useGame } from '../state/game';

/** 04 · Todo mundo escolhe da mão uma palavra que combine com a do baralho; vale a primeira jogada. */
export function Escolha({ view, onMenu }: { view: RoomView; onMenu: () => void }) {
  const { send, toast } = useGame();
  const g = view.game!;
  const vs = useVs();
  const [picked, setPicked] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const deckWord = upper(g.deckWord);

  useEffect(() => {
    vibrate(60);
    sound.turn();
  }, []);

  const play = async () => {
    if (!picked || busy) return;
    setBusy(true);
    const res = await send('game:pick', { round: g.round, word: picked });
    if (!res.ok) {
      setBusy(false);
      // Alguém jogou primeiro: o estado novo chega em seguida.
      if (res.error !== 'BAD_STATE') toast(res.message, 'error');
    }
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

      <div className="prompt">
        <span className="badge">Rápido</span>
        <span className="prompt-text">O que combina com {deckWord}?</span>
      </div>

      <section className="tiles" aria-label="Suas palavras">
        {view.hand.map((card) => {
          const on = picked === card.word;
          return (
            <button
              key={card.word}
              type="button"
              className="tile"
              aria-pressed={on}
              onClick={() => setPicked(on ? null : card.word)}
            >
              <span className="tile-word">{card.word}</span>
              <span className="tile-dot" aria-hidden="true">
                {on && <Icon name="check" size={16} stroke={3.4} />}
              </span>
            </button>
          );
        })}
        {view.hand.length === 0 && <p className="hint">Sua mão está vazia — espere alguém jogar uma palavra.</p>}
      </section>

      <BottomBar>
        <button type="button" className="btn btn-primary" disabled={!picked || busy} onClick={play}>
          <span>{picked ? `Jogar ${picked}` : 'Escolha uma palavra'}</span>
          {picked && <Icon name="arrow" size={22} stroke={3} />}
        </button>
      </BottomBar>
    </main>
  );
}
