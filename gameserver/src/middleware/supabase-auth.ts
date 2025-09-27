import { Request, Response, NextFunction } from 'express';
import { SupabaseAuthService } from '../services/SupabaseAuthService.js';
import { SupabaseDatabase } from '../services/SupabaseDatabase.js';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { DbUser } from '../services/SupabaseDatabase.js';

// Extend Express Request to include user data
declare global {
  namespace Express {
    interface Request {
      user?: SupabaseUser;
      userProfile?: DbUser;
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
        const token = this.extractToken(req);
        if (token) {
          const user = await this.authService.getUserFromToken(token);
          if (user) {
            req.user = user;

            // Also get the user profile from our database
            const userProfile = await this.database.getUserByAuthId(user.id);
            if (userProfile) {
              req.userProfile = userProfile;
            }
          }
        }
      } catch (error) {
        // Token invalid - continue without user
        console.warn('Invalid token in optional auth:', error);
      }
      next();
    };
  }

  // Middleware for required authentication
  requireAuth() {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const token = this.extractToken(req);
        if (!token) {
          res.status(401).json({ error: 'No authentication token provided' });
          return;
        }

        const user = await this.authService.getUserFromToken(token);
        if (!user) {
          res.status(401).json({ error: 'Invalid authentication token' });
          return;
        }

        req.user = user;

        // Get user profile from our database
        const userProfile = await this.database.getUserByAuthId(user.id);
        if (!userProfile) {
          // User exists in auth but not in our database - this shouldn't happen
          // but let's handle it gracefully
          res.status(500).json({ error: 'User profile not found' });
          return;
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