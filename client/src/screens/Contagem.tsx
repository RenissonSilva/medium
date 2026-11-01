import { useEffect, useRef, useState } from 'react';
import type { RoomView } from '../../../shared/types';
import { Sparkle } from '../components/Icon';
import { GameHeader, PairChips, Scaled, roundTitle } from '../components/ui';
import { serverNow } from '../lib/clock';
import { vibrate } from '../lib/device';
import { sound } from '../lib/sound';
import { upper } from '../lib/text';

const LIT = '#FFD43B';
const OFF = 'rgba(255,253,247,0.2)';
const WHITE = '#FFFDF7';

/** 06 · 3, 2, 1… FALEM! — no mesmo instante em todos os celulares (relógio do servidor). */
export function Contagem({ view, onMenu }: { view: RoomView; onMenu: () => void }) {
  const g = view.game!;
  const { stepMs } = view.timing;
  const start = g.countdownAt ?? serverNow();
  const current = () => {
    const elapsed = serverNow() - start;
    return elapsed < stepMs ? 3 : elapsed < 2 * stepMs ? 2 : elapsed < 3 * stepMs ? 1 : 0;
  };
  const [n, setN] = useState(current);
  const [pop, setPop] = useState(false);
  const last = useRef<number | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => setN(current()), 30);
    return () => window.clearInterval(id);
  }, [start, stepMs]); // `current` só depende desses dois

  useEffect(() => {
    if (last.current === n) return;
    last.current = n;
    if (n === 0) {
      sound.go();
      vibrate([90, 50, 180]);
    } else {
      sound.tick();
      vibrate(25);
    }
    setPop(true);
    const t = window.setTimeout(() => setPop(false), 150);
    return () => window.clearTimeout(t);
  }, [n]);

  const go = n === 0;
  const a = upper(g.deckWord);
  const b = upper(g.playedWord ?? '');

  return (
    <main className="screen">
      <GameHeader title={roundTitle(view)} subtitle={`Sala ${view.code}`} onMenu={onMenu} />
      <PairChips a={a} b={b} />

      <div className="count-area">
        <Scaled width={300} height={300}>
          <div className={go ? 'ring go' : 'ring'}>
            <svg className="arcs" aria-hidden="true" width="300" height="300" viewBox="0 0 300 300" fill="none">
              <path d="M167.81 23.25A128 128 0 0 1 268.68 197.95" strokeWidth="16" strokeLinecap="round" stroke={go ? WHITE : n >= 1 ? LIT : OFF} />
              <path d="M250.87 228.8A128 128 0 0 1 49.13 228.8" strokeWidth="16" strokeLinecap="round" stroke={go ? WHITE : n >= 2 ? LIT : OFF} />
              <path d="M31.32 197.95A128 128 0 0 1 132.19 23.25" strokeWidth="16" strokeLinecap="round" stroke={go ? WHITE : n >= 3 ? LIT : OFF} />
            </svg>
            <Sparkle size={26} color="paper" style={{ left: 14, top: 36 }} />
            <Sparkle size={20} color="yellow" style={{ left: 264, top: 18 }} />
            <Sparkle size={24} color="paper" style={{ left: 268, top: 252 }} />
            <Sparkle size={18} color="yellow" style={{ left: 10, top: 246 }} />
            <div
              className="disc"
              role="timer"
              aria-live="assertive"
              style={{ transform: `${pop ? 'scale(1.1)' : 'scale(1)'} ${go ? 'rotate(-4deg)' : 'rotate(0deg)'}` }}
            >
              <span style={{ fontSize: go ? 48 : 150 }}>{go ? 'FALEM!' : n}</span>
            </div>
          </div>
        </Scaled>
      </div>

      <div className="count-text">
        <strong>{go ? 'Agora! Todo mundo junto' : 'Preparem-se…'}</strong>
        <span>{go ? `A palavra que liga ${a} e ${b}` : 'Falem juntos quando aparecer FALEM!'}</span>
      </div>
    </main>
  );
}
