import { browser } from '$app/environment';
import type { Room, UserData } from '@onlyone/shared';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  cause?: unknown;
}

interface Session {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

interface AuthResponse {
  user: {
    id: string;
    email?: string;
    user_metadata?: {
      name?: string;
    };
  };
  session: Session;
  isNewUser?: boolean;
}

// Use UserData from shared package
type MeResponse = UserData;

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

export class GameServerAPI {
  private baseURL: string;
  private defaultTimeout = 30000; // 30 seconds
  private cookieHeader?: string; // For SSR requests

  constructor(baseURL: string, cookieHeader?: string) {
    this.baseURL = baseURL;
    this.cookieHeader = cookieHeader;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    isRetry = false
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseURL}${endpoint}`;

      // Create an AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.defaultTimeout);

      // Build headers - in browser use credentials, in SSR use cookie header
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string>),
      };

      // In SSR context, add cookie header if provided
      if (!browser && this.cookieHeader) {
        headers.cookie = this.cookieHeader;
      }

      const response = await fetch(url, {
        credentials: browser ? 'include' : undefined, // Only use credentials in browser
        headers,
        signal: controller.signal,
        ...options,
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      // If 401 and not already retrying, attempt refresh by calling /auth/me
      if (response.status === 401 && !isRetry && endpoint !== '/auth/me') {
        console.log('[API] Got 401, attempting token refresh...');

        // Call /auth/me to trigger middleware refresh
        const refreshResult = await this.getMe();

        if (!refreshResult.success) {
          console.error('[API] Token refresh failed:', refreshResult.error);
          return {
            success: false,
            error: 'Authentication failed. Please log in again.',
          };
        }

        console.log('[API] Token refresh successful, retrying original request...');

        // Retry original request once
        const retryResult = await this.request<T>(endpoint, options, true);

        if (!retryResult.success && retryResult.error?.includes('401')) {
          console.error('[API] Retry after refresh still failed with 401');
          return {
            success: false,
            error: 'Authentication failed after refresh. Please log in again.',
          };
        }

        return retryResult;
      }

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

      // Handle timeout specifically
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          error: 'Request timed out. Please try again.',
          cause: error,
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
        cause: error,
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
  async checkRoomStatus(roomName: string) {
    return this.request(`/room/${roomName}/status`);
  }

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

  async kickPlayer(roomName: string, playerId: string, reason?: string) {
    return this.request(`/room/${roomName}/kick/${playerId}`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  // Health check
  async health() {
    return this.request('/health');
  }
}

// Client instance - uses relative URL for Vite proxy in browser
export const gameServerAPI = new GameServerAPI('/gameserver');

export type { ApiResponse, AuthResponse, MeResponse, Room, RoomsResponse, JoinRoomResponse };