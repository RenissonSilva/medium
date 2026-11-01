import { createServer, type Server as HttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { Server } from 'socket.io';
import { io as connect, type Socket } from 'socket.io-client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { RoomManager } from '../server/rooms';
import type { Ack, ClientToServerEvents, RoomView, ServerToClientEvents } from '../shared/types';

type Client = Socket<ServerToClientEvents, ClientToServerEvents>;

let http: HttpServer;
let io: Server<ClientToServerEvents, ServerToClientEvents>;
let manager: RoomManager;
let url = '';
const sockets: Client[] = [];

beforeAll(async () => {
  http = createServer();
  io = new Server(http);
  manager = new RoomManager(io, { timing: { leadMs: 20, stepMs: 20, goMs: 20 } });
  manager.attach();
  await new Promise<void>((resolve) => http.listen(0, '127.0.0.1', resolve));
  url = `http://127.0.0.1:${(http.address() as AddressInfo).port}`;
});

afterAll(async () => {
  for (const s of sockets) s.disconnect();
  manager.close();
  io.close();
  await new Promise<void>((resolve) => http.close(() => resolve()));
});

/** Um "celular": socket + a última visão recebida do servidor. */
function phone() {
  const socket: Client = connect(url, { transports: ['websocket'], forceNew: true });
  sockets.push(socket);
  const p = {
    socket,
    view: null as RoomView | null,
    waitFor(pred: (v: RoomView) => boolean, timeout = 2000): Promise<RoomView> {
      if (p.view && pred(p.view)) return Promise.resolve(p.view);
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          socket.off('room:state', onState);
          reject(new Error('timeout esperando estado'));
        }, timeout);
        const onState = (v: RoomView) => {
          if (!pred(v)) return;
          clearTimeout(timer);
          socket.off('room:state', onState);
          resolve(v);
        };
        socket.on('room:state', onState);
      });
    },
  };
  socket.on('room:state', (v) => {
    p.view = v;
  });
  return p;
}

const send = <T extends object = object>(socket: Client, event: string, ...args: unknown[]): Promise<Ack<T>> =>
  (socket.timeout(2000) as unknown as { emitWithAck: (e: string, ...a: unknown[]) => Promise<Ack<T>> }).emitWithAck(event, ...args);

describe('partida pela rede', () => {
  it('três celulares jogam uma rodada inteira', async () => {
    const rafa = phone();
    const bia = phone();
    const caio = phone();

    const created = await send<{ code: string }>(rafa.socket, 'room:create', { name: 'Rafa', clientId: 'rafa-client-01' });
    expect(created.ok).toBe(true);
    const code = (created as { code: string }).code;
    expect(code).toMatch(/^[A-Z0-9]{4}$/);

    expect((await send(bia.socket, 'room:join', { code: code.toLowerCase(), name: 'Bia', clientId: 'bia-client-001' })).ok).toBe(true);
    expect((await send(caio.socket, 'room:join', { code, name: 'Caio', clientId: 'caio-client-01' })).ok).toBe(true);
    const lobby = await rafa.waitFor((v) => v.players.length === 3);
    expect(lobby.status).toBe('lobby');

    // Só o anfitrião inicia.
    const denied = await send(bia.socket, 'game:start');
    expect(denied.ok).toBe(false);
    expect((await send(rafa.socket, 'game:start')).ok).toBe(true);

    const r1 = await rafa.waitFor((v) => v.game?.phase === 'choosing');
    const biaView = await bia.waitFor((v) => v.game?.phase === 'choosing');
    const caioView = await caio.waitFor((v) => v.game?.phase === 'choosing');
    expect(r1.hand).toHaveLength(5);
    expect(biaView.game!.chooserId).toBeNull();
    // Bia não enxerga as palavras do Rafa.
    for (const card of r1.hand) expect(JSON.stringify(biaView)).not.toContain(`"${card.word}"`);

    // Qualquer um pode jogar: Bia e Caio confirmam quase juntos, só um leva.
    const [pb, pc] = await Promise.all([
      send(bia.socket, 'game:pick', { round: 1, word: biaView.hand[1].word }),
      send(caio.socket, 'game:pick', { round: 1, word: caioView.hand[1].word }),
    ]);
    expect([pb.ok, pc.ok].sort()).toEqual([false, true]);
    const [chooser, chooserView] = pb.ok ? [bia, biaView] : [caio, caioView];
    const played = chooserView.hand[1].word;
    const thinking = await rafa.waitFor((v) => v.game?.phase === 'thinking' && v.game.playedWord === played);
    expect(thinking.game!.chooserId).toBe(chooserView.youId);

    for (const p of [rafa, bia, caio]) expect((await send(p.socket, 'game:ready', { round: 1, ready: true })).ok).toBe(true);
    const countdown = await bia.waitFor((v) => v.game?.phase === 'countdown');
    expect(countdown.game!.countdownAt).toBeGreaterThan(0);

    // A contagem termina sozinha no servidor.
    await caio.waitFor((v) => v.game?.phase === 'scoring');
    const biaId = biaView.youId;
    const caioId = caioView.youId;
    // Quem jogou a palavra não marca: só o anfitrião.
    expect((await send(chooser.socket, 'game:mark', { round: 1, playerId: biaId, on: true })).ok).toBe(false);
    expect((await send(rafa.socket, 'game:mark', { round: 1, playerId: biaId, on: true })).ok).toBe(true);
    expect((await send(rafa.socket, 'game:mark', { round: 1, playerId: caioId, on: true })).ok).toBe(true);
    await bia.waitFor((v) => v.game?.markedIds.length === 2);
    expect((await send(rafa.socket, 'game:confirm', { round: 1 })).ok).toBe(true);

    const result = await rafa.waitFor((v) => v.game?.phase === 'result');
    expect(result.players.map((p) => p.score)).toEqual([0, 1, 1]);
    const after = await chooser.waitFor((v) => v.game?.phase === 'result');
    expect(after.hand).toHaveLength(5);
    expect(after.hand.map((c) => c.word)).not.toContain(played);

    // Os dois apertam "próxima rodada" quase juntos: só uma rodada avança.
    const [a, b] = await Promise.all([
      send(bia.socket, 'game:next', { round: 1 }),
      send(caio.socket, 'game:next', { round: 1 }),
    ]);
    expect([a.ok, b.ok].sort()).toEqual([false, true]);
    const r2 = await rafa.waitFor((v) => v.game?.round === 2);
    expect(r2.game!.phase).toBe('choosing');
    expect(r2.game!.chooserId).toBeNull();
  });

  it('volta para o mesmo lugar depois de cair', async () => {
    const host = phone();
    const guest = phone();
    const created = await send<{ code: string }>(host.socket, 'room:create', { name: 'Ana', clientId: 'ana-client-001' });
    const code = (created as { code: string }).code;
    await send(guest.socket, 'room:join', { code, name: 'Leo', clientId: 'leo-client-001' });
    const before = await host.waitFor((v) => v.players.length === 2);
    const leoId = before.players[1].id;

    guest.socket.disconnect();
    await host.waitFor((v) => v.players[1].connected === false);

    const again = phone();
    expect((await send(again.socket, 'room:join', { code, name: 'Leo', clientId: 'leo-client-001' })).ok).toBe(true);
    const after = await host.waitFor((v) => v.players[1].connected === true);
    expect(after.players).toHaveLength(2);
    expect(after.players[1].id).toBe(leoId);
  });

  it('código errado avisa que a sala não existe', async () => {
    const p = phone();
    const res = await send(p.socket, 'room:join', { code: 'ZZZZ', name: 'Tom', clientId: 'tom-client-001' });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe('ROOM_NOT_FOUND');
  });

  it('remover jogador avisa o celular dele', async () => {
    const host = phone();
    const guest = phone();
    const created = await send<{ code: string }>(host.socket, 'room:create', { name: 'Mia', clientId: 'mia-client-001' });
    const code = (created as { code: string }).code;
    await send(guest.socket, 'room:join', { code, name: 'Teo', clientId: 'teo-client-001' });
    const view = await host.waitFor((v) => v.players.length === 2);
    const closed = new Promise((resolve) => guest.socket.once('room:closed', resolve));
    expect((await send(host.socket, 'room:kick', { playerId: view.players[1].id })).ok).toBe(true);
    await expect(closed).resolves.toEqual({ reason: 'kicked' });
    await host.waitFor((v) => v.players.length === 1);
  });
});
