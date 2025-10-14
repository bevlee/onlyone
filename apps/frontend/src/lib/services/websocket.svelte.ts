import { io, Socket } from 'socket.io-client';
import type { Room } from '@onlyone/shared';
import { browser } from '$app/environment';
import { env } from '$env/dynamic/public';

// For Socket.IO, we need the base URL (not /gameserver path)
// The path option handles the /gameserver/socket.io routing
const SOCKET_URL = browser && !env.PUBLIC_GAMESERVER_URL ? '/' : (env.PUBLIC_GAMESERVER_URL?.replace('/gameserver', '') || 'http://localhost:3000');


interface WebSocketState {
  connected: boolean;
  room: Room | null;
  error: string | null;
  messages: string[];
}

function createWebSocketStore() {
  let socket: Socket | null = null;

  let state = $state<WebSocketState>({
    connected: false,
    room: null,
    error: null,
    messages: [],

  });

  function connect(roomName: string, playerName: string, playerId: string) {
    if (socket?.connected) {
      console.warn('Already connected');
      return;
    }

    socket = io(SOCKET_URL, {
      reconnection: true,
      path: '/gameserver/socket.io',
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

    // Room errors (room not found, full, etc.)
    socket.on('error', (data: { message: string }) => {
      console.error('Room error:', data.message);
      state.error = data.message;
    });

    // Room state events
    socket.on('roomState', (room: Room) => {
      console.log('Received room state:', room);
      state.room = room;
    });

    socket.on('playerJoined', (data) => {
      console.log('Player joined:', data);
      state.room = data.room;
    });

    socket.on('playerLeft', (data) => {
      console.log('Player left:', data);
      state.room = data.room;
    });

    socket.on('playerKicked', (data) => {
      state.room = data.room;
    });

    socket.on('chatMessage', (message: string) => {
      console.log('Chat message:', message);
      state.messages = [...state.messages, message];
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
  };
}

export const websocketStore = createWebSocketStore();