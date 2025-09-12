import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../config/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Database module for managing room word tracking
 */
class Database {
  constructor() {
    this.db = null;
  }

  /**
   * Initialize the database connection and create tables
   */
  async initialize() {
    try {
      // Create database in project root
      const dbPath = path.join(__dirname, '..', 'words.db');
      
      this.db = await open({
        filename: dbPath,
        driver: sqlite3.Database
      });

      // Enable foreign keys
      await this.db.exec('PRAGMA foreign_keys = ON;');
      
      // Create schema
      await this.createSchema();
      
      logger.info({ dbPath }, 'Database initialized successfully');
    } catch (error) {
      logger.error({ error }, 'Failed to initialize database');
      throw error;
    }
  }

  /**
   * Create database schema with tables and indexes
   */
  async createSchema() {
    try {
      // Rooms table
      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS rooms (
          id TEXT PRIMARY KEY,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          last_active DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Used words tracking table
      await this.db.exec(`
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
      await this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_room_used_words_room_difficulty 
        ON room_used_words(room_id, difficulty);
      `);

      await this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_room_used_words_word 
        ON room_used_words(word);
      `);

      await this.db.exec(`
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
   * Ensure room exists in database
   * @param {string} roomId - Room identifier
   */
  async ensureRoom(roomId) {
    try {
      await this.db.run(`
        INSERT OR IGNORE INTO rooms (id, last_active) 
        VALUES (?, CURRENT_TIMESTAMP)
      `, [roomId]);
      
      // Update last_active timestamp
      await this.db.run(`
        UPDATE rooms 
        SET last_active = CURRENT_TIMESTAMP 
        WHERE id = ?
      `, [roomId]);
      
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
   * @returns {Promise<string|null>} Random unused word or null if all used
   */
  async getUnusedWord(roomId, difficulty, availableWords) {
    try {
      await this.ensureRoom(roomId);

      // Get words not yet used in this room for this difficulty
      const placeholders = availableWords.map(() => '?').join(',');
      const query = `
        SELECT word FROM (
          SELECT ? as word ${availableWords.map(() => 'UNION SELECT ?').join(' ')}
        ) all_words
        WHERE word NOT IN (
          SELECT word FROM room_used_words 
          WHERE room_id = ? AND difficulty = ?
        )
        ORDER BY RANDOM() 
        LIMIT 1
      `;

      const params = [availableWords[0], ...availableWords.slice(1), roomId, difficulty];
      const result = await this.db.get(query, params);
      
      return result ? result.word : null;
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
  async markWordAsUsed(roomId, word, difficulty) {
    try {
      await this.ensureRoom(roomId);

      await this.db.run(`
        INSERT OR IGNORE INTO room_used_words (room_id, word, difficulty) 
        VALUES (?, ?, ?)
      `, [roomId, word, difficulty]);

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
   */
  async clearUsedWords(roomId, difficulty) {
    try {
      const result = await this.db.run(`
        DELETE FROM room_used_words 
        WHERE room_id = ? AND difficulty = ?
      `, [roomId, difficulty]);

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
   * @returns {Promise<string>} Next available word
   */
  async getNextWord(roomId, difficulty, availableWords) {
    try {
      // Try to get an unused word
      let word = await this.getUnusedWord(roomId, difficulty, availableWords);
      
      if (!word) {
        // All words exhausted - clear used words and try again
        logger.info({ roomId, difficulty }, 'All words exhausted, resetting word pool');
        await this.clearUsedWords(roomId, difficulty);
        word = await this.getUnusedWord(roomId, difficulty, availableWords);
      }

      if (!word) {
        // Fallback - should never happen if availableWords is not empty
        word = availableWords[Math.floor(Math.random() * availableWords.length)];
        logger.warn({ roomId, difficulty }, 'Using fallback random word selection');
      }

      // Mark the selected word as used
      await this.markWordAsUsed(roomId, word, difficulty);
      
      return word;
    } catch (error) {
      logger.error({ error, roomId, difficulty }, 'Failed to get next word');
      throw error;
    }
  }

  /**
   * Get statistics for a room
   * @param {string} roomId - Room identifier
   * @returns {Promise<Object>} Room statistics
   */
  async getRoomStats(roomId) {
    try {
      const stats = await this.db.get(`
        SELECT 
          (SELECT COUNT(*) FROM room_used_words WHERE room_id = ? AND difficulty = 'easy') as easy_used,
          (SELECT COUNT(*) FROM room_used_words WHERE room_id = ? AND difficulty = 'medium') as medium_used,
          (SELECT COUNT(*) FROM room_used_words WHERE room_id = ? AND difficulty = 'hard') as hard_used,
          (SELECT created_at FROM rooms WHERE id = ?) as room_created,
          (SELECT last_active FROM rooms WHERE id = ?) as room_last_active
      `, [roomId, roomId, roomId, roomId, roomId]);

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
   * @returns {Promise<number>} Number of rooms cleaned up
   */
  async cleanupInactiveRooms(daysInactive = 7) {
    try {
      const result = await this.db.run(`
        DELETE FROM rooms 
        WHERE last_active < datetime('now', '-' || ? || ' days')
      `, [daysInactive]);

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
      await this.db.close();
      logger.info('Database connection closed');
    }
  }
}

// Export singleton instance
export default new Database();