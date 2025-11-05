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
