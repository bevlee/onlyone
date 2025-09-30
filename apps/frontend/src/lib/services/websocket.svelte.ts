import { io, Socket } from 'socket.io-client';
import type { Room } from '@onlyone/shared';
import { env } from '$env/dynamic/public';

const GAMESERVER_URL = env.PUBLIC_GAMESERVER_URL || 'http://localhost:3000';

interface WebSocketState {
  connected: boolean;
  room: Room | null;
  error: string | null;
}

function createWebSocketStore() {
  let socket: Socket | null = null;

  let state = $state<WebSocketState>({
    connected: false,
    room: null,
    error: null
  });

  // Event callbacks
  let onRoomStateUpdate: ((room: Room) => void) | null = null;
  let onPlayerJoined: ((data: any) => void) | null = null;
  let onPlayerLeft: ((data: any) => void) | null = null;
  let onChatMessage: ((data: any) => void) | null = null;

  function connect(roomName: string, playerName: string, playerId: string) {
    if (socket?.connected) {
      console.warn('Already connected');
      return;
    }

    socket = io(GAMESERVER_URL, {
      auth: { roomName, playerName, playerId },
      withCredentials: true
    });

    socket.on('connect', () => {
      console.log('WebSocket connected:', socket!.id);
      state.connected = true;
      state.error = null;
    });

    socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      state.connected = false;
    });

    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      state.error = error.message;
      state.connected = false;
    });

    // Room state events
    socket.on('roomState', (room: Room) => {
      console.log('Received room state:', room);
      state.room = room;
      onRoomStateUpdate?.(room);
    });

    socket.on('playerJoined', (data) => {
      console.log('Player joined:', data);
      state.room = data.room;
      onPlayerJoined?.(data);
    });

    socket.on('playerLeft', (data) => {
      console.log('Player left:', data);
      state.room = data.room;
      onPlayerLeft?.(data);
    });

    socket.on('chatMessage', (data) => {
      console.log('Chat message:', data);
      onChatMessage?.(data);
    });
  }

  function disconnect() {
    if (socket) {
      socket.disconnect();
      socket = null;
      state.connected = false;
      state.room = null;
    }
  }

  function sendChatMessage(message: string) {
    if (socket?.connected) {
      socket.emit('chatMessage', message);
    }
  }

  function startGame() {
    if (socket?.connected) {
      socket.emit('startGame');
    }
  }

  return {
    get state() {
      return state;
    },
    connect,
    disconnect,
    sendChatMessage,
    startGame,
    onRoomStateUpdate: (callback: (room: Room) => void) => {
      onRoomStateUpdate = callback;
    },
    onPlayerJoined: (callback: (data: any) => void) => {
      onPlayerJoined = callback;
    },
    onPlayerLeft: (callback: (data: any) => void) => {
      onPlayerLeft = callback;
    },
    onChatMessage: (callback: (data: any) => void) => {
      onChatMessage = callback;
    }
  };
}

export const websocketStore = createWebSocketStore();