import { env } from '$env/dynamic/public';
import { browser } from '$app/environment';
import type { Room } from '@onlyone/shared';

// Use relative URLs in browser (for proxy), absolute URLs in server-side rendering
const GAMESERVER_URL = browser && !env.PUBLIC_GAMESERVER_URL ? '' : (env.PUBLIC_GAMESERVER_URL || 'http://localhost:3000');

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface AuthResponse {
  user: {
    id: string;
    email?: string;
    user_metadata?: {
      name?: string;
    };
  };
  session: any;
  isNewUser?: boolean;
}

interface MeResponse {
  user: {
    id: string;
    email?: string;
    user_metadata?: {
      name?: string;
    };
  };
  profile: {
    id: string;
    name: string;
    email: string | null;
    gamesPlayed: number;
    gamesWon: number;
  };
}

interface RoomsResponse {
  rooms: Room[];
  total: number;
}

interface JoinRoomResponse {
  message: string;
  room: {
    roomName: string;
    playerCount: number;
    maxPlayers: number;
    roomLeader: string | null;
  };
  player: {
    id: string;
    name: string;
  };
}

class GameServerAPI {
  private baseURL: string;

  constructor() {
    this.baseURL = GAMESERVER_URL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseURL}${endpoint}`;

      const response = await fetch(url, {
        credentials: 'include', // Important for session cookies
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('GameServer API error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  // Auth endpoints
  async register(name: string, email: string, password: string): Promise<ApiResponse<AuthResponse>> {
    return this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
  }

  async login(email: string, password: string): Promise<ApiResponse<AuthResponse>> {
    return this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      credentials: 'include'
    });
  }

  async logout() {
    return this.request('/auth/logout', {
      method: 'POST',
    });
  }

  async getMe(): Promise<ApiResponse<MeResponse>> {
    return this.request<MeResponse>('/auth/me');
  }

  async resetPassword(email: string) {
    return this.request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async signInAnonymous(): Promise<ApiResponse<AuthResponse>> {
    return this.request<AuthResponse>('/auth/anonymous', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  async upgradeAccount(name: string, email: string, password: string): Promise<ApiResponse<AuthResponse>> {
    return this.request<AuthResponse>('/auth/upgrade', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
  }

  async uploadAvatar(avatarBase64: string): Promise<ApiResponse<{ message: string; avatarUrl: string }>> {
    return this.request<{ message: string; avatarUrl: string }>('/auth/avatar', {
      method: 'POST',
      body: JSON.stringify({ avatar: avatarBase64 }),
    });
  }

  // Game API endpoints
  async getUserStats() {
    return this.request('/api/users/me/stats');
  }

  async getUserGames(limit = 10) {
    return this.request(`/api/users/me/games?limit=${limit}`);
  }

  async getLeaderboard(limit = 10) {
    return this.request(`/api/leaderboard?limit=${limit}`);
  }

  // Lobby endpoints
  async getRooms(): Promise<ApiResponse<RoomsResponse>> {
    return this.request<RoomsResponse>('/lobby/rooms');
  }

  // Room endpoints
  async createRoom(roomName: string, maxPlayers = 12, timeLimit = 30) {
    return this.request('/room', {
      method: 'POST',
      body: JSON.stringify({
        roomName,
        settings: {
          maxPlayers,
          timeLimit,
        },
      }),
    });
  }

  async joinRoom(roomName: string): Promise<ApiResponse<JoinRoomResponse>> {
    return this.request<JoinRoomResponse>(`/room/${roomName}/join`, {
      method: 'POST',
    });
  }

  // Health check
  async health() {
    return this.request('/health');
  }
}

export const gameServerAPI = new GameServerAPI();
export type { ApiResponse, AuthResponse, MeResponse, Room, RoomsResponse, JoinRoomResponse };