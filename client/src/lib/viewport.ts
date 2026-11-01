import { useSyncExternalStore } from 'react';

// Escala vertical (--vs): o layout foi desenhado para 390×844. Em telas mais baixas
// (iPhone com barras do Safari, por exemplo) cartas, botões e espaços encolhem juntos.
// Só recalcula quando a largura muda (girar o celular) ou a altura muda muito sem
// teclado aberto — assim o layout não pula quando o teclado ou a barra do navegador aparecem.
const FIXED = 262;
const FLEX = 562;

let vs = 1;
let lastW = 0;
let lastH = 0;
const listeners = new Set<() => void>();

function compute(h: number): number {
  return Math.round(Math.max(0.62, Math.min(1, (h - FIXED) / FLEX)) * 1000) / 1000;
}

function apply(force: boolean): void {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const typing = document.activeElement instanceof HTMLInputElement;
  const bigHeightChange = lastH > 0 && Math.abs(h - lastH) / lastH > 0.2;
  if (!force && w === lastW && !(bigHeightChange && !typing)) return;
  lastW = w;
  lastH = h;
  const next = compute(h);
  if (next === vs && !force) return;
  vs = next;
  document.documentElement.style.setProperty('--vs', String(vs));
  listeners.forEach((l) => l());
}

export function initViewport(): void {
  apply(true);
  window.addEventListener('resize', () => apply(false));
  window.addEventListener('orientationchange', () => setTimeout(() => apply(true), 300));
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

export function useVs(): number {
  return useSyncExternalStore(subscribe, () => vs, () => 1);
}
