import { Router } from 'express';
import { RoomManager } from '../services/RoomManager.js';
import { SupabaseAuthMiddleware } from '../middleware/supabase-auth.js';
import { SupabaseAuthService } from '../services/SupabaseAuthService.js';
import { SupabaseDatabase } from '../services/SupabaseDatabase.js';

const router = Router();
const roomManager = new RoomManager();

// Initialize auth services
const authService = new SupabaseAuthService();
const database = new SupabaseDatabase();
const authMiddleware = new SupabaseAuthMiddleware(authService, database);

// Get all active rooms (public endpoint - anyone can browse)
router.get('/rooms', (req, res) => {
  try {
    const activeRooms = roomManager.getActiveRooms();
    res.json({
      rooms: activeRooms,
      total: activeRooms.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch active rooms' });
  }
});

// Join a room from the lobby (optional authentication - supports anonymous play)
router.post('/rooms/:roomId', authMiddleware.optionalAuth(), (req, res) => {
  const { roomId } = req.params;
  const { playerName } = req.body; // For anonymous users

  let player;

  if (req.user && req.userProfile) {
    // Authenticated user
    player = {
      id: req.user.id,
      name: req.userProfile.name,
      socketId: undefined
    };
  } else {
    // Anonymous user
    if (!playerName || playerName.trim().length === 0) {
      return res.status(400).json({
        error: 'Player name is required for anonymous users'
      });
    }

    if (playerName.length > 20) {
      return res.status(400).json({
        error: 'Player name must be 20 characters or less'
      });
    }

    // Generate anonymous ID
    const anonymousId = `anon_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    player = {
      id: anonymousId,
      name: playerName.trim(),
      socketId: undefined
    };
  }

  try {
    const room = roomManager.joinRoom(roomId, player);
    res.json({
      message: 'Successfully joined room',
      room: {
        roomId,
        playerCount: room.players.length,
        maxPlayers: room.settings.maxPlayers,
        roomLeader: room.roomLeader
      },
      player: {
        id: player.id,
        name: player.name,
        isAnonymous: !req.user
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

export default router;