import { expect } from 'chai';
import sinon from 'sinon';
import { getRandomSelection, finishGame, waitForCondition, stopGame } from '../utils/gameUtils.js';

describe('Game Utils', () => {
  describe('getRandomSelection', () => {
    it('should return number within bounds', () => {
      const upperBound = 10;
      const result = getRandomSelection(upperBound);
      
      expect(result).to.be.a('number');
      expect(result).to.be.at.least(0);
      expect(result).to.be.below(upperBound);
    });

    it('should return 0 for upperBound of 1', () => {
      const result = getRandomSelection(1);
      expect(result).to.equal(0);
    });

    it('should handle edge case of 0 upperBound', () => {
      const result = getRandomSelection(0);
      expect(result).to.equal(0);
    });

    it('should return different values across multiple calls', () => {
      const results = new Set();
      const upperBound = 100;
      
      // Generate 50 random numbers
      for (let i = 0; i < 50; i++) {
        results.add(getRandomSelection(upperBound));
      }
      
      // Should have more than 1 unique value (very high probability)
      expect(results.size).to.be.greaterThan(1);
    });
  });

  describe('finishGame', () => {
    it('should not throw error when called', () => {
      expect(() => finishGame('testRoom')).to.not.throw();
    });

    it('should accept room parameter', () => {
      expect(() => finishGame('anyRoom')).to.not.throw();
    });
  });

  describe('waitForCondition', () => {
    let clock;

    beforeEach(() => {
      clock = sinon.useFakeTimers();
    });

    afterEach(() => {
      clock.restore();
    });

    it('should resolve when condition is met immediately', async () => {
      const checkCondition = sinon.stub().returns(true);
      
      const promise = waitForCondition(checkCondition, 5);
      clock.tick(1000);
      
      const result = await promise;
      expect(result).to.equal('Condition met!');
      expect(checkCondition.calledOnce).to.be.true;
    });

    it('should resolve when condition is met after delay', async () => {
      const checkCondition = sinon.stub();
      checkCondition.onCall(0).returns(false);
      checkCondition.onCall(1).returns(false);
      checkCondition.onCall(2).returns(true);
      
      const promise = waitForCondition(checkCondition, 5);
      clock.tick(3000);
      
      const result = await promise;
      expect(result).to.equal('Condition met!');
      expect(checkCondition.callCount).to.equal(3);
    });

    it('should timeout when condition is never met', async () => {
      const checkCondition = sinon.stub().returns(false);
      
      const promise = waitForCondition(checkCondition, 2);
      clock.tick(2000);
      
      const result = await promise;
      expect(result).to.equal('Timeout: Condition not met within the given time');
      expect(checkCondition.callCount).to.equal(2);
    });

    it('should use default timeout of 20 seconds', async () => {
      const checkCondition = sinon.stub().returns(false);
      
      const promise = waitForCondition(checkCondition);
      clock.tick(20000);
      
      const result = await promise;
      expect(result).to.equal('Timeout: Condition not met within the given time');
      expect(checkCondition.callCount).to.equal(20);
    });

    it('should call condition check every second', async () => {
      const checkCondition = sinon.stub().returns(false);
      
      const promise = waitForCondition(checkCondition, 3);
      clock.tick(2500);
      
      expect(checkCondition.callCount).to.equal(2);
      
      clock.tick(500);
      await promise;
      expect(checkCondition.callCount).to.equal(3);
    });
  });

  describe('stopGame', () => {
    let mockIo, mockGameStateManager, mockConnectionManager;
    const roomName = 'testRoom';

    beforeEach(() => {
      mockIo = {
        to: sinon.stub().returnsThis(),
        emit: sinon.stub()
      };
      
      mockGameStateManager = {
        gameExists: sinon.stub(),
        deleteGame: sinon.stub()
      };
      
      mockConnectionManager = {
        getConnections: sinon.stub()
      };
    });

    it('should stop game and clean up when game exists', () => {
      const mockConnections = {
        player1: {
          leaveRoom: sinon.stub()
        },
        player2: {
          leaveRoom: sinon.stub()
        }
      };
      
      mockGameStateManager.gameExists.returns(true);
      mockConnectionManager.getConnections.returns(mockConnections);
      
      stopGame(mockIo, roomName, mockGameStateManager, mockConnectionManager);
      
      expect(mockGameStateManager.gameExists.calledWith(roomName)).to.be.true;
      expect(mockConnectionManager.getConnections.calledWith(roomName)).to.be.true;
      expect(mockGameStateManager.deleteGame.calledWith(roomName)).to.be.true;
      
      // Check that changeScene is emitted to both writer and guesser rooms
      expect(mockIo.to.calledWith(roomName + '.writer')).to.be.true;
      expect(mockIo.to.calledWith(roomName + '.guesser')).to.be.true;
      expect(mockIo.emit.calledWith('changeScene', 'main', '')).to.be.true;
      
      // Check that players are removed from game rooms
      expect(mockConnections.player1.leaveRoom.calledWith(roomName + '.writer')).to.be.true;
      expect(mockConnections.player1.leaveRoom.calledWith(roomName + '.guesser')).to.be.true;
      expect(mockConnections.player2.leaveRoom.calledWith(roomName + '.writer')).to.be.true;
      expect(mockConnections.player2.leaveRoom.calledWith(roomName + '.guesser')).to.be.true;
    });

    it('should not perform cleanup when game does not exist', () => {
      mockGameStateManager.gameExists.returns(false);
      
      stopGame(mockIo, roomName, mockGameStateManager, mockConnectionManager);
      
      expect(mockGameStateManager.gameExists.calledWith(roomName)).to.be.true;
      expect(mockConnectionManager.getConnections.called).to.be.false;
      expect(mockGameStateManager.deleteGame.called).to.be.false;
      expect(mockIo.to.called).to.be.false;
      expect(mockIo.emit.called).to.be.false;
    });

    it('should handle empty connections gracefully', () => {
      mockGameStateManager.gameExists.returns(true);
      mockConnectionManager.getConnections.returns({});
      
      expect(() => stopGame(mockIo, roomName, mockGameStateManager, mockConnectionManager)).to.not.throw();
      
      expect(mockGameStateManager.deleteGame.calledWith(roomName)).to.be.true;
      expect(mockIo.emit.calledWith('changeScene', 'main', '')).to.be.true;
    });

    it('should construct correct room names for writer and guesser', () => {
      mockGameStateManager.gameExists.returns(true);
      mockConnectionManager.getConnections.returns({});
      
      stopGame(mockIo, roomName, mockGameStateManager, mockConnectionManager);
      
      expect(mockIo.to.calledWith('testRoom.writer')).to.be.true;
      expect(mockIo.to.calledWith('testRoom.guesser')).to.be.true;
    });
  });
});