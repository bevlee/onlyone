import { describe, it, beforeEach, expect } from 'vitest';
import { Room, RoomPlayer } from '@shared/Room';
import { RoomManager } from '../../src/services/RoomManager';

describe('RoomManager with Shared Room Types', () => {
  let roomManager: RoomManager;
  let room: Room;
  let roomId: string;

  beforeEach(() => {
    roomManager = new RoomManager();
    roomId = 'test-room';
    const creatorPlayer: RoomPlayer = { id: 'creator', name: 'Creator' };
    room = roomManager.createRoom(roomId, creatorPlayer, { maxPlayers: 12, timeLimit: 30 });
  });

  describe('room creation', () => {
    it('should create room with correct initial state', () => {
      expect(room.players).to.have.length(1); // Creator is automatically added
      expect(room.players[0].id).to.equal('creator');
      expect(room.settings.maxPlayers).to.equal(12);
      expect(room.settings.timeLimit).to.equal(30);
      expect(room.gameState.gamesWon).to.equal(0);
      expect(room.gameState.gamesPlayed).to.equal(0);
      expect(room.roomLeader).to.equal('creator');
      expect(room.spectators).to.have.length(0);
    });

    it('should use default maxPlayers of 12', () => {
      const creatorPlayer: RoomPlayer = { id: 'creator2', name: 'Creator2' };
      const defaultRoom = roomManager.createRoom('test2', creatorPlayer);
      expect(defaultRoom.settings.maxPlayers).to.equal(12);
    });
  });

  describe('joinRoom', () => {
    it('should add player when room has space', () => {
      const player: RoomPlayer = { id: 'player1', name: 'Alice' };

      const updatedRoom = roomManager.joinRoom(roomId, player);

      expect(updatedRoom.players).to.have.length(2); // Creator + new player
      expect(updatedRoom.players[1]).to.deep.equal(player);
    });

    it('should reject player when room is full', () => {
      // Fill the room (already has 1 creator, add 11 more)
      for (let i = 0; i < 11; i++) {
        roomManager.joinRoom(roomId, { id: `player${i}`, name: `Player ${i}` });
      }

      const newPlayer: RoomPlayer = { id: 'player13', name: 'Player 13' };

      expect(() => roomManager.joinRoom(roomId, newPlayer)).toThrow('Room is full');

      const finalRoom = roomManager.getRoom(roomId);
      expect(finalRoom.players).to.have.length(12);
    });

    it('should reject duplicate player', () => {
      const player: RoomPlayer = { id: 'player1', name: 'Alice' };

      roomManager.joinRoom(roomId, player);

      expect(() => roomManager.joinRoom(roomId, player)).toThrow('Player already in room');

      const finalRoom = roomManager.getRoom(roomId);
      expect(finalRoom.players).to.have.length(2); // Creator + player
    });
  });

  describe('leaveRoom', () => {
    beforeEach(() => {
      roomManager.joinRoom(roomId, { id: 'player1', name: 'Alice' });
      roomManager.joinRoom(roomId, { id: 'player2', name: 'Bob' });
    });

    it('should remove existing player', () => {
      const result = roomManager.leaveRoom(roomId, 'player2');

      expect(result).to.be.true;
      const updatedRoom = roomManager.getRoom(roomId);
      expect(updatedRoom.players).to.have.length(2); // Creator + player1
      expect(updatedRoom.players[0].id).to.equal('creator');
      expect(updatedRoom.players[1].id).to.equal('player1');
    });

    it('should transfer leadership when leader leaves', () => {
      const result = roomManager.leaveRoom(roomId, 'creator');

      expect(result).to.be.true;
      const updatedRoom = roomManager.getRoom(roomId);
      expect(updatedRoom.players).to.have.length(2); // player1 + player2
      expect(updatedRoom.roomLeader).to.equal('player1'); // First remaining player becomes leader
    });

    it('should return false for non-existent player', () => {
      const result = roomManager.leaveRoom(roomId, 'non-existent');

      expect(result).to.be.false;
      const updatedRoom = roomManager.getRoom(roomId);
      expect(updatedRoom.players).to.have.length(3); // Creator + 2 players
    });
  });


  describe('Room Leader', () => {
    it('should set creator as initial room leader', () => {
      expect(room.roomLeader).to.equal('creator');
    });

    it('should transfer leadership when leader leaves', () => {
      roomManager.joinRoom(roomId, { id: 'player1', name: 'Alice' });
      roomManager.joinRoom(roomId, { id: 'player2', name: 'Bob' });

      roomManager.leaveRoom(roomId, 'creator'); // Leader leaves

      const updatedRoom = roomManager.getRoom(roomId);
      expect(updatedRoom.roomLeader).to.equal('player1'); // First remaining player becomes leader
      expect(updatedRoom.players[0].id).to.equal('player1');
    });

    it('should check if player is room leader', () => {
      expect(roomManager.isRoomLeader(roomId, 'creator')).to.be.true;
      expect(roomManager.isRoomLeader(roomId, 'nonexistent')).to.be.false;
    });

    it('should transfer leadership manually', () => {
      roomManager.joinRoom(roomId, { id: 'player1', name: 'Alice' });

      const result = roomManager.transferLeadership(roomId, 'creator', 'player1');

      expect(result).to.be.true;
      const updatedRoom = roomManager.getRoom(roomId);
      expect(updatedRoom.roomLeader).to.equal('player1');
      expect(updatedRoom.players[0].id).to.equal('player1'); // Moved to first position
    });

    it('should reject transfer to non-existent player', () => {
      const result = roomManager.transferLeadership(roomId, 'creator', 'nonexistent');

      expect(result).to.be.false;
      const updatedRoom = roomManager.getRoom(roomId);
      expect(updatedRoom.roomLeader).to.equal('creator'); // Unchanged
    });
  });

});