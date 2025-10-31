import { Request, Response, NextFunction } from 'express';
import { SupabaseAuthService } from '../services/SupabaseAuthService.js';
import { SupabaseDatabase } from '../services/SupabaseDatabase.js';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { DbUser } from '../services/SupabaseDatabase.js';
import { logger } from '../config/logger.js';
import { log } from 'console';
// Extend Express Request to include user data
declare global {
  namespace Express {
    interface Request {
      user?: SupabaseUser;
      userProfile?: DbUser;
      isAnonymous?: boolean;
    }
  }
}

export class SupabaseAuthMiddleware {
  private authService: SupabaseAuthService;
  private database: SupabaseDatabase;
  private refreshPromises: Map<string, Promise<{session: any; user: SupabaseUser} | null>>;

  constructor(authService: SupabaseAuthService, database: SupabaseDatabase) {
    this.authService = authService;
    this.database = database;
    this.refreshPromises = new Map();
  }

  // Extract access token from cookies
  private extractToken(req: Request): string | null {

    // Try cookies
    const cookieToken = req.cookies?.['sb-access-token'];
    if (cookieToken) {
      return cookieToken;
    }

    return null;
  }

  // Deduplicated refresh session - prevents concurrent refresh token reuse
  private async getOrRefreshSession(refreshToken: string): Promise<{session: any; user: SupabaseUser} | null> {
    // Check if refresh is already in progress for this token
    const existingPromise = this.refreshPromises.get(refreshToken);
    if (existingPromise) {
      logger.info('Waiting for existing refresh to complete...');
      return existingPromise;
    }

    // Start new refresh and store the promise
    const refreshPromise = this.authService.refreshSession(refreshToken)
      .finally(() => {
        // Clean up after refresh completes (success or failure)
        this.refreshPromises.delete(refreshToken);
      });
    this.refreshPromises.set(refreshToken, refreshPromise);
    return refreshPromise;
  }

  // Middleware for optional authentication
  optionalAuth() {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        let token = this.extractToken(req); //TODO: change to extractAccessToken
        let user: any = null;
        // Try to use access token first
        if (token) {
          user = await this.authService.getUserFromToken(token);
        }

        // If no valid access token, try refresh token
        if (!user) {
          const refreshToken = req.cookies?.['sb-refresh-token'];
          if (refreshToken) {
            logger.info('No valid access token, attempting refresh...');
            const refreshResult = await this.getOrRefreshSession(refreshToken);
            logger.info(`Refresh result: ${JSON.stringify(refreshResult)}`);
            if (refreshResult) {
              user = refreshResult.user;
              // Set new auth cookies with refreshed tokens
              this.setAuthCookies(res, refreshResult.session);
              logger.info({ userId: user.id }, 'Session refreshed successfully');
            }
          }
        }

        if (user) {
          logger.info(`User authenticated: ${user.id}`);
          req.user = user;
          req.isAnonymous = user.is_anonymous || false;

          // Get or create user profile from our database
          let userProfile = await this.database.getUserByAuthId(user.id);

          // Auto-create profile if user has session but no profile
          if (!userProfile) {
            const name = user.user_metadata?.name || undefined;
            userProfile = await this.database.createUser(
              user.id,
              name || 'User',
              user.email,
              req.isAnonymous
            );
          }

          req.userProfile = userProfile;
        } else {
          logger.info('Continuing without authentication');
        }
      } catch (error) {
        // Token invalid - continue without user
        logger.warn(`Invalid token in optional auth: ${error}`);
      }
      next();
    };
  }

  // Middleware for required authentication
  requireAuth() {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        let token = this.extractToken(req);
        let user: any = null;

        // Try to use access token first
        if (token) {
          user = await this.authService.getUserFromToken(token);
        }

        // If no valid access token, try refresh token
        if (!user) {
          const refreshToken = req.cookies?.['sb-refresh-token'];
          if (refreshToken) {
            const refreshResult = await this.getOrRefreshSession(refreshToken);
            if (refreshResult) {
              user = refreshResult.user;
              // Set new auth cookies with refreshed tokens
              this.setAuthCookies(res, refreshResult.session);
            }
          }
        }

        if (!user) {
          res.status(401).json({ error: 'Invalid or expired authentication' });
          return;
        }

        req.user = user;
        req.isAnonymous = user.is_anonymous || false;

        // Get or create user profile from our database
        let userProfile = await this.database.getUserByAuthId(user.id);

        // Auto-create profile if user has session but no profile
        if (!userProfile) {
          const name = user.user_metadata?.name || undefined;
          userProfile = await this.database.createUser(
            user.id,
            name || 'User',
            user.email,
            req.isAnonymous
          );
        }

        req.userProfile = userProfile;
        next();
      } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(401).json({ error: 'Authentication failed' });
      }
    };
  }


  // Helper method to set auth cookies (for browser clients)
  setAuthCookies(res: Response, session: any): void {
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      domain: process.env.NODE_ENV === 'production' ? process.env.COOKIE_DOMAIN : undefined,
    };

    res.cookie('sb-access-token', session.access_token, {
      ...cookieOptions,
      maxAge: session.expires_in * 1000 // Convert seconds to milliseconds
    });

    res.cookie('sb-refresh-token', session.refresh_token, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
  }

  // Helper method to clear auth cookies
  clearAuthCookies(res: Response): void {
    res.clearCookie('sb-access-token');
    res.clearCookie('sb-refresh-token');
  }
}