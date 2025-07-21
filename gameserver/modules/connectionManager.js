import { logger } from '../config/logger.js';

/**
 * Manages player connections across different game rooms
 * 
 * Example connection state structure:
 * this.connections = {
 *   "room123": {
 *     "alice": {
 *       role: "writer",              // Current role: "writer" | "guesser" | ""
 *       playerId: "socket_abc123",   // Socket.IO socket ID
 *       joinRoom: function(roomName) { socket.join(roomName) },  // Socket room join method
 *       leaveRoom: function(roomName) { socket.leave(roomName) } // Socket room leave method
 *     },
 *     "bob": {
 *       role: "guesser",
 *       playerId: "socket_def456",
 *       joinRoom: function(roomName) { socket.join(roomName) },
 *       leaveRoom: function(roomName) { socket.leave(roomName) }
 *     },
 *     "charlie": {
 *       role: "writer",
 *       playerId: "socket_ghi789",
 *       joinRoom: function(roomName) { socket.join(roomName) },
 *       leaveRoom: function(roomName) { socket.leave(roomName) }
 *     }
 *   },
 *   "room456": {
 *     "diana": {
 *       role: "",
 *       playerId: "socket_jkl012",
 *       joinRoom: function(roomName) { socket.join(roomName) },
 *       leaveRoom: function(roomName) { socket.leave(roomName) }
 *     }
 *   }
 * }
 * 
 * Socket room organization:
 * - "room123" - All players in the room
 * - "room123.writer" - Only writers (alice, charlie)
 * - "room123.guesser" - Only current guesser (bob)
 */
export class ConnectionManager {
  constructor() {
    // Store connections organized by room: { roomName: { username: connectionData } }
    this.connections = {};
  }

  /**
   * Add a new player connection to a room
   * @param {Socket} socket - Socket.IO socket instance
   */
  addConnection(socket) {
    logger.debug({ connections: this.connections }, 'Adding connection');
    const auth = socket.handshake.auth;
    // Example structure of socket.handshake.auth:
    // {
    //   username: "alice",
    //   room: "room1",
    //   // ...any other custom authentication fields
    // }
    const room = auth.room;
    
    // Create room if it doesn't exist
    if (!this.connections[room]) {
      this.connections[room] = {};
    }
    
    // Add socket methods to connection object so they can individually join and leave rooms
    this.connections[room][auth.username] = {
      role: "",
      playerId: socket.id,
      // Bind socket room methods to connection object
      joinRoom: function (roomName) {
        socket.join(roomName);
      },
      leaveRoom: function (roomName) {
        socket.leave(roomName);
      },
    };
  }

  /**
   * Remove a player connection from a room
   * @param {Socket} socket - Socket.IO socket instance
   */
  removeConnection(socket) {
    logger.debug({ connections: this.connections }, 'Removing connection');
    const auth = socket.handshake.auth;
    const username = socket.handshake.auth.username;
    const room = auth.room;

    if (this.connections[room]) {
      delete this.connections[room][username];
      // Clean up empty rooms
      if (Object.keys(this.connections[room]).length === 0) {
        delete this.connections[room];
      }
    }
  }

  /**
   * Get all connections for a specific room
   * @param {string} room - Room name
   * @returns {Object} Connection data for the room
   */
  getConnections(room) {
    return this.connections[room] || {};
  }

  /**
   * Get all connections across all rooms
   * @returns {Object} All connection data
   */
  getAllConnections() {
    return this.connections;
  }
}