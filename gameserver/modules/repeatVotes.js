const NO_ANSWER = "<no answer>";

const normalise = (clue) => clue.trim().toLowerCase();

/**
 * Tracks which writers have marked each clue as repeated during the voting phase.
 * A clue is removed when a majority of the phase's writers mark it, or automatically
 * when it is identical to another clue or empty.
 */
export class RepeatVotes {
  /**
   * @param {Array<string>} clues - Clues in submission order
   * @param {Array<string>} voterIds - Player IDs of the writers allowed to vote
   */
  constructor(clues, voterIds) {
    this.voterIds = new Set(voterIds);
    this.marks = clues.map(() => new Set());
    this.done = new Set();
    this.autoRemoved = RepeatVotes.findAutoRemoved(clues);
  }

  /**
   * Flag clues that are empty or identical (case-insensitive) to another clue.
   * @param {Array<string>} clues
   * @returns {Array<boolean>}
   */
  static findAutoRemoved(clues) {
    const seen = new Map();
    for (const clue of clues) {
      const key = normalise(clue);
      seen.set(key, (seen.get(key) || 0) + 1);
    }
    return clues.map((clue) => clue === NO_ANSWER || !clue.trim() || seen.get(normalise(clue)) > 1);
  }

  /** Votes needed to remove a clue: a strict majority of writers. */
  get required() {
    return Math.floor(this.voterIds.size / 2) + 1;
  }

  /**
   * Set or clear one writer's repeated mark on a clue.
   * @param {string} playerId
   * @param {number} index
   * @param {boolean} marked
   * @returns {boolean} True if the mark was accepted
   */
  setMark(playerId, index, marked) {
    if (!this.voterIds.has(playerId) || this.done.has(playerId)) return false;
    if (!Number.isInteger(index) || index < 0 || index >= this.marks.length) return false;
    if (this.autoRemoved[index] || typeof marked !== "boolean") return false;
    if (marked) this.marks[index].add(playerId);
    else this.marks[index].delete(playerId);
    return true;
  }

  /**
   * Record that a writer has finished reviewing.
   * @param {string} playerId
   * @returns {boolean} True if the writer is a voter
   */
  finish(playerId) {
    if (!this.voterIds.has(playerId)) return false;
    this.done.add(playerId);
    return true;
  }

  /**
   * Whether every writer who is still connected has pressed Done.
   * @param {Array<string>} connectedIds
   * @returns {boolean}
   */
  allDone(connectedIds) {
    return connectedIds.filter((id) => this.voterIds.has(id)).every((id) => this.done.has(id));
  }

  /** @returns {Array<number>} Repeated votes per clue */
  counts() {
    return this.marks.map((voters) => voters.size);
  }

  /** @returns {Array<boolean>} Whether each clue will be hidden from the guesser */
  removed() {
    return this.marks.map((voters, i) => this.autoRemoved[i] || voters.size >= this.required);
  }

  /** State shared with every writer. Never includes who voted. */
  publicState() {
    return {
      counts: this.counts(),
      autoRemoved: this.autoRemoved,
      required: this.required,
      voters: this.voterIds.size,
      done: this.done.size,
    };
  }
}
