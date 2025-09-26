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

export interface AuthProvider {
  provider: 'local' | 'google';
  providerId: string;
  email?: string;
}

export class User {
  public readonly id: string;
  public name: string;
  public readonly email?: string;
  public readonly passwordHash?: string;
  public readonly authProviders: AuthProvider[];
  public readonly createdAt: Date;
  public stats: UserStats;

  constructor(
    id: string,
    name: string,
    email?: string,
    passwordHash?: string,
    authProviders: AuthProvider[] = [],
    createdAt: Date = new Date(),
    stats: UserStats = {
      gamesPlayed: 0,
      gamesWon: 0,
      successfulGuesses: 0,
      cluesSubmitted: 0,
      nonDuplicateCluesSubmitted: 0,
      helpfulVotesReceived: 0,
      creativeVotesReceived: 0,
      helpfulCluesSubmitted: 0,
      creativeCluesSubmitted: 0
    }
  ) {
    this.id = id;
    this.name = name;
    this.email = email;
    this.passwordHash = passwordHash;
    this.authProviders = authProviders;
    this.createdAt = createdAt;
    this.stats = stats;
  }


  getWinRate(): number {
    return this.stats.gamesPlayed > 0 ? this.stats.gamesWon / this.stats.gamesPlayed : 0;
  }

  getNonDuplicateClueRate(): number {
    return this.stats.cluesSubmitted > 0
      ? this.stats.nonDuplicateCluesSubmitted / this.stats.cluesSubmitted
      : 0;
  }

  getHelpfulClueRate(): number {
    return this.stats.cluesSubmitted > 0
      ? this.stats.helpfulCluesSubmitted / this.stats.cluesSubmitted
      : 0;
  }

  getCreativeClueRate(): number {
    return this.stats.cluesSubmitted > 0
      ? this.stats.creativeCluesSubmitted / this.stats.cluesSubmitted
      : 0;
  }

  getAverageHelpfulVotes(): number {
    return this.stats.helpfulCluesSubmitted > 0
      ? this.stats.helpfulVotesReceived / this.stats.helpfulCluesSubmitted
      : 0;
  }

  getAverageCreativeVotes(): number {
    return this.stats.creativeCluesSubmitted > 0
      ? this.stats.creativeVotesReceived / this.stats.creativeCluesSubmitted
      : 0;
  }

  getTotalHelpfulVotes(): number {
    return this.stats.helpfulVotesReceived;
  }

  getTotalCreativeVotes(): number {
    return this.stats.creativeVotesReceived;
  }


  getGuessSuccessRate(): number {
    const totalGuessOpportunities = this.stats.successfulGuesses +
      (this.stats.gamesPlayed - this.stats.gamesWon);
    return totalGuessOpportunities > 0
      ? this.stats.successfulGuesses / totalGuessOpportunities
      : 0;
  }


  addAuthProvider(provider: AuthProvider): void {
    this.authProviders.push(provider);
  }

  hasAuthProvider(provider: string): boolean {
    return this.authProviders.some(p => p.provider === provider);
  }

  getAuthProvider(provider: string): AuthProvider | undefined {
    return this.authProviders.find(p => p.provider === provider);
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      authProviders: this.authProviders,
      createdAt: this.createdAt,
      stats: this.stats
    };
  }

  toPublicJSON() {
    return {
      id: this.id,
      name: this.name,
      createdAt: this.createdAt,
      stats: this.stats
    };
  }
}