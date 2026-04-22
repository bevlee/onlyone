import Database from 'better-sqlite3';

export interface Word {
  id: number;
  word: string;
  category: string;
  difficulty: string;
  enabled: number;
  added_at: string;
  added_by: string;
}

/**
 * Returns a random enabled word, optionally filtered by difficulty.
 * Does NOT track per-room usage — use database.getNextWord() for game rounds.
 */
export function getRandomWord(db: Database.Database, difficulty?: string): string {
  let row: { word: string } | undefined;
  if (difficulty) {
    row = db.prepare(
      'SELECT word FROM words WHERE enabled = 1 AND difficulty = ? ORDER BY RANDOM() LIMIT 1'
    ).get(difficulty) as { word: string } | undefined;
  } else {
    row = db.prepare(
      'SELECT word FROM words WHERE enabled = 1 ORDER BY RANDOM() LIMIT 1'
    ).get() as { word: string } | undefined;
  }
  if (!row) throw new Error(`No enabled words found${difficulty ? ` for difficulty: ${difficulty}` : ''}`);
  return row.word;
}

/** Returns all words (enabled and disabled). */
export function getAllWords(db: Database.Database): Word[] {
  return db.prepare('SELECT * FROM words ORDER BY difficulty, word').all() as Word[];
}

/**
 * Adds a word. Throws if duplicate (UNIQUE constraint).
 */
export function addWord(
  db: Database.Database,
  word: string,
  category = 'general',
  difficulty = 'medium'
): Word {
  const stmt = db.prepare(
    `INSERT INTO words (word, category, difficulty) VALUES (?, ?, ?) RETURNING *`
  );
  return stmt.get(word.trim().toLowerCase(), category, difficulty) as Word;
}

/**
 * Removes a word by its text or numeric id. Returns true if a row was deleted.
 */
export function removeWord(db: Database.Database, wordOrId: string | number): boolean {
  const stmt = typeof wordOrId === 'number'
    ? db.prepare('DELETE FROM words WHERE id = ?')
    : db.prepare('DELETE FROM words WHERE word = ?');
  const result = stmt.run(wordOrId);
  return result.changes > 0;
}

/**
 * Sets enabled=1 or enabled=0 on a word. Returns true if the word was found.
 */
export function toggleWord(
  db: Database.Database,
  wordOrId: string | number,
  enabled: boolean
): boolean {
  const stmt = typeof wordOrId === 'number'
    ? db.prepare('UPDATE words SET enabled = ? WHERE id = ?')
    : db.prepare('UPDATE words SET enabled = ? WHERE word = ?');
  const result = stmt.run(enabled ? 1 : 0, wordOrId);
  return result.changes > 0;
}

/**
 * Replaces the entire word list. Clears all rows and inserts new words
 * with default category='general' and difficulty='medium'.
 * Returns the count of inserted words.
 */
export function replaceWordList(db: Database.Database, words: string[]): number {
  return db.transaction(() => {
    db.prepare('DELETE FROM words').run();
    const insert = db.prepare(
      `INSERT OR IGNORE INTO words (word, category, difficulty) VALUES (?, 'general', 'medium')`
    );
    for (const word of words) {
      insert.run(word.trim().toLowerCase());
    }
    return (db.prepare('SELECT COUNT(*) as n FROM words').get() as { n: number }).n;
  })();
}
