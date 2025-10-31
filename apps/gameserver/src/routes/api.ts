import { Router, type IRouter } from 'express';
import { SupabaseAuthService } from '../services/SupabaseAuthService.js';
import { SupabaseDatabase } from '../services/SupabaseDatabase.js';
import { SupabaseAuthMiddleware } from '../middleware/supabase-auth.js';
import { logger } from '../config/logger.js';

// Initialize auth services
const authService = new SupabaseAuthService();
const database = new SupabaseDatabase();
const authMiddleware = new SupabaseAuthMiddleware(authService, database);

const router: IRouter = Router();

// Game API routes (protected)
router.get('/users/me/stats', authMiddleware.requireAuth(), async (req, res) => {
  try {
    const userId = req.userProfile!.id;
    const stats = await database.getUserStatsByPeriod(userId, 30);
    res.json(stats);
  } catch (error: any) {
    logger.error('Stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/users/me/games', authMiddleware.requireAuth(), async (req, res) => {
  try {
    const userId = req.userProfile!.id;
    const limit = parseInt(req.query.limit as string) || 10;
    const games = await database.getGamesByUser(userId, limit);
    res.json(games);
  } catch (error: any) {
    logger.error('Games error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/leaderboard', authMiddleware.optionalAuth(), async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const topPlayers = await database.getTopPlayers(limit);
    res.json(topPlayers);
  } catch (error: any) {
    logger.error('Leaderboard error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
