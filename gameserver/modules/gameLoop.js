import { logger } from '../config/logger.js';
import database from './database.js';
import { randomUUID } from 'node:crypto';
import { SubmittedWords } from './submittedWords.js';
import { RepeatVotes } from './repeatVotes.js';

const submissionGraceSeconds = 2;

/**
 * Manages the main game loop
 * Game phases: difficulty selection, clue writing, voting, and guessing
 */
export class GameLoop {
  /**
   * Initialize GameLoop with required managers
   * @param {GameStateManager} gameStateManager - Manages game state
   * @param {ConnectionManager} connectionManager - Manages player connections
   */
  constructor(gameStateManager, connectionManager) {
    this.gameStateManager = gameStateManager;
    this.connectionManager = connectionManager;
    this.sessions = new Map();
  }

  /**
   * Main game loop - runs complete game with each player as guesser
   * Game will run one guesser at a time, and the other players will be writers
   * The game will run until all players have been guessers once
   * @param {Object} io - Socket.IO server instance
   * @param {string} room - Room name
   * @param {number} timeLimit - Time limit per phase in seconds
   * @param {Array<string>} difficulties - Available game difficulty levels
   * @param {Object} secretWords - Secret words organized by difficulty
   * @param {Function} getStem - Function to get word stem for comparison
   */
  async startGameLoop(io, room, timeLimit, difficulties, secretWords, getStem, mode = 'classic') {
    const session = { mode, active: true, pool: null };
    this.sessions.set(room, session);
    try {
      if (mode === 'yourWords') {
        await this.startSubmittedGame(io, room, timeLimit, getStem, session);
      } else {
        await this.startClassicGame(io, room, timeLimit, difficulties, secretWords, getStem, session);
      }
    } finally {
      if (this.sessions.get(room) === session) {
        this.sessions.delete(room);
        await this.gameStateManager.deleteGame(room);
        io.to(room + '.writer').socketsLeave(room + '.writer');
        io.to(room + '.guesser').socketsLeave(room + '.guesser');
        io.to(room).emit('changeScene', 'main', '');
      }
    }
  }

  /** Run the original word-list mode. */
  async startClassicGame(io, room, timeLimit, difficulties, secretWords, getStem, session) {
    let round = 0;
    let winCount = 0;
    const writerRoom = room + ".writer";   // Room for clue writers
    const guesserRoom = room + ".guesser"; // Room for current guesser
    const connections = this.connectionManager.getConnections(room);
    const playerCount = Object.keys(connections).length;
    
    let currentPlayerIndex = 0;

    // Continue until no players remain in room
    while (session.active && this.connectionManager.getConnections(room) &&
           Object.keys(this.connectionManager.getConnections(room)).length > 0) {
      
      // Refresh player list in case people joined/left
      const currentConnections = this.connectionManager.getConnections(room);
      const currentPlayers = Object.keys(currentConnections);
      
      // Handle case where current player left - reset to start
      if (currentPlayerIndex >= currentPlayers.length) {
        currentPlayerIndex = 0;
      }
      
      const guesser = currentPlayers[currentPlayerIndex];

      await this.gameStateManager.createGame(room, playerCount);
      await this.gameStateManager.setGameProgress(room, round, winCount);
      this.gameStateManager.setCurrentGuesser(room, guesser);
      
      // Clear all players from the rooms
      io.to(writerRoom).socketsLeave(writerRoom);
      io.to(guesserRoom).socketsLeave(guesserRoom);

      // Assign players to appropriate rooms (writer vs guesser)
      this.setupGuesserRoom(currentConnections, guesser, guesserRoom);
      const writers = this.getWriters(currentConnections, guesser);
      this.setupWriterRooms(writers, writerRoom, guesserRoom);
      
      // Run through all game phases
      await this.difficultyPhase(io, room, writerRoom, guesserRoom, difficulties, timeLimit);
      if (!session.active) return;
      await this.cluePhase(io, room, writerRoom, guesserRoom, secretWords, timeLimit, writers);
      if (!session.active) return;
      await this.votingPhase(io, room, writerRoom, guesserRoom, timeLimit, writers);
      if (!session.active) return;
      const success = await this.guessingPhase(io, room, writerRoom, guesserRoom, timeLimit, getStem);
      
      // Record round results
      if (!session.active) return;
      await this.gameStateManager.setGameResult(room, success, this.gameStateManager.getGame(room).dedupedClues);
      round++;
      if (success) winCount++;
      
      // Show results and wait for next round signal
      io.to(room).emit("endGame", this.gameStateManager.getGame(room));
      await this.waitForNextRound(io, room);
      if (!session.active) return;
      
      // Move to next player, cycle back to start when reaching end
      currentPlayerIndex = (currentPlayerIndex + 1) % currentPlayers.length;
    }
    
  }

  /** Start a server-owned deadline, with a unique ID to reject delayed prior-phase input. */
  startPhaseTimer(room, seconds) {
    const game = this.gameStateManager.getGame(room);
    const serverNow = Date.now();
    game.phaseId = randomUUID();
    game.deadlineAt = serverNow + seconds * 1000;
    return { phaseId: game.phaseId, deadlineAt: game.deadlineAt, serverNow };
  }

  /** Allow a short delivery grace period for answers sent when the countdown reaches zero. */
  acceptsSubmission(room, phaseId) {
    const game = this.gameStateManager.getGame(room);
    return Boolean(game && game.phaseId === phaseId && Date.now() <= game.deadlineAt + submissionGraceSeconds * 1000);
  }

  /** Collect private answers once, then reuse the existing clue/vote/guess phases. */
  async startSubmittedGame(io, room, timeLimit, getStem, session) {
    const connections = () => Object.entries(this.connectionManager.getConnections(room));
    const ids = () => connections().map(([, connection]) => connection.playerId);
    session.pool = new SubmittedWords(ids());
    await this.gameStateManager.createGame(room, ids().length);
    await this.gameStateManager.transitionToStage(room, 'submitWords');
    const timing = this.startPhaseTimer(room, 180);
    io.to(room).emit('submitWords', session.pool.progress(ids()), timing);
    await this.waitForCondition(() => {
      const progress = session.pool.progress(ids());
      io.to(room).emit('wordSubmissionProgress', progress);
      return !session.active || ids().length < 3 || progress.submitted === progress.total;
    }, 180 + submissionGraceSeconds);
    let round = 0;
    let wins = 0;
    const writerRoom = room + '.writer';
    const guesserRoom = room + '.guesser';
    while (session.active && ids().length >= 3) {
      const selected = session.pool.draw(ids());
      if (!selected) break;
      const guesser = selected.guesserId;
      await this.gameStateManager.createGame(room, ids().length);
      await this.gameStateManager.setGameProgress(room, round, wins);
      const game = this.gameStateManager.getGame(room);
      game.mode = 'yourWords';
      game.submittedByIds = selected.authorIds;
      this.gameStateManager.setCurrentGuesser(room, guesser);
      io.to(writerRoom).socketsLeave(writerRoom);
      io.to(guesserRoom).socketsLeave(guesserRoom);
      this.setupGuesserRoom(this.connectionManager.getConnections(room), guesser, guesserRoom);
      const writers = this.getWriters(this.connectionManager.getConnections(room), guesser);
      this.setupWriterRooms(writers, writerRoom);
      await this.cluePhase(io, room, writerRoom, guesserRoom, {}, timeLimit, writers, selected.word);
      if (!session.active) return;
      await this.votingPhase(io, room, writerRoom, guesserRoom, timeLimit, writers);
      if (!session.active) return;
      const success = await this.guessingPhase(io, room, writerRoom, guesserRoom, timeLimit, getStem);
      if (!session.active) return;
      await this.gameStateManager.setGameResult(room, success, game.dedupedClues);
      round++;
      if (success) wins++;
      game.poolRemaining = session.pool.remaining(ids());
      game.poolFinished = game.poolRemaining === 0;
      io.to(room).emit('endGame', game);
      await this.waitForNextRound(io, room);
      if (game.poolFinished) break;
    }
    if (session.active) {
      io.to(room).emit('gameNotice', ids().length < 3 ? 'Not enough players to continue. At least 3 players are needed.' : round ? 'Your words game finished. Start another game to add new words.' :
        'No playable words. Answers submitted by everyone are excluded. Try again with different answers.');
    }
  }

  /** Cancel the current loop before its state is deleted. */
  cancel(room) {
    const session = this.sessions.get(room);
    if (session) session.active = false;
  }

  /**
   * Move the current guesser to the guesser room
   * @param {Object} connections - Player connections object
   * @param {string} guesser - Stable ID of current guesser
   * @param {string} guesserRoom - Guesser room name
   */
  setupGuesserRoom(connections, guesser, guesserRoom) {
    connections[guesser].joinRoom(guesserRoom);
  }

  /**
   * Get all non-guessing players
   * @param {Object} connections - Player connections object
   * @param {string} guesser - Stable ID of current guesser
   * @returns {Array} Array of [playerId, connection] pairs for writers
   */
  getWriters(connections, guesser) {
    const writers = [];
    const allPlayers = Object.entries(connections);
    
    // Return all players except guesser
    for (let [playerKey, playerValue] of allPlayers) {
      if (playerKey !== guesser) {
        writers.push([playerKey, playerValue]);
      }
    }
    
    return writers;
  }

  /**
   * Move writers to the writer room and out of guesser room
   * @param {Array} writers - Array of [playerId, connection] pairs
   * @param {string} writerRoom - Writer room name
   */
  setupWriterRooms(writers, writerRoom) {
    for (let [playerKey, playerValue] of writers) {
      playerValue.joinRoom(writerRoom);
    }
  }

  /**
   * Difficulty selection phase - guesser chooses difficulty
   * @param {Object} io - Socket.IO server instance
   * @param {string} room - Room name
   * @param {string} writerRoom - Writer room name
   * @param {string} guesserRoom - Guesser room name
   * @param {Array} difficulties - Available difficulty levels
   * @param {number} timeLimit - Time limit in seconds
   */
  async difficultyPhase(io, room, writerRoom, guesserRoom, difficulties, timeLimit) {
    // Send different states to writers vs guesser
    const game = this.gameStateManager.getGame(room);
    const currentGuesser = game.currentGuesserId;
    const timing = this.startPhaseTimer(room, timeLimit);
    io.to(writerRoom).emit("chooseDifficulty", "writer", [], currentGuesser, timing);
    io.to(guesserRoom).emit("chooseDifficulty", "guesser", difficulties, currentGuesser, timing);
    
    // Wait for guesser to select difficulty or timeout
    await this.waitForCondition(() => {
      return !this.gameStateManager.getGame(room) || this.gameStateManager.getGame(room).difficulty !== "";
    }, timeLimit + submissionGraceSeconds);
    
    logger.debug({ room }, 'Choose difficulty condition finished');
    
    // Auto-select random difficulty if none chosen
    if (this.gameStateManager.getGame(room)?.difficulty === "") {
      const randomDifficulty = difficulties[this.getRandomSelection(difficulties.length)];
      this.gameStateManager.setDifficulty(room, randomDifficulty);
    }
  }

  /**
   * Clue writing phase - writers submit clues for secret word
   * @param {Object} io - Socket.IO server instance
   * @param {string} room - Room name
   * @param {string} writerRoom - Writer room name
   * @param {string} guesserRoom - Guesser room name
   * @param {Object} secretWords - Secret words by difficulty
   * @param {number} timeLimit - Time limit in seconds
   * @param {Array} writers - Array of writer connections
   */
  async cluePhase(io, room, writerRoom, guesserRoom, secretWords, timeLimit, writers, submittedWord) {
    const game = this.gameStateManager.getGame(room);
    const difficulty = game.difficulty;
    
    await this.gameStateManager.transitionToStage(room, "writeClues");
    
    // Select secret word using database tracking to avoid repeats
    const secretWord = submittedWord ?? database.getNextWord(room, difficulty, secretWords[difficulty]);
    this.gameStateManager.setSecretWord(room, secretWord);
    
    logger.debug({ secretWord, difficulty, room }, 'Selected secret word');
    
    // Writers see the secret word, guesser sees nothing
    const currentGuesser = game.currentGuesserId;
    const timing = this.startPhaseTimer(room, timeLimit);
    io.to(writerRoom).emit("writeClues", "writer", secretWord, currentGuesser, timing);
    io.to(guesserRoom).emit("writeClues", "guesser", "", currentGuesser, timing);

    // Wait for all writers to submit clues
    await this.waitForCondition(() => {
      return !this.gameStateManager.getGame(room) || this.gameStateManager.getGame(room).clues?.length >= writers.length;
    }, timeLimit + submissionGraceSeconds);

    // Fill in missing clues if some writers didn't submit in time
    const currentGame = this.gameStateManager.getGame(room);
    if (!currentGame) return;
    if (currentGame.clues.length < writers.length) {
      for (let i = currentGame.clues.length; i < writers.length; i++) {
        await this.gameStateManager.addClue(room, "<no answer>");
      }
    }
  }

  /**
   * Voting phase - writers mark repeated clues; a majority vote removes a clue
   * @param {Object} io - Socket.IO server instance
   * @param {string} room - Room name
   * @param {string} writerRoom - Writer room name
   * @param {string} guesserRoom - Guesser room name
   * @param {number} timeLimit - Time limit in seconds
   * @param {Array} writers - Array of [playerId, connection] pairs for this round's writers
   */
  async votingPhase(io, room, writerRoom, guesserRoom, timeLimit, writers) {
    const game = this.gameStateManager.getGame(room);
    const clues = game.clues;

    await this.gameStateManager.transitionToStage(room, "filterClues");
    game.repeatVotes = new RepeatVotes(clues, writers.map(([playerId]) => playerId));

    const currentGuesser = game.currentGuesserId;
    const timing = this.startPhaseTimer(room, timeLimit);
    io.to(writerRoom).emit("filterClues", "writer", game.repeatVotes.publicState(), clues, currentGuesser, timing);
    io.to(guesserRoom).emit("filterClues", "guesser", null, [], currentGuesser, timing);

    // Finish when every connected writer has pressed Done, or on timeout
    await this.waitForCondition(() => {
      const current = this.gameStateManager.getGame(room);
      if (!current) return true;
      const connectedIds = Object.values(this.connectionManager.getConnections(room)).map((c) => c.playerId);
      return current.repeatVotes.allDone(connectedIds);
    }, timeLimit + submissionGraceSeconds);
  }

  /**
   * Guessing phase - guesser tries to guess secret word from filtered clues
   * @param {Object} io - Socket.IO server instance
   * @param {string} room - Room name
   * @param {string} writerRoom - Writer room name
   * @param {string} guesserRoom - Guesser room name
   * @param {number} timeLimit - Time limit in seconds
   * @param {Function} getStem - Function to normalize words for comparison
   * @returns {boolean} True if guess was correct
   */
  async guessingPhase(io, room, writerRoom, guesserRoom, timeLimit, getStem) {
    const game = this.gameStateManager.getGame(room);
    const clues = game.clues;
    const removed = game.repeatVotes.removed();

    // Hide clues the writers marked as repeated
    const dedupedClues = clues.map((clue, i) => (removed[i] ? "<redacted>" : clue));

    logger.debug({ dedupedClues, originalClues: clues }, 'Deduped clues vs original clues');

    await this.gameStateManager.transitionToStage(room, "guessWord");

    // Writers see both filtered and original clues, guesser only sees filtered
    const currentGuesser = game.currentGuesserId;
    const timing = this.startPhaseTimer(room, timeLimit);
    io.to(writerRoom).emit("guessWord", "writer", dedupedClues, clues, currentGuesser, timing);
    io.to(guesserRoom).emit("guessWord", "guesser", dedupedClues, [], currentGuesser, timing);
    
    // Wait for guesser to submit their guess
    await this.waitForCondition(() => {
      return !this.gameStateManager.getGame(room) || this.gameStateManager.getGame(room).guess !== "";
    }, timeLimit + submissionGraceSeconds);
    
    // Evaluate the guess against the secret word
    const currentGame = this.gameStateManager.getGame(room);
    if (!currentGame) return false;
    const guess = currentGame.guess !== "" ? currentGame.guess : "<no guess>";
    const success = getStem(guess) === getStem(currentGame.secretWord);
    
    // Store final clues for end game display
    game.dedupedClues = dedupedClues;
    
    return success;
  }

  /**
   * Generate random integer from 0 to upperBound-1
   * @param {number} upperBound - Upper limit (exclusive)
   * @returns {number} Random integer
   */
  getRandomSelection(upperBound) {
    return Math.floor(Math.random() * upperBound);
  }

  /**
   * Wait for a condition to be met or timeout
   * @param {Function} checkCondition - Function that returns true when condition is met
   * @param {number} timeoutSeconds - Maximum time to wait in seconds
   * @returns {Promise<string>} Resolution message
   */
  waitForCondition(checkCondition, timeoutSeconds = 30) {
    const timeout = timeoutSeconds * 1000;
    return new Promise((resolve) => {
      // Check condition every second
      const intervalId = setInterval(() => {
        logger.debug('Checking for condition in game loop');
        if (checkCondition()) {
          clearInterval(intervalId);
          clearTimeout(timeoutId);
          resolve("Condition met!");
        }
      }, 1000);

      // Timeout after specified time
      const timeoutId = setTimeout(() => {
        clearInterval(intervalId);
        resolve("Timeout: Condition not met within the given time");
      }, timeout);
    });
  }

  /**
   * Wait for a player to signal the next round should start
   * @param {Object} io - Socket.io server instance
   * @param {string} room - Room identifier
   * @returns {Promise} Promise that resolves when next round is triggered
   */
  waitForNextRound(io, room) {
    return new Promise((resolve) => {
      const listeners = new Map();
      let resolved = false;
      const finish = () => {
        if (resolved) return;
        resolved = true;
        clearInterval(interval);
        io.off('connection', attach);
        for (const [socket, listener] of listeners) socket.off('nextRound', listener);
        resolve();
      };
      const attach = socket => {
        if (resolved || socket.handshake.auth.room !== room) return;
        listeners.set(socket, finish);
        socket.once('nextRound', finish);
      };
      const interval = setInterval(() => {
        if (!this.sessions.get(room)?.active || !Object.keys(this.connectionManager.getConnections(room)).length) finish();
      }, 250);
      io.on('connection', attach);
      io.in(room).fetchSockets().then(sockets => sockets.forEach(attach));
    });
  }
}
