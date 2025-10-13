import { Router, type IRouter } from 'express';
import { SupabaseAuthService } from '../services/SupabaseAuthService.js';
import { SupabaseDatabase } from '../services/SupabaseDatabase.js';
import { SupabaseAuthMiddleware } from '../middleware/supabase-auth.js';
import { logger } from '../config/logger.js';
import { decodeJwt } from 'jose';

// Initialize auth services
const authService = new SupabaseAuthService();
const database = new SupabaseDatabase();
const authMiddleware = new SupabaseAuthMiddleware(authService, database);

const router: IRouter = Router();

router.post('/register', async (req, res) => {
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

router.post('/login', async (req, res) => {
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

router.post('/anonymous', async (req, res) => {
  try {
    const result = await authService.signInAnonymously();

    // Set auth cookies for browser clients
    authMiddleware.setAuthCookies(res, result.session);

    res.json({
      auth: result.user,
      session: result.session,
      isNewUser: result.isNewUser,
      isAnonymous: true
    });

  } catch (error: any) {
    logger.error('Anonymous sign in error:', error);
    res.status(400).json({ error: error.message });
  }
});

router.post('/upgrade', authMiddleware.requireAuth(), async (req, res) => {
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

router.post('/logout', authMiddleware.requireAuth(), async (_req, res) => {
  try {
    await authService.signOut();
    authMiddleware.clearAuthCookies(res);
    res.json({ message: 'Logged out successfully' });
  } catch (error: any) {
    logger.error('Logout error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/me', authMiddleware.optionalAuth(), async (req, res) => {
  logger.info('GET /me called');
  // If no user, return 401 since optionalAuth already tried to refresh
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  // Extract token expiry for frontend tracking
  let expiresAt: number | undefined;
  try {
    const token = req.cookies?.['sb-access-token'] ||
                  req.headers.authorization?.substring(7);
    if (token) {
      const payload = decodeJwt(token);
      expiresAt = payload.exp;
    }
  } catch (error) {
    logger.warn({ error }, 'Failed to decode token for expiry');
  }

  res.json({
    auth: req.user,
    profile: req.userProfile,
    isAnonymous: req.isAnonymous || false,
    expiresAt
  });
});

router.post('/avatar', authMiddleware.requireAuth(), async (req, res) => {
  try {
    const { avatar } = req.body;

    if (!avatar) {
      return res.status(400).json({ error: 'Avatar data is required' });
    }

    // Convert base64 to buffer
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

router.post('/reset-password', async (req, res) => {
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

export default router;
