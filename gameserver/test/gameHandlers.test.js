import { expect } from 'chai';
import sinon from 'sinon';
import {
  handleStartGame,
  handleStopGame,
  handleChooseCategory,
  handleSubmitClue,
  handleUpdateVotes,
  handleFinishVoting,
  handleGuessWord
} from '../handlers/gameHandlers.js';

describe('Game Handlers', () => {
  let mockIo, mockSocket, activeGames, room, startGameLoop, stopGame;

  beforeEach(() => {
    mockIo = {
      to: sinon.stub().returnsThis(),
      emit: sinon.stub()
    };
    mockSocket = {
      to: sinon.stub().returnsThis(),
      emit: sinon.stub()
    };
    activeGames = {};
    room = 'testRoom';
    startGameLoop = sinon.stub();
    stopGame = sinon.stub();
  });

  describe('handleStartGame', () => {
    it('should start game loop when room is not active', () => {
      const handler = handleStartGame(mockIo, room, activeGames, startGameLoop);
      
      handler();
      
      expect(startGameLoop.calledOnce).to.be.true;
      expect(startGameLoop.calledWith(mockIo, room, 20)).to.be.true;
    });

    it('should not start game loop when room is already active', () => {
      activeGames[room] = { stage: 'active' };
      const handler = handleStartGame(mockIo, room, activeGames, startGameLoop);
      
      handler();
      
      expect(startGameLoop.called).to.be.false;
    });
  });

  describe('handleStopGame', () => {
    it('should call stopGame with correct parameters', () => {
      const handler = handleStopGame(mockIo, stopGame);
      const roomName = 'testRoom';
      
      handler(roomName);
      
      expect(stopGame.calledOnce).to.be.true;
      expect(stopGame.calledWith(mockIo, roomName)).to.be.true;
    });
  });

  describe('handleChooseCategory', () => {
    it('should set category when game is in chooseCategory stage', () => {
      activeGames[room] = { stage: 'chooseCategory' };
      const handler = handleChooseCategory(activeGames, room);
      const category = 'Animals';
      
      handler(category);
      
      expect(activeGames[room].category).to.equal(category);
    });

    it('should not set category when game is not in chooseCategory stage', () => {
      activeGames[room] = { stage: 'writeClues' };
      const handler = handleChooseCategory(activeGames, room);
      const category = 'Animals';
      
      handler(category);
      
      expect(activeGames[room].category).to.be.undefined;
    });

    it('should not set category when room does not exist', () => {
      const handler = handleChooseCategory(activeGames, room);
      const category = 'Animals';
      
      handler(category);
      
      expect(activeGames[room]).to.be.undefined;
    });
  });

  describe('handleSubmitClue', () => {
    it('should add clue when game is in writeClues stage', () => {
      activeGames[room] = { stage: 'writeClues', clues: [] };
      const handler = handleSubmitClue(activeGames, room);
      const clue = 'furry';
      
      handler(clue);
      
      expect(activeGames[room].clues).to.include(clue);
      expect(activeGames[room].clues.length).to.equal(1);
    });

    it('should not add clue when game is not in writeClues stage', () => {
      activeGames[room] = { stage: 'filterClues', clues: [] };
      const handler = handleSubmitClue(activeGames, room);
      const clue = 'furry';
      
      handler(clue);
      
      expect(activeGames[room].clues).to.not.include(clue);
      expect(activeGames[room].clues.length).to.equal(0);
    });

    it('should not add clue when room does not exist', () => {
      const handler = handleSubmitClue(activeGames, room);
      const clue = 'furry';
      
      handler(clue);
      
      expect(activeGames[room]).to.be.undefined;
    });
  });

  describe('handleUpdateVotes', () => {
    it('should update votes and emit to writer room when game is in filterClues stage', () => {
      activeGames[room] = { stage: 'filterClues', votes: [0, 0, 0] };
      const handler = handleUpdateVotes(activeGames, room, mockSocket);
      const index = 1;
      const value = 1;
      
      handler(index, value);
      
      expect(activeGames[room].votes[index]).to.equal(value);
      expect(mockSocket.to.calledWith(room + '.writer')).to.be.true;
      expect(mockSocket.emit.calledWith('updateVotes', index, value)).to.be.true;
    });

    it('should not update votes when game is not in filterClues stage', () => {
      activeGames[room] = { stage: 'writeClues', votes: [0, 0, 0] };
      const handler = handleUpdateVotes(activeGames, room, mockSocket);
      const index = 1;
      const value = 1;
      
      handler(index, value);
      
      expect(activeGames[room].votes[index]).to.equal(0);
      expect(mockSocket.to.called).to.be.false;
      expect(mockSocket.emit.called).to.be.false;
    });

    it('should not update votes when room does not exist', () => {
      const handler = handleUpdateVotes(activeGames, room, mockSocket);
      const index = 1;
      const value = 1;
      
      handler(index, value);
      
      expect(mockSocket.to.called).to.be.false;
      expect(mockSocket.emit.called).to.be.false;
    });

    it('should emit to writer room only, not entire room', () => {
      activeGames[room] = { stage: 'filterClues', votes: [0, 0, 0] };
      const handler = handleUpdateVotes(activeGames, room, mockSocket);
      const index = 0;
      const value = -1;
      
      handler(index, value);
      
      expect(mockSocket.to.calledWith(room + '.writer')).to.be.true;
      expect(mockSocket.to.calledWith(room)).to.be.false;
    });
  });

  describe('handleFinishVoting', () => {
    it('should set finishedVoting to true when game is in filterClues stage', () => {
      activeGames[room] = { stage: 'filterClues', finishedVoting: false };
      const handler = handleFinishVoting(activeGames, room);
      
      handler();
      
      expect(activeGames[room].finishedVoting).to.be.true;
    });

    it('should not set finishedVoting when game is not in filterClues stage', () => {
      activeGames[room] = { stage: 'writeClues', finishedVoting: false };
      const handler = handleFinishVoting(activeGames, room);
      
      handler();
      
      expect(activeGames[room].finishedVoting).to.be.false;
    });

    it('should not set finishedVoting when room does not exist', () => {
      const handler = handleFinishVoting(activeGames, room);
      
      handler();
      
      expect(activeGames[room]).to.be.undefined;
    });
  });

  describe('handleGuessWord', () => {
    it('should set guess when game is in guessWord stage', () => {
      activeGames[room] = { stage: 'guessWord' };
      const handler = handleGuessWord(activeGames, room);
      const guess = 'cat';
      
      handler(guess);
      
      expect(activeGames[room].guess).to.equal(guess);
    });

    it('should not set guess when game is not in guessWord stage', () => {
      activeGames[room] = { stage: 'writeClues' };
      const handler = handleGuessWord(activeGames, room);
      const guess = 'cat';
      
      handler(guess);
      
      expect(activeGames[room].guess).to.be.undefined;
    });

    it('should not set guess when room does not exist', () => {
      const handler = handleGuessWord(activeGames, room);
      const guess = 'cat';
      
      handler(guess);
      
      expect(activeGames[room]).to.be.undefined;
    });
  });
});