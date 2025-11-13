// apps/gameserver/src/validation/eventValidator.ts
import {
  clientEventSchema,
  chatMessageSchema,
  type ClientEvent,
  type ChatMessage,
  z,
} from '@onlyone/shared/schemas';

/**
 * Custom error class for validation failures
 * Includes schema error details for debugging
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly errors: z.ZodIssue[] = []
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
    const errorMessages = result.error.issues
      .map(err => `${err.path.join('.')}: ${err.message}`)
      .join('; ');
    throw new ValidationError(
      `Invalid client event: ${errorMessages}`,
      result.error.issues
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
    const errorMessages = result.error.issues
      .map(err => `${err.message}`)
      .join('; ');
    throw new ValidationError(
      `Invalid chat message: ${errorMessages}`,
      result.error.issues
    );
  }

  return result.data;
}

/**
 * Validates a game action (ClientEvent)
 * Throws ValidationError if validation fails
 */
export function validateGameAction(data: unknown): ClientEvent {
  return validateClientEvent(data);
}

/**
 * Validates a chat message
 * Throws ValidationError if validation fails
 */
export function validateChatMessageInput(data: unknown): ChatMessage {
  return validateChatMessage(data);
}
