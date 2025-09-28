import { Room, Rooms, RoomPlayer, Settings, GameState, GamePhaseType } from '@shared/Room.js';

export class RoomManager {
  private rooms: Rooms = {};

  createRoom(roomId: string, creatorPlayer: RoomPlayer, settings?: Partial<Settings>): Room {
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
      players: [creatorPlayer],
      spectators: [],
      settings: { ...defaultSettings, ...settings },
      gameState: defaultGameState,
      roomLeader: creatorPlayer.id
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
      // No players left, delete the room
      delete this.rooms[roomId];
    } else if (room.roomLeader === playerId) {
      // Current leader left, make first remaining player the new leader
      room.roomLeader = room.players[0].id;
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

  // Room leader management methods
  getRoomLeader(roomId: string): string {
    const room = this.getRoom(roomId);
    return room.roomLeader;
  }

  isRoomLeader(roomId: string, playerId: string): boolean {
    const room = this.getRoom(roomId);
    return room.roomLeader === playerId;
  }

  transferLeadership(roomId: string, currentLeaderId: string, newLeaderId: string): boolean {
    const room = this.getRoom(roomId);

    // Only current leader can transfer leadership
    if (room.roomLeader !== currentLeaderId) {
      return false;
    }

    // New leader must be in the room
    const newLeader = room.players.find(p => p.id === newLeaderId);
    if (!newLeader) {
      return false;
    }

    // Move new leader to first position and update roomLeader
    const newLeaderIndex = room.players.findIndex(p => p.id === newLeaderId);
    room.players.splice(newLeaderIndex, 1);
    room.players.unshift(newLeader);
    room.roomLeader = newLeaderId;

    return true;
  }

  updateRoomSettings(roomId: string, playerId: string, newSettings: Partial<Settings>): boolean {
    const room = this.getRoom(roomId);

    // Only room leader can update settings
    if (!this.isRoomLeader(roomId, playerId)) {
      return false;
    }

    // Basic validation
    if (newSettings.maxPlayers && (newSettings.maxPlayers < 2 || newSettings.maxPlayers > 12)) {
      return false;
    }

    if (newSettings.timeLimit && (newSettings.timeLimit < 10 || newSettings.timeLimit > 300)) {
      return false;
    }

    // Update settings
    room.settings = { ...room.settings, ...newSettings };
    return true;
  }
}