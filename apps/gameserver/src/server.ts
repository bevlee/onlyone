import { config } from 'dotenv';

// Load environment variables FIRST before any other imports
// Load root .env first, then local .env (which overrides)
config({ path: '../../.env' });
config({ path: '.env', override: true });

import express, { type Express } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';

import { logger } from './config/logger.js';
import { SupabaseAuthService } from './services/SupabaseAuthService.js';
import { SupabaseDatabase } from './services/SupabaseDatabase.js';
import { SupabaseAuthMiddleware } from './middleware/supabase-auth.js';
import { createSocketServer } from './config/socketConfig.js';
import { setupSocketHandlers } from './handlers/socketHandlers.js';
import { ConnectionManager } from './services/ConnectionManager.js';
import { RoomManager } from './services/RoomManager.js';
import { createLobbyRouter } from './routes/lobby.js';
import roomRoutes from './routes/room.js';

const app: Express = express();

// Initialize services
const authService = new SupabaseAuthService();
const database = new SupabaseDatabase();
const authMiddleware = new SupabaseAuthMiddleware(authService, database);
const connectionManager = new ConnectionManager();
const roomManager = new RoomManager();

// Create HTTP server with Socket.IO
const { httpServer, io } = createSocketServer(app);

// Middleware
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || "http://localhost:5173",
    "http://localhost:5174", // Alternative port
    "http://localhost:3000",  // Legacy port
    "http://localhost:4173"   // Vite preview port
  ],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.use(authMiddleware.handleSessionCookies());

// Route handlers
app.use('/lobby', createLobbyRouter(roomManager));
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

app.post('/auth/anonymous', async (_req, res) => {
  try {
    const result = await authService.signInAnonymously();

    // Set auth cookies for browser clients
    authMiddleware.setAuthCookies(res, result.session);

    res.json({
      user: result.user,
      session: result.session,
      isNewUser: result.isNewUser,
      isAnonymous: true
    });

  } catch (error: any) {
    logger.error('Anonymous sign in error:', error);
    res.status(400).json({ error: error.message });
  }
});

app.post('/auth/upgrade', authMiddleware.requireAuth(), async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    // Check if user is anonymous
    if (!req.isAnonymous) {
      return res.status(400).json({ error: 'Only anonymous users can upgrade their account' });
    }

    const result = await authService.upgradeAnonymousUser(name, email, password);

    // Update user profile in database
    if (req.userProfile) {
      await database.updateUserEmail(req.userProfile.id, email);
    }

    // Set new auth cookies
    authMiddleware.setAuthCookies(res, result.session);

    res.json({
      user: result.user,
      session: result.session,
      message: 'Account upgraded successfully'
    });

  } catch (error: any) {
    logger.error('Account upgrade error:', error);
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
    profile: req.userProfile,
    isAnonymous: req.isAnonymous || false
  });
});

app.post('/auth/avatar', authMiddleware.requireAuth(), async (req, res) => {
  try {
    // TODO: Add proper multipart/form-data handling with multer
    // For now, this is a placeholder that expects base64 data
    const { avatar } = req.body;

    if (!avatar) {
      return res.status(400).json({ error: 'Avatar data is required' });
    }

    // Convert base64 to buffer (simplified - in production use multer)
    const buffer = Buffer.from(avatar, 'base64');
    const fileName = `avatar-${Date.now()}.png`;

    const avatarUrl = await database.uploadAvatar(
      req.userProfile!.id,
      buffer,
      fileName
    );

    res.json({
      message: 'Avatar uploaded successfully',
      avatarUrl
    });

  } catch (error: any) {
    logger.error('Avatar upload error:', error);
    res.status(500).json({ error: error.message });
  }
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

// WebSocket connection handler
io.on('connection', (socket) => {
  setupSocketHandlers(io, socket, roomManager, connectionManager);
});

const PORT = process.env.GAMESERVER_PORT || 3000;

httpServer.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`WebSocket server enabled`);
  logger.info(`Supabase integration enabled`);
});

// Export for potential testing
export { app, database, authService };