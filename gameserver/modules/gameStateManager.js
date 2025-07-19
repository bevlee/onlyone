/**
 * Manages game state across multiple rooms
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
 *     dedupedClues: ["furry", "pet", "<redacted>"] // Final filtered clues
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
  }

  /**
   * Initialize a new game for a room
   * @param {string} room - Room name
   * @param {number} playerCount - Number of players in the room
   */
  createGame(room, playerCount) {
    this.activeGames[room] = {
      stage: "chooseCategory",
      category: "",
      gamesPlayed: 0,
      gamesWon: 0,
      playerCount: playerCount,
    };
  }

  /**
   * Update game progress counters
   * @param {string} room - Room name
   * @param {number} gamesPlayed - Total games played
   * @param {number} gamesWon - Total games won
   */
  setGameProgress(room, gamesPlayed, gamesWon) {
    if (this.activeGames[room]) {
      this.activeGames[room].gamesPlayed = gamesPlayed;
      this.activeGames[room].gamesWon = gamesWon;
    }
  }

  /**
   * Update the current game stage
   * @param {string} room - Room name
   * @param {string} stage - New game stage
   */
  updateGameStage(room, stage) {
    if (this.activeGames[room]) {
      this.activeGames[room].stage = stage;
    }
  }

  /**
   * Set the selected category for the game
   * @param {string} room - Room name
   * @param {string} category - Selected category
   */
  setCategory(room, category) {
    if (this.activeGames[room]) {
      this.activeGames[room].category = category;
    }
  }

  /**
   * Set the secret word for the current round
   * @param {string} room - Room name
   * @param {string} secretWord - The secret word to guess
   */
  setSecretWord(room, secretWord) {
    if (this.activeGames[room]) {
      this.activeGames[room].secretWord = secretWord;
    }
  }

  /**
   * Initialize empty clues array for the round
   * @param {string} room - Room name
   */
  initializeClues(room) {
    if (this.activeGames[room]) {
      this.activeGames[room].clues = [];
    }
  }

  /**
   * Add a clue to the current round
   * @param {string} room - Room name
   * @param {string} clue - Clue submitted by a writer
   */
  addClue(room, clue) {
    if (this.activeGames[room] && this.activeGames[room].clues) {
      this.activeGames[room].clues.push(clue);
    }
  }

  /**
   * Set voting results for clue filtering
   * @param {string} room - Room name
   * @param {Array<number>} votes - Array of vote values (0=keep, negative=eliminate)
   */
  setVotes(room, votes) {
    if (this.activeGames[room]) {
      this.activeGames[room].votes = votes;
    }
  }

  /**
   * Mark voting phase as complete or in progress
   * @param {string} room - Room name
   * @param {boolean} finished - Whether voting is complete
   */
  setFinishedVoting(room, finished) {
    if (this.activeGames[room]) {
      this.activeGames[room].finishedVoting = finished;
    }
  }

  /**
   * Set the guesser's guess for the secret word
   * @param {string} room - Room name
   * @param {string} guess - The guesser's guess
   */
  setGuess(room, guess) {
    if (this.activeGames[room]) {
      this.activeGames[room].guess = guess;
    }
  }

  /**
   * Record the result of the current round
   * @param {string} room - Room name
   * @param {boolean} success - Whether the guess was correct
   * @param {Array<string>} dedupedClues - Final filtered clues used for guessing
   */
  setGameResult(room, success, dedupedClues) {
    if (this.activeGames[room]) {
      this.activeGames[room].success = success;
      this.activeGames[room].dedupedClues = dedupedClues;
      this.activeGames[room].gamesPlayed++;
      if (success) {
        this.activeGames[room].gamesWon++;
      }
    }
  }

  /**
   * Get game state for a room
   * @param {string} room - Room name
   * @returns {Object} Game state object
   */
  getGame(room) {
    return this.activeGames[room];
  }

  /**
   * Remove game state for a room
   * @param {string} room - Room name
   */
  deleteGame(room) {
    delete this.activeGames[room];
  }

  /**
   * Check if a game exists for a room
   * @param {string} room - Room name
   * @returns {boolean} True if game exists
   */
  gameExists(room) {
    return room in this.activeGames;
  }
}