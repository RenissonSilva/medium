import { useEffect, useRef, useState } from 'react';
import type { RoomView } from '../../../shared/types';
import { Icon } from '../components/Icon';
import { Avatar, BottomBar, GameHeader, PairChips, WaitBox, roundTitle } from '../components/ui';
import { nameOf, upper } from '../lib/text';
import { useGame } from '../state/game';

/** 07 · Quem falou a mesma palavra? O anfitrião marca; os outros acompanham ao vivo. */
export function Acertos({ view, onMenu }: { view: RoomView; onMenu: () => void }) {
  const { send, toast } = useGame();
  const g = view.game!;
  const isJudge = view.adminId === view.youId;
  const judge = view.players.find((p) => p.id === view.adminId);
  // Quem marca vê o toque na hora; o servidor repassa para todo mundo.
  const [local, setLocal] = useState<Set<string>>(() => new Set(g.markedIds));
  const wasJudge = useRef(isJudge);
  useEffect(() => {
    if (isJudge && !wasJudge.current) setLocal(new Set(g.markedIds));
    wasJudge.current = isJudge;
  }, [isJudge, g.markedIds]);
  const marked = isJudge ? local : new Set(g.markedIds);
  const [busy, setBusy] = useState(false);

  const toggle = (id: string) => {
    const on = !marked.has(id);
    setLocal((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
    void send('game:mark', { round: g.round, playerId: id, on }).then((res) => {
      if (!res.ok) toast(res.message, 'error');
    });
  };

  const confirm = async () => {
    setBusy(true);
    const res = await send('game:confirm', { round: g.round });
    if (!res.ok) {
      setBusy(false);
      toast(res.message, 'error');
    }
  };

  const k = view.players.filter((p) => marked.has(p.id)).length;

  return (
    <main className="screen">
      <GameHeader title={roundTitle(view)} subtitle={`Sala ${view.code}`} onMenu={onMenu} />
      <PairChips a={upper(g.deckWord)} b={upper(g.playedWord ?? '')} />

      <div className="judge">
        <div className="judge-head">
          <h1>Quem falou a mesma palavra?</h1>
          <p>
            {isJudge
              ? 'Marque quem combinou — cada um ganha 1\u00a0ponto.'
              : `${judge ? judge.name : 'O anfitrião'} marca quem combinou — cada um ganha 1\u00a0ponto.`}
          </p>
        </div>
        <ul className="judge-list" aria-label="Jogadores">
          {view.players.map((p) => {
            const on = marked.has(p.id);
            const inner = (
              <>
                <Avatar player={p} youId={view.youId} />
                <span className="judge-name">{nameOf(p, view.youId)}</span>
                {on && (
                  <span className="judge-plus" aria-hidden="true">
                    +1
                  </span>
                )}
                <span className="judge-box" aria-hidden="true">
                  {on && <Icon name="check" size={16} stroke={3.6} />}
                </span>
              </>
            );
            return (
              <li key={p.id}>
                {isJudge ? (
                  <button type="button" className={on ? 'judge-row on' : 'judge-row'} aria-pressed={on} onClick={() => toggle(p.id)}>
                    {inner}
                  </button>
                ) : (
                  <div className={on ? 'judge-row on' : 'judge-row'}>
                    {inner}
                    <span className="sr-only">{on ? 'combinou' : 'não marcado'}</span>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <BottomBar>
        {isJudge ? (
          <button type="button" className="btn btn-primary" disabled={busy} onClick={confirm}>
            <span>{k === 0 ? 'Ninguém acertou · seguir' : `Dar +1 para ${k} ${k === 1 ? 'jogador' : 'jogadores'}`}</span>
            <Icon name="arrow" size={22} stroke={3} />
          </button>
        ) : (
          <WaitBox>{judge ? `${judge.name} está marcando` : 'Marcando os pontos'}</WaitBox>
        )}
      </BottomBar>
    </main>
  );
}
