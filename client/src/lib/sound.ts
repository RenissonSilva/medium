import { storage } from './storage';

// Bipes curtinhos feitos na hora (sem arquivos de áudio).
let ctx: AudioContext | null = null;
let muted = storage.get('muted') === '1';

/** Navegadores só liberam áudio depois de um toque na tela. */
export function unlockAudio(): void {
  try {
    if (!ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    ctx = null;
  }
}

function beep(freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.16, delay = 0): void {
  if (muted || !ctx || ctx.state !== 'running') return;
  const t = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(volume, t + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + duration + 0.03);
}

export const sound = {
  tick: () => beep(660, 0.12, 'triangle', 0.2),
  go: () => {
    beep(880, 0.16, 'square', 0.1);
    beep(1320, 0.34, 'square', 0.1, 0.12);
  },
  turn: () => {
    beep(523, 0.1, 'sine', 0.18);
    beep(784, 0.18, 'sine', 0.18, 0.1);
  },
  point: () => {
    beep(784, 0.1, 'triangle', 0.18);
    beep(1046, 0.22, 'triangle', 0.18, 0.09);
  },
  isMuted: () => muted,
  setMuted(value: boolean) {
    muted = value;
    storage.set('muted', value ? '1' : '0');
  },
};
