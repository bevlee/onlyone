/**
 * Manages game state across multiple rooms
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

  setCategory(room, category) {
    if (this.activeGames[room]) {
      this.activeGames[room].category = category;
    }
  }

  setSecretWord(room, secretWord) {
    if (this.activeGames[room]) {
      this.activeGames[room].secretWord = secretWord;
    }
  }

  initializeClues(room) {
    if (this.activeGames[room]) {
      this.activeGames[room].clues = [];
    }
  }

  addClue(room, clue) {
    if (this.activeGames[room] && this.activeGames[room].clues) {
      this.activeGames[room].clues.push(clue);
    }
  }

  setVotes(room, votes) {
    if (this.activeGames[room]) {
      this.activeGames[room].votes = votes;
    }
  }

  setFinishedVoting(room, finished) {
    if (this.activeGames[room]) {
      this.activeGames[room].finishedVoting = finished;
    }
  }

  setGuess(room, guess) {
    if (this.activeGames[room]) {
      this.activeGames[room].guess = guess;
    }
  }

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