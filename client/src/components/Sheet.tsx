import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';

/** Folha que sobe do rodapé (menu, regras, convite, confirmações). */
export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const id = useId();
  const box = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    box.current?.querySelector<HTMLElement>('[data-autofocus], .sheet-body button, .sheet-body a')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close.current();
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, []);

  return createPortal(
    <div
      className="sheet-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby={id} ref={box}>
        <div className="sheet-head">
          <h2 id={id}>{title}</h2>
          <button type="button" className="icon-btn" aria-label="Fechar" onClick={onClose}>
            <Icon name="close" stroke={3} />
          </button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

export function Rules() {
  return (
    <ol className="rules">
      <li>Uma palavra sai do baralho para todo mundo ver.</li>
      <li>Cada um escolhe, da própria mão, uma palavra que combine com ela — vale a de quem jogar primeiro.</li>
      <li>Com as duas palavras na tela, cada um pensa numa terceira que ligue as duas.</li>
      <li>Quando todos apertarem “Estou pronto”, vem a contagem: 3, 2, 1… e todo mundo fala ao mesmo tempo!</li>
      <li>O anfitrião marca quem falou a mesma palavra que outra pessoa — cada um ganha 1 ponto.</li>
      <li>As duas palavras saem do jogo e quem jogou recebe uma nova.</li>
    </ol>
  );
}
