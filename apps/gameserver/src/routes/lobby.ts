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
export function createLobbyRouter(roomManager: RoomManager): IRouter {
  const router: IRouter = Router();

// Get all active rooms
router.get('/rooms', (_req, res) => {
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

// Create a new room (requires authentication - anonymous or permanent)
router.post('/rooms', authMiddleware.requireAuth(), (req, res) => {
  const { roomName } = req.body;

  if (!req.user || !req.userProfile) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!roomName || roomName.trim().length === 0) {
    return res.status(400).json({ error: 'Room ID is required' });
  }

  if (roomName.length > 50) {
    return res.status(400).json({ error: 'Room ID must be 50 characters or less' });
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

// Join a room from the lobby (requires authentication - anonymous or permanent)
router.post('/rooms/:roomName', authMiddleware.requireAuth(), (req, res) => {
  const { roomName } = req.params;

  if (!req.user || !req.userProfile) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Use session-based player identification
  const player = {
    id: req.user.id,
    name: req.userProfile.name,
    socketId: undefined
  };

  try {
    const room = roomManager.joinRoom(roomName, player);
    res.json({
      message: 'Successfully joined room',
      room: {
        roomName,
        playerCount: room.players.length,
        maxPlayers: room.settings.maxPlayers,
        roomLeader: room.roomLeader
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

  return router;
}

// Default export for backward compatibility (creates its own instance)
const defaultRoomManager = new RoomManager();
export default createLobbyRouter(defaultRoomManager);