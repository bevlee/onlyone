import { Room, Rooms, Player, Settings, GameState } from '../models/Room.js';

export class RoomManager {
  private rooms: Rooms = {};

  createRoom(roomId: string, settings?: Partial<Settings>): Room {
    if (this.rooms[roomId]) {
      throw new Error(`Room ${roomId} already exists`);
    }

    const defaultSettings: Settings = {
      maxPlayers: 6,
      difficulty: 'medium',
      timeLimit: 60
    };

    const defaultGameState: GameState = {
      status: 'waiting',
      currentRound: 0,
      clues: [],
      guesses: []
    };

    this.rooms[roomId] = {
      players: [],
      settings: { ...defaultSettings, ...settings },
      gameState: defaultGameState
    };

    return this.rooms[roomId];
  }

  joinRoom(roomId: string, player: Player): Room {
    const room = this.getRoom(roomId);

    if (room.players.length >= room.settings.maxPlayers) {
      throw new Error('Room is full');
    }

    if (room.players.find(p => p.id === player.id)) {
      throw new Error('Player already in room');
    }

    room.players.push(player);
    return room;
  }

  leaveRoom(roomId: string, playerId: string): boolean {
    const room = this.rooms[roomId];
    if (!room) return false;

    const playerIndex = room.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) return false;

    room.players.splice(playerIndex, 1);

    if (room.players.length === 0) {
      delete this.rooms[roomId];
    }

    return true;
  }

  getRoom(roomId: string): Room {
    const room = this.rooms[roomId];
    if (!room) {
      throw new Error(`Room ${roomId} not found`);
    }
    return room;
  }

  getActiveRooms(): { roomId: string; playerCount: number; status: string }[] {
    return Object.entries(this.rooms).map(([roomId, room]) => ({
      roomId,
      playerCount: room.players.length,
      status: room.gameState.status
    }));
  }

  deleteRoom(roomId: string): boolean {
    if (!this.rooms[roomId]) {
      return false;
    }
    delete this.rooms[roomId];
    return true;
  }

  getRoomDetails(roomId: string): Room {
    return this.getRoom(roomId);
  }
}