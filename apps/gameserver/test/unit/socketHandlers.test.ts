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
