import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../config/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Database module for managing room word tracking using better-sqlite3
 */
class WordDatabase {
  constructor() {
    this.db = null;
    this.preparedStatements = {};
  }

  /**
   * Initialize the database connection and create tables
   */
  async initialize() {
    try {
      // Create database in project root
      const dbPath = path.join(__dirname, '..', 'words.db');
      
      this.db = new Database(dbPath);

      // Enable foreign keys and optimize performance
      this.db.pragma('foreign_keys = ON');
      this.db.pragma('journal_mode = WAL'); // Better performance for concurrent access
      this.db.pragma('synchronous = NORMAL'); // Balance safety and performance
      
      // Create schema
      this.createSchema();
      
      // Prepare frequently used statements
      this.prepareStatements();
      
      logger.info({ dbPath }, 'Database initialized successfully with better-sqlite3');
    } catch (error) {
      logger.error({ error }, 'Failed to initialize database');
      throw error;
    }
  }

  /**
   * Create database schema with tables and indexes
   */
  createSchema() {
    try {
      // Rooms table
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS rooms (
          id TEXT PRIMARY KEY,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          last_active DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Words table for storing all available words
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS words (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          word TEXT NOT NULL UNIQUE,
          difficulty TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Used words tracking table
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS room_used_words (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          room_id TEXT NOT NULL,
          word TEXT NOT NULL,
          difficulty TEXT NOT NULL,
          used_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
          UNIQUE(room_id, word, difficulty)
        );
      `);

      // Create indexes for performance
      this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_room_used_words_room_difficulty 
        ON room_used_words(room_id, difficulty);
      `);



      logger.debug('Database schema created successfully');
    } catch (error) {
      logger.error({ error }, 'Failed to create database schema');
      throw error;
    }
  }

  /**
   * Prepare frequently used SQL statements for better performance
   */
  prepareStatements() {
    try {
      this.preparedStatements = {
        ensureRoom: this.db.prepare(`
          INSERT OR IGNORE INTO rooms (id, last_active) 
          VALUES (?, CURRENT_TIMESTAMP)
        `),
        
        updateRoomActivity: this.db.prepare(`
          UPDATE rooms 
          SET last_active = CURRENT_TIMESTAMP 
          WHERE id = ?
        `),
        
        getUsedWords: this.db.prepare(`
          SELECT word FROM room_used_words 
          WHERE room_id = ? AND difficulty = ?
        `),
        
        markWordAsUsed: this.db.prepare(`
          INSERT OR IGNORE INTO room_used_words (room_id, word, difficulty) 
          VALUES (?, ?, ?)
        `),
        
        clearUsedWords: this.db.prepare(`
          DELETE FROM room_used_words 
          WHERE room_id = ? AND difficulty = ?
        `),
        
        getRoomStats: this.db.prepare(`
          SELECT 
            (SELECT COUNT(*) FROM room_used_words WHERE room_id = ? AND difficulty = 'easy') as easy_used,
            (SELECT COUNT(*) FROM room_used_words WHERE room_id = ? AND difficulty = 'medium') as medium_used,
            (SELECT COUNT(*) FROM room_used_words WHERE room_id = ? AND difficulty = 'hard') as hard_used,
            (SELECT created_at FROM rooms WHERE id = ?) as room_created,
            (SELECT last_active FROM rooms WHERE id = ?) as room_last_active
        `),
        
        
        getAllWordsForDifficulty: this.db.prepare(`
          SELECT word FROM words 
          WHERE difficulty = ?
        `),
        
        addWord: this.db.prepare(`
          INSERT INTO words (word, difficulty) 
          VALUES (?, ?)
        `),
        
        getWordCount: this.db.prepare(`
          SELECT COUNT(*) as count 
          FROM words 
          WHERE difficulty = ?
        `),
        
        getRandomUnusedWord: this.db.prepare(`
          SELECT word 
          FROM words 
          WHERE difficulty = ? 
            AND word NOT IN (
              SELECT word 
              FROM room_used_words 
              WHERE room_id = ? AND difficulty = ?
            )
          ORDER BY RANDOM() 
          LIMIT 1
        `)
      };

      logger.debug('Prepared statements created successfully');
    } catch (error) {
      logger.error({ error }, 'Failed to prepare statements');
      throw error;
    }
  }

  /**
   * Ensure room exists in database
   * @param {string} roomName - Room identifier
   */
  ensureRoom(roomName) {
    try {
      this.preparedStatements.ensureRoom.run(roomName);
      this.preparedStatements.updateRoomActivity.run(roomName);
    } catch (error) {
      logger.error({ error, roomName }, 'Failed to ensure room exists');
      throw error;
    }
  }

  /**
   * Get all active words for a difficulty level from database
   * @param {string} difficulty - Word difficulty (easy/medium/hard)
   * @returns {Array<string>} Array of all active words for this difficulty
   */
  getAllWordsForDifficulty(difficulty) {
    try {
      const wordsResult = this.preparedStatements.getAllWordsForDifficulty.all(difficulty);
      return wordsResult.map(row => row.word);
    } catch (error) {
      logger.error({ error, difficulty }, 'Failed to get words for difficulty');
      throw error;
    }
  }


  /**
   * Mark a word as used in a room
   * @param {string} roomName - Room identifier
   * @param {string} word - Word that was used
   * @param {string} difficulty - Word difficulty
   */
  markWordAsUsed(roomName, word, difficulty) {
    try {
      this.ensureRoom(roomName);
      this.preparedStatements.markWordAsUsed.run(roomName, word, difficulty);
      logger.debug({ roomName, word, difficulty }, 'Word marked as used');
    } catch (error) {
      logger.error({ error, roomName, word, difficulty }, 'Failed to mark word as used');
      throw error;
    }
  }

  /**
   * Clear all used words for a room and difficulty (when all words exhausted)
   * @param {string} roomName - Room identifier
   * @param {string} difficulty - Word difficulty to reset
   * @returns {number} Number of words cleared
   */
  clearUsedWords(roomName, difficulty) {
    try {
      const result = this.preparedStatements.clearUsedWords.run(roomName, difficulty);
      logger.info({ roomName, difficulty, deletedRows: result.changes }, 'Cleared used words for room');
      return result.changes;
    } catch (error) {
      logger.error({ error, roomName, difficulty }, 'Failed to clear used words');
      throw error;
    }
  }

  /**
   * Get next available word for a room, resetting if all words used
   * @param {string} roomName - Room identifier
   * @param {string} difficulty - Word difficulty
   * @returns {string} Next available word
   */
  getNextWord(roomName, difficulty) {
    try {
      // Use transaction for consistency
      return this.db.transaction(() => {
        this.ensureRoom(roomName);

        // Try to get a random unused word using efficient SQL query
        let result = this.preparedStatements.getRandomUnusedWord.get(difficulty, roomName, difficulty);

        if (!result) {
          // All words exhausted - clear used words and try again
          logger.info({ roomName, difficulty }, 'All words exhausted, resetting word pool');
          this.clearUsedWords(roomName, difficulty);

          // Try again after reset
          result = this.preparedStatements.getRandomUnusedWord.get(difficulty, roomName, difficulty);
        }

        if (!result) {
          // Fallback - get any random word (should never happen if words exist)
          const availableWords = this.getAllWordsForDifficulty(difficulty);
          if (availableWords.length === 0) {
            throw new Error(`No words available for difficulty: ${difficulty}`);
          }
          result = { word: availableWords[Math.floor(Math.random() * availableWords.length)] };
          logger.warn({ roomName, difficulty }, 'Using fallback random word selection');
        }

        // Mark the selected word as used
        this.markWordAsUsed(roomName, result.word, difficulty);

        return result.word;
      })();
    } catch (error) {
      logger.error({ error, roomName, difficulty }, 'Failed to get next word');
      throw error;
    }
  }

  /**
   * Get statistics for a room
   * @param {string} roomName - Room identifier
   * @returns {Object} Room statistics
   */
  getRoomStats(roomName) {
    try {
      const stats = this.preparedStatements.getRoomStats.get(roomName, roomName, roomName, roomName, roomName);

      return stats || {
        easy_used: 0,
        medium_used: 0,
        hard_used: 0,
        room_created: null,
        room_last_active: null
      };
    } catch (error) {
      logger.error({ error, roomName }, 'Failed to get room stats');
      throw error;
    }
  }


  /**
   * Add a new word to the database
   * @param {string} word - The word to add
   * @param {string} difficulty - Word difficulty (easy/medium/hard)
   * @returns {boolean} True if word was added, false if it already exists
   */
  addWord(word, difficulty) {
    try {
      const result = this.preparedStatements.addWord.run(word, difficulty);
      if (result.changes > 0) {
        logger.info({ word, difficulty }, 'Word added to database');
        return true;
      }
      return false; // Word already exists
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        logger.debug({ word, difficulty }, 'Word already exists in database');
        return false;
      }
      logger.error({ error, word, difficulty }, 'Failed to add word');
      throw error;
    }
  }

  /**
   * Get count of words for a difficulty
   * @param {string} difficulty - Word difficulty
   * @returns {number} Number of words
   */
  getWordCount(difficulty) {
    try {
      const result = this.preparedStatements.getWordCount.get(difficulty);
      return result.count;
    } catch (error) {
      logger.error({ error, difficulty }, 'Failed to get word count');
      throw error;
    }
  }

  /**
   * Close database connection
   */
  async close() {
    if (this.db) {
      this.db.close();
      logger.info('Database connection closed');
    }
  }
}

// Export singleton instance
export default new WordDatabase();