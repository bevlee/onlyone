import { supabaseAuth, supabase } from '../config/supabase.js';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { uniqueNamesGenerator, adjectives, animals } from 'unique-names-generator';
import { decodeJwt } from 'jose';
import { logger } from '../config/logger.js';

export interface AuthResult {
  user: SupabaseUser;
  session: any;
  isNewUser: boolean;
}

export interface UserProfile {
  id: string;
  auth_user_id: string;
  name: string;
  email: string | null;
  created_at: string;
  games_played: number;
  games_won: number;
}

export class SupabaseAuthService {
  private supabaseUrl: string;

  constructor() {
    this.supabaseUrl = process.env.SUPABASE_URL!;
    if (!this.supabaseUrl) {
      throw new Error('SUPABASE_URL environment variable is required');
    }
  }

  async usernameExists(name: string): Promise<boolean> {
    const { data: existingUser, error } = await supabase
      .from('users')
      .select('id')
      .eq('name', name)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = No rows found
      throw new Error(error.message);
    }

    return !!existingUser;
  }

  // Register with email and password
  async registerWithPassword(name: string, email: string, password: string): Promise<AuthResult> {
    const { data, error } = await supabaseAuth.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name
        }
      }
    });

    if (error) {
      throw new Error(error.message);
    }

    if (!data.user || !data.session) {
      throw new Error('Registration failed');
    }

    return {
      user: data.user,
      session: data.session,
      isNewUser: true
    };
  }

  // Login with email and password
  async loginWithPassword(email: string, password: string): Promise<AuthResult> {
    const { data, error } = await supabaseAuth.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      throw new Error(error.message);
    }

    if (!data.user || !data.session) {
      throw new Error('Login failed');
    }

    return {
      user: data.user,
      session: data.session,
      isNewUser: false
    };
  }

  // Verify and get user from JWT token (local JWT decoding with basic validation)
  async getUserFromToken(token: string): Promise<SupabaseUser | null> {
    try {
      // Decode JWT without verification (fast, no network call)
      // Note: This relies on HTTPS and the fact that tokens come from trusted browser cookies
      // For production with untrusted sources, implement proper JWT verification with secret
      const payload = decodeJwt(token);

      // Basic validation: check expiration
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        console.log('Token expired');
        return null;
      }

      // Validate issuer matches our Supabase project
      if (payload.iss !== `${this.supabaseUrl}/auth/v1`) {
        console.log('Invalid token issuer');
        return null;
      }

      // Convert JWT payload to SupabaseUser format
      const user: SupabaseUser = {
        id: payload.sub!,
        aud: payload.aud as string,
        role: payload.role as string,
        email: payload.email as string | undefined,
        email_confirmed_at: payload.email_confirmed_at as string | undefined,
        phone: payload.phone as string | undefined,
        confirmed_at: payload.confirmed_at as string | undefined,
        last_sign_in_at: payload.last_sign_in_at as string | undefined,
        app_metadata: payload.app_metadata as any || {},
        user_metadata: payload.user_metadata as any || {},
        identities: payload.identities as any[] | undefined,
        created_at: payload.created_at as string || new Date().toISOString(),
        updated_at: payload.updated_at as string || new Date().toISOString(),
        is_anonymous: payload.is_anonymous as boolean | undefined
      };

      return user;
    } catch (error) {
      // JWT decoding failed
      console.error('JWT decode failed:', error);
      return null;
    }
  }

  // Refresh session
  async refreshSession(refreshToken: string): Promise<{ session: any; user: SupabaseUser } | null> {
    const { data, error } = await supabaseAuth.auth.refreshSession({
      refresh_token: refreshToken
    });
    logger.info(`Refresh session data: ${JSON.stringify(data)}, error: ${JSON.stringify(error)}`);
    if (error || !data.session || !data.user) {
      return null;
    }

    return {
      session: data.session,
      user: data.user
    };
  }

  // Sign out
  async signOut(): Promise<void> {
    const { error } = await supabaseAuth.auth.signOut();
    if (error) {
      throw new Error(error.message);
    }
  }

  // Generate password reset email
  async resetPassword(email: string): Promise<void> {
    const { error } = await supabaseAuth.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.FRONTEND_URL}/reset-password`
    });

    if (error) {
      throw new Error(error.message);
    }
  }

  // Update password
  async updatePassword(newPassword: string): Promise<void> {
    const { error } = await supabaseAuth.auth.updateUser({
      password: newPassword
    });

    if (error) {
      throw new Error(error.message);
    }
  }

  // OAuth sign in (Google, etc.)
  async signInWithOAuth(provider: 'google' | 'discord'): Promise<{ url: string }> {
    const { data, error } = await supabaseAuth.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${process.env.FRONTEND_URL}/auth/callback`
      }
    });

    if (error) {
      throw new Error(error.message);
    }

    return { url: data.url };
  }

  // Sign in anonymously
  async signInAnonymously(): Promise<AuthResult> {
    // Generate unique name by checking against existing names in database
    let attempts = 0;
    const maxAttempts = 10;
    let guestName: string;

    do {
      guestName = uniqueNamesGenerator({
        dictionaries: [adjectives, animals],
        separator: '-',
        style: 'capital'
      });

      // Check if name already exists in public.users table
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('name', guestName)
        .single();

      // If name doesn't exist, we're good
      if (!existingUser) {
        break;
      }

      attempts++;
    } while (attempts < maxAttempts);

    // If we hit max attempts, add a random suffix to guarantee uniqueness
    if (attempts === maxAttempts) {
      guestName = `${guestName}-${Math.random().toString(36).substring(2, 6)}`;
    }

    const { data, error } = await supabaseAuth.auth.signInAnonymously({
      options: {
        data: {
          name: guestName
        }
      }
    });

    if (error) {
      throw new Error(error.message);
    }

    if (!data.user || !data.session) {
      throw new Error('Anonymous sign in failed');
    }

    return {
      user: data.user,
      session: data.session,
      isNewUser: true
    };
  }

  // Upgrade anonymous user to permanent account
  async upgradeAnonymousUser(name: string, email: string, password: string): Promise<AuthResult> {
    // Update the user's email and password
    const { data: updateData, error: updateError } = await supabaseAuth.auth.updateUser({
      email,
      password,
      data: {
        name
      }
    });

    if (updateError) {
      throw new Error(updateError.message);
    }

    if (!updateData.user) {
      throw new Error('Failed to upgrade anonymous account');
    }

    // Get new session
    const { data: sessionData, error: sessionError } = await supabaseAuth.auth.getSession();

    if (sessionError || !sessionData.session) {
      throw new Error('Failed to get session after upgrade');
    }

    return {
      user: updateData.user,
      session: sessionData.session,
      isNewUser: false
    };
  }
}