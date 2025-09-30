export interface Player {
  id: string;
  name: string;
  isOwner: boolean;
}

export interface RoomSettings {
  timeLimit: number;
}

export interface GameState {
  status: 'playing' | 'paused' | 'finished';
  startedAt: string;
  currentPhase: string;
  timeRemaining: number;
}

export class Room {
  public readonly roomName: string;
  public name: string;
  public status: 'waiting' | 'playing' | 'finished';
  public players: Player[];
  public readonly maxPlayers: number;
  public gameState: GameState | null;
  public settings: RoomSettings;
  public readonly createdAt: Date;
  public roomLeader: string;

  constructor(
    roomName: string,
    name: string,
    creatorPlayer: Player,
    maxPlayers: number = 12,
    settings: RoomSettings = {
      timeLimit: 30
    },
    createdAt: Date = new Date()
  ) {
    this.roomName = roomName;
    this.name = name;
    this.status = 'waiting';
    this.players = [creatorPlayer];
    this.maxPlayers = maxPlayers;
    this.gameState = null;
    this.settings = settings;
    this.createdAt = createdAt;
    this.roomLeader = creatorPlayer.id;
  }

  addPlayer(player: Player): boolean {
    if (this.players.length >= this.maxPlayers) {
      return false;
    }

    if (this.players.some(p => p.id === player.id)) {
      return false; // Player already in room
    }

    this.players.push(player);
    return true;
  }

  removePlayer(playerId: string): boolean {
    const initialLength = this.players.length;
    this.players = this.players.filter(p => p.id !== playerId);

    // If the owner left, assign ownership to the next player
    if (this.players.length > 0 && !this.players.some(p => p.isOwner)) {
      this.players[0].isOwner = true;
    }

    // If the room leader left, make the first remaining player the new leader
    if (this.roomLeader === playerId && this.players.length > 0) {
      this.roomLeader = this.players[0].id;
    }

    return this.players.length < initialLength;
  }


  getOwner(): Player | undefined {
    return this.players.find(p => p.isOwner);
  }

  isOwner(playerId: string): boolean {
    return this.players.some(p => p.id === playerId && p.isOwner);
  }

  transferOwnership(newOwnerId: string): boolean {
    const currentOwner = this.getOwner();
    const newOwner = this.players.find(p => p.id === newOwnerId);

    if (newOwner) {
      if (currentOwner) currentOwner.isOwner = false;
      newOwner.isOwner = true;
      return true;
    }
    return false;
  }

  transferLeadership(newLeaderId: string): boolean {
    const newLeader = this.players.find(p => p.id === newLeaderId);
    if (!newLeader) {
      return false;
    }

    // Move new leader to first position
    const newLeaderIndex = this.players.findIndex(p => p.id === newLeaderId);
    this.players.splice(newLeaderIndex, 1);
    this.players.unshift(newLeader);
    this.roomLeader = newLeaderId;

    return true;
  }

  isRoomLeader(playerId: string): boolean {
    return this.roomLeader === playerId;
  }

  startGame(): boolean {
    if (this.players.length < 2 || this.status !== 'waiting') {
      return false;
    }

    this.status = 'playing';
    this.gameState = {
      status: 'playing',
      startedAt: new Date().toISOString(),
      currentPhase: 'word-selection',
      timeRemaining: this.settings.timeLimit
    };
    return true;
  }

  endGame(): void {
    this.status = 'finished';
    if (this.gameState) {
      this.gameState.status = 'finished';
      this.gameState.timeRemaining = 0;
    }
  }

  resetToWaiting(): void {
    this.status = 'waiting';
    this.gameState = null;
  }

  toJSON() {
    return {
      roomName: this.roomName,
      name: this.name,
      status: this.status,
      players: this.players,
      maxPlayers: this.maxPlayers,
      gameState: this.gameState,
      settings: this.settings,
      createdAt: this.createdAt,
      roomLeader: this.roomLeader
    };
  }

  toPublicJSON() {
    return {
      roomName: this.roomName,
      name: this.name,
      status: this.status,
      playerCount: this.players.length,
      maxPlayers: this.maxPlayers,
      createdAt: this.createdAt,
      settings: this.settings
    };
  }
}

// Factory function for creating mock rooms for testing
export const createMockRoom = (): Room => {
  const creatorPlayer = { id: 'player1', name: 'Alice', isOwner: true };
  const room = new Room('room123', 'My Game Room', creatorPlayer, 12, {
    timeLimit: 30
  });

  // Add additional mock players
  room.addPlayer({ id: 'player2', name: 'Bob', isOwner: false });
  room.addPlayer({ id: 'current-user-id', name: 'CurrentPlayer', isOwner: false });

  return room;
};