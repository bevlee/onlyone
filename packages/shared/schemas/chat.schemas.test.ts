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
