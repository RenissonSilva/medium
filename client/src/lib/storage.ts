// Guarda nome, sala atual e a identidade do jogador neste navegador.
// Em desenvolvimento cada aba é um jogador diferente (sessionStorage), para testar
// vários jogadores no mesmo computador. Em produção a identidade sobrevive a fechar a aba.

const PREFIX = 'medium:';
const memory = new Map<string, string>();

const backend: Storage | null = (() => {
  try {
    const s = import.meta.env.DEV ? window.sessionStorage : window.localStorage;
    s.setItem(PREFIX + 'probe', '1');
    s.removeItem(PREFIX + 'probe');
    return s;
  } catch {
    return null;
  }
})();

export const storage = {
  get(key: string): string | null {
    try {
      return backend?.getItem(PREFIX + key) ?? memory.get(key) ?? null;
    } catch {
      return memory.get(key) ?? null;
    }
  },
  set(key: string, value: string): void {
    memory.set(key, value);
    try {
      backend?.setItem(PREFIX + key, value);
    } catch {
      /* armazenamento cheio ou bloqueado: fica só na memória */
    }
  },
  remove(key: string): void {
    memory.delete(key);
    try {
      backend?.removeItem(PREFIX + key);
    } catch {
      /* ignora */
    }
  },
};

function randomId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(36).padStart(2, '0')).join('').slice(0, 24);
}

/** Identidade secreta deste navegador; permite voltar para o mesmo lugar na sala. */
export function getClientId(): string {
  let id = storage.get('clientId');
  if (!id || !/^[A-Za-z0-9_-]{8,64}$/.test(id)) {
    id = randomId();
    storage.set('clientId', id);
  }
  return id;
}
