// Core server imports
import { createServer } from "node:http";

// Game event handlers
import { 
  handleStartGame, 
  handleStopGame, 
  handleChooseCategory, 
  handleSubmitClue, 
  handleUpdateVotes, 
  handleFinishVoting, 
  handleGuessWord 
} from "./handlers/gameHandlers.js";

// Chat event handlers
import { 
  handleChatMessage, 
  handleChangeName, 
  handleDisconnect 
} from "./handlers/chatHandlers.js";

// Game configuration and utilities
import { categories, secretWords } from "./config.js";
import { getStem } from "./wordOperations.js";

// Modular components
import { createExpressServer, createSocketServer, startServer } from "./config/serverConfig.js";
import { ConnectionManager } from "./modules/connectionManager.js";
import { GameStateManager } from "./modules/gameStateManager.js";
import { GameLoop } from "./modules/gameLoop.js";
import { stopGame } from "./utils/gameUtils.js";
import { logger } from "./config/logger.js";

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
  socket.on("startGame", handleStartGame(io, room, gameStateManager.activeGames, startGameLoopBound));
  
  socket.on("stopGame", handleStopGame(io, (io, roomName) => stopGame(io, roomName, gameStateManager, connectionManager)));
  
  socket.on("chooseCategory", handleChooseCategory(gameStateManager.activeGames, room));
  
  socket.on("submitClue", handleSubmitClue(gameStateManager.activeGames, room));
  
  socket.on("updateVotes", handleUpdateVotes(gameStateManager.activeGames, room, socket));
  
  socket.on("finishVoting", handleFinishVoting(gameStateManager.activeGames, room));
  
  socket.on("guessWord", handleGuessWord(gameStateManager.activeGames, room));

  // Handle socket recovery (for connection state recovery)
  if (!socket.recovered) {
    // Socket connection was not recovered from previous session
    logger.debug({ socketId: socket.id }, 'Socket connection not recovered from previous session');
  }
});

// Start the server on port 3000
startServer(server, 3000);

