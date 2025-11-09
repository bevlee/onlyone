import type { Room, RoomPlayer } from './Room.js';
import type { ServerEvent as ServerGameEvent } from './schemas/serverEvents.schemas.js';
import type { ClientEvent } from './schemas/index.js';

/**
 * Types of messages that can appear in the room log
 */
export enum MessageType {
  User = 'user',
  System = 'system'
}

/**
 * Available colors for player messages (15 distinct colors)
 */
export const PLAYER_COLORS = [
  'red',
  'orange',
  'yellow',
  'green',
  'teal',
  'blue',
  'indigo',
  'purple',
  'pink',
  'rose',
  'cyan',
  'lime',
  'amber',
  'emerald',
  'violet'
] as const;

export type MessageColor = typeof PLAYER_COLORS[number];

/**
 * Structured message for the room log
 */
export interface ChatMessage {
  type: MessageType;
  text: string;
  playerName?: string;
  timestamp: string;
  color: MessageColor;
}

/**
 * Events sent from Server to Client
 */
export interface ServerToClientEvents {
  /**
   * Sent when a client first connects or when room state changes
   * Contains the complete current room state
   */
  roomState: (room: Room) => void;

  /**
   * Sent when a new player joins the room
   */
  playerJoined: (data: {
    player: {
      id: string;
      name: string;
    };
    room: Room;
  }) => void;

  /**
   * Sent when a player leaves the room (disconnect or manual leave)
   */
  playerLeft: (data: {
    player: RoomPlayer;
    room: Room;
  }) => void;

  /**
   * Sent when a player is kicked from the room
   */
  playerKicked: (data: {
    playerId: string;
    playerName: string;
    kickedBy: string;
    message: string;
    room: Room;
  }) => void;

  /**
   * Sent when a chat message is received
   */
  chatMessage: (data: {
    playerName: string;
    message: string;
    timestamp: string;
  }) => void;

  /**
   * Generic error event for room/game errors
   */
  error: (data: { message: string }) => void;

  /**
   * Built-in Socket.IO connection event
   */
  connect: () => void;

  /**
   * Built-in Socket.IO disconnection event
   */
  disconnect: () => void;

  /**
   * Built-in Socket.IO connection error event
   */
  connect_error: (error: Error) => void;

  /**
   * Sent when game state changes (round starts, clue submitted, vote cast, etc.)
   * Broadcasts game events to all players in the room
   */
  gameEvent: (event: ServerGameEvent) => void;
}

/**
 * Events sent from Client to Server
 */
export interface ClientToServerEvents {
  /**
   * Send a chat message to the room
   */
  chatMessage: (message: string) => void;

  /**
   * Request to start the game (room leader only)
   */
  startGame: () => void;

  /**
   * Send a game action (clue submission, vote, guess, etc.)
   * Server validates action against current game state and emits event if valid
   */
  gameAction: (action: ClientEvent) => void;

  /**
   * Built-in Socket.IO disconnection event
   */
  disconnect: () => void;
}

