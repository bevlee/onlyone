import { describe, it, expect, beforeEach, vi } from 'vitest';
import { gameServerAPI } from './gameserver';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

const GAMESERVER_URL = 'http://localhost:3000';

// Mock env
vi.mock('$env/dynamic/public', () => ({
  env: {
    PUBLIC_GAMESERVER_URL: GAMESERVER_URL
  }
}));

describe('GameServerAPI', () => {
  const api = gameServerAPI;

  beforeEach(() => {
    vi.clearAllMocks();
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
        `${GAMESERVER_URL}/lobby/rooms`,
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
        `${GAMESERVER_URL}/lobby/rooms`,
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
        `${GAMESERVER_URL}/lobby/rooms`,
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
        `${GAMESERVER_URL}/lobby/rooms/test-room`,
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
});
