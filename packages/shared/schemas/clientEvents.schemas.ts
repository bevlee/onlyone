// packages/shared/schemas/clientEvents.schemas.ts
import { z } from 'zod';

/**
 * Base schema for all client events
 */
const baseClientEventSchema = z.object({
  matchId: z.string().uuid('Invalid matchId format'),
  playerId: z.string().min(1, 'playerId cannot be empty'),
  timestamp: z.string().datetime('Invalid timestamp format'),
});

/**
 * StartGame action: transition from lobby to first round
 */
export const startGameActionSchema = baseClientEventSchema.extend({
  type: z.literal('StartGame'),
});

/**
 * SubmitWords action: player submits a word during lobby phase
 */
export const submitWordActionSchema = baseClientEventSchema.extend({
  type: z.literal('SubmitWords'),
  word: z.string().min(1, 'Word cannot be empty').max(100, 'Word must be 100 characters or less'),
});

/**
 * SubmitClue action: player submits a clue during WritingClues phase
 */
export const submitClueActionSchema = baseClientEventSchema.extend({
  type: z.literal('SubmitClue'),
  clueText: z.string().min(1, 'Clue cannot be empty').max(500, 'Clue must be 500 characters or less'),
});

/**
 * VoteOnClue action: player votes keep/remove on a clue during FilteringClues phase
 */
export const voteOnClueActionSchema = baseClientEventSchema.extend({
  type: z.literal('VoteOnClue'),
  clueText: z.string().min(1, 'Clue text cannot be empty'),
  vote: z.enum(['keep', 'remove']),
});

/**
 * SubmitGuess action: guesser submits their guess during GuessingWord phase
 */
export const submitGuessActionSchema = baseClientEventSchema.extend({
  type: z.literal('SubmitGuess'),
  guess: z.string().min(1, 'Guess cannot be empty').max(100, 'Guess must be 100 characters or less'),
});

/**
 * CommendClue action: player commends a clue during EndGame phase
 */
export const commendClueActionSchema = baseClientEventSchema.extend({
  type: z.literal('CommendClue'),
  clueText: z.string().min(1, 'Clue text cannot be empty'),
  commendType: z.enum(['helpful', 'creative']),
});

/**
 * Discriminated union of all client events
 * Uses the 'type' field to narrow the union
 */
export const clientEventSchema = z.discriminatedUnion('type', [
  startGameActionSchema,
  submitWordActionSchema,
  submitClueActionSchema,
  voteOnClueActionSchema,
  submitGuessActionSchema,
  commendClueActionSchema,
]);

/**
 * Inferred TypeScript types from schemas
 * These replace/augment the manual types in ClientEvents.ts
 */
export type StartGameAction = z.infer<typeof startGameActionSchema>;
export type SubmitWordAction = z.infer<typeof submitWordActionSchema>;
export type SubmitClueAction = z.infer<typeof submitClueActionSchema>;
export type VoteOnClueAction = z.infer<typeof voteOnClueActionSchema>;
export type SubmitGuessAction = z.infer<typeof submitGuessActionSchema>;
export type CommendClueAction = z.infer<typeof commendClueActionSchema>;
export type ClientEvent = z.infer<typeof clientEventSchema>;
