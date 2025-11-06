// packages/shared/schemas/index.ts
/**
 * Central export for all Zod schemas
 * Re-exports all validation schemas and their inferred types
 */

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
