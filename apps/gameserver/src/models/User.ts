// Moved to separate UserStats.ts file for profile/leaderboard contexts

export interface AuthProvider {
  provider: 'local' | 'google';
  providerId: string;
  email?: string;
}

export interface UserSession {
  token: string;
  socketId?: string;
  currentRoomName?: string;
  isOnline: boolean;
  lastSeen: Date;
}

export class User {
  public readonly id: string;
  public name: string;
  public readonly email?: string;
  public readonly passwordHash?: string;
  public readonly authProviders: AuthProvider[];
  public readonly createdAt: Date;
  public session?: UserSession;

  // Default game stats - start at 0 for new users
  public gamesPlayed: number = 0;
  public gamesWon: number = 0;

  constructor(
    id: string,
    name: string,
    email?: string,
    passwordHash?: string,
    authProviders: AuthProvider[] = [],
    createdAt: Date = new Date(),
    gamesPlayed: number = 0,
    gamesWon: number = 0
  ) {
    this.id = id;
    this.name = name;
    this.email = email;
    this.passwordHash = passwordHash;
    this.authProviders = authProviders;
    this.createdAt = createdAt;
    this.gamesPlayed = gamesPlayed;
    this.gamesWon = gamesWon;
    this.session = undefined;
  }




  addAuthProvider(provider: AuthProvider): void {
    this.authProviders.push(provider);
  }

  hasAuthProvider(provider: string): boolean {
    return this.authProviders.some(p => p.provider === provider);
  }

  getAuthProvider(provider: string): AuthProvider | undefined {
    return this.authProviders.find(p => p.provider === provider);
  }

  // Session management methods
  createSession(token: string): void {
    this.session = {
      token,
      isOnline: true,
      lastSeen: new Date()
    };
  }

  updateSession(updates: Partial<UserSession>): void {
    if (this.session) {
      this.session = {
        ...this.session,
        ...updates,
        lastSeen: new Date()
      };
    }
  }

  setSocket(socketId: string): void {
    this.updateSession({
      socketId,
      isOnline: true
    });
  }

  removeSocket(): void {
    this.updateSession({
      socketId: undefined,
      isOnline: false
    });
  }

  joinRoom(roomName: string): void {
    this.updateSession({ currentRoomName: roomName });
  }

  leaveRoom(): void {
    this.updateSession({ currentRoomName: undefined });
  }

  isAuthenticated(): boolean {
    return !!this.session?.token;
  }

  isOnline(): boolean {
    return !!this.session?.isOnline;
  }

  getCurrentRoomName(): string | undefined {
    return this.session?.currentRoomName;
  }

  getToken(): string | undefined {
    return this.session?.token;
  }

  getSocketId(): string | undefined {
    return this.session?.socketId;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      authProviders: this.authProviders,
      createdAt: this.createdAt,
      gamesPlayed: this.gamesPlayed,
      gamesWon: this.gamesWon,
      session: this.session ? {
        isOnline: this.session.isOnline,
        currentRoomName: this.session.currentRoomName,
        lastSeen: this.session.lastSeen
      } : undefined
    };
  }

  toPublicJSON() {
    return {
      id: this.id,
      name: this.name,
      createdAt: this.createdAt,
      isOnline: this.session?.isOnline || false
    };
  }

  // For converting to RoomPlayer when joining rooms
  toRoomPlayer(): { id: string; name: string; socketId?: string } {
    return {
      id: this.id,
      name: this.name,
      socketId: this.session?.socketId
    };
  }
}