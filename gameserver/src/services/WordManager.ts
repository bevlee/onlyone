import Database from 'better-sqlite3';

export interface WordRecord {
  id: number;
  word: string;
  createdAt: Date;
}

export class WordManager {
  private db: Database.Database;
  private preparedStatements: {
    getRandomWord: Database.Statement;
  };

  constructor(db: Database.Database) {
    this.db = db;
    this.preparedStatements = {
      getRandomWord: this.db.prepare(`
        SELECT word FROM predefined_words
        ORDER BY RANDOM()
        LIMIT 1
      `)
    };
  }

  async getRandomWord(): Promise<string> {
    const result = this.preparedStatements.getRandomWord.get() as { word: string } | undefined;

    if (!result) {
      throw new Error('No words available');
    }

    return result.word;
  }

}