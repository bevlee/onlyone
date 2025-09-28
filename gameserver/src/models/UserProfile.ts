import { User } from './User.js';
import { UserStats } from './UserStats.js';

export class UserProfile {
  public readonly user: User;
  public readonly stats: UserStats;

  constructor(user: User, stats?: UserStats) {
    this.user = user;
    this.stats = stats || new UserStats();
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

  // Stats convenience methods
  getWinRate(): number {
    return this.stats.getWinRate();
  }

  getNonDuplicateClueRate(): number {
    return this.stats.getNonDuplicateClueRate();
  }

  getHelpfulClueRate(): number {
    return this.stats.getHelpfulClueRate();
  }

  getCreativeClueRate(): number {
    return this.stats.getCreativeClueRate();
  }

  getAverageHelpfulVotes(): number {
    return this.stats.getAverageHelpfulVotes();
  }

  getAverageCreativeVotes(): number {
    return this.stats.getAverageCreativeVotes();
  }

  getTotalHelpfulVotes(): number {
    return this.stats.getTotalHelpfulVotes();
  }

  getTotalCreativeVotes(): number {
    return this.stats.getTotalCreativeVotes();
  }

  getGuessSuccessRate(): number {
    return this.stats.getGuessSuccessRate();
  }

  // Serialization for profile views
  toProfileJSON() {
    return {
      id: this.user.id,
      name: this.user.name,
      createdAt: this.user.createdAt,
      isOnline: this.user.isOnline(),
      stats: this.stats.toJSON(),
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
      gamesPlayed: this.stats.gamesPlayed,
      gamesWon: this.stats.gamesWon,
      winRate: this.getWinRate(),
      totalHelpfulVotes: this.getTotalHelpfulVotes(),
      totalCreativeVotes: this.getTotalCreativeVotes(),
      helpfulClueRate: this.getHelpfulClueRate(),
      creativeClueRate: this.getCreativeClueRate()
    };
  }

  // Complete serialization (for admin/full data contexts)
  toJSON() {
    return {
      user: this.user.toJSON(),
      stats: this.stats.toJSON()
    };
  }
}