import { fileURLToPath } from 'node:url';
import { OriginalWordLists } from './modules/originalWordLists.js';
import { createOriginalWordListsApi } from './handlers/originalWordListsApi.js';
// Core server imports
import { createServer } from "node:http";

// Chat event handlers
import { 
  handleChatMessage, 
  handleChangeName, 
  handleDisconnect 
} from "./handlers/chatHandlers.js";

// Game configuration and utilities
import { difficulties, secretWords } from "./data/data.js";
import { getStem } from "./wordOperations.js";

// Modular components
import { createExpressServer, createSocketServer, startServer } from "./config/serverConfig.js";
import { playerIdFromToken } from './modules/playerIdentity.js';
import { ConnectionManager } from "./modules/connectionManager.js";
import { GameStateManager } from "./modules/gameStateManager.js";
import { GameLoop } from "./modules/gameLoop.js";
import { logger } from "./config/logger.js";
import database from "./modules/database.js";

// Initialize Express app and HTTP server
const originalWordLists = new OriginalWordLists({
  filePath: process.env.ORIGINAL_WORDS_PATH || fileURLToPath(new URL('./data/original-word-lists.json', import.meta.url)),
  defaults: secretWords,
});
const app = createExpressServer();
app.use('/api/original-words', createOriginalWordListsApi({
  store: originalWordLists,
  apiKey: process.env.ORIGINAL_WORDS_API_KEY,
  adminPassword: process.env.ORIGINAL_WORDS_ADMIN_PASSWORD,
  logger,
}));
const server = createServer(app);
const io = createSocketServer(server);

// Initialize game management modules
const connectionManager = new ConnectionManager();
const gameStateManager = new GameStateManager();
const gameLoop = new GameLoop(gameStateManager, connectionManager);

io.use((socket, next) => {
  try {
    socket.data.playerId = playerIdFromToken(socket.handshake.auth.resumeToken);
    next();
  } catch (error) {
    next(error);
  }
});

// Handle new socket connections
io.on("connection", async (socket) => {
  // Clean up any existing listeners to prevent duplicates
  socket.removeAllListeners("startGame");

  const previous = connectionManager.addConnection(socket);
  const room = socket.handshake.auth.room;
  const playerId = socket.data.playerId;
  if (previous && previous.socketId !== socket.id) {
    io.sockets.sockets.get(previous.socketId)?.disconnect(true);
  }
  socket.join(room);
  socket.emit('playerIdentity', playerId);
  io.to(room).emit('roomPlayers', connectionManager.getRoster(room));

  socket.on('chat message', handleChatMessage());
  socket.on('changeName', handleChangeName(connectionManager, io, socket));
  socket.on('disconnect', handleDisconnect(connectionManager, socket));

  // Game flow event handlers
  socket.on("startGame", (options, callback) => {
    if (typeof options === 'function') {
      callback = options;
      options = { mode: 'classic' };
    }
    const reply = response => { if (typeof callback === 'function') callback(response); };
    const mode = options?.mode ?? 'classic';
    if (!['classic', 'yourWords'].includes(mode)) {
      return reply({ status: 'error', message: 'Choose a valid game mode.' });
    }
    if (gameLoop.sessions.has(room) || gameStateManager.gameExists(room)) {
      return reply({ status: 'error', message: 'Game already in progress' });
    }
    if (Object.keys(connectionManager.getConnections(room)).length < 3) {
      return reply({ status: 'error', message: 'At least 3 players are needed.' });
    }
    gameLoop.startGameLoop(io, room, 30, difficulties, originalWordLists.words, getStem, mode).catch(error => {
      logger.error({ room, error }, 'Game loop failed');
      io.to(room).emit('gameNotice', 'The game stopped unexpectedly. Please start another game.');
    });
    reply({ status: 'ok' });
  });

  socket.on('submitWords', (answers, phaseId, callback) => {
    const session = gameLoop.sessions.get(room);
    const result = session?.active && gameStateManager.getGame(room)?.stage === 'submitWords' && gameLoop.acceptsSubmission(room, phaseId)
      ? session.pool.submit(playerId, answers)
      : { success: false, reason: 'Word submission has finished.' };
    if (typeof callback === 'function') callback(result);
    if (result.success) {
      const ids = Object.values(connectionManager.getConnections(room)).map(c => c.playerId);
      io.to(room).emit('wordSubmissionProgress', session.pool.progress(ids));
    }
  });

  socket.on("stopGame", async () => {
    gameLoop.cancel(room);
    await gameStateManager.stopGame(io, room, connectionManager);
  });

  const isGuesser = () => {
    const game = gameStateManager.getGame(room);
    return game?.currentGuesserId === playerId;
  };

  socket.on("chooseDifficulty", (difficulty, phaseId) => {
    if (!gameLoop.acceptsSubmission(room, phaseId) || !isGuesser() || !difficulties.includes(difficulty)) return;
    gameStateManager.setDifficulty(room, difficulty);
  });
  
  socket.on("submitClue", async (clue, phaseId) => {
    if (!gameLoop.acceptsSubmission(room, phaseId) || isGuesser() || typeof clue !== 'string' || clue.length > 60) return;
    const game = gameStateManager.getGame(room);
    if (!game || game.stage !== 'writeClues') return;
    game.clueAuthors ??= new Set();
    if (game.clueAuthors.has(playerId)) return;
    game.clueAuthors.add(playerId);
    const result = await gameStateManager.addValidatedClue(room, clue.trim() || '<no answer>', getStem);
    if (!result.success) game.clueAuthors.delete(playerId);
    // Note: Could emit validation result back to client if needed
    // socket.emit("clueValidationResult", result);
  });
  
  const broadcastRepeatVotes = () => {
    const votes = gameStateManager.getGame(room).repeatVotes;
    io.to(room + ".writer").emit("repeatVotes", votes.publicState());
  };

  socket.on("markRepeated", (index, marked, phaseId) => {
    if (!gameLoop.acceptsSubmission(room, phaseId)) return;
    const votes = gameStateManager.getGame(room)?.repeatVotes;
    if (votes?.setMark(playerId, index, marked)) broadcastRepeatVotes();
  });

  socket.on("finishVoting", (phaseId) => {
    if (!gameLoop.acceptsSubmission(room, phaseId)) return;
    const votes = gameStateManager.getGame(room)?.repeatVotes;
    if (votes?.finish(playerId)) broadcastRepeatVotes();
  });

  socket.on("guessWord", (guess, phaseId) => {
    if (!gameLoop.acceptsSubmission(room, phaseId) || !isGuesser() || typeof guess !== 'string' || guess.length > 60) return;
    gameStateManager.setGuess(room, guess);
  });
  
  socket.on("nextRound", () => {
    logger.debug({ room, playerId }, 'Player triggered next round');
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

