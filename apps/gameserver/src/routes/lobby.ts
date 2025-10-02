import { Router, type IRouter } from 'express';
import { RoomManager } from '../services/RoomManager.js';

// Create router factory function that accepts shared RoomManager
export function createLobbyRouter(roomManager: RoomManager): IRouter {
  const router: IRouter = Router();

// Get all active rooms (public endpoint)
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

  return router;
}

// Default export for backward compatibility (creates its own instance)
const defaultRoomManager = new RoomManager();
export default createLobbyRouter(defaultRoomManager);