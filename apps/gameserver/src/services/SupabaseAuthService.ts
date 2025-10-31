import { supabaseAuth, supabase } from '../config/supabase.js';
import { User as SupabaseUser, AuthApiError } from '@supabase/supabase-js';
import { uniqueNamesGenerator, adjectives, animals } from 'unique-names-generator';
import { decodeJwt } from 'jose';
import { logger } from '../config/logger.js';
import { SupabaseAuthErrorCode, SupabaseAuthErrorPayload } from '@onlyone/shared';


export interface AuthResult {
  user: SupabaseUser;
  session: any;
  isNewUser: boolean;
}

export class SupabaseAuthService {
  private supabaseUrl: string;

  constructor() {
    this.supabaseUrl = process.env.SUPABASE_URL!;
    if (!this.supabaseUrl) {
      throw new Error('SUPABASE_URL environment variable is required');
    }
  }

  async nameExists(name: string): Promise<boolean> {
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
      throw new Error(mapSupabaseErrorToPayload(error as AuthApiError).message);
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
      throw new Error(mapSupabaseErrorToPayload(error as AuthApiError).message);
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
      throw new Error(mapSupabaseErrorToPayload(error as AuthApiError).message);
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
      throw new Error(mapSupabaseErrorToPayload(error as AuthApiError).message);
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
      throw new Error(mapSupabaseErrorToPayload(error as AuthApiError).message);
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
      throw new Error(mapSupabaseErrorToPayload(updateError as AuthApiError).message);
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


function mapSupabaseErrorToPayload(error: AuthApiError): SupabaseAuthErrorPayload {
  const code = error.code?.toLowerCase();
  const status = error.status;

  logger.error({ code, status, message: error.message }, 'Auth error');
  if (code === 'invalid_credentials') {
      return { code: SupabaseAuthErrorCode.InvalidCredentials, messageKey: 'auth.invalid_credentials', message: 'Your email address or password is invalid.', status: 400, meta: { field: 'email' } };
    }
  if (code === 'invalid_email') {
    return { code: SupabaseAuthErrorCode.InvalidEmail, messageKey: 'auth.invalid_email', message: 'Please enter a valid email address.', status: 400, meta: { field: 'email' } };
  }
  if (code === 'invalid_password') {
    return { code: SupabaseAuthErrorCode.InvalidPassword, messageKey: 'auth.invalid_password', message: 'Password does not meet requirements.', status: 400, meta: { field: 'password' } };
  }
  if (code === 'user_already_exists') {
    return { code: SupabaseAuthErrorCode.UserAlreadyExists, messageKey: 'auth.user_already_exists', message: 'This email is already registered. Try signing in or reset your password.', status: 409 };
  }
  if (code === 'email_not_confirmed') {
    return { code: SupabaseAuthErrorCode.EmailNotConfirmed, messageKey: 'auth.email_not_confirmed', message: 'Please confirm your email address. Check your inbox.', status: 403 };
  }
  if (status === 429 || code?.includes('rate')) {
    return { code: SupabaseAuthErrorCode.RateLimited, messageKey: 'auth.rate_limited', message: 'Too many attempts. Please wait and try again.', status: 429, meta: { retryAfterSecs: (error as any)?.retry_after } };
  }
  if (code?.includes('email_send')) {
    return { code: SupabaseAuthErrorCode.EmailSendFailed, messageKey: 'auth.email_send_failed', message: 'Failed to send verification email. Try again later.', status: 502 };
  }
  if (status && status >= 500) {
    return { code: SupabaseAuthErrorCode.ServerError, messageKey: 'auth.server_error', message: 'Something went wrong. Please try again later.', status };
  }

  return { code: SupabaseAuthErrorCode.Unknown, messageKey: 'auth.unknown', message: 'An error occurred. Please try again later.', status: status ?? 400 };
}