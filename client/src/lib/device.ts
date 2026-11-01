export function vibrate(pattern: number | number[]): void {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* iPhone não vibra pelo navegador */
  }
}

// Mantém a tela acesa durante a partida (celular apagando derruba a conexão).
let lock: WakeLockSentinel | null = null;
let wanted = false;

async function requestLock(): Promise<void> {
  if (!wanted || lock || document.visibilityState !== 'visible' || !('wakeLock' in navigator)) return;
  try {
    lock = await navigator.wakeLock.request('screen');
    lock.addEventListener('release', () => {
      lock = null;
    });
  } catch {
    lock = null;
  }
}

export function keepAwake(on: boolean): void {
  wanted = on;
  if (on) void requestLock();
  else {
    void lock?.release().catch(() => {});
    lock = null;
  }
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') void requestLock();
});
