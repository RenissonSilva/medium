import { useEffect, useState } from 'react';
import type { RoomView } from '../../../shared/types';
import { Icon, Sparkle } from '../components/Icon';
import { BottomBar, GameHeader, Scaled, ScoreChips, WordCard, roundTitle } from '../components/ui';
import { unlockAudio } from '../lib/sound';
import { nameOf } from '../lib/text';
import { useGame } from '../state/game';

/** 05 · As duas palavras na mesa; cada um pensa na sua e avisa que está pronto. */
export function Par({ view, onMenu }: { view: RoomView; onMenu: () => void }) {
  const { send, toast } = useGame();
  const g = view.game!;
  const serverReady = g.readyIds.includes(view.youId);
  // Responde na hora ao toque; o servidor confirma logo depois.
  const [optimistic, setOptimistic] = useState<boolean | null>(null);
  useEffect(() => setOptimistic(null), [serverReady]);
  const ready = optimistic ?? serverReady;

  const chooser = view.players.find((p) => p.id === g.chooserId);
  const playedBy = g.chooserId === view.youId ? 'Jogada por você' : `Jogada por ${chooser?.name ?? 'alguém'}`;
  const missing = view.players.filter((p) => p.connected && p.id !== view.youId && !g.readyIds.includes(p.id));
  // As fichas do topo mostram quem falta; no botão, um nome cabe — mais que isso vira contagem.
  const readyLabel =
    missing.length === 0 ? 'Pronto!' : missing.length === 1 ? `Pronto! Esperando ${nameOf(missing[0], view.youId)}` : `Pronto! Faltam ${missing.length}`;

  const toggle = async () => {
    unlockAudio();
    const next = !ready;
    setOptimistic(next);
    const res = await send('game:ready', { round: g.round, ready: next });
    if (!res.ok) {
      setOptimistic(null);
      toast(res.message, 'error');
    }
  };

  return (
    <main className="screen">
      <GameHeader title={roundTitle(view)} subtitle={`Sala ${view.code}`} onMenu={onMenu} />
      <ScoreChips view={view} mode="ready" />

      <div className="pair-area">
        <span className="label" style={{ paddingLeft: '0.14em', letterSpacing: '0.14em' }}>
          As palavras da rodada
        </span>
        <Scaled width={358} height={296}>
          <div className="pair">
            <Sparkle size={22} color="paper" style={{ left: 326, top: 30 }} />
            <Sparkle size={18} color="yellow" style={{ left: 6, top: 158 }} />
            <Sparkle size={14} color="paper" style={{ left: 36, top: 268 }} />
            <WordCard yellow label="Baralho" word={g.deckWord} max={80} style={{ left: 18, top: 0, transform: 'rotate(-4deg)' }} />
            <WordCard label={playedBy} word={g.playedWord ?? ''} max={76} style={{ left: 88, top: 160, transform: 'rotate(3deg)' }} />
            <div className="pair-plus" aria-hidden="true">
              <Icon name="plus" size={26} stroke={3.4} />
            </div>
          </div>
        </Scaled>
      </div>

      <div className="think">
        <strong>Pense numa palavra que ligue as duas.</strong>
        <span>Quando todo mundo estiver pronto, começa a contagem.</span>
      </div>

      <BottomBar>
        <button
          type="button"
          className={ready ? 'btn btn-yellow' : 'btn btn-primary'}
          aria-pressed={ready}
          onClick={toggle}
        >
          {!ready && <Icon name="check" size={22} stroke={3.2} />}
          <span>{ready ? readyLabel : 'Estou pronto'}</span>
        </button>
      </BottomBar>
    </main>
  );
}
