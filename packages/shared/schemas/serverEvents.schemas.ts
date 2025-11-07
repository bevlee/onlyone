// packages/shared/schemas/serverEvents.schemas.ts
import { z } from 'zod';

/**
 * Base schema for all server events
 */
const baseServerEventSchema = z.object({
  matchId: z.string().uuid('Invalid matchId format'),
  timestamp: z.string().datetime('Invalid timestamp format'),
});

/**
 * SecretWordWritingStarted event: phase transition to word writing
 */
export const secretWordWritingStartedEventSchema = baseServerEventSchema.extend({
  type: z.literal('SecretWordWritingStarted'),
  gamePhase: z.any(), // TODO: Create GamePhase schema
});

/**
 * SecretWordSubmitted event: player submitted their secret word
 */
export const secretWordSubmittedEventSchema = baseServerEventSchema.extend({
  type: z.literal('SecretWordSubmitted'),
  submitterId: z.string().min(1, 'submitterId cannot be empty'),
  submitterName: z.string().min(1, 'submitterName cannot be empty'),
});

/**
 * WritingCluesStarted event: phase transition to clue writing
 */
export const writingCluesStartedEventSchema = baseServerEventSchema.extend({
  type: z.literal('WritingCluesStarted'),
  gamePhase: z.any(), // TODO: Create GamePhase schema
});

/**
 * ClueSubmitted event: player submitted a clue
 */
export const clueSubmittedEventSchema = baseServerEventSchema.extend({
  type: z.literal('ClueSubmitted'),
  clueText: z.string().min(1, 'clueText cannot be empty'),
  submitterId: z.string().min(1, 'submitterId cannot be empty'),
  roundIndex: z.number().int().min(0, 'roundIndex must be non-negative'),
});

/**
 * FilteringCluesStarted event: phase transition to clue filtering/voting
 */
export const filteringCluesStartedEventSchema = baseServerEventSchema.extend({
  type: z.literal('FilteringCluesStarted'),
  gamePhase: z.any(), // TODO: Create GamePhase schema
});

/**
 * ClueVoted event: player voted on a clue
 */
export const clueVotedEventSchema = baseServerEventSchema.extend({
  type: z.literal('ClueVoted'),
  clueText: z.string().min(1, 'clueText cannot be empty'),
  voterId: z.string().min(1, 'voterId cannot be empty'),
  vote: z.enum(['keep', 'remove']),
  keepCount: z.number().int().min(0, 'keepCount must be non-negative'),
  removeCount: z.number().int().min(0, 'removeCount must be non-negative'),
  roundIndex: z.number().int().min(0, 'roundIndex must be non-negative'),
});

/**
 * GuessingWordStarted event: phase transition to guessing
 */
export const guessingWordStartedEventSchema = baseServerEventSchema.extend({
  type: z.literal('GuessingWordStarted'),
  gamePhase: z.any(), // TODO: Create GamePhase schema
});

/**
 * GuessSubmitted event: guesser submitted their guess
 */
export const guessSubmittedEventSchema = baseServerEventSchema.extend({
  type: z.literal('GuessSubmitted'),
  guess: z.string().min(1, 'guess cannot be empty'),
  guessingPlayerId: z.string().min(1, 'guessingPlayerId cannot be empty'),
  isCorrect: z.boolean(),
  secretWord: z.string().min(1, 'secretWord cannot be empty'),
  roundIndex: z.number().int().min(0, 'roundIndex must be non-negative'),
});

/**
 * EndRound event: round ended with results
 */
export const endRoundEventSchema = baseServerEventSchema.extend({
  type: z.literal('EndRound'),
  secretWord: z.string().min(1, 'secretWord cannot be empty'),
  finalGuess: z.string(),
  success: z.boolean(),
  guessingPlayerId: z.string().min(1, 'guessingPlayerId cannot be empty'),
  wordSubmitterId: z.string().min(1, 'wordSubmitterId cannot be empty'),
  clues: z.array(z.object({
    text: z.string().min(1, 'clue text cannot be empty'),
    submitterId: z.string().min(1, 'submitterId cannot be empty'),
    submitterName: z.string().min(1, 'submitterName cannot be empty'),
  })),
  roundIndex: z.number().int().min(0, 'roundIndex must be non-negative'),
});

/**
 * ClueCommended event: player commended a clue
 */
export const clueCommendedEventSchema = baseServerEventSchema.extend({
  type: z.literal('ClueCommended'),
  clueText: z.string().min(1, 'clueText cannot be empty'),
  commendType: z.enum(['helpful', 'creative']),
  commenderId: z.string().min(1, 'commenderId cannot be empty'),
  commenderName: z.string().min(1, 'commenderName cannot be empty'),
  helpfulCount: z.number().int().min(0, 'helpfulCount must be non-negative'),
  creativeCount: z.number().int().min(0, 'creativeCount must be non-negative'),
});

/**
 * GameCompleted event: all rounds complete, game over
 */
export const gameCompletedEventSchema = baseServerEventSchema.extend({
  type: z.literal('GameCompleted'),
  totalRounds: z.number().int().min(0, 'totalRounds must be non-negative'),
  gamesWon: z.number().int().min(0, 'gamesWon must be non-negative'),
  gamesPlayed: z.number().int().min(0, 'gamesPlayed must be non-negative'),
});

/**
 * GameState event: full state sync (for reconnects)
 */
export const gameStateEventSchema = baseServerEventSchema.extend({
  type: z.literal('GameState'),
  room: z.any(), // TODO: Create Room schema
});

/**
 * Discriminated union of all server events
 * Uses the 'type' field to narrow the union
 */
export const serverEventSchema = z.discriminatedUnion('type', [
  secretWordWritingStartedEventSchema,
  secretWordSubmittedEventSchema,
  writingCluesStartedEventSchema,
  clueSubmittedEventSchema,
  filteringCluesStartedEventSchema,
  clueVotedEventSchema,
  guessingWordStartedEventSchema,
  guessSubmittedEventSchema,
  endRoundEventSchema,
  clueCommendedEventSchema,
  gameCompletedEventSchema,
  gameStateEventSchema,
]);

/**
 * Inferred TypeScript types from schemas
 * These replace the manual types in ServerEvents.ts
 */
export type SecretWordWritingStartedEvent = z.infer<typeof secretWordWritingStartedEventSchema>;
export type SecretWordSubmittedEvent = z.infer<typeof secretWordSubmittedEventSchema>;
export type WritingCluesStartedEvent = z.infer<typeof writingCluesStartedEventSchema>;
export type ClueSubmittedEvent = z.infer<typeof clueSubmittedEventSchema>;
export type FilteringCluesStartedEvent = z.infer<typeof filteringCluesStartedEventSchema>;
export type ClueVotedEvent = z.infer<typeof clueVotedEventSchema>;
export type GuessingWordStartedEvent = z.infer<typeof guessingWordStartedEventSchema>;
export type GuessSubmittedEvent = z.infer<typeof guessSubmittedEventSchema>;
export type EndRoundEvent = z.infer<typeof endRoundEventSchema>;
export type ClueCommendedEvent = z.infer<typeof clueCommendedEventSchema>;
export type GameCompletedEvent = z.infer<typeof gameCompletedEventSchema>;
export type GameStateEvent = z.infer<typeof gameStateEventSchema>;
export type ServerEvent = z.infer<typeof serverEventSchema>;
