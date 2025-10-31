import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SupabaseAuthService } from '../../src/services/SupabaseAuthService';
import { supabaseAuth } from '../../src/config/supabase';
import type { User, Session, AuthError } from '@supabase/supabase-js';

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
        error: { message: 'Email already exists', status: 400, name: 'AuthApiError' } as AuthError
      });

      await expect(
        authService.registerWithPassword('John Doe', 'test@example.com', 'password123')
      ).rejects.toThrow('Email already exists');
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
        error: { message: 'Invalid login credentials', status: 400, name: 'AuthApiError' } as AuthError
      });

      await expect(
        authService.loginWithPassword('test@example.com', 'wrongpassword')
      ).rejects.toThrow('Invalid login credentials');
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
      const mockUser: Partial<User> = { id: 'user-123', email: 'test@example.com' };

      vi.mocked(supabaseAuth.auth.getUser).mockResolvedValue({
        data: { user: mockUser as User },
        error: null
      });

      const result = await authService.getUserFromToken('valid-token');

      expect(result).toEqual(mockUser);
      expect(supabaseAuth.auth.getUser).toHaveBeenCalledWith('valid-token');
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

  describe('resetPassword', () => {
    it('should successfully send password reset email', async () => {
      vi.mocked(supabaseAuth.auth.resetPasswordForEmail).mockResolvedValue({
        data: {},
        error: null
      });

      await expect(authService.resetPassword('test@example.com')).resolves.toBeUndefined();
      expect(supabaseAuth.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        'test@example.com',
        { redirectTo: `${process.env.FRONTEND_URL}/reset-password` }
      );
    });

    it('should throw error when email does not exist', async () => {
      vi.mocked(supabaseAuth.auth.resetPasswordForEmail).mockResolvedValue({
        data: {},
        error: { message: 'User not found', status: 404, name: 'AuthApiError' } as AuthError
      });

      await expect(authService.resetPassword('nonexistent@example.com')).rejects.toThrow('User not found');
    });

    it('should throw error when email is invalid format', async () => {
      vi.mocked(supabaseAuth.auth.resetPasswordForEmail).mockResolvedValue({
        data: {},
        error: { message: 'Invalid email format', status: 400, name: 'AuthApiError' } as AuthError
      });

      await expect(authService.resetPassword('invalid-email')).rejects.toThrow('Invalid email format');
    });
  });

  describe('updatePassword', () => {
    it('should successfully update user password', async () => {
      vi.mocked(supabaseAuth.auth.updateUser).mockResolvedValue({
        data: { user: { id: 'user-123' } as Partial<User> as User },
        error: null
      });

      await expect(authService.updatePassword('newPassword123')).resolves.toBeUndefined();
      expect(supabaseAuth.auth.updateUser).toHaveBeenCalledWith({
        password: 'newPassword123'
      });
    });

    it('should throw error when password is too weak', async () => {
      vi.mocked(supabaseAuth.auth.updateUser).mockResolvedValue({
        data: { user: null },
        error: { message: 'Password is too weak', status: 400, name: 'AuthApiError' } as AuthError
      });

      await expect(authService.updatePassword('123')).rejects.toThrow('Password is too weak');
    });

    it('should throw error when user is not authenticated', async () => {
      vi.mocked(supabaseAuth.auth.updateUser).mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated', status: 401, name: 'AuthApiError' } as AuthError
      });

      await expect(authService.updatePassword('newPassword123')).rejects.toThrow('Not authenticated');
    });
  });

  describe('signInWithOAuth', () => {
    it('should successfully initiate OAuth sign in with Google', async () => {
      const mockUrl = 'https://accounts.google.com/oauth/authorize?...';

      vi.mocked(supabaseAuth.auth.signInWithOAuth).mockResolvedValue({
        data: { provider: 'google', url: mockUrl },
        error: null
      });

      const result = await authService.signInWithOAuth('google');

      expect(result.url).toBe(mockUrl);
      expect(supabaseAuth.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: `${process.env.FRONTEND_URL}/auth/callback`
        }
      });
    });

    it('should successfully initiate OAuth sign in with Discord', async () => {
      const mockUrl = 'https://discord.com/api/oauth2/authorize?...';

      vi.mocked(supabaseAuth.auth.signInWithOAuth).mockResolvedValue({
        data: { provider: 'discord', url: mockUrl },
        error: null
      });

      const result = await authService.signInWithOAuth('discord');

      expect(result.url).toBe(mockUrl);
      expect(supabaseAuth.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'discord',
        options: {
          redirectTo: `${process.env.FRONTEND_URL}/auth/callback`
        }
      });
    });

    it('should throw error when OAuth provider is not configured', async () => {
      vi.mocked(supabaseAuth.auth.signInWithOAuth).mockResolvedValue({
        data: { provider: 'google', url: '' },
        error: { message: 'OAuth provider not configured', status: 400, name: 'AuthApiError' } as AuthError
      });

      await expect(authService.signInWithOAuth('google')).rejects.toThrow('OAuth provider not configured');
    });
  });

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
        error: { message: 'Anonymous sign-ins are disabled', status: 422, name: 'AuthApiError' } as AuthError
      });

      await expect(authService.signInAnonymously()).rejects.toThrow('Anonymous sign-ins are disabled');
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
        error: { message: 'Email already in use', status: 400, name: 'AuthApiError' } as AuthError
      });

      await expect(
        authService.upgradeAnonymousUser('John Doe', 'existing@example.com', 'password123')
      ).rejects.toThrow('Email already in use');
    });

    it('should throw error when session retrieval fails after upgrade', async () => {
      const mockUser: Partial<User> = { id: 'user-123', email: 'test@example.com' };

      vi.mocked(supabaseAuth.auth.updateUser).mockResolvedValue({
        data: { user: mockUser as User },
        error: null
      });

      vi.mocked(supabaseAuth.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: { message: 'Session error', status: 500, name: 'AuthApiError' } as AuthError
      });

      await expect(
        authService.upgradeAnonymousUser('John Doe', 'test@example.com', 'password123')
      ).rejects.toThrow('Failed to get session after upgrade');
    });
  });
});
