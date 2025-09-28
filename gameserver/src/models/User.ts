// Moved to separate UserStats.ts file for profile/leaderboard contexts

export interface AuthProvider {
  provider: 'local' | 'google';
  providerId: string;
  email?: string;
}

export interface UserSession {
  token: string;
  socketId?: string;
  currentRoomId?: string;
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

  constructor(
    id: string,
    name: string,
    email?: string,
    passwordHash?: string,
    authProviders: AuthProvider[] = [],
    createdAt: Date = new Date()
  ) {
    this.id = id;
    this.name = name;
    this.email = email;
    this.passwordHash = passwordHash;
    this.authProviders = authProviders;
    this.createdAt = createdAt;
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

  joinRoom(roomId: string): void {
    this.updateSession({ currentRoomId: roomId });
  }

  leaveRoom(): void {
    this.updateSession({ currentRoomId: undefined });
  }

  isAuthenticated(): boolean {
    return !!this.session?.token;
  }

  isOnline(): boolean {
    return !!this.session?.isOnline;
  }

  getCurrentRoomId(): string | undefined {
    return this.session?.currentRoomId;
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
      session: this.session ? {
        isOnline: this.session.isOnline,
        currentRoomId: this.session.currentRoomId,
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