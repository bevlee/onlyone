# WebSocket → GameServer Zod Validation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Zod runtime validation for all WebSocket events flowing from client to server, preventing invalid data from corrupting game state.

**Architecture:** Create Zod schemas in `/packages/shared/schemas/` for all client events (game actions and chat), then use validators in `/apps/gameserver/src/handlers/socketHandlers.ts` to parse and validate incoming data before processing. This establishes a single source of truth (schema = docs + runtime enforcement) and makes invalid data structurally impossible to process.

**Tech Stack:**
- Zod for schema validation (already installed)
- TypeScript discriminated unions for type safety
- Vitest for tests (already configured)

---

## Task 1: Create base Zod schemas for client game actions

**Files:**
- Create: `packages/shared/schemas/clientEvents.schemas.ts`
- Test: `packages/shared/schemas/clientEvents.schemas.test.ts`

**Step 1: Write the failing test**

```typescript
// packages/shared/schemas/clientEvents.schemas.test.ts
import { describe, it, expect } from 'vitest';
import {
  startGameActionSchema,
  submitWordActionSchema,
  submitClueActionSchema,
  voteOnClueActionSchema,
  submitGuessActionSchema,
  commendClueActionSchema,
  clientEventSchema,
} from './clientEvents.schemas';

describe('Client Event Schemas', () => {
  describe('startGameActionSchema', () => {
    it('validates a valid StartGame action', () => {
      const action = {
        type: 'StartGame',
        matchId: '123e4567-e89b-12d3-a456-426614174000',
        playerId: 'player-1',
        timestamp: new Date().toISOString(),
      };
      const result = startGameActionSchema.safeParse(action);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('StartGame');
      }
    });

    it('rejects StartGame without matchId', () => {
      const action = {
        type: 'StartGame',
        playerId: 'player-1',
        timestamp: new Date().toISOString(),
      };
      const result = startGameActionSchema.safeParse(action);
      expect(result.success).toBe(false);
    });

    it('rejects StartGame with empty playerId', () => {
      const action = {
        type: 'StartGame',
        matchId: '123e4567-e89b-12d3-a456-426614174000',
        playerId: '',
        timestamp: new Date().toISOString(),
      };
      const result = startGameActionSchema.safeParse(action);
      expect(result.success).toBe(false);
    });
  });

  describe('submitWordActionSchema', () => {
    it('validates a valid SubmitWords action', () => {
      const action = {
        type: 'SubmitWords',
        word: 'elephant',
        matchId: '123e4567-e89b-12d3-a456-426614174000',
        playerId: 'player-1',
        timestamp: new Date().toISOString(),
      };
      const result = submitWordActionSchema.safeParse(action);
      expect(result.success).toBe(true);
    });

    it('rejects SubmitWords with empty word', () => {
      const action = {
        type: 'SubmitWords',
        word: '',
        matchId: '123e4567-e89b-12d3-a456-426614174000',
        playerId: 'player-1',
        timestamp: new Date().toISOString(),
      };
      const result = submitWordActionSchema.safeParse(action);
      expect(result.success).toBe(false);
    });

    it('rejects SubmitWords with word longer than 100 chars', () => {
      const action = {
        type: 'SubmitWords',
        word: 'a'.repeat(101),
        matchId: '123e4567-e89b-12d3-a456-426614174000',
        playerId: 'player-1',
        timestamp: new Date().toISOString(),
      };
      const result = submitWordActionSchema.safeParse(action);
      expect(result.success).toBe(false);
    });
  });

  describe('submitClueActionSchema', () => {
    it('validates a valid SubmitClue action', () => {
      const action = {
        type: 'SubmitClue',
        clueText: 'large animal from Africa',
        matchId: '123e4567-e89b-12d3-a456-426614174000',
        playerId: 'player-1',
        timestamp: new Date().toISOString(),
      };
      const result = submitClueActionSchema.safeParse(action);
      expect(result.success).toBe(true);
    });

    it('rejects SubmitClue with empty clueText', () => {
      const action = {
        type: 'SubmitClue',
        clueText: '',
        matchId: '123e4567-e89b-12d3-a456-426614174000',
        playerId: 'player-1',
        timestamp: new Date().toISOString(),
      };
      const result = submitClueActionSchema.safeParse(action);
      expect(result.success).toBe(false);
    });

    it('rejects SubmitClue with clueText longer than 500 chars', () => {
      const action = {
        type: 'SubmitClue',
        clueText: 'a'.repeat(501),
        matchId: '123e4567-e89b-12d3-a456-426614174000',
        playerId: 'player-1',
        timestamp: new Date().toISOString(),
      };
      const result = submitClueActionSchema.safeParse(action);
      expect(result.success).toBe(false);
    });
  });

  describe('voteOnClueActionSchema', () => {
    it('validates a valid VoteOnClue action', () => {
      const action = {
        type: 'VoteOnClue',
        clueText: 'large animal',
        vote: 'keep',
        matchId: '123e4567-e89b-12d3-a456-426614174000',
        playerId: 'player-1',
        timestamp: new Date().toISOString(),
      };
      const result = voteOnClueActionSchema.safeParse(action);
      expect(result.success).toBe(true);
    });

    it('rejects VoteOnClue with invalid vote value', () => {
      const action = {
        type: 'VoteOnClue',
        clueText: 'large animal',
        vote: 'maybe',
        matchId: '123e4567-e89b-12d3-a456-426614174000',
        playerId: 'player-1',
        timestamp: new Date().toISOString(),
      };
      const result = voteOnClueActionSchema.safeParse(action);
      expect(result.success).toBe(false);
    });

    it('rejects VoteOnClue with empty clueText', () => {
      const action = {
        type: 'VoteOnClue',
        clueText: '',
        vote: 'keep',
        matchId: '123e4567-e89b-12d3-a456-426614174000',
        playerId: 'player-1',
        timestamp: new Date().toISOString(),
      };
      const result = voteOnClueActionSchema.safeParse(action);
      expect(result.success).toBe(false);
    });
  });

  describe('submitGuessActionSchema', () => {
    it('validates a valid SubmitGuess action', () => {
      const action = {
        type: 'SubmitGuess',
        guess: 'elephant',
        matchId: '123e4567-e89b-12d3-a456-426614174000',
        playerId: 'player-1',
        timestamp: new Date().toISOString(),
      };
      const result = submitGuessActionSchema.safeParse(action);
      expect(result.success).toBe(true);
    });

    it('rejects SubmitGuess with empty guess', () => {
      const action = {
        type: 'SubmitGuess',
        guess: '',
        matchId: '123e4567-e89b-12d3-a456-426614174000',
        playerId: 'player-1',
        timestamp: new Date().toISOString(),
      };
      const result = submitGuessActionSchema.safeParse(action);
      expect(result.success).toBe(false);
    });

    it('rejects SubmitGuess with guess longer than 100 chars', () => {
      const action = {
        type: 'SubmitGuess',
        guess: 'a'.repeat(101),
        matchId: '123e4567-e89b-12d3-a456-426614174000',
        playerId: 'player-1',
        timestamp: new Date().toISOString(),
      };
      const result = submitGuessActionSchema.safeParse(action);
      expect(result.success).toBe(false);
    });
  });

  describe('commendClueActionSchema', () => {
    it('validates a valid CommendClue action', () => {
      const action = {
        type: 'CommendClue',
        clueText: 'large animal',
        commendType: 'helpful',
        matchId: '123e4567-e89b-12d3-a456-426614174000',
        playerId: 'player-1',
        timestamp: new Date().toISOString(),
      };
      const result = commendClueActionSchema.safeParse(action);
      expect(result.success).toBe(true);
    });

    it('rejects CommendClue with invalid commendType', () => {
      const action = {
        type: 'CommendClue',
        clueText: 'large animal',
        commendType: 'brilliant',
        matchId: '123e4567-e89b-12d3-a456-426614174000',
        playerId: 'player-1',
        timestamp: new Date().toISOString(),
      };
      const result = commendClueActionSchema.safeParse(action);
      expect(result.success).toBe(false);
    });

    it('rejects CommendClue with missing commendType', () => {
      const action = {
        type: 'CommendClue',
        clueText: 'large animal',
        matchId: '123e4567-e89b-12d3-a456-426614174000',
        playerId: 'player-1',
        timestamp: new Date().toISOString(),
      };
      const result = commendClueActionSchema.safeParse(action);
      expect(result.success).toBe(false);
    });
  });

  describe('clientEventSchema (discriminated union)', () => {
    it('accepts and correctly types a StartGame action', () => {
      const action = {
        type: 'StartGame',
        matchId: '123e4567-e89b-12d3-a456-426614174000',
        playerId: 'player-1',
        timestamp: new Date().toISOString(),
      };
      const result = clientEventSchema.safeParse(action);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('StartGame');
      }
    });

    it('accepts and correctly types a SubmitClue action', () => {
      const action = {
        type: 'SubmitClue',
        clueText: 'hint',
        matchId: '123e4567-e89b-12d3-a456-426614174000',
        playerId: 'player-1',
        timestamp: new Date().toISOString(),
      };
      const result = clientEventSchema.safeParse(action);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('SubmitClue');
      }
    });

    it('rejects invalid event type', () => {
      const action = {
        type: 'InvalidEvent',
        matchId: '123e4567-e89b-12d3-a456-426614174000',
        playerId: 'player-1',
        timestamp: new Date().toISOString(),
      };
      const result = clientEventSchema.safeParse(action);
      expect(result.success).toBe(false);
    });

    it('rejects action missing required base fields', () => {
      const action = {
        type: 'StartGame',
        // missing matchId, playerId, timestamp
      };
      const result = clientEventSchema.safeParse(action);
      expect(result.success).toBe(false);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd /Users/bevan/projects/onlyone && pnpm test --run packages/shared/schemas/clientEvents.schemas.test.ts`

Expected: FAIL with errors about module not found

**Step 3: Write minimal implementation**

```typescript
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
```

**Step 4: Run test to verify it passes**

Run: `cd /Users/bevan/projects/onlyone && pnpm test --run packages/shared/schemas/clientEvents.schemas.test.ts`

Expected: PASS - all tests pass

**Step 5: Commit**

```bash
git add packages/shared/schemas/clientEvents.schemas.ts packages/shared/schemas/clientEvents.schemas.test.ts
git commit -m "feat: add Zod schemas for client game actions

Creates discriminated union schemas for all client-to-server game actions
(StartGame, SubmitWords, SubmitClue, VoteOnClue, SubmitGuess, CommendClue).
Validates matchId format (UUID), playerId non-empty, timestamp ISO8601,
and type-specific fields (word/clue/guess length, vote/commend enums).

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 2: Create Zod schema for chat messages

**Files:**
- Create: `packages/shared/schemas/chat.schemas.ts`
- Test: `packages/shared/schemas/chat.schemas.test.ts`

**Step 1: Write the failing test**

```typescript
// packages/shared/schemas/chat.schemas.test.ts
import { describe, it, expect } from 'vitest';
import { chatMessageSchema } from './chat.schemas';

describe('Chat Message Schema', () => {
  it('validates a valid chat message', () => {
    const message = 'Hello everyone!';
    const result = chatMessageSchema.safeParse(message);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('Hello everyone!');
    }
  });

  it('rejects empty string', () => {
    const message = '';
    const result = chatMessageSchema.safeParse(message);
    expect(result.success).toBe(false);
  });

  it('rejects message longer than 1000 chars', () => {
    const message = 'a'.repeat(1001);
    const result = chatMessageSchema.safeParse(message);
    expect(result.success).toBe(false);
  });

  it('allows message at max length boundary (1000 chars)', () => {
    const message = 'a'.repeat(1000);
    const result = chatMessageSchema.safeParse(message);
    expect(result.success).toBe(true);
  });

  it('allows whitespace in messages', () => {
    const message = '   spaces   and\nnewlines\t';
    const result = chatMessageSchema.safeParse(message);
    expect(result.success).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd /Users/bevan/projects/onlyone && pnpm test --run packages/shared/schemas/chat.schemas.test.ts`

Expected: FAIL with module not found

**Step 3: Write minimal implementation**

```typescript
// packages/shared/schemas/chat.schemas.ts
import { z } from 'zod';

/**
 * Chat message schema: simple string with length bounds
 * Prevents spam and buffer overflows
 */
export const chatMessageSchema = z
  .string()
  .min(1, 'Message cannot be empty')
  .max(1000, 'Message must be 1000 characters or less')
  .trim(); // Remove leading/trailing whitespace

export type ChatMessage = z.infer<typeof chatMessageSchema>;
```

**Step 4: Run test to verify it passes**

Run: `cd /Users/bevan/projects/onlyone && pnpm test --run packages/shared/schemas/chat.schemas.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add packages/shared/schemas/chat.schemas.ts packages/shared/schemas/chat.schemas.test.ts
git commit -m "feat: add Zod schema for chat messages

Validates chat messages are non-empty strings, max 1000 chars, with
leading/trailing whitespace trimmed. Prevents spam and buffer issues.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 3: Create barrel export for all schemas

**Files:**
- Create: `packages/shared/schemas/index.ts`

**Step 1: Write the file**

```typescript
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
```

**Step 2: Commit**

```bash
git add packages/shared/schemas/index.ts
git commit -m "feat: add barrel export for all Zod schemas

Centralizes schema imports for cleaner consumer code.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 4: Create validation middleware for socket handlers

**Files:**
- Create: `apps/gameserver/src/validation/eventValidator.ts`
- Test: `apps/gameserver/src/validation/eventValidator.test.ts`

**Step 1: Write the failing test**

```typescript
// apps/gameserver/src/validation/eventValidator.test.ts
import { describe, it, expect } from 'vitest';
import {
  validateClientEvent,
  validateChatMessage,
  ValidationError,
} from './eventValidator';

describe('Event Validator', () => {
  describe('validateClientEvent', () => {
    it('validates a valid StartGame action', () => {
      const action = {
        type: 'StartGame',
        matchId: '123e4567-e89b-12d3-a456-426614174000',
        playerId: 'player-1',
        timestamp: new Date().toISOString(),
      };
      const result = validateClientEvent(action);
      expect(result).toEqual(action);
    });

    it('throws ValidationError for invalid action type', () => {
      const action = {
        type: 'InvalidType',
        matchId: '123e4567-e89b-12d3-a456-426614174000',
        playerId: 'player-1',
        timestamp: new Date().toISOString(),
      };
      expect(() => validateClientEvent(action)).toThrow(ValidationError);
    });

    it('throws ValidationError with detailed error message', () => {
      const action = {
        type: 'SubmitClue',
        clueText: '', // empty clue text is invalid
        matchId: '123e4567-e89b-12d3-a456-426614174000',
        playerId: 'player-1',
        timestamp: new Date().toISOString(),
      };
      try {
        validateClientEvent(action);
        expect.fail('Should have thrown ValidationError');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        if (error instanceof ValidationError) {
          expect(error.message).toContain('clueText');
        }
      }
    });

    it('throws ValidationError for missing matchId', () => {
      const action = {
        type: 'StartGame',
        playerId: 'player-1',
        timestamp: new Date().toISOString(),
      };
      expect(() => validateClientEvent(action)).toThrow(ValidationError);
    });
  });

  describe('validateChatMessage', () => {
    it('validates a valid chat message', () => {
      const message = 'Hello world!';
      const result = validateChatMessage(message);
      expect(result).toBe('Hello world!');
    });

    it('throws ValidationError for empty message', () => {
      const message = '';
      expect(() => validateChatMessage(message)).toThrow(ValidationError);
    });

    it('throws ValidationError for message too long', () => {
      const message = 'a'.repeat(1001);
      expect(() => validateChatMessage(message)).toThrow(ValidationError);
    });

    it('trims whitespace from valid message', () => {
      const message = '  hello  ';
      const result = validateChatMessage(message);
      expect(result).toBe('hello');
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd /Users/bevan/projects/onlyone && pnpm test --run apps/gameserver/src/validation/eventValidator.test.ts`

Expected: FAIL with module not found

**Step 3: Write minimal implementation**

```typescript
// apps/gameserver/src/validation/eventValidator.ts
import {
  clientEventSchema,
  chatMessageSchema,
  type ClientEvent,
  type ChatMessage,
} from '@onlyone/shared/schemas';
import { z } from 'zod';

/**
 * Custom error class for validation failures
 * Includes schema error details for debugging
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly errors: z.ZodError['errors'] = []
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Validates a client event against the schema
 * Throws ValidationError if validation fails
 * Returns the validated and typed event if successful
 */
export function validateClientEvent(data: unknown): ClientEvent {
  const result = clientEventSchema.safeParse(data);

  if (!result.success) {
    const errorMessages = result.error.errors
      .map(err => `${err.path.join('.')}: ${err.message}`)
      .join('; ');
    throw new ValidationError(
      `Invalid client event: ${errorMessages}`,
      result.error.errors
    );
  }

  return result.data;
}

/**
 * Validates a chat message against the schema
 * Throws ValidationError if validation fails
 * Returns the validated message if successful
 */
export function validateChatMessage(data: unknown): ChatMessage {
  const result = chatMessageSchema.safeParse(data);

  if (!result.success) {
    const errorMessages = result.error.errors
      .map(err => `${err.message}`)
      .join('; ');
    throw new ValidationError(
      `Invalid chat message: ${errorMessages}`,
      result.error.errors
    );
  }

  return result.data;
}
```

**Step 4: Run test to verify it passes**

Run: `cd /Users/bevan/projects/onlyone && pnpm test --run apps/gameserver/src/validation/eventValidator.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add apps/gameserver/src/validation/eventValidator.ts apps/gameserver/src/validation/eventValidator.test.ts
git commit -m "feat: add event validation middleware

Creates validateClientEvent() and validateChatMessage() functions that wrap
Zod schema validation and throw ValidationError with detailed messages on
failure. Used by socket handlers to reject invalid data.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 5: Integrate validation into socket handlers (chatMessage event)

**Files:**
- Modify: `apps/gameserver/src/handlers/socketHandlers.ts:66-74`
- Test: Add test case in existing test suite (if exists)

**Step 1: Write integration test (if no test exists yet)**

If `apps/gameserver/test/unit/socketHandlers.test.ts` doesn't exist, create a minimal test:

```typescript
// apps/gameserver/test/unit/socketHandlers.test.ts (new file)
import { describe, it, expect, vi } from 'vitest';
import { validateChatMessage } from '../../src/validation/eventValidator';

describe('Socket Handlers - Chat Message Validation', () => {
  it('rejects empty chat messages', () => {
    expect(() => validateChatMessage('')).toThrow();
  });

  it('accepts valid chat messages', () => {
    const result = validateChatMessage('Hello world');
    expect(result).toBe('Hello world');
  });

  it('trims whitespace from valid messages', () => {
    const result = validateChatMessage('  message  ');
    expect(result).toBe('message');
  });
});
```

**Step 2: Run test to verify it fails** (if created new test file)

Run: `cd /Users/bevan/projects/onlyone && pnpm test --run apps/gameserver/test/unit/socketHandlers.test.ts`

Expected: PASS (validators already work)

**Step 3: Update socketHandlers.ts to use validation**

Current code (lines 66-74):
```typescript
socket.on('chatMessage', (message: string) => {
  logger.debug({ roomName, playerName, message }, 'Chat message');

  io.to(roomName).emit('chatMessage', {
    playerName,
    message,
    timestamp: new Date().toISOString()
  });
});
```

New code:
```typescript
socket.on('chatMessage', (message: unknown) => {
  try {
    const validatedMessage = validateChatMessage(message);

    logger.debug({ roomName, playerName, message: validatedMessage }, 'Chat message');

    io.to(roomName).emit('chatMessage', {
      playerName,
      message: validatedMessage,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      logger.warn({ roomName, playerId, error: error.message }, 'Invalid chat message rejected');
      socket.emit('error', { message: 'Invalid message format' });
    } else {
      logger.error({ roomName, playerId, error }, 'Unexpected error handling chat message');
      socket.emit('error', { message: 'Server error processing message' });
    }
  }
});
```

And add imports at top of file:
```typescript
import { validateChatMessage, ValidationError } from '../validation/eventValidator.js';
```

**Step 4: Verify no tests break**

Run: `cd /Users/bevan/projects/onlyone && pnpm test --run apps/gameserver/test/`

Expected: All existing tests pass

**Step 5: Commit**

```bash
git add apps/gameserver/src/handlers/socketHandlers.ts apps/gameserver/test/unit/socketHandlers.test.ts
git commit -m "feat: add validation to socket chat message handler

Wraps chat message handler with validateChatMessage() to reject invalid
messages (empty, too long). Returns error event to client on validation
failure with user-friendly message. Logs validation failures for debugging.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 6: Add gameAction event handler with validation

**Files:**
- Modify: `apps/gameserver/src/handlers/socketHandlers.ts` (add new handler after startGame)
- Modify: `apps/gameserver/src/services/GameService.ts` (if needed for type updates)

**Step 1: Write the handler test**

```typescript
// In apps/gameserver/test/unit/socketHandlers.test.ts, add:
describe('Socket Handlers - Game Action Validation', () => {
  it('rejects game action with invalid matchId', () => {
    const action = {
      type: 'SubmitClue',
      clueText: 'test',
      matchId: 'not-a-uuid', // invalid
      playerId: 'player-1',
      timestamp: new Date().toISOString(),
    };
    expect(() => validateClientEvent(action)).toThrow();
  });

  it('accepts valid SubmitClue action', () => {
    const action = {
      type: 'SubmitClue',
      clueText: 'test clue',
      matchId: '123e4567-e89b-12d3-a456-426614174000',
      playerId: 'player-1',
      timestamp: new Date().toISOString(),
    };
    const result = validateClientEvent(action);
    expect(result.type).toBe('SubmitClue');
  });
});
```

**Step 2: Run test to verify it passes**

Run: `cd /Users/bevan/projects/onlyone && pnpm test --run apps/gameserver/test/unit/socketHandlers.test.ts`

Expected: PASS

**Step 3: Add game action handler to socketHandlers.ts**

After the startGame handler (after line 108), add:

```typescript
// Game action handler
socket.on('gameAction', (action: unknown) => {
  try {
    const validatedAction = validateClientEvent(action);

    logger.debug({ roomName, playerId, actionType: validatedAction.type }, 'Game action received');

    // Get current room and game state
    const room = roomManager.getRoom(roomName);

    // Create event from action
    // TODO: Convert ClientEvent to GameEvent format (may require GameService update)
    // For now, just log successful validation
    logger.info({ roomName, playerId, actionType: validatedAction.type }, 'Validated game action');

  } catch (error) {
    if (error instanceof ValidationError) {
      logger.warn({ roomName, playerId, error: error.message }, 'Invalid game action rejected');
      socket.emit('error', { message: 'Invalid action format' });
    } else {
      logger.error({ roomName, playerId, error }, 'Unexpected error handling game action');
      socket.emit('error', { message: 'Server error processing action' });
    }
  }
});
```

And add import:
```typescript
import { validateClientEvent, ValidationError } from '../validation/eventValidator.js';
```

**Step 4: Verify tests pass**

Run: `cd /Users/bevan/projects/onlyone && pnpm test --run apps/gameserver/test/`

Expected: PASS

**Step 5: Commit**

```bash
git add apps/gameserver/src/handlers/socketHandlers.ts apps/gameserver/test/unit/socketHandlers.test.ts
git commit -m "feat: add gameAction socket event handler with validation

Accepts incoming gameAction events, validates against ClientEvent schema,
and logs successful validation. Rejects invalid actions with error event.
Converts ClientEvent to GameEvent in next phase (after event conversion design).

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 7: Update ClientEvents.ts with schema-based types (optional)

**Files:**
- Modify: `packages/shared/ClientEvents.ts`

**Step 1: Option A - Keep both**

Keep manual types in ClientEvents.ts AND add note that schemas are source of truth:

```typescript
/**
 * IMPORTANT: Zod schemas in packages/shared/schemas/clientEvents.schemas.ts
 * are the source of truth for client event validation. These types are for
 * reference and should match the schemas.
 *
 * For new code, use types exported from:
 * import { ClientEvent } from '@onlyone/shared/schemas';
 */
```

**Step 2: Option B - Replace with schema types**

Remove manual type definitions and re-export from schemas:

```typescript
// packages/shared/ClientEvents.ts
export type {
  StartGameAction,
  SubmitWordAction,
  SubmitClueAction,
  VoteOnClueAction,
  SubmitGuessAction,
  CommendClueAction,
  ClientEvent,
} from './schemas/clientEvents.schemas.js';
```

Recommend Option A for now (keep both) to avoid breaking imports. Migration to Option B can happen later.

**Step 3: Document in README or commit message**

```bash
git add packages/shared/ClientEvents.ts
git commit -m "docs: update ClientEvents with schema source-of-truth note

Notes that Zod schemas in packages/shared/schemas/ are the authoritative
definitions of client events. Manual types kept for backward compatibility.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 8: Update socket auth validation (optional hardening)

**Files:**
- Create: `packages/shared/schemas/auth.schemas.ts`
- Modify: `apps/gameserver/src/handlers/socketHandlers.ts:17-23`

**Step 1: Create auth schema**

```typescript
// packages/shared/schemas/auth.schemas.ts
import { z } from 'zod';

export const socketAuthSchema = z.object({
  roomName: z.string().min(1, 'roomName required').max(100, 'roomName too long'),
  playerName: z.string().min(1, 'playerName required').max(100, 'playerName too long'),
  playerId: z.string().min(1, 'playerId required'),
});

export type SocketAuth = z.infer<typeof socketAuthSchema>;
```

**Step 2: Use in socketHandlers.ts**

Replace:
```typescript
const { roomName, playerName, playerId } = socket.handshake.auth;

if (!roomName || !playerName) {
  logger.warn({ socketId: socket.id }, 'Socket connection missing auth data');
  socket.disconnect();
  return;
}
```

With:
```typescript
try {
  const auth = socketAuthSchema.parse(socket.handshake.auth);
  const { roomName, playerName, playerId } = auth;
  // ... rest of function
} catch (error) {
  logger.warn({ socketId: socket.id, error }, 'Invalid socket auth data');
  socket.disconnect();
  return;
}
```

**Step 3: Commit** (separate from main validation tasks as this is optional hardening)

---

## Summary of Files Created/Modified

**New Files Created:**
- `packages/shared/schemas/clientEvents.schemas.ts` (150 lines)
- `packages/shared/schemas/clientEvents.schemas.test.ts` (300+ lines)
- `packages/shared/schemas/chat.schemas.ts` (20 lines)
- `packages/shared/schemas/chat.schemas.test.ts` (50 lines)
- `packages/shared/schemas/index.ts` (30 lines)
- `apps/gameserver/src/validation/eventValidator.ts` (60 lines)
- `apps/gameserver/src/validation/eventValidator.test.ts` (70 lines)

**Files Modified:**
- `apps/gameserver/src/handlers/socketHandlers.ts` (chatMessage handler, + gameAction handler)
- `apps/gameserver/test/unit/socketHandlers.test.ts` (add validation tests)
- `packages/shared/ClientEvents.ts` (add note about schema source of truth)

**Total Tests Added:** 20+ test cases validating all error paths

## Testing Strategy

1. **Unit tests** for each schema (all error cases)
2. **Integration tests** for validator functions
3. **Handler tests** for socket event processing
4. **Manual testing**: Send invalid data via WebSocket, verify rejection + error event

## Next Steps After Implementation

1. **Integrate with GameService**: Once events are validated, convert to internal GameEvent format
2. **Add HTTP validation**: Create `packages/shared/schemas/http.schemas.ts` for room/auth endpoints
3. **Frontend validation**: Export schemas to frontend for client-side form validation
4. **Error handling**: Define structured error responses (e.g., `{ code: 'VALIDATION_ERROR', errors: [...] }`)
5. **Monitoring**: Track validation failures to detect attack patterns or client bugs
