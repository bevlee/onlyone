import { describe, it, expect, beforeEach, vi } from 'vitest';
import { gameServerAPI } from './gameserver';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock env
vi.mock('$env/dynamic/public', () => ({
  env: {
    PUBLIC_GAMESERVER_URL: 'http://localhost:3000'
  }
}));

describe('GameServerAPI', () => {
  const api = gameServerAPI;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('register', () => {
    it('should successfully register a user', async () => {
      const mockResponse = {
        user: { id: 'user-123', email: 'test@example.com', user_metadata: { name: 'Test User' } },
        session: { access_token: 'token-123' },
        isNewUser: true
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      const result = await api.register('Test User', 'test@example.com', 'password123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/auth/register',
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
          body: JSON.stringify({ name: 'Test User', email: 'test@example.com', password: 'password123' })
        })
      );
    });

    it('should handle registration errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({ error: 'Email already exists' })
      });

      const result = await api.register('Test User', 'test@example.com', 'password123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Email already exists');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await api.register('Test User', 'test@example.com', 'password123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });

  describe('login', () => {
    it('should successfully login a user', async () => {
      const mockResponse = {
        user: { id: 'user-123', email: 'test@example.com' },
        session: { access_token: 'token-123' }
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      const result = await api.login('test@example.com', 'password123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/auth/login',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'test@example.com', password: 'password123' })
        })
      );
    });

    it('should handle invalid credentials', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ error: 'Invalid credentials' })
      });

      const result = await api.login('test@example.com', 'wrongpassword');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid credentials');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Connection failed'));

      const result = await api.login('test@example.com', 'password123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Connection failed');
    });
  });

  describe('logout', () => {
    it('should successfully logout', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ message: 'Logged out' })
      });

      const result = await api.logout();

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/auth/logout',
        expect.objectContaining({
          method: 'POST'
        })
      );
    });

    it('should handle logout errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ error: 'Logout failed' })
      });

      const result = await api.logout();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Logout failed');
    });

    it('should handle network errors during logout', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await api.logout();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });

  describe('getMe', () => {
    it('should successfully fetch user profile', async () => {
      const mockResponse = {
        user: { id: 'user-123', email: 'test@example.com' },
        profile: { id: 'profile-123', name: 'Test User', email: 'test@example.com', gamesPlayed: 5, gamesWon: 2 }
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      const result = await api.getMe();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/auth/me',
        expect.objectContaining({
          credentials: 'include'
        })
      );
    });

    it('should handle unauthenticated user', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ error: 'Not authenticated' })
      });

      const result = await api.getMe();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Not authenticated');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await api.getMe();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });

  describe('signInAnonymous', () => {
    it('should successfully sign in anonymously without name', async () => {
      const mockResponse = {
        user: { id: 'anon-123', is_anonymous: true, user_metadata: { name: 'Happy-Penguin' } },
        session: { access_token: 'token-123' },
        isNewUser: true
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      const result = await api.signInAnonymous();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/auth/anonymous',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: undefined })
        })
      );
    });

    it('should handle anonymous sign-in disabled error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 422,
        statusText: 'Unprocessable Entity',
        json: async () => ({ error: 'Anonymous sign-ins are disabled' })
      });

      const result = await api.signInAnonymous();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Anonymous sign-ins are disabled');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await api.signInAnonymous();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });

  describe('getRooms', () => {
    it('should successfully fetch all rooms', async () => {
      const mockResponse = {
        rooms: [
          { roomName: 'room-1', players: [], status: 'waiting' },
          { roomName: 'room-2', players: [], status: 'playing' }
        ],
        total: 2
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      const result = await api.getRooms();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/lobby/rooms',
        expect.any(Object)
      );
    });

    it('should handle empty rooms list', async () => {
      const mockResponse = { rooms: [], total: 0 };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      const result = await api.getRooms();

      expect(result.success).toBe(true);
      expect(result.data?.rooms).toHaveLength(0);
    });

    it('should handle server errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ error: 'Server error' })
      });

      const result = await api.getRooms();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Server error');
    });
  });

  describe('createRoom', () => {
    it('should successfully create a room with default settings', async () => {
      const mockResponse = {
        message: 'Room created',
        room: { roomName: 'test-room', playerCount: 1, maxPlayers: 12, roomLeader: 'user-123' }
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      const result = await api.createRoom('test-room');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/lobby/rooms',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            roomName: 'test-room',
            settings: { maxPlayers: 12, timeLimit: 30 }
          })
        })
      );
    });

    it('should create room with custom settings', async () => {
      const mockResponse = {
        message: 'Room created',
        room: { roomName: 'custom-room', playerCount: 1, maxPlayers: 6, roomLeader: 'user-123' }
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      const result = await api.createRoom('custom-room', 6, 60);

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/lobby/rooms',
        expect.objectContaining({
          body: JSON.stringify({
            roomName: 'custom-room',
            settings: { maxPlayers: 6, timeLimit: 60 }
          })
        })
      );
    });

    it('should handle room already exists error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({ error: 'Room already exists' })
      });

      const result = await api.createRoom('duplicate-room');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Room already exists');
    });
  });

  describe('joinRoom', () => {
    it('should successfully join a room', async () => {
      const mockResponse = {
        message: 'Joined room',
        room: { roomName: 'test-room', playerCount: 2, maxPlayers: 12, roomLeader: 'user-456' },
        player: { id: 'user-123', name: 'Test User' }
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      const result = await api.joinRoom('test-room');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/lobby/rooms/test-room',
        expect.objectContaining({
          method: 'POST'
        })
      );
    });

    it('should handle room full error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({ error: 'Room is full' })
      });

      const result = await api.joinRoom('full-room');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Room is full');
    });

    it('should handle room not found error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ error: 'Room not found' })
      });

      const result = await api.joinRoom('nonexistent-room');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Room not found');
    });
  });

  describe('upgradeAccount', () => {
    it('should successfully upgrade anonymous account', async () => {
      const mockResponse = {
        user: { id: 'user-123', email: 'test@example.com', user_metadata: { name: 'Test User' } },
        session: { access_token: 'new-token' },
        isNewUser: false
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      const result = await api.upgradeAccount('Test User', 'test@example.com', 'password123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/auth/upgrade',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'Test User', email: 'test@example.com', password: 'password123' })
        })
      );
    });

    it('should handle email already in use error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({ error: 'Email already in use' })
      });

      const result = await api.upgradeAccount('Test User', 'existing@example.com', 'password123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Email already in use');
    });

    it('should handle not authenticated error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ error: 'Not authenticated' })
      });

      const result = await api.upgradeAccount('Test User', 'test@example.com', 'password123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Not authenticated');
    });
  });
});
