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
