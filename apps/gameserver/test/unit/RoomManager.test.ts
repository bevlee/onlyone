import { describe, it, expect, beforeEach } from 'vitest';
import { RoomManager } from '../../src/services/RoomManager';
import type { RoomPlayer } from '@onlyone/shared';

describe('RoomManager', () => {
  let roomManager: RoomManager;

  beforeEach(() => {
    roomManager = new RoomManager();
  });

  describe('createRoom', () => {
    it('should create room with default settings', () => {
      const room = roomManager.createRoom('test-room');

      expect(room.roomName).toBe('test-room');
      expect(room.status).toBe('waiting');
      expect(room.players).toHaveLength(0);
      expect(room.spectators).toHaveLength(0);
      expect(room.settings.maxPlayers).toBe(12);
      expect(room.settings.timeLimit).toBe(30);
      expect(room.roomLeader).toBeNull();
    });

    it('should create room that can have settings updated later', () => {
      roomManager.createRoom('custom-room');
      roomManager.joinRoom('custom-room', { id: 'leader', name: 'Leader' });

      const updated = roomManager.updateRoomSettings('custom-room', 'leader', {
        maxPlayers: 6,
        timeLimit: 60
      });

      expect(updated).toBe(true);
      const updatedRoom = roomManager.getRoom('custom-room');
      expect(updatedRoom.settings.maxPlayers).toBe(6);
      expect(updatedRoom.settings.timeLimit).toBe(60);
    });

    it('should throw error when room already exists', () => {
      roomManager.createRoom('duplicate-room');

      expect(() => roomManager.createRoom('duplicate-room')).toThrow('Room duplicate-room already exists');
    });
  });

  describe('joinRoom', () => {
    beforeEach(() => {
      roomManager.createRoom('test-room');
    });

    it('should add player to room and set as leader if first player', () => {
      const player: RoomPlayer = { id: 'player-1', name: 'Alice' };

      const room = roomManager.joinRoom('test-room', player);

      expect(room.players).toHaveLength(1);
      expect(room.players[0]).toEqual(player);
      expect(room.roomLeader).toBe('player-1');
    });

    it('should add player to room without changing leader if not first', () => {
      const player1: RoomPlayer = { id: 'player-1', name: 'Alice' };
      const player2: RoomPlayer = { id: 'player-2', name: 'Bob' };

      roomManager.joinRoom('test-room', player1);
      const room = roomManager.joinRoom('test-room', player2);

      expect(room.players).toHaveLength(2);
      expect(room.roomLeader).toBe('player-1');
    });

    it('should throw error when room is full', () => {
      roomManager.createRoom('small-room');
      roomManager.joinRoom('small-room', { id: 'player-1', name: 'Alice' });
      roomManager.updateRoomSettings('small-room', 'player-1', { maxPlayers: 2 });
      roomManager.joinRoom('small-room', { id: 'player-2', name: 'Bob' });

      expect(() => roomManager.joinRoom('small-room', { id: 'player-3', name: 'Charlie' }))
        .toThrow('Room is full');
    });
  });

  describe('leaveRoom', () => {
    beforeEach(() => {
      roomManager.createRoom('test-room');
      roomManager.joinRoom('test-room', { id: 'player-1', name: 'Alice' });
      roomManager.joinRoom('test-room', { id: 'player-2', name: 'Bob' });
    });

    it('should remove player from room', () => {
      const result = roomManager.leaveRoom('test-room', 'player-2');

      expect(result).toBe(true);
      const room = roomManager.getRoom('test-room');
      expect(room.players).toHaveLength(1);
      expect(room.players[0].id).toBe('player-1');
    });

    it('should transfer leadership when leader leaves', () => {
      const initialRoom = roomManager.getRoom('test-room');
      expect(initialRoom.roomLeader).toBe('player-1');

      const result = roomManager.leaveRoom('test-room', 'player-1');

      expect(result).toBe(true);
      const room = roomManager.getRoom('test-room');
      expect(room.roomLeader).toBe('player-2');
      expect(room.players).toHaveLength(1);
    });

    it('should delete room when last player leaves', () => {
      roomManager.leaveRoom('test-room', 'player-1');
      const result = roomManager.leaveRoom('test-room', 'player-2');

      expect(result).toBe(true);
      expect(() => roomManager.getRoom('test-room')).toThrow('Room test-room not found');
    });
  });

  describe('getRoom', () => {
    it('should return room when it exists', () => {
      roomManager.createRoom('test-room');

      const room = roomManager.getRoom('test-room');

      expect(room.roomName).toBe('test-room');
    });

    it('should throw error when room does not exist', () => {
      expect(() => roomManager.getRoom('nonexistent-room')).toThrow('Room nonexistent-room not found');
    });

    it('should return room with current state', () => {
      roomManager.createRoom('test-room');
      roomManager.joinRoom('test-room', { id: 'player-1', name: 'Alice' });

      const room = roomManager.getRoom('test-room');

      expect(room.players).toHaveLength(1);
      expect(room.players[0].name).toBe('Alice');
    });
  });

  describe('getActiveRooms', () => {
    it('should return empty array when no rooms exist', () => {
      const rooms = roomManager.getActiveRooms();

      expect(rooms).toHaveLength(0);
    });

    it('should return all active rooms', () => {
      roomManager.createRoom('room-1');
      roomManager.createRoom('room-2');
      roomManager.createRoom('room-3');

      const rooms = roomManager.getActiveRooms();

      expect(rooms).toHaveLength(3);
      expect(rooms.map(r => r.roomName)).toContain('room-1');
      expect(rooms.map(r => r.roomName)).toContain('room-2');
      expect(rooms.map(r => r.roomName)).toContain('room-3');
    });

    it('should not include deleted rooms', () => {
      roomManager.createRoom('room-1');
      roomManager.createRoom('room-2');
      roomManager.deleteRoom('room-1');

      const rooms = roomManager.getActiveRooms();

      expect(rooms).toHaveLength(1);
      expect(rooms[0].roomName).toBe('room-2');
    });
  });

  describe('deleteRoom', () => {
    it('should delete existing room and return true', () => {
      roomManager.createRoom('test-room');

      const result = roomManager.deleteRoom('test-room');

      expect(result).toBe(true);
      expect(() => roomManager.getRoom('test-room')).toThrow('Room test-room not found');
    });

    it('should return false when room does not exist', () => {
      const result = roomManager.deleteRoom('nonexistent-room');

      expect(result).toBe(false);
    });

    it('should not affect other rooms when deleting one room', () => {
      roomManager.createRoom('room-1');
      roomManager.createRoom('room-2');

      roomManager.deleteRoom('room-1');

      expect(() => roomManager.getRoom('room-2')).not.toThrow();
      expect(roomManager.getActiveRooms()).toHaveLength(1);
    });
  });

  describe('getRoomDetails', () => {
    it('should return room details when room exists', () => {
      roomManager.createRoom('test-room');
      roomManager.joinRoom('test-room', { id: 'player-1', name: 'Alice' });

      const details = roomManager.getRoomDetails('test-room');

      expect(details.roomName).toBe('test-room');
      expect(details.players).toHaveLength(1);
    });

    it('should throw error when room does not exist', () => {
      expect(() => roomManager.getRoomDetails('nonexistent-room'))
        .toThrow('Room nonexistent-room not found');
    });

    it('should return same reference as getRoom', () => {
      roomManager.createRoom('test-room');

      const details = roomManager.getRoomDetails('test-room');
      const room = roomManager.getRoom('test-room');

      expect(details).toBe(room);
    });
  });

  describe('getRoomLeader', () => {
    it('should return null when no leader is set', () => {
      roomManager.createRoom('test-room');

      const leader = roomManager.getRoomLeader('test-room');

      expect(leader).toBeNull();
    });

    it('should return leader id when leader exists', () => {
      roomManager.createRoom('test-room');
      roomManager.joinRoom('test-room', { id: 'player-1', name: 'Alice' });

      const leader = roomManager.getRoomLeader('test-room');

      expect(leader).toBe('player-1');
    });

    it('should throw error when room does not exist', () => {
      expect(() => roomManager.getRoomLeader('nonexistent-room'))
        .toThrow('Room nonexistent-room not found');
    });
  });

  describe('isRoomLeader', () => {
    beforeEach(() => {
      roomManager.createRoom('test-room');
      roomManager.joinRoom('test-room', { id: 'player-1', name: 'Alice' });
      roomManager.joinRoom('test-room', { id: 'player-2', name: 'Bob' });
    });

    it('should return true when player is room leader', () => {
      const result = roomManager.isRoomLeader('test-room', 'player-1');

      expect(result).toBe(true);
    });

    it('should return false when player is not room leader', () => {
      const result = roomManager.isRoomLeader('test-room', 'player-2');

      expect(result).toBe(false);
    });

    it('should return false when player does not exist', () => {
      const result = roomManager.isRoomLeader('test-room', 'nonexistent-player');

      expect(result).toBe(false);
    });
  });

  describe('transferLeadership', () => {
    beforeEach(() => {
      roomManager.createRoom('test-room');
      roomManager.joinRoom('test-room', { id: 'player-1', name: 'Alice' });
      roomManager.joinRoom('test-room', { id: 'player-2', name: 'Bob' });
    });

    it('should transfer leadership to new player', () => {
      const result = roomManager.transferLeadership('test-room', 'player-1', 'player-2');

      expect(result).toBe(true);
      const room = roomManager.getRoom('test-room');
      expect(room.roomLeader).toBe('player-2');
      expect(room.players[0].id).toBe('player-2');
    });

    it('should return false when current leader id does not match', () => {
      const result = roomManager.transferLeadership('test-room', 'player-2', 'player-1');

      expect(result).toBe(false);
      const room = roomManager.getRoom('test-room');
      expect(room.roomLeader).toBe('player-1');
    });

    it('should return false when new leader is not in room', () => {
      const result = roomManager.transferLeadership('test-room', 'player-1', 'nonexistent-player');

      expect(result).toBe(false);
      const room = roomManager.getRoom('test-room');
      expect(room.roomLeader).toBe('player-1');
    });
  });

  describe('updateRoomSettings', () => {
    beforeEach(() => {
      roomManager.createRoom('test-room');
      roomManager.joinRoom('test-room', { id: 'player-1', name: 'Alice' });
    });

    it('should update settings when called by room leader', () => {
      const result = roomManager.updateRoomSettings('test-room', 'player-1', {
        maxPlayers: 8,
        timeLimit: 45
      });

      expect(result).toBe(true);
      const room = roomManager.getRoom('test-room');
      expect(room.settings.maxPlayers).toBe(8);
      expect(room.settings.timeLimit).toBe(45);
    });

    it('should return false when called by non-leader', () => {
      roomManager.joinRoom('test-room', { id: 'player-2', name: 'Bob' });

      const result = roomManager.updateRoomSettings('test-room', 'player-2', {
        maxPlayers: 8
      });

      expect(result).toBe(false);
      const room = roomManager.getRoom('test-room');
      expect(room.settings.maxPlayers).toBe(12);
    });

    it('should return false when settings are invalid', () => {
      const resultMaxTooHigh = roomManager.updateRoomSettings('test-room', 'player-1', {
        maxPlayers: 20
      });
      const resultMaxTooLow = roomManager.updateRoomSettings('test-room', 'player-1', {
        maxPlayers: 1
      });
      const resultTimeTooHigh = roomManager.updateRoomSettings('test-room', 'player-1', {
        timeLimit: 500
      });
      const resultTimeTooLow = roomManager.updateRoomSettings('test-room', 'player-1', {
        timeLimit: 5
      });

      expect(resultMaxTooHigh).toBe(false);
      expect(resultMaxTooLow).toBe(false);
      expect(resultTimeTooHigh).toBe(false);
      expect(resultTimeTooLow).toBe(false);

      const room = roomManager.getRoom('test-room');
      expect(room.settings.maxPlayers).toBe(12);
      expect(room.settings.timeLimit).toBe(30);
    });
  });

  describe('updatePlayerSocket', () => {
    beforeEach(() => {
      roomManager.createRoom('test-room');
      roomManager.joinRoom('test-room', { id: 'player-1', name: 'Alice' });
    });

    it('should update player socket id', () => {
      const result = roomManager.updatePlayerSocket('test-room', 'player-1', 'socket-123');

      expect(result).toBe(true);
      const room = roomManager.getRoom('test-room');
      expect(room.players[0].socketId).toBe('socket-123');
    });

    it('should return false when room does not exist', () => {
      const result = roomManager.updatePlayerSocket('nonexistent-room', 'player-1', 'socket-123');

      expect(result).toBe(false);
    });

    it('should return false when player does not exist in room', () => {
      const result = roomManager.updatePlayerSocket('test-room', 'nonexistent-player', 'socket-123');

      expect(result).toBe(false);
      const room = roomManager.getRoom('test-room');
      expect(room.players[0].socketId).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('should transfer leadership properly when leader leaves', () => {
      roomManager.createRoom('test-room');
      roomManager.joinRoom('test-room', { id: 'player-1', name: 'Alice' });
      roomManager.joinRoom('test-room', { id: 'player-2', name: 'Bob' });

      const result = roomManager.leaveRoom('test-room', 'player-1');

      expect(result).toBe(true);
      const room = roomManager.getRoom('test-room');
      expect(room.roomLeader).toBe('player-2');
      expect(room.players).toHaveLength(1);
    });

    it('should return false when leaving non-existent room', () => {
      const result = roomManager.leaveRoom('nonexistent-room', 'player-1');

      expect(result).toBe(false);
    });

    it('should return false when leaving with non-existent player', () => {
      roomManager.createRoom('test-room');
      roomManager.joinRoom('test-room', { id: 'player-1', name: 'Alice' });

      const result = roomManager.leaveRoom('test-room', 'nonexistent-player');

      expect(result).toBe(false);
      const room = roomManager.getRoom('test-room');
      expect(room.players).toHaveLength(1);
    });
  });
});
