import { env } from '$env/dynamic/public';

const GAMESERVER_URL = env.PUBLIC_GAMESERVER_URL || 'http://localhost:3000';

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

interface Room {
  roomId: string;
  playerCount: number;
  maxPlayers: number;
  status: 'waiting' | 'playing';
  roomLeader: string;
}

interface RoomsResponse {
  rooms: Room[];
  total: number;
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

  async joinRoom(roomId: string, playerName?: string) {
    const body = playerName ? { playerName } : {};
    return this.request(`/lobby/rooms/${roomId}`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  // Health check
  async health() {
    return this.request('/health');
  }
}

export const gameServerAPI = new GameServerAPI();
export type { ApiResponse, AuthResponse, MeResponse, Room, RoomsResponse };