import { createClient } from '@supabase/supabase-js';

// Database type definitions for better TypeScript support
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          auth_user_id: string;
          name: string;
          email: string | null;
          avatar_url: string | null;
          created_at: string;
          games_played: number;
          games_won: number;
        };
        Insert: {
          id?: string;
          auth_user_id: string;
          name: string;
          email?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          games_played?: number;
          games_won?: number;
        };
        Update: {
          id?: string;
          auth_user_id?: string;
          name?: string;
          email?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          games_played?: number;
          games_won?: number;
        };
      };
      game_records: {
        Row: {
          id: string;
          room_id: string;
          success: boolean;
          secret_word: string;
          final_guess: string | null;
          start_time: string;
          end_time: string;
          duration_seconds: number;
          guesser_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          success: boolean;
          secret_word: string;
          final_guess?: string | null;
          start_time: string;
          end_time: string;
          duration_seconds: number;
          guesser_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          room_id?: string;
          success?: boolean;
          secret_word?: string;
          final_guess?: string | null;
          start_time?: string;
          end_time?: string;
          duration_seconds?: number;
          guesser_id?: string | null;
          created_at?: string;
        };
      };
      clues: {
        Row: {
          id: number;
          game_id: string;
          submitter_id: string;
          clue_text: string;
          helpful_votes: number;
          creative_votes: number;
          duplicate: boolean;
          submitted_at: string;
        };
        Insert: {
          id?: number;
          game_id: string;
          submitter_id: string;
          clue_text: string;
          helpful_votes?: number;
          creative_votes?: number;
          duplicate?: boolean;
          submitted_at?: string;
        };
        Update: {
          id?: number;
          game_id?: string;
          submitter_id?: string;
          clue_text?: string;
          helpful_votes?: number;
          creative_votes?: number;
          duplicate?: boolean;
          submitted_at?: string;
        };
      };
      predefined_words: {
        Row: {
          id: number;
          word: string;
          created_at: string;
        };
        Insert: {
          id?: number;
          word: string;
          created_at?: string;
        };
        Update: {
          id?: number;
          word?: string;
          created_at?: string;
        };
      };
    };
  };
}

// Supabase client configuration
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Use service role for server-side operations

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
}

// Create Supabase client with service role key for server operations
export const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Create client-side Supabase client (for auth operations)
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;

if (!supabaseAnonKey) {
  throw new Error('Missing SUPABASE_ANON_KEY environment variable');
}

export const supabaseAuth = createClient<Database>(supabaseUrl, supabaseAnonKey);