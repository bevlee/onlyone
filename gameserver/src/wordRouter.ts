import { timingSafeEqual } from 'node:crypto';
import { Router, Request, Response, NextFunction } from 'express';
import Database from 'better-sqlite3';
import { getAllWords, addWord, removeWord, toggleWord, replaceWordList, Word } from './wordService.js';

const VALID_DIFFICULTIES = ['easy', 'medium', 'hard'] as const;

function apiKeyMiddleware(req: Request, res: Response, next: NextFunction): void {
  const apiKey = process.env.WORDS_API_KEY;
  if (!apiKey) {
    console.warn('[words-api] WORDS_API_KEY not set — allowing all requests (dev mode)');
    next();
    return;
  }

  const authHeader = req.headers['authorization'];
  const xApiKey = req.headers['x-api-key'];

  const provided =
    (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : null) ?? (typeof xApiKey === 'string' ? xApiKey : null);

  const a = Buffer.from(provided ?? '');
  const b = Buffer.from(apiKey);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}

export function createWordRouter(db: Database.Database): Router {
  const router = Router();
  router.use(apiKeyMiddleware);

  // GET /api/words?difficulty=easy&enabled=true
  router.get('/', (req: Request, res: Response) => {
    try {
      let words: Word[] = getAllWords(db);

      const { difficulty, enabled } = req.query;
      if (typeof difficulty === 'string' && difficulty.trim()) {
        words = words.filter(w => w.difficulty === difficulty.trim());
      }
      if (typeof enabled === 'string') {
        if (enabled !== 'true' && enabled !== 'false') {
          res.status(400).json({ error: "enabled must be 'true' or 'false'" });
          return;
        }
        const enabledVal = enabled === 'true' ? 1 : 0;
        words = words.filter(w => w.enabled === enabledVal);
      }

      res.json(words);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // POST /api/words/bulk  { words: string[] }
  router.post('/bulk', (req: Request, res: Response) => {
    const { words } = req.body as { words?: unknown };
    if (!Array.isArray(words) || words.length === 0) {
      res.status(400).json({ error: 'words must be a non-empty array' });
      return;
    }
    if (!words.every(w => typeof w === 'string' && w.trim())) {
      res.status(400).json({ error: 'all words must be non-empty strings' });
      return;
    }
    try {
      const count = replaceWordList(db, words as string[]);
      res.json({ replaced: count });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // POST /api/words  { word, category?, difficulty? }
  router.post('/', (req: Request, res: Response) => {
    const { word, category, difficulty } = req.body as {
      word?: string;
      category?: string;
      difficulty?: string;
    };
    if (!word || typeof word !== 'string' || !word.trim()) {
      res.status(400).json({ error: 'word is required' });
      return;
    }
    if (difficulty && !(VALID_DIFFICULTIES as readonly string[]).includes(difficulty)) {
      res.status(400).json({ error: `difficulty must be one of: ${VALID_DIFFICULTIES.join(', ')}` });
      return;
    }
    try {
      const added = addWord(db, word, category, difficulty);
      res.status(201).json(added);
    } catch (err) {
      const msg = (err as Error).message;
      if (msg.includes('UNIQUE')) {
        res.status(409).json({ error: `Word already exists: ${word.trim().toLowerCase()}` });
      } else {
        res.status(500).json({ error: msg });
      }
    }
  });

  // DELETE /api/words/:word
  router.delete('/:word', (req: Request, res: Response) => {
    const word = req.params.word.trim().toLowerCase();
    try {
      const deleted = removeWord(db, word);
      if (!deleted) {
        res.status(404).json({ error: `Word not found: ${word}` });
        return;
      }
      res.json({ deleted: word });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // PATCH /api/words/:word  { enabled?, difficulty?, category? }
  router.patch('/:word', (req: Request, res: Response) => {
    const word = req.params.word.trim().toLowerCase();
    const { enabled, difficulty, category } = req.body as {
      enabled?: boolean;
      difficulty?: string;
      category?: string;
    };

    if (typeof enabled !== 'boolean' && typeof difficulty !== 'string' && typeof category !== 'string') {
      res.status(400).json({ error: 'at least one of enabled, difficulty, or category is required' });
      return;
    }

    if (typeof difficulty === 'string' && !(VALID_DIFFICULTIES as readonly string[]).includes(difficulty)) {
      res.status(400).json({ error: `difficulty must be one of: ${VALID_DIFFICULTIES.join(', ')}` });
      return;
    }

    try {
      const updated = db.transaction(() => {
        if (typeof enabled === 'boolean') {
          const found = toggleWord(db, word, enabled);
          if (!found && typeof difficulty !== 'string' && typeof category !== 'string') {
            return null;
          }
        }
        if (typeof difficulty === 'string' || typeof category === 'string') {
          const sets: string[] = [];
          const params: (string | number)[] = [];
          if (typeof difficulty === 'string') { sets.push('difficulty = ?'); params.push(difficulty); }
          if (typeof category === 'string') { sets.push('category = ?'); params.push(category); }
          params.push(word);
          const result = db.prepare(`UPDATE words SET ${sets.join(', ')} WHERE word = ?`).run(...params);
          if (result.changes === 0) {
            return null;
          }
        }

        return db.prepare('SELECT * FROM words WHERE word = ?').get(word) as Word | undefined;
      })();

      if (!updated) {
        res.status(404).json({ error: `Word not found: ${word}` });
        return;
      }
      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  return router;
}
