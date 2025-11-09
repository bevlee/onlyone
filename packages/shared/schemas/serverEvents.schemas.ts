import { z } from 'zod';
import type { GamePhase, GamePhaseType } from '../GameState.js';
import type { Room } from '../Room.js';

/**
 * Base schema for all server events
 */
const baseServerEventSchema = z.object({
  matchId: z.uuid('Invalid matchId format'),
  timestamp: z.iso.datetime('Invalid timestamp format'),
});

/**
 * SecretWordWritingStarted: SecretWordWriting phase begins
 */
export const secretWordWritingStartedSchema = baseServerEventSchema.extend({
  type: z.literal('SecretWordWritingStarted'),
  gamePhase: z.object({
    phase: z.literal('secret-word-writing'),
    state: z.object({
      submissions: z.record(z.string(), z.string()),
    }),
  }) as z.ZodType<GamePhase & { phase: GamePhaseType.SecretWordWriting }>,
});

/**
 * SecretWordSubmitted: Player submits their secret word
 */
export const secretWordSubmittedSchema = baseServerEventSchema.extend({
  type: z.literal('SecretWordSubmitted'),
  submitterId: z.string().min(1, 'submitterId required'),
  submitterName: z.string().min(1, 'submitterName required'),
});

/**
 * WritingCluesStarted: WritingClues phase begins
 */
export const writingCluesStartedSchema = baseServerEventSchema.extend({
  type: z.literal('WritingCluesStarted'),
  gamePhase: z.object({
    phase: z.literal('writing-clues'),
    state: z.object({
      secretWord: z.string(),
      clues: z.array(z.object({
        text: z.string(),
        submitterId: z.string(),
        submitterName: z.string(),
        votes: z.object({
          helpful: z.number(),
          creative: z.number(),
        }),
        wasFiltered: z.boolean(),
        nonDuplicate: z.boolean(),
        submittedAt: z.iso.datetime(),
      })),
      guessingPlayerId: z.string(),
      guessingPlayerName: z.string(),
      wordSubmitterId: z.string(),
      wordSubmitterName: z.string(),
      submittedBy: z.set(z.string()),
      roundIndex: z.number(),
    }),
  }) as z.ZodType<GamePhase & { phase: GamePhaseType.WritingClues }>,
});

/**
 * ClueSubmitted: Clue submitted during WritingClues phase
 */
export const clueSubmittedSchema = baseServerEventSchema.extend({
  type: z.literal('ClueSubmitted'),
  clueText: z.string().min(1, 'clueText required').max(500),
  submitterId: z.string().min(1, 'submitterId required'),
  roundIndex: z.number().min(0),
});

/**
 * FilteringCluesStarted: FilteringClues phase begins
 */
export const filteringCluesStartedSchema = baseServerEventSchema.extend({
  type: z.literal('FilteringCluesStarted'),
  gamePhase: z.object({
    phase: z.literal('filtering-clues'),
    state: z.object({
      secretWord: z.string(),
      clues: z.array(z.object({
        text: z.string(),
        submitterId: z.string(),
        submitterName: z.string(),
        votes: z.object({
          helpful: z.number(),
          creative: z.number(),
        }),
        wasFiltered: z.boolean(),
        nonDuplicate: z.boolean(),
        submittedAt: z.iso.datetime(),
      })),
      dedupedClues: z.array(z.object({
        text: z.string(),
        submitterId: z.string(),
        submitterName: z.string(),
        votes: z.object({
          helpful: z.number(),
          creative: z.number(),
        }),
        wasFiltered: z.boolean(),
        nonDuplicate: z.boolean(),
        submittedAt: z.iso.datetime(),
      })),
      guessingPlayerId: z.string(),
      guessingPlayerName: z.string(),
      wordSubmitterId: z.string(),
      wordSubmitterName: z.string(),
      votes: z.record(z.string(), z.object({
        keep: z.number(),
        remove: z.number(),
        voters: z.set(z.string()),
      })),
      roundIndex: z.number(),
    }),
  }) as z.ZodType<GamePhase & { phase: GamePhaseType.FilteringClues }>,
});

/**
 * ClueVoted: Player votes on a clue
 */
export const clueVotedSchema = baseServerEventSchema.extend({
  type: z.literal('ClueVoted'),
  clueText: z.string().min(1, 'clueText required'),
  voterId: z.string().min(1, 'voterId required'),
  vote: z.enum(['keep', 'remove']),
  keepCount: z.number().min(0),
  removeCount: z.number().min(0),
  roundIndex: z.number().min(0),
});

/**
 * GuessingWordStarted: GuessingWord phase begins
 */
export const guessingWordStartedSchema = baseServerEventSchema.extend({
  type: z.literal('GuessingWordStarted'),
  gamePhase: z.object({
    phase: z.literal('guessing-word'),
    state: z.object({
      secretWord: z.string(),
      dedupedClues: z.array(z.object({
        text: z.string(),
        submitterId: z.string(),
        submitterName: z.string(),
        votes: z.object({
          helpful: z.number(),
          creative: z.number(),
        }),
        wasFiltered: z.boolean(),
        nonDuplicate: z.boolean(),
        submittedAt: z.iso.datetime(),
      })),
      guess: z.string(),
      guessingPlayerId: z.string(),
      guessingPlayerName: z.string(),
      wordSubmitterId: z.string(),
      wordSubmitterName: z.string(),
      guessSubmitted: z.boolean(),
      roundIndex: z.number(),
    }),
  }) as z.ZodType<GamePhase & { phase: GamePhaseType.GuessingWord }>,
});

/**
 * GuessSubmitted: Guesser submits their guess
 */
export const guessSubmittedSchema = baseServerEventSchema.extend({
  type: z.literal('GuessSubmitted'),
  guess: z.string().min(1, 'guess required').max(100),
  guessingPlayerId: z.string().min(1, 'guessingPlayerId required'),
  isCorrect: z.boolean(),
  secretWord: z.string().min(1, 'secretWord required'),
  roundIndex: z.number().min(0),
});

/**
 * EndRound: Round ends with results
 */
export const endRoundSchema = baseServerEventSchema.extend({
  type: z.literal('EndRound'),
  secretWord: z.string().min(1, 'secretWord required'),
  finalGuess: z.string().min(1, 'finalGuess required'),
  success: z.boolean(),
  guessingPlayerId: z.string().min(1, 'guessingPlayerId required'),
  wordSubmitterId: z.string().min(1, 'wordSubmitterId required'),
  clues: z.array(z.object({
    text: z.string(),
    submitterId: z.string(),
    submitterName: z.string(),
  })),
  roundIndex: z.number().min(0),
});

/**
 * ClueCommended: Player commends a clue
 */
export const clueCommendedSchema = baseServerEventSchema.extend({
  type: z.literal('ClueCommended'),
  clueText: z.string().min(1, 'clueText required'),
  commendType: z.enum(['helpful', 'creative']),
  commenderId: z.string().min(1, 'commenderId required'),
  commenderName: z.string().min(1, 'commenderName required'),
  helpfulCount: z.number().min(0),
  creativeCount: z.number().min(0),
});

/**
 * GameCompleted: All rounds played, game is complete
 */
export const gameCompletedSchema = baseServerEventSchema.extend({
  type: z.literal('GameCompleted'),
  totalRounds: z.number().min(0),
  gamesWon: z.number().min(0),
  gamesPlayed: z.number().min(0),
});

/**
 * GameState: Full game state sync
 */
export const gameStateSchema = baseServerEventSchema.extend({
  type: z.literal('GameState'),
  room: z.any() as z.ZodType<Room>,
});

/**
 * Discriminated union of all server events
 * Uses the 'type' field to narrow the union
 */
export const serverEventSchema = z.discriminatedUnion('type', [
  secretWordWritingStartedSchema,
  secretWordSubmittedSchema,
  writingCluesStartedSchema,
  clueSubmittedSchema,
  filteringCluesStartedSchema,
  clueVotedSchema,
  guessingWordStartedSchema,
  guessSubmittedSchema,
  endRoundSchema,
  clueCommendedSchema,
  gameCompletedSchema,
  gameStateSchema,
]);

/**
 * Inferred TypeScript types from schemas
 */
export type SecretWordWritingStartedEvent = z.infer<typeof secretWordWritingStartedSchema>;
export type SecretWordSubmittedEvent = z.infer<typeof secretWordSubmittedSchema>;
export type WritingCluesStartedEvent = z.infer<typeof writingCluesStartedSchema>;
export type ClueSubmittedEvent = z.infer<typeof clueSubmittedSchema>;
export type FilteringCluesStartedEvent = z.infer<typeof filteringCluesStartedSchema>;
export type ClueVotedEvent = z.infer<typeof clueVotedSchema>;
export type GuessingWordStartedEvent = z.infer<typeof guessingWordStartedSchema>;
export type GuessSubmittedEvent = z.infer<typeof guessSubmittedSchema>;
export type EndRoundEvent = z.infer<typeof endRoundSchema>;
export type ClueCommendedEvent = z.infer<typeof clueCommendedSchema>;
export type GameCompletedEvent = z.infer<typeof gameCompletedSchema>;
export type GameStateEvent = z.infer<typeof gameStateSchema>;
export type ServerEvent = z.infer<typeof serverEventSchema>;
