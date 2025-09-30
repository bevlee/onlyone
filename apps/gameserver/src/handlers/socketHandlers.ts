import { Server, Socket } from 'socket.io';
import { RoomManager } from '../services/RoomManager.js';
import { ConnectionManager } from '../services/ConnectionManager.js';
import { logger } from '../config/logger.js';

export function setupSocketHandlers(
  io: Server,
  socket: Socket,
  roomManager: RoomManager,
  connectionManager: ConnectionManager
) {
  // Extract auth data
  const { roomName, playerName, playerId } = socket.handshake.auth;

  if (!roomName || !playerName) {
    logger.warn({ socketId: socket.id }, 'Socket connection missing auth data');
    socket.disconnect();
    return;
  }

  logger.info({ socketId: socket.id, roomName, playerName }, 'Player connecting via WebSocket');

  try {
    // Get or verify room exists
    const room = roomManager.getRoom(roomName);

    // Update player's socket ID
    roomManager.updatePlayerSocket(roomName, playerId, socket.id);

    // Track connection
    connectionManager.addConnection(socket, {
      id: playerId,
      name: playerName,
      socketId: socket.id
    }, roomName);

    // Join Socket.IO room
    socket.join(roomName);

    // Send current room state to connecting player
    socket.emit('roomState', room);

    // Notify others in room
    socket.to(roomName).emit('playerJoined', {
      player: { id: playerId, name: playerName },
      room
    });

    // Chat message handler
    socket.on('chatMessage', (message: string) => {
      logger.debug({ roomName, playerName, message }, 'Chat message');

      io.to(roomName).emit('chatMessage', {
        playerName,
        message,
        timestamp: new Date().toISOString()
      });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      logger.info({ socketId: socket.id, roomName, playerName }, 'Player disconnected');

      const connection = connectionManager.removeConnection(socket.id);

      if (connection) {
        // Remove player from room
        const wasRemoved = roomManager.leaveRoom(roomName, playerId);

        if (wasRemoved) {
          // Get updated room (might be deleted if empty)
          try {
            const updatedRoom = roomManager.getRoom(roomName);

            // Notify remaining players
            io.to(roomName).emit('playerLeft', {
              player: connection.player,
              room: updatedRoom
            });
          } catch (error) {
            // Room was deleted (last player left)
            logger.info({ roomName }, 'Room deleted - last player left');
          }
        }
      }
    });

    // Game event handlers (to be expanded later)
    socket.on('startGame', () => {
      logger.info({ roomName, playerName }, 'Start game requested');
      // TODO: Implement game start logic
    });

  } catch (error) {
    logger.error({ error, roomName, playerName }, 'Error setting up socket connection');
    socket.disconnect();
  }
}