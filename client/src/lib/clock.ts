import type { GameSocket } from './socket';

// Diferença entre o relógio do servidor e o deste celular, para a contagem
// "3, 2, 1, FALEM!" acontecer no mesmo instante em todos os aparelhos.
let offset = 0;

export const serverNow = (): number => Date.now() + offset;

export async function syncClock(socket: GameSocket): Promise<void> {
  let bestRtt = Infinity;
  for (let i = 0; i < 5; i++) {
    const t0 = Date.now();
    try {
      const ts = await socket.timeout(3000).emitWithAck('time:ping');
      const t1 = Date.now();
      if (t1 - t0 < bestRtt) {
        bestRtt = t1 - t0;
        offset = ts - (t0 + t1) / 2;
      }
    } catch {
      return;
    }
  }
}
