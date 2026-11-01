import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '../../../shared/types';

export type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export const socket: GameSocket = io({
  reconnectionDelay: 400,
  reconnectionDelayMax: 3000,
});
