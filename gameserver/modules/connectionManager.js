import { logger } from '../config/logger.js';

/**
 * Manages player connections across different game rooms
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
    const room = auth.room;
    
    // Create room if it doesn't exist
    if (!this.connections[room]) {
      this.connections[room] = {};
    }
    
    // Store connection data with socket methods
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