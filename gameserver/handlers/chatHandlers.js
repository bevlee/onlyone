import { logger } from '../config/logger.js';

/**
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
 * Handler for the 'changeName' socket event. Changes a player's name in the room.
 * @param {Object} connections - The connections state object.
 * @param {import('socket.io').Server} io - The Socket.IO server instance.
 * @returns {Function} The event handler function.
 */
export function handleChangeName(connections, io) {
  return (oldName, newName, room, callback) => {
    if (connections[room][newName]) {
      callback({ status: "nameExists" });
    } else {
      connections[room][newName] = connections[room][oldName];
      delete connections[room][oldName];
      callback({ status: "ok" });
    }
    io.to(room).emit("playerNameChanged", { oldName, newName });
  };
}

/**
 * Handler for the 'disconnect' socket event. Handles player disconnection and room updates.
 * @param {Function} removeConnection - The function to remove a connection.
 * @param {import('socket.io').Socket} socket - The connected socket instance.
 * @param {string} room - The room name.
 * @param {string} username - The player's username.
 * @param {import('socket.io').Server} io - The Socket.IO server instance.
 * @returns {Function} The event handler function.
 */
export function handleDisconnect(removeConnection, socket, room, username, io) {
  return (reason) => {
    removeConnection(socket);
    socket.to(room).emit("playerLeft", username);
  };
} 