// Tipos e constantes compartilhados entre o servidor e o cliente.

export const HAND_SIZE = 5;
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 8;
export const NAME_MAX = 16;
export const CODE_LENGTH = 4;
/** Sem 0/O e 1/I/L, para ninguém confundir na hora de digitar o código. */
export const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const ROUND_OPTIONS = [5, 10, 15, 20] as const;
export const DEFAULT_ROUNDS = 10;
/** Lado (px) da foto de perfil quadrada que o celular gera antes de enviar. */
export const PHOTO_SIZE = 240;
/** Tamanho máximo da foto já reduzida (JPEG). */
export const PHOTO_MAX_BYTES = 48 * 1024;

/** Cor do avatar de cada jogador, na ordem em que entram na sala. */
export const PLAYER_COLORS = [
  '#FFFDF7',
  '#FF9BC2',
  '#7FE0B6',
  '#FFB86B',
  '#B9A7FF',
  '#8FD3FF',
  '#D9F27E',
  '#FF8A7A',
] as const;

export type RoomStatus = 'lobby' | 'playing' | 'finished';

/**
 * Etapas de uma rodada:
 * - choosing: qualquer jogador escolhe uma palavra da mão; vale a primeira jogada
 * - thinking: as duas palavras aparecem; cada um aperta "Estou pronto"
 * - countdown: 3, 2, 1… FALEM!
 * - scoring: o anfitrião marca quem combinou
 * - result: placar da rodada
 */
export type Phase = 'choosing' | 'thinking' | 'countdown' | 'scoring' | 'result';

export interface PlayerView {
  id: string;
  name: string;
  color: string;
  /** Endereço da foto de perfil (muda quando a foto muda), ou null para mostrar a inicial. */
  photo: string | null;
  score: number;
  connected: boolean;
}

export interface HandCard {
  word: string;
}

export interface RoundResultView {
  round: number;
  deckWord: string;
  playedWord: string;
  chooserId: string;
  matchedIds: string[];
}

export interface CountdownTiming {
  /** Folga para todos os celulares receberem o aviso antes do "3". */
  leadMs: number;
  /** Duração de cada número (3, 2, 1). */
  stepMs: number;
  /** Quanto tempo o "FALEM!" fica na tela. */
  goMs: number;
}

export interface GameView {
  round: number;
  totalRounds: number;
  phase: Phase;
  /** Quem jogou a palavra da rodada (null enquanto ninguém jogou). */
  chooserId: string | null;
  deckWord: string;
  playedWord: string | null;
  readyIds: string[];
  markedIds: string[];
  /** Horário do servidor (ms) em que o "3" aparece. */
  countdownAt: number | null;
  lastResult: RoundResultView | null;
}

export interface RoomView {
  code: string;
  youId: string;
  /** Quem criou a sala. */
  hostId: string;
  /** Quem pode iniciar/encerrar e marca os pontos: o anfitrião ou, se ele cair, o próximo conectado. */
  adminId: string;
  status: RoomStatus;
  rounds: number;
  players: PlayerView[];
  /** Só as suas palavras. As mãos dos outros nunca saem do servidor. */
  hand: HandCard[];
  game: GameView | null;
  timing: CountdownTiming;
  serverNow: number;
}

export type ErrorCode =
  | 'BAD_INPUT'
  | 'NAME_REQUIRED'
  | 'ROOM_NOT_FOUND'
  | 'ROOM_FULL'
  | 'NOT_IN_ROOM'
  | 'NOT_ALLOWED'
  | 'BAD_STATE'
  | 'NOT_ENOUGH_PLAYERS'
  | 'INTERNAL';

export type Ack<T extends object = object> =
  | ({ ok: true } & T)
  | { ok: false; error: ErrorCode; message: string };

type Reply<T extends object = object> = (res: Ack<T>) => void;

export interface ClientToServerEvents {
  'time:ping': (reply: (serverNow: number) => void) => void;
  /** `photo`: data URL JPEG; null tira a foto; sem o campo, mantém a que está. */
  'room:create': (p: { name: string; clientId: string; photo?: string | null }, reply: Reply<{ code: string }>) => void;
  'room:join': (
    p: { code: string; name: string; clientId: string; photo?: string | null },
    reply: Reply<{ code: string }>,
  ) => void;
  'room:photo': (p: { photo: string | null }, reply: Reply) => void;
  'room:leave': (reply: Reply) => void;
  'room:rounds': (p: { rounds: number }, reply: Reply) => void;
  'room:kick': (p: { playerId: string }, reply: Reply) => void;
  'game:start': (reply: Reply) => void;
  'game:pick': (p: { round: number; word: string }, reply: Reply) => void;
  'game:ready': (p: { round: number; ready: boolean }, reply: Reply) => void;
  'game:mark': (p: { round: number; playerId: string; on: boolean }, reply: Reply) => void;
  'game:confirm': (p: { round: number }, reply: Reply) => void;
  'game:next': (p: { round: number }, reply: Reply) => void;
  'game:end': (reply: Reply) => void;
  'game:lobby': (reply: Reply) => void;
}

export interface ServerToClientEvents {
  'room:state': (view: RoomView) => void;
  'room:closed': (p: { reason: 'kicked' | 'left' }) => void;
}
