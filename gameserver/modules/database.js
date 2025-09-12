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

      this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_room_used_words_word 
        ON room_used_words(word);
      `);

      this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_rooms_last_active 
        ON rooms(last_active);
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
        
        cleanupInactiveRooms: this.db.prepare(`
          DELETE FROM rooms 
          WHERE last_active < datetime('now', '-' || ? || ' days')
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
   * @param {string} roomId - Room identifier
   */
  ensureRoom(roomId) {
    try {
      this.preparedStatements.ensureRoom.run(roomId);
      this.preparedStatements.updateRoomActivity.run(roomId);
    } catch (error) {
      logger.error({ error, roomId }, 'Failed to ensure room exists');
      throw error;
    }
  }

  /**
   * Get an unused word for a room and difficulty
   * @param {string} roomId - Room identifier
   * @param {string} difficulty - Word difficulty (easy/medium/hard)
   * @param {Array<string>} availableWords - Array of all words for this difficulty
   * @returns {string|null} Random unused word or null if all used
   */
  getUnusedWord(roomId, difficulty, availableWords) {
    try {
      this.ensureRoom(roomId);

      // Get all words already used in this room for this difficulty
      const usedWordsResult = this.preparedStatements.getUsedWords.all(roomId, difficulty);
      const usedWords = new Set(usedWordsResult.map(row => row.word));
      
      // Filter to get unused words
      const unusedWords = availableWords.filter(word => !usedWords.has(word));
      
      if (unusedWords.length === 0) {
        return null; // All words have been used
      }

      // Return a random unused word
      const randomIndex = Math.floor(Math.random() * unusedWords.length);
      return unusedWords[randomIndex];
    } catch (error) {
      logger.error({ error, roomId, difficulty }, 'Failed to get unused word');
      throw error;
    }
  }

  /**
   * Mark a word as used in a room
   * @param {string} roomId - Room identifier
   * @param {string} word - Word that was used
   * @param {string} difficulty - Word difficulty
   */
  markWordAsUsed(roomId, word, difficulty) {
    try {
      this.ensureRoom(roomId);
      this.preparedStatements.markWordAsUsed.run(roomId, word, difficulty);
      logger.debug({ roomId, word, difficulty }, 'Word marked as used');
    } catch (error) {
      logger.error({ error, roomId, word, difficulty }, 'Failed to mark word as used');
      throw error;
    }
  }

  /**
   * Clear all used words for a room and difficulty (when all words exhausted)
   * @param {string} roomId - Room identifier
   * @param {string} difficulty - Word difficulty to reset
   * @returns {number} Number of words cleared
   */
  clearUsedWords(roomId, difficulty) {
    try {
      const result = this.preparedStatements.clearUsedWords.run(roomId, difficulty);
      logger.info({ roomId, difficulty, deletedRows: result.changes }, 'Cleared used words for room');
      return result.changes;
    } catch (error) {
      logger.error({ error, roomId, difficulty }, 'Failed to clear used words');
      throw error;
    }
  }

  /**
   * Get next available word for a room, resetting if all words used
   * @param {string} roomId - Room identifier
   * @param {string} difficulty - Word difficulty
   * @param {Array<string>} availableWords - Array of all words for this difficulty
   * @returns {string} Next available word
   */
  getNextWord(roomId, difficulty, availableWords) {
    try {
      // Use transaction for consistency
      return this.db.transaction(() => {
        // Try to get an unused word
        let word = this.getUnusedWord(roomId, difficulty, availableWords);
        
        if (!word) {
          // All words exhausted - clear used words and try again
          logger.info({ roomId, difficulty }, 'All words exhausted, resetting word pool');
          this.clearUsedWords(roomId, difficulty);
          word = this.getUnusedWord(roomId, difficulty, availableWords);
        }

        if (!word) {
          // Fallback - should never happen if availableWords is not empty
          word = availableWords[Math.floor(Math.random() * availableWords.length)];
          logger.warn({ roomId, difficulty }, 'Using fallback random word selection');
        }

        // Mark the selected word as used
        this.markWordAsUsed(roomId, word, difficulty);
        
        return word;
      })();
    } catch (error) {
      logger.error({ error, roomId, difficulty }, 'Failed to get next word');
      throw error;
    }
  }

  /**
   * Get statistics for a room
   * @param {string} roomId - Room identifier
   * @returns {Object} Room statistics
   */
  getRoomStats(roomId) {
    try {
      const stats = this.preparedStatements.getRoomStats.get(roomId, roomId, roomId, roomId, roomId);
      
      return stats || {
        easy_used: 0,
        medium_used: 0,
        hard_used: 0,
        room_created: null,
        room_last_active: null
      };
    } catch (error) {
      logger.error({ error, roomId }, 'Failed to get room stats');
      throw error;
    }
  }

  /**
   * Clean up old inactive rooms (optional maintenance)
   * @param {number} daysInactive - Number of days of inactivity before cleanup
   * @returns {number} Number of rooms cleaned up
   */
  cleanupInactiveRooms(daysInactive = 7) {
    try {
      const result = this.preparedStatements.cleanupInactiveRooms.run(daysInactive);

      if (result.changes > 0) {
        logger.info({ cleanedRooms: result.changes, daysInactive }, 'Cleaned up inactive rooms');
      }

      return result.changes;
    } catch (error) {
      logger.error({ error, daysInactive }, 'Failed to cleanup inactive rooms');
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