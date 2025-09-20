import { expect } from 'chai';
import sinon from 'sinon';
import { handleChangeName, handleDisconnect } from '../handlers/chatHandlers.js';

describe('Chat Handlers', () => {
  let mockServer, mockSocket, connections, room, username, removeConnection;

  beforeEach(() => {
    mockServer = {
      to: sinon.stub().returnsThis(),
      emit: sinon.stub()
    };
    mockSocket = {
      to: sinon.stub().returnsThis(),
      emit: sinon.stub()
    };
    connections = {
      testRoom: {
        'player1': { socket: mockSocket },
        'player2': { socket: mockSocket }
      }
    };
    room = 'testRoom';
    username = 'player1';
    removeConnection = sinon.stub();
  });

  describe('handleChangeName', () => {
    it('should change name when new name does not exist', () => {
      const handler = handleChangeName(connections, mockServer);
      const callback = sinon.stub();
      const oldName = 'player1';
      const newName = 'player1Updated';
      const originalPlayerData = connections[room][oldName];
      
      handler(oldName, newName, room, callback);
      
      expect(connections[room][newName]).to.equal(originalPlayerData);
      expect(connections[room][oldName]).to.be.undefined;
      expect(callback.calledWith({ status: 'ok' })).to.be.true;
      expect(mockServer.to.calledWith(room)).to.be.true;
      expect(mockServer.emit.calledWith('playerNameChanged', { oldName, newName })).to.be.true;
    });

    it('should reject name change when new name already exists', () => {
      const handler = handleChangeName(connections, mockServer);
      const callback = sinon.stub();
      const oldName = 'player1';
      const newName = 'player2'; // Already exists
      
      handler(oldName, newName, room, callback);
      
      expect(connections[room][oldName]).to.exist;
      expect(connections[room][newName]).to.exist;
      expect(callback.calledWith({ status: 'nameExists' })).to.be.true;
      // playerNameChanged event should NOT be emitted when name change fails
      expect(mockServer.emit.called).to.be.false;
    });

    it('should handle room that does not exist gracefully', () => {
      const handler = handleChangeName(connections, mockServer);
      const callback = sinon.stub();
      const oldName = 'player1';
      const newName = 'player1Updated';
      const nonExistentRoom = 'nonExistentRoom';
      
      // This will throw because the function doesn't handle missing rooms
      expect(() => {
        handler(oldName, newName, nonExistentRoom, callback);
      }).to.throw();
    });

    it('should emit playerNameChanged event with correct parameters', () => {
      const handler = handleChangeName(connections, mockServer);
      const callback = sinon.stub();
      const oldName = 'player1';
      const newName = 'newPlayer1';
      
      handler(oldName, newName, room, callback);
      
      expect(mockServer.to.calledWith(room)).to.be.true;
      expect(mockServer.emit.calledOnce).to.be.true;
      expect(mockServer.emit.calledWith('playerNameChanged', { oldName, newName })).to.be.true;
    });

    it('should not modify connections when name already exists', () => {
      const handler = handleChangeName(connections, mockServer);
      const callback = sinon.stub();
      const oldName = 'player1';
      const newName = 'player2';
      const originalPlayer1 = connections[room][oldName];
      const originalPlayer2 = connections[room][newName];
      
      handler(oldName, newName, room, callback);
      
      // Connections should remain unchanged when name exists
      expect(connections[room][oldName]).to.equal(originalPlayer1);
      expect(connections[room][newName]).to.equal(originalPlayer2);
    });
  });

  describe('handleDisconnect', () => {
    it('should remove connection and emit playerLeft event', () => {
      const handler = handleDisconnect(removeConnection, mockSocket, room, username, mockServer);
      const reason = 'transport close';
      
      handler(reason);
      
      expect(removeConnection.calledOnce).to.be.true;
      expect(removeConnection.calledWith(mockSocket)).to.be.true;
      expect(mockSocket.to.calledWith(room)).to.be.true;
      expect(mockSocket.emit.calledWith('playerLeft', username)).to.be.true;
    });

    it('should handle disconnect with different reasons', () => {
      const handler = handleDisconnect(removeConnection, mockSocket, room, username, mockServer);
      const reason = 'client namespace disconnect';
      
      handler(reason);
      
      expect(removeConnection.calledOnce).to.be.true;
      expect(mockSocket.to.calledWith(room)).to.be.true;
      expect(mockSocket.emit.calledWith('playerLeft', username)).to.be.true;
    });
  });
});