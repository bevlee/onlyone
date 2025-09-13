import { dedupeClues } from "../wordOperations.js";
import { logger } from '../config/logger.js';
import database from './database.js';

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
  }

  /**
   * Main game loop - runs complete game with each player as guesser
   * Game will run one guesser at a time, and the other players will be writers
   * The game will run until all players have been guessers once
   * @param {Object} io - Socket.IO server instance
   * @param {string} room - Room name
   * @param {number} timeLimit - Time limit per phase in seconds
   * @param {Array<string>} difficulties - Available game difficulty levels
   * @param {Function} getStem - Function to get word stem for comparison
   */
  async startGameLoop(io, room, timeLimit, difficulties, getStem) {
    let round = 0;
    let winCount = 0;
    const writerRoom = room + ".writer";   // Room for clue writers
    const guesserRoom = room + ".guesser"; // Room for current guesser
    const connections = this.connectionManager.getConnections(room);
    const playerCount = Object.keys(connections).length;
    
    let currentPlayerIndex = 0;

    // Continue until no players remain in room
    while (this.connectionManager.getConnections(room) && 
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
      await this.cluePhase(io, room, writerRoom, guesserRoom, timeLimit, writers, getStem);
      await this.votingPhase(io, room, writerRoom, guesserRoom, timeLimit);
      const success = await this.guessingPhase(io, room, writerRoom, guesserRoom, timeLimit, getStem);
      
      // Record round results
      await this.gameStateManager.setGameResult(room, success, this.gameStateManager.getGame(room).dedupedClues);
      round++;
      if (success) winCount++;
      
      // Show results and wait for next round signal
      io.to(room).emit("endGame", this.gameStateManager.getGame(room));
      await this.waitForNextRound(io, room);
      
      // Move to next player, cycle back to start when reaching end
      currentPlayerIndex = (currentPlayerIndex + 1) % currentPlayers.length;
    }
    
    // Clean up when room is empty
    await this.gameStateManager.deleteGame(room);
  }

  /**
   * Move the current guesser to the guesser room
   * @param {Object} connections - Player connections object
   * @param {string} guesser - Username of current guesser
   * @param {string} guesserRoom - Guesser room name
   */
  setupGuesserRoom(connections, guesser, guesserRoom) {
    connections[guesser].joinRoom(guesserRoom);
  }

  /**
   * Get all non-guessing players
   * @param {Object} connections - Player connections object
   * @param {string} guesser - Username of current guesser
   * @returns {Array} Array of [username, connection] pairs for writers
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
   * @param {Array} writers - Array of [username, connection] pairs
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
    const game = this.gameStateManager.getGame(room);
    const currentGuesser = game?.currentGuesser;
    
    // Send different states to writers vs guesser
    io.to(writerRoom).emit("chooseDifficulty", "writer", [], currentGuesser);
    io.to(guesserRoom).emit("chooseDifficulty", "guesser", difficulties, currentGuesser);
    
    // Wait for guesser to select difficulty or timeout
    await this.waitForCondition(() => {
      return this.gameStateManager.getGame(room)?.difficulty !== "";
    }, timeLimit);
    
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
   * @param {number} timeLimit - Time limit in seconds
   * @param {Array} writers - Array of writer connections
   */
  async cluePhase(io, room, writerRoom, guesserRoom, timeLimit, writers) {
    const game = this.gameStateManager.getGame(room);
    const difficulty = game.difficulty;
    
    await this.gameStateManager.transitionToStage(room, "writeClues");
    
    // Select secret word using database tracking to avoid repeats
    const secretWord = database.getNextWord(room, difficulty);
    this.gameStateManager.setSecretWord(room, secretWord);
    
    logger.debug({ secretWord, difficulty, room }, 'Selected secret word from database');
    
    // Writers see the secret word, guesser sees nothing
    const currentGuesser = game.currentGuesser;
    io.to(writerRoom).emit("writeClues", "writer", secretWord, currentGuesser);
    io.to(guesserRoom).emit("writeClues", "guesser", "", currentGuesser);

    // Wait for all writers to submit clues
    await this.waitForCondition(() => {
      return this.gameStateManager.getGame(room)?.clues?.length >= writers.length;
    }, timeLimit);

    // Fill in missing clues if some writers didn't submit in time
    const currentGame = this.gameStateManager.getGame(room);
    if (currentGame.clues.length < writers.length) {
      for (let i = currentGame.clues.length; i < writers.length; i++) {
        await this.gameStateManager.addClue(room, "<no answer>");
      }
    }
  }

  /**
   * Voting phase - writers vote to eliminate duplicate/invalid clues
   * @param {Object} io - Socket.IO server instance
   * @param {string} room - Room name
   * @param {string} writerRoom - Writer room name
   * @param {string} guesserRoom - Guesser room name
   * @param {number} timeLimit - Time limit in seconds
   */
  async votingPhase(io, room, writerRoom, guesserRoom, timeLimit) {
    const game = this.gameStateManager.getGame(room);
    const clues = game.clues;
    
    // Hide duplicate clues
    const machineDedupedClues = dedupeClues(clues);
    
    // Initialize vote array (0 = keep, -1 = already eliminated)
    const clueVotes = machineDedupedClues.map((clue) =>
      clue !== "<redacted>" ? 0 : -1
    );
    
    this.gameStateManager.setVotes(room, clueVotes);
    this.gameStateManager.setFinishedVoting(room, false);
    
    logger.debug({ clueVotes }, 'Clue votes array');
    
    // Writers see voting interface, guesser waits
    const currentGuesser = game.currentGuesser;
    io.to(writerRoom).emit("filterClues", "writer", clueVotes, clues, currentGuesser);
    io.to(guesserRoom).emit("filterClues", "guesser", undefined, undefined, currentGuesser);
    await this.gameStateManager.transitionToStage(room, "filterClues");

    // Wait for voting to complete
    await this.waitForCondition(() => {
      return this.gameStateManager.getGame(room)?.finishedVoting;
    }, timeLimit);
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
    const clueVotes = game.votes;
    
    // Apply voting results to remove duplicate clues from guesser
    let dedupedClues = clues.slice();
    for (let i = 0; i < clues.length; i++) {
      dedupedClues[i] = clueVotes[i] >= 0 ? dedupedClues[i] : "<redacted>";
    }

    logger.debug({ dedupedClues, originalClues: clues }, 'Deduped clues vs original clues');
    
    // Writers see both filtered and original clues, guesser only sees filtered
    const currentGuesser = game.currentGuesser;
    io.to(writerRoom).emit("guessWord", "writer", dedupedClues, clues, currentGuesser);
    io.to(guesserRoom).emit("guessWord", "guesser", dedupedClues, [], currentGuesser);
    
    await this.gameStateManager.transitionToStage(room, "guessWord");
    
    // Wait for guesser to submit their guess
    await this.waitForCondition(() => {
      return this.gameStateManager.getGame(room)?.guess !== "";
    }, timeLimit);
    
    // Evaluate the guess against the secret word
    const currentGame = this.gameStateManager.getGame(room);
    const guess = currentGame.guess !== "" ? currentGame.guess : "<no guess>";
    const success = getStem(guess) === currentGame.secretWord;
    
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
          resolve("Condition met!");
        }
      }, 1000);

      // Timeout after specified time
      setTimeout(() => {
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
      let resolved = false;
      
      // Set up a one-time listener for the next round event
      const handler = (socket) => {
        socket.once('nextRound', () => {
          if (!resolved) {
            resolved = true;
            io.off('connection', handler);
            resolve();
          }
        });
      };

      // Listen for any player in the room to trigger next round
      io.on('connection', handler);
      
      // Also listen on existing sockets in the room
      io.in(room).fetchSockets().then(sockets => {
        sockets.forEach(socket => {
          socket.once('nextRound', () => {
            if (!resolved) {
              resolved = true;
              io.off('connection', handler);
              resolve();
            }
          });
        });
      });
    });
  }
}