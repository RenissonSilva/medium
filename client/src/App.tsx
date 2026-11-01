import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { RoomView } from '../../shared/types';
import { Dots } from './components/Icon';
import { MenuSheet } from './components/MenuSheet';
import { codeFromLocation } from './lib/code';
import { storage } from './lib/storage';
import { Acertos } from './screens/Acertos';
import { Carregando } from './screens/Carregando';
import { Contagem } from './screens/Contagem';
import { Entrar } from './screens/Entrar';
import { Escolha } from './screens/Escolha';
import { Fim } from './screens/Fim';
import { Inicio } from './screens/Inicio';
import { Par } from './screens/Par';
import { Rodada } from './screens/Rodada';
import { Sala } from './screens/Sala';
import { useGame } from './state/game';

/** Qual tela mostrar para este jogador, dado o estado da sala. A chave reinicia a tela a cada rodada. */
function roomScreen(view: RoomView, onMenu: () => void): [string, ReactNode] {
  const props = { view, onMenu };
  if (view.status === 'lobby') return ['sala', <Sala {...props} />];
  const g = view.game;
  if (view.status === 'finished' || !g) return ['fim', <Fim {...props} />];
  switch (g.phase) {
    case 'choosing':
      return [`escolha-${g.round}`, <Escolha {...props} />];
    case 'thinking':
      return [`par-${g.round}`, <Par {...props} />];
    case 'countdown':
      return [`contagem-${g.round}`, <Contagem {...props} />];
    case 'scoring':
      return [`acertos-${g.round}`, <Acertos {...props} />];
    case 'result':
      return [`rodada-${g.round}`, <Rodada {...props} />];
  }
}

export function App() {
  const game = useGame();
  const { view, joining, conn, toasts } = game;
  const [local, setLocal] = useState<'home' | 'join'>('home');
  const [invite, setInvite] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const booted = useRef(false);

  // Ao abrir: link/QR code com o código → entra direto (se já sabemos o nome);
  // sem link → tenta voltar para a sala em que a pessoa estava.
  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    const urlCode = codeFromLocation(location.pathname, location.search);
    const name = storage.get('name')?.trim() ?? '';
    const saved = storage.get('room');
    if (urlCode && name) {
      void game.join(urlCode, name, { auto: true }).then((res) => {
        if (res.ok) return;
        history.replaceState(null, '', '/');
        if (res.error === 'NAME_REQUIRED') setInvite(urlCode);
        else game.toast(res.message, 'error');
      });
    } else if (urlCode) {
      setInvite(urlCode);
    } else if (saved && name) {
      void game.join(saved, name, { auto: true });
    }
  }, [game]);

  const inRoom = !!view;
  useEffect(() => {
    setMenuOpen(false);
    if (inRoom) {
      setLocal('home');
      setInvite(null);
      setJoinError(null);
    }
    setBusy(false);
  }, [inRoom]);

  const create = async (name: string) => {
    setBusy(true);
    const res = await game.create(name);
    if (!res.ok) {
      setBusy(false);
      game.toast(res.message, 'error');
    }
  };

  const joinCode = async (code: string) => {
    const name = storage.get('name')?.trim() ?? '';
    setBusy(true);
    setJoinError(null);
    const res = await game.join(code, name);
    if (!res.ok) {
      setBusy(false);
      setJoinError(res.message);
    }
  };

  const joinInvite = async (name: string) => {
    if (!invite) return;
    storage.set('name', name);
    setBusy(true);
    const res = await game.join(invite, name);
    if (!res.ok) {
      setBusy(false);
      game.toast(res.message, 'error');
      if (res.error === 'ROOM_NOT_FOUND') {
        setInvite(null);
        history.replaceState(null, '', '/');
      }
    }
  };

  let key: string;
  let screen: ReactNode;
  if (view) {
    [key, screen] = roomScreen(view, () => setMenuOpen(true));
  } else if (joining) {
    [key, screen] = ['carregando', <Carregando code={joining} />];
  } else if (local === 'join') {
    [key, screen] = [
      'entrar',
      <Entrar
        busy={busy}
        error={joinError}
        onBack={() => {
          setLocal('home');
          setJoinError(null);
        }}
        onJoin={joinCode}
        onClearError={() => setJoinError(null)}
      />,
    ];
  } else {
    [key, screen] = [
      invite ? `convite-${invite}` : 'inicio',
      <Inicio
        invite={invite}
        busy={busy}
        onCreate={create}
        onJoinInvite={joinInvite}
        onJoinScreen={(name) => {
          storage.set('name', name);
          setLocal('join');
        }}
      />,
    ];
  }

  return (
    <>
      <div key={key} style={{ display: 'contents' }}>
        {screen}
      </div>
      {menuOpen && view && <MenuSheet view={view} onClose={() => setMenuOpen(false)} />}
      <div className="toasts" aria-live="polite">
        {view && conn === 'offline' && (
          <div className="toast conn" role="status">
            <Dots small />
            <span>Sem conexão — reconectando…</span>
          </div>
        )}
        {toasts.map((t) => (
          <div key={t.id} className={t.kind === 'error' ? 'toast error' : 'toast'}>
            {t.text}
          </div>
        ))}
      </div>
    </>
  );
}
