import { describe, expect, it } from 'vitest';
import { GameError, Room } from '../server/game';
import { WORDS } from '../server/words';
import { HAND_SIZE, MAX_PLAYERS, type ErrorCode } from '../shared/types';

const NAMES = ['Rafa', 'Bia', 'Caio', 'Duda', 'Edu', 'Fê', 'Gui', 'Helô', 'Iara'];

function setup(n = 3) {
  let t = 1_000_000;
  const timers: { fn: () => void; at: number; done: boolean }[] = [];
  let changes = 0;
  const room = new Room('TEST', {
    now: () => t,
    schedule: (fn, ms) => {
      const timer = { fn, at: t + ms, done: false };
      timers.push(timer);
      return () => {
        timer.done = true;
      };
    },
    timing: { leadMs: 100, stepMs: 100, goMs: 100 },
    onChange: () => {
      changes++;
    },
  });
  const players = Array.from({ length: n }, (_, i) => {
    const p = room.join(`client-${i}-abcdef`, NAMES[i]);
    room.attach(p, `sock-${i}`);
    return p;
  });
  const advance = (ms: number) => {
    t += ms;
    for (const timer of [...timers]) {
      if (!timer.done && timer.at <= t) {
        timer.done = true;
        timer.fn();
      }
    }
  };
  return { room, players, advance, changes: () => changes };
}

function expectError(fn: () => void, code: ErrorCode) {
  try {
    fn();
  } catch (err) {
    expect(err).toBeInstanceOf(GameError);
    expect((err as GameError).code).toBe(code);
    return;
  }
  throw new Error(`esperava erro ${code}`);
}

/** Joga uma rodada inteira: `chooser` joga a 1ª palavra, todos prontos, contagem, o anfitrião marca `matched`. */
function playRound(ctx: ReturnType<typeof setup>, matched: string[] = [], chooser = ctx.room.connectedPlayers()[0]) {
  const { room, advance } = ctx;
  const g = room.game!;
  const round = g.round;
  const word = chooser.hand[0].word;
  room.pick(chooser.id, round, word);
  for (const p of room.connectedPlayers()) room.setReady(p.id, round, true);
  expect(g.phase).toBe('countdown');
  advance(1000);
  expect(g.phase).toBe('scoring');
  const judge = room.adminId();
  for (const id of matched) room.mark(judge, round, id, true);
  room.confirm(judge, round);
  expect(g.phase).toBe('result');
  return { round, chooser, word };
}

describe('baralho', () => {
  it('tem bastante palavra e nenhuma vazia', () => {
    expect(WORDS.length).toBeGreaterThan(400);
    expect(new Set(WORDS).size).toBe(WORDS.length);
    for (const w of WORDS) {
      expect(w.length).toBeGreaterThan(1);
      expect(w.length).toBeLessThanOrEqual(14);
    }
  });
});

describe('sala', () => {
  it('quem cria vira anfitrião; nomes repetidos ganham número; cores diferentes', () => {
    const { room, players } = setup(3);
    expect(room.hostId).toBe(players[0].id);
    const dup = room.join('client-dup-abcdef', 'bia');
    expect(dup.name).toBe('bia 2');
    expect(new Set(room.players.map((p) => p.color)).size).toBe(4);
  });

  it('voltar com o mesmo clientId devolve o mesmo lugar', () => {
    const { room, players } = setup(2);
    room.detach('sock-1');
    expect(room.isConnected(players[1])).toBe(false);
    const again = room.join('client-1-abcdef', 'Bia');
    expect(again.id).toBe(players[1].id);
    expect(room.players).toHaveLength(2);
  });

  it('exige nome e respeita o limite de jogadores', () => {
    const { room } = setup(MAX_PLAYERS);
    expectError(() => room.join('client-x-abcdef', '   '), 'NAME_REQUIRED');
    expectError(() => room.join('client-y-abcdef', 'Zeca'), 'ROOM_FULL');
  });

  it('só o anfitrião inicia, e com pelo menos 2 pessoas', () => {
    const solo = setup(1);
    expectError(() => solo.room.start(solo.players[0].id), 'NOT_ENOUGH_PLAYERS');
    const { room, players } = setup(3);
    expectError(() => room.start(players[1].id), 'NOT_ALLOWED');
    room.start(players[0].id);
    expect(room.status).toBe('playing');
  });

  it('se o anfitrião cair, o próximo conectado pode administrar', () => {
    const { room, players } = setup(3);
    room.detach('sock-0');
    expect(room.adminId()).toBe(players[1].id);
    room.start(players[1].id);
    expect(room.status).toBe('playing');
  });
});

describe('partida', () => {
  it('distribui 5 palavras diferentes para cada um e tira uma do baralho', () => {
    const { room, players } = setup(3);
    room.start(players[0].id);
    const g = room.game!;
    const all = players.flatMap((p) => p.hand.map((c) => c.word));
    expect(all).toHaveLength(3 * HAND_SIZE);
    expect(new Set([...all, g.deckWord]).size).toBe(all.length + 1);
    expect(g.round).toBe(1);
    expect(g.phase).toBe('choosing');
    expect(g.chooserId).toBeNull();
  });

  it('qualquer um joga uma palavra da própria mão, e vale a primeira', () => {
    const { room, players } = setup(3);
    room.start(players[0].id);
    const g = room.game!;
    expectError(() => room.pick(players[0].id, 1, players[1].hand[0].word), 'BAD_INPUT');
    const word = players[1].hand[2].word;
    room.pick(players[1].id, 1, word);
    expect(g.playedWord).toBe(word);
    expect(g.chooserId).toBe(players[1].id);
    expect(g.phase).toBe('thinking');
    expect(players[1].hand.map((c) => c.word)).not.toContain(word);
    expect(players[1].hand).toHaveLength(HAND_SIZE - 1);
    // Quem confirmou depois chega tarde: a mão continua igual.
    expectError(() => room.pick(players[0].id, 1, players[0].hand[0].word), 'BAD_STATE');
    expect(players[0].hand).toHaveLength(HAND_SIZE);
  });

  it('a contagem começa quando todos estão prontos e vira marcação sozinha', () => {
    const ctx = setup(3);
    const { room, players, advance } = ctx;
    room.start(players[0].id);
    const g = room.game!;
    room.pick(players[0].id, 1, players[0].hand[0].word);
    room.setReady(players[0].id, 1, true);
    room.setReady(players[1].id, 1, true);
    expect(g.phase).toBe('thinking');
    room.setReady(players[1].id, 1, false);
    room.setReady(players[2].id, 1, true);
    expect(g.phase).toBe('thinking');
    room.setReady(players[1].id, 1, true);
    expect(g.phase).toBe('countdown');
    expect(g.countdownAt).toBe(1_000_000 + 100);
    // folga (100) + 3, 2, 1 (3 × 100) + FALEM! (100)
    advance(499);
    expect(g.phase).toBe('countdown');
    advance(1);
    expect(g.phase).toBe('scoring');
    expect(ctx.changes()).toBe(1);
  });

  it('quem caiu não trava a contagem', () => {
    const { room, players } = setup(3);
    room.start(players[0].id);
    const g = room.game!;
    room.pick(players[0].id, 1, players[0].hand[0].word);
    room.setReady(players[0].id, 1, true);
    room.setReady(players[1].id, 1, true);
    room.detach('sock-2');
    expect(g.phase).toBe('countdown');
  });

  it('marca pontos, repõe a palavra de quem jogou e abre a próxima rodada para todos', () => {
    const ctx = setup(3);
    const { room, players } = ctx;
    room.start(players[0].id);
    const before = players[2].hand.map((c) => c.word);
    const { word } = playRound(ctx, [players[0].id, players[1].id], players[2]);
    expect(players.map((p) => p.score)).toEqual([1, 1, 0]);
    expect(players[2].hand).toHaveLength(HAND_SIZE);
    expect(players[2].hand.map((c) => c.word)).not.toContain(word);
    expect(players[2].hand.filter((c) => !before.includes(c.word))).toHaveLength(1);
    expect(room.game!.lastResult!.chooserId).toBe(players[2].id);
    room.next(players[1].id, 1);
    expect(room.game!.round).toBe(2);
    expect(room.game!.phase).toBe('choosing');
    expect(room.game!.chooserId).toBeNull();
  });

  it('só o anfitrião marca os pontos, mesmo quando outra pessoa jogou a palavra', () => {
    const ctx = setup(3);
    const { room, players, advance } = ctx;
    room.start(players[0].id);
    room.pick(players[1].id, 1, players[1].hand[0].word);
    for (const p of players) room.setReady(p.id, 1, true);
    advance(1000);
    expectError(() => room.mark(players[1].id, 1, players[1].id, true), 'NOT_ALLOWED');
    expectError(() => room.confirm(players[1].id, 1), 'NOT_ALLOWED');
    room.mark(players[0].id, 1, players[2].id, true);
    // Se o anfitrião cair, o próximo conectado assume.
    room.detach('sock-0');
    expect(room.adminId()).toBe(players[1].id);
    room.mark(players[1].id, 1, players[1].id, true);
    room.confirm(players[1].id, 1);
    expect(players.map((p) => p.score)).toEqual([0, 1, 1]);
  });

  it('dois toques em "próxima rodada" não pulam uma rodada', () => {
    const ctx = setup(3);
    const { room, players } = ctx;
    room.start(players[0].id);
    playRound(ctx);
    room.next(players[1].id, 1);
    expectError(() => room.next(players[2].id, 1), 'BAD_STATE');
    expect(room.game!.round).toBe(2);
  });

  it('nenhuma palavra se repete durante a partida inteira', () => {
    const ctx = setup(4);
    const { room, players } = ctx;
    room.rounds = 20;
    room.start(players[0].id);
    const seen = new Set<string>(players.flatMap((p) => p.hand.map((c) => c.word)));
    const g = room.game!;
    seen.add(g.deckWord);
    let finished = false;
    for (let r = 1; r <= 20; r++) {
      const chooser = players[r % 4];
      const before = chooser.hand.map((c) => c.word);
      const { round } = playRound(ctx, [players[(r + 1) % 4].id], chooser);
      for (const c of chooser.hand) {
        if (before.includes(c.word)) continue;
        expect(seen.has(c.word)).toBe(false);
        seen.add(c.word);
      }
      room.next(players[0].id, round);
      if (room.status === 'finished') {
        finished = true;
        break;
      }
      expect(seen.has(g.deckWord)).toBe(false);
      seen.add(g.deckWord);
    }
    expect(finished).toBe(true);
    expect(g.round).toBe(20);
    expect(players.reduce((sum, p) => sum + p.score, 0)).toBe(20);
  });

  it('acaba depois do número de rodadas escolhido', () => {
    const ctx = setup(2);
    const { room, players } = ctx;
    room.setRounds(players[0].id, 5);
    expectError(() => room.setRounds(players[0].id, 7), 'BAD_INPUT');
    room.start(players[0].id);
    for (let r = 1; r <= 5; r++) {
      const { round, chooser } = playRound(ctx);
      // Na última rodada ninguém recebe palavra nova.
      expect(chooser.hand).toHaveLength(r === 5 ? HAND_SIZE - 1 : HAND_SIZE);
      room.next(players[1].id, round);
    }
    expect(room.status).toBe('finished');
    room.backToLobby(players[0].id);
    expect(room.status).toBe('lobby');
    expect(room.game).toBeNull();
  });

  it('anfitrião saindo passa o posto; quem jogou saindo não trava a rodada', () => {
    const { room, players, advance } = setup(3);
    room.start(players[0].id);
    room.pick(players[2].id, 1, players[2].hand[0].word);
    room.leave(players[0].id);
    expect(room.hostId).toBe(players[1].id);
    room.leave(players[2].id);
    room.setReady(players[1].id, 1, true);
    advance(1000);
    room.confirm(players[1].id, 1);
    expect(room.game!.phase).toBe('result');
  });

  it('quem entra no meio recebe mão e já pode jogar', () => {
    const { room, players } = setup(2);
    room.start(players[0].id);
    const late = room.join('client-late-abcdef', 'Duda');
    room.attach(late, 'sock-late');
    expect(late.hand).toHaveLength(HAND_SIZE);
    room.pick(late.id, 1, late.hand[0].word);
    expect(room.game!.chooserId).toBe(late.id);
  });

  it('a visão de cada um não mostra a mão dos outros', () => {
    const { room, players } = setup(3);
    room.start(players[0].id);
    const view = JSON.stringify(room.viewFor(players[1].id));
    for (const card of players[0].hand) expect(view).not.toContain(`"${card.word}"`);
    for (const card of players[1].hand) expect(view).toContain(`"${card.word}"`);
    expect(view).not.toContain('client-');
  });
});
