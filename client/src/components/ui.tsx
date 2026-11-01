import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { PlayerView, RoomView } from '../../../shared/types';
import { initialOf, nameOf, plural } from '../lib/text';
import { useVs } from '../lib/viewport';
import { Dots, Icon } from './Icon';

export function Avatar({ player, youId, className }: { player: PlayerView | undefined; youId: string; className?: string }) {
  const initial = !player ? '?' : player.id === youId ? 'V' : initialOf(player.name);
  return (
    <span aria-hidden="true" className={`avatar ${className ?? ''}`} style={{ background: player?.color ?? '#FFFDF7' }}>
      {initial}
    </span>
  );
}

export function GameHeader({ title, subtitle, onMenu }: { title: string; subtitle: string; onMenu: () => void }) {
  return (
    <header className="hdr">
      <div className="hdr-title">
        <strong>{title}</strong>
        <span>{subtitle}</span>
      </div>
      <button type="button" className="icon-btn" aria-label="Menu" onClick={onMenu}>
        <Icon name="menu" />
      </button>
    </header>
  );
}

export function roundTitle(view: RoomView): string {
  const g = view.game;
  return g ? `Rodada ${g.round} de ${g.totalRounds}` : 'Sala';
}

/** Rodapé com o botão principal: gruda no fim da tela quando o conteúdo não cabe. */
export function BottomBar({ children }: { children: ReactNode }) {
  const sentinel = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);
  useEffect(() => {
    const el = sentinel.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([entry]) => setStuck(!entry.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <>
      <div className={stuck ? 'bottom stuck' : 'bottom'}>{children}</div>
      <div ref={sentinel} className="bottom-sentinel" aria-hidden="true" />
    </>
  );
}

export function WaitBox({ children }: { children: ReactNode }) {
  return (
    <div role="status" className="status">
      <Dots />
      <span>{children}</span>
    </div>
  );
}

/** Texto numa linha só que diminui a fonte até caber na largura disponível. */
export function FitText({ text, max, min = 14, className }: { text: string; max: number; min?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      // A fonte é variável (eixo opsz): a largura das letras muda com o tamanho,
      // então mede de novo até caber em vez de confiar numa regra de três só.
      let size = max;
      el.style.fontSize = `${size}px`;
      for (let i = 0; i < 12 && el.clientWidth > 0 && el.scrollWidth > el.clientWidth && size > min; i++) {
        size = Math.max(min, Math.min(size - 1, Math.floor((size * el.clientWidth) / el.scrollWidth)));
        el.style.fontSize = `${size}px`;
      }
    };
    fit();
    let alive = true;
    void document.fonts?.ready.then(() => alive && fit());
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null;
    ro?.observe(el.parentElement ?? el);
    return () => {
      alive = false;
      ro?.disconnect();
    };
  }, [text, max, min]);
  return (
    <span ref={ref} className={className ?? 'fit'}>
      {text}
    </span>
  );
}

/**
 * Desenha uma composição de tamanho fixo (do layout) e reduz proporcionalmente
 * em celulares mais estreitos ou mais baixos.
 */
export function Scaled({ width, height, className, children }: { width: number; height: number; className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const vs = useVs();
  const [avail, setAvail] = useState(width);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setAvail(el.clientWidth || width);
    update();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [width]);
  const s = Math.min(1, vs, avail / width);
  return (
    <div ref={ref} className={className} style={{ width: '100%' }}>
      <div style={{ position: 'relative', width: width * s, height: height * s, margin: '0 auto' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, width, height, transform: `scale(${s})`, transformOrigin: '0 0' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

export function WordCard({
  label,
  word,
  max,
  yellow,
  style,
}: {
  label: string;
  word: string;
  max: number;
  yellow?: boolean;
  style?: CSSProperties;
}) {
  return (
    <div className={yellow ? 'card yellow' : 'card'} style={style}>
      <span className="card-label">{label}</span>
      <FitText className="card-word" text={word} max={max} min={20} />
    </div>
  );
}

/** Fichas do topo: placar (com quem está na vez em amarelo) ou quem já está pronto. */
export function ScoreChips({ view, mode }: { view: RoomView; mode: 'score' | 'ready' }) {
  const g = view.game;
  const n = view.players.length;
  return (
    <ul
      className={n > 3 ? 'chips scroll' : 'chips'}
      style={{ '--n': Math.max(1, Math.min(n, 3)) } as CSSProperties}
      aria-label={mode === 'score' ? 'Placar' : 'Quem já está pronto'}
    >
      {view.players.map((p) => {
        const name = nameOf(p, view.youId);
        if (mode === 'ready') {
          const ok = !!g?.readyIds.includes(p.id);
          return (
            <li key={p.id} className={`chip ${ok ? '' : 'wait'} ${p.connected ? '' : 'away'}`}>
              <Avatar player={p} youId={view.youId} />
              <span className="chip-name">{name}</span>
              {ok ? (
                <span className="chip-ok">
                  <Icon name="check" size={14} stroke={3.6} />
                  <span className="sr-only">pronto</span>
                </span>
              ) : (
                <span className="chip-wait">
                  …<span className="sr-only">{p.connected ? 'pensando' : 'desconectado'}</span>
                </span>
              )}
            </li>
          );
        }
        const turn = g?.chooserId === p.id;
        return (
          <li key={p.id} className={`chip ${turn ? 'on' : ''} ${p.connected ? '' : 'away'}`}>
            <Avatar player={p} youId={view.youId} />
            <span className="chip-name">{name}</span>
            <span className="chip-score">
              {p.score}
              <span className="sr-only"> {p.score === 1 ? 'ponto' : 'pontos'}</span>
            </span>
            {turn && <span className="sr-only">, está na vez</span>}
            {!p.connected && <span className="sr-only">, desconectado</span>}
          </li>
        );
      })}
    </ul>
  );
}

export function PairChips({ a, b }: { a: string; b: string }) {
  const total = a.length + b.length;
  const fontSize = total <= 14 ? 26 : total <= 18 ? 22 : 18;
  return (
    <div className="pair-chips" aria-label={`Palavras da rodada: ${a} e ${b}`}>
      <span className="pchip yellow" style={{ fontSize }}>
        {a}
      </span>
      <span className="plus-dot" aria-hidden="true">
        <Icon name="plus" size={16} stroke={3.6} />
      </span>
      <span className="pchip" style={{ fontSize }}>
        {b}
      </span>
    </div>
  );
}

export const points = (n: number) => plural(n, 'ponto', 'pontos');
