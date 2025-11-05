import { Server, Socket } from 'socket.io';
import type {
  ServerToClientEvents,
  ClientToServerEvents
} from '@onlyone/shared';
import { RoomManager } from '../services/RoomManager.js';
import { ConnectionManager } from '../services/ConnectionManager.js';
import { logger } from '../config/logger.js';
import { validateChatMessage, validateClientEvent, ValidationError } from '../validation/eventValidator.js';

export function setupSocketHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: Socket<ClientToServerEvents, ServerToClientEvents>,
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
    // Get room (should already exist - player joined via HTTP)
    let room;
    try {
      room = roomManager.getRoom(roomName);
    } catch (error) {
      // Room doesn't exist
      socket.emit('error', { message: `Room "${roomName}" not found` });
      socket.disconnect();
      return;
    }

    // Check if player is in the room (should be - they joined via HTTP)
    const existingPlayer = room.players.find(p => p.id === playerId);

    if (!existingPlayer) {
      // Player not in room - they should have joined via HTTP first
      socket.emit('error', { message: 'Player not in room. Please join via HTTP first.' });
      socket.disconnect();
      return;
    }

    // Player is in room - update their socket ID for reconnection
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

    // Chat message handler
    socket.on('chatMessage', (message: unknown) => {
      try {
        const validatedMessage = validateChatMessage(message);

        logger.debug({ roomName, playerName, message: validatedMessage }, 'Chat message');

        io.to(roomName).emit('chatMessage', {
          playerName,
          message: validatedMessage,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        if (error instanceof ValidationError) {
          logger.warn({ roomName, playerId, error: error.message }, 'Invalid chat message rejected');
          socket.emit('error', { message: 'Invalid message format' });
        } else {
          logger.error({ roomName, playerId, error }, 'Unexpected error handling chat message');
          socket.emit('error', { message: 'Server error processing message' });
        }
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      logger.info({ socketId: socket.id, roomName, playerName }, 'Player disconnected');

      const connection = connectionManager.removeConnection(socket.id);

      if (connection) {
        // Remove player from room
        const wasRemoved = roomManager.removePlayerFromRoom(roomName, playerId);

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

    // Game action handler
    socket.on('gameAction', (action: unknown) => {
      try {
        const validatedAction = validateClientEvent(action);

        logger.debug({ roomName, playerId, actionType: validatedAction.type }, 'Game action received');

        // Get current room and game state
        const room = roomManager.getRoom(roomName);

        // Create event from action
        // TODO: Convert ClientEvent to GameEvent format (may require GameService update)
        // For now, just log successful validation
        logger.info({ roomName, playerId, actionType: validatedAction.type }, 'Validated game action');

      } catch (error) {
        if (error instanceof ValidationError) {
          logger.warn({ roomName, playerId, error: error.message }, 'Invalid game action rejected');
          socket.emit('error', { message: 'Invalid action format' });
        } else {
          logger.error({ roomName, playerId, error }, 'Unexpected error handling game action');
          socket.emit('error', { message: 'Server error processing action' });
        }
      }
    });

  } catch (error) {
    logger.error({ error, roomName, playerName }, 'Error setting up socket connection');
    socket.disconnect();
  }
}