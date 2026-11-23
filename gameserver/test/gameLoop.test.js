import { expect } from 'chai';
import sinon from 'sinon';
import { GameLoop } from '../modules/gameLoop.js';
import database from '../modules/database.js';

const removedVotes = (removed) => ({ removed: () => removed });

describe('GameLoop', () => {
  let gameLoop, mockGameStateManager, mockConnectionManager, mockIo, mockSocket, mockEmit;
  let room, writerRoom, guesserRoom, difficulties, secretWords, getStem;

  beforeEach(() => {
    // Mock GameStateManager
    mockGameStateManager = {
      createGame: sinon.stub().resolves(),
      setGameProgress: sinon.stub().resolves(),
      setCurrentGuesser: sinon.stub(),
      getGame: sinon.stub(),
      transitionToStage: sinon.stub().resolves(),
      setDifficulty: sinon.stub().returns({ success: true }), // Now synchronous
      setSecretWord: sinon.stub().returns({ success: true }), // Now synchronous
      addClue: sinon.stub().resolves(),
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
    difficulties = ['Animals', 'Food', 'Movies'];
    secretWords = {
      'Animals': ['cat', 'dog', 'elephant'],
      'Food': ['pizza', 'burger', 'salad']
    };
    getStem = sinon.stub().returns('cat');

    // Create GameLoop instance
    gameLoop = new GameLoop(mockGameStateManager, mockConnectionManager);
  });

  afterEach(() => sinon.restore());

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

  describe('difficultyPhase', () => {
    beforeEach(() => {
      // Mock game state to have no difficulty initially, then difficulty set
      mockGameStateManager.getGame
        .onFirstCall().returns({ difficulty: '' })
        .onSecondCall().returns({ difficulty: 'Animals' });
    });

    it('should emit chooseDifficulty events to both rooms', async () => {
      // Mock waitForCondition to resolve immediately
      sinon.stub(gameLoop, 'waitForCondition').resolves('Condition met!');

      await gameLoop.difficultyPhase(mockIo, room, writerRoom, guesserRoom, difficulties, 20);

      expect(mockIo.to.calledWith(writerRoom)).to.be.true;
      expect(mockEmit.calledWith('chooseDifficulty', 'writer', [])).to.be.true;
      expect(mockIo.to.calledWith(guesserRoom)).to.be.true;
      expect(mockEmit.calledWith('chooseDifficulty', 'guesser', difficulties)).to.be.true;
    });

    it('should set random difficulty if none chosen within time limit', async () => {
      // Mock game state to always have empty difficulty
      mockGameStateManager.getGame.resetBehavior();
      mockGameStateManager.getGame.returns({ difficulty: '' });
      sinon.stub(gameLoop, 'waitForCondition').resolves('Timeout');
      sinon.stub(gameLoop, 'getRandomSelection').returns(0);

      await gameLoop.difficultyPhase(mockIo, room, writerRoom, guesserRoom, difficulties, 20);

      expect(mockGameStateManager.setDifficulty.calledWith(room, 'Animals')).to.be.true;
    });
  });

  describe('cluePhase', () => {
    beforeEach(() => {
      sinon.stub(database, 'getNextWord').returns('cat');
      mockGameStateManager.getGame.returns({
        difficulty: 'Animals',
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
        difficulty: 'Animals',
        clues: ['furry'] // Only 1 clue
      });
      const writers = [['player1', mockSocket], ['player2', mockSocket]]; // 2 writers

      await gameLoop.cluePhase(mockIo, room, writerRoom, guesserRoom, secretWords, 20, writers);

      expect(mockGameStateManager.addClue.calledWith(room, '<no answer>')).to.be.true;
    });
  });

  describe('votingPhase', () => {
    const writers = [['p1', mockSocketStub()], ['p2', mockSocketStub()], ['p3', mockSocketStub()]];
    function mockSocketStub() { return { joinRoom() {}, leaveRoom() {} }; }

    beforeEach(() => {
      sinon.stub(gameLoop, 'waitForCondition').resolves('Condition met!');
    });

    it('should transition to filterClues and create repeat votes for the writers', async () => {
      const game = { clues: ['furry', 'pet', 'animal'] };
      mockGameStateManager.getGame.returns(game);
      await gameLoop.votingPhase(mockIo, room, writerRoom, guesserRoom, 20, writers);

      expect(mockGameStateManager.transitionToStage.calledWith(room, 'filterClues')).to.be.true;
      expect(game.repeatVotes.required).to.equal(2);
      expect(game.repeatVotes.voterIds).to.deep.equal(new Set(['p1', 'p2', 'p3']));
    });

    it('should send public vote state to writers and nothing to the guesser', async () => {
      mockGameStateManager.getGame.returns({ clues: ['furry', 'pet', 'Furry'] });
      await gameLoop.votingPhase(mockIo, room, writerRoom, guesserRoom, 20, writers);

      const writerCall = mockEmit.getCalls().find((c) => c.args[0] === 'filterClues' && c.args[1] === 'writer');
      const guesserCall = mockEmit.getCalls().find((c) => c.args[0] === 'filterClues' && c.args[1] === 'guesser');
      expect(writerCall.args[2]).to.deep.include({ counts: [0, 0, 0], autoRemoved: [true, false, true], required: 2 });
      expect(guesserCall.args[2]).to.equal(null);
      expect(guesserCall.args[3]).to.deep.equal([]);
    });

    it('should finish when every connected writer is done', async () => {
      gameLoop.waitForCondition.restore();
      const game = { clues: ['a', 'b'] };
      mockGameStateManager.getGame.returns(game);
      mockConnectionManager.getConnections.returns({ x: { playerId: 'p1' }, y: { playerId: 'p2' } });
      const check = sinon.stub(gameLoop, 'waitForCondition').resolves();
      await gameLoop.votingPhase(mockIo, room, writerRoom, guesserRoom, 20, writers);

      const condition = check.firstCall.args[0];
      expect(condition()).to.be.false;
      game.repeatVotes.finish('p1');
      expect(condition()).to.be.false;
      game.repeatVotes.finish('p2'); // p3 disconnected, so not required
      expect(condition()).to.be.true;
    });
  });

  describe('guessingPhase', () => {
    beforeEach(() => {
      mockGameStateManager.getGame.returns({
        clues: ['furry', 'pet', 'animal'],
        repeatVotes: removedVotes([false, false, true]), // Third clue eliminated
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
      getStem.withArgs('cat').returns('cat');
      mockGameStateManager.getGame().guess = 'dog';
      getStem.withArgs('dog').returns('dog');

      const success = await gameLoop.guessingPhase(mockIo, room, writerRoom, guesserRoom, 20, getStem);

      expect(success).to.be.false;
    });

    it('should handle no guess submitted', async () => {
      mockGameStateManager.getGame.returns({
        clues: ['furry', 'pet'],
        repeatVotes: removedVotes([false, false]),
        guess: '', // No guess submitted
        secretWord: 'cat'
      });

      const success = await gameLoop.guessingPhase(mockIo, room, writerRoom, guesserRoom, 20, getStem);

      expect(getStem.calledWith('<no guess>')).to.be.true;
    });

    it('should hide clues with negative votes and show clues with non-negative votes', async () => {
      mockGameStateManager.getGame.returns({
        clues: ['furry', 'pet', 'mammal', 'cute'],
        repeatVotes: removedVotes([false, true, false, true]), // Keep, hide, keep, hide
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
        repeatVotes: removedVotes([false, false, false]), // All positive or zero
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
        repeatVotes: removedVotes([true, true, true]), // All negative
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
        repeatVotes: removedVotes([false, true, false]), // Keep, hide, keep
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
        difficulty: 'Animals',
        clues: ['furry', 'pet'],
        repeatVotes: removedVotes([false, false]),
        guess: 'cat',
        secretWord: 'cat',
        dedupedClues: ['furry', 'pet']
      });

      // Stub all async methods including the setTimeout delay
      sinon.stub(gameLoop, 'difficultyPhase').resolves();
      sinon.stub(gameLoop, 'cluePhase').resolves();
      sinon.stub(gameLoop, 'votingPhase').resolves();
      sinon.stub(gameLoop, 'guessingPhase').resolves(true);
      sinon.stub(gameLoop, 'setupGuesserRoom');
      sinon.stub(gameLoop, 'getWriters').returns([['player2', mockSocket]]);
      sinon.stub(gameLoop, 'setupWriterRooms');
      sinon.stub(gameLoop, 'waitForNextRound').callsFake(async () => {
        if (mockGameStateManager.setGameResult.callCount === 2) {
          gameLoop.cancel(room);
        }
      });
    });

    it('should run complete game loop for all players', async () => {
      // Stub the setTimeout delay to resolve immediately
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = (fn, delay) => originalSetTimeout(fn, 0);

      try {
        await gameLoop.startGameLoop(mockIo, room, 20, difficulties, secretWords, getStem);

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
        await gameLoop.startGameLoop(mockIo, room, 20, difficulties, secretWords, getStem);

        expect(gameLoop.difficultyPhase.callCount).to.equal(2);
        expect(gameLoop.cluePhase.callCount).to.equal(2);
        expect(gameLoop.votingPhase.callCount).to.equal(2);
        expect(gameLoop.guessingPhase.callCount).to.equal(2);
      } finally {
        global.setTimeout = originalSetTimeout;
      }
    });
  });
});
describe('phase deadline delivery window', () => {
  let clock;
  afterEach(() => clock.restore());

  it('accepts input sent at zero, rejects expired input and rejects previous phase IDs', () => {
    clock = sinon.useFakeTimers({ now: 100000 });
    const game = {};
    const loop = new GameLoop({ getGame: () => game }, {});
    const timing = loop.startPhaseTimer('room', 30);
    expect(timing.deadlineAt).to.equal(130000);
    clock.tick(30000);
    expect(loop.acceptsSubmission('room', timing.phaseId)).to.equal(true);
    clock.tick(1000);
    expect(loop.acceptsSubmission('room', timing.phaseId)).to.equal(true);
    clock.tick(1001);
    expect(loop.acceptsSubmission('room', timing.phaseId)).to.equal(false);
    loop.startPhaseTimer('room', 30);
    expect(loop.acceptsSubmission('room', timing.phaseId)).to.equal(false);
  });
});
