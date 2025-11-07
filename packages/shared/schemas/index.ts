// packages/shared/schemas/index.ts
/**
 * Central export for all Zod schemas
 * Re-exports all validation schemas and their inferred types
 */

// Re-export z for consumers
export { z } from 'zod';

export {
  startGameActionSchema,
  submitWordActionSchema,
  submitClueActionSchema,
  voteOnClueActionSchema,
  submitGuessActionSchema,
  commendClueActionSchema,
  clientEventSchema,
  type StartGameAction,
  type SubmitWordAction,
  type SubmitClueAction,
  type VoteOnClueAction,
  type SubmitGuessAction,
  type CommendClueAction,
  type ClientEvent,
} from './clientEvents.schemas.js';

export {
  chatMessageSchema,
  type ChatMessage,
} from './chat.schemas.js';

export {
  socketAuthSchema,
  type SocketAuth,
} from './auth.schemas.js';

export {
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
  serverEventSchema,
  type SecretWordWritingStartedEvent,
  type SecretWordSubmittedEvent,
  type WritingCluesStartedEvent,
  type ClueSubmittedEvent,
  type FilteringCluesStartedEvent,
  type ClueVotedEvent,
  type GuessingWordStartedEvent,
  type GuessSubmittedEvent,
  type EndRoundEvent,
  type ClueCommendedEvent,
  type GameCompletedEvent,
  type GameStateEvent,
  type ServerEvent,
} from './serverEvents.schemas.js';
