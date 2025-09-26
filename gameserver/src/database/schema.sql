-- SQLite database schema for OnlyOne game server

-- Enable foreign key constraints
PRAGMA foreign_keys = ON;

-- Basic SQLite optimizations
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;

-- Users table for persistent player tracking
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  password_hash TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  -- Basic stats (calculated from game_records and clues tables)
  games_played INTEGER DEFAULT 0,
  games_won INTEGER DEFAULT 0
);

-- Auth providers table for OAuth/SSO support
CREATE TABLE IF NOT EXISTS user_auth_providers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('local', 'google')),
  provider_id TEXT NOT NULL,
  provider_email TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(provider, provider_id)
);

CREATE TABLE IF NOT EXISTS predefined_words (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  word TEXT NOT NULL UNIQUE,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);



-- Game records for tracking individual games
CREATE TABLE IF NOT EXISTS game_records (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL, -- Reference to ephemeral room (no FK constraint)
  success INTEGER NOT NULL CHECK (success IN (0, 1)), -- SQLite boolean as INTEGER
  secret_word TEXT NOT NULL,
  final_guess TEXT,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL,
  guesser_id TEXT,
  FOREIGN KEY (guesser_id) REFERENCES users(id)
);


-- Detailed clue tracking with quality votes
CREATE TABLE IF NOT EXISTS clues (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id TEXT NOT NULL,
  submitter_id TEXT NOT NULL,
  clue_text TEXT NOT NULL,
  helpful_votes INTEGER DEFAULT 0,
  creative_votes INTEGER DEFAULT 0,
  non_duplicate INTEGER DEFAULT 0 CHECK (non_duplicate IN (0, 1)),
  was_filtered INTEGER DEFAULT 0 CHECK (was_filtered IN (0, 1)),
  submitted_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (game_id) REFERENCES game_records(id) ON DELETE CASCADE,
  FOREIGN KEY (submitter_id) REFERENCES users(id)
);

-- Indexes for performance optimization

-- User lookup indexes
CREATE INDEX IF NOT EXISTS idx_users_name ON users(name);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Auth provider indexes
CREATE INDEX IF NOT EXISTS idx_auth_providers_user_id ON user_auth_providers(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_providers_provider ON user_auth_providers(provider, provider_id);


-- Game records indexes
CREATE INDEX IF NOT EXISTS idx_game_records_room_id ON game_records(room_id);
CREATE INDEX IF NOT EXISTS idx_game_records_guesser_id ON game_records(guesser_id);


-- Clue indexes
CREATE INDEX IF NOT EXISTS idx_clues_game_id ON clues(game_id);
CREATE INDEX IF NOT EXISTS idx_clues_submitter_id ON clues(submitter_id);