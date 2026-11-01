import { randomBytes, randomInt } from 'node:crypto';
import {
  DEFAULT_ROUNDS,
  HAND_SIZE,
  MAX_PLAYERS,
  MIN_PLAYERS,
  NAME_MAX,
  PLAYER_COLORS,
  ROUND_OPTIONS,
  type CountdownTiming,
  type ErrorCode,
  type GameView,
  type Phase,
  type RoomStatus,
  type RoomView,
} from '../shared/types';
import { WORDS } from './words';

export class GameError extends Error {
  readonly code: ErrorCode;

  constructor(code: ErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = 'GameError';
  }
}

export const DEFAULT_TIMING: CountdownTiming = { leadMs: 800, stepMs: 1000, goMs: 2200 };

export interface RoomDeps {
  now?: () => number;
  /** Agenda `fn` e devolve uma função que cancela. */
  schedule?: (fn: () => void, ms: number) => () => void;
  timing?: CountdownTiming;
  words?: readonly string[];
  /** Inteiro aleatório em [0, max). */
  random?: (max: number) => number;
  /** Chamado quando o estado muda sozinho (fim da contagem). */
  onChange?: () => void;
}

interface Card {
  word: string;
}

export interface Player {
  id: string;
  /** Segredo guardado no navegador; permite voltar para o mesmo lugar ao reconectar. */
  clientId: string;
  name: string;
  color: string;
  score: number;
  hand: Card[];
  sockets: Set<string>;
  lastSeen: number;
}

interface RoundResult {
  round: number;
  deckWord: string;
  playedWord: string;
  chooserId: string;
  matchedIds: string[];
}

interface Game {
  deck: string[];
  round: number;
  totalRounds: number;
  phase: Phase;
  /** Quem jogou a palavra da rodada (null enquanto ninguém jogou). */
  chooserId: string | null;
  deckWord: string;
  playedWord: string | null;
  ready: Set<string>;
  marked: Set<string>;
  countdownAt: number | null;
  lastResult: RoundResult | null;
}

export function cleanName(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  const flat = raw.replace(/[\u0000-\u001f\u007f-\u009f]/g, '').replace(/\s+/g, ' ').trim();
  return Array.from(flat).slice(0, NAME_MAX).join('').trim();
}

const sameName = (a: string, b: string) => a.toLocaleLowerCase('pt-BR') === b.toLocaleLowerCase('pt-BR');

function shuffle<T>(items: readonly T[], random: (max: number) => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = random(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const newId = () => randomBytes(6).toString('base64url');

const defaultSchedule = (fn: () => void, ms: number) => {
  const t = setTimeout(fn, ms);
  return () => clearTimeout(t);
};

export class Room {
  readonly code: string;
  readonly timing: CountdownTiming;
  hostId = '';
  players: Player[] = [];
  status: RoomStatus = 'lobby';
  rounds = DEFAULT_ROUNDS;
  game: Game | null = null;
  lastActivity: number;
  onChange: () => void;

  private readonly now: () => number;
  private readonly schedule: (fn: () => void, ms: number) => () => void;
  private readonly words: readonly string[];
  private readonly random: (max: number) => number;
  /** Palavras já vistas nesta sala, para não repetir entre partidas. */
  private readonly usedWords = new Set<string>();
  private cancelTimer: (() => void) | null = null;

  constructor(code: string, deps: RoomDeps = {}) {
    this.code = code;
    this.now = deps.now ?? Date.now;
    this.schedule = deps.schedule ?? defaultSchedule;
    this.timing = deps.timing ?? DEFAULT_TIMING;
    this.words = deps.words ?? WORDS;
    this.random = deps.random ?? ((max) => randomInt(max));
    this.onChange = deps.onChange ?? (() => {});
    this.lastActivity = this.now();
  }

  // ——— jogadores ———————————————————————————————————————————————

  find(id: string | null | undefined): Player | undefined {
    return id ? this.players.find((p) => p.id === id) : undefined;
  }

  findByClient(clientId: string): Player | undefined {
    return this.players.find((p) => p.clientId === clientId);
  }

  isConnected(p: Player): boolean {
    return p.sockets.size > 0;
  }

  connectedPlayers(): Player[] {
    return this.players.filter((p) => p.sockets.size > 0);
  }

  /** Entra na sala, ou volta para o mesmo lugar se o `clientId` já estiver nela. */
  join(clientId: string, rawName: string): Player {
    const name = cleanName(rawName);
    const existing = this.findByClient(clientId);
    if (existing) {
      if (name && !sameName(name, existing.name)) existing.name = this.uniqueName(name, existing.id);
      this.touch();
      return existing;
    }
    if (!name) throw new GameError('NAME_REQUIRED', 'Digite seu nome para entrar.');
    if (this.players.length >= MAX_PLAYERS) {
      throw new GameError('ROOM_FULL', `A sala está cheia (máximo de ${MAX_PLAYERS} jogadores).`);
    }
    const player: Player = {
      id: newId(),
      clientId,
      name: this.uniqueName(name),
      color: this.freeColor(),
      score: 0,
      hand: [],
      sockets: new Set(),
      lastSeen: this.now(),
    };
    this.players.push(player);
    if (!this.find(this.hostId)) this.hostId = player.id;
    // Quem chega no meio da partida já recebe a mão.
    if (this.status === 'playing' && this.game) this.deal(player);
    this.touch();
    return player;
  }

  attach(player: Player, socketId: string): void {
    player.sockets.add(socketId);
    player.lastSeen = this.now();
    this.touch();
  }

  /** Um celular desconectou (tela bloqueada, rede caiu…). O lugar continua guardado. */
  detach(socketId: string): Player | undefined {
    const player = this.players.find((p) => p.sockets.has(socketId));
    if (!player) return undefined;
    player.sockets.delete(socketId);
    player.lastSeen = this.now();
    this.touch();
    // Quem caiu não precisa estar pronto para a contagem começar.
    this.maybeStartCountdown();
    return player;
  }

  /** Saiu de vez (ou foi removido). */
  leave(playerId: string): Player | undefined {
    const idx = this.players.findIndex((p) => p.id === playerId);
    if (idx < 0) return undefined;
    const [gone] = this.players.splice(idx, 1);
    if (this.hostId === playerId) this.hostId = (this.connectedPlayers()[0] ?? this.players[0])?.id ?? '';
    const g = this.game;
    if (g && this.status === 'playing') {
      g.ready.delete(playerId);
      g.marked.delete(playerId);
      this.maybeStartCountdown();
    }
    this.touch();
    return gone;
  }

  /** O anfitrião manda; se ele cair, o primeiro jogador conectado assume. */
  adminId(): string {
    const host = this.find(this.hostId);
    if (host && this.isConnected(host)) return host.id;
    return this.connectedPlayers()[0]?.id ?? this.hostId;
  }

  requireAdmin(by: string): void {
    if (this.adminId() !== by) throw new GameError('NOT_ALLOWED', 'Só quem criou a sala pode fazer isso.');
  }

  setRounds(by: string, rounds: number): void {
    this.requireAdmin(by);
    if (this.status === 'playing') throw new GameError('BAD_STATE', 'A partida já começou.');
    if (!(ROUND_OPTIONS as readonly number[]).includes(rounds)) {
      throw new GameError('BAD_INPUT', 'Número de rodadas inválido.');
    }
    this.rounds = rounds;
    this.touch();
  }

  // ——— partida ————————————————————————————————————————————————

  start(by: string): void {
    this.requireAdmin(by);
    if (this.status === 'playing') throw new GameError('BAD_STATE', 'A partida já começou.');
    if (this.players.length < MIN_PLAYERS) {
      throw new GameError('NOT_ENOUGH_PLAYERS', 'Chame pelo menos mais uma pessoa para jogar.');
    }
    this.clearTimer();
    this.game = {
      deck: this.buildDeck(),
      round: 0,
      totalRounds: this.rounds,
      phase: 'choosing',
      chooserId: null,
      deckWord: '',
      playedWord: null,
      ready: new Set(),
      marked: new Set(),
      countdownAt: null,
      lastResult: null,
    };
    for (const p of this.players) {
      p.score = 0;
      p.hand = [];
      this.deal(p);
    }
    this.status = 'playing';
    this.beginRound();
    this.touch();
  }

  /** Qualquer jogador pode jogar uma palavra da mão; vale a primeira que chegar. */
  pick(by: string, round: unknown, word: string): void {
    const g = this.requireStep(round, 'choosing');
    const player = this.find(by);
    if (!player) throw new GameError('NOT_IN_ROOM', 'Você não está nesta sala.');
    const idx = player.hand.findIndex((c) => c.word === word);
    if (idx < 0) throw new GameError('BAD_INPUT', 'Essa palavra não está na sua mão.');
    player.hand.splice(idx, 1);
    g.chooserId = player.id;
    g.playedWord = word;
    g.ready.clear();
    g.phase = 'thinking';
    this.touch();
  }

  setReady(by: string, round: unknown, ready: boolean): void {
    const g = this.requireStep(round, 'thinking');
    if (!this.find(by)) throw new GameError('NOT_IN_ROOM', 'Você não está nesta sala.');
    if (ready) g.ready.add(by);
    else g.ready.delete(by);
    this.touch();
    this.maybeStartCountdown();
  }

  /** Quem marca os pontos é sempre quem administra a sala. */
  mark(by: string, round: unknown, playerId: string, on: boolean): void {
    const g = this.requireStep(round, 'scoring');
    this.requireJudge(by);
    if (!this.find(playerId)) throw new GameError('BAD_INPUT', 'Jogador não encontrado.');
    if (on) g.marked.add(playerId);
    else g.marked.delete(playerId);
    this.touch();
  }

  confirm(by: string, round: unknown): void {
    const g = this.requireStep(round, 'scoring');
    this.requireJudge(by);
    const matched = this.players.filter((p) => g.marked.has(p.id));
    for (const p of matched) p.score += 1;
    // Quem gastou a palavra recebe uma nova do baralho (menos na última rodada).
    const chooser = this.find(g.chooserId);
    if (chooser && g.round < g.totalRounds) {
      const word = this.draw();
      if (word) chooser.hand.push({ word });
    }
    g.lastResult = {
      round: g.round,
      deckWord: g.deckWord,
      playedWord: g.playedWord ?? '',
      chooserId: g.chooserId ?? '',
      matchedIds: matched.map((p) => p.id),
    };
    g.phase = 'result';
    this.touch();
  }

  /** Qualquer jogador pode avançar. O número da rodada evita pular duas de uma vez. */
  next(by: string, round: unknown): void {
    const g = this.requireStep(round, 'result');
    if (!this.find(by)) throw new GameError('NOT_IN_ROOM', 'Você não está nesta sala.');
    if (g.round >= g.totalRounds) {
      this.finish();
      return;
    }
    this.beginRound();
    this.touch();
  }

  end(by: string): void {
    this.requireAdmin(by);
    if (this.status !== 'playing') throw new GameError('BAD_STATE', 'Nenhuma partida em andamento.');
    this.finish();
    this.touch();
  }

  /** "Jogar de novo": volta todo mundo para a sala. */
  backToLobby(by: string): void {
    this.requireAdmin(by);
    if (this.status !== 'finished') throw new GameError('BAD_STATE', 'A partida ainda não acabou.');
    this.clearTimer();
    this.status = 'lobby';
    this.game = null;
    for (const p of this.players) {
      p.score = 0;
      p.hand = [];
    }
    this.touch();
  }

  dispose(): void {
    this.clearTimer();
  }

  // ——— visão de cada jogador ——————————————————————————————————————

  viewFor(playerId: string): RoomView {
    const me = this.find(playerId);
    const g = this.game;
    return {
      code: this.code,
      youId: playerId,
      hostId: this.hostId,
      adminId: this.adminId(),
      status: this.status,
      rounds: this.rounds,
      players: this.players.map((p) => ({
        id: p.id,
        name: p.name,
        color: p.color,
        score: p.score,
        connected: this.isConnected(p),
      })),
      hand: me ? me.hand.map((c) => ({ word: c.word })) : [],
      game: g ? this.gameView(g) : null,
      timing: this.timing,
      serverNow: this.now(),
    };
  }

  private gameView(g: Game): GameView {
    return {
      round: g.round,
      totalRounds: g.totalRounds,
      phase: g.phase,
      chooserId: g.chooserId,
      deckWord: g.deckWord,
      playedWord: g.playedWord,
      readyIds: [...g.ready],
      markedIds: [...g.marked],
      countdownAt: g.countdownAt,
      lastResult: g.lastResult,
    };
  }

  // ——— internos ———————————————————————————————————————————————

  private touch(): void {
    this.lastActivity = this.now();
  }

  private uniqueName(name: string, selfId?: string): string {
    const taken = this.players.filter((p) => p.id !== selfId).map((p) => p.name);
    const isTaken = (candidate: string) => taken.some((t) => sameName(t, candidate));
    if (!isTaken(name)) return name;
    for (let n = 2; ; n++) {
      const suffix = ` ${n}`;
      const candidate = Array.from(name).slice(0, NAME_MAX - suffix.length).join('').trim() + suffix;
      if (!isTaken(candidate)) return candidate;
    }
  }

  private freeColor(): string {
    const used = new Set(this.players.map((p) => p.color));
    return PLAYER_COLORS.find((c) => !used.has(c)) ?? PLAYER_COLORS[this.players.length % PLAYER_COLORS.length];
  }

  private buildDeck(): string[] {
    // Sobra suficiente para as mãos, todas as rodadas e quem entrar no meio.
    const needed = MAX_PLAYERS * HAND_SIZE + this.rounds * 2 + 8;
    let pool = this.words.filter((w) => !this.usedWords.has(w));
    if (pool.length < needed) {
      this.usedWords.clear();
      pool = [...this.words];
    }
    return shuffle(pool, this.random);
  }

  private draw(): string | undefined {
    const word = this.game?.deck.pop();
    if (word) this.usedWords.add(word);
    return word;
  }

  private deal(player: Player): void {
    while (player.hand.length < HAND_SIZE) {
      const word = this.draw();
      if (!word) break;
      player.hand.push({ word });
    }
  }

  private beginRound(): void {
    const g = this.game;
    if (!g) return;
    const word = this.draw();
    if (!word) {
      this.finish();
      return;
    }
    g.round += 1;
    g.chooserId = null;
    g.deckWord = word;
    g.playedWord = null;
    g.ready.clear();
    g.marked.clear();
    g.countdownAt = null;
    g.phase = 'choosing';
  }

  private requireJudge(by: string): void {
    if (this.adminId() !== by) throw new GameError('NOT_ALLOWED', 'Só o anfitrião marca os pontos.');
  }

  private requireStep(round: unknown, phase: Phase): Game {
    const g = this.game;
    if (!g || this.status !== 'playing') throw new GameError('BAD_STATE', 'Nenhuma partida em andamento.');
    if (round !== g.round || g.phase !== phase) throw new GameError('BAD_STATE', 'Essa etapa já passou.');
    return g;
  }

  private maybeStartCountdown(): void {
    const g = this.game;
    if (!g || this.status !== 'playing' || g.phase !== 'thinking') return;
    const online = this.connectedPlayers();
    if (online.length > 0 && online.every((p) => g.ready.has(p.id))) this.startCountdown(g);
  }

  private startCountdown(g: Game): void {
    g.phase = 'countdown';
    g.countdownAt = this.now() + this.timing.leadMs;
    const round = g.round;
    const { leadMs, stepMs, goMs } = this.timing;
    this.setTimer(() => {
      if (this.game !== g || this.status !== 'playing' || g.round !== round || g.phase !== 'countdown') return;
      g.marked.clear();
      g.phase = 'scoring';
      this.touch();
      this.onChange();
    }, leadMs + 3 * stepMs + goMs);
  }

  private finish(): void {
    this.clearTimer();
    this.status = 'finished';
  }

  private setTimer(fn: () => void, ms: number): void {
    this.clearTimer();
    this.cancelTimer = this.schedule(() => {
      this.cancelTimer = null;
      fn();
    }, ms);
  }

  private clearTimer(): void {
    this.cancelTimer?.();
    this.cancelTimer = null;
  }
}
