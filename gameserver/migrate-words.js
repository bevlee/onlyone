import database from './modules/database.js';
import { secretWords } from './data/data.js';
import { logger } from './config/logger.js';

/**
 * Migration script to populate the database with words from data.js
 * Run this once to move from hardcoded arrays to database storage
 */
async function migrateWords() {
  try {
    console.log('Starting word migration...');
    
    // Initialize database if not already done
    await database.initialize();
    
    let totalInserted = 0;
    let totalSkipped = 0;
    
    // Iterate through each difficulty level
    for (const [difficulty, words] of Object.entries(secretWords)) {
      console.log(`\nMigrating ${difficulty} words (${words.length} words)...`);
      
      for (const word of words) {
        try {
          // Insert word if it doesn't already exist
          const result = database.db.prepare(`
            INSERT OR IGNORE INTO words (word, difficulty, active) 
            VALUES (?, ?, 1)
          `).run(word, difficulty);
          
          if (result.changes > 0) {
            totalInserted++;
            console.log(`  ✓ Added: ${word}`);
          } else {
            totalSkipped++;
            console.log(`  - Skipped (exists): ${word}`);
          }
        } catch (error) {
          console.error(`  ✗ Failed to insert ${word}:`, error.message);
        }
      }
    }
    
    console.log(`\n=== Migration Complete ===`);
    console.log(`Total words inserted: ${totalInserted}`);
    console.log(`Total words skipped: ${totalSkipped}`);
    
    // Show final counts
    const counts = database.db.prepare(`
      SELECT difficulty, COUNT(*) as count 
      FROM words 
      WHERE active = 1 
      GROUP BY difficulty
    `).all();
    
    console.log('\nWords in database by difficulty:');
    counts.forEach(({ difficulty, count }) => {
      console.log(`  ${difficulty}: ${count} words`);
    });
    
    await database.close();
    console.log('\nMigration completed successfully!');
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateWords().catch(console.error);
}

export default migrateWords;