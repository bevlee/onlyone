import { Room, Rooms, RoomPlayer, Settings, GameState, GamePhaseType } from '@onlyone/shared';

export class RoomManager {
  private rooms: Rooms = {};

  createRoom(roomName: string): Room {
    if (this.rooms[roomName]) {
      throw new Error(`Room ${roomName} already exists`);
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
          minPlayersToStart: 2
        }
      }
    };

    this.rooms[roomName] = {
      roomName,
      status: 'waiting',
      players: [],
      spectators: [],
      settings: defaultSettings,
      gameState: defaultGameState,
      roomLeader: null
    };

    return this.rooms[roomName];
  }

  joinRoom(roomName: string, player: RoomPlayer): Room {
    const room = this.getRoom(roomName);

    if (room.players.length >= room.settings.maxPlayers) {
      throw new Error('Room is full');
    }

    if (room.players.find(p => p.id === player.id)) {
      throw new Error('Player already in room');
    }

    if (room.players.length == 0 && !room.roomLeader) {
      room.roomLeader = player.id;
    }

    room.players.push(player);
    return room;
  }

  removePlayerFromRoom(roomName: string, playerId: string): boolean {
    const room = this.rooms[roomName];
    if (!room) return false;

    const playerIndex = room.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) return false;

    room.players.splice(playerIndex, 1);

    if (room.players.length === 0) {
      // No players left, delete the room
      delete this.rooms[roomName];
    } else if (room.roomLeader === playerId) {
      // Current leader left, make first remaining player the new leader
      room.roomLeader = room.players[0].id;
    }

    return true;
  }

  getRoom(roomName: string): Room {
    const room = this.rooms[roomName];
    if (!room) {
      throw new Error(`Room ${roomName} not found`);
    }
    return room;
  }

  getActiveRooms(): Room[] {
    return Object.values(this.rooms);
  }

  deleteRoom(roomName: string): boolean {
    if (!this.rooms[roomName]) {
      return false;
    }
    delete this.rooms[roomName];
    return true;
  }

  getRoomDetails(roomName: string): Room {
    return this.getRoom(roomName);
  }

  // Room leader management methods
  getRoomLeader(roomName: string): string | null {
    const room = this.getRoom(roomName);
    return room.roomLeader;
  }

  isRoomLeader(roomName: string, playerId: string): boolean {
    const room = this.getRoom(roomName);
    return room.roomLeader === playerId;
  }

  transferLeadership(roomName: string, currentLeaderId: string, newLeaderId: string): boolean {
    const room = this.getRoom(roomName);

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

  updateRoomSettings(roomName: string, playerId: string, newSettings: Partial<Settings>): boolean {
    const room = this.getRoom(roomName);

    // Only room leader can update settings
    if (!this.isRoomLeader(roomName, playerId)) {
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

  updatePlayerSocket(roomName: string, playerId: string, socketId: string): boolean {
    const room = this.rooms[roomName];
    if (!room) return false;

    const player = room.players.find(p => p.id === playerId);
    if (!player) return false;

    player.socketId = socketId;
    return true;
  }
}