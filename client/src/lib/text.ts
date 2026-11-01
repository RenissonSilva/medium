import type { PlayerView } from '../../../shared/types';

export const upper = (s: string): string => s.toLocaleUpperCase('pt-BR');

export const initialOf = (name: string): string => upper(Array.from(name.trim())[0] ?? '?');

/** No seu celular você aparece como "Você" (com a inicial V), como no layout. */
export const nameOf = (p: PlayerView | undefined, youId: string): string =>
  !p ? 'Alguém' : p.id === youId ? 'Você' : p.name;

export function listNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} e ${names[names.length - 1]}`;
}

export const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;

/** Placar ordenado, com empates dividindo a posição (1º, 1º, 3º). */
export function ranking(players: PlayerView[]): { player: PlayerView; rank: number }[] {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  return sorted.map((player) => ({ player, rank: sorted.findIndex((q) => q.score === player.score) + 1 }));
}
