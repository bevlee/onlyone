import { logger } from '../config/logger.js';

/**
 * --Not used currently--
 * Handler for the 'chat message' socket event. Processes incoming chat messages. 
 * @returns {Function} The event handler function.
 */
export function handleChatMessage() {
  return (msg, username, callback) => {
    logger.info({ msg, username }, 'Received chat message');
    callback("nice");
  };
}

/**
 * @typedef {Object.<string, ConnectionObject>} RoomConnections
 * @description Maps player names to their connection objects within a room.
 * @example
 * {
 *   "alice": { id: "socketid1", ... },
 *   "bob":   { id: "socketid2", ... },
 *   "carol": { id: "socketid3", ... }
 * }
 */

/**
 * @typedef {Object.<string, RoomConnections>} Connections
 * @description Maps room names to their player connections.
 * @example
 * {
 *   "room1": {
 *     "alice": { id: "socketid1", ... },
 *     "bob":   { id: "socketid2", ... }
 *   },
 *   "room2": {
 *     "carol": { id: "socketid3", ... }
 *   }
 * }
 */

/**
 * Handler for the 'changeName' socket event. Changes a player's name in the room.
 * @param {Connections} connections - The connections state object.
 * @param {import('socket.io').Server} io - The Socket.IO server instance.
 * @returns {Function} The event handler function.
 */
export function handleChangeName(connections, io) {
  return (oldName, newName, room, callback) => {
    if (connections[room][newName]) {
      callback({ status: "nameExists" }); // can consider changing this to a status code instead of a string
    } else {
      connections[room][newName] = connections[room][oldName];
      delete connections[room][oldName];
      callback({ status: "ok" });
      io.to(room).emit("playerNameChanged", { oldName, newName });
    }
  };
}

/**
 * Handler for the 'disconnect' socket event. Handles player disconnection and room updates.
 * @param {Function} removeConnection - The function to remove a connection.
 * @param {import('socket.io').Socket} socket - The connected socket instance.
 * @param {string} room - The room name.
 * @param {string} username - The player's username.
 * @returns {Function} The event handler function.
 */
export function handleDisconnect(removeConnection, socket, room, username) {
  return () => {
    removeConnection(socket);
    socket.to(room).emit("playerLeft", username);
  };
} 