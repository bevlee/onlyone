import { expect } from 'chai';
import sinon from 'sinon';
import { ConnectionManager } from '../modules/connectionManager.js';

describe('ConnectionManager', () => {
  let connectionManager;
  let mockSocket;

  beforeEach(() => {
    connectionManager = new ConnectionManager();
    mockSocket = {
      id: 'socket123',
      handshake: {
        auth: {
          username: 'testUser',
          room: 'testRoom'
        }
      },
      join: sinon.stub(),
      leave: sinon.stub()
    };
  });

  describe('constructor', () => {
    it('should initialize with empty connections object', () => {
      expect(connectionManager.connections).to.be.an('object');
      expect(Object.keys(connectionManager.connections)).to.have.length(0);
    });
  });

  describe('addConnection', () => {
    it('should add connection to new room', () => {
      connectionManager.addConnection(mockSocket);
      
      const connections = connectionManager.getConnections('testRoom');
      expect(connections).to.have.property('testUser');
      expect(connections.testUser.playerId).to.equal('socket123');
      expect(connections.testUser.role).to.equal('');
    });

    it('should add connection to existing room', () => {
      connectionManager.addConnection(mockSocket);
      
      const secondSocket = {
        id: 'socket456',
        handshake: {
          auth: {
            username: 'testUser2',
            room: 'testRoom'
          }
        },
        join: sinon.stub(),
        leave: sinon.stub()
      };
      
      connectionManager.addConnection(secondSocket);
      
      const connections = connectionManager.getConnections('testRoom');
      expect(Object.keys(connections)).to.have.length(2);
      expect(connections).to.have.property('testUser');
      expect(connections).to.have.property('testUser2');
    });

    it('should create room-related methods for connection', () => {
      connectionManager.addConnection(mockSocket);
      
      const connection = connectionManager.getConnections('testRoom').testUser;
      expect(connection.joinRoom).to.be.a('function');
      expect(connection.leaveRoom).to.be.a('function');
    });

    it('should bind socket methods correctly', () => {
      connectionManager.addConnection(mockSocket);
      
      const connection = connectionManager.getConnections('testRoom').testUser;
      connection.joinRoom('newRoom');
      connection.leaveRoom('oldRoom');
      
      expect(mockSocket.join.calledWith('newRoom')).to.be.true;
      expect(mockSocket.leave.calledWith('oldRoom')).to.be.true;
    });

    it('should overwrite existing connection with same username', () => {
      connectionManager.addConnection(mockSocket);
      
      const newSocket = {
        id: 'socket789',
        handshake: {
          auth: {
            username: 'testUser',
            room: 'testRoom'
          }
        },
        join: sinon.stub(),
        leave: sinon.stub()
      };
      
      connectionManager.addConnection(newSocket);
      
      const connections = connectionManager.getConnections('testRoom');
      expect(Object.keys(connections)).to.have.length(1);
      expect(connections.testUser.playerId).to.equal('socket789');
    });
  });

  describe('removeConnection', () => {
    beforeEach(() => {
      connectionManager.addConnection(mockSocket);
    });

    it('should remove connection from room', () => {
      connectionManager.removeConnection(mockSocket);
      
      const connections = connectionManager.getConnections('testRoom');
      expect(connections).to.not.have.property('testUser');
    });

    it('should remove empty room after removing last connection', () => {
      connectionManager.removeConnection(mockSocket);
      
      expect(connectionManager.connections).to.not.have.property('testRoom');
    });

    it('should not remove room if other connections exist', () => {
      const secondSocket = {
        id: 'socket456',
        handshake: {
          auth: {
            username: 'testUser2',
            room: 'testRoom'
          }
        },
        join: sinon.stub(),
        leave: sinon.stub()
      };
      
      connectionManager.addConnection(secondSocket);
      connectionManager.removeConnection(mockSocket);
      
      expect(connectionManager.connections).to.have.property('testRoom');
      const connections = connectionManager.getConnections('testRoom');
      expect(connections).to.have.property('testUser2');
      expect(connections).to.not.have.property('testUser');
    });

    it('should handle removing non-existent connection gracefully', () => {
      const nonExistentSocket = {
        handshake: {
          auth: {
            username: 'nonExistent',
            room: 'testRoom'
          }
        }
      };
      
      expect(() => connectionManager.removeConnection(nonExistentSocket)).to.not.throw();
    });

    it('should handle removing connection from non-existent room gracefully', () => {
      const socketFromNonExistentRoom = {
        handshake: {
          auth: {
            username: 'testUser',
            room: 'nonExistentRoom'
          }
        }
      };
      
      expect(() => connectionManager.removeConnection(socketFromNonExistentRoom)).to.not.throw();
    });
  });

  describe('getConnections', () => {
    it('should return connections for existing room', () => {
      connectionManager.addConnection(mockSocket);
      
      const connections = connectionManager.getConnections('testRoom');
      expect(connections).to.be.an('object');
      expect(connections).to.have.property('testUser');
    });

    it('should return empty object for non-existent room', () => {
      const connections = connectionManager.getConnections('nonExistentRoom');
      expect(connections).to.be.an('object');
      expect(Object.keys(connections)).to.have.length(0);
    });
  });

  describe('getAllConnections', () => {
    it('should return all connections across all rooms', () => {
      connectionManager.addConnection(mockSocket);
      
      const secondSocket = {
        id: 'socket456',
        handshake: {
          auth: {
            username: 'user2',
            room: 'room2'
          }
        },
        join: sinon.stub(),
        leave: sinon.stub()
      };
      
      connectionManager.addConnection(secondSocket);
      
      const allConnections = connectionManager.getAllConnections();
      expect(allConnections).to.have.property('testRoom');
      expect(allConnections).to.have.property('room2');
      expect(allConnections.testRoom).to.have.property('testUser');
      expect(allConnections.room2).to.have.property('user2');
    });

    it('should return empty object when no connections exist', () => {
      const allConnections = connectionManager.getAllConnections();
      expect(allConnections).to.be.an('object');
      expect(Object.keys(allConnections)).to.have.length(0);
    });
  });
});