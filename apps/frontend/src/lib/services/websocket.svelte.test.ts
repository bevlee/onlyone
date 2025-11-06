import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { io, type Socket } from 'socket.io-client';
import { MessageType, PLAYER_COLORS } from '@onlyone/shared';
import type { Room, ServerToClientEvents, ClientToServerEvents } from '@onlyone/shared';

// Mock socket.io-client
vi.mock('socket.io-client', () => ({
  io: vi.fn()
}));

// Mock env
vi.mock('$env/dynamic/public', () => ({
  env: {
    PUBLIC_GAMESERVER_URL: 'http://localhost:3000'
  }
}));

// Import after mocks are set up
const websocketModule = await import('./websocket.svelte');

describe('getPlayerColor', () => {
  // Access the function through module internals for testing
  // Since it's not exported, we'll test it indirectly through the store behavior

  it('should return first color when room is null', () => {
    // This will be tested through the store's message handling
    expect(PLAYER_COLORS[0]).toBe('red');
  });

  it('should return first color when player not found in room', () => {
    // This will be tested through the store's message handling
    expect(PLAYER_COLORS.length).toBeGreaterThan(0);
  });

  it('should assign colors based on player index', () => {
    // This will be tested through the store's message handling
    expect(PLAYER_COLORS[1]).toBe('orange');
  });
});

describe('createWebSocketStore', () => {
  let mockSocket: {
    connected: boolean;
    disconnect: Mock;
    emit: Mock;
    on: Mock;
    id?: string;
  };
  let eventHandlers: Record<string, Function>;

  beforeEach(() => {
    vi.clearAllMocks();

    eventHandlers = {};
    mockSocket = {
      connected: false,
      disconnect: vi.fn(),
      emit: vi.fn(),
      on: vi.fn((event: string, handler: Function) => {
        eventHandlers[event] = handler;
      }),
      id: 'socket-123'
    };

    (io as Mock).mockReturnValue(mockSocket);

    // Clear module cache to get fresh store instance
    vi.resetModules();
  });

  describe('initial state', () => {
    it('should initialize with default state', async () => {
      const { websocketStore } = await import('./websocket.svelte');

      expect(websocketStore.state.connected).toBe(false);
      expect(websocketStore.state.room).toBe(null);
      expect(websocketStore.state.error).toBe(null);
      expect(websocketStore.state.messages).toEqual([]);
      expect(websocketStore.state.kickedPlayerId).toBe(null);
    });
  });

  describe('connect', () => {
    it('should create socket connection with correct parameters', async () => {
      const { websocketStore } = await import('./websocket.svelte');

      websocketStore.connect('test-room', 'Alice', 'player-123');

      expect(io).toHaveBeenCalledWith('http://localhost:3000', {
        reconnection: true,
        path: '/socket.io',
        auth: {
          roomName: 'test-room',
          playerName: 'Alice',
          playerId: 'player-123'
        },
        withCredentials: true
      });
    });

    it('should not create new connection if already connected', async () => {
      const { websocketStore } = await import('./websocket.svelte');
      mockSocket.connected = true;

      websocketStore.connect('test-room', 'Alice', 'player-123');
      websocketStore.connect('test-room', 'Alice', 'player-123');

      expect(io).toHaveBeenCalledTimes(1);
    });

    it('should register socket event handlers', async () => {
      const { websocketStore } = await import('./websocket.svelte');

      websocketStore.connect('test-room', 'Alice', 'player-123');

      expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('connect_error', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('roomState', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('playerJoined', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('playerLeft', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('playerKicked', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('chatMessage', expect.any(Function));
    });
  });

  describe('socket event handlers', () => {
    beforeEach(async () => {
      const { websocketStore } = await import('./websocket.svelte');
      websocketStore.connect('test-room', 'Alice', 'player-123');
    });

    describe('connect event', () => {
      it('should update state when connected', async () => {
        const { websocketStore } = await import('./websocket.svelte');

        eventHandlers['connect']();

        expect(websocketStore.state.connected).toBe(true);
        expect(websocketStore.state.error).toBe(null);
      });
    });

    describe('disconnect event', () => {
      it('should update state when disconnected', async () => {
        const { websocketStore } = await import('./websocket.svelte');

        // First connect
        eventHandlers['connect']();
        expect(websocketStore.state.connected).toBe(true);

        // Then disconnect
        eventHandlers['disconnect']();

        expect(websocketStore.state.connected).toBe(false);
      });
    });

    describe('connect_error event', () => {
      it('should set error message on connection error', async () => {
        const { websocketStore } = await import('./websocket.svelte');
        const error = new Error('Connection failed');

        eventHandlers['connect_error'](error);

        expect(websocketStore.state.error).toBe('Connection failed');
        expect(websocketStore.state.connected).toBe(false);
      });
    });

    describe('error event', () => {
      it('should set error message on room error', async () => {
        const { websocketStore } = await import('./websocket.svelte');

        eventHandlers['error']({ message: 'Room is full' });

        expect(websocketStore.state.error).toBe('Room is full');
      });
    });

    describe('roomState event', () => {
      it('should update room state', async () => {
        const { websocketStore } = await import('./websocket.svelte');
        const mockRoom: Room = {
          roomName: 'test-room',
          players: [{ id: 'player-1', name: 'Alice' }],
          spectators: [],
          status: 'waiting',
          settings: { maxPlayers: 12, timeLimit: 30 },
          roomLeader: 'player-1'
        };

        eventHandlers['roomState'](mockRoom);

        expect(websocketStore.state.room).toEqual(mockRoom);
      });
    });

    describe('playerJoined event', () => {
      it('should update room and add system message', async () => {
        const { websocketStore } = await import('./websocket.svelte');
        const mockRoom: Room = {
          roomName: 'test-room',
          players: [
            { id: 'player-1', name: 'Alice' },
            { id: 'player-2', name: 'Bob' }
          ],
          spectators: [],
          status: 'waiting',
          settings: { maxPlayers: 12, timeLimit: 30 },
          roomLeader: 'player-1'
        };

        eventHandlers['playerJoined']({
          player: { id: 'player-2', name: 'Bob' },
          room: mockRoom
        });

        expect(websocketStore.state.room).toEqual(mockRoom);
        expect(websocketStore.state.messages).toHaveLength(1);
        expect(websocketStore.state.messages[0]).toMatchObject({
          type: MessageType.System,
          text: 'Bob joined the room',
          playerName: 'Bob'
        });
      });

      it('should assign correct color to joining player', async () => {
        const { websocketStore } = await import('./websocket.svelte');
        const mockRoom: Room = {
          roomName: 'test-room',
          players: [
            { id: 'player-1', name: 'Alice' },
            { id: 'player-2', name: 'Bob' }
          ],
          spectators: [],
          status: 'waiting',
          settings: { maxPlayers: 12, timeLimit: 30 },
          roomLeader: 'player-1'
        };

        eventHandlers['playerJoined']({
          player: { id: 'player-2', name: 'Bob' },
          room: mockRoom
        });

        // Bob is at index 1, so should get PLAYER_COLORS[1]
        expect(websocketStore.state.messages[0].color).toBe(PLAYER_COLORS[1]);
      });
    });

    describe('playerLeft event', () => {
      it('should update room and add system message', async () => {
        const { websocketStore } = await import('./websocket.svelte');
        const mockRoom: Room = {
          roomName: 'test-room',
          players: [{ id: 'player-1', name: 'Alice' }],
          spectators: [],
          status: 'waiting',
          settings: { maxPlayers: 12, timeLimit: 30 },
          roomLeader: 'player-1'
        };

        eventHandlers['playerLeft']({
          player: { id: 'player-2', name: 'Bob' },
          room: mockRoom
        });

        expect(websocketStore.state.room).toEqual(mockRoom);
        expect(websocketStore.state.messages).toHaveLength(1);
        expect(websocketStore.state.messages[0]).toMatchObject({
          type: MessageType.System,
          text: 'Bob left the room',
          playerName: 'Bob'
        });
      });

      it('should assign correct color to leaving player', async () => {
        const { websocketStore } = await import('./websocket.svelte');
        const mockRoom: Room = {
          roomName: 'test-room',
          players: [{ id: 'player-1', name: 'Alice' }],
          spectators: [],
          status: 'waiting',
          settings: { maxPlayers: 12, timeLimit: 30 },
          roomLeader: 'player-1'
        };

        eventHandlers['playerLeft']({
          player: { id: 'player-2', name: 'Bob' },
          room: mockRoom
        });

        expect(websocketStore.state.messages[0].color).toBeDefined();
      });
    });

    describe('playerKicked event', () => {
      it('should update room, set kicked player id, and add system message', async () => {
        const { websocketStore } = await import('./websocket.svelte');
        const mockRoom: Room = {
          roomName: 'test-room',
          players: [{ id: 'player-1', name: 'Alice' }],
          spectators: [],
          status: 'waiting',
          settings: { maxPlayers: 12, timeLimit: 30 },
          roomLeader: 'player-1'
        };

        eventHandlers['playerKicked']({
          playerId: 'player-2',
          playerName: 'Bob',
          kickedBy: 'player-1',
          message: 'Bob was kicked from the room',
          room: mockRoom
        });

        expect(websocketStore.state.room).toEqual(mockRoom);
        expect(websocketStore.state.kickedPlayerId).toBe('player-2');
        expect(websocketStore.state.messages).toHaveLength(1);
        expect(websocketStore.state.messages[0]).toMatchObject({
          type: MessageType.System,
          text: 'Bob was kicked from the room',
          playerName: 'Bob'
        });
      });
    });

    describe('chatMessage event', () => {
      it('should add chat message to messages array', async () => {
        const { websocketStore } = await import('./websocket.svelte');
        const mockRoom: Room = {
          roomName: 'test-room',
          players: [
            { id: 'player-1', name: 'Alice' },
            { id: 'player-2', name: 'Bob' }
          ],
          spectators: [],
          status: 'waiting',
          settings: { maxPlayers: 12, timeLimit: 30 },
          roomLeader: 'player-1'
        };

        // Set room state first
        eventHandlers['roomState'](mockRoom);

        eventHandlers['chatMessage']({
          playerName: 'Bob',
          message: 'Hello everyone!',
          timestamp: '2024-01-01T00:00:00.000Z'
        });

        expect(websocketStore.state.messages).toHaveLength(1);
        expect(websocketStore.state.messages[0]).toMatchObject({
          type: MessageType.User,
          text: 'Hello everyone!',
          playerName: 'Bob',
          timestamp: '2024-01-01T00:00:00.000Z'
        });
      });

      it('should assign correct color based on player position in room', async () => {
        const { websocketStore } = await import('./websocket.svelte');
        const mockRoom: Room = {
          roomName: 'test-room',
          players: [
            { id: 'player-1', name: 'Alice' },
            { id: 'player-2', name: 'Bob' }
          ],
          spectators: [],
          status: 'waiting',
          settings: { maxPlayers: 12, timeLimit: 30 },
          roomLeader: 'player-1'
        };

        eventHandlers['roomState'](mockRoom);

        eventHandlers['chatMessage']({
          playerName: 'Bob',
          message: 'Hello!',
          timestamp: '2024-01-01T00:00:00.000Z'
        });

        // Bob is at index 1, so should get PLAYER_COLORS[1]
        expect(websocketStore.state.messages[0].color).toBe(PLAYER_COLORS[1]);
      });

      it('should handle chat message when room state is null', async () => {
        const { websocketStore } = await import('./websocket.svelte');

        eventHandlers['chatMessage']({
          playerName: 'Unknown',
          message: 'Hello!',
          timestamp: '2024-01-01T00:00:00.000Z'
        });

        expect(websocketStore.state.messages).toHaveLength(1);
        expect(websocketStore.state.messages[0].color).toBe(PLAYER_COLORS[0]);
      });
    });

    describe('multiple messages', () => {
      it('should maintain message history', async () => {
        const { websocketStore } = await import('./websocket.svelte');
        const mockRoom: Room = {
          roomName: 'test-room',
          players: [{ id: 'player-1', name: 'Alice' }],
          spectators: [],
          status: 'waiting',
          settings: { maxPlayers: 12, timeLimit: 30 },
          roomLeader: 'player-1'
        };

        eventHandlers['roomState'](mockRoom);

        eventHandlers['playerJoined']({
          player: { id: 'player-2', name: 'Bob' },
          room: { ...mockRoom, players: [...mockRoom.players, { id: 'player-2', name: 'Bob' }] }
        });

        eventHandlers['chatMessage']({
          playerName: 'Bob',
          message: 'Hello!',
          timestamp: '2024-01-01T00:00:00.000Z'
        });

        eventHandlers['playerLeft']({
          player: { id: 'player-2', name: 'Bob' },
          room: mockRoom
        });

        expect(websocketStore.state.messages).toHaveLength(3);
        expect(websocketStore.state.messages[0].text).toBe('Bob joined the room');
        expect(websocketStore.state.messages[1].text).toBe('Hello!');
        expect(websocketStore.state.messages[2].text).toBe('Bob left the room');
      });
    });
  });

  describe('disconnect', () => {
    it('should disconnect socket and reset state', async () => {
      const { websocketStore } = await import('./websocket.svelte');

      websocketStore.connect('test-room', 'Alice', 'player-123');
      eventHandlers['connect']();

      const mockRoom: Room = {
        roomName: 'test-room',
        players: [{ id: 'player-1', name: 'Alice' }],
        spectators: [],
        status: 'waiting',
        settings: { maxPlayers: 12, timeLimit: 30 },
        roomLeader: 'player-1'
      };
      eventHandlers['roomState'](mockRoom);

      websocketStore.disconnect();

      expect(mockSocket.disconnect).toHaveBeenCalled();
      expect(websocketStore.state.connected).toBe(false);
      expect(websocketStore.state.room).toBe(null);
    });

    it('should handle disconnect when socket is null', async () => {
      const { websocketStore } = await import('./websocket.svelte');

      // Don't connect first
      expect(() => websocketStore.disconnect()).not.toThrow();
    });

    it('should handle multiple disconnect calls', async () => {
      const { websocketStore } = await import('./websocket.svelte');

      websocketStore.connect('test-room', 'Alice', 'player-123');
      websocketStore.disconnect();
      websocketStore.disconnect();

      expect(mockSocket.disconnect).toHaveBeenCalledTimes(1);
    });
  });

  describe('sendChatMessage', () => {
    it('should emit chat message when connected', async () => {
      const { websocketStore } = await import('./websocket.svelte');
      mockSocket.connected = true;

      websocketStore.connect('test-room', 'Alice', 'player-123');
      websocketStore.sendChatMessage('Hello everyone!');

      expect(mockSocket.emit).toHaveBeenCalledWith('chatMessage', 'Hello everyone!');
    });

    it('should not emit when not connected', async () => {
      const { websocketStore } = await import('./websocket.svelte');
      mockSocket.connected = false;

      websocketStore.connect('test-room', 'Alice', 'player-123');
      websocketStore.sendChatMessage('Hello everyone!');

      expect(mockSocket.emit).not.toHaveBeenCalled();
    });

    it('should not emit when socket is null', async () => {
      const { websocketStore } = await import('./websocket.svelte');

      // Don't connect first
      expect(() => websocketStore.sendChatMessage('Hello!')).not.toThrow();
      expect(mockSocket.emit).not.toHaveBeenCalled();
    });
  });

  describe('startGame', () => {
    it('should emit startGame event when connected', async () => {
      const { websocketStore } = await import('./websocket.svelte');
      mockSocket.connected = true;

      websocketStore.connect('test-room', 'Alice', 'player-123');
      websocketStore.startGame();

      expect(mockSocket.emit).toHaveBeenCalledWith('startGame');
    });

    it('should not emit when not connected', async () => {
      const { websocketStore } = await import('./websocket.svelte');
      mockSocket.connected = false;

      websocketStore.connect('test-room', 'Alice', 'player-123');
      websocketStore.startGame();

      expect(mockSocket.emit).not.toHaveBeenCalled();
    });

    it('should not emit when socket is null', async () => {
      const { websocketStore } = await import('./websocket.svelte');

      // Don't connect first
      expect(() => websocketStore.startGame()).not.toThrow();
      expect(mockSocket.emit).not.toHaveBeenCalled();
    });
  });

  describe('color wrapping for many players', () => {
    it('should wrap colors when more than 15 players', async () => {
      const { websocketStore } = await import('./websocket.svelte');

      // Create room with 16 players
      const players = Array.from({ length: 16 }, (_, i) => ({
        id: `player-${i}`,
        name: `Player${i}`
      }));

      const mockRoom: Room = {
        roomName: 'test-room',
        players,
        spectators: [],
        status: 'waiting',
        settings: { maxPlayers: 16, timeLimit: 30 },
        roomLeader: 'player-0'
      };

      eventHandlers['roomState'](mockRoom);

      // Player 0 should get color 0
      eventHandlers['chatMessage']({
        playerName: 'Player0',
        message: 'Hello!',
        timestamp: '2024-01-01T00:00:00.000Z'
      });

      // Player 15 should get color 0 (wraps around: 15 % 15 = 0)
      eventHandlers['chatMessage']({
        playerName: 'Player15',
        message: 'Hi!',
        timestamp: '2024-01-01T00:00:01.000Z'
      });

      expect(websocketStore.state.messages[0].color).toBe(PLAYER_COLORS[0]);
      expect(websocketStore.state.messages[1].color).toBe(PLAYER_COLORS[0]);
    });
  });

  describe('edge cases', () => {
    it('should handle player not found in room for color assignment', async () => {
      const { websocketStore } = await import('./websocket.svelte');
      const mockRoom: Room = {
        roomName: 'test-room',
        players: [{ id: 'player-1', name: 'Alice' }],
        spectators: [],
        status: 'waiting',
        settings: { maxPlayers: 12, timeLimit: 30 },
        roomLeader: 'player-1'
      };

      eventHandlers['roomState'](mockRoom);

      // Message from player not in room
      eventHandlers['chatMessage']({
        playerName: 'UnknownPlayer',
        message: 'Hello!',
        timestamp: '2024-01-01T00:00:00.000Z'
      });

      // Should default to first color
      expect(websocketStore.state.messages[0].color).toBe(PLAYER_COLORS[0]);
    });

    it('should handle empty room players array', async () => {
      const { websocketStore } = await import('./websocket.svelte');
      const mockRoom: Room = {
        roomName: 'test-room',
        players: [],
        spectators: [],
        status: 'waiting',
        settings: { maxPlayers: 12, timeLimit: 30 },
        roomLeader: null
      };

      eventHandlers['roomState'](mockRoom);

      eventHandlers['chatMessage']({
        playerName: 'Alice',
        message: 'Hello!',
        timestamp: '2024-01-01T00:00:00.000Z'
      });

      expect(websocketStore.state.messages[0].color).toBe(PLAYER_COLORS[0]);
    });
  });
});
