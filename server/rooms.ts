import { randomInt } from 'node:crypto';
import type { Server, Socket } from 'socket.io';
import {
  CODE_ALPHABET,
  CODE_LENGTH,
  type Ack,
  type ClientToServerEvents,
  type ServerToClientEvents,
} from '../shared/types';
import { GameError, Room, cleanName, type Player, type RoomDeps } from './game';

type IO = Server<ClientToServerEvents, ServerToClientEvents>;
type Sock = Socket<ClientToServerEvents, ServerToClientEvents>;

const CLIENT_ID_RE = /^[A-Za-z0-9_-]{8,64}$/;
/** Sala sem ninguém conectado por esse tempo é apagada. */
const IDLE_ROOM_MS = 2 * 60 * 60 * 1000;
const MAX_ROOMS = 5000;

interface Seat {
  code: string;
  playerId: string;
}

export function normalizeCode(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CODE_LENGTH);
}

function randomCode(): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return code;
}

export class RoomManager {
  readonly rooms = new Map<string, Room>();
  private readonly seats = new Map<string, Seat>();
  private readonly io: IO;
  private readonly deps: Omit<RoomDeps, 'onChange'>;
  private gcTimer: ReturnType<typeof setInterval> | null = null;

  constructor(io: IO, deps: Omit<RoomDeps, 'onChange'> = {}) {
    this.io = io;
    this.deps = deps;
  }

  attach(): void {
    this.io.on('connection', (socket) => this.onConnection(socket));
    this.gcTimer = setInterval(() => this.gc(), 10 * 60 * 1000);
    this.gcTimer.unref?.();
  }

  close(): void {
    if (this.gcTimer) clearInterval(this.gcTimer);
    for (const room of this.rooms.values()) room.dispose();
    this.rooms.clear();
    this.seats.clear();
  }

  private onConnection(socket: Sock): void {
    socket.on('time:ping', (reply) => {
      if (typeof reply === 'function') reply(Date.now());
    });

    socket.on('room:create', (p, reply) =>
      this.run(reply, () => {
        const { clientId, name } = this.identity(p);
        if (!name) throw new GameError('NAME_REQUIRED', 'Digite seu nome para criar a sala.');
        if (this.rooms.size >= MAX_ROOMS) throw new GameError('INTERNAL', 'Servidor lotado. Tente de novo em instantes.');
        this.releaseSocket(socket);
        this.leaveOtherRooms(clientId, null);
        const room = this.createRoom();
        const player = room.join(clientId, name);
        this.seat(socket, room, player);
        this.broadcastSoon(room);
        return { code: room.code };
      }),
    );

    socket.on('room:join', (p, reply) =>
      this.run(reply, () => {
        const { clientId, name } = this.identity(p);
        const code = normalizeCode(p?.code);
        const room = code.length === CODE_LENGTH ? this.rooms.get(code) : undefined;
        if (!room) throw new GameError('ROOM_NOT_FOUND', 'Sala não encontrada. Confere o código?');
        const current = this.seats.get(socket.id);
        if (current && current.code !== room.code) this.releaseSocket(socket);
        this.leaveOtherRooms(clientId, room.code);
        const player = room.join(clientId, name);
        this.seat(socket, room, player);
        this.broadcastSoon(room);
        return { code: room.code };
      }),
    );

    socket.on('room:leave', (reply) =>
      this.run(reply, () => {
        const { room, player } = this.context(socket);
        this.removePlayer(room, player.id, 'left', socket.id);
      }),
    );

    socket.on('room:kick', (p, reply) =>
      this.run(reply, () => {
        const { room, player } = this.context(socket);
        room.requireAdmin(player.id);
        const target = typeof p?.playerId === 'string' ? p.playerId : '';
        if (target === player.id || !room.find(target)) throw new GameError('BAD_INPUT', 'Jogador não encontrado.');
        this.removePlayer(room, target, 'kicked');
      }),
    );

    socket.on('room:rounds', (p, reply) => this.act(socket, reply, (room, me) => room.setRounds(me.id, Number(p?.rounds))));
    socket.on('game:start', (reply) => this.act(socket, reply, (room, me) => room.start(me.id)));
    socket.on('game:pick', (p, reply) =>
      this.act(socket, reply, (room, me) => room.pick(me.id, p?.round, String(p?.word ?? ''))),
    );
    socket.on('game:ready', (p, reply) =>
      this.act(socket, reply, (room, me) => room.setReady(me.id, p?.round, p?.ready === true)),
    );
    socket.on('game:mark', (p, reply) =>
      this.act(socket, reply, (room, me) => room.mark(me.id, p?.round, String(p?.playerId ?? ''), p?.on === true)),
    );
    socket.on('game:confirm', (p, reply) => this.act(socket, reply, (room, me) => room.confirm(me.id, p?.round)));
    socket.on('game:next', (p, reply) => this.act(socket, reply, (room, me) => room.next(me.id, p?.round)));
    socket.on('game:skip', (p, reply) => this.act(socket, reply, (room, me) => room.skip(me.id, p?.round)));
    socket.on('game:end', (reply) => this.act(socket, reply, (room, me) => room.end(me.id)));
    socket.on('game:lobby', (reply) => this.act(socket, reply, (room, me) => room.backToLobby(me.id)));

    socket.on('disconnect', () => {
      const seat = this.seats.get(socket.id);
      if (!seat) return;
      this.seats.delete(socket.id);
      const room = this.rooms.get(seat.code);
      if (!room) return;
      room.detach(socket.id);
      this.broadcast(room);
    });
  }

  /** Executa uma ação e responde ao cliente com `{ ok: true }` ou com o erro. */
  private run<T extends object>(reply: unknown, fn: () => T | void): void {
    const respond = typeof reply === 'function' ? (reply as (r: Ack<T>) => void) : () => {};
    try {
      const out = fn();
      respond({ ok: true, ...(out ?? {}) } as Ack<T>);
    } catch (err) {
      if (err instanceof GameError) {
        respond({ ok: false, error: err.code, message: err.message });
      } else {
        console.error('[medium] erro inesperado:', err);
        respond({ ok: false, error: 'INTERNAL', message: 'Algo deu errado. Tente de novo.' });
      }
    }
  }

  private act(socket: Sock, reply: unknown, fn: (room: Room, me: Player) => void): void {
    this.run(reply, () => {
      const { room, player } = this.context(socket);
      fn(room, player);
      this.broadcast(room);
    });
  }

  private context(socket: Sock): { room: Room; player: Player } {
    const seat = this.seats.get(socket.id);
    const room = seat ? this.rooms.get(seat.code) : undefined;
    const player = room?.find(seat?.playerId);
    if (!room || !player) throw new GameError('NOT_IN_ROOM', 'Você não está numa sala.');
    return { room, player };
  }

  private identity(p: unknown): { clientId: string; name: string } {
    const obj = (p ?? {}) as { clientId?: unknown; name?: unknown };
    if (typeof obj.clientId !== 'string' || !CLIENT_ID_RE.test(obj.clientId)) {
      throw new GameError('BAD_INPUT', 'Identificação inválida. Recarregue a página.');
    }
    return { clientId: obj.clientId, name: cleanName(obj.name) };
  }

  private createRoom(): Room {
    let code = randomCode();
    while (this.rooms.has(code)) code = randomCode();
    const room: Room = new Room(code, { ...this.deps, onChange: () => this.broadcast(room) });
    this.rooms.set(code, room);
    return room;
  }

  private seat(socket: Sock, room: Room, player: Player): void {
    this.seats.set(socket.id, { code: room.code, playerId: player.id });
    room.attach(player, socket.id);
  }

  /** Desliga este socket da sala em que ele estava (sem tirar o jogador de lá). */
  private releaseSocket(socket: Sock): void {
    const seat = this.seats.get(socket.id);
    if (!seat) return;
    this.seats.delete(socket.id);
    const room = this.rooms.get(seat.code);
    if (!room) return;
    room.detach(socket.id);
    this.broadcast(room);
  }

  /** Cada pessoa fica em uma sala por vez: entrar numa nova tira da anterior. */
  private leaveOtherRooms(clientId: string, exceptCode: string | null): void {
    for (const room of [...this.rooms.values()]) {
      if (room.code === exceptCode) continue;
      const player = room.findByClient(clientId);
      if (player) this.removePlayer(room, player.id, 'left');
    }
  }

  private removePlayer(room: Room, playerId: string, reason: 'left' | 'kicked', exceptSocket?: string): void {
    const player = room.find(playerId);
    if (!player) return;
    const sockets = [...player.sockets];
    room.leave(playerId);
    for (const sid of sockets) {
      this.seats.delete(sid);
      if (sid !== exceptSocket) this.io.to(sid).emit('room:closed', { reason });
    }
    if (room.players.length === 0) this.deleteRoom(room);
    else this.broadcast(room);
  }

  private deleteRoom(room: Room): void {
    room.dispose();
    this.rooms.delete(room.code);
    for (const [sid, seat] of this.seats) if (seat.code === room.code) this.seats.delete(sid);
  }

  /** Depois da resposta ao pedido: o celular recebe o código antes do primeiro estado. */
  private broadcastSoon(room: Room): void {
    queueMicrotask(() => {
      if (this.rooms.get(room.code) === room) this.broadcast(room);
    });
  }

  broadcast(room: Room): void {
    for (const p of room.players) {
      if (p.sockets.size === 0) continue;
      const view = room.viewFor(p.id);
      for (const sid of p.sockets) this.io.to(sid).emit('room:state', view);
    }
  }

  private gc(): void {
    const now = Date.now();
    for (const room of [...this.rooms.values()]) {
      const anyoneHere = room.players.some((p) => p.sockets.size > 0);
      if (!anyoneHere && now - room.lastActivity > IDLE_ROOM_MS) this.deleteRoom(room);
    }
  }
}
