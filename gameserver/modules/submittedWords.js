import { randomInt } from 'node:crypto';

/** Private answer pool. Ownership uses socket IDs so display-name changes cannot expose answers. */
export class SubmittedWords {
  constructor(playerIds) {
    this.playerIds = new Set(playerIds);
    this.submissions = new Map();
    this.words = new Map();
    this.guesserTurns = new Map();
  }

  /** Accept one private batch of one to three answers per participant. */
  submit(playerId, answers) {
    if (!this.playerIds.has(playerId))
      return { success: false, reason: 'Join the next game to add words.' };
    if (this.submissions.has(playerId))
      return { success: false, reason: 'Your words are already submitted.' };
    if (
      !Array.isArray(answers) ||
      answers.length < 1 ||
      answers.length > 3 ||
      answers.some(
        (word) =>
          typeof word !== 'string' ||
          !word.trim() ||
          word.trim().length > 60 ||
          /[\r\n\x00-\x1f<>]/.test(word),
      )
    ) {
      return {
        success: false,
        reason: 'Submit 1–3 secret words, each between 1 and 60 characters.',
      };
    }
    const cleaned = answers.map((word) => word.trim().replace(/\s+/g, ' '));
    this.submissions.set(playerId, cleaned);
    for (const word of cleaned) {
      const key = word.toLowerCase();
      if (!this.words.has(key))
        this.words.set(key, { word, authors: new Set() });
      this.words.get(key).authors.add(playerId);
    }
    return { success: true };
  }

  /** Return submission progress without exposing any answers or authorship. */
  progress(connectedIds) {
    const participants = connectedIds.filter((id) => this.playerIds.has(id));
    return {
      submitted: participants.filter((id) => this.submissions.has(id)).length,
      total: participants.length,
    };
  }

  /** Draw a playable answer and give the least-used eligible guesser a turn. */
  draw(connectedIds) {
    connectedIds = connectedIds.filter((id) => this.playerIds.has(id));
    const playable = [...this.words.entries()].filter(([, entry]) =>
      connectedIds.some((id) => !entry.authors.has(id)),
    );
    if (!playable.length) return null;
    const [key, entry] = playable[randomInt(playable.length)];
    const eligible = connectedIds.filter((id) => !entry.authors.has(id));
    const fewestTurns = Math.min(
      ...eligible.map((id) => this.guesserTurns.get(id) || 0),
    );
    const candidates = eligible.filter(
      (id) => (this.guesserTurns.get(id) || 0) === fewestTurns,
    );
    const guesserId = candidates[randomInt(candidates.length)];
    this.guesserTurns.set(guesserId, fewestTurns + 1);
    this.words.delete(key);
    return { word: entry.word, guesserId, authorIds: [...entry.authors] };
  }

  /** Count remaining playable answers; unanimous submissions cannot be guessed fairly. */
  remaining(connectedIds) {
    connectedIds = connectedIds.filter((id) => this.playerIds.has(id));
    return [...this.words.values()].filter((entry) =>
      connectedIds.some((id) => !entry.authors.has(id)),
    ).length;
  }
}
