import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SupabaseAuthService } from '../../src/services/SupabaseAuthService';
import { supabaseAuth } from '../../src/config/supabase';
import { SupabaseAuthErrorCode } from '@onlyone/shared';
import type { User, Session, AuthError } from '@supabase/supabase-js';

/**
 * Helper to generate a mock JWT token with custom expiry
 * @param expirySeconds Expiry time in seconds from now. Use 0 or negative for expired tokens
 * @param overrides Custom claims to override defaults
 */
function generateMockToken(expirySeconds: number = 3600, overrides?: Partial<Record<string, any>>): string {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + expirySeconds;
  const supabaseUrl = process.env.SUPABASE_URL || 'https://project.supabase.co';

  const payload = {
    sub: 'user-123',
    email: 'test@example.com',
    iss: `${supabaseUrl}/auth/v1`,
    role: 'authenticated',
    aud: 'authenticated',
    exp,
    ...overrides
  };

  // Create a simple base64 encoded payload (note: not cryptographically signed)
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = 'mock-signature';

  return `${header}.${body}.${signature}`;
}

// Mock the supabase client
vi.mock('../../src/config/supabase', () => ({
  supabaseAuth: {
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      getUser: vi.fn(),
      refreshSession: vi.fn(),
      signOut: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updateUser: vi.fn(),
      signInWithOAuth: vi.fn(),
      signInAnonymously: vi.fn(),
      getSession: vi.fn(),
    }
  },
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({ data: null, error: null }))
        }))
      }))
    }))
  }
}));

describe('SupabaseAuthService', () => {
  let authService: SupabaseAuthService;

  beforeEach(() => {
    authService = new SupabaseAuthService();
    vi.clearAllMocks();
  });

  describe('registerWithPassword', () => {
    it('should successfully register a new user with valid credentials', async () => {
      const mockUser: Partial<User> = { id: 'user-123', email: 'test@example.com' };
      const mockSession: Partial<Session> = { access_token: 'token-123', refresh_token: 'refresh-123' };

      vi.mocked(supabaseAuth.auth.signUp).mockResolvedValue({
        data: { user: mockUser as User, session: mockSession as Session },
        error: null
      });

      const result = await authService.registerWithPassword('John Doe', 'test@example.com', 'password123');

      expect(result.user).toEqual(mockUser);
      expect(result.session).toEqual(mockSession);
      expect(result.isNewUser).toBe(true);
      expect(supabaseAuth.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        options: {
          data: {
            name: 'John Doe'
          }
        }
      });
    });

    it('should throw error when Supabase returns an error', async () => {
      vi.mocked(supabaseAuth.auth.signUp).mockResolvedValue({
        data: { user: null, session: null },
        error: { code: 'user_already_exists', status: 409, name: 'AuthApiError' } as AuthError
      });

      await expect(
        authService.registerWithPassword('John Doe', 'test@example.com', 'password123')
      ).rejects.toThrow('This email is already registered. Try signing in or reset your password.');
    });

    it('should throw error when user or session is missing despite no error', async () => {
      vi.mocked(supabaseAuth.auth.signUp).mockResolvedValue({
        data: { user: null, session: null },
        error: null
      } as any);

      await expect(
        authService.registerWithPassword('John Doe', 'test@example.com', 'password123')
      ).rejects.toThrow('Registration failed');
    });
  });

  describe('loginWithPassword', () => {
    it('should successfully login user with valid credentials', async () => {
      const mockUser: Partial<User> = { id: 'user-123', email: 'test@example.com' };
      const mockSession: Partial<Session> = { access_token: 'token-123', refresh_token: 'refresh-123' };

      vi.mocked(supabaseAuth.auth.signInWithPassword).mockResolvedValue({
        data: { user: mockUser as User, session: mockSession as Session },
        error: null
      });

      const result = await authService.loginWithPassword('test@example.com', 'password123');

      expect(result.user).toEqual(mockUser);
      expect(result.session).toEqual(mockSession);
      expect(result.isNewUser).toBe(false);
      expect(supabaseAuth.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      });
    });

    it('should throw error when credentials are invalid', async () => {
      vi.mocked(supabaseAuth.auth.signInWithPassword).mockResolvedValue({
        data: { user: null, session: null },
        error: { code: 'invalid_credentials', status: 400, name: 'AuthApiError' } as AuthError
      });

      await expect(
        authService.loginWithPassword('test@example.com', 'wrongpassword')
      ).rejects.toThrow('Your email address or password is invalid.');
    });

    it('should throw error when user or session is missing despite no error', async () => {
      vi.mocked(supabaseAuth.auth.signInWithPassword).mockResolvedValue({
        data: { user: null, session: null },
        error: null
      } as any);

      await expect(
        authService.loginWithPassword('test@example.com', 'password123')
      ).rejects.toThrow('Login failed');
    });
  });

  describe('getUserFromToken', () => {
    it('should return user when token is valid', async () => {
      const mockUser: Partial<User> = {
        id: 'user-123',
        email: 'test@example.com',
        aud: 'authenticated',
        role: 'authenticated',
        app_metadata: {},
        user_metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        email_confirmed_at: undefined,
        phone: undefined,
        confirmed_at: undefined,
        last_sign_in_at: undefined,
        identities: undefined,
        is_anonymous: undefined
      };

      vi.mocked(supabaseAuth.auth.getUser).mockResolvedValue({
        data: { user: mockUser as User },
        error: null
      });

      const validToken = generateMockToken(3600); // Token expires in 1 hour
      const result = await authService.getUserFromToken(validToken);

      expect(result).toEqual(expect.objectContaining({
        id: 'user-123',
        email: 'test@example.com',
        aud: 'authenticated',
        role: 'authenticated',
        app_metadata: {},
        user_metadata: {},
        email_confirmed_at: undefined,
        phone: undefined,
        confirmed_at: undefined,
        last_sign_in_at: undefined,
        identities: undefined,
        is_anonymous: undefined
      }));
      expect(result?.created_at).toBeDefined();
      expect(result?.updated_at).toBeDefined();
    });

    it('should return null when token is expired', async () => {
      const expiredToken = generateMockToken(-3600); // Token expired 1 hour ago

      const result = await authService.getUserFromToken(expiredToken);

      expect(result).toBeNull();
    });

    it('should return null when token is invalid', async () => {
      vi.mocked(supabaseAuth.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token', status: 401, name: 'AuthApiError' } as AuthError
      });

      const result = await authService.getUserFromToken('invalid-token');

      expect(result).toBeNull();
    });

    it('should return null when user is missing despite no error', async () => {
      vi.mocked(supabaseAuth.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null
      } as any);

      const result = await authService.getUserFromToken('token');

      expect(result).toBeNull();
    });
  });

  describe('refreshSession', () => {
    it('should return new session and user when refresh token is valid', async () => {
      const mockUser: Partial<User> = { id: 'user-123', email: 'test@example.com' };
      const mockSession: Partial<Session> = { access_token: 'new-token', refresh_token: 'new-refresh' };

      vi.mocked(supabaseAuth.auth.refreshSession).mockResolvedValue({
        data: { user: mockUser as User, session: mockSession as Session },
        error: null
      });

      const result = await authService.refreshSession('valid-refresh-token');

      expect(result).toEqual({ session: mockSession, user: mockUser });
      expect(supabaseAuth.auth.refreshSession).toHaveBeenCalledWith({
        refresh_token: 'valid-refresh-token'
      });
    });

    it('should return null when refresh token is invalid', async () => {
      vi.mocked(supabaseAuth.auth.refreshSession).mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid refresh token', status: 401, name: 'AuthApiError' } as AuthError
      });

      const result = await authService.refreshSession('invalid-refresh-token');

      expect(result).toBeNull();
    });

    it('should return null when session or user is missing despite no error', async () => {
      vi.mocked(supabaseAuth.auth.refreshSession).mockResolvedValue({
        data: { user: null, session: null },
        error: null
      });

      const result = await authService.refreshSession('refresh-token');

      expect(result).toBeNull();
    });
  });

  describe('signOut', () => {
    it('should successfully sign out user', async () => {
      vi.mocked(supabaseAuth.auth.signOut).mockResolvedValue({
        error: null
      });

      await expect(authService.signOut()).resolves.toBeUndefined();
      expect(supabaseAuth.auth.signOut).toHaveBeenCalled();
    });

    it('should throw error when sign out fails', async () => {
      vi.mocked(supabaseAuth.auth.signOut).mockResolvedValue({
        error: { message: 'Sign out failed', status: 500, name: 'AuthApiError' } as AuthError
      });

      await expect(authService.signOut()).rejects.toThrow('Sign out failed');
    });

    it('should handle network errors during sign out', async () => {
      vi.mocked(supabaseAuth.auth.signOut).mockRejectedValue(
        new Error('Network error')
      );

      await expect(authService.signOut()).rejects.toThrow('Network error');
    });
  });

  // describe('resetPassword', () => {
  //   //todo: implement
  // });

  // describe('updatePassword', () => {
  //   //todo: implement
  // });

  // describe('signInWithOAuth', () => {
  //   //todo: implement
  // });

  describe('signInAnonymously', () => {
    it('should successfully sign in anonymously', async () => {
      const mockUser: Partial<User> = { id: 'anon-user-123', is_anonymous: true };
      const mockSession: Partial<Session> = { access_token: 'anon-token-123', refresh_token: 'anon-refresh-123' };

      vi.mocked(supabaseAuth.auth.signInAnonymously).mockResolvedValue({
        data: { user: mockUser as User, session: mockSession as Session },
        error: null
      });

      const result = await authService.signInAnonymously();

      expect(result.user).toEqual(mockUser);
      expect(result.session).toEqual(mockSession);
      expect(result.isNewUser).toBe(true);
      expect(supabaseAuth.auth.signInAnonymously).toHaveBeenCalled();
    });

    it('should throw error when anonymous sign-ins are disabled', async () => {
      vi.mocked(supabaseAuth.auth.signInAnonymously).mockResolvedValue({
        data: { user: null, session: null },
        error: { status: 500, name: 'AuthApiError' } as AuthError
      });

      await expect(authService.signInAnonymously()).rejects.toThrow('Something went wrong. Please try again later.');
    });

    it('should throw error when user or session is missing despite no error', async () => {
      vi.mocked(supabaseAuth.auth.signInAnonymously).mockResolvedValue({
        data: { user: null, session: null },
        error: null
      });

      await expect(authService.signInAnonymously()).rejects.toThrow('Anonymous sign in failed');
    });
  });

  describe('upgradeAnonymousUser', () => {
    it('should successfully upgrade anonymous user to permanent account', async () => {
      const mockUser: Partial<User> = { id: 'user-123', email: 'test@example.com', is_anonymous: false };
      const mockSession: Partial<Session> = { access_token: 'token-123', refresh_token: 'refresh-123' };

      vi.mocked(supabaseAuth.auth.updateUser).mockResolvedValue({
        data: { user: mockUser as User },
        error: null
      });

      vi.mocked(supabaseAuth.auth.getSession).mockResolvedValue({
        data: { session: mockSession as Session },
        error: null
      });

      const result = await authService.upgradeAnonymousUser('John Doe', 'test@example.com', 'password123');

      expect(result.user).toEqual(mockUser);
      expect(result.session).toEqual(mockSession);
      expect(result.isNewUser).toBe(false);
      expect(supabaseAuth.auth.updateUser).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        data: {
          name: 'John Doe'
        }
      });
    });

    it('should throw error when email already exists', async () => {
      vi.mocked(supabaseAuth.auth.updateUser).mockResolvedValue({
        data: { user: null },
        error: { code: 'user_already_exists', status: 409, name: 'AuthApiError' } as AuthError
      });

      await expect(
        authService.upgradeAnonymousUser('John Doe', 'existing@example.com', 'password123')
      ).rejects.toThrow('This email is already registered. Try signing in or reset your password.');
    });

    it('should throw error when session retrieval fails after upgrade', async () => {
      const mockUser: Partial<User> = { id: 'user-123', email: 'test@example.com' };

      vi.mocked(supabaseAuth.auth.updateUser).mockResolvedValue({
        data: { user: mockUser as User },
        error: null
      });

      vi.mocked(supabaseAuth.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: { status: 500, name: 'AuthApiError' } as AuthError
      });

      await expect(
        authService.upgradeAnonymousUser('John Doe', 'test@example.com', 'password123')
      ).rejects.toThrow('Failed to get session after upgrade');
    });
  });
});
