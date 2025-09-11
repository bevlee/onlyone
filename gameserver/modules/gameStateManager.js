import PQueue from 'p-queue';
import { logger } from '../config/logger.js';

/**
 * Manages game state across multiple rooms with queue-based concurrency control
 * 
 * Example game state structure:
 * this.activeGames = {
 *   "room123": {
 *     stage: "guessWord",           // Current game phase: "chooseCategory" | "writeClues" | "filterClues" | "guessWord"
 *     category: "Animals",          // Selected category
 *     secretWord: "cat",           // Secret word to guess
 *     gamesPlayed: 2,              // Number of rounds completed
 *     gamesWon: 1,                 // Number of successful guesses
 *     playerCount: 3,              // Total players in room
 *     clues: ["furry", "pet", "meow"], // Submitted clues
 *     votes: [0, 0, -1],           // Vote results (non-negative means keep, negative means eliminate)
 *     finishedVoting: true,        // Whether voting phase is complete
 *     guess: "cat",                // Guesser's submitted guess
 *     success: true,               // Whether guess was correct
 *     dedupedClues: ["furry", "pet", "<redacted>"], // Final filtered clues
 *     currentSubmissions: new Set(["user1", "user2"]) // Track submissions for current phase only
 *   },
 *   "room456": {
 *     stage: "chooseCategory",
 *     category: "",
 *     gamesPlayed: 0,
 *     gamesWon: 0,
 *     playerCount: 2
 *   }
 * }
 */
export class GameStateManager {
  constructor() {
    // Store active games by room: { roomName: gameState }
    this.activeGames = {};
    // Store operation queues by room: { roomName: PQueue }
    this.roomQueues = new Map();
  }

  /**
   * Get or create a queue for a specific room
   * @param {string} room - Room name
   * @returns {PQueue} The queue instance for the room
   */
  getQueue(room) {
    if (!this.roomQueues.has(room)) {
      this.roomQueues.set(room, new PQueue({
        concurrency: 1,        // Process one operation at a time per room
        timeout: 10000,        // 10 second timeout for operations
        throwOnTimeout: true,  // Throw error on timeout
        intervalCap: 100,      // Rate limiting: max 100 operations
        interval: 1000         // per 1 second
      }));
      
      logger.debug({ room }, 'Created new queue for room');
    }
    return this.roomQueues.get(room);
  }

  /**
   * Execute an operation on the game state with queue protection
   * @param {string} room - Room name
   * @param {Function} operation - Function that receives the game state and performs the operation
   * @returns {Promise<any>} Result of the operation
   */
  async queueOperation(room, operation) {
    const queue = this.getQueue(room);
    
    return queue.add(async () => {
      const game = this.activeGames[room];
      
      try {
        const result = await operation(game);
        logger.debug({ room, queueSize: queue.size }, 'Operation completed');
        return result;
      } catch (error) {
        logger.error({ room, error: error.message }, 'Queue operation failed');
        throw error;
      }
    });
  }

  /**
   * Initialize a new game for a room
   * @param {string} room - Room name
   * @param {number} playerCount - Number of players in the room
   * @returns {Promise<Object>} The created game state
   */
  async createGame(room, playerCount) {
    return this.queueOperation(room, () => {
      this.activeGames[room] = {
        stage: "chooseCategory",
        category: "",
        gamesPlayed: 0,
        gamesWon: 0,
        playerCount: playerCount,
        currentSubmissions: new Set()
      };
      return this.activeGames[room];
    });
  }

  /**
   * Update game progress counters
   * @param {string} room - Room name
   * @param {number} gamesPlayed - Total games played
   * @param {number} gamesWon - Total games won
   * @returns {Promise<Object>} Updated game state
   */
  async setGameProgress(room, gamesPlayed, gamesWon) {
    return this.queueOperation(room, (game) => {
      if (game) {
        game.gamesPlayed = gamesPlayed;
        game.gamesWon = gamesWon;
        return { gamesPlayed, gamesWon };
      }
      return null;
    });
  }

  /**
   * Transition to a new game stage (clears queue and updates stage)
   * @param {string} room - Room name
   * @param {string} stage - New game stage
   * @returns {Promise<Object>} Updated game state
   */
  async transitionToStage(room, stage) {
    const queue = this.getQueue(room);
    
    // Clear any pending operations from previous stage
    queue.clear();
    logger.debug({ room, stage, clearedOps: queue.size }, 'Cleared queue for stage transition');
    
    return this.queueOperation(room, (game) => {
      if (game) {
        game.stage = stage;
        
        // Reset submissions for the new stage
        if (game.currentSubmissions) {
          game.currentSubmissions.clear();
        }
        
        // Initialize stage-specific data
        switch (stage) {
          case 'writeClues':
            game.clues = [];
            break;
          case 'filterClues':
            if (game.clues) {
              game.votes = new Array(game.clues.length).fill(0);
              game.finishedVoting = false;
            }
            break;
          case 'guessWord':
            game.guess = "";
            break;
        }
        
        return { stage, gameState: game };
      }
      return null;
    });
  }

  /**
   * Set the selected category for the game (direct access - no queue needed)
   * @param {string} room - Room name
   * @param {string} category - Selected category
   * @returns {Object} Updated game state
   */
  setCategory(room, category, username) {
    const game = this.activeGames[room];
    if (game && game.stage === 'chooseCategory') {
      // Check if user already submitted for this phase
      if (game.currentSubmissions && game.currentSubmissions.has(username)) {
        return { success: false, reason: 'User has already submitted a category' };
      }
      
      game.category = category;
      if (game.currentSubmissions) {
        game.currentSubmissions.add(username);
      }
      return { category, success: true };
    }
    return { success: false, reason: 'Invalid stage for category selection' };
  }

  /**
   * Set the secret word for the current round (direct access - no queue needed)
   * @param {string} room - Room name
   * @param {string} secretWord - The secret word to guess
   * @returns {Object} Updated game state
   */
  setSecretWord(room, secretWord) {
    const game = this.activeGames[room];
    if (game) {
      game.secretWord = secretWord;
      return { secretWord, success: true };
    }
    return { success: false, reason: 'Game not found' };
  }

  /**
   * Initialize empty clues array for the round
   * @param {string} room - Room name
   * @returns {Promise<Object>} Updated game state
   */
  async initializeClues(room) {
    return this.queueOperation(room, (game) => {
      if (game) {
        game.clues = [];
        return { clues: [], success: true };
      }
      return { success: false, reason: 'Game not found' };
    });
  }

  /**
   * Add a clue to the current round (thread-safe)
   * @param {string} room - Room name
   * @param {string} clue - Clue submitted by a writer
   * @returns {Promise<Object>} Result of the operation
   */
  async addClue(room, clue) {
    return this.queueOperation(room, (game) => {
      if (game && game.stage === 'writeClues' && game.clues) {
        game.clues.push(clue);
        return { 
          clue, 
          totalClues: game.clues.length, 
          success: true 
        };
      }
      return { 
        success: false, 
        reason: game ? 'Invalid stage for clue submission' : 'Game not found' 
      };
    });
  }

  /**
   * Add a validated clue to the current round (thread-safe)
   * @param {string} room - Room name
   * @param {string} clue - Clue submitted by a writer
   * @param {Function} getStem - Function to normalize words for comparison
   * @returns {Promise<Object>} Result of the operation
   */
  async addValidatedClue(room, clue, getStem, username) {
    return this.queueOperation(room, (game) => {
      if (game && game.stage === 'writeClues' && game.clues) {
        // Check if user already submitted for this phase
        if (game.currentSubmissions && game.currentSubmissions.has(username)) {
          return { success: false, reason: 'User has already submitted a clue' };
        }
        
        // Validate that clue is not the same as secret word
        if (getStem(clue) === getStem(game.secretWord)) {
          return {
            success: false,
            reason: 'Clue cannot be the same as the secret word'
          };
        }
        
        game.clues.push(clue);
        if (game.currentSubmissions) {
          game.currentSubmissions.add(username);
        }
        return { 
          clue, 
          totalClues: game.clues.length, 
          success: true 
        };
      }
      return { 
        success: false, 
        reason: game ? 'Invalid stage for clue submission' : 'Game not found' 
      };
    });
  }

  /**
   * Set voting results for clue filtering (direct access - replaces entire array)
   * @param {string} room - Room name
   * @param {Array<number>} votes - Array of vote values (0=keep, negative=eliminate)
   * @returns {Object} Updated game state
   */
  setVotes(room, votes) {
    const game = this.activeGames[room];
    if (game) {
      game.votes = votes;
      return { votes, success: true };
    }
    return { success: false, reason: 'Game not found' };
  }

  /**
   * Update a single vote (thread-safe)
   * @param {string} room - Room name
   * @param {number} index - Index of the clue to vote on
   * @param {number} value - Vote value (-1, +1)
   * @returns {Promise<Object>} Result of the operation
   */
  async updateVote(room, index, value) {
    return this.queueOperation(room, (game) => {
      if (game && game.stage === 'filterClues' && game.votes && index >= 0 && index < game.votes.length) {
        game.votes[index] = value;
        return { 
          index, 
          value, 
          votes: game.votes, 
          success: true 
        };
      }
      return { 
        success: false, 
        reason: game ? 'Invalid stage or index for voting' : 'Game not found' 
      };
    });
  }

  /**
   * Mark voting phase as complete or in progress (direct access - simple boolean)
   * @param {string} room - Room name
   * @param {boolean} finished - Whether voting is complete
   * @returns {Object} Updated game state
   */
  setFinishedVoting(room, finished) {
    const game = this.activeGames[room];
    if (game) {
      game.finishedVoting = finished;
      return { finishedVoting: finished, success: true };
    }
    return { success: false, reason: 'Game not found' };
  }

  /**
   * Set the guesser's guess for the secret word (direct access - single property)
   * @param {string} room - Room name
   * @param {string} guess - The guesser's guess
   * @returns {Object} Updated game state
   */
  setGuess(room, guess, username) {
    const game = this.activeGames[room];
    if (game && game.stage === 'guessWord') {
      // Check if user already submitted for this phase
      if (game.currentSubmissions && game.currentSubmissions.has(username)) {
        return { success: false, reason: 'User has already submitted a guess' };
      }
      
      game.guess = guess;
      if (game.currentSubmissions) {
        game.currentSubmissions.add(username);
      }
      return { guess, success: true };
    }
    return { 
      success: false, 
      reason: game ? 'Invalid stage for guess submission' : 'Game not found' 
    };
  }

  /**
   * Record the result of the current round
   * @param {string} room - Room name
   * @param {boolean} success - Whether the guess was correct
   * @param {Array<string>} dedupedClues - Final filtered clues used for guessing
   * @returns {Promise<Object>} Updated game state
   */
  async setGameResult(room, success, dedupedClues) {
    return this.queueOperation(room, (game) => {
      if (game) {
        game.success = success;
        game.dedupedClues = dedupedClues;
        game.gamesPlayed++;
        if (success) {
          game.gamesWon++;
        }
        return { 
          success, 
          dedupedClues, 
          gamesPlayed: game.gamesPlayed, 
          gamesWon: game.gamesWon,
          operationSuccess: true 
        };
      }
      return { operationSuccess: false, reason: 'Game not found' };
    });
  }

  /**
   * Get game state for a room (synchronous - safe for read-only access)
   * @param {string} room - Room name
   * @returns {Object} Game state object
   */
  getGame(room) {
    return this.activeGames[room];
  }

  /**
   * Remove game state for a room and cleanup queue
   * @param {string} room - Room name
   * @returns {Promise<Object>} Result of the operation
   */
  async deleteGame(room) {
    const queue = this.roomQueues.get(room);
    
    if (queue) {
      // Wait for any pending operations to complete
      await queue.onIdle();
      
      // Clear any remaining operations
      queue.clear();
      
      // Remove the queue
      this.roomQueues.delete(room);
      
      logger.debug({ room }, 'Cleaned up queue for room');
    }
    
    // Remove the game state
    delete this.activeGames[room];
    
    return { success: true, room };
  }

  /**
   * Check if a game exists for a room
   * @param {string} room - Room name
   * @returns {boolean} True if game exists
   */
  gameExists(room) {
    return room in this.activeGames;
  }

  /**
   * Get queue statistics for monitoring
   * @param {string} room - Room name
   * @returns {Object} Queue statistics
   */
  getQueueStats(room) {
    const queue = this.roomQueues.get(room);
    if (queue) {
      return {
        size: queue.size,
        pending: queue.pending,
        isPaused: queue.isPaused
      };
    }
    return null;
  }

  /**
   * Get all queue statistics for monitoring
   * @returns {Object} All queue statistics
   */
  getAllQueueStats() {
    const stats = {};
    for (const [room, queue] of this.roomQueues) {
      stats[room] = {
        size: queue.size,
        pending: queue.pending,
        isPaused: queue.isPaused
      };
    }
    return stats;
  }

  /**
   * Stop an active game and clean up resources
   * @param {Server} io - Socket.IO server instance
   * @param {string} roomName - Room name
   * @param {ConnectionManager} connectionManager - Connection manager instance
   */
  async stopGame(io, roomName, connectionManager) {
    logger.debug({ roomName }, 'Stopping game in room');
    
    if (this.gameExists(roomName)) {
      const writerRoom = roomName + ".writer";
      const guesserRoom = roomName + ".guesser";

      // Notify all players to return to main scene
      io.to(writerRoom).emit("changeScene", "main", "");
      io.to(guesserRoom).emit("changeScene", "main", "");
      
      // Remove all players from game-specific rooms
      const connections = connectionManager.getConnections(roomName);
      for (let value of Object.values(connections)) {
        value.leaveRoom(writerRoom);
        value.leaveRoom(guesserRoom);
      }
      
      // Clean up game state
      await this.deleteGame(roomName);
    }
  }
}