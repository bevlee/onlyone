import { Router, type IRouter } from 'express';
import { RoomManager } from '../services/RoomManager.js';
import { SupabaseAuthMiddleware } from '../middleware/supabase-auth.js';
import { SupabaseAuthService } from '../services/SupabaseAuthService.js';
import { SupabaseDatabase } from '../services/SupabaseDatabase.js';

// Initialize auth services
const authService = new SupabaseAuthService();
const database = new SupabaseDatabase();
const authMiddleware = new SupabaseAuthMiddleware(authService, database);

// Create router factory function that accepts shared RoomManager
export function createRoomRouter(roomManager: RoomManager): IRouter {
  const router: IRouter = Router();

// Create a new room (requires authentication)
router.post('/', authMiddleware.requireAuth(), (req, res) => {
  const { roomName } = req.body;

  if (!req.user || !req.userProfile) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!roomName || roomName.trim().length === 0) {
    return res.status(400).json({ error: 'Room name is required' });
  }

  if (roomName.length > 50) {
    return res.status(400).json({ error: 'Room name must be 50 characters or less' });
  }

  try {
    const room = roomManager.createRoom(roomName.trim());
    res.status(201).json({
      message: 'Room created successfully',
      room: {
        roomName,
        playerCount: room.players.length,
        maxPlayers: room.settings.maxPlayers,
        roomLeader: room.roomLeader
      }
    });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to create room' });
    }
  }
});

// Check room access (requires authentication)
router.get('/:roomName/status', authMiddleware.requireAuth(), (req, res) => {
  const { roomName } = req.params;

  if (!req.user || !req.userProfile) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const room = roomManager.getRoom(roomName);

    // Check if player is already in room
    const alreadyJoined = room.players.some(p => p.id === req.user!.id);

    // Check if room is full
    const isFull = room.players.length >= room.settings.maxPlayers;

    res.json({
      canJoin: alreadyJoined || !isFull,
      alreadyJoined,
      isFull,
      reason: isFull && !alreadyJoined ? 'Room is full' : null,
      room: {
        roomName,
        playerCount: room.players.length,
        maxPlayers: room.settings.maxPlayers,
        status: room.status
      }
    });
  } catch (error) {
    // Room doesn't exist
    res.status(404).json({
      canJoin: false,
      alreadyJoined: false,
      isFull: false,
      reason: 'Room not found',
      room: null
    });
  }
});

// Join a room (requires authentication) - idempotent
router.post('/:roomName/join', authMiddleware.requireAuth(), (req, res) => {
  const { roomName } = req.params;

  if (!req.user || !req.userProfile) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const room = roomManager.getRoom(roomName);

    // Check if player is already in room
    const existingPlayer = room.players.find(p => p.id === req.user!.id);

    if (existingPlayer) {
      // Already joined - return success anyway (idempotent)
      return res.json({
        message: 'Already in room',
        alreadyJoined: true,
        room: {
          roomName,
          playerCount: room.players.length,
          maxPlayers: room.settings.maxPlayers,
          roomLeader: room.roomLeader
        },
        player: {
          id: existingPlayer.id,
          name: existingPlayer.name,
        }
      });
    }

    // Use session-based player identification
    const player = {
      id: req.user.id,
      name: req.userProfile.name,
      socketId: undefined
    };

    const updatedRoom = roomManager.joinRoom(roomName, player);
    res.json({
      message: 'Successfully joined room',
      alreadyJoined: false,
      room: {
        roomName,
        playerCount: updatedRoom.players.length,
        maxPlayers: updatedRoom.settings.maxPlayers,
        roomLeader: updatedRoom.roomLeader
      },
      player: {
        id: player.id,
        name: player.name,
      }
    });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to join room' });
    }
  }
});

// Leave current room (requires authentication)
router.post('/leave', (req, res) => {
  // TODO: Implement authentication check
  // TODO: Get user's current room
  // TODO: Remove user from room
  // TODO: Notify other players
  // TODO: Handle room cleanup if last player

  res.json({
    message: 'Successfully left room',
    formerroomName: 'room123'
  });
});

// Get current room status (requires authentication and being in a room)
router.get('/status', (req, res) => {
  // TODO: Implement authentication check
  // TODO: Get user's current room
  // TODO: Return room state and player list

  res.json({
    roomName: 'room123',
    name: 'My Game Room',
    status: 'waiting', // waiting, playing, finished
    players: [
      { id: 'player1', name: 'Alice', isOwner: true },
      { id: 'player2', name: 'Bob', isOwner: false },
      { id: 'current-user-id', name: 'CurrentPlayer', isOwner: false }
    ],
    maxPlayers: 12,
    gameState: null, // Game-specific state when playing
    settings: {
      timeLimit: 30
    }
  });
});

// Get players in current room (requires authentication and being in a room)
router.get('/players', (req, res) => {
  // TODO: Implement authentication check
  // TODO: Verify user is in a room
  // TODO: Return player list

  res.json({
    players: [
      {
        id: 'player1',
        name: 'Alice',
        isOwner: true,
        stats: { gamesPlayed: 15, gamesWon: 8 }
      },
      {
        id: 'player2',
        name: 'Bob',
        isOwner: false,
        stats: { gamesPlayed: 3, gamesWon: 1 }
      }
    ],
    playerCount: 2,
    maxPlayers: 12
  });
});


// Kick a player from room (requires authentication, being in room, and being room owner)
router.post('/kick/:playerId', (req, res) => {
  const { playerId } = req.params;
  const { reason = 'No reason provided' } = req.body;

  // TODO: Implement authentication check
  // TODO: Verify user is room owner
  // TODO: Verify target player is in same room
  // TODO: Remove player from room
  // TODO: Notify kicked player and remaining players

  res.json({
    message: `Player ${playerId} has been kicked from the room`,
    kickedPlayerId: playerId,
    reason
  });
});

// Invite player to room (requires authentication and being in a room)
router.post('/invite', (req, res) => {
  const { playerName, playerId } = req.body;

  if (!playerName && !playerId) {
    return res.status(400).json({ error: 'Player name or ID is required' });
  }

  // TODO: Implement authentication check
  // TODO: Verify user is in a room
  // TODO: Check if room has space
  // TODO: Send invitation to target player
  // TODO: Handle invitation expiration

  res.json({
    message: `Invitation sent to ${playerName || playerId}`,
    invitationId: `inv_${Date.now()}`,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes
  });
});

// Start game (requires authentication, being room owner, and minimum 2 players)
router.post('/start', (req, res) => {
  // TODO: Implement authentication check
  // TODO: Verify user is room owner
  // TODO: Check minimum 2 players in room
  // TODO: Initialize game state
  // TODO: Notify all players game is starting

  res.json({
    message: 'Game started successfully',
    gameId: `game_${Date.now()}`,
    gameState: {
      status: 'playing',
      startedAt: new Date().toISOString(),
      currentPhase: 'word-selection',
      timeRemaining: 30
    }
  });
});

// End/stop game (requires authentication and being room owner)
router.post('/stop', (req, res) => {
  const { reason = 'Game stopped by owner' } = req.body;

  // TODO: Implement authentication check
  // TODO: Verify user is room owner
  // TODO: End current game
  // TODO: Save game results
  // TODO: Reset room to waiting state

  res.json({
    message: 'Game stopped successfully',
    reason,
    finalGameState: {
      status: 'stopped',
      duration: 180,
      winner: null
    }
  });
});

  return router;
}

// Default export for backward compatibility (creates its own instance)
const defaultRoomManager = new RoomManager();
export default createRoomRouter(defaultRoomManager);