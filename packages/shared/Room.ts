import { GameState } from './GameState.js';

export interface RoomPlayer {
  id: string;
  name: string;
  socketId?: string;
}

export interface Room {
  roomName: string;
  status: 'waiting' | 'playing';
  players: RoomPlayer[];
  spectators: RoomPlayer[];
  settings: Settings;
  roomLeader: string | null;
  gameState?: GameState;
}

export interface Rooms {
  [roomName: string]: Room;
}

export interface Settings {
  maxPlayers: number;
  timeLimit: number;
}

