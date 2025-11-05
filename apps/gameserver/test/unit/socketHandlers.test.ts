import { describe, it, expect, vi } from 'vitest';
import { validateChatMessage, validateClientEvent } from '../../src/validation/eventValidator';

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
