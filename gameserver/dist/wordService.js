/**
 * Returns a random enabled word, optionally filtered by difficulty.
 * Does NOT track per-room usage — use database.getNextWord() for game rounds.
 */
export function getRandomWord(db, difficulty) {
    const d = difficulty?.trim() || undefined;
    let row;
    if (d) {
        row = db.prepare('SELECT word FROM words WHERE enabled = 1 AND difficulty = ? ORDER BY RANDOM() LIMIT 1').get(d);
    }
    else {
        row = db.prepare('SELECT word FROM words WHERE enabled = 1 ORDER BY RANDOM() LIMIT 1').get();
    }
    if (!row)
        throw new Error(`No enabled words found${d ? ` for difficulty: ${d}` : ''}`);
    return row.word;
}
/** Returns all words (enabled and disabled). */
export function getAllWords(db) {
    return db.prepare('SELECT * FROM words ORDER BY difficulty, word').all();
}
/**
 * Adds a word. Throws if duplicate (UNIQUE constraint).
 */
export function addWord(db, word, category = 'general', difficulty = 'medium') {
    const stmt = db.prepare(`INSERT INTO words (word, category, difficulty) VALUES (?, ?, ?) RETURNING *`);
    const result = stmt.get(word.trim().toLowerCase(), category, difficulty);
    if (!result)
        throw new Error('Insert returned no row');
    return result;
}
/**
 * Removes a word by its text or numeric id. Returns true if a row was deleted.
 */
export function removeWord(db, wordOrId) {
    const stmt = typeof wordOrId === 'number'
        ? db.prepare('DELETE FROM words WHERE id = ?')
        : db.prepare('DELETE FROM words WHERE word = ?');
    const result = stmt.run(wordOrId);
    return result.changes > 0;
}
/**
 * Sets enabled=1 or enabled=0 on a word. Returns true if the word was found.
 */
export function toggleWord(db, wordOrId, enabled) {
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
export function replaceWordList(db, words) {
    return db.transaction(() => {
        db.prepare('DELETE FROM words').run();
        const insert = db.prepare(`INSERT OR IGNORE INTO words (word, category, difficulty) VALUES (?, 'general', 'medium')`);
        for (const word of words) {
            insert.run(word.trim().toLowerCase());
        }
        return db.prepare('SELECT COUNT(*) as n FROM words').get().n;
    })();
}
