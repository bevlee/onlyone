-- Supabase PostgreSQL schema for OnlyOne game server
-- Run this in Supabase SQL Editor

-- Enable Row Level Security (RLS) for all tables
-- This is Supabase best practice for security

-- Users table (auth.users is managed by Supabase Auth)
-- We'll create a public.users table for game-specific data
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- Basic stats (calculated from game_records and clues tables)
  games_played INTEGER DEFAULT 0,
  games_won INTEGER DEFAULT 0
);

-- Predefined words table
CREATE TABLE IF NOT EXISTS public.predefined_words (
  id SERIAL PRIMARY KEY,
  word TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Game records for tracking individual games
CREATE TABLE IF NOT EXISTS public.game_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id TEXT NOT NULL, -- Reference to ephemeral room
  success BOOLEAN NOT NULL DEFAULT FALSE,
  secret_word TEXT NOT NULL,
  final_guess TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  duration_seconds INTEGER NOT NULL,
  guesser_id UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Detailed clue tracking with quality votes
CREATE TABLE IF NOT EXISTS public.clues (
  id SERIAL PRIMARY KEY,
  game_id UUID NOT NULL REFERENCES public.game_records(id) ON DELETE CASCADE,
  submitter_id UUID NOT NULL REFERENCES public.users(id),
  clue_text TEXT NOT NULL,
  helpful_votes INTEGER DEFAULT 0,
  creative_votes INTEGER DEFAULT 0,
  duplicate BOOLEAN DEFAULT FALSE,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance optimization

-- User lookup indexes
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON public.users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_users_name ON public.users(name);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- Game records indexes
CREATE INDEX IF NOT EXISTS idx_game_records_room_id ON public.game_records(room_id);
CREATE INDEX IF NOT EXISTS idx_game_records_guesser_id ON public.game_records(guesser_id);
CREATE INDEX IF NOT EXISTS idx_game_records_created_at ON public.game_records(created_at);

-- Clue indexes
CREATE INDEX IF NOT EXISTS idx_clues_game_id ON public.clues(game_id);
CREATE INDEX IF NOT EXISTS idx_clues_submitter_id ON public.clues(submitter_id);
CREATE INDEX IF NOT EXISTS idx_clues_submitted_at ON public.clues(submitted_at);

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predefined_words ENABLE ROW LEVEL SECURITY;

-- Users can read their own data and public stats
CREATE POLICY "Users can view their own data" ON public.users
  FOR SELECT USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can update their own data" ON public.users
  FOR UPDATE USING (auth.uid() = auth_user_id);

-- Users can view all users' public stats (for leaderboards)
CREATE POLICY "Public user stats readable" ON public.users
  FOR SELECT USING (true);

-- Game records are readable by all authenticated users
CREATE POLICY "Game records readable by authenticated users" ON public.game_records
  FOR SELECT TO authenticated USING (true);

-- Game records can only be inserted by authenticated users
CREATE POLICY "Authenticated users can insert game records" ON public.game_records
  FOR INSERT TO authenticated WITH CHECK (true);

-- Clues are readable by all authenticated users
CREATE POLICY "Clues readable by authenticated users" ON public.clues
  FOR SELECT TO authenticated USING (true);

-- Clues can only be inserted by authenticated users
CREATE POLICY "Authenticated users can insert clues" ON public.clues
  FOR INSERT TO authenticated WITH CHECK (true);

-- Predefined words are readable by all authenticated users
CREATE POLICY "Predefined words readable by authenticated users" ON public.predefined_words
  FOR SELECT TO authenticated USING (true);

-- Function to create user profile when auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (auth_user_id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create user profile
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to calculate user stats (call this periodically or after games)
CREATE OR REPLACE FUNCTION public.calculate_user_stats(user_uuid UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.users SET
    games_played = (
      SELECT COUNT(*) FROM public.game_records
      WHERE guesser_id = user_uuid
    ),
    games_won = (
      SELECT COUNT(*) FROM public.game_records
      WHERE guesser_id = user_uuid AND success = true
    )
  WHERE id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;