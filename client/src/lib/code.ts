import { CODE_LENGTH } from '../../../shared/types';

const CODE_RE = new RegExp(`^[A-Za-z0-9]{${CODE_LENGTH}}$`);

export const normalizeCode = (raw: string): string =>
  raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CODE_LENGTH);

/** Código da sala no endereço: /4KQ7 (link do QR code) ou ?sala=4KQ7. */
export function codeFromLocation(pathname: string, search: string): string | null {
  const segment = pathname.replace(/^\/+|\/+$/g, '');
  if (CODE_RE.test(segment)) return segment.toUpperCase();
  const param = new URLSearchParams(search).get('sala')?.trim();
  if (param && CODE_RE.test(param)) return param.toUpperCase();
  return null;
}

/** Aceita o link inteiro lido no QR code ou só o código. */
export function codeFromScan(text: string): string | null {
  const t = text.trim();
  if (CODE_RE.test(t)) return t.toUpperCase();
  try {
    const url = new URL(t);
    return codeFromLocation(url.pathname, url.search);
  } catch {
    return null;
  }
}
