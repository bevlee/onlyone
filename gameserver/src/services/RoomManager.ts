import { Room, Rooms, RoomPlayer, Settings, GameState, GamePhaseType } from '@shared/Room.js';

export class RoomManager {
  private rooms: Rooms = {};

  createRoom(roomId: string, settings?: Partial<Settings>): Room {
    if (this.rooms[roomId]) {
      throw new Error(`Room ${roomId} already exists`);
    }

    const defaultSettings: Settings = {
      maxPlayers: 12,
      timeLimit: 30
    };

    const defaultGameState: GameState = {
      gamesWon: 0,
      gamesPlayed: 0,
      gamePhase: {
        phase: GamePhaseType.Lobby,
        state: {
          minPlayersToStart: 3
        }
      }
    };

    this.rooms[roomId] = {
      players: [],
      spectators: [],
      settings: { ...defaultSettings, ...settings },
      gameState: defaultGameState
    };

    return this.rooms[roomId];
  }

  joinRoom(roomId: string, player: RoomPlayer): Room {
    const room = this.getRoom(roomId);

    if (room.players.length >= room.settings.maxPlayers) {
      throw new Error('Room is full');
    }

    if (room.players.find(p => p.id === player.id)) {
      throw new Error('Player already in room');
    }

    // Check for name conflicts in the room
    if (room.players.find(p => p.name === player.name)) {
      throw new Error('Player name already taken in this room');
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

  getActiveRooms(): { roomId: string; playerCount: number; spectatorCount: number; phase: string }[] {
    return Object.entries(this.rooms).map(([roomId, room]) => ({
      roomId,
      playerCount: room.players.length,
      spectatorCount: room.spectators.length,
      phase: room.gameState.gamePhase.phase
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