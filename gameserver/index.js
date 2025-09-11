// Core server imports
import { createServer } from "node:http";

// Chat event handlers
import { 
  handleChatMessage, 
  handleChangeName, 
  handleDisconnect 
} from "./handlers/chatHandlers.js";

// Game configuration and utilities
import { categories, secretWords } from "./data/data.js";
import { getStem } from "./wordOperations.js";

// Modular components
import { createExpressServer, createSocketServer, startServer } from "./config/serverConfig.js";
import { ConnectionManager } from "./modules/connectionManager.js";
import { GameStateManager } from "./modules/gameStateManager.js";
import { GameLoop } from "./modules/gameLoop.js";
import { logger } from "./config/logger.js";
import { DEFAULT_TIMER_SECONDS } from "./config/gameConfig.js";

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
    return gameLoop.startGameLoop(io, room, timeLimit, categories, secretWords, getStem);
  };

  // Game flow event handlers
  socket.on("startGame", () => {
    if (!(room in gameStateManager.activeGames)) {
      startGameLoopBound(io, room, DEFAULT_TIMER_SECONDS);
    }
  });
  
  socket.on("stopGame", async (roomName) => await gameStateManager.stopGame(io, roomName, connectionManager));
  
  socket.on("chooseCategory", (category) => {
    const result = gameStateManager.setCategory(room, category, username);
    if (!result.success) {
      logger.warn({ room, username, reason: result.reason }, 'Category submission rejected');
      socket.emit('submissionRejected', { phase: 'chooseCategory', reason: result.reason });
    }
  });
  
  socket.on("submitClue", async (clue) => {
    const result = await gameStateManager.addValidatedClue(room, clue, getStem, username);
    if (!result.success) {
      logger.warn({ room, username, reason: result.reason }, 'Clue submission rejected');
      socket.emit('submissionRejected', { phase: 'writeClues', reason: result.reason });
    }
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
    const result = gameStateManager.setGuess(room, guess, username);
    if (!result.success) {
      logger.warn({ room, username, reason: result.reason }, 'Guess submission rejected');
      socket.emit('submissionRejected', { phase: 'guessWord', reason: result.reason });
    }
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

// Start the server on configured port
const port = process.env.GAMESERVER_PORT || 3000;
startServer(server, port);

