import { io, Socket } from 'socket.io-client';
import { MessageType, PLAYER_COLORS } from '@onlyone/shared';
import type { Room, ServerToClientEvents, ClientToServerEvents, ChatMessage, MessageColor } from '@onlyone/shared';
import { env } from '$env/dynamic/public';

// For Socket.IO, we need the base URL (not /gameserver path)
// The path option handles the /gameserver/socket.io routing
if (!env.PUBLIC_GAMESERVER_URL) {
  throw new Error('PUBLIC_GAMESERVER_URL environment variable is required');
}
const SOCKET_URL = env.PUBLIC_GAMESERVER_URL;

/**
 * Get a color for a player based on their index in the room
 */
function getPlayerColor(playerName: string, room: Room | null): MessageColor {
  if (!room) return PLAYER_COLORS[0];

  const playerIndex = room.players.findIndex(p => p.name === playerName);
  if (playerIndex === -1) return PLAYER_COLORS[0];

  // Assign color based on player index, wrapping around if more than 15 players
  return PLAYER_COLORS[playerIndex % PLAYER_COLORS.length];
}


interface WebSocketState {
  connected: boolean;
  room: Room | null;
  error: string | null;
  messages: ChatMessage[];
  kickedPlayerId: string | null;
}

function createWebSocketStore() {
  let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

  let state = $state<WebSocketState>({
    connected: false,
    room: null,
    error: null,
    messages: [],
    kickedPlayerId: null

  });

  function connect(roomName: string, playerName: string, playerId: string) {
    if (socket?.connected) {
      console.warn('Already connected');
      return;
    }

    console.log("Connecting to WebSocket:", SOCKET_URL, { roomName, playerName, playerId });

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
      state.messages = [...state.messages, {
        type: MessageType.System,
        text: `${data.player.name} joined the room`,
        playerName: data.player.name,
        timestamp: new Date().toISOString(),
        color: getPlayerColor(data.player.name, data.room)
      }];
    });

    socket.on('playerLeft', (data) => {
      console.log('Player left:', data);
      state.room = data.room;
      state.messages = [...state.messages, {
        type: MessageType.System,
        text: `${data.player.name} left the room`,
        playerName: data.player.name,
        timestamp: new Date().toISOString(),
        color: getPlayerColor(data.player.name, data.room)
      }];
    });

    socket.on('playerKicked', (data) => {
      console.log('Player kicked:', data);
      state.room = data.room;
      state.kickedPlayerId = data.playerId;
      state.messages = [...state.messages, {
        type: MessageType.System,
        text: data.message,
        playerName: data.playerName,
        timestamp: new Date().toISOString(),
        color: getPlayerColor(data.playerName, data.room)
      }];
    });

    socket.on('chatMessage', (data) => {
      console.log('Chat message:', data);
      state.messages = [...state.messages, {
        type: MessageType.User,
        text: data.message,
        playerName: data.playerName,
        timestamp: data.timestamp,
        color: getPlayerColor(data.playerName, state.room)
      }];
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