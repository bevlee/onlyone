import { User } from './User.js';

export class UserProfile {
  public readonly user: User;

  // Game statistics
  public gamesPlayed: number = 0;
  public gamesWon: number = 0;
  public successfulGuesses: number = 0;
  public cluesSubmitted: number = 0;
  public nonDuplicateCluesSubmitted: number = 0;
  public helpfulVotesReceived: number = 0;
  public creativeVotesReceived: number = 0;
  public helpfulCluesSubmitted: number = 0;
  public creativeCluesSubmitted: number = 0;

  constructor(user: User, stats: Partial<UserProfile> = {}) {
    this.user = user;
    Object.assign(this, stats);
  }

  // Delegate common user properties
  get id(): string {
    return this.user.id;
  }

  get name(): string {
    return this.user.name;
  }

  get email(): string | undefined {
    return this.user.email;
  }

  get createdAt(): Date {
    return this.user.createdAt;
  }

  get isOnline(): boolean {
    return this.user.isOnline();
  }

  // Stats calculation methods
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

  // Serialization for profile views
  toProfileJSON() {
    return {
      id: this.user.id,
      name: this.user.name,
      createdAt: this.user.createdAt,
      isOnline: this.user.isOnline(),
      stats: this.getStatsJSON(),
      winRate: this.getWinRate(),
      helpfulClueRate: this.getHelpfulClueRate(),
      creativeClueRate: this.getCreativeClueRate()
    };
  }

  // Serialization for leaderboards (public stats only)
  toLeaderboardJSON() {
    return {
      id: this.user.id,
      name: this.user.name,
      gamesPlayed: this.gamesPlayed,
      gamesWon: this.gamesWon,
      winRate: this.getWinRate(),
      totalHelpfulVotes: this.getTotalHelpfulVotes(),
      totalCreativeVotes: this.getTotalCreativeVotes(),
      helpfulClueRate: this.getHelpfulClueRate(),
      creativeClueRate: this.getCreativeClueRate()
    };
  }

  // Stats only serialization
  getStatsJSON() {
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

  // Complete serialization (for admin/full data contexts)
  toJSON() {
    return {
      user: this.user.toJSON(),
      stats: this.getStatsJSON()
    };
  }
}