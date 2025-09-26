import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { GameDatabase } from '../database/Database.js';
import { User, AuthProvider } from '../models/User.js';

export interface GoogleProfile {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

export interface AuthResult {
  user: User;
  isNewUser: boolean;
}

export class AuthService {
  private db: GameDatabase;
  private saltRounds = 12;

  constructor(db: GameDatabase) {
    this.db = db;
  }

  // Local password authentication
  async registerWithPassword(name: string, email: string, password: string): Promise<AuthResult> {
    const existingUser = this.db.getUserByEmail(email);
    if (existingUser) {
      throw new Error('User already exists with this email');
    }

    const passwordHash = await bcrypt.hash(password, this.saltRounds);
    const userId = this.generateUserId();

    const user = this.db.createUser(userId, name, email, passwordHash);

    // Add local auth provider
    const authProvider: AuthProvider = {
      provider: 'local',
      providerId: email,
      email: email
    };
    user.addAuthProvider(authProvider);
    this.db.addAuthProvider(userId, authProvider);

    return { user, isNewUser: true };
  }

  async loginWithPassword(email: string, password: string): Promise<AuthResult> {
    const user = this.db.getUserByEmail(email);
    if (!user || !user.passwordHash) {
      throw new Error('Invalid credentials');
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    this.db.updateUser(user);

    return { user, isNewUser: false };
  }

  // Google OAuth authentication
  async authenticateWithGoogle(googleProfile: GoogleProfile): Promise<AuthResult> {
    // Try to find existing user by Google provider ID
    let user = this.db.getUserByAuthProvider('google', googleProfile.id);

    if (user) {
      // Existing user
      this.db.updateUser(user);
      return { user, isNewUser: false };
    }

    // Try to find user by email (account linking)
    user = this.db.getUserByEmail(googleProfile.email);

    if (user) {
      // Link Google account to existing user
      const authProvider: AuthProvider = {
        provider: 'google',
        providerId: googleProfile.id,
        email: googleProfile.email
      };
      user.addAuthProvider(authProvider);
      this.db.addAuthProvider(user.id, authProvider);
      this.db.updateUser(user);

      return { user, isNewUser: false };
    }

    // Create new user
    const userId = this.generateUserId();
    user = this.db.createUser(userId, googleProfile.name, googleProfile.email);

    const authProvider: AuthProvider = {
      provider: 'google',
      providerId: googleProfile.id,
      email: googleProfile.email
    };
    user.addAuthProvider(authProvider);
    this.db.addAuthProvider(userId, authProvider);

    return { user, isNewUser: true };
  }


  // Password utilities
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = this.db.getUserById(userId);
    if (!user || !user.passwordHash) {
      throw new Error('User not found or no password set');
    }

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      throw new Error('Current password is incorrect');
    }

    const newPasswordHash = await bcrypt.hash(newPassword, this.saltRounds);
    this.db.updateUserPassword(userId, newPasswordHash);
  }

  async setPassword(userId: string, password: string): Promise<void> {
    const passwordHash = await bcrypt.hash(password, this.saltRounds);
    this.db.updateUserPassword(userId, passwordHash);
  }

  // Utility methods
  private generateUserId(): string {
    return crypto.randomUUID();
  }

  async validateUser(userId: string): Promise<User | null> {
    const user = this.db.getUserById(userId);
    if (user) {
      this.db.updateUser(user);
    }
    return user;
  }
}