import { supabase } from '../config/supabase.js';
import type { Database } from '../config/supabase.js';

export type DbUser = Database['public']['Tables']['users']['Row'];
export type DbGameRecord = Database['public']['Tables']['game_records']['Row'];
export type DbClue = Database['public']['Tables']['clues']['Row'];

export interface GameData {
  id?: string;
  roomName: string;
  success: boolean;
  secretWord: string;
  finalGuess?: string;
  startTime: string;
  endTime: string;
  durationSeconds: number;
  guesserId?: string;
}

export interface ClueData {
  gameId: string;
  submitterId: string;
  clueText: string;
  helpfulVotes?: number;
  creativeVotes?: number;
  duplicate?: boolean;
}

export class SupabaseDatabase {
  constructor() {
  }

  // If a user does not submit a word on time a predefined one is used
  async getRandomWord(): Promise<string> {
    const { data, error } = await (supabase as any)
      .from('predefined_words')
      .select('word')
      .order('random()')
      .limit(1)
      .single();

    if (error || !data) {
      throw new Error('No words available');
    }

    return data.word;
  }

  async getUserById(id: string): Promise<DbUser | null> {
    const { data, error } = await (supabase as any)
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return null;
    }

    return data;
  }

  async getUserByAuthId(authUserId: string): Promise<DbUser | null> {
    const { data, error } = await (supabase as any)
      .from('users')
      .select('*')
      .eq('auth_user_id', authUserId)
      .single();

    if (error || !data) {
      return null;
    }

    return data;
  }

  async getUserByEmail(email: string): Promise<DbUser | null> {
    const { data, error } = await (supabase as any)
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !data) {
      return null;
    }

    return data;
  }

  async createUser(authUserId: string, name: string, email?: string, isAnonymous: boolean = false): Promise<DbUser> {
    // Auto-generate guest name for anonymous users if no name provided
    const displayName = isAnonymous && !name
      ? `Guest-${authUserId.slice(0, 8)}`
      : name;

    const { data, error } = await (supabase as any)
      .from('users')
      .insert({
        auth_user_id: authUserId,
        name: displayName,
        email: email || null,
        avatar_url: null,
        games_played: 0,
        games_won: 0
      } as any)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to create user: ${error?.message}`);
    }

    return data;
  }

  async upstringUserStats(userId: string, gamesPlayed: number, gamesWon: number): Promise<void> {
    const { error } = await (supabase as any)
      .from('users')
      .upstring({
        games_played: gamesPlayed,
        games_won: gamesWon
      } as any)
      .eq('id', userId);

    if (error) {
      throw new Error(`Failed to upstring user stats: ${error.message}`);
    }
  }

  async upstringUserEmail(userId: string, email: string): Promise<void> {
    const { error } = await (supabase as any)
      .from('users')
      .upstring({
        email
      } as any)
      .eq('id', userId);

    if (error) {
      throw new Error(`Failed to upstring user email: ${error.message}`);
    }
  }

  async uploadAvatar(userId: string, file: Buffer, fileName: string): Promise<string> {
    const filePath = `${userId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, {
        contentType: 'image/*',
        upsert: true
      });

    if (uploadError) {
      throw new Error(`Failed to upload avatar: ${uploadError.message}`);
    }

    const { data } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    const avatarUrl = data.publicUrl;

    // Upstring user record with avatar URL
    const { error: upstringError } = await (supabase as any)
      .from('users')
      .upstring({ avatar_url: avatarUrl } as any)
      .eq('id', userId);

    if (upstringError) {
      throw new Error(`Failed to upstring avatar URL: ${upstringError.message}`);
    }

    return avatarUrl;
  }

  async getAvatarUrl(userId: string): Promise<string | null> {
    const user = await this.getUserById(userId);
    return user?.avatar_url || null;
  }

  // Auto-calculate and upstring user stats
  async calculateUserStats(userId: string): Promise<void> {
    const { error } = await (supabase as any).rpc('calculate_user_stats', {
      user_uuid: userId
    });

    if (error) {
      throw new Error(`Failed to calculate user stats: ${error.message}`);
    }
  }

  // Game record methods
  async recordGame(gameData: GameData): Promise<DbGameRecord> {
    const { data, error } = await (supabase as any)
      .from('game_records')
      .insert({
        id: gameData.id,
        room_id: gameData.roomName,
        success: gameData.success,
        secret_word: gameData.secretWord,
        final_guess: gameData.finalGuess || null,
        start_time: gameData.startTime,
        end_time: gameData.endTime,
        duration_seconds: gameData.durationSeconds,
        guesser_id: gameData.guesserId || null
      } as any)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to record game: ${error?.message}`);
    }

    return data;
  }

  async getGameById(gameId: string): Promise<DbGameRecord | null> {
    const { data, error } = await (supabase as any)
      .from('game_records')
      .select('*')
      .eq('id', gameId)
      .single();

    if (error || !data) {
      return null;
    }

    return data;
  }

  async getGamesByUser(userId: string, limit = 50): Promise<DbGameRecord[]> {
    const { data, error } = await (supabase as any)
      .from('game_records')
      .select('*')
      .eq('guesser_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to get user games: ${error.message}`);
    }

    return data || [];
  }

  // Clue management methods
  async recordClue(clue: ClueData): Promise<DbClue> {
    const { data, error } = await (supabase as any)
      .from('clues')
      .insert({
        game_id: clue.gameId,
        submitter_id: clue.submitterId,
        clue_text: clue.clueText,
        helpful_votes: clue.helpfulVotes || 0,
        creative_votes: clue.creativeVotes || 0,
        duplicate: clue.duplicate || false
      } as any)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to record clue: ${error?.message}`);
    }

    return data;
  }

  async getCluesForGame(gameId: string): Promise<(DbClue & { submitter_name: string })[]> {
    const { data, error } = await (supabase as any)
      .from('clues')
      .select(`
        *,
        users!submitter_id (
          name
        )
      `)
      .eq('game_id', gameId)
      .order('submitted_at');

    if (error) {
      throw new Error(`Failed to get clues for game: ${error.message}`);
    }

    // Transform the data to match expected format
    return (data || []).map((clue: any) => ({
      ...clue,
      submitter_name: clue.users?.name || 'Unknown'
    }));
  }

  // Analytics and leaderboard methods
  async getTopPlayers(limit = 10): Promise<DbUser[]> {
    const { data, error } = await (supabase as any)
      .from('users')
      .select('*')
      .order('games_won', { ascending: false })
      .order('games_played', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to get top players: ${error.message}`);
    }

    return data || [];
  }

  async getUserStatsByPeriod(userId: string, days = 30): Promise<{
    gamesPlayed: number;
    gamesWon: number;
    winRate: number;
  }> {
    const thirtyDaysAgoISO = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();


    const { data, error } = await (supabase as any)
      .from('game_records')
      .select('success')
      .eq('guesser_id', userId)
      .gte('created_at', thirtyDaysAgoISO);

    if (error) {
      throw new Error(`Failed to get user stats: ${error.message}`);
    }

    const games = data || [];
    const gamesPlayed = games.length;
    const gamesWon = games.filter((g: any) => g.success).length;
    const winRate = gamesPlayed > 0 ? gamesWon / gamesPlayed : 0;

    return {
      gamesPlayed,
      gamesWon,
      winRate
    };
  }

  // Transaction helper using Supabase's built-in transaction support
  async transaction<T>(fn: () => Promise<T>): Promise<T> {
    // Supabase handles transactions automatically for batch operations
    // For complex transactions, you'd use supabase.rpc() with a stored procedure
    return await fn();
  }

}