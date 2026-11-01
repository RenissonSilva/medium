import { createHash } from 'node:crypto';
import { PHOTO_MAX_BYTES } from '../shared/types';
import { GameError } from './game';

/** Foto de perfil já validada, guardada na memória junto com o jogador. */
export interface Photo {
  data: Buffer;
  /** Muda quando a foto muda: entra no endereço para o navegador poder guardar em cache. */
  hash: string;
}

const DATA_URL = /^data:image\/jpeg;base64,([A-Za-z0-9+/]+={0,2})$/;
// Base64 ocupa 4 caracteres a cada 3 bytes.
const MAX_DATA_URL = 'data:image/jpeg;base64,'.length + Math.ceil(PHOTO_MAX_BYTES / 3) * 4;

/**
 * Lê a foto enviada pelo celular (JPEG em data URL, já recortado e reduzido no navegador).
 * `undefined` = não mexer na foto atual; `null` = tirar a foto.
 */
export function parsePhoto(raw: unknown): Photo | null | undefined {
  if (raw === undefined) return undefined;
  if (raw === null) return null;
  const invalid = new GameError('BAD_INPUT', 'Não deu para usar essa foto. Tente outra.');
  if (typeof raw !== 'string' || raw.length > MAX_DATA_URL) throw invalid;
  const match = DATA_URL.exec(raw);
  if (!match) throw invalid;
  const data = Buffer.from(match[1], 'base64');
  // Todo JPEG começa com FF D8 FF.
  const isJpeg = data.length > 4 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
  if (!isJpeg || data.length > PHOTO_MAX_BYTES) throw invalid;
  const hash = createHash('sha256').update(data).digest('base64url').slice(0, 16);
  return { data, hash };
}
