import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Ack, ClientToServerEvents, RoomView } from '../../../shared/types';
import { syncClock } from '../lib/clock';
import { keepAwake } from '../lib/device';
import { socket } from '../lib/socket';
import { getClientId, storage } from '../lib/storage';

export type Conn = 'connecting' | 'online' | 'offline';
export type ActionEvent = Exclude<keyof ClientToServerEvents, 'time:ping' | 'room:create' | 'room:join' | 'room:photo'>;

export interface ToastItem {
  id: number;
  text: string;
  kind: 'info' | 'error';
}

interface GameContext {
  conn: Conn;
  view: RoomView | null;
  /** Código da sala que está sendo aberta automaticamente (link/QR ou retomada). */
  joining: string | null;
  toasts: ToastItem[];
  toast: (text: string, kind?: 'info' | 'error') => void;
  /** Sua foto de perfil (data URL), guardada neste navegador. */
  photo: string | null;
  /** Troca (ou tira, com null) a foto; se você está numa sala, todo mundo já vê a nova. */
  setPhoto: (photo: string | null) => Promise<Ack>;
  create: (name: string) => Promise<Ack<{ code: string }>>;
  join: (code: string, name: string, opts?: { auto?: boolean }) => Promise<Ack<{ code: string }>>;
  leave: () => Promise<void>;
  send: (event: ActionEvent, payload?: object) => Promise<Ack>;
}

const Ctx = createContext<GameContext | null>(null);

const NO_ANSWER = {
  ok: false,
  error: 'INTERNAL',
  message: 'Sem resposta do servidor. Confira sua internet.',
} as const;

async function emit<T extends object = object>(event: keyof ClientToServerEvents, ...args: unknown[]): Promise<Ack<T>> {
  try {
    // O tipo exato de cada evento está em shared/types.ts.
    const s = socket.timeout(8000) as unknown as { emitWithAck: (e: string, ...a: unknown[]) => Promise<Ack<T>> };
    return await s.emitWithAck(event, ...args);
  } catch {
    return NO_ANSWER;
  }
}

const savedPhoto = () => storage.get('photo');

/** "*" = acabei de pedir para criar uma sala e ainda não sei o código. */
const ANY_ROOM = '*';

export function GameProvider({ children }: { children: ReactNode }) {
  const [conn, setConn] = useState<Conn>(socket.connected ? 'online' : 'connecting');
  const [view, setView] = useState<RoomView | null>(null);
  const [joining, setJoining] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [photo, setPhotoState] = useState<string | null>(savedPhoto);
  const desired = useRef<{ code: string; name: string } | null>(null);
  const toastSeq = useRef(0);

  const toast = useCallback((text: string, kind: 'info' | 'error' = 'info') => {
    const id = ++toastSeq.current;
    setToasts((list) => [...list.slice(-2), { id, text, kind }]);
    window.setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 2800);
  }, []);

  const forget = useCallback(() => {
    desired.current = null;
    storage.remove('room');
    setView(null);
    setJoining(null);
    keepAwake(false);
    document.title = 'Medium';
    if (location.pathname !== '/' || location.search) history.replaceState(null, '', '/');
  }, []);

  const join = useCallback(async (code: string, name: string, opts: { auto?: boolean } = {}) => {
    const previous = desired.current;
    desired.current = { code, name };
    if (opts.auto) setJoining(code);
    const res = await emit<{ code: string }>('room:join', { code, name, clientId: getClientId(), photo: savedPhoto() });
    setJoining(null);
    if (res.ok) {
      storage.set('room', res.code);
      if (name) storage.set('name', name);
    } else {
      desired.current = previous;
      if (storage.get('room') === code) storage.remove('room');
    }
    return res;
  }, []);

  const create = useCallback(async (name: string) => {
    const previous = desired.current;
    desired.current = { code: ANY_ROOM, name };
    const res = await emit<{ code: string }>('room:create', { name, clientId: getClientId(), photo: savedPhoto() });
    if (res.ok) {
      desired.current = { code: res.code, name };
      storage.set('room', res.code);
      storage.set('name', name);
    } else {
      desired.current = previous;
    }
    return res;
  }, []);

  const leave = useCallback(async () => {
    await emit('room:leave');
    forget();
  }, [forget]);

  const setPhoto = useCallback(async (next: string | null): Promise<Ack> => {
    // Fora da sala (ou sem internet) fica só guardada: vai junto ao entrar/reconectar.
    if (desired.current && socket.connected) {
      const res = await emit('room:photo', { photo: next });
      if (!res.ok && res.error === 'BAD_INPUT') return res;
    }
    if (next) storage.set('photo', next);
    else storage.remove('photo');
    setPhotoState(next);
    return { ok: true };
  }, []);

  const send = useCallback(
    (event: ActionEvent, payload?: object) => (payload === undefined ? emit(event) : emit(event, payload)),
    [],
  );

  useEffect(() => {
    const onConnect = () => {
      setConn('online');
      void syncClock(socket);
      // Caiu e voltou (tela bloqueada, troca de rede…): volta para a mesma sala.
      const d = desired.current;
      if (d && d.code !== ANY_ROOM) {
        void emit('room:join', { code: d.code, name: d.name, clientId: getClientId(), photo: savedPhoto() }).then((res) => {
          if (!res.ok && res.error === 'ROOM_NOT_FOUND' && desired.current?.code === d.code) {
            forget();
            toast('Essa sala não existe mais.', 'error');
          }
        });
      }
    };
    const onDisconnect = () => setConn('offline');
    const onState = (v: RoomView) => {
      const d = desired.current;
      if (!d || (d.code !== ANY_ROOM && d.code !== v.code)) return;
      if (d.code === ANY_ROOM) desired.current = { ...d, code: v.code };
      setView(v);
    };
    const onClosed = ({ reason }: { reason: 'kicked' | 'left' }) => {
      forget();
      if (reason === 'kicked') toast('Você foi removido da sala.', 'error');
      else toast('Você saiu da sala.');
    };
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onDisconnect);
    socket.on('room:state', onState);
    socket.on('room:closed', onClosed);
    if (socket.connected) onConnect();
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onDisconnect);
      socket.off('room:state', onState);
      socket.off('room:closed', onClosed);
    };
  }, [forget, toast]);

  // Voltou de tela bloqueada / outro app: confere a conexão na hora em vez de esperar
  // o navegador perceber sozinho que ela caiu (pode levar ~20 s).
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible' || !desired.current) return;
      if (!socket.connected) {
        socket.connect();
        return;
      }
      socket.timeout(2500).emit('time:ping', (err) => {
        if (err) {
          socket.disconnect();
          socket.connect();
        }
      });
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  const code = view?.code;
  useEffect(() => {
    if (!code) return;
    storage.set('room', code);
    if (location.pathname !== `/${code}`) history.replaceState(null, '', `/${code}`);
    document.title = `Medium · Sala ${code}`;
    keepAwake(true);
  }, [code]);

  const value = useMemo<GameContext>(
    () => ({ conn, view, joining, toasts, toast, photo, setPhoto, create, join, leave, send }),
    [conn, view, joining, toasts, toast, photo, setPhoto, create, join, leave, send],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useGame(): GameContext {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useGame precisa estar dentro de <GameProvider>');
  return ctx;
}
