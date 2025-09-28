export interface UserStats {
  gamesPlayed: number;
  gamesWon: number;
  successfulGuesses: number;
  cluesSubmitted: number;
  nonDuplicateCluesSubmitted: number;

  // Quality-based clue tracking
  helpfulVotesReceived: number;
  creativeVotesReceived: number;

  // Breakdown of clue success
  helpfulCluesSubmitted: number;  // clues that got helpful votes
  creativeCluesSubmitted: number; // clues that got creative votes
}

export class UserStats {
  public gamesPlayed: number = 0;
  public gamesWon: number = 0;
  public successfulGuesses: number = 0;
  public cluesSubmitted: number = 0;
  public nonDuplicateCluesSubmitted: number = 0;
  public helpfulVotesReceived: number = 0;
  public creativeVotesReceived: number = 0;
  public helpfulCluesSubmitted: number = 0;
  public creativeCluesSubmitted: number = 0;

  constructor(stats: Partial<UserStats> = {}) {
    Object.assign(this, stats);
  }

  getWinRate(): number {
    return this.gamesPlayed > 0 ? this.gamesWon / this.gamesPlayed : 0;
  }

  getNonDuplicateClueRate(): number {
    return this.cluesSubmitted > 0
      ? this.nonDuplicateCluesSubmitted / this.cluesSubmitted
      : 0;
  }

  getHelpfulClueRate(): number {
    return this.cluesSubmitted > 0
      ? this.helpfulCluesSubmitted / this.cluesSubmitted
      : 0;
  }

  getCreativeClueRate(): number {
    return this.cluesSubmitted > 0
      ? this.creativeCluesSubmitted / this.cluesSubmitted
      : 0;
  }

  getAverageHelpfulVotes(): number {
    return this.helpfulCluesSubmitted > 0
      ? this.helpfulVotesReceived / this.helpfulCluesSubmitted
      : 0;
  }

  getAverageCreativeVotes(): number {
    return this.creativeCluesSubmitted > 0
      ? this.creativeVotesReceived / this.creativeCluesSubmitted
      : 0;
  }

  getTotalHelpfulVotes(): number {
    return this.helpfulVotesReceived;
  }

  getTotalCreativeVotes(): number {
    return this.creativeVotesReceived;
  }

  getGuessSuccessRate(): number {
    const totalGuessOpportunities = this.successfulGuesses +
      (this.gamesPlayed - this.gamesWon);
    return totalGuessOpportunities > 0
      ? this.successfulGuesses / totalGuessOpportunities
      : 0;
  }

  toJSON() {
    return {
      gamesPlayed: this.gamesPlayed,
      gamesWon: this.gamesWon,
      successfulGuesses: this.successfulGuesses,
      cluesSubmitted: this.cluesSubmitted,
      nonDuplicateCluesSubmitted: this.nonDuplicateCluesSubmitted,
      helpfulVotesReceived: this.helpfulVotesReceived,
      creativeVotesReceived: this.creativeVotesReceived,
      helpfulCluesSubmitted: this.helpfulCluesSubmitted,
      creativeCluesSubmitted: this.creativeCluesSubmitted
    };
  }
}