// Core server imports
import { createServer } from "node:http";

// Chat event handlers
import { 
  handleChatMessage, 
  handleChangeName, 
  handleDisconnect 
} from "./handlers/chatHandlers.js";

// Game configuration and utilities
import { difficulties } from "./data/data.js";
import { getStem } from "./wordOperations.js";

// Modular components
import { createExpressServer, createSocketServer, startServer } from "./config/serverConfig.js";
import { ConnectionManager } from "./modules/connectionManager.js";
import { GameStateManager } from "./modules/gameStateManager.js";
import { GameLoop } from "./modules/gameLoop.js";
import { logger } from "./config/logger.js";
import database from "./modules/database.js";

// Initialize Express app and HTTP server
const app = createExpressServer();
const server = createServer(app);
const io = createSocketServer(server);

// Initialize game management modules
const connectionManager = new ConnectionManager();
const gameStateManager = new GameStateManager();
const gameLoop = new GameLoop(gameStateManager, connectionManager);

// Handle new socket connections
io.on("connection", async (socket) => {
  // Clean up any existing listeners to prevent duplicates
  socket.removeAllListeners("startGame");

  // Add connection to our connection manager
  connectionManager.addConnection(socket);
  const room = socket.handshake.auth.room;
  const username = socket.handshake.auth.username;
  socket.join(room);

  // Setup chat event handlers
  socket.on("chat message", handleChatMessage());
  
  // Notify other players in room about new player
  socket.to(room).emit("playerJoined", username);
  let rooms = io.sockets.adapter.rooms;
  logger.debug({ rooms, room, username }, 'New client connected');
  
  // Send current room state to the new player
  socket.emit("joinRoom", connectionManager.getConnections(room));

  // Handle player name changes
  socket.on("changeName", handleChangeName(connectionManager.getAllConnections(), io));

  // Handle player disconnections
  socket.on("disconnect", handleDisconnect(connectionManager.removeConnection.bind(connectionManager), socket, room, username, io));

  // Setup game event handlers
  // Bind the game loop with required dependencies
  const startGameLoopBound = (io, room, timeLimit) => {
    return gameLoop.startGameLoop(io, room, timeLimit, difficulties, getStem);
  };

  // Game flow event handlers
  socket.on("startGame", (callback) => {
    try {
      if (!(room in gameStateManager.activeGames)) {
        startGameLoopBound(io, room, 30);
        if (callback && typeof callback === 'function') {
          callback({ status: 'ok', message: 'Game started successfully' });
        }
      } else {
        if (callback && typeof callback === 'function') {
          callback({ status: 'error', message: 'Game already in progress' });
        }
      }
    } catch (error) {
      console.error('Error starting game:', error);
      if (callback && typeof callback === 'function') {
        callback({ status: 'error', message: 'Failed to start game' });
      }
    }
  });
  
  socket.on("stopGame", async (roomName) => await gameStateManager.stopGame(io, roomName, connectionManager));
  
  socket.on("chooseDifficulty", (difficulty) => {
    gameStateManager.setDifficulty(room, difficulty);
  });
  
  socket.on("submitClue", async (clue) => {
    const result = await gameStateManager.addValidatedClue(room, clue, getStem);
    // Note: Could emit validation result back to client if needed
    // socket.emit("clueValidationResult", result);
  });
  
  socket.on("updateVotes", async (index, value) => {
    const result = await gameStateManager.updateVote(room, index, value);
    if (result.success) {
      const writerRoom = room + ".writer";
      socket.to(writerRoom).emit("updateVotes", index, value);
    }
  });
  
  socket.on("finishVoting", () => {
    gameStateManager.setFinishedVoting(room, true);
  });
  
  socket.on("guessWord", (guess) => {
    gameStateManager.setGuess(room, guess);
  });
  
  socket.on("nextRound", () => {
    logger.debug({ room, username }, 'Player triggered next round');
    // Event is handled by the waitForNextRound Promise in gameLoop
  });

  // Handle socket recovery (for connection state recovery)
  if (!socket.recovered) {
    // Socket connection was not recovered from previous session
    logger.debug({ socketId: socket.id }, 'Socket connection not recovered from previous session');
  }
});

// Initialize database and start server
async function initializeAndStart() {
  try {
    // Initialize database
    await database.initialize();
    logger.info('Database initialized successfully');
    
    // Start the server on configured port
    const port = process.env.GAMESERVER_PORT || 3000;
    startServer(server, port);
  } catch (error) {
    logger.error({ error }, 'Failed to initialize server');
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully');
  await database.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully');
  await database.close();
  process.exit(0);
});

initializeAndStart();

