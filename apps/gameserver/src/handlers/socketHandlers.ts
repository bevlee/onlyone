import { Server, Socket } from 'socket.io';
import type {
  ServerToClientEvents,
  ClientToServerEvents
} from '@onlyone/shared';
import { RoomManager } from '../services/RoomManager.js';
import { ConnectionManager } from '../services/ConnectionManager.js';
import { GameService } from '../services/GameService.js';
import { logger } from '../config/logger.js';
import { validateGameAction, validateChatMessageInput, ValidationError } from '../validation/eventValidator.js';
import { socketAuthSchema } from '@onlyone/shared/schemas';

export function setupSocketHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: Socket<ClientToServerEvents, ServerToClientEvents>,
  roomManager: RoomManager,
  connectionManager: ConnectionManager
) {
  // Extract and validate auth data
  try {
    const auth = socketAuthSchema.parse(socket.handshake.auth);
    const { roomName, playerName, playerId } = auth;

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
        const validatedMessage = validateChatMessageInput(message);

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

    // Start game handler (transitions from waiting to playing)
    socket.on('startGame', () => {
      try {
        // Only room leader can start the game
        if (!roomManager.isRoomLeader(roomName, playerId)) {
          socket.emit('error', { message: 'Only room leader can start the game' });
          return;
        }

        // Attempt to start the game
        const startSuccess = roomManager.startGame(roomName, playerId);

        if (!startSuccess) {
          // Get the room to check why it failed
          const room = roomManager.getRoom(roomName);
          let errorMessage = 'Unable to start game';

          if (room.status !== 'waiting') {
            errorMessage = 'Game is already in progress';
          } else if (room.players.length < 2) {
            errorMessage = `Need at least 2 players to start (currently ${room.players.length})`;
          }

          socket.emit('error', { message: errorMessage });
          return;
        }

        // Get updated room after game start
        const room = roomManager.getRoom(roomName);

        // Broadcast updated room state to all players
        io.to(roomName).emit('roomState', room);

        logger.info({ roomName, playerId, playerName }, 'Game started successfully');
      } catch (error) {
        logger.error({ roomName, playerId, error }, 'Error starting game');
        socket.emit('error', { message: 'Server error starting game' });
      }
    });

    // Game action handler
    socket.on('gameAction', (action: unknown) => {
      try {
        const validatedAction = validateGameAction(action);

        logger.debug({ roomName, playerId, actionType: validatedAction.type }, 'Game action received');

        // Get current room and game state
        const room = roomManager.getRoom(roomName);

        // Game must be in progress (status = 'playing') and have active gameState
        if (room.status !== 'playing' || !room.gameState) {
          socket.emit('error', { message: 'Game is not in progress' });
          return;
        }

        // Apply event to game state (validates phase legality)
        try {
          GameService.applyEvent(room.gameState, validatedAction);

          // Broadcast room state update to all players in room
          io.to(roomName).emit('roomState', room);

          logger.info({ roomName, playerId, actionType: validatedAction.type }, 'Game action applied successfully');
        } catch (gameError) {
          // GameService validation error (phase check, business logic, etc)
          logger.warn(
            { roomName, playerId, actionType: validatedAction.type, error: gameError instanceof Error ? gameError.message : String(gameError) },
            'Game action validation failed'
          );
          socket.emit('error', { message: `Action not allowed: ${gameError instanceof Error ? gameError.message : 'Unknown error'}` });
        }
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
  } catch (error) {
    logger.warn({ socketId: socket.id, error }, 'Invalid socket auth data');
    socket.disconnect();
    return;
  }
}