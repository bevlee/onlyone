import { supabaseAuth, supabase } from '../config/supabase.js';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { uniqueNamesGenerator, adjectives, animals } from 'unique-names-generator';

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

  // Verify and get user from JWT token
  async getUserFromToken(token: string): Promise<SupabaseUser | null> {
    const { data, error } = await supabaseAuth.auth.getUser(token);

    if (error || !data.user) {
      return null;
    }

    return data.user;
  }

  // Refresh session
  async refreshSession(refreshToken: string): Promise<{ session: any; user: SupabaseUser } | null> {
    const { data, error } = await supabaseAuth.auth.refreshSession({
      refresh_token: refreshToken
    });

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