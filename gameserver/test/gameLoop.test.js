import { expect } from 'chai';
import sinon from 'sinon';
import { GameLoop } from '../modules/gameLoop.js';

describe('GameLoop', () => {
  let gameLoop, mockGameStateManager, mockConnectionManager, mockIo, mockSocket, mockEmit;
  let room, writerRoom, guesserRoom, categories, secretWords, getStem;

  beforeEach(() => {
    // Mock GameStateManager
    mockGameStateManager = {
      createGame: sinon.stub().resolves(),
      setGameProgress: sinon.stub().resolves(),
      getGame: sinon.stub(),
      transitionToStage: sinon.stub().resolves(),
      setCategory: sinon.stub().returns({ success: true }), // Now synchronous
      setSecretWord: sinon.stub().returns({ success: true }), // Now synchronous
      addClue: sinon.stub().resolves(),
      setVotes: sinon.stub().returns({ success: true }), // Now synchronous
      setFinishedVoting: sinon.stub().returns({ success: true }), // Now synchronous
      setGuess: sinon.stub().returns({ success: true }), // Now synchronous
      setGameResult: sinon.stub().resolves(),
      deleteGame: sinon.stub().resolves()
    };

    // Mock ConnectionManager
    mockConnectionManager = {
      getConnections: sinon.stub()
    };

    // Mock Socket.IO with to().socketsLeave() and to().emit() chains
    const mockSocketsLeave = sinon.stub();
    mockEmit = sinon.stub();
    const mockToChain = {
      socketsLeave: mockSocketsLeave,
      emit: mockEmit
    };
    mockIo = {
      to: sinon.stub().returns(mockToChain),
      emit: sinon.stub()
    };

    mockSocket = {
      joinRoom: sinon.stub(),
      leaveRoom: sinon.stub()
    };

    // Test data
    room = 'testRoom';
    writerRoom = 'testRoom.writer';
    guesserRoom = 'testRoom.guesser';
    categories = ['Animals', 'Food', 'Movies'];
    secretWords = {
      'Animals': ['cat', 'dog', 'elephant'],
      'Food': ['pizza', 'burger', 'salad']
    };
    getStem = sinon.stub().returns('cat');

    // Create GameLoop instance
    gameLoop = new GameLoop(mockGameStateManager, mockConnectionManager);
  });

  describe('constructor', () => {
    it('should initialize with gameStateManager and connectionManager', () => {
      expect(gameLoop.gameStateManager).to.equal(mockGameStateManager);
      expect(gameLoop.connectionManager).to.equal(mockConnectionManager);
    });
  });

  describe('setupGuesserRoom', () => {
    it('should move guesser to guesser room', () => {
      const connections = {
        'player1': mockSocket,
        'player2': mockSocket
      };
      const guesser = 'player1';

      gameLoop.setupGuesserRoom(connections, guesser, guesserRoom);

      expect(mockSocket.joinRoom.calledWith(guesserRoom)).to.be.true;
    });
  });

  describe('getWriters', () => {
    it('should return all non-guessing players without side effects', () => {
      const mockSocket1 = {
        joinRoom: sinon.stub(),
        leaveRoom: sinon.stub()
      };
      const mockSocket2 = {
        joinRoom: sinon.stub(),
        leaveRoom: sinon.stub()
      };
      const connections = {
        'player1': mockSocket1,
        'player2': mockSocket2,
        'player3': mockSocket
      };
      const guesser = 'player1';

      const writers = gameLoop.getWriters(connections, guesser);

      expect(writers).to.have.length(2);
      expect(writers[0][0]).to.equal('player2');
      expect(writers[1][0]).to.equal('player3');
      
      expect(mockSocket2.joinRoom.called).to.be.false;
      expect(mockSocket2.leaveRoom.called).to.be.false;
      expect(mockSocket.joinRoom.called).to.be.false;
      expect(mockSocket.leaveRoom.called).to.be.false;
    });

    it('should exclude guesser from writers array', () => {
      const connections = {
        'player1': mockSocket,
        'player2': mockSocket
      };
      const guesser = 'player1';

      const writers = gameLoop.getWriters(connections, guesser);

      expect(writers).to.have.length(1);
      expect(writers[0][0]).to.equal('player2');
    });
  });

  describe('setupWriterRooms', () => {
    it('should move all writers to writer room', () => {
      const mockSocket1 = {
        joinRoom: sinon.stub(),
        leaveRoom: sinon.stub()
      };
      const mockSocket2 = {
        joinRoom: sinon.stub(),
        leaveRoom: sinon.stub()
      };
      const writers = [
        ['player2', mockSocket1],
        ['player3', mockSocket2]
      ];

      gameLoop.setupWriterRooms(writers, writerRoom);

      expect(mockSocket1.joinRoom.calledWith(writerRoom)).to.be.true;
      expect(mockSocket2.joinRoom.calledWith(writerRoom)).to.be.true;
    });
  });

  describe('categoryPhase', () => {
    beforeEach(() => {
      // Mock game state to have no category initially, then category set
      mockGameStateManager.getGame
        .onFirstCall().returns({ category: '' })
        .onSecondCall().returns({ category: 'Animals' });
    });

    it('should emit chooseCategory events to both rooms', async () => {
      // Mock waitForCondition to resolve immediately
      sinon.stub(gameLoop, 'waitForCondition').resolves('Condition met!');

      await gameLoop.categoryPhase(mockIo, room, writerRoom, guesserRoom, categories, 20);

      expect(mockIo.to.calledWith(writerRoom)).to.be.true;
      expect(mockEmit.calledWith('chooseCategory', 'writer', [])).to.be.true;
      expect(mockIo.to.calledWith(guesserRoom)).to.be.true;
      expect(mockEmit.calledWith('chooseCategory', 'guesser', categories)).to.be.true;
    });

    it('should set random category if none chosen within time limit', async () => {
      // Mock game state to always have empty category
      mockGameStateManager.getGame.returns({ category: '' });
      sinon.stub(gameLoop, 'waitForCondition').resolves('Timeout');
      sinon.stub(gameLoop, 'getRandomSelection').returns(0);

      await gameLoop.categoryPhase(mockIo, room, writerRoom, guesserRoom, categories, 20);

      expect(mockGameStateManager.setCategory.calledWith(room, 'Animals')).to.be.true;
    });
  });

  describe('cluePhase', () => {
    beforeEach(() => {
      mockGameStateManager.getGame.returns({
        category: 'Animals',
        clues: ['furry', 'pet']
      });
      sinon.stub(gameLoop, 'getRandomSelection').returns(0);
      sinon.stub(gameLoop, 'waitForCondition').resolves('Condition met!');
    });

    it('should initialize clues and set secret word', async () => {
      const writers = [['player1', mockSocket], ['player2', mockSocket]];

      await gameLoop.cluePhase(mockIo, room, writerRoom, guesserRoom, secretWords, 20, writers);

      expect(mockGameStateManager.transitionToStage.calledWith(room, 'writeClues')).to.be.true;
      expect(mockGameStateManager.setSecretWord.calledWith(room, 'cat')).to.be.true;
    });

    it('should emit writeClues events to both rooms', async () => {
      const writers = [['player1', mockSocket]];

      await gameLoop.cluePhase(mockIo, room, writerRoom, guesserRoom, secretWords, 20, writers);

      expect(mockEmit.calledWith('writeClues', 'writer', 'cat')).to.be.true;
      expect(mockEmit.calledWith('writeClues', 'guesser', '')).to.be.true;
    });

    it('should add default clues if not enough submitted', async () => {
      // Mock game state with fewer clues than writers
      mockGameStateManager.getGame.returns({
        category: 'Animals',
        clues: ['furry'] // Only 1 clue
      });
      const writers = [['player1', mockSocket], ['player2', mockSocket]]; // 2 writers

      await gameLoop.cluePhase(mockIo, room, writerRoom, guesserRoom, secretWords, 20, writers);

      expect(mockGameStateManager.addClue.calledWith(room, '<no answer>')).to.be.true;
    });
  });

  describe('votingPhase', () => {
    beforeEach(() => {
      sinon.stub(gameLoop, 'waitForCondition').resolves('Condition met!');
    });

    it('should process clues and initialize voting', async () => {
      mockGameStateManager.getGame.returns({
        clues: ['furry', 'pet', 'animal'],
        finishedVoting: true
      });
      await gameLoop.votingPhase(mockIo, room, writerRoom, guesserRoom, 20);

      expect(mockGameStateManager.setVotes.called).to.be.true;
      expect(mockGameStateManager.setFinishedVoting.calledWith(room, false)).to.be.true;
      expect(mockGameStateManager.transitionToStage.calledWith(room, 'filterClues')).to.be.true;
    });

    it('should emit filterClues events to both rooms', async () => {
      mockGameStateManager.getGame.returns({
        clues: ['furry', 'pet', 'animal'],
        finishedVoting: true
      });
      await gameLoop.votingPhase(mockIo, room, writerRoom, guesserRoom, 20);

      expect(mockIo.to.calledWith(writerRoom)).to.be.true;
      expect(mockEmit.calledWith('filterClues', 'writer')).to.be.true;
      expect(mockIo.to.calledWith(guesserRoom)).to.be.true;
      expect(mockEmit.calledWith('filterClues', 'guesser')).to.be.true;
    });

    it('should initialize votes with 0 for all clues (no <redacted> clues)', async () => {
      mockGameStateManager.getGame.returns({
        clues: ['furry', 'pet', 'furry', 'animal'], // 'furry' is duplicated but becomes "<redacted>" after dedupeClues
        finishedVoting: true
      });

      await gameLoop.votingPhase(mockIo, room, writerRoom, guesserRoom, 20);

      // Check that setVotes was called with correct initial vote array
      const setVotesCall = mockGameStateManager.setVotes.getCall(0);
      const votes = setVotesCall.args[1];
      
      expect(votes).to.deep.equal([-1, 0, -1, 0]);
    });

    it('should handle duplicate clues correctly after deduplication', async () => {
      mockGameStateManager.getGame.returns({
        clues: ['same', 'valid', 'same', 'another'], // 'same' will become '<redacted>'
        finishedVoting: true
      });

      await gameLoop.votingPhase(mockIo, room, writerRoom, guesserRoom, 20);

      const setVotesCall = mockGameStateManager.setVotes.getCall(0);
      const votes = setVotesCall.args[1];
      
      expect(votes).to.deep.equal([-1, 0, -1, 0]);
    });

    it('should only set -1 for literal "<redacted>" strings in input', async () => {
      mockGameStateManager.getGame.returns({
        clues: ['<redacted>', 'valid', 'duplicate', 'duplicate'], // literal "<redacted>" plus duplicates
        finishedVoting: true
      });

      await gameLoop.votingPhase(mockIo, room, writerRoom, guesserRoom, 20);

      const setVotesCall = mockGameStateManager.setVotes.getCall(0);
      const votes = setVotesCall.args[1];
      
      // The literal "<redacted>" gets -1, duplicates become "<redacted>" after dedupeClues and also get -1
      expect(votes).to.deep.equal([-1, 0, -1, -1]);
    });

    it('should handle all normal clues correctly', async () => {
      mockGameStateManager.getGame.returns({
        clues: ['furry', 'pet', 'mammal', 'cute'],
        finishedVoting: true
      });

      await gameLoop.votingPhase(mockIo, room, writerRoom, guesserRoom, 20);

      const setVotesCall = mockGameStateManager.setVotes.getCall(0);
      const votes = setVotesCall.args[1];
      
      expect(votes).to.deep.equal([0, 0, 0, 0]); // All should be 0
    });
  });

  describe('guessingPhase', () => {
    beforeEach(() => {
      mockGameStateManager.getGame.returns({
        clues: ['furry', 'pet', 'animal'],
        votes: [0, 0, -1], // Third clue eliminated
        guess: 'cat',
        secretWord: 'cat'
      });
      sinon.stub(gameLoop, 'waitForCondition').resolves('Condition met!');
      getStem.returns('cat');
    });

    it('should process votes and create deduped clues', async () => {
      const success = await gameLoop.guessingPhase(mockIo, room, writerRoom, guesserRoom, 20, getStem);

      expect(mockGameStateManager.transitionToStage.calledWith(room, 'guessWord')).to.be.true;
      expect(success).to.be.true;
    });

    it('should emit guessWord events with correct parameters', async () => {
      await gameLoop.guessingPhase(mockIo, room, writerRoom, guesserRoom, 20, getStem);

      expect(mockIo.to.calledWith(writerRoom)).to.be.true;
      expect(mockIo.to.calledWith(guesserRoom)).to.be.true;
    });

    it('should return false when guess is incorrect', async () => {
      getStem.returns('dog'); // Different from secret word

      const success = await gameLoop.guessingPhase(mockIo, room, writerRoom, guesserRoom, 20, getStem);

      expect(success).to.be.false;
    });

    it('should handle no guess submitted', async () => {
      mockGameStateManager.getGame.returns({
        clues: ['furry', 'pet'],
        votes: [0, 0],
        guess: '', // No guess submitted
        secretWord: 'cat'
      });

      const success = await gameLoop.guessingPhase(mockIo, room, writerRoom, guesserRoom, 20, getStem);

      expect(getStem.calledWith('<no guess>')).to.be.true;
    });

    it('should hide clues with negative votes and show clues with non-negative votes', async () => {
      mockGameStateManager.getGame.returns({
        clues: ['furry', 'pet', 'mammal', 'cute'],
        votes: [0, -1, 1, -2], // Keep, hide, keep, hide
        guess: 'cat',
        secretWord: 'cat'
      });

      await gameLoop.guessingPhase(mockIo, room, writerRoom, guesserRoom, 20, getStem);

      // Check the emit call for guesser room to see filtered clues
      const guesserEmitCall = mockEmit.getCalls().find(call => 
        call.args[0] === 'guessWord' && call.args[1] === 'guesser'
      );
      
      expect(guesserEmitCall).to.exist;
      const dedupedClues = guesserEmitCall.args[2];
      expect(dedupedClues).to.deep.equal(['furry', '<redacted>', 'mammal', '<redacted>']);
    });

    it('should show all clues when all votes are non-negative', async () => {
      mockGameStateManager.getGame.returns({
        clues: ['furry', 'pet', 'mammal'],
        votes: [0, 1, 2], // All positive or zero
        guess: 'cat',
        secretWord: 'cat'
      });

      await gameLoop.guessingPhase(mockIo, room, writerRoom, guesserRoom, 20, getStem);

      const guesserEmitCall = mockEmit.getCalls().find(call => 
        call.args[0] === 'guessWord' && call.args[1] === 'guesser'
      );
      
      expect(guesserEmitCall).to.exist;
      const dedupedClues = guesserEmitCall.args[2];
      expect(dedupedClues).to.deep.equal(['furry', 'pet', 'mammal']);
    });

    it('should hide all clues when all votes are negative', async () => {
      mockGameStateManager.getGame.returns({
        clues: ['furry', 'pet', 'mammal'],
        votes: [-1, -2, -3], // All negative
        guess: 'cat',
        secretWord: 'cat'
      });

      await gameLoop.guessingPhase(mockIo, room, writerRoom, guesserRoom, 20, getStem);

      const guesserEmitCall = mockEmit.getCalls().find(call => 
        call.args[0] === 'guessWord' && call.args[1] === 'guesser'
      );
      
      expect(guesserEmitCall).to.exist;
      const dedupedClues = guesserEmitCall.args[2];
      expect(dedupedClues).to.deep.equal(['<redacted>', '<redacted>', '<redacted>']);
    });

    it('should provide original clues to writers and filtered clues to guesser', async () => {
      mockGameStateManager.getGame.returns({
        clues: ['furry', 'pet', 'mammal'],
        votes: [0, -1, 0], // Keep, hide, keep
        guess: 'cat',
        secretWord: 'cat'
      });

      await gameLoop.guessingPhase(mockIo, room, writerRoom, guesserRoom, 20, getStem);

      // Check writer room gets both filtered and original clues
      const writerEmitCall = mockEmit.getCalls().find(call => 
        call.args[0] === 'guessWord' && call.args[1] === 'writer'
      );
      expect(writerEmitCall).to.exist;
      const writerDedupedClues = writerEmitCall.args[2];
      const writerOriginalClues = writerEmitCall.args[3];
      expect(writerDedupedClues).to.deep.equal(['furry', '<redacted>', 'mammal']);
      expect(writerOriginalClues).to.deep.equal(['furry', 'pet', 'mammal']);

      // Check guesser room gets only filtered clues
      const guesserEmitCall = mockEmit.getCalls().find(call => 
        call.args[0] === 'guessWord' && call.args[1] === 'guesser'
      );
      expect(guesserEmitCall).to.exist;
      const guesserDedupedClues = guesserEmitCall.args[2];
      const guesserOriginalClues = guesserEmitCall.args[3];
      expect(guesserDedupedClues).to.deep.equal(['furry', '<redacted>', 'mammal']);
      expect(guesserOriginalClues).to.deep.equal([]); // Empty array for guesser
    });
  });

  describe('getRandomSelection', () => {
    it('should return integer between 0 and upperBound-1', () => {
      const result = gameLoop.getRandomSelection(5);
      expect(result).to.be.a('number');
      expect(result).to.be.at.least(0);
      expect(result).to.be.below(5);
    });

    it('should return 0 for upperBound of 1', () => {
      const result = gameLoop.getRandomSelection(1);
      expect(result).to.equal(0);
    });
  });

  describe('waitForCondition', () => {
    it('should resolve when condition becomes true', async () => {
      let conditionMet = false;
      const checkCondition = () => conditionMet;

      // Set condition to true after a short delay
      setTimeout(() => { conditionMet = true; }, 100);

      const result = await gameLoop.waitForCondition(checkCondition, 1);
      expect(result).to.equal('Condition met!');
    });

    it('should timeout when condition is never met', async () => {
      const checkCondition = () => false; // Never true

      const result = await gameLoop.waitForCondition(checkCondition, 0.1); // 100ms timeout
      expect(result).to.equal('Timeout: Condition not met within the given time');
    });
  });

  describe('startGameLoop integration', () => {    
    beforeEach(() => {
      // Mock all dependencies for integration test
      mockConnectionManager.getConnections.returns({
        'player1': mockSocket,
        'player2': mockSocket
      });

      mockGameStateManager.getGame.returns({
        category: 'Animals',
        clues: ['furry', 'pet'],
        votes: [0, 0],
        guess: 'cat',
        secretWord: 'cat',
        dedupedClues: ['furry', 'pet']
      });

      // Stub all async methods including the setTimeout delay
      sinon.stub(gameLoop, 'categoryPhase').resolves();
      sinon.stub(gameLoop, 'cluePhase').resolves();
      sinon.stub(gameLoop, 'votingPhase').resolves();
      sinon.stub(gameLoop, 'guessingPhase').resolves(true);
      sinon.stub(gameLoop, 'setupGuesserRoom');
      sinon.stub(gameLoop, 'getWriters').returns([['player2', mockSocket]]);
      sinon.stub(gameLoop, 'setupWriterRooms');
    });

    it('should run complete game loop for all players', async () => {
      // Stub the setTimeout delay to resolve immediately
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = (fn, delay) => originalSetTimeout(fn, 0);

      try {
        await gameLoop.startGameLoop(mockIo, room, 20, categories, secretWords, getStem);

        // Should create game for each player as guesser
        expect(mockGameStateManager.createGame.callCount).to.equal(2);
        expect(mockGameStateManager.setGameProgress.callCount).to.equal(2);
        expect(mockGameStateManager.setGameResult.callCount).to.equal(2);
        expect(mockGameStateManager.deleteGame.calledWith(room)).to.be.true;
        expect(mockEmit.calledWith('endGame')).to.be.true;
        
        // Should clear rooms for each player (includes room clearing + emit calls)
        expect(mockIo.to.callCount).to.be.at.least(4); // At least 2 players × 2 rooms each for clearing
        expect(mockIo.to.calledWith(writerRoom)).to.be.true;
        expect(mockIo.to.calledWith(guesserRoom)).to.be.true;
      } finally {
        global.setTimeout = originalSetTimeout;
      }
    });

    it('should call all game phases for each player', async () => {
      // Stub the setTimeout delay to resolve immediately
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = (fn, delay) => originalSetTimeout(fn, 0);

      try {
        await gameLoop.startGameLoop(mockIo, room, 20, categories, secretWords, getStem);

        expect(gameLoop.categoryPhase.callCount).to.equal(2);
        expect(gameLoop.cluePhase.callCount).to.equal(2);
        expect(gameLoop.votingPhase.callCount).to.equal(2);
        expect(gameLoop.guessingPhase.callCount).to.equal(2);
      } finally {
        global.setTimeout = originalSetTimeout;
      }
    });
  });
});