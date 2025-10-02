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

  constructor(authService: SupabaseAuthService, database: SupabaseDatabase) {
    this.authService = authService;
    this.database = database;
  }

  // Extract token from Authorization header or cookies
  private extractToken(req: Request): string | null {
    // Try Authorization header first
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Try cookies
    const cookieToken = req.cookies?.['sb-access-token'];
    if (cookieToken) {
      return cookieToken;
    }

    return null;
  }

  // Middleware for optional authentication
  optionalAuth() {
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
            logger.info('No valid access token, attempting refresh...');
            const refreshResult = await this.authService.refreshSession(refreshToken);
            if (refreshResult) {
              user = refreshResult.user;
              // Set new auth cookies with refreshed tokens
              this.setAuthCookies(res, refreshResult.session);
              logger.info('Session refreshed successfully');
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
            const userName = user.user_metadata?.name || undefined;
            userProfile = await this.database.createUser(
              user.id,
              userName || 'User',
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
            const refreshResult = await this.authService.refreshSession(refreshToken);
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
          const userName = user.user_metadata?.name || undefined;
          userProfile = await this.database.createUser(
            user.id,
            userName || 'User',
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

  // Middleware to handle Supabase session cookies
  handleSessionCookies() {
    return (req: Request, res: Response, next: NextFunction): void => {
      // Set up cookie handling for Supabase auth
      // This helps with browser-based authentication
      const accessToken = req.cookies?.['sb-access-token'];
      const refreshToken = req.cookies?.['sb-refresh-token'];

      if (accessToken) {
        // Set authorization header from cookie
        req.headers.authorization = `Bearer ${accessToken}`;
      }

      next();
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