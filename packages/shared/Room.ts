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
}

export interface Rooms {
  [roomName: string]: Room;
}

export interface Settings {
  maxPlayers: number;
  timeLimit: number;
}

