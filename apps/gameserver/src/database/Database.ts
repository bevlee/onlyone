import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { User } from '../models/User.js';
import { WordManager } from '../services/WordManager';
import { Clue, ClueCommends } from '@onlyone/shared/Room';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class GameDatabase {
  private db: Database.Database;
  private preparedStatements!: {
    // User statements
    insertUser: Database.Statement;
    getUserById: Database.Statement;
    getUserByName: Database.Statement;
    updateUser: Database.Statement;
    updateUserStats: Database.Statement;
    getUserByEmail: Database.Statement;
    getUserByAuthProvider: Database.Statement;
    addAuthProvider: Database.Statement;
    updateUserPassword: Database.Statement;


    // Game record statements
    insertGameRecord: Database.Statement;

    // Clue statements
    insertClue: Database.Statement;
    getCluesForGame: Database.Statement;
  };

  public wordManager: WordManager;

  constructor(dbPath?: string) {
    const defaultPath = path.join(__dirname, '..', '..', process.env.DB_PATH || 'onlyone.db');
    const finalPath = dbPath || defaultPath;

    this.db = new Database(finalPath);
    this.setupDatabase();
    this.prepareStatements();
    this.wordManager = new WordManager(this.db);
  }

  private setupDatabase(): void {
    // Enable basic optimizations
    this.db.pragma('foreign_keys = ON');
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');

    // Execute schema
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    this.db.exec(schema);
  }

  private prepareStatements(): void {
    this.preparedStatements = {
      // User statements
      insertUser: this.db.prepare(`
        INSERT INTO users (
          id, name, email, password_hash, created_at,
          games_played, games_won
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `),

      getUserById: this.db.prepare(`
        SELECT * FROM users WHERE id = ?
      `),

      getUserByName: this.db.prepare(`
        SELECT * FROM users WHERE name = ?
      `),

      updateUser: this.db.prepare(`
        UPDATE users
        SET name = ?
        WHERE id = ?
      `),

      updateUserStats: this.db.prepare(`
        UPDATE users
        SET games_played = ?, games_won = ?
        WHERE id = ?
      `),


      // Game record statements
      insertGameRecord: this.db.prepare(`
        INSERT INTO game_records (
          id, room_id, success, secret_word,
          final_guess, start_time, end_time, duration_seconds,
          guesser_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `),


      insertClue: this.db.prepare(`
        INSERT INTO clues (
          game_id, submitter_id, clue_text,
          helpful_votes, creative_votes, non_duplicate, was_filtered, submitted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `),


      getCluesForGame: this.db.prepare(`
        SELECT c.*, u.name as submitter_name
        FROM clues c
        JOIN users u ON c.submitter_id = u.id
        WHERE c.game_id = ?
        ORDER BY c.submitted_at
      `),

      getUserByEmail: this.db.prepare(`
        SELECT * FROM users WHERE email = ?
      `),

      addAuthProvider: this.db.prepare(`
        INSERT INTO user_auth_providers (user_id, provider, provider_id, provider_email)
        VALUES (?, ?, ?, ?)
      `),

      getUserByAuthProvider: this.db.prepare(`
        SELECT u.* FROM users u
        JOIN user_auth_providers ap ON u.id = ap.user_id
        WHERE ap.provider = ? AND ap.provider_id = ?
      `),

      updateUserPassword: this.db.prepare(`
        UPDATE users SET password_hash = ? WHERE id = ?
      `)
    };
  }

  // User management methods
  createUser(id: string, name: string, email?: string, passwordHash?: string): User {
    const user = new User(id, name, email, passwordHash);

    this.preparedStatements.insertUser.run(
      user.id,
      user.name,
      user.email || null,
      user.passwordHash || null,
      user.createdAt.toISOString(),
      user.gamesPlayed,
      user.gamesWon
    );

    return user;
  }

  getUserById(id: string): User | null {
    const row = this.preparedStatements.getUserById.get(id) as any;
    return row ? this.rowToUser(row) : null;
  }

  getUserByIdWithStats(id: string): User | null {
    const user = this.getUserById(id);
    if (!user) return null;

    const calculatedStats = this.calculateUserStats(id);
    user.gamesPlayed = calculatedStats.gamesPlayed || user.gamesPlayed;
    user.gamesWon = calculatedStats.gamesWon || user.gamesWon;
    return user;
  }

  getUserByName(name: string): User | null {
    const row = this.preparedStatements.getUserByName.get(name) as any;
    return row ? this.rowToUser(row) : null;
  }

  getUserByEmail(email: string): User | null {
    const row = this.preparedStatements.getUserByEmail.get(email) as any;
    return row ? this.rowToUser(row) : null;
  }

  getUserByAuthProvider(provider: string, providerId: string): User | null {
    const row = this.preparedStatements.getUserByAuthProvider.get(provider, providerId) as any;
    return row ? this.rowToUser(row) : null;
  }

  updateUser(user: User): void {
    this.preparedStatements.updateUserStats.run(
      user.gamesPlayed,
      user.gamesWon,
      user.id
    );
  }


  private rowToUser(row: any): User {
    return new User(
      row.id,
      row.name,
      row.email,
      row.password_hash,
      [], // authProviders loaded separately if needed
      new Date(row.created_at),
      row.games_played || 0,
      row.games_won || 0
    );
  }


  // Game record methods
  recordGame(gameData: {
    id: string;
    roomId: string;
    success: boolean;
    secretWord: string;
    finalGuess?: string;
    startTime: Date;
    endTime: Date;
    durationSeconds: number;
    guesserId?: string;
  }): void {
    this.preparedStatements.insertGameRecord.run(
      gameData.id,
      gameData.roomId,
      gameData.success ? 1 : 0,
      gameData.secretWord,
      gameData.finalGuess || null,
      gameData.startTime.toISOString(),
      gameData.endTime.toISOString(),
      gameData.durationSeconds,
      gameData.guesserId || null
    );
  }


  // Clue management methods
  recordClue(clue: Clue, gameId: string): number {
    const result = this.preparedStatements.insertClue.run(
      gameId,
      clue.submitter,
      clue.text,
      clue.votes.helpful,
      clue.votes.creative,
      clue.nonDuplicate ? 1 : 0,
      clue.wasFiltered ? 1 : 0,
      clue.submittedAt.toISOString()
    );
    return result.lastInsertRowid as number;
  }


  getCluesForGame(gameId: string): Clue[] {
    const rows = this.preparedStatements.getCluesForGame.all(gameId) as any[];
    return rows.map(row => ({
      text: row.clue_text,
      submitter: row.submitter_name,
      votes: {
        helpful: row.helpful_votes,
        creative: row.creative_votes
      },
      wasFiltered: row.was_filtered === 1,
      nonDuplicate: row.non_duplicate === 1,
      submittedAt: new Date(row.submitted_at)
    }));
  }

  // Auth provider methods
  addAuthProvider(userId: string, provider: {
    provider: string;
    providerId: string;
    email?: string;
  }): void {
    this.preparedStatements.addAuthProvider.run(
      userId,
      provider.provider,
      provider.providerId,
      provider.email || null
    );
  }

  updateUserPassword(userId: string, passwordHash: string): void {
    this.preparedStatements.updateUserPassword.run(passwordHash, userId);
  }

  // Calculate user stats from game records
  calculateUserStats(userId: string): {
    gamesPlayed?: number;
    gamesWon?: number;
    successfulGuesses?: number;
    cluesSubmitted?: number;
    nonDuplicateCluesSubmitted?: number;
    helpfulVotesReceived?: number;
    creativeVotesReceived?: number;
    helpfulCluesSubmitted?: number;
    creativeCluesSubmitted?: number;
  } {
    // Get basic game stats
    const gameStats = this.db.prepare(`
      SELECT
        COUNT(*) as games_played,
        SUM(CASE WHEN success = 1 AND guesser_id = ? THEN 1 ELSE 0 END) as games_won,
        SUM(CASE WHEN success = 1 AND guesser_id = ? THEN 1 ELSE 0 END) as successful_guesses
      FROM game_records
      WHERE guesser_id = ?
    `).get(userId, userId, userId) as any;

    // Get clue submission stats
    const clueStats = this.db.prepare(`
      SELECT
        COUNT(*) as clues_submitted,
        SUM(helpful_votes) as helpful_votes_received,
        SUM(creative_votes) as creative_votes_received,
        SUM(CASE WHEN non_duplicate = 1 THEN 1 ELSE 0 END) as non_duplicate_clues_submitted,
        SUM(CASE WHEN helpful_votes > creative_votes THEN 1 ELSE 0 END) as helpful_clues_submitted,
        SUM(CASE WHEN creative_votes > helpful_votes THEN 1 ELSE 0 END) as creative_clues_submitted
      FROM clues
      WHERE submitter_id = ?
    `).get(userId) as any;

    return {
      gamesPlayed: gameStats.games_played || 0,
      gamesWon: gameStats.games_won || 0,
      successfulGuesses: gameStats.successful_guesses || 0,
      cluesSubmitted: clueStats.clues_submitted || 0,
      nonDuplicateCluesSubmitted: clueStats.non_duplicate_clues_submitted || 0,
      helpfulVotesReceived: clueStats.helpful_votes_received || 0,
      creativeVotesReceived: clueStats.creative_votes_received || 0,
      helpfulCluesSubmitted: clueStats.helpful_clues_submitted || 0,
      creativeCluesSubmitted: clueStats.creative_clues_submitted || 0
    };
  }

  // Database management
  close(): void {
    this.db.close();
  }

  // Transaction helper
  transaction<T>(fn: () => T): T {
    return this.db.transaction(fn)();
  }
}