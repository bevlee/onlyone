import PQueue from 'p-queue';
import { logger } from '../config/logger.js';
import { 
  createInitialGameState, 
  createUserGameState, 
  updateGameState, 
  validateGameState 
} from '../types/GameState.js';

/**
 * Enhanced GameStateManager with unified state broadcasting
 * 
 * This replaces individual socket events (playerJoined, playerLeft, changeScene, etc.)
 * with a single 'gameStateUpdate' event containing the complete game state.
 * 
 * Key improvements over original GameStateManager:
 * - Player management integrated into game state
 * - Single source of truth for all game data
 * - Per-user state customization (hide secret word from guesser)
 * - Atomic operations to prevent race conditions
 * - Built-in broadcasting to all room participants
 */
export class UnifiedGameStateManager {
  constructor() {
    // Store unified game states by room: { roomName: GameState }
    this.gameStates = {};
    // Store operation queues by room: { roomName: PQueue }
    this.roomQueues = new Map();
    // Store socket.io instance for broadcasting
    this.io = null;
  }

  /**
   * Set the Socket.IO instance for broadcasting
   * @param {Server} io - Socket.IO server instance
   */
  setSocketServer(io) {
    this.io = io;
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
      
      logger.debug({ room }, 'Created new queue for unified game state');
    }
    return this.roomQueues.get(room);
  }

  /**
   * Execute an operation on the game state with queue protection and broadcasting
   * @param {string} room - Room name
   * @param {Function} operation - Function that receives and updates the game state
   * @param {boolean} broadcast - Whether to broadcast the updated state (default: true)
   * @returns {Promise<GameState>} Updated game state
   */
  async queueStateOperation(room, operation, broadcast = true) {
    const queue = this.getQueue(room);
    
    return queue.add(async () => {
      let gameState = this.gameStates[room];
      
      // Create initial state if it doesn't exist
      if (!gameState) {
        gameState = createInitialGameState(room);
        this.gameStates[room] = gameState;
      }
      
      try {
        // Apply the operation to get updated state
        const updatedState = await operation(gameState);
        
        // Validate the updated state
        if (!validateGameState(updatedState)) {
          throw new Error('Invalid game state after operation');
        }
        
        // Store the updated state
        this.gameStates[room] = updatedState;
        
        // Broadcast to all clients in the room
        if (broadcast && this.io) {
          await this.broadcastGameState(room);
        }
        
        logger.debug({ room, scene: updatedState.currentScene, players: updatedState.playerCount }, 
          'Game state updated and broadcasted');
        
        return updatedState;
      } catch (error) {
        logger.error({ room, error: error.message }, 'Unified game state operation failed');
        throw error;
      }
    });
  }

  /**
   * Broadcast current game state to all players in a room
   * @param {string} room - Room name
   */
  async broadcastGameState(room) {
    const baseState = this.gameStates[room];
    if (!baseState || !this.io) return;

    // Get all sockets in the room
    const roomSockets = await this.io.in(room).fetchSockets();
    
    for (const socket of roomSockets) {
      const username = socket.handshake.auth.username;
      const userRole = this.getUserRole(room, username);
      
      // Create personalized state for each user
      const userState = createUserGameState(baseState, username, userRole);
      
      // Send personalized state to the user
      socket.emit('gameStateUpdate', userState);
    }
    
    logger.debug({ room, sentTo: roomSockets.length }, 'Broadcasted game state to all players');
  }

  /**
   * Get the role of a user in the current game
   * @param {string} room - Room name
   * @param {string} username - Username
   * @returns {string} User role ('guesser', 'writer', 'voter', 'spectator')
   */
  getUserRole(room, username) {
    const state = this.gameStates[room];
    if (!state || !state.gameStarted) return 'spectator';
    
    // TODO: Implement role assignment logic based on game stage
    // For now, return 'writer' as default when game is active
    switch (state.currentScene) {
      case 'chooseCategory':
        return 'guesser'; // First player is guesser for now
      case 'writeClues':
        return 'writer';
      case 'filterClues':
        return 'voter';
      case 'guessWord':
        return state.players[0] === username ? 'guesser' : 'spectator';
      default:
        return 'spectator';
    }
  }

  /**
   * Add a player to a room and update game state
   * @param {string} room - Room name
   * @param {string} username - Username to add
   * @returns {Promise<GameState>} Updated game state
   */
  async addPlayer(room, username) {
    return this.queueStateOperation(room, (currentState) => {
      // Don't add if player already exists
      if (currentState.players.includes(username)) {
        return currentState;
      }

      const newPlayers = [...currentState.players, username];
      return updateGameState(currentState, {
        players: newPlayers,
        playerCount: newPlayers.length
      });
    });
  }

  /**
   * Remove a player from a room and update game state
   * @param {string} room - Room name
   * @param {string} username - Username to remove
   * @returns {Promise<GameState>} Updated game state
   */
  async removePlayer(room, username) {
    return this.queueStateOperation(room, (currentState) => {
      const newPlayers = currentState.players.filter(p => p !== username);
      
      return updateGameState(currentState, {
        players: newPlayers,
        playerCount: newPlayers.length
      });
    });
  }

  /**
   * Change a player's username
   * @param {string} room - Room name
   * @param {string} oldUsername - Current username
   * @param {string} newUsername - New username
   * @returns {Promise<GameState>} Updated game state
   */
  async changePlayerName(room, oldUsername, newUsername) {
    return this.queueStateOperation(room, (currentState) => {
      // Check if new username is already taken
      if (currentState.players.includes(newUsername) && newUsername !== oldUsername) {
        throw new Error('Username already taken');
      }

      const newPlayers = currentState.players.map(player => 
        player === oldUsername ? newUsername : player
      );
      
      return updateGameState(currentState, {
        players: newPlayers
      });
    });
  }

  /**
   * Start a new game
   * @param {string} room - Room name
   * @returns {Promise<GameState>} Updated game state
   */
  async startGame(room) {
    return this.queueStateOperation(room, (currentState) => {
      return updateGameState(currentState, {
        gameStarted: true,
        currentScene: 'chooseCategory'
      });
    });
  }

  /**
   * Stop the current game
   * @param {string} room - Room name
   * @returns {Promise<GameState>} Updated game state
   */
  async stopGame(room) {
    return this.queueStateOperation(room, (currentState) => {
      return updateGameState(currentState, {
        gameStarted: false,
        currentScene: 'main',
        category: '',
        secretWord: '',
        clues: [],
        dedupedClues: [],
        votes: [],
        guess: '',
        finishedVoting: false
      });
    });
  }

  /**
   * Transition to a new game scene
   * @param {string} room - Room name
   * @param {string} scene - New scene ('chooseCategory', 'writeClues', etc.)
   * @param {Object} sceneData - Additional data for the scene
   * @returns {Promise<GameState>} Updated game state
   */
  async changeScene(room, scene, sceneData = {}) {
    return this.queueStateOperation(room, (currentState) => {
      const updates = {
        currentScene: scene,
        ...sceneData
      };

      // Initialize scene-specific data
      switch (scene) {
        case 'writeClues':
          updates.clues = [];
          break;
        case 'filterClues':
          if (currentState.clues) {
            updates.votes = new Array(currentState.clues.length).fill(0);
            updates.finishedVoting = false;
          }
          break;
        case 'guessWord':
          updates.guess = '';
          break;
      }

      return updateGameState(currentState, updates);
    });
  }

  /**
   * Set game category
   * @param {string} room - Room name
   * @param {string} category - Selected category
   * @returns {Promise<GameState>} Updated game state
   */
  async setCategory(room, category) {
    return this.queueStateOperation(room, (currentState) => {
      return updateGameState(currentState, { category });
    });
  }

  /**
   * Set secret word (only visible to writers)
   * @param {string} room - Room name
   * @param {string} secretWord - Secret word for this round
   * @returns {Promise<GameState>} Updated game state
   */
  async setSecretWord(room, secretWord) {
    return this.queueStateOperation(room, (currentState) => {
      return updateGameState(currentState, { secretWord });
    });
  }

  /**
   * Add a clue to the game
   * @param {string} room - Room name
   * @param {string} clue - Clue submitted by a writer
   * @returns {Promise<GameState>} Updated game state
   */
  async addClue(room, clue) {
    return this.queueStateOperation(room, (currentState) => {
      const newClues = [...currentState.clues, clue];
      return updateGameState(currentState, { clues: newClues });
    });
  }

  /**
   * Update voting for clue filtering
   * @param {string} room - Room name
   * @param {number} index - Index of clue to vote on
   * @param {number} value - Vote value
   * @returns {Promise<GameState>} Updated game state
   */
  async updateVote(room, index, value) {
    return this.queueStateOperation(room, (currentState) => {
      const newVotes = [...currentState.votes];
      if (index >= 0 && index < newVotes.length) {
        newVotes[index] += value;
      }
      return updateGameState(currentState, { votes: newVotes });
    });
  }

  /**
   * Set the guesser's guess
   * @param {string} room - Room name
   * @param {string} guess - Player's guess
   * @returns {Promise<GameState>} Updated game state
   */
  async setGuess(room, guess) {
    return this.queueStateOperation(room, (currentState) => {
      return updateGameState(currentState, { guess });
    });
  }

  /**
   * End the current round with results
   * @param {string} room - Room name
   * @param {boolean} success - Whether guess was correct
   * @param {string[]} dedupedClues - Final filtered clues
   * @returns {Promise<GameState>} Updated game state
   */
  async endRound(room, success, dedupedClues) {
    return this.queueStateOperation(room, (currentState) => {
      return updateGameState(currentState, {
        success,
        dedupedClues,
        gamesPlayed: currentState.gamesPlayed + 1,
        gamesWon: currentState.gamesWon + (success ? 1 : 0),
        currentScene: 'endGame'
      });
    });
  }

  /**
   * Get current game state (read-only)
   * @param {string} room - Room name
   * @returns {GameState} Current game state
   */
  getGameState(room) {
    return this.gameStates[room] || null;
  }

  /**
   * Check if game exists
   * @param {string} room - Room name
   * @returns {boolean} True if game exists
   */
  gameExists(room) {
    return room in this.gameStates;
  }

  /**
   * Delete game and cleanup resources
   * @param {string} room - Room name
   * @returns {Promise<boolean>} Success status
   */
  async deleteGame(room) {
    const queue = this.roomQueues.get(room);
    
    if (queue) {
      await queue.onIdle();
      queue.clear();
      this.roomQueues.delete(room);
    }
    
    delete this.gameStates[room];
    
    logger.debug({ room }, 'Unified game state cleaned up');
    return true;
  }
}