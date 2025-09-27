import { config } from 'dotenv';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';

import { logger } from './config/logger.js';
import { SupabaseAuthService } from './services/SupabaseAuthService.js';
import { SupabaseDatabase } from './services/SupabaseDatabase.js';
import { SupabaseAuthMiddleware } from './middleware/supabase-auth.js';
import lobbyRoutes from './routes/lobby.js';
import roomRoutes from './routes/room.js';

// Load environment variables
config({ path: '../../.env' });

const app = express();

// Initialize services
const authService = new SupabaseAuthService();
const database = new SupabaseDatabase();
const authMiddleware = new SupabaseAuthMiddleware(authService, database);

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.use(authMiddleware.handleSessionCookies());

// Route handlers
app.use('/lobby', lobbyRoutes);
app.use('/room', roomRoutes);

// Auth routes
app.post('/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const result = await authService.registerWithPassword(name, email, password);

    // Set auth cookies for browser clients
    authMiddleware.setAuthCookies(res, result.session);

    res.json({
      user: result.user,
      session: result.session,
      isNewUser: result.isNewUser
    });

  } catch (error: any) {
    logger.error('Registration error:', error);
    res.status(400).json({ error: error.message });
  }
});

app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await authService.loginWithPassword(email, password);

    // Set auth cookies for browser clients
    authMiddleware.setAuthCookies(res, result.session);

    res.json({
      user: result.user,
      session: result.session,
      isNewUser: result.isNewUser
    });

  } catch (error: any) {
    logger.error('Login error:', error);
    res.status(400).json({ error: error.message });
  }
});

app.post('/auth/logout', authMiddleware.requireAuth(), async (_req, res) => {
  try {
    await authService.signOut();
    authMiddleware.clearAuthCookies(res);
    res.json({ message: 'Logged out successfully' });
  } catch (error: any) {
    logger.error('Logout error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/auth/me', authMiddleware.optionalAuth(), async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  res.json({
    user: req.user,
    profile: req.userProfile
  });
});

app.post('/auth/reset-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    await authService.resetPassword(email);
    res.json({ message: 'Password reset email sent' });

  } catch (error: any) {
    logger.error('Password reset error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Game API routes (protected)
app.get('/api/users/me/stats', authMiddleware.requireAuth(), async (req, res) => {
  try {
    const userId = req.userProfile!.id;
    const stats = await database.getUserStatsByPeriod(userId, 30);
    res.json(stats);
  } catch (error: any) {
    logger.error('Stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/users/me/games', authMiddleware.requireAuth(), async (req, res) => {
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

app.get('/api/leaderboard', authMiddleware.optionalAuth(), async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const topPlayers = await database.getTopPlayers(limit);
    res.json(topPlayers);
  } catch (error: any) {
    logger.error('Leaderboard error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.GAMESERVER_PORT || 3000;

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Supabase integration enabled`);
});

// Export for potential testing
export { app, database, authService };