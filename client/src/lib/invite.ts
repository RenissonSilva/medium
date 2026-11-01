import { useEffect, useState } from 'react';

interface ServerConfig {
  publicUrl: string | null;
  lanUrls: string[];
}

let configPromise: Promise<ServerConfig> | null = null;

function loadConfig(): Promise<ServerConfig> {
  configPromise ??= fetch('/api/config')
    .then((r) => (r.ok ? (r.json() as Promise<ServerConfig>) : { publicUrl: null, lanUrls: [] }))
    .catch(() => ({ publicUrl: null, lanUrls: [] }));
  return configPromise;
}

const LOCALHOST = /^(localhost|127(\.\d+){3}|\[::1\]|0\.0\.0\.0)$/;

/**
 * Endereço que vai no QR code. Se o anfitrião abriu em "localhost", troca pelo IP
 * da rede local para os celulares conseguirem abrir.
 */
async function inviteBase(): Promise<string> {
  const cfg = await loadConfig();
  if (cfg.publicUrl) return cfg.publicUrl;
  if (LOCALHOST.test(location.hostname) && cfg.lanUrls[0]) return cfg.lanUrls[0];
  return location.origin;
}

export function useInviteUrl(code: string): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    void inviteBase().then((base) => {
      if (alive) setUrl(`${base}/${code}`);
    });
    return () => {
      alive = false;
    };
  }, [code]);
  return url;
}

export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* tenta o jeito antigo */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '0';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

/** Abre o "compartilhar" do celular; sem ele (ou fora do https), copia o link. */
export async function shareInvite(code: string, url: string): Promise<'shared' | 'copied' | 'failed'> {
  if (navigator.share) {
    try {
      await navigator.share({ title: 'Medium', text: `Bora jogar Medium? Sala ${code}`, url });
      return 'shared';
    } catch (err) {
      if ((err as DOMException)?.name === 'AbortError') return 'shared';
    }
  }
  return (await copyText(url)) ? 'copied' : 'failed';
}
