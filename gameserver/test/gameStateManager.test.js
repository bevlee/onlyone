import { expect } from 'chai';
import { GameStateManager } from '../modules/gameStateManager.js';

describe('GameStateManager', () => {
  let gameStateManager;
  const testRoom = 'testRoom';
  const testPlayerCount = 4;

  beforeEach(() => {
    gameStateManager = new GameStateManager();
  });

  describe('constructor', () => {
    it('should initialize with empty activeGames object', () => {
      expect(gameStateManager.activeGames).to.be.an('object');
      expect(Object.keys(gameStateManager.activeGames)).to.have.length(0);
    });
  });

  describe('createGame', () => {
    it('should create a new game with default values', () => {
      gameStateManager.createGame(testRoom, testPlayerCount);
      
      const game = gameStateManager.getGame(testRoom);
      expect(game).to.deep.equal({
        stage: "chooseCategory",
        category: "",
        gamesPlayed: 0,
        gamesWon: 0,
        playerCount: testPlayerCount
      });
    });

    it('should overwrite existing game when creating with same room name', () => {
      gameStateManager.createGame(testRoom, testPlayerCount);
      gameStateManager.setCategory(testRoom, 'Animals');
      
      gameStateManager.createGame(testRoom, 5);
      
      const game = gameStateManager.getGame(testRoom);
      expect(game.category).to.equal('');
      expect(game.playerCount).to.equal(5);
    });
  });

  describe('setGameProgress', () => {
    beforeEach(() => {
      gameStateManager.createGame(testRoom, testPlayerCount);
    });

    it('should update games played and won', () => {
      gameStateManager.setGameProgress(testRoom, 5, 3);
      
      const game = gameStateManager.getGame(testRoom);
      expect(game.gamesPlayed).to.equal(5);
      expect(game.gamesWon).to.equal(3);
    });

    it('should not update for non-existent room', () => {
      gameStateManager.setGameProgress('nonExistentRoom', 5, 3);
      
      expect(gameStateManager.getGame('nonExistentRoom')).to.be.undefined;
    });
  });

  describe('updateGameStage', () => {
    beforeEach(() => {
      gameStateManager.createGame(testRoom, testPlayerCount);
    });

    it('should update game stage', () => {
      gameStateManager.updateGameStage(testRoom, 'writeClues');
      
      const game = gameStateManager.getGame(testRoom);
      expect(game.stage).to.equal('writeClues');
    });

    it('should not update for non-existent room', () => {
      gameStateManager.updateGameStage('nonExistentRoom', 'writeClues');
      
      expect(gameStateManager.getGame('nonExistentRoom')).to.be.undefined;
    });
  });

  describe('setCategory', () => {
    beforeEach(() => {
      gameStateManager.createGame(testRoom, testPlayerCount);
    });

    it('should set category', () => {
      gameStateManager.setCategory(testRoom, 'Animals');
      
      const game = gameStateManager.getGame(testRoom);
      expect(game.category).to.equal('Animals');
    });

    it('should not set category for non-existent room', () => {
      gameStateManager.setCategory('nonExistentRoom', 'Animals');
      
      expect(gameStateManager.getGame('nonExistentRoom')).to.be.undefined;
    });
  });

  describe('setSecretWord', () => {
    beforeEach(() => {
      gameStateManager.createGame(testRoom, testPlayerCount);
    });

    it('should set secret word', () => {
      gameStateManager.setSecretWord(testRoom, 'elephant');
      
      const game = gameStateManager.getGame(testRoom);
      expect(game.secretWord).to.equal('elephant');
    });

    it('should not set secret word for non-existent room', () => {
      gameStateManager.setSecretWord('nonExistentRoom', 'elephant');
      
      expect(gameStateManager.getGame('nonExistentRoom')).to.be.undefined;
    });
  });

  describe('initializeClues', () => {
    beforeEach(() => {
      gameStateManager.createGame(testRoom, testPlayerCount);
    });

    it('should initialize empty clues array', () => {
      gameStateManager.initializeClues(testRoom);
      
      const game = gameStateManager.getGame(testRoom);
      expect(game.clues).to.be.an('array');
      expect(game.clues).to.have.length(0);
    });

    it('should not initialize clues for non-existent room', () => {
      gameStateManager.initializeClues('nonExistentRoom');
      
      expect(gameStateManager.getGame('nonExistentRoom')).to.be.undefined;
    });
  });

  describe('addClue', () => {
    beforeEach(() => {
      gameStateManager.createGame(testRoom, testPlayerCount);
      gameStateManager.initializeClues(testRoom);
    });

    it('should add clue to clues array', () => {
      gameStateManager.addClue(testRoom, 'big');
      gameStateManager.addClue(testRoom, 'gray');
      
      const game = gameStateManager.getGame(testRoom);
      expect(game.clues).to.deep.equal(['big', 'gray']);
    });

    it('should not add clue when clues not initialized', () => {
      gameStateManager.createGame('newRoom', 3);
      gameStateManager.addClue('newRoom', 'test');
      
      const game = gameStateManager.getGame('newRoom');
      expect(game.clues).to.be.undefined;
    });

    it('should not add clue for non-existent room', () => {
      gameStateManager.addClue('nonExistentRoom', 'test');
      
      expect(gameStateManager.getGame('nonExistentRoom')).to.be.undefined;
    });
  });

  describe('setVotes', () => {
    beforeEach(() => {
      gameStateManager.createGame(testRoom, testPlayerCount);
    });

    it('should set votes array', () => {
      const votes = [1, -1, 0, 2];
      gameStateManager.setVotes(testRoom, votes);
      
      const game = gameStateManager.getGame(testRoom);
      expect(game.votes).to.deep.equal(votes);
    });

    it('should not set votes for non-existent room', () => {
      gameStateManager.setVotes('nonExistentRoom', [1, 2, 3]);
      
      expect(gameStateManager.getGame('nonExistentRoom')).to.be.undefined;
    });
  });

  describe('setFinishedVoting', () => {
    beforeEach(() => {
      gameStateManager.createGame(testRoom, testPlayerCount);
    });

    it('should set finished voting flag', () => {
      gameStateManager.setFinishedVoting(testRoom, true);
      
      const game = gameStateManager.getGame(testRoom);
      expect(game.finishedVoting).to.be.true;
    });

    it('should not set finished voting for non-existent room', () => {
      gameStateManager.setFinishedVoting('nonExistentRoom', true);
      
      expect(gameStateManager.getGame('nonExistentRoom')).to.be.undefined;
    });
  });

  describe('setGuess', () => {
    beforeEach(() => {
      gameStateManager.createGame(testRoom, testPlayerCount);
    });

    it('should set guess', () => {
      gameStateManager.setGuess(testRoom, 'elephant');
      
      const game = gameStateManager.getGame(testRoom);
      expect(game.guess).to.equal('elephant');
    });

    it('should not set guess for non-existent room', () => {
      gameStateManager.setGuess('nonExistentRoom', 'elephant');
      
      expect(gameStateManager.getGame('nonExistentRoom')).to.be.undefined;
    });
  });

  describe('setGameResult', () => {
    beforeEach(() => {
      gameStateManager.createGame(testRoom, testPlayerCount);
    });

    it('should set game result and increment counters for successful game', () => {
      const dedupedClues = ['big', 'gray'];
      gameStateManager.setGameResult(testRoom, true, dedupedClues);
      
      const game = gameStateManager.getGame(testRoom);
      expect(game.success).to.be.true;
      expect(game.dedupedClues).to.deep.equal(dedupedClues);
      expect(game.gamesPlayed).to.equal(1);
      expect(game.gamesWon).to.equal(1);
    });

    it('should set game result and increment only played counter for failed game', () => {
      const dedupedClues = ['big', 'large'];
      gameStateManager.setGameResult(testRoom, false, dedupedClues);
      
      const game = gameStateManager.getGame(testRoom);
      expect(game.success).to.be.false;
      expect(game.dedupedClues).to.deep.equal(dedupedClues);
      expect(game.gamesPlayed).to.equal(1);
      expect(game.gamesWon).to.equal(0);
    });

    it('should not set result for non-existent room', () => {
      gameStateManager.setGameResult('nonExistentRoom', true, []);
      
      expect(gameStateManager.getGame('nonExistentRoom')).to.be.undefined;
    });
  });

  describe('getGame', () => {
    it('should return game state for existing room', () => {
      gameStateManager.createGame(testRoom, testPlayerCount);
      
      const game = gameStateManager.getGame(testRoom);
      expect(game).to.be.an('object');
      expect(game.stage).to.equal('chooseCategory');
    });

    it('should return undefined for non-existent room', () => {
      const game = gameStateManager.getGame('nonExistentRoom');
      expect(game).to.be.undefined;
    });
  });

  describe('deleteGame', () => {
    it('should delete existing game', () => {
      gameStateManager.createGame(testRoom, testPlayerCount);
      expect(gameStateManager.getGame(testRoom)).to.not.be.undefined;
      
      gameStateManager.deleteGame(testRoom);
      expect(gameStateManager.getGame(testRoom)).to.be.undefined;
    });

    it('should not error when deleting non-existent room', () => {
      expect(() => gameStateManager.deleteGame('nonExistentRoom')).to.not.throw();
    });
  });

  describe('gameExists', () => {
    it('should return true for existing game', () => {
      gameStateManager.createGame(testRoom, testPlayerCount);
      
      expect(gameStateManager.gameExists(testRoom)).to.be.true;
    });

    it('should return false for non-existent game', () => {
      expect(gameStateManager.gameExists('nonExistentRoom')).to.be.false;
    });

    it('should return false after game is deleted', () => {
      gameStateManager.createGame(testRoom, testPlayerCount);
      gameStateManager.deleteGame(testRoom);
      
      expect(gameStateManager.gameExists(testRoom)).to.be.false;
    });
  });
});