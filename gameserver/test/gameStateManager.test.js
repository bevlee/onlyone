import { expect } from 'chai';
import sinon from 'sinon';
import { GameStateManager } from '../modules/gameStateManager.js';

describe('GameStateManager', () => {
  let gameStateManager;
  const testRoom = 'testRoom';
  const testPlayerCount = 4;

  beforeEach(() => {
    gameStateManager = new GameStateManager();
  });

  afterEach(async () => {
    // Clean up any remaining games and queues
    if (gameStateManager.gameExists(testRoom)) {
      await gameStateManager.deleteGame(testRoom);
    }
  });

  describe('constructor', () => {
    it('should initialize with empty activeGames object', () => {
      expect(gameStateManager.activeGames).to.be.an('object');
      expect(Object.keys(gameStateManager.activeGames)).to.have.length(0);
      expect(gameStateManager.roomQueues).to.be.instanceOf(Map);
      expect(gameStateManager.roomQueues.size).to.equal(0);
    });
  });

  describe('createGame', () => {
    it('should create a new game with default values', async () => {
      await gameStateManager.createGame(testRoom, testPlayerCount);
      
      const game = gameStateManager.getGame(testRoom);
      expect(game).to.deep.equal({
        stage: "chooseCategory",
        category: "",
        gamesPlayed: 0,
        gamesWon: 0,
        playerCount: testPlayerCount
      });
    });

    it('should overwrite existing game when creating with same room name', async () => {
      await gameStateManager.createGame(testRoom, testPlayerCount);
      gameStateManager.setCategory(testRoom, 'Animals');
      
      await gameStateManager.createGame(testRoom, 5);
      
      const game = gameStateManager.getGame(testRoom);
      expect(game.category).to.equal('');
      expect(game.playerCount).to.equal(5);
    });
  });

  describe('setGameProgress', () => {
    beforeEach(async () => {
      await gameStateManager.createGame(testRoom, testPlayerCount);
    });

    it('should update games played and won', async () => {
      await gameStateManager.setGameProgress(testRoom, 5, 3);
      
      const game = gameStateManager.getGame(testRoom);
      expect(game.gamesPlayed).to.equal(5);
      expect(game.gamesWon).to.equal(3);
    });

    it('should not update for non-existent room', async () => {
      const result = await gameStateManager.setGameProgress('nonExistentRoom', 5, 3);
      expect(result).to.be.null;
    });
  });

  describe('transitionToStage', () => {
    beforeEach(async () => {
      await gameStateManager.createGame(testRoom, testPlayerCount);
    });

    it('should update game stage and initialize stage-specific data', async () => {
      await gameStateManager.transitionToStage(testRoom, 'writeClues');
      
      const game = gameStateManager.getGame(testRoom);
      expect(game.stage).to.equal('writeClues');
      expect(game.clues).to.be.an('array');
      expect(game.clues).to.have.length(0);
    });

    it('should initialize votes for filterClues stage', async () => {
      // First transition to writeClues and add some clues
      await gameStateManager.transitionToStage(testRoom, 'writeClues');
      await gameStateManager.addClue(testRoom, 'clue1');
      await gameStateManager.addClue(testRoom, 'clue2');
      
      // Then transition to filterClues
      await gameStateManager.transitionToStage(testRoom, 'filterClues');
      
      const game = gameStateManager.getGame(testRoom);
      expect(game.stage).to.equal('filterClues');
      expect(game.votes).to.be.an('array');
      expect(game.votes).to.have.length(2);
      expect(game.votes).to.deep.equal([0, 0]);
      expect(game.finishedVoting).to.be.false;
    });

    it('should initialize guess for guessWord stage', async () => {
      await gameStateManager.transitionToStage(testRoom, 'guessWord');
      
      const game = gameStateManager.getGame(testRoom);
      expect(game.stage).to.equal('guessWord');
      expect(game.guess).to.equal('');
    });

    it('should not update for non-existent room', async () => {
      const result = await gameStateManager.transitionToStage('nonExistentRoom', 'writeClues');
      expect(result).to.be.null;
    });
  });

  describe('setCategory', () => {
    beforeEach(async () => {
      await gameStateManager.createGame(testRoom, testPlayerCount);
    });

    it('should set category when in chooseCategory stage', () => {
      const result = gameStateManager.setCategory(testRoom, 'Animals');
      
      expect(result.success).to.be.true;
      expect(result.category).to.equal('Animals');
      
      const game = gameStateManager.getGame(testRoom);
      expect(game.category).to.equal('Animals');
    });

    it('should not set category when not in chooseCategory stage', async () => {
      await gameStateManager.transitionToStage(testRoom, 'writeClues');
      const result = gameStateManager.setCategory(testRoom, 'Animals');
      
      expect(result.success).to.be.false;
      expect(result.reason).to.equal('Invalid stage for category selection');
    });
  });

  describe('setSecretWord', () => {
    beforeEach(async () => {
      await gameStateManager.createGame(testRoom, testPlayerCount);
    });

    it('should set secret word', () => {
      const result = gameStateManager.setSecretWord(testRoom, 'elephant');
      
      expect(result.success).to.be.true;
      expect(result.secretWord).to.equal('elephant');
      
      const game = gameStateManager.getGame(testRoom);
      expect(game.secretWord).to.equal('elephant');
    });

    it('should not set secret word for non-existent room', () => {
      const result = gameStateManager.setSecretWord('nonExistentRoom', 'elephant');
      
      expect(result.success).to.be.false;
      expect(result.reason).to.equal('Game not found');
    });
  });

  describe('addClue', () => {
    beforeEach(async () => {
      await gameStateManager.createGame(testRoom, testPlayerCount);
      await gameStateManager.transitionToStage(testRoom, 'writeClues');
    });

    it('should add clue to clues array when in writeClues stage', async () => {
      const result1 = await gameStateManager.addClue(testRoom, 'big');
      const result2 = await gameStateManager.addClue(testRoom, 'gray');
      
      expect(result1.success).to.be.true;
      expect(result1.clue).to.equal('big');
      expect(result1.totalClues).to.equal(1);
      
      expect(result2.success).to.be.true;
      expect(result2.clue).to.equal('gray');
      expect(result2.totalClues).to.equal(2);
      
      const game = gameStateManager.getGame(testRoom);
      expect(game.clues).to.deep.equal(['big', 'gray']);
    });

    it('should not add clue when not in writeClues stage', async () => {
      await gameStateManager.transitionToStage(testRoom, 'filterClues');
      const result = await gameStateManager.addClue(testRoom, 'big');
      
      expect(result.success).to.be.false;
      expect(result.reason).to.equal('Invalid stage for clue submission');
    });

    it('should not add clue for non-existent room', async () => {
      const result = await gameStateManager.addClue('nonExistentRoom', 'big');
      
      expect(result.success).to.be.false;
      expect(result.reason).to.equal('Game not found');
    });
  });

  describe('addValidatedClue', () => {
    const mockGetStem = (word) => word.toLowerCase().trim();

    beforeEach(async () => {
      await gameStateManager.createGame(testRoom, testPlayerCount);
      await gameStateManager.transitionToStage(testRoom, 'writeClues');
      await gameStateManager.setSecretWord(testRoom, 'elephant');
    });

    it('should add valid clue when different from secret word', async () => {
      const result = await gameStateManager.addValidatedClue(testRoom, 'big', mockGetStem);
      
      expect(result.success).to.be.true;
      expect(result.clue).to.equal('big');
      expect(result.totalClues).to.equal(1);
      
      const game = gameStateManager.getGame(testRoom);
      expect(game.clues).to.deep.equal(['big']);
    });

    it('should reject clue that matches secret word exactly', async () => {
      const result = await gameStateManager.addValidatedClue(testRoom, 'elephant', mockGetStem);
      
      expect(result.success).to.be.false;
      expect(result.reason).to.equal('Clue cannot be the same as the secret word');
      
      const game = gameStateManager.getGame(testRoom);
      expect(game.clues).to.have.length(0);
    });

    it('should reject clue that matches secret word after normalization', async () => {
      const result = await gameStateManager.addValidatedClue(testRoom, '  ELEPHANT  ', mockGetStem);
      
      expect(result.success).to.be.false;
      expect(result.reason).to.equal('Clue cannot be the same as the secret word');
      
      const game = gameStateManager.getGame(testRoom);
      expect(game.clues).to.have.length(0);
    });

    it('should not add clue when not in writeClues stage', async () => {
      await gameStateManager.transitionToStage(testRoom, 'filterClues');
      const result = await gameStateManager.addValidatedClue(testRoom, 'big', mockGetStem);
      
      expect(result.success).to.be.false;
      expect(result.reason).to.equal('Invalid stage for clue submission');
    });

    it('should not add clue for non-existent room', async () => {
      const result = await gameStateManager.addValidatedClue('nonExistentRoom', 'big', mockGetStem);
      
      expect(result.success).to.be.false;
      expect(result.reason).to.equal('Game not found');
    });
  });

  describe('setVotes', () => {
    beforeEach(async () => {
      await gameStateManager.createGame(testRoom, testPlayerCount);
    });

    it('should set votes array', () => {
      const votes = [1, -1, 0, 2];
      const result = gameStateManager.setVotes(testRoom, votes);
      
      expect(result.success).to.be.true;
      expect(result.votes).to.deep.equal(votes);
      
      const game = gameStateManager.getGame(testRoom);
      expect(game.votes).to.deep.equal(votes);
    });

    it('should not set votes for non-existent room', () => {
      const result = gameStateManager.setVotes('nonExistentRoom', [1, -1, 0]);
      
      expect(result.success).to.be.false;
      expect(result.reason).to.equal('Game not found');
    });
  });

  describe('updateVote', () => {
    beforeEach(async () => {
      await gameStateManager.createGame(testRoom, testPlayerCount);
      await gameStateManager.transitionToStage(testRoom, 'writeClues');
      await gameStateManager.addClue(testRoom, 'clue1');
      await gameStateManager.addClue(testRoom, 'clue2');
      await gameStateManager.transitionToStage(testRoom, 'filterClues');
    });

    it('should update single vote when in filterClues stage', async () => {
      const result = await gameStateManager.updateVote(testRoom, 1, 5);
      
      expect(result.success).to.be.true;
      expect(result.index).to.equal(1);
      expect(result.value).to.equal(5);
      
      const game = gameStateManager.getGame(testRoom);
      expect(game.votes[1]).to.equal(5);
      expect(game.votes[0]).to.equal(0); // Other votes unchanged
    });

    it('should not update vote when not in filterClues stage', async () => {
      await gameStateManager.transitionToStage(testRoom, 'guessWord');
      const result = await gameStateManager.updateVote(testRoom, 1, 5);
      
      expect(result.success).to.be.false;
      expect(result.reason).to.equal('Invalid stage or index for voting');
    });

    it('should not update vote with invalid index', async () => {
      const result = await gameStateManager.updateVote(testRoom, 10, 5);
      
      expect(result.success).to.be.false;
      expect(result.reason).to.equal('Invalid stage or index for voting');
    });
  });

  describe('setFinishedVoting', () => {
    beforeEach(async () => {
      await gameStateManager.createGame(testRoom, testPlayerCount);
    });

    it('should set finished voting flag', () => {
      const result = gameStateManager.setFinishedVoting(testRoom, true);
      
      expect(result.success).to.be.true;
      expect(result.finishedVoting).to.be.true;
      
      const game = gameStateManager.getGame(testRoom);
      expect(game.finishedVoting).to.be.true;
    });

    it('should not set finished voting for non-existent room', () => {
      const result = gameStateManager.setFinishedVoting('nonExistentRoom', true);
      
      expect(result.success).to.be.false;
      expect(result.reason).to.equal('Game not found');
    });
  });

  describe('setGuess', () => {
    beforeEach(async () => {
      await gameStateManager.createGame(testRoom, testPlayerCount);
      await gameStateManager.transitionToStage(testRoom, 'guessWord');
    });

    it('should set guess when in guessWord stage', () => {
      const result = gameStateManager.setGuess(testRoom, 'elephant');
      
      expect(result.success).to.be.true;
      expect(result.guess).to.equal('elephant');
      
      const game = gameStateManager.getGame(testRoom);
      expect(game.guess).to.equal('elephant');
    });

    it('should not set guess when not in guessWord stage', async () => {
      await gameStateManager.transitionToStage(testRoom, 'writeClues');
      const result = gameStateManager.setGuess(testRoom, 'elephant');
      
      expect(result.success).to.be.false;
      expect(result.reason).to.equal('Invalid stage for guess submission');
    });
  });

  describe('setGameResult', () => {
    beforeEach(async () => {
      await gameStateManager.createGame(testRoom, testPlayerCount);
    });

    it('should set game result and increment counters for successful game', async () => {
      const dedupedClues = ['big', 'gray', '<redacted>'];
      const result = await gameStateManager.setGameResult(testRoom, true, dedupedClues);
      
      expect(result.operationSuccess).to.be.true;
      expect(result.success).to.be.true;
      expect(result.dedupedClues).to.deep.equal(dedupedClues);
      expect(result.gamesPlayed).to.equal(1);
      expect(result.gamesWon).to.equal(1);
      
      const game = gameStateManager.getGame(testRoom);
      expect(game.success).to.be.true;
      expect(game.dedupedClues).to.deep.equal(dedupedClues);
      expect(game.gamesPlayed).to.equal(1);
      expect(game.gamesWon).to.equal(1);
    });

    it('should set game result and increment only played counter for failed game', async () => {
      const dedupedClues = ['big', 'gray'];
      const result = await gameStateManager.setGameResult(testRoom, false, dedupedClues);
      
      expect(result.operationSuccess).to.be.true;
      expect(result.success).to.be.false;
      expect(result.gamesPlayed).to.equal(1);
      expect(result.gamesWon).to.equal(0);
      
      const game = gameStateManager.getGame(testRoom);
      expect(game.success).to.be.false;
      expect(game.gamesPlayed).to.equal(1);
      expect(game.gamesWon).to.equal(0);
    });

    it('should not set result for non-existent room', async () => {
      const result = await gameStateManager.setGameResult('nonExistentRoom', true, []);
      
      expect(result.operationSuccess).to.be.false;
      expect(result.reason).to.equal('Game not found');
    });
  });

  describe('getGame', () => {
    it('should return game for existing room', async () => {
      await gameStateManager.createGame(testRoom, testPlayerCount);
      
      const game = gameStateManager.getGame(testRoom);
      expect(game).to.exist;
      expect(game.stage).to.equal('chooseCategory');
    });

    it('should return undefined for non-existent room', () => {
      const game = gameStateManager.getGame('nonExistentRoom');
      expect(game).to.be.undefined;
    });
  });


  describe('deleteGame', () => {
    it('should delete existing game and cleanup queue', async () => {
      await gameStateManager.createGame(testRoom, testPlayerCount);
      
      expect(gameStateManager.getGame(testRoom)).to.exist;
      expect(gameStateManager.roomQueues.has(testRoom)).to.be.true;
      
      const result = await gameStateManager.deleteGame(testRoom);
      
      expect(result.success).to.be.true;
      expect(result.room).to.equal(testRoom);
      expect(gameStateManager.getGame(testRoom)).to.be.undefined;
      expect(gameStateManager.roomQueues.has(testRoom)).to.be.false;
    });

    it('should handle deleting non-existent game gracefully', async () => {
      const result = await gameStateManager.deleteGame('nonExistentRoom');
      
      expect(result.success).to.be.true;
      expect(result.room).to.equal('nonExistentRoom');
    });
  });

  describe('gameExists', () => {
    it('should return true for existing game', async () => {
      await gameStateManager.createGame(testRoom, testPlayerCount);
      
      expect(gameStateManager.gameExists(testRoom)).to.be.true;
    });

    it('should return false for non-existent game', () => {
      expect(gameStateManager.gameExists('nonExistentRoom')).to.be.false;
    });

    it('should return false after game is deleted', async () => {
      await gameStateManager.createGame(testRoom, testPlayerCount);
      expect(gameStateManager.gameExists(testRoom)).to.be.true;
      
      await gameStateManager.deleteGame(testRoom);
      expect(gameStateManager.gameExists(testRoom)).to.be.false;
    });
  });

  describe('queue statistics', () => {
    beforeEach(async () => {
      await gameStateManager.createGame(testRoom, testPlayerCount);
    });

    it('should return queue stats for existing room', () => {
      const stats = gameStateManager.getQueueStats(testRoom);
      
      expect(stats).to.exist;
      expect(stats).to.have.property('size');
      expect(stats).to.have.property('pending');
      expect(stats).to.have.property('isPaused');
      expect(stats.size).to.be.a('number');
      expect(stats.pending).to.be.a('number');
      expect(stats.isPaused).to.be.a('boolean');
    });

    it('should return null for non-existent room', () => {
      const stats = gameStateManager.getQueueStats('nonExistentRoom');
      expect(stats).to.be.null;
    });

    it('should return all queue stats', () => {
      const allStats = gameStateManager.getAllQueueStats();
      
      expect(allStats).to.be.an('object');
      expect(allStats[testRoom]).to.exist;
      expect(allStats[testRoom]).to.have.property('size');
      expect(allStats[testRoom]).to.have.property('pending');
      expect(allStats[testRoom]).to.have.property('isPaused');
    });
  });

  describe('concurrency', () => {
    beforeEach(async () => {
      await gameStateManager.createGame(testRoom, testPlayerCount);
      await gameStateManager.transitionToStage(testRoom, 'writeClues');
    });

    it('should handle concurrent addClue operations', async () => {
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(gameStateManager.addClue(testRoom, `clue${i}`));
      }
      
      const results = await Promise.all(promises);
      
      // All operations should succeed
      results.forEach(result => {
        expect(result.success).to.be.true;
      });
      
      // All clues should be added
      const game = gameStateManager.getGame(testRoom);
      expect(game.clues).to.have.length(5);
      expect(game.clues).to.include.members(['clue0', 'clue1', 'clue2', 'clue3', 'clue4']);
    });

    it('should handle stage transitions clearing queue', async () => {
      // Start some addClue operations
      const promise1 = gameStateManager.addClue(testRoom, 'clue1');
      
      // Immediately transition to a different stage (should clear queue)
      const transitionPromise = gameStateManager.transitionToStage(testRoom, 'filterClues');
      
      // Both should complete without error
      await Promise.all([promise1, transitionPromise]);
      
      const game = gameStateManager.getGame(testRoom);
      expect(game.stage).to.equal('filterClues');
    });
  });

  describe('stopGame', () => {
    let mockIo, mockConnectionManager;
    const roomName = 'testRoom';

    beforeEach(async () => {
      await gameStateManager.createGame(testRoom, testPlayerCount);
      
      mockIo = {
        to: sinon.stub().returnsThis(),
        emit: sinon.stub()
      };
      
      mockConnectionManager = {
        getConnections: sinon.stub()
      };
    });

    it('should stop game and clean up when game exists', async () => {
      const mockConnections = {
        player1: {
          leaveRoom: sinon.stub()
        },
        player2: {
          leaveRoom: sinon.stub()
        }
      };
      
      mockConnectionManager.getConnections.returns(mockConnections);
      
      await gameStateManager.stopGame(mockIo, testRoom, mockConnectionManager);
      
      expect(mockConnectionManager.getConnections.calledWith(testRoom)).to.be.true;
      expect(gameStateManager.gameExists(testRoom)).to.be.false; // Should be deleted
      
      // Check that changeScene is emitted to both writer and guesser rooms
      expect(mockIo.to.calledWith(testRoom + '.writer')).to.be.true;
      expect(mockIo.to.calledWith(testRoom + '.guesser')).to.be.true;
      expect(mockIo.emit.calledWith('changeScene', 'main', '')).to.be.true;
      
      // Check that players are removed from game rooms
      expect(mockConnections.player1.leaveRoom.calledWith(testRoom + '.writer')).to.be.true;
      expect(mockConnections.player1.leaveRoom.calledWith(testRoom + '.guesser')).to.be.true;
      expect(mockConnections.player2.leaveRoom.calledWith(testRoom + '.writer')).to.be.true;
      expect(mockConnections.player2.leaveRoom.calledWith(testRoom + '.guesser')).to.be.true;
    });

    it('should not perform cleanup when game does not exist', async () => {
      const nonExistentRoom = 'nonExistentRoom';
      
      await gameStateManager.stopGame(mockIo, nonExistentRoom, mockConnectionManager);
      
      expect(mockConnectionManager.getConnections.called).to.be.false;
      expect(mockIo.to.called).to.be.false;
      expect(mockIo.emit.called).to.be.false;
    });

    it('should handle empty connections gracefully', async () => {
      mockConnectionManager.getConnections.returns({});
      
      // Should not throw an error
      await gameStateManager.stopGame(mockIo, testRoom, mockConnectionManager);
      
      expect(gameStateManager.gameExists(testRoom)).to.be.false; // Should be deleted
      expect(mockIo.emit.calledWith('changeScene', 'main', '')).to.be.true;
    });
  });
});