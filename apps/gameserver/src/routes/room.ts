import { Router, type IRouter } from 'express';

const router: IRouter = Router();

// Join a room (requires authentication)
router.post('/join', (req, res) => {
  const { roomId } = req.body;

  if (!roomId) {
    return res.status(400).json({ error: 'Room ID is required' });
  }

  // TODO: Implement authentication check
  // TODO: Implement actual room joining logic
  // TODO: Check if room exists and has space
  // TODO: Update user's current room status

  res.json({
    message: 'Successfully joined room',
    roomId,
    playerId: 'current-user-id', // TODO: Get from auth middleware
    playerCount: 3,
    maxPlayers: 12
  });
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
    formerRoomId: 'room123'
  });
});

// Get current room status (requires authentication and being in a room)
router.get('/status', (req, res) => {
  // TODO: Implement authentication check
  // TODO: Get user's current room
  // TODO: Return room state and player list

  res.json({
    roomId: 'room123',
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

export default router;